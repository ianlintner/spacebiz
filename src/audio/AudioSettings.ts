export type MusicStyle = "ambient" | "ftl" | "score" | "retro";

export interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  reducedUiSfx: boolean;
  musicStyle: MusicStyle;
}

const AUDIO_SETTINGS_KEY = "sft_audio_settings";

interface AudioSettingsEnvelope {
  version: 1 | 2;
  settings: AudioSettings;
}

const IS_DEV =
  typeof import.meta !== "undefined" &&
  (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  musicVolume: IS_DEV ? 0.5 : 0.7,
  sfxVolume: IS_DEV ? 0.5 : 0.8,
  reducedUiSfx: false,
  musicStyle: "ftl",
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function sanitizeMusicStyle(value: unknown): MusicStyle {
  return value === "ftl" ||
    value === "retro" ||
    value === "score" ||
    value === "ambient"
    ? value
    : DEFAULT_AUDIO_SETTINGS.musicStyle;
}

function sanitize(settings: Partial<AudioSettings>): AudioSettings {
  return {
    musicVolume: clamp01(
      settings.musicVolume ?? DEFAULT_AUDIO_SETTINGS.musicVolume,
    ),
    sfxVolume: clamp01(settings.sfxVolume ?? DEFAULT_AUDIO_SETTINGS.sfxVolume),
    reducedUiSfx: settings.reducedUiSfx ?? DEFAULT_AUDIO_SETTINGS.reducedUiSfx,
    musicStyle: sanitizeMusicStyle(settings.musicStyle),
  };
}

export function loadAudioSettings(): AudioSettings {
  const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
  if (!raw) {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }

  try {
    const envelope = JSON.parse(raw) as AudioSettingsEnvelope;
    if (
      envelope &&
      typeof envelope === "object" &&
      (envelope.version === 1 || envelope.version === 2) &&
      envelope.settings
    ) {
      return sanitize(envelope.settings);
    }
  } catch {
    // Fall through to default settings.
  }

  return { ...DEFAULT_AUDIO_SETTINGS };
}

export function saveAudioSettings(settings: AudioSettings): void {
  const envelope: AudioSettingsEnvelope = {
    version: 2,
    settings: sanitize(settings),
  };
  localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(envelope));
}
