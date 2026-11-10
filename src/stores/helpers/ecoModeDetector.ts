import { detectHardwareCapabilities } from '../../utils/hardwareDetection';

export interface EcoConfig {
  disableFx: boolean;
  disableEq: boolean;
  disableAnimations: boolean;
}

const ECO_STORAGE_KEY = 'o-girador-eco-mode';
const STRICT_AUDIO_STORAGE_KEY = 'o-girador-eco-strict-audio';

/** Palier 0 : tout actif (son et visuel complets). */
export const ECO_OFF_CONFIG: EcoConfig = { disableFx: false, disableEq: false, disableAnimations: false };

/** Construit une configuration coherente : le Palier 2 implique toujours le Palier 1. */
export function buildEcoConfig(isEcoMode: boolean, strictAudio: boolean): EcoConfig {
  if (!isEcoMode) return { ...ECO_OFF_CONFIG };
  return { disableAnimations: true, disableFx: strictAudio, disableEq: strictAudio };
}

/**
 * Premier lancement : seule la detection materielle (<= 2 coeurs / <= 2 Go) peut activer
 * le Palier 1. Le Palier 2 (allegement audio) n'est JAMAIS active automatiquement.
 */
export const detectEcoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(ECO_STORAGE_KEY);
  if (saved !== null) return saved === 'true';
  return detectHardwareCapabilities().isVeryLowEnd;
};

export const detectStrictAudioEco = (isEcoMode: boolean): boolean => {
  if (typeof window === 'undefined' || !isEcoMode) return false;
  return localStorage.getItem(STRICT_AUDIO_STORAGE_KEY) === 'true';
};

export function persistEcoState(isEcoMode: boolean, strictAudio: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ECO_STORAGE_KEY, String(isEcoMode));
    localStorage.setItem(STRICT_AUDIO_STORAGE_KEY, String(isEcoMode && strictAudio));
  } catch (err) {
    console.error('[EcoMode] Failed to persist eco state:', err);
  }
}
