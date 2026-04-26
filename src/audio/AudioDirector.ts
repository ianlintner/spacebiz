import * as Phaser from "phaser";
import {
  DEFAULT_AUDIO_SETTINGS,
  loadAudioSettings,
  saveAudioSettings,
  type AudioSettings,
  type MusicStyle,
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
  | "map_star_select"
  // Gamey feedback sounds
  | "cash_gain"
  | "cash_loss"
  | "route_complete"
  | "event_opportunity"
  | "event_hazard"
  | "milestone_profit"
  | "sim_complete"
  | "streak_increment";

interface SfxPatch {
  type: OscillatorType;
  startHz: number;
  endHz: number;
  attack: number;
  decay: number;
  gain: number;
}

interface MidiNoteEvent {
  beat: number;
  lengthBeats: number;
  midi: number;
  velocity: number;
}

interface MidiTrack {
  role: "pad" | "bass" | "lead";
  waveform: OscillatorType;
  notes: MidiNoteEvent[];
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
  galaxy: 760,
  fleet: 860,
  routes: 980,
  market: 1060,
  finance: 820,
};

const STATE_CHORDS: Record<MusicState, number[][]> = {
  menu: [
    [0, 7, 12],
    [2, 9, 14],
    [5, 12, 16],
    [7, 14, 19],
  ],
  setup: [
    [0, 4, 11],
    [2, 7, 12],
    [5, 9, 16],
    [7, 11, 18],
  ],
  planning: [
    [0, 7, 14],
    [3, 10, 15],
    [5, 12, 17],
    [7, 14, 19],
    [10, 17, 21],
  ],
  sim: [
    [0, 7, 12],
    [2, 9, 14],
    [7, 14, 19],
    [9, 16, 21],
  ],
  report: [
    [0, 7, 12],
    [5, 12, 16],
    [7, 14, 19],
    [2, 9, 14],
  ],
  gameover: [
    [0, 3, 10],
    [2, 5, 12],
    [3, 7, 14],
    [5, 8, 15],
  ],
};

const STATE_PULSE_PATTERNS: Record<MusicState, number[]> = {
  menu: [7, 9, 12, 9, 7, 5],
  setup: [7, 11, 12, 9, 7, 4],
  planning: [7, 10, 12, 14, 12, 10, 7],
  sim: [9, 12, 14, 12, 10, 9, 7],
  report: [7, 12, 10, 9, 7, 5],
  gameover: [5, 8, 10, 8, 7, 3],
};

const STATE_CADENCE_MS: Record<
  MusicState,
  { chord: number; pulse: number; drift: number }
> = {
  menu: { chord: 9000, pulse: 1800, drift: 6400 },
  setup: { chord: 8200, pulse: 2200, drift: 5600 },
  planning: { chord: 7600, pulse: 2100, drift: 5000 },
  sim: { chord: 6200, pulse: 1400, drift: 4300 },
  report: { chord: 8500, pulse: 2300, drift: 5400 },
  gameover: { chord: 10500, pulse: 2200, drift: 7000 },
};

const FTL_STATE_PULSE_PATTERNS: Record<MusicState, number[]> = {
  menu: [12, 14, 16, 19, 16, 14],
  setup: [12, 14, 17, 16, 14, 12],
  planning: [12, 14, 17, 19, 17, 16, 14],
  sim: [12, 16, 19, 21, 19, 17, 16],
  report: [12, 14, 17, 16, 14, 12],
  gameover: [7, 10, 12, 10, 8, 7],
};

const RETRO_STATE_PULSE_PATTERNS: Record<MusicState, number[]> = {
  menu: [7, 12, 10, 14, 12, 10],
  setup: [7, 11, 12, 14, 12, 11],
  planning: [7, 10, 12, 14, 15, 14, 12],
  sim: [10, 12, 14, 17, 14, 12, 10],
  report: [7, 10, 12, 10, 9, 7],
  gameover: [5, 8, 10, 8, 7, 5],
};

const FTL_STATE_CADENCE_MS: Record<
  MusicState,
  { chord: number; pulse: number; drift: number }
> = {
  menu: { chord: 6800, pulse: 1200, drift: 4800 },
  setup: { chord: 6400, pulse: 1100, drift: 4400 },
  planning: { chord: 6200, pulse: 980, drift: 4200 },
  sim: { chord: 5200, pulse: 760, drift: 3600 },
  report: { chord: 7000, pulse: 1300, drift: 5000 },
  gameover: { chord: 9000, pulse: 1700, drift: 6200 },
};

const RETRO_STATE_CADENCE_MS: Record<
  MusicState,
  { chord: number; pulse: number; drift: number }
> = {
  menu: { chord: 7800, pulse: 1300, drift: 5400 },
  setup: { chord: 7400, pulse: 1200, drift: 5200 },
  planning: { chord: 7000, pulse: 1050, drift: 4800 },
  sim: { chord: 5800, pulse: 820, drift: 3900 },
  report: { chord: 7600, pulse: 1400, drift: 5400 },
  gameover: { chord: 9800, pulse: 1800, drift: 6500 },
};

const SCORE_BPM: Record<MusicState, number> = {
  menu: 72,
  setup: 80,
  planning: 84,
  sim: 98,
  report: 78,
  gameover: 64,
};

const SCORE_LEAD_PATTERNS: Record<MusicState, number[]> = {
  menu: [12, 14, 16, 14, 12, 9, 7, 9],
  setup: [12, 14, 17, 16, 14, 12, 9, 12],
  planning: [12, 14, 17, 19, 17, 14, 12, 10],
  sim: [12, 16, 19, 21, 19, 17, 16, 14],
  report: [12, 14, 17, 14, 12, 10, 9, 7],
  gameover: [7, 10, 12, 10, 8, 7, 5, 3],
};

interface ExternalBgmTrack {
  url: string;
  label: string;
}

/**
 * Base URL for audio assets.
 *
 * In production, set the VITE_AUDIO_BASE_URL environment variable to the
 * Azure Blob Storage / CDN origin (no trailing slash), e.g.:
 *   https://catherding.blob.core.windows.net/audio
 *   https://cdn.cat-herding.net/audio
 *
 * In local dev (VITE_AUDIO_BASE_URL unset), audio is served from the Vite
 * dev server relative to the page — public/concepts/audio/*.mp3.
 *
 * The env var is injected at build time by Vite (import.meta.env).
 */
const AUDIO_BASE_URL: string = (() => {
  // VITE_AUDIO_BASE_URL is injected at build time by Vite.
  // Set it to the Azure Blob / CDN origin in production, e.g.:
  //   https://catherding.blob.core.windows.net/audio
  //   https://cdn.cat-herding.net/audio
  // Leave unset for local dev — falls back to same-origin /concepts/audio.
  const envUrl = import.meta.env.VITE_AUDIO_BASE_URL as string | undefined;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.replace(/\/$/, ""); // strip trailing slash
  }
  // Local dev / same-origin fallback
  return `${location.origin}/concepts/audio`;
})();

/** Build a full URL for an audio filename. */
function audioUrl(filename: string): string {
  return `${AUDIO_BASE_URL}/${filename}`;
}

const EXTERNAL_BGM_PLAYLIST: ExternalBgmTrack[] = [
  { url: audioUrl("Beyond_the_Gateway.mp3"), label: "Beyond the Gateway" },
  {
    url: audioUrl("Coffee_in_the_Airlock.mp3"),
    label: "Coffee in the Airlock",
  },
  {
    url: audioUrl("Porchlight_in_the_Nebula.mp3"),
    label: "Porchlight in the Nebula",
  },
  {
    url: audioUrl("approachingparsecseven.mp3"),
    label: "Approaching Parsec Seven",
  },
  { url: audioUrl("Terminal_Sunrise.mp3"), label: "Terminal Sunrise" },
  { url: audioUrl("highscore.mp3"), label: "High Score" },
  { url: audioUrl("holdingorbit.mp3"), label: "Holding Orbit" },
  { url: audioUrl("lastport.mp3"), label: "Last Port" },
];

/** Fisher-Yates shuffle (in-place). */
function shufflePlaylist(list: ExternalBgmTrack[]): void {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

shufflePlaylist(EXTERNAL_BGM_PLAYLIST);

class AudioDirector {
  private ctx: AudioContext | null = null;
  private initialized = false;
  private enabled = true;
  private usingExternalBgm = false;
  private externalBgm: HTMLAudioElement | null = null;
  private externalBgmTrackIndex = 0;
  private externalBgmPlayAttempted = false;
  private settingsHydrated = false;
  private currentState: MusicState = "menu";
  private currentPlanningSubstate: PlanningSubstate = "galaxy";
  private musicStyle: MusicStyle = DEFAULT_AUDIO_SETTINGS.musicStyle;
  private musicVolume = DEFAULT_AUDIO_SETTINGS.musicVolume;
  private sfxVolume = DEFAULT_AUDIO_SETTINGS.sfxVolume;
  private reducedUiSfx = DEFAULT_AUDIO_SETTINGS.reducedUiSfx;

  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private padGain: GainNode | null = null;
  private pulseGain: GainNode | null = null;
  private textureGain: GainNode | null = null;
  private colorFilter: BiquadFilterNode | null = null;

  // Brown noise bed (deep space rumble)
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;

  // Ambient synth — CS-80 dual-layer architecture (per Reverbmachine analysis)
  private ambientGain: GainNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private ambientBrilliance: BiquadFilterNode | null = null; // CS-80 "Brilliance" HPF
  // Layer I: saw + square mix
  private ambientOscA: OscillatorNode | null = null; // Layer I saw
  private ambientOscB: OscillatorNode | null = null; // Layer I square (detuned)
  // Layer II: saw (5th) + sub sine
  private ambientOscSub: OscillatorNode | null = null;
  private ambientOscFifth: OscillatorNode | null = null;
  // Ring mod shimmer (Main Title metallic character)
  private ambientRingCarrier: OscillatorNode | null = null;
  private ambientRingGain: GainNode | null = null;
  private ambientLfo: OscillatorNode | null = null;
  private ambientLfoGain: GainNode | null = null;
  private ambientVibrato: OscillatorNode | null = null;
  private ambientVibratoGain: GainNode | null = null;
  private ambientVibratoRampId: number | null = null;
  private ambientTimerId: number | null = null;

  private padRootOsc: OscillatorNode | null = null;
  private padMidOsc: OscillatorNode | null = null;
  private padHighOsc: OscillatorNode | null = null;
  private pulseOsc: OscillatorNode | null = null;
  private textureOsc: OscillatorNode | null = null;
  private pulseLfo: OscillatorNode | null = null;
  private pulseLfoGain: GainNode | null = null;
  private textureLfo: OscillatorNode | null = null;
  private textureLfoGain: GainNode | null = null;

  private chordStep = 0;
  private pulseStep = 0;
  private scoreBarStep = 0;
  private chordTimerId: number | null = null;
  private pulseTimerId: number | null = null;
  private driftTimerId: number | null = null;
  private scoreTimerId: number | null = null;

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
      musicStyle: this.musicStyle,
    };
  }

  setMusicStyle(style: MusicStyle): void {
    if (this.musicStyle === style) return;
    this.musicStyle = style;
    this.persistSettings();
    this.applyStyleVoicing();
    this.setMusicState(this.currentState);
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

  getCurrentTrackLabel(): string {
    if (EXTERNAL_BGM_PLAYLIST.length === 0) return "N/A";
    return EXTERNAL_BGM_PLAYLIST[this.externalBgmTrackIndex]?.label ?? "N/A";
  }

  nextTrack(): void {
    this.stepExternalTrack(1);
  }

  previousTrack(): void {
    this.stepExternalTrack(-1);
  }

  setSettings(settings: AudioSettings): void {
    this.musicVolume = Phaser.Math.Clamp(settings.musicVolume, 0, 1);
    this.sfxVolume = Phaser.Math.Clamp(settings.sfxVolume, 0, 1);
    this.reducedUiSfx = settings.reducedUiSfx;
    this.musicStyle = settings.musicStyle;
    this.persistSettings();
    this.applyBusVolumes();
    this.applyStyleVoicing();
    this.setMusicState(this.currentState);
  }

  async resume(): Promise<void> {
    this.ensureInitialized();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    await this.playExternalBgmIfNeeded();
  }

  setMusicState(state: MusicState): void {
    this.ensureInitialized();
    if (this.usingExternalBgm) {
      this.currentState = state;
      this.clearVariationTimers();
      this.stopScoreScheduler();
      return;
    }

    if (
      !this.ctx ||
      !this.padRootOsc ||
      !this.padMidOsc ||
      !this.padHighOsc ||
      !this.pulseOsc ||
      !this.textureOsc
    ) {
      return;
    }

    this.currentState = state;
    this.chordStep = 0;
    this.pulseStep = 0;
    this.scoreBarStep = 0;

    const now = this.ctx.currentTime;

    if (this.musicStyle === "score") {
      this.clearVariationTimers();
      if (this.padGain && this.pulseGain && this.textureGain) {
        this.padGain.gain.setTargetAtTime(0.001, now, 0.25);
        this.pulseGain.gain.setTargetAtTime(0.001, now, 0.25);
        this.textureGain.gain.setTargetAtTime(0.001, now, 0.25);
      }
      if (this.colorFilter) {
        this.colorFilter.Q.setTargetAtTime(0.7, now, 0.2);
        this.colorFilter.frequency.setTargetAtTime(1700, now, 0.3);
      }
      this.startScoreScheduler();
      this.resetAmbientTimer();
      return;
    }

    this.stopScoreScheduler();

    this.applyCurrentChord(now, 0.38);
    this.applyPulseStep(now, 0.26);
    this.applyTextureDrift(now, true);

    const mix = this.getMixForState(state);
    if (this.padGain && this.pulseGain && this.textureGain) {
      this.padGain.gain.setTargetAtTime(mix.pad, now, 0.25);
      this.pulseGain.gain.setTargetAtTime(mix.pulse, now, 0.25);
      this.textureGain.gain.setTargetAtTime(mix.texture, now, 0.25);
    }

    if (this.colorFilter) {
      const q = state === "sim" ? 1.2 : 0.75;
      const baseCutoff = this.getBaseCutoffForState(state);
      this.colorFilter.Q.setTargetAtTime(q, now, 0.2);
      this.colorFilter.frequency.setTargetAtTime(baseCutoff, now, 0.3);
      this.applyPlanningSubstateColor();
    }

    this.resetVariationTimers();
    this.resetAmbientTimer();
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

  /**
   * Play a rapid sequence of SFX notes (arpeggio / fanfare effect).
   * Each step can optionally supply its own hz override.
   */
  sfxMelody(
    steps: Array<{ key: SfxKey; delayMs: number; hzOverride?: number }>,
  ): void {
    for (const step of steps) {
      const delayS = step.delayMs / 1000;
      this.ensureInitialized();
      if (!this.ctx || !this.sfxBus || !this.enabled) continue;
      const patch = this.getSfxPatch(step.key);
      if (!patch) continue;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 4200;

      osc.type = patch.type;
      const startHz = step.hzOverride ?? patch.startHz;
      const endHz = step.hzOverride
        ? step.hzOverride * (patch.endHz / Math.max(1, patch.startHz))
        : patch.endHz;
      const now = this.ctx.currentTime + delayS;

      osc.frequency.setValueAtTime(startHz, now);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, endHz),
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
  }

  /** Play a 3-note ascending profit fanfare arpeggio. */
  sfxProfitFanfare(): void {
    this.sfxMelody([
      { key: "cash_gain", delayMs: 0, hzOverride: 440 },
      { key: "cash_gain", delayMs: 90, hzOverride: 550 },
      { key: "milestone_profit", delayMs: 180, hzOverride: 880 },
    ]);
  }

  /** Play a 3-note descending loss sting. */
  sfxLossSting(): void {
    this.sfxMelody([
      { key: "cash_loss", delayMs: 0, hzOverride: 320 },
      { key: "cash_loss", delayMs: 100, hzOverride: 220 },
      { key: "cash_loss", delayMs: 200, hzOverride: 140 },
    ]);
  }

  private applyPlanningSubstateColor(): void {
    if (!this.ctx || !this.colorFilter) return;
    if (this.currentState !== "planning") return;

    const target =
      SUBSTATE_BRIGHTNESS[this.currentPlanningSubstate] *
      this.getStyleBrightnessMultiplier();
    this.colorFilter.frequency.setTargetAtTime(
      target,
      this.ctx.currentTime,
      0.25,
    );
  }

  private getStyleBrightnessMultiplier(): number {
    switch (this.musicStyle) {
      case "ftl":
        return 1.25;
      case "score":
        return 1.18;
      case "retro":
        return 1.45;
      default:
        return 1;
    }
  }

  private isLowPriorityUiSfx(key: SfxKey): boolean {
    return (
      key === "ui_hover" || key === "ui_tab_switch" || key === "ui_row_select"
    );
  }

  private ratioFromSemitones(semitones: number): number {
    return Math.pow(2, semitones / 12);
  }

  private applyCurrentChord(now: number, timeConstant: number): void {
    if (
      !this.padRootOsc ||
      !this.padMidOsc ||
      !this.padHighOsc ||
      !this.textureOsc
    ) {
      return;
    }

    const fundamental = MUSIC_FUNDAMENTAL[this.currentState];
    const progression = this.getStateChords(this.currentState);
    const chord = progression[this.chordStep % progression.length];

    this.padRootOsc.frequency.setTargetAtTime(
      fundamental * this.ratioFromSemitones(chord[0]),
      now,
      timeConstant,
    );
    this.padMidOsc.frequency.setTargetAtTime(
      fundamental * this.ratioFromSemitones(chord[1]),
      now,
      timeConstant,
    );
    this.padHighOsc.frequency.setTargetAtTime(
      fundamental * this.ratioFromSemitones(chord[2]),
      now,
      timeConstant,
    );

    const textureSemitones =
      chord[(this.chordStep + 1) % chord.length] +
      this.getTextureOffsetSemitones();
    this.textureOsc.frequency.setTargetAtTime(
      fundamental * this.ratioFromSemitones(textureSemitones),
      now,
      0.55,
    );
  }

  private getTextureOffsetSemitones(): number {
    switch (this.musicStyle) {
      case "ftl":
        return 5;
      case "score":
        return 4;
      case "retro":
        return 7;
      default:
        return -5;
    }
  }

  private applyPulseStep(now: number, timeConstant: number): void {
    if (!this.pulseOsc) return;

    const fundamental = MUSIC_FUNDAMENTAL[this.currentState];
    const pattern = this.getStatePulsePattern(this.currentState);
    const semitones = pattern[this.pulseStep % pattern.length];
    this.pulseOsc.frequency.setTargetAtTime(
      fundamental * this.ratioFromSemitones(semitones),
      now,
      timeConstant,
    );
  }

  private applyTextureDrift(now: number, initial = false): void {
    if (!this.textureOsc || !this.textureLfo || !this.textureLfoGain) return;

    const cadence = this.getStateCadence(this.currentState);
    const lfoRateHz =
      this.musicStyle === "ftl"
        ? this.currentState === "sim"
          ? 0.2
          : 0.14
        : this.musicStyle === "retro"
          ? this.currentState === "sim"
            ? 0.16
            : 0.12
          : this.currentState === "sim"
            ? 0.14
            : this.currentState === "gameover"
              ? 0.07
              : 0.09;
    const jitter = initial ? 0 : Phaser.Math.FloatBetween(-0.45, 0.45);
    const shimmerDepth =
      this.musicStyle === "ftl"
        ? this.currentState === "sim"
          ? 0.055
          : this.currentState === "gameover"
            ? 0.02
            : 0.04
        : this.musicStyle === "retro"
          ? this.currentState === "sim"
            ? 0.045
            : this.currentState === "gameover"
              ? 0.018
              : 0.032
          : this.currentState === "sim"
            ? 0.035
            : this.currentState === "gameover"
              ? 0.016
              : 0.025;

    this.textureOsc.detune.setTargetAtTime(jitter, now, 1.2);
    this.textureLfo.frequency.setTargetAtTime(lfoRateHz, now, 1.2);
    this.textureLfoGain.gain.setTargetAtTime(
      shimmerDepth,
      now,
      Math.max(0.35, cadence.drift / 9000),
    );
  }

  private resetVariationTimers(): void {
    this.clearVariationTimers();
    if (!this.ctx) return;

    const cadence = this.getStateCadence(this.currentState);
    this.chordTimerId = window.setInterval(() => {
      if (!this.ctx) return;
      this.chordStep += 1;
      this.applyCurrentChord(this.ctx.currentTime, 0.52);
    }, cadence.chord);

    this.pulseTimerId = window.setInterval(() => {
      if (!this.ctx) return;
      this.pulseStep += 1;
      this.applyPulseStep(this.ctx.currentTime, 0.25);
    }, cadence.pulse);

    this.driftTimerId = window.setInterval(() => {
      if (!this.ctx) return;
      this.applyTextureDrift(this.ctx.currentTime);
    }, cadence.drift);
  }

  private clearVariationTimers(): void {
    if (this.chordTimerId !== null) {
      window.clearInterval(this.chordTimerId);
      this.chordTimerId = null;
    }
    if (this.pulseTimerId !== null) {
      window.clearInterval(this.pulseTimerId);
      this.pulseTimerId = null;
    }
    if (this.driftTimerId !== null) {
      window.clearInterval(this.driftTimerId);
      this.driftTimerId = null;
    }
    if (this.ambientTimerId !== null) {
      window.clearInterval(this.ambientTimerId);
      this.ambientTimerId = null;
    }
    if (this.ambientVibratoRampId !== null) {
      window.clearInterval(this.ambientVibratoRampId);
      this.ambientVibratoRampId = null;
    }
  }

  // Blade Runner–inspired ambient chord voicings:
  // Open 5ths, sus4, minor 7ths, Dm Aeolian center with cinematic tensions
  private static readonly AMBIENT_CHORDS: Record<MusicState, number[][]> = {
    menu: [
      [0, 7, 12, 19], // Dm open 5th stack (D–A–D–A)
      [5, 10, 17, 22], // Gm sus → Gm7 feel (G–C–G–C)
      [3, 7, 15, 19], // Fmaj w/ 5th (F–A–D–F) — the "Love Theme" lift
      [0, 5, 12, 17], // Dsus4 (D–G–D–G) — suspended tension
    ],
    setup: [
      [0, 7, 14, 19], // Dm open (D–A–E–A)
      [5, 12, 17, 24], // Gm (G–D–G–D)
      [3, 10, 15, 22], // F→Cm feel
      [0, 5, 12, 19], // Dsus4 open
    ],
    planning: [
      [0, 7, 12, 19], // Dm stack
      [2, 7, 14, 19], // Em pull (tension)
      [5, 12, 17, 24], // Gm
      [3, 7, 12, 19], // F/A → back to D
      [0, 5, 10, 17], // Dsus4 → C (Blade Runner descending motion)
    ],
    sim: [
      [0, 7, 14, 21], // Dm7 open stack — urgency
      [5, 12, 19, 24], // Gm stacked 5ths
      [3, 10, 17, 22], // F open
      [7, 12, 19, 24], // Am → resolution motion
    ],
    report: [
      [0, 7, 12, 19], // Dm rest
      [5, 10, 17, 22], // Gm reflective
      [3, 7, 15, 19], // F — Love Theme callback
    ],
    gameover: [
      [0, 3, 7, 12], // Dm close voicing — intimate, sad
      [0, 5, 10, 15], // Dsus4 → Cm descent
      [3, 7, 10, 15], // F → Dm — "Tears in Rain"
      [0, 3, 8, 12], // Dm(b5) — dark, final
    ],
  };

  private ambientChordStep = 0;

  private resetAmbientTimer(): void {
    if (this.ambientTimerId !== null) {
      window.clearInterval(this.ambientTimerId);
      this.ambientTimerId = null;
    }
    if (
      !this.ctx ||
      !this.ambientOscA ||
      !this.ambientOscB ||
      !this.ambientOscSub ||
      !this.ambientOscFifth ||
      !this.ambientFilter ||
      !this.ambientLfo
    )
      return;

    this.ambientChordStep = 0;
    this.applyAmbientChord();
    this.startVibratoRamp();

    // Vangelis-pace chord changes: very slow, breathe with the scene
    const intervalMs =
      this.currentState === "sim"
        ? 12000
        : this.currentState === "gameover"
          ? 18000
          : this.currentState === "menu"
            ? 15000
            : 14000;

    this.ambientTimerId = window.setInterval(() => {
      this.ambientChordStep += 1;
      this.applyAmbientChord();
    }, intervalMs);
  }

  private applyAmbientChord(): void {
    if (
      !this.ctx ||
      !this.ambientOscA ||
      !this.ambientOscB ||
      !this.ambientOscSub ||
      !this.ambientOscFifth ||
      !this.ambientFilter
    )
      return;

    const now = this.ctx.currentTime;
    const progression = AudioDirector.AMBIENT_CHORDS[this.currentState];
    const chord = progression[this.ambientChordStep % progression.length];
    const fundamental = MUSIC_FUNDAMENTAL[this.currentState];

    // Very slow portamento glides — limits how fast pitch can change
    const rootHz = fundamental * this.ratioFromSemitones(chord[0]);
    // Layer I: slow glides (5-6s time constants = glacial pitch movement)
    this.ambientOscA.frequency.setTargetAtTime(rootHz, now, 5.5);
    this.ambientOscB.frequency.setTargetAtTime(rootHz, now, 6.5);

    // Layer II: open 5th voice — even slower glide
    const fifthHz = fundamental * this.ratioFromSemitones(chord[1]);
    this.ambientOscFifth.frequency.setTargetAtTime(fifthHz, now, 6.0);

    // Sub: octave below root — deep foundation, slowest glide
    this.ambientOscSub.frequency.setTargetAtTime(rootHz * 0.5, now, 4.5);

    // Ring mod carrier at +12 semitones (octave, not +19 — less harsh)
    if (this.ambientRingCarrier) {
      const ringHz = fundamental * this.ratioFromSemitones(chord[0] + 12);
      this.ambientRingCarrier.frequency.setTargetAtTime(ringHz, now, 5.0);
    }

    // Filter envelope — stays lower, opens less, slower movement
    const baseCutoff = this.currentState === "gameover" ? 200 : 280;
    const peakCutoff = this.currentState === "sim" ? 700 : 520;
    // Close filter first (slower close)
    this.ambientFilter.frequency.setTargetAtTime(baseCutoff, now, 1.0);
    // Slow attack open — gentler, stays in bass range
    this.ambientFilter.frequency.setTargetAtTime(peakCutoff, now + 1.5, 5.0);
    // Very slow decay back — long breathing
    this.ambientFilter.frequency.setTargetAtTime(
      baseCutoff + 80,
      now + 10.0,
      6.0,
    );

    // Lower resonance range — less whine at cutoff frequency
    const q = 1.8 + (this.ambientChordStep % 3) * 0.6; // Q cycles 1.8 → 2.4 → 3.0
    this.ambientFilter.Q.setTargetAtTime(Math.min(q, 4), now, 3.0);

    // Reset vibrato ramp each chord (CS-80 aftertouch ramps from zero)
    this.startVibratoRamp();
  }

  /** CS-80 aftertouch simulation: vibrato depth ramps from 0 to full over ~4s */
  private startVibratoRamp(): void {
    if (this.ambientVibratoRampId !== null) {
      window.clearInterval(this.ambientVibratoRampId);
      this.ambientVibratoRampId = null;
    }
    if (!this.ctx || !this.ambientVibratoGain) return;

    // Start with no vibrato
    this.ambientVibratoGain.gain.setValueAtTime(0, this.ctx.currentTime);
    // Ramp to full depth over ~4 seconds
    this.ambientVibratoGain.gain.setTargetAtTime(
      5.0,
      this.ctx.currentTime + 0.5,
      1.8,
    );
  }

  private persistSettings(): void {
    saveAudioSettings({
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      reducedUiSfx: this.reducedUiSfx,
      musicStyle: this.musicStyle,
    });
  }

  private hydrateSettingsFromStorage(): void {
    if (this.settingsHydrated) return;
    const settings = loadAudioSettings();
    this.musicVolume = settings.musicVolume;
    this.sfxVolume = settings.sfxVolume;
    this.reducedUiSfx = settings.reducedUiSfx;
    this.musicStyle = settings.musicStyle;
    this.settingsHydrated = true;
  }

  private applyBusVolumes(): void {
    if (!this.ctx || !this.sfxBus) return;

    const now = this.ctx.currentTime;
    const enabledMultiplier = this.enabled ? 1 : 0;
    if (this.externalBgm) {
      this.externalBgm.volume = Phaser.Math.Clamp(
        enabledMultiplier * this.musicVolume,
        0,
        1,
      );
    }
    if (this.musicBus) {
      this.musicBus.gain.setTargetAtTime(
        enabledMultiplier * this.musicVolume * 0.22,
        now,
        0.08,
      );
    }
    if (this.noiseGain) {
      this.noiseGain.gain.setTargetAtTime(
        enabledMultiplier * this.musicVolume * 0.045,
        now,
        0.12,
      );
    }
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(
        enabledMultiplier * this.musicVolume * 0.08,
        now,
        0.12,
      );
    }
    this.sfxBus.gain.setTargetAtTime(
      enabledMultiplier * this.sfxVolume * 0.4,
      now,
      0.04,
    );
  }

  private initializeExternalBgm(): void {
    if (this.externalBgm || typeof window === "undefined") return;
    if (EXTERNAL_BGM_PLAYLIST.length === 0) {
      this.usingExternalBgm = false;
      return;
    }

    try {
      const bgm = new Audio(
        EXTERNAL_BGM_PLAYLIST[this.externalBgmTrackIndex].url,
      );
      bgm.loop = false;
      bgm.preload = "metadata"; // fetch only headers at init; stream on play
      bgm.volume = 0;
      bgm.addEventListener("ended", () => this.onExternalTrackEnded());
      this.externalBgm = bgm;
      this.usingExternalBgm = true;
    } catch {
      this.externalBgm = null;
      this.usingExternalBgm = false;
    }
  }

  private async playExternalBgmIfNeeded(): Promise<void> {
    if (!this.externalBgm || !this.enabled) return;
    if (!this.externalBgm.paused) return;
    // iOS Safari leaves the element in a broken state after a failed play() —
    // subsequent play() calls also fail until load() resets it.
    if (this.externalBgmPlayAttempted) {
      this.externalBgm.load();
    }
    this.externalBgmPlayAttempted = true;
    try {
      await this.externalBgm.play();
    } catch {
      // Browser autoplay rules can block this until a user gesture.
    }
  }

  private stepExternalTrack(delta: number): void {
    if (!this.usingExternalBgm || !this.externalBgm) return;
    const total = EXTERNAL_BGM_PLAYLIST.length;
    if (total <= 1) return;

    this.externalBgmTrackIndex =
      (this.externalBgmTrackIndex + delta + total) % total;
    this.switchExternalTrack();
  }

  private onExternalTrackEnded(): void {
    this.stepExternalTrack(1);
  }

  private switchExternalTrack(): void {
    if (!this.externalBgm) return;
    const track = EXTERNAL_BGM_PLAYLIST[this.externalBgmTrackIndex];
    const shouldPlay = this.enabled;

    this.externalBgm.pause();
    this.externalBgm.src = track.url;
    this.externalBgm.currentTime = 0;
    this.externalBgm.load();
    this.externalBgmPlayAttempted = false; // load() already called; no pre-load needed

    if (shouldPlay) {
      void this.playExternalBgmIfNeeded();
    }
  }

  private getMixForState(state: MusicState): {
    pad: number;
    pulse: number;
    texture: number;
  } {
    switch (state) {
      case "menu":
        return this.withStyleMix({ pad: 0.22, pulse: 0.035, texture: 0.03 });
      case "setup":
        return this.withStyleMix({ pad: 0.23, pulse: 0.045, texture: 0.035 });
      case "planning":
        return this.withStyleMix({ pad: 0.24, pulse: 0.05, texture: 0.038 });
      case "sim":
        return this.withStyleMix({ pad: 0.22, pulse: 0.065, texture: 0.05 });
      case "report":
        return this.withStyleMix({ pad: 0.2, pulse: 0.038, texture: 0.028 });
      case "gameover":
        return this.withStyleMix({ pad: 0.18, pulse: 0.02, texture: 0.015 });
    }
  }

  private withStyleMix(base: { pad: number; pulse: number; texture: number }): {
    pad: number;
    pulse: number;
    texture: number;
  } {
    if (this.musicStyle === "ftl") {
      return {
        pad: Phaser.Math.Clamp(base.pad * 0.95, 0.001, 1),
        pulse: Phaser.Math.Clamp(base.pulse * 1.75, 0.001, 1),
        texture: Phaser.Math.Clamp(base.texture * 1.4, 0.001, 1),
      };
    }
    if (this.musicStyle === "score") {
      return {
        pad: Phaser.Math.Clamp(base.pad * 0.55, 0.001, 1),
        pulse: Phaser.Math.Clamp(base.pulse * 0.4, 0.001, 1),
        texture: Phaser.Math.Clamp(base.texture * 0.45, 0.001, 1),
      };
    }
    if (this.musicStyle === "retro") {
      return {
        pad: Phaser.Math.Clamp(base.pad * 0.9, 0.001, 1),
        pulse: Phaser.Math.Clamp(base.pulse * 2.05, 0.001, 1),
        texture: Phaser.Math.Clamp(base.texture * 1.65, 0.001, 1),
      };
    }
    return base;
  }

  private getStateChords(state: MusicState): number[][] {
    if (this.musicStyle === "ftl") {
      return {
        menu: [
          [0, 4, 11],
          [2, 7, 12],
          [4, 9, 14],
          [7, 11, 16],
        ],
        setup: [
          [0, 7, 12],
          [2, 9, 14],
          [4, 11, 16],
          [7, 14, 19],
        ],
        planning: [
          [0, 7, 12],
          [2, 9, 14],
          [4, 11, 16],
          [7, 14, 19],
          [9, 16, 21],
        ],
        sim: [
          [0, 7, 12],
          [4, 11, 16],
          [7, 14, 19],
          [11, 16, 23],
        ],
        report: [
          [0, 7, 12],
          [5, 9, 16],
          [7, 11, 18],
          [2, 7, 14],
        ],
        gameover: [
          [0, 3, 10],
          [2, 5, 12],
          [5, 8, 15],
          [3, 7, 14],
        ],
      }[state];
    }
    if (this.musicStyle === "score") {
      return {
        menu: [
          [0, 7, 12],
          [2, 9, 14],
          [5, 12, 16],
          [7, 14, 19],
        ],
        setup: [
          [0, 4, 11],
          [2, 7, 12],
          [4, 9, 14],
          [7, 11, 16],
        ],
        planning: [
          [0, 7, 12],
          [2, 9, 14],
          [4, 11, 16],
          [7, 14, 19],
          [9, 16, 21],
        ],
        sim: [
          [0, 7, 12],
          [4, 11, 16],
          [7, 14, 19],
          [11, 16, 23],
        ],
        report: [
          [0, 7, 12],
          [5, 9, 16],
          [7, 11, 18],
          [2, 7, 14],
        ],
        gameover: [
          [0, 3, 10],
          [2, 5, 12],
          [5, 8, 15],
          [3, 7, 14],
        ],
      }[state];
    }
    if (this.musicStyle === "retro") {
      return {
        menu: [
          [0, 7, 12],
          [3, 10, 15],
          [5, 12, 17],
          [7, 14, 19],
        ],
        setup: [
          [0, 4, 11],
          [3, 7, 14],
          [5, 9, 16],
          [10, 14, 17],
        ],
        planning: [
          [0, 7, 12],
          [3, 10, 15],
          [5, 12, 17],
          [7, 14, 19],
          [10, 17, 22],
        ],
        sim: [
          [0, 7, 12],
          [3, 10, 15],
          [7, 14, 19],
          [10, 17, 22],
        ],
        report: [
          [0, 7, 12],
          [5, 12, 17],
          [3, 10, 15],
          [2, 9, 14],
        ],
        gameover: [
          [0, 3, 10],
          [2, 5, 12],
          [3, 7, 14],
          [5, 8, 15],
        ],
      }[state];
    }
    return STATE_CHORDS[state];
  }

  private getStatePulsePattern(state: MusicState): number[] {
    if (this.musicStyle === "ftl") return FTL_STATE_PULSE_PATTERNS[state];
    if (this.musicStyle === "score") return SCORE_LEAD_PATTERNS[state];
    if (this.musicStyle === "retro") return RETRO_STATE_PULSE_PATTERNS[state];
    return STATE_PULSE_PATTERNS[state];
  }

  private getStateCadence(state: MusicState): {
    chord: number;
    pulse: number;
    drift: number;
  } {
    if (this.musicStyle === "ftl") return FTL_STATE_CADENCE_MS[state];
    if (this.musicStyle === "score") {
      const beatMs = (60 / SCORE_BPM[state]) * 1000;
      return {
        chord: beatMs * 4,
        pulse: beatMs / 2,
        drift: beatMs * 2,
      };
    }
    if (this.musicStyle === "retro") return RETRO_STATE_CADENCE_MS[state];
    return STATE_CADENCE_MS[state];
  }

  private getBaseCutoffForState(state: MusicState): number {
    if (this.musicStyle === "ftl") {
      return state === "gameover" ? 760 : state === "report" ? 980 : 1220;
    }
    if (this.musicStyle === "score") {
      return state === "gameover" ? 900 : state === "report" ? 1150 : 1600;
    }
    if (this.musicStyle === "retro") {
      return state === "gameover" ? 820 : state === "report" ? 1120 : 1380;
    }
    return state === "gameover" ? 700 : state === "report" ? 820 : 980;
  }

  private applyStyleVoicing(): void {
    if (
      !this.pulseOsc ||
      !this.textureOsc ||
      !this.pulseLfo ||
      !this.pulseLfoGain
    ) {
      return;
    }

    const now = this.ctx?.currentTime ?? 0;
    switch (this.musicStyle) {
      case "ftl":
        this.pulseOsc.type = "triangle";
        this.textureOsc.type = "sine";
        this.pulseLfo.frequency.setTargetAtTime(0.12, now, 0.4);
        this.pulseLfoGain.gain.setTargetAtTime(0.018, now, 0.4);
        break;
      case "score":
        this.pulseOsc.type = "sine";
        this.textureOsc.type = "sine";
        this.pulseLfo.frequency.setTargetAtTime(0.06, now, 0.4);
        this.pulseLfoGain.gain.setTargetAtTime(0.004, now, 0.4);
        break;
      case "retro":
        this.pulseOsc.type = "square";
        this.textureOsc.type = "triangle";
        this.pulseLfo.frequency.setTargetAtTime(0.11, now, 0.4);
        this.pulseLfoGain.gain.setTargetAtTime(0.014, now, 0.4);
        break;
      default:
        this.pulseOsc.type = "sine";
        this.textureOsc.type = "triangle";
        this.pulseLfo.frequency.setTargetAtTime(0.09, now, 0.4);
        this.pulseLfoGain.gain.setTargetAtTime(0.01, now, 0.4);
        break;
    }
  }

  private startScoreScheduler(): void {
    if (!this.ctx || !this.musicBus || !this.enabled) return;
    this.stopScoreScheduler();

    const bpm = SCORE_BPM[this.currentState];
    const beatSeconds = 60 / bpm;
    const barSeconds = beatSeconds * 4;

    const scheduleBar = (startTime: number) => {
      if (!this.ctx || !this.musicBus) return;
      const tracks = this.buildGeneratedMidiTracks(
        this.currentState,
        this.scoreBarStep,
      );
      for (const track of tracks) {
        for (const note of track.notes) {
          this.playMidiNote(track, note, startTime, bpm);
        }
      }
      this.scoreBarStep += 1;
      this.chordStep = this.scoreBarStep;
    };

    scheduleBar(this.ctx.currentTime + 0.06);
    this.scoreTimerId = window.setInterval(() => {
      if (!this.ctx) return;
      scheduleBar(this.ctx.currentTime + 0.06);
    }, barSeconds * 1000);
  }

  private stopScoreScheduler(): void {
    if (this.scoreTimerId !== null) {
      window.clearInterval(this.scoreTimerId);
      this.scoreTimerId = null;
    }
  }

  private buildGeneratedMidiTracks(
    state: MusicState,
    barStep: number,
  ): MidiTrack[] {
    const progression = this.getStateChords(state);
    const chord = progression[barStep % progression.length];
    const leadPattern = SCORE_LEAD_PATTERNS[state];
    const rootMidi = this.frequencyToMidi(MUSIC_FUNDAMENTAL[state]);

    const padNotes: MidiNoteEvent[] = chord.map((semi) => ({
      beat: 0,
      lengthBeats: 3.8,
      midi: rootMidi + semi,
      velocity: state === "sim" ? 0.42 : 0.34,
    }));

    const bassNotes: MidiNoteEvent[] = [
      {
        beat: 0,
        lengthBeats: 1.6,
        midi: rootMidi + chord[0] - 12,
        velocity: 0.28,
      },
      {
        beat: 2,
        lengthBeats: 1.6,
        midi: rootMidi + chord[0] - 12,
        velocity: 0.26,
      },
    ];

    const leadNotes: MidiNoteEvent[] = leadPattern.map((semi, index) => ({
      beat: index * 0.5,
      lengthBeats: 0.34,
      midi: rootMidi + semi,
      velocity: state === "sim" ? 0.24 : 0.2,
    }));

    return [
      { role: "pad", waveform: "triangle", notes: padNotes },
      { role: "bass", waveform: "sine", notes: bassNotes },
      { role: "lead", waveform: "sine", notes: leadNotes },
    ];
  }

  private playMidiNote(
    track: MidiTrack,
    note: MidiNoteEvent,
    barStartTime: number,
    bpm: number,
  ): void {
    if (!this.ctx || !this.musicBus) return;

    const beatSeconds = 60 / bpm;
    const startTime = barStartTime + note.beat * beatSeconds;
    const noteSeconds = Math.max(0.03, note.lengthBeats * beatSeconds);

    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = track.waveform;
    osc.frequency.setValueAtTime(this.midiToFrequency(note.midi), startTime);
    osc.detune.setValueAtTime(
      track.role === "lead" ? Phaser.Math.FloatBetween(-2, 2) : 0,
      startTime,
    );

    filter.type = "lowpass";
    filter.frequency.value =
      track.role === "pad" ? 1500 : track.role === "bass" ? 700 : 1800;
    filter.Q.value = track.role === "lead" ? 0.9 : 0.6;

    const peakGain =
      track.role === "pad"
        ? note.velocity * 0.22
        : track.role === "bass"
          ? note.velocity * 0.26
          : note.velocity * 0.2;

    amp.gain.setValueAtTime(0.0001, startTime);
    amp.gain.linearRampToValueAtTime(peakGain, startTime + 0.03);
    amp.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + Math.max(0.06, noteSeconds - 0.02),
    );

    osc.connect(filter);
    filter.connect(amp);
    amp.connect(this.musicBus);

    osc.start(startTime);
    osc.stop(startTime + noteSeconds + 0.03);
  }

  private midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private frequencyToMidi(hz: number): number {
    return Math.round(69 + 12 * Math.log2(hz / 440));
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
      // ── Gamey feedback sounds ─────────────────────────────
      case "cash_gain":
        return {
          type: "triangle",
          startHz: 440,
          endHz: 880,
          attack: 0.003,
          decay: 0.1,
          gain: 0.09,
        };
      case "cash_loss":
        return {
          type: "sawtooth",
          startHz: 320,
          endHz: 110,
          attack: 0.003,
          decay: 0.14,
          gain: 0.085,
        };
      case "route_complete":
        return {
          type: "triangle",
          startHz: 520,
          endHz: 780,
          attack: 0.003,
          decay: 0.1,
          gain: 0.08,
        };
      case "event_opportunity":
        return {
          type: "triangle",
          startHz: 420,
          endHz: 840,
          attack: 0.008,
          decay: 0.16,
          gain: 0.09,
        };
      case "event_hazard":
        return {
          type: "sawtooth",
          startHz: 200,
          endHz: 70,
          attack: 0.005,
          decay: 0.2,
          gain: 0.1,
        };
      case "milestone_profit":
        return {
          type: "sine",
          startHz: 880,
          endHz: 1320,
          attack: 0.01,
          decay: 0.22,
          gain: 0.07,
        };
      case "sim_complete":
        return {
          type: "square",
          startHz: 260,
          endHz: 520,
          attack: 0.006,
          decay: 0.18,
          gain: 0.09,
        };
      case "streak_increment":
        return {
          type: "triangle",
          startHz: 660,
          endHz: 990,
          attack: 0.004,
          decay: 0.13,
          gain: 0.085,
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

    this.initializeExternalBgm();

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVolume * 0.4;
    this.sfxBus.connect(ctx.destination);

    if (this.usingExternalBgm) {
      this.initialized = true;
      this.applyBusVolumes();
      // Only autoplay if the context is already running (e.g. scene transitions after
      // first interaction). On initial prod load the context is suspended — resume()
      // fires on the first pointer gesture instead.
      if (this.ctx.state === "running") {
        void this.playExternalBgmIfNeeded();
      }
      return;
    }

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVolume * 0.26;
    this.musicBus.connect(ctx.destination);

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

    this.padRootOsc = ctx.createOscillator();
    this.padRootOsc.type = "sine";
    this.padRootOsc.frequency.value = MUSIC_FUNDAMENTAL.menu;
    this.padRootOsc.connect(this.padGain);

    this.padMidOsc = ctx.createOscillator();
    this.padMidOsc.type = "triangle";
    this.padMidOsc.frequency.value =
      MUSIC_FUNDAMENTAL.menu * this.ratioFromSemitones(7);
    this.padMidOsc.connect(this.padGain);

    this.padHighOsc = ctx.createOscillator();
    this.padHighOsc.type = "sine";
    this.padHighOsc.frequency.value =
      MUSIC_FUNDAMENTAL.menu * this.ratioFromSemitones(12);
    this.padHighOsc.connect(this.padGain);

    this.padGain.connect(this.colorFilter);

    this.pulseOsc = ctx.createOscillator();
    this.pulseOsc.type = "sine";
    this.pulseOsc.frequency.value = MUSIC_FUNDAMENTAL.menu * 1.5;
    this.pulseOsc.connect(this.pulseGain);
    this.pulseGain.connect(this.colorFilter);

    this.textureOsc = ctx.createOscillator();
    this.textureOsc.type = "triangle";
    this.textureOsc.frequency.value =
      MUSIC_FUNDAMENTAL.menu * this.ratioFromSemitones(19);
    this.textureOsc.connect(this.textureGain);
    this.textureGain.connect(this.colorFilter);

    this.pulseLfo = ctx.createOscillator();
    this.pulseLfo.type = "sine";
    this.pulseLfo.frequency.value = 0.09;
    this.pulseLfoGain = ctx.createGain();
    this.pulseLfoGain.gain.value = 0.01;
    this.pulseLfo.connect(this.pulseLfoGain);
    this.pulseLfoGain.connect(this.pulseGain.gain);

    this.textureLfo = ctx.createOscillator();
    this.textureLfo.type = "sine";
    this.textureLfo.frequency.value = 0.11;
    this.textureLfoGain = ctx.createGain();
    this.textureLfoGain.gain.value = 0.04;
    this.textureLfo.connect(this.textureLfoGain);
    this.textureLfoGain.connect(this.textureOsc.detune);

    this.applyStyleVoicing();

    this.colorFilter.connect(this.musicBus);

    // ── Brown noise bed (deep space rumble — sub-bass focus) ──
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = this.musicVolume * 0.055;
    // Two-stage LPF for steep rolloff — kills any remaining highs
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = "lowpass";
    this.noiseFilter.frequency.value = 60; // very deep cutoff
    this.noiseFilter.Q.value = 0.7; // slight resonance boost at cutoff
    const noiseLpf2 = ctx.createBiquadFilter();
    noiseLpf2.type = "lowpass";
    noiseLpf2.frequency.value = 80; // second stage — steeper rolloff
    noiseLpf2.Q.value = 0.5;
    const noiseHi = ctx.createBiquadFilter();
    noiseHi.type = "highpass";
    noiseHi.frequency.value = 15; // subsonic floor
    noiseHi.Q.value = 0.5;

    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      // Brown noise: integrate white noise (lower coeff = deeper)
      lastOut = (lastOut + 0.015 * white) / 1.015;
      data[i] = lastOut * 4.0;
    }
    this.noiseNode = ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuf;
    this.noiseNode.loop = true;
    this.noiseNode.connect(this.noiseFilter);
    this.noiseFilter.connect(noiseLpf2);
    noiseLpf2.connect(noiseHi);
    noiseHi.connect(this.noiseGain);
    this.noiseGain.connect(ctx.destination);
    this.noiseNode.start();

    // ── CS-80 dual-layer synth (per Reverbmachine Blade Runner analysis) ──
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = this.musicVolume * 0.08;

    // CS-80 "Brilliance" — lowered to preserve bass weight
    this.ambientBrilliance = ctx.createBiquadFilter();
    this.ambientBrilliance.type = "highpass";
    this.ambientBrilliance.frequency.value = 60; // very low — just removes DC/subsonic
    this.ambientBrilliance.Q.value = 0.3;

    this.ambientFilter = ctx.createBiquadFilter();
    this.ambientFilter.type = "lowpass";
    this.ambientFilter.frequency.value = 350; // starts closed and low — bass focus
    this.ambientFilter.Q.value = 3.0; // moderate resonance — less whine at cutoff

    // ─ Layer I: sawtooth + square (CS-80 Layer I = two waveforms mixed) ─
    this.ambientOscA = ctx.createOscillator();
    this.ambientOscA.type = "sawtooth";
    this.ambientOscA.frequency.value = 55;
    this.ambientOscA.detune.value = -12;

    this.ambientOscB = ctx.createOscillator();
    this.ambientOscB.type = "square"; // Layer I square — adds hollow body
    this.ambientOscB.frequency.value = 55;
    this.ambientOscB.detune.value = 14; // wider spread vs saw for beating

    // ─ Layer II: sawtooth at 5th + sine sub ─
    this.ambientOscFifth = ctx.createOscillator();
    this.ambientOscFifth.type = "sawtooth";
    this.ambientOscFifth.frequency.value = 55 * 1.5; // P5 above
    this.ambientOscFifth.detune.value = -6;

    this.ambientOscSub = ctx.createOscillator();
    this.ambientOscSub.type = "sine";
    this.ambientOscSub.frequency.value = 27.5;

    // ─ Ring modulator: metallic shimmer between layers (Main Title char.) ─
    // Multiply Layer I root × a high carrier for inharmonic partials
    this.ambientRingCarrier = ctx.createOscillator();
    this.ambientRingCarrier.type = "sine";
    this.ambientRingCarrier.frequency.value = 55 * this.ratioFromSemitones(19);
    this.ambientRingGain = ctx.createGain();
    this.ambientRingGain.gain.value = 0.04; // very subtle ring mod — minimal high shimmer
    this.ambientRingCarrier.connect(this.ambientRingGain);
    // Modulate Layer I saw amplitude with carrier (AM = ring mod)
    this.ambientRingGain.connect(this.ambientOscA.frequency); // FM approximation of ring mod

    // ─ LFO 1: slow filter sweep (Blade Runner breathing) ─
    this.ambientLfo = ctx.createOscillator();
    this.ambientLfo.type = "triangle";
    this.ambientLfo.frequency.value = 0.012; // ~80 second full cycle — very slow
    this.ambientLfoGain = ctx.createGain();
    this.ambientLfoGain.gain.value = 150; // reduced sweep range — stays in bass territory
    this.ambientLfo.connect(this.ambientLfoGain);
    this.ambientLfoGain.connect(this.ambientFilter.frequency);

    // ─ LFO 2: pitch vibrato — starts at 0, ramps in (CS-80 aftertouch) ─
    this.ambientVibrato = ctx.createOscillator();
    this.ambientVibrato.type = "sine";
    this.ambientVibrato.frequency.value = 5.2; // ~5 Hz vibrato
    this.ambientVibratoGain = ctx.createGain();
    this.ambientVibratoGain.gain.value = 0; // starts at zero — ramps via aftertouch sim
    this.ambientVibrato.connect(this.ambientVibratoGain);
    this.ambientVibratoGain.connect(this.ambientOscA.detune);
    this.ambientVibratoGain.connect(this.ambientOscB.detune);
    this.ambientVibratoGain.connect(this.ambientOscFifth.detune);

    // ─ Gain staging ─
    const layerISquareMix = ctx.createGain();
    layerISquareMix.gain.value = 0.45; // square quieter than saw in CS-80 Layer I
    const fifthMix = ctx.createGain();
    fifthMix.gain.value = 0.65;
    const subMix = ctx.createGain();
    subMix.gain.value = 0.4;

    // ─ Signal chain: oscs → filter → brilliance HPF → gain → output ─
    this.ambientOscA.connect(this.ambientFilter);
    this.ambientOscB.connect(layerISquareMix);
    layerISquareMix.connect(this.ambientFilter);
    this.ambientOscFifth.connect(fifthMix);
    fifthMix.connect(this.ambientFilter);
    this.ambientOscSub.connect(subMix);
    subMix.connect(this.ambientFilter);
    this.ambientFilter.connect(this.ambientBrilliance);
    this.ambientBrilliance.connect(this.ambientGain);
    this.ambientGain.connect(ctx.destination);

    this.ambientOscA.start();
    this.ambientOscB.start();
    this.ambientOscFifth.start();
    this.ambientOscSub.start();
    this.ambientRingCarrier.start();
    this.ambientLfo.start();
    this.ambientVibrato.start();

    this.padRootOsc.start();
    this.padMidOsc.start();
    this.padHighOsc.start();
    this.pulseOsc.start();
    this.textureOsc.start();
    this.pulseLfo.start();
    this.textureLfo.start();

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
