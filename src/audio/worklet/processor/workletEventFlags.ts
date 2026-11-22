/**
 * workletEventFlags.ts — Empaquetage `flags` 32-bits & helpers Barulho pour l'AudioWorklet Percussion (< 75 lignes).
 * - `L` / `l` ne déclenche une opération bouclée QUE lorsque `isBarulhoStroke === true` (`apito`), jamais sur `mineiro`.
 */
import {
  CHOKE_MODE_MASK,
  VOICE_CLASS_MASK,
  VOICE_CLASS_SHIFT,
} from './workletChokeRules';

export * from './workletChokeRules';

export const FLAG_STUDIO_CALIBRATED = 1 << 9;
export const FLAG_ABAFADO_FALLBACK_80MS = 1 << 10;

export const BARULHO_OP_NONE = 0;
export const BARULHO_OP_ATTACK_B = 1;
export const BARULHO_OP_SOFT_B = 2;
export const BARULHO_OP_FADEOUT_SLASH = 3;
export const BARULHO_OP_STOP_DOT = 4;
export const BARULHO_OP_PARTNER_B = 5;
export const BARULHO_OP_SHIFT = 11;
export const BARULHO_OP_MASK = 0x7;

export const PLAYER_IDX_SHIFT = 14;
export const PLAYER_IDX_MASK = 0x7;

export const WORKLET_SEQ_SHIFT = 17;
export const WORKLET_SEQ_MASK = 0x7FFF;

export function computeBarulhoSoftEntryFrame(
  trackId: number,
  bodyStartFrame: number,
  loopResumeFrame: number,
  loopWrapFrame: number,
  softEntryFrame?: number
): number {
  const baseEntry = softEntryFrame !== undefined && softEntryFrame >= bodyStartFrame ? softEntryFrame : bodyStartFrame;
  if (loopWrapFrame <= bodyStartFrame || bodyStartFrame <= 0) return Math.max(0, baseEntry);
  const xfade = Math.max(0, loopResumeFrame - bodyStartFrame);
  const safeSpan = Math.max(1, loopWrapFrame - xfade - bodyStartFrame);
  if (trackId <= 0) return Math.min(loopWrapFrame - xfade, baseEntry);
  const hash = ((((Math.max(0, trackId | 0) + 1) * 2654435761) >>> 0) % 997) / 997;
  const offset = Math.floor(hash * safeSpan * 0.65);
  return bodyStartFrame + ((baseEntry - bodyStartFrame + offset) % safeSpan);
}

export function resolveBarulhoOpForSymbol(
  symbol: string,
  isBarulhoStroke: boolean,
  instrumentId = ''
): number {
  if (symbol === '/') return BARULHO_OP_FADEOUT_SLASH;
  if (symbol === '.') return BARULHO_OP_STOP_DOT;
  if (!isBarulhoStroke) return BARULHO_OP_NONE;
  if (symbol === 'b' || (instrumentId === 'apito' && symbol === 'l')) return BARULHO_OP_SOFT_B;
  return BARULHO_OP_ATTACK_B;
}

export function packWorkletEventFlags(
  seqId: number,
  chokeMode: number,
  voiceClass: number,
  isStudioCalibrated: boolean,
  isAbafadoFallback80ms: boolean,
  barulhoOp = BARULHO_OP_NONE,
  playerIdx = 0
): number {
  const low =
    (chokeMode & CHOKE_MODE_MASK) |
    ((voiceClass & VOICE_CLASS_MASK) << VOICE_CLASS_SHIFT) |
    (isStudioCalibrated ? FLAG_STUDIO_CALIBRATED : 0) |
    (isAbafadoFallback80ms ? FLAG_ABAFADO_FALLBACK_80MS : 0) |
    ((barulhoOp & BARULHO_OP_MASK) << BARULHO_OP_SHIFT) |
    ((playerIdx & PLAYER_IDX_MASK) << PLAYER_IDX_SHIFT);
  return (((seqId & WORKLET_SEQ_MASK) << WORKLET_SEQ_SHIFT) | low) >>> 0;
}
