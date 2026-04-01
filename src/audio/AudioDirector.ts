import Phaser from "phaser";
import {
  DEFAULT_AUDIO_SETTINGS,
  loadAudioSettings,
  saveAudioSettings,
  type AudioSettings,
} from "./AudioSettings.ts";

export type MusicState =
  | "menu"
  | "setup"
  | "planning"
  | "sim"
  | "report"
  | "gameover";

export type PlanningSubstate =
  | "galaxy"
  | "fleet"
  | "routes"
  | "market"
  | "finance";

export type SfxKey =
  | "ui_hover"
  | "ui_click_primary"
  | "ui_click_secondary"
  | "ui_back_close"
  | "ui_confirm"
  | "ui_error"
  | "ui_tab_switch"
  | "ui_row_select"
  | "ui_modal_open"
  | "ui_modal_close"
  | "ui_end_turn"
  | "map_star_select";

interface SfxPatch {
  type: OscillatorType;
  startHz: number;
  endHz: number;
  attack: number;
  decay: number;
  gain: number;
}

const MUSIC_FUNDAMENTAL: Record<MusicState, number> = {
  menu: 110,
  setup: 123.47,
  planning: 98,
  sim: 130.81,
  report: 92.5,
  gameover: 82.41,
};

const SUBSTATE_BRIGHTNESS: Record<PlanningSubstate, number> = {
  galaxy: 900,
  fleet: 1050,
  routes: 1200,
  market: 1320,
  finance: 980,
};

class AudioDirector {
  private ctx: AudioContext | null = null;
  private initialized = false;
  private enabled = true;
  private settingsHydrated = false;
  private currentState: MusicState = "menu";
  private currentPlanningSubstate: PlanningSubstate = "galaxy";
  private musicVolume = DEFAULT_AUDIO_SETTINGS.musicVolume;
  private sfxVolume = DEFAULT_AUDIO_SETTINGS.sfxVolume;
  private reducedUiSfx = DEFAULT_AUDIO_SETTINGS.reducedUiSfx;

  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private padGain: GainNode | null = null;
  private pulseGain: GainNode | null = null;
  private textureGain: GainNode | null = null;
  private colorFilter: BiquadFilterNode | null = null;

  private padOsc: OscillatorNode | null = null;
  private pulseOsc: OscillatorNode | null = null;
  private textureOsc: OscillatorNode | null = null;
  private pulseLfo: OscillatorNode | null = null;
  private pulseLfoGain: GainNode | null = null;

  private game: Phaser.Game | null = null;

  attachScene(scene: Phaser.Scene): void {
    this.game = scene.game;
    this.ensureInitialized();

    // Unlock audio context on the first user gesture.
    scene.input.once("pointerdown", () => {
      void this.resume();
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.applyBusVolumes();
  }

  getSettings(): AudioSettings {
    this.hydrateSettingsFromStorage();
    return {
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      reducedUiSfx: this.reducedUiSfx,
    };
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
    this.persistSettings();
    this.applyBusVolumes();
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
    this.persistSettings();
    this.applyBusVolumes();
  }

  setReducedUiSfx(enabled: boolean): void {
    this.reducedUiSfx = enabled;
    this.persistSettings();
  }

  setSettings(settings: AudioSettings): void {
    this.musicVolume = Phaser.Math.Clamp(settings.musicVolume, 0, 1);
    this.sfxVolume = Phaser.Math.Clamp(settings.sfxVolume, 0, 1);
    this.reducedUiSfx = settings.reducedUiSfx;
    this.persistSettings();
    this.applyBusVolumes();
  }

  async resume(): Promise<void> {
    this.ensureInitialized();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  setMusicState(state: MusicState): void {
    this.ensureInitialized();
    if (!this.ctx || !this.padOsc || !this.pulseOsc || !this.textureOsc) {
      return;
    }

    this.currentState = state;
    const now = this.ctx.currentTime;
    const fundamental = MUSIC_FUNDAMENTAL[state];

    this.padOsc.frequency.setTargetAtTime(fundamental, now, 0.35);
    this.pulseOsc.frequency.setTargetAtTime(fundamental * 1.5, now, 0.25);
    this.textureOsc.frequency.setTargetAtTime(fundamental * 2.01, now, 0.3);

    const mix = this.getMixForState(state);
    if (this.padGain && this.pulseGain && this.textureGain) {
      this.padGain.gain.setTargetAtTime(mix.pad, now, 0.25);
      this.pulseGain.gain.setTargetAtTime(mix.pulse, now, 0.25);
      this.textureGain.gain.setTargetAtTime(mix.texture, now, 0.25);
    }

    if (this.colorFilter) {
      const q = state === "sim" ? 1.2 : 0.75;
      const baseCutoff =
        state === "gameover" ? 850 : state === "report" ? 1000 : 1250;
      this.colorFilter.Q.setTargetAtTime(q, now, 0.2);
      this.colorFilter.frequency.setTargetAtTime(baseCutoff, now, 0.3);
      this.applyPlanningSubstateColor();
    }
  }

  setPlanningSubstate(substate: PlanningSubstate): void {
    this.currentPlanningSubstate = substate;
    this.applyPlanningSubstateColor();
  }

  sfx(key: SfxKey): void {
    this.ensureInitialized();
    if (!this.ctx || !this.sfxBus || !this.enabled) return;

    if (this.reducedUiSfx && this.isLowPriorityUiSfx(key)) {
      return;
    }

    const patch = this.getSfxPatch(key);
    if (!patch) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 4200;

    osc.type = patch.type;
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(patch.startHz, now);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, patch.endHz),
      now + patch.attack + patch.decay,
    );

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(patch.gain, now + patch.attack);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + patch.attack + patch.decay,
    );

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + patch.attack + patch.decay + 0.02);
  }

  private applyPlanningSubstateColor(): void {
    if (!this.ctx || !this.colorFilter) return;
    if (this.currentState !== "planning") return;

    const target = SUBSTATE_BRIGHTNESS[this.currentPlanningSubstate];
    this.colorFilter.frequency.setTargetAtTime(
      target,
      this.ctx.currentTime,
      0.25,
    );
  }

  private isLowPriorityUiSfx(key: SfxKey): boolean {
    return key === "ui_hover" || key === "ui_tab_switch" || key === "ui_row_select";
  }

  private persistSettings(): void {
    saveAudioSettings({
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      reducedUiSfx: this.reducedUiSfx,
    });
  }

  private hydrateSettingsFromStorage(): void {
    if (this.settingsHydrated) return;
    const settings = loadAudioSettings();
    this.musicVolume = settings.musicVolume;
    this.sfxVolume = settings.sfxVolume;
    this.reducedUiSfx = settings.reducedUiSfx;
    this.settingsHydrated = true;
  }

  private applyBusVolumes(): void {
    if (!this.ctx || !this.musicBus || !this.sfxBus) return;

    const now = this.ctx.currentTime;
    const enabledMultiplier = this.enabled ? 1 : 0;
    this.musicBus.gain.setTargetAtTime(
      enabledMultiplier * this.musicVolume * 0.26,
      now,
      0.08,
    );
    this.sfxBus.gain.setTargetAtTime(
      enabledMultiplier * this.sfxVolume * 0.4,
      now,
      0.04,
    );
  }

  private getMixForState(state: MusicState): {
    pad: number;
    pulse: number;
    texture: number;
  } {
    switch (state) {
      case "menu":
        return { pad: 0.18, pulse: 0.05, texture: 0.04 };
      case "setup":
        return { pad: 0.2, pulse: 0.07, texture: 0.05 };
      case "planning":
        return { pad: 0.2, pulse: 0.08, texture: 0.05 };
      case "sim":
        return { pad: 0.19, pulse: 0.13, texture: 0.08 };
      case "report":
        return { pad: 0.17, pulse: 0.05, texture: 0.03 };
      case "gameover":
        return { pad: 0.15, pulse: 0.02, texture: 0.015 };
    }
  }

  private getSfxPatch(key: SfxKey): SfxPatch | null {
    switch (key) {
      case "ui_hover":
        return {
          type: "triangle",
          startHz: 700,
          endHz: 840,
          attack: 0.004,
          decay: 0.045,
          gain: 0.045,
        };
      case "ui_click_primary":
        return {
          type: "square",
          startHz: 310,
          endHz: 190,
          attack: 0.002,
          decay: 0.08,
          gain: 0.08,
        };
      case "ui_click_secondary":
        return {
          type: "triangle",
          startHz: 270,
          endHz: 170,
          attack: 0.002,
          decay: 0.07,
          gain: 0.06,
        };
      case "ui_back_close":
        return {
          type: "sine",
          startHz: 360,
          endHz: 180,
          attack: 0.002,
          decay: 0.09,
          gain: 0.07,
        };
      case "ui_confirm":
        return {
          type: "triangle",
          startHz: 520,
          endHz: 780,
          attack: 0.003,
          decay: 0.11,
          gain: 0.08,
        };
      case "ui_error":
        return {
          type: "sawtooth",
          startHz: 180,
          endHz: 90,
          attack: 0.002,
          decay: 0.1,
          gain: 0.075,
        };
      case "ui_tab_switch":
        return {
          type: "triangle",
          startHz: 430,
          endHz: 540,
          attack: 0.003,
          decay: 0.07,
          gain: 0.055,
        };
      case "ui_row_select":
        return {
          type: "square",
          startHz: 260,
          endHz: 230,
          attack: 0.002,
          decay: 0.06,
          gain: 0.05,
        };
      case "ui_modal_open":
        return {
          type: "triangle",
          startHz: 320,
          endHz: 520,
          attack: 0.01,
          decay: 0.12,
          gain: 0.06,
        };
      case "ui_modal_close":
        return {
          type: "triangle",
          startHz: 540,
          endHz: 260,
          attack: 0.003,
          decay: 0.1,
          gain: 0.06,
        };
      case "ui_end_turn":
        return {
          type: "square",
          startHz: 220,
          endHz: 130,
          attack: 0.002,
          decay: 0.14,
          gain: 0.09,
        };
      case "map_star_select":
        return {
          type: "sine",
          startHz: 480,
          endHz: 620,
          attack: 0.003,
          decay: 0.08,
          gain: 0.065,
        };
      default:
        return null;
    }
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    if (typeof window === "undefined") return;
    if (!this.game) return;

    const soundManager = this.game.sound as unknown as {
      context?: AudioContext;
    };
    const ctx = soundManager.context;
    if (!ctx) return;

    this.hydrateSettingsFromStorage();

    this.ctx = ctx;

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVolume * 0.26;
    this.musicBus.connect(ctx.destination);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVolume * 0.4;
    this.sfxBus.connect(ctx.destination);

    this.colorFilter = ctx.createBiquadFilter();
    this.colorFilter.type = "lowpass";
    this.colorFilter.frequency.value = 1100;
    this.colorFilter.Q.value = 0.75;

    this.padGain = ctx.createGain();
    this.pulseGain = ctx.createGain();
    this.textureGain = ctx.createGain();

    this.padGain.gain.value = 0.0001;
    this.pulseGain.gain.value = 0.0001;
    this.textureGain.gain.value = 0.0001;

    this.padOsc = ctx.createOscillator();
    this.padOsc.type = "sine";
    this.padOsc.frequency.value = MUSIC_FUNDAMENTAL.menu;
    this.padOsc.connect(this.padGain);
    this.padGain.connect(this.colorFilter);

    this.pulseOsc = ctx.createOscillator();
    this.pulseOsc.type = "triangle";
    this.pulseOsc.frequency.value = MUSIC_FUNDAMENTAL.menu * 1.5;
    this.pulseOsc.connect(this.pulseGain);
    this.pulseGain.connect(this.colorFilter);

    this.textureOsc = ctx.createOscillator();
    this.textureOsc.type = "sawtooth";
    this.textureOsc.frequency.value = MUSIC_FUNDAMENTAL.menu * 2.01;
    this.textureOsc.connect(this.textureGain);
    this.textureGain.connect(this.colorFilter);

    this.pulseLfo = ctx.createOscillator();
    this.pulseLfo.type = "sine";
    this.pulseLfo.frequency.value = 0.13;
    this.pulseLfoGain = ctx.createGain();
    this.pulseLfoGain.gain.value = 0.025;
    this.pulseLfo.connect(this.pulseLfoGain);
    this.pulseLfoGain.connect(this.pulseGain.gain);

    this.colorFilter.connect(this.musicBus);

    this.padOsc.start();
    this.pulseOsc.start();
    this.textureOsc.start();
    this.pulseLfo.start();

    this.initialized = true;
    this.applyBusVolumes();
    this.setMusicState(this.currentState);
    this.applyPlanningSubstateColor();
  }
}

let singleton: AudioDirector | null = null;

export function getAudioDirector(): AudioDirector {
  if (!singleton) {
    singleton = new AudioDirector();
  }
  return singleton;
}
