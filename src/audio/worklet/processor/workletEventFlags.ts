/**
 * workletEventFlags.ts — Constantes de bits & empaquetage `flags` pour l'AudioWorklet Percussion (< 130 lignes).
 * Partagé entre le Main Thread (`percussionMeasureEventPacker`) et le scope AudioWorklet (`workletEventQueue`, `workletVoicePoolSoa`).
 */

export const CHOKE_NONE = 0;
export const CHOKE_FAST_8MS = 1;
export const CHOKE_ALFAIA_STRONG_22MS = 2;
export const CHOKE_ALFAIA_ABAFADO_25MS = 3;
export const CHOKE_ALFAIA_GHOST_DUCK_35MS = 4;
export const CHOKE_BARULHO_RELEASE_18MS = 5;
export const CHOKE_RESONANT_20MS = 6;
export const CHOKE_MODE_MASK = 0x7;

export const VOICE_CLASS_GENERIC = 0;
export const VOICE_CLASS_ALFAIA_STRONG = 1;
export const VOICE_CLASS_ALFAIA_SKIN = 2;
export const VOICE_CLASS_OPEN_RESONANT = 3;
export const VOICE_CLASS_SHIFT = 3;
export const VOICE_CLASS_MASK = 0x3;

export const FLAG_STUDIO_CALIBRATED = 1 << 5;
export const FLAG_ABAFADO_FALLBACK_80MS = 1 << 6;

export const BARULHO_OP_NONE = 0;
export const BARULHO_OP_ATTACK_B = 1;
export const BARULHO_OP_SOFT_B = 2;
export const BARULHO_OP_FADEOUT_SLASH = 3;
export const BARULHO_OP_STOP_DOT = 4;
export const BARULHO_OP_SHIFT = 7;
export const BARULHO_OP_MASK = 0x7;

export const WORKLET_SEQ_SHIFT = 10;
export const WORKLET_SEQ_MASK = 0x3FFFFF;

/** Facteur linéaire exact correspondant à -3.5 dB : 10^(-3.5 / 20) */
export const ALFAIA_GHOST_DUCK_GAIN = 0.6683439;

const GONGUE_OPEN_SET = new Set(['G', 'g', 'A', 'a']);
const TIMBAL_OPEN_SET = new Set(['G', 'g', 'A', 'a', 'F', 'f']);
const TIMBAL_DRY_CHOKE_SET = new Set(['P', 'p', 'S', 's', 'V', 'v']);

export function computeBarulhoSoftEntryFrame(
  trackId: number,
  bodyStartFrame: number,
  loopResumeFrame: number,
  loopWrapFrame: number
): number {
  if (loopWrapFrame <= bodyStartFrame || bodyStartFrame <= 0) return Math.max(0, bodyStartFrame);
  const xfade = Math.max(0, loopResumeFrame - bodyStartFrame);
  const safeSpan = Math.max(1, loopWrapFrame - xfade - bodyStartFrame);
  const hash = ((((Math.max(0, trackId | 0) + 1) * 2654435761) >>> 0) % 997) / 997;
  return bodyStartFrame + Math.floor(hash * safeSpan * 0.65);
}

export function resolveBarulhoOpForSymbol(symbol: string, isBarulhoStroke: boolean): number {
  if (symbol === '/') return BARULHO_OP_FADEOUT_SLASH;
  if (symbol === '.') return BARULHO_OP_STOP_DOT;
  if (isBarulhoStroke) return symbol === 'b' ? BARULHO_OP_SOFT_B : BARULHO_OP_ATTACK_B;
  return BARULHO_OP_NONE;
}

export function resolveTrackPhysicsSpec(
  instrumentId: string,
  symbol: string,
  isBarulhoOp: boolean
): { chokeMode: number; voiceClass: number } {
  const isAlfaia = instrumentId === 'marcante' || instrumentId === 'meiao' || instrumentId === 'repique';
  if (isBarulhoOp) {
    return { chokeMode: CHOKE_NONE, voiceClass: isAlfaia ? VOICE_CLASS_ALFAIA_SKIN : VOICE_CLASS_GENERIC };
  }
  if (isAlfaia) {
    if (symbol === 'A' || symbol === 'a') {
      return { chokeMode: CHOKE_ALFAIA_ABAFADO_25MS, voiceClass: VOICE_CLASS_ALFAIA_SKIN };
    }
    if (symbol === 'D' || symbol === 'E') {
      return { chokeMode: CHOKE_ALFAIA_STRONG_22MS, voiceClass: VOICE_CLASS_ALFAIA_STRONG };
    }
    if (symbol === 'd' || symbol === 'e') {
      return { chokeMode: CHOKE_ALFAIA_GHOST_DUCK_35MS, voiceClass: VOICE_CLASS_ALFAIA_SKIN };
    }
    return { chokeMode: CHOKE_BARULHO_RELEASE_18MS, voiceClass: VOICE_CLASS_GENERIC };
  }
  if (instrumentId === 'gongue') {
    if (GONGUE_OPEN_SET.has(symbol)) {
      return { chokeMode: CHOKE_RESONANT_20MS, voiceClass: VOICE_CLASS_OPEN_RESONANT };
    }
    if (symbol === 'X' || symbol === 'x') {
      return { chokeMode: CHOKE_RESONANT_20MS, voiceClass: VOICE_CLASS_GENERIC };
    }
    return { chokeMode: CHOKE_BARULHO_RELEASE_18MS, voiceClass: VOICE_CLASS_GENERIC };
  }
  if (instrumentId === 'timbal') {
    if (TIMBAL_OPEN_SET.has(symbol)) {
      return { chokeMode: CHOKE_RESONANT_20MS, voiceClass: VOICE_CLASS_OPEN_RESONANT };
    }
    if (TIMBAL_DRY_CHOKE_SET.has(symbol)) {
      return { chokeMode: CHOKE_RESONANT_20MS, voiceClass: VOICE_CLASS_GENERIC };
    }
    return { chokeMode: CHOKE_BARULHO_RELEASE_18MS, voiceClass: VOICE_CLASS_GENERIC };
  }
  return { chokeMode: CHOKE_BARULHO_RELEASE_18MS, voiceClass: VOICE_CLASS_GENERIC };
}

export function packWorkletEventFlags(
  seqId: number,
  chokeMode: number,
  voiceClass: number,
  isStudioCalibrated: boolean,
  isAbafadoFallback80ms: boolean,
  barulhoOp = BARULHO_OP_NONE
): number {
  const low =
    (chokeMode & CHOKE_MODE_MASK) |
    ((voiceClass & VOICE_CLASS_MASK) << VOICE_CLASS_SHIFT) |
    (isStudioCalibrated ? FLAG_STUDIO_CALIBRATED : 0) |
    (isAbafadoFallback80ms ? FLAG_ABAFADO_FALLBACK_80MS : 0) |
    ((barulhoOp & BARULHO_OP_MASK) << BARULHO_OP_SHIFT);
  return (((seqId & WORKLET_SEQ_MASK) << WORKLET_SEQ_SHIFT) | low) >>> 0;
}
