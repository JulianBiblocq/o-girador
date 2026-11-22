/**
 * lowCutTarget.ts — Constantes Butterworth & cible fréquentielle Coupe-Bas / Subsonic HPF (< 35 lignes).
 * - Inclut le passe-haut intrinsèque `180 Hz` du Tarol Studio (actif même sans Caixa pour dégager le bas-médium).
 * - Partagé sans dépendance Tone.js entre le graphe Live et le Bounce WAV hors-ligne.
 */
import { instrumentsConfig } from '../../data';
import { STUDIO_BANK_ENABLED } from '../../universes/maracatu/instruments/studioBankRegistry';

export const BUTTERWORTH_Q = Math.SQRT1_2;
export const SUBSONIC_BUS_HPF_HZ = 30;
export const TAROL_STUDIO_INTRINSIC_HPF_HZ = 180;

export interface LowCutTrackLike {
  instrumentIdx?: number;
  lowCut?: boolean;
  isBusFolder?: boolean;
  isLinkFolder?: boolean;
}

export function resolveLowCutTargetHz(track: LowCutTrackLike | null | undefined, isNeutral = false): number {
  if (track?.isBusFolder || track?.isLinkFolder) {
    return !isNeutral && track?.lowCut ? 80 : SUBSONIC_BUS_HPF_HZ;
  }
  if (!isNeutral && typeof track?.instrumentIdx === 'number') {
    const instId = instrumentsConfig[track.instrumentIdx]?.id;
    if (instId === 'tarol' && STUDIO_BANK_ENABLED.tarol) return TAROL_STUDIO_INTRINSIC_HPF_HZ;
  }
  if (!isNeutral && track?.lowCut) return 80;
  return 20;
}
