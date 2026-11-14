/**
 * workletEventFlags.ts — Constantes de bits & empaquetage `flags` pour l'AudioWorklet Percussion (< 75 lignes).
 * Partagé entre le Main Thread (`percussionMeasureEventPacker`) et le scope AudioWorklet (`workletEventQueue`, `workletVoicePoolSoa`).
 */

export const CHOKE_NONE = 0;
export const CHOKE_FAST_8MS = 1;
export const CHOKE_ALFAIA_STRONG_22MS = 2;
export const CHOKE_ALFAIA_ABAFADO_25MS = 3;
export const CHOKE_ALFAIA_GHOST_DUCK_35MS = 4;
export const CHOKE_MODE_MASK = 0x7;

export const VOICE_CLASS_GENERIC = 0;
export const VOICE_CLASS_ALFAIA_STRONG = 1;
export const VOICE_CLASS_ALFAIA_SKIN = 2;
export const VOICE_CLASS_SHIFT = 3;
export const VOICE_CLASS_MASK = 0x3;

export const FLAG_STUDIO_CALIBRATED = 1 << 5;
export const FLAG_ABAFADO_FALLBACK_80MS = 1 << 6;
export const WORKLET_SEQ_SHIFT = 7;
export const WORKLET_SEQ_MASK = 0x1FFFFFF;

/** Facteur linéaire exact correspondant à -3.5 dB : 10^(-3.5 / 20) */
export const ALFAIA_GHOST_DUCK_GAIN = 0.6683439;

export function resolveAlfaiaPhysicsSpec(
  isAlfaia: boolean,
  symbol: string,
  isBarulho: boolean,
  wasBarulho: boolean
): { chokeMode: number; voiceClass: number } {
  if (isAlfaia) {
    if (symbol === 'A' || symbol === 'a') {
      return { chokeMode: CHOKE_ALFAIA_ABAFADO_25MS, voiceClass: VOICE_CLASS_ALFAIA_SKIN };
    }
    if (symbol === 'D' || symbol === 'E') {
      return { chokeMode: CHOKE_ALFAIA_STRONG_22MS, voiceClass: VOICE_CLASS_ALFAIA_STRONG };
    }
    if (symbol === 'd' || symbol === 'e') {
      return {
        chokeMode: wasBarulho ? CHOKE_FAST_8MS : CHOKE_ALFAIA_GHOST_DUCK_35MS,
        voiceClass: VOICE_CLASS_ALFAIA_SKIN,
      };
    }
    if (isBarulho) return { chokeMode: CHOKE_NONE, voiceClass: VOICE_CLASS_ALFAIA_SKIN };
    return { chokeMode: wasBarulho ? CHOKE_FAST_8MS : CHOKE_NONE, voiceClass: VOICE_CLASS_GENERIC };
  }
  const isLegacyChoke = symbol === 'p' || symbol === 'P' || (!isBarulho && wasBarulho);
  return { chokeMode: isLegacyChoke ? CHOKE_FAST_8MS : CHOKE_NONE, voiceClass: VOICE_CLASS_GENERIC };
}

export function packWorkletEventFlags(
  seqId: number,
  chokeMode: number,
  voiceClass: number,
  isStudioCalibrated: boolean,
  isAbafadoFallback80ms: boolean
): number {
  const low =
    (chokeMode & CHOKE_MODE_MASK) |
    ((voiceClass & VOICE_CLASS_MASK) << VOICE_CLASS_SHIFT) |
    (isStudioCalibrated ? FLAG_STUDIO_CALIBRATED : 0) |
    (isAbafadoFallback80ms ? FLAG_ABAFADO_FALLBACK_80MS : 0);
  return (((seqId & WORKLET_SEQ_MASK) << WORKLET_SEQ_SHIFT) | low) >>> 0;
}
