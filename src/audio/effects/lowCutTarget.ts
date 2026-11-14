/**
 * lowCutTarget.ts — Constantes Butterworth & cible fréquentielle Coupe-Bas / Subsonic HPF (< 30 lignes).
 * Partagé sans dépendance Tone.js entre le graphe Live et le Bounce WAV hors-ligne.
 */

export const BUTTERWORTH_Q = Math.SQRT1_2;
export const SUBSONIC_BUS_HPF_HZ = 30;

export interface LowCutTrackLike {
  lowCut?: boolean;
  isBusFolder?: boolean;
  isLinkFolder?: boolean;
}

export function resolveLowCutTargetHz(track: LowCutTrackLike | null | undefined, isNeutral = false): number {
  if (!isNeutral && track?.lowCut) return 80;
  return (track?.isBusFolder || track?.isLinkFolder) ? SUBSONIC_BUS_HPF_HZ : 20;
}
