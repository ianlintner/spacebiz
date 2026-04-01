export interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  reducedUiSfx: boolean;
}

const AUDIO_SETTINGS_KEY = "sft_audio_settings";

interface AudioSettingsEnvelope {
  version: 1;
  settings: AudioSettings;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  reducedUiSfx: false,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function sanitize(settings: AudioSettings): AudioSettings {
  return {
    musicVolume: clamp01(settings.musicVolume),
    sfxVolume: clamp01(settings.sfxVolume),
    reducedUiSfx: settings.reducedUiSfx,
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
      envelope.version === 1 &&
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
    version: 1,
    settings: sanitize(settings),
  };
  localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(envelope));
}
