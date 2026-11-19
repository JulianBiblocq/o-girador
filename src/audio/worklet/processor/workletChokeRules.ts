/**
 * workletChokeRules.ts — Constantes de classes percussives & matrice acoustique SSOT de Choke DSP (< 120 lignes).
 * Partagé entre l'AudioWorklet SOA, le moteur Web Audio temps réel et l'export Bounce WAV hors-ligne.
 */

export const CHOKE_NONE = 0;
export const CHOKE_FAST_8MS = 1;
export const CHOKE_ALFAIA_STRONG_22MS = 2;
export const CHOKE_ALFAIA_ABAFADO_25MS = 3;
export const CHOKE_ALFAIA_GHOST_DUCK_35MS = 4;
export const CHOKE_BARULHO_RELEASE_18MS = 5;
export const CHOKE_RESONANT_20MS = 6;
export const CHOKE_GONGUE_OPEN_STRONG = 7;
export const CHOKE_SHAKER_POS_25MS = 8;
export const CHOKE_SHAKER_NEG_25MS = 9;
export const CHOKE_SHAKER_NEUTRAL_25MS = 10;
export const CHOKE_APITO_20MS = 11;
export const CHOKE_TIMBAL_BASS_22MS = 12;
export const CHOKE_TIMBAL_OPEN_20MS = 13;
export const CHOKE_TIMBAL_PRESO_SLAP_LP = 14;
export const CHOKE_BARULHO_RELEASE_20MS = 15;
export const CHOKE_SNARE_STRONG_DAMP_28MS = 16;
export const CHOKE_SNARE_GHOST_TOUCH_35MS = 17;
export const CHOKE_MODE_MASK = 0x1F;

export const VOICE_CLASS_GENERIC = 0;
export const VOICE_CLASS_ALFAIA_STRONG = 1;
export const VOICE_CLASS_ALFAIA_SKIN = 2;
export const VOICE_CLASS_OPEN_RESONANT = 3;
export const VOICE_CLASS_GONGUE_OPEN_WEAK = 4;
export const VOICE_CLASS_SHAKER_POS = 5;
export const VOICE_CLASS_SHAKER_NEG = 6;
export const VOICE_CLASS_SHAKER_LONG = 7;
export const VOICE_CLASS_APITO_SHORT = 8;
export const VOICE_CLASS_TIMBAL_BASS = 9;
export const VOICE_CLASS_TIMBAL_OPEN = 10;
export const VOICE_CLASS_TIMBAL_SLAP = 11;
export const VOICE_CLASS_SNARE_OPEN = 12;
export const VOICE_CLASS_SHIFT = 5;
export const VOICE_CLASS_MASK = 0xF;

/** Facteurs linéaires : -3.5 dB (Alfaia ghost), -6.0 dB (Gonguê G/A), -5.5 dB & -1.5 dB (Caixa ring/malha) */
export const ALFAIA_GHOST_DUCK_GAIN = 0.6683439;
export const GONGUE_OPEN_DUCK_GAIN = 0.5011872;
export const SNARE_STRONG_RING_DUCK_GAIN = 0.5308844;
export const SNARE_GHOST_TOUCH_DUCK_GAIN = 0.8413951;

/** Constantes du Low-Pass Choke Timbal (< 160 Hz en 15 ms, résonance colonne d'air 150 ms) */
export const TIMBAL_LP_CUTOFF_HZ = 160;
export const TIMBAL_LP_STAGE_HZ = 248.6;
export const TIMBAL_LP_MIX_RAMP_SEC = 0.015;
export const TIMBAL_LP_AIR_DECAY_SEC = 0.150;

export interface WorkletSkinPhysicsTarget {
  readonly duckTarget: Float32Array;
  readonly lpActive: Uint8Array;
  readonly lpStartInBlock: Uint8Array;
  readonly lpMixFramesLeft: Int32Array;
  readonly lpMix: Float32Array;
  readonly lpMixDelta: Float32Array;
  chokeSlot(
    v: number, frames: number, startInBlock: number, voiceState: Uint8Array,
    chokeStart: Uint8Array, chokeLeft: Int32Array, chokeDelta: Float32Array, barulhoMode: Uint8Array
  ): void;
  duckSlot(v: number, targetMul: number, frames: number, startInBlock: number, minFloor?: number): void;
  duckNonCumulativeSlot(v: number, absTarget: number, frames: number, startInBlock: number): void;
}

const CAIXA_STRONG_RING_SET = new Set(['D', 'E', 'A', 'a', 'F', 'f', 'R', 'r']);

export function resolveTrackPhysicsSpec(
  instrumentId: string,
  symbol: string,
  isBarulhoOp: boolean
): { chokeMode: number; voiceClass: number } {
  const isAlfaia = instrumentId === 'marcante' || instrumentId === 'meiao' || instrumentId === 'repique';
  if (isBarulhoOp) {
    if (instrumentId === 'apito' && (symbol === 'L' || symbol === 'W')) {
      return { chokeMode: CHOKE_APITO_20MS, voiceClass: VOICE_CLASS_GENERIC };
    }
    return { chokeMode: CHOKE_NONE, voiceClass: isAlfaia ? VOICE_CLASS_ALFAIA_SKIN : VOICE_CLASS_GENERIC };
  }
  if (isAlfaia) {
    if (symbol === 'A' || symbol === 'a') return { chokeMode: CHOKE_ALFAIA_ABAFADO_25MS, voiceClass: VOICE_CLASS_ALFAIA_SKIN };
    if (symbol === 'D' || symbol === 'E') return { chokeMode: CHOKE_ALFAIA_STRONG_22MS, voiceClass: VOICE_CLASS_ALFAIA_STRONG };
    if (symbol === 'd' || symbol === 'e') return { chokeMode: CHOKE_ALFAIA_GHOST_DUCK_35MS, voiceClass: VOICE_CLASS_ALFAIA_SKIN };
    return { chokeMode: CHOKE_BARULHO_RELEASE_18MS, voiceClass: VOICE_CLASS_GENERIC };
  }
  if (instrumentId === 'caixa') {
    if (symbol === 'X' || symbol === 'x' || symbol === 'C' || symbol === 'c') {
      return { chokeMode: CHOKE_BARULHO_RELEASE_20MS, voiceClass: VOICE_CLASS_GENERIC };
    }
    if (symbol === 'd' || symbol === 'e') {
      return { chokeMode: CHOKE_SNARE_GHOST_TOUCH_35MS, voiceClass: VOICE_CLASS_GENERIC };
    }
    if (CAIXA_STRONG_RING_SET.has(symbol)) {
      return { chokeMode: CHOKE_SNARE_STRONG_DAMP_28MS, voiceClass: VOICE_CLASS_SNARE_OPEN };
    }
    return { chokeMode: CHOKE_BARULHO_RELEASE_20MS, voiceClass: VOICE_CLASS_GENERIC };
  }
  if (instrumentId === 'gongue') {
    if (symbol === 'X' || symbol === 'x') return { chokeMode: CHOKE_RESONANT_20MS, voiceClass: VOICE_CLASS_GENERIC };
    if (symbol === 'G' || symbol === 'A') return { chokeMode: CHOKE_GONGUE_OPEN_STRONG, voiceClass: VOICE_CLASS_OPEN_RESONANT };
    if (symbol === 'g' || symbol === 'a') return { chokeMode: CHOKE_BARULHO_RELEASE_18MS, voiceClass: VOICE_CLASS_GONGUE_OPEN_WEAK };
    return { chokeMode: CHOKE_BARULHO_RELEASE_18MS, voiceClass: VOICE_CLASS_GENERIC };
  }
  if (instrumentId === 'agbe') {
    if (symbol === 'D') return { chokeMode: CHOKE_SHAKER_POS_25MS, voiceClass: VOICE_CLASS_SHAKER_POS };
    if (symbol === 'E') return { chokeMode: CHOKE_SHAKER_NEG_25MS, voiceClass: VOICE_CLASS_SHAKER_NEG };
    if (symbol === 'S' || symbol === 's') return { chokeMode: CHOKE_SHAKER_NEUTRAL_25MS, voiceClass: VOICE_CLASS_GENERIC };
    if (symbol === 'V' || symbol === 'v') return { chokeMode: CHOKE_BARULHO_RELEASE_18MS, voiceClass: VOICE_CLASS_SHAKER_LONG };
    return { chokeMode: CHOKE_BARULHO_RELEASE_18MS, voiceClass: VOICE_CLASS_GENERIC };
  }
  if (instrumentId === 'mineiro') {
    if (symbol === 'P') return { chokeMode: CHOKE_SHAKER_POS_25MS, voiceClass: VOICE_CLASS_SHAKER_POS };
    if (symbol === 'T') return { chokeMode: CHOKE_SHAKER_NEG_25MS, voiceClass: VOICE_CLASS_SHAKER_NEG };
    if (symbol === 'L' || symbol === 'l') return { chokeMode: CHOKE_BARULHO_RELEASE_18MS, voiceClass: VOICE_CLASS_SHAKER_LONG };
    return { chokeMode: CHOKE_BARULHO_RELEASE_18MS, voiceClass: VOICE_CLASS_GENERIC };
  }
  if (instrumentId === 'apito') return { chokeMode: CHOKE_APITO_20MS, voiceClass: VOICE_CLASS_APITO_SHORT };
  if (instrumentId === 'timbal') {
    if (symbol === 'G' || symbol === 'g') return { chokeMode: CHOKE_TIMBAL_BASS_22MS, voiceClass: VOICE_CLASS_TIMBAL_BASS };
    if (symbol === 'P' || symbol === 'p') return { chokeMode: CHOKE_TIMBAL_PRESO_SLAP_LP, voiceClass: VOICE_CLASS_GENERIC };
    if (symbol === 'S' || symbol === 's' || symbol === 'V' || symbol === 'v') return { chokeMode: CHOKE_TIMBAL_PRESO_SLAP_LP, voiceClass: VOICE_CLASS_TIMBAL_SLAP };
    if (symbol === 'A' || symbol === 'a' || symbol === 'F' || symbol === 'f') return { chokeMode: CHOKE_TIMBAL_OPEN_20MS, voiceClass: VOICE_CLASS_TIMBAL_OPEN };
    return { chokeMode: CHOKE_BARULHO_RELEASE_18MS, voiceClass: VOICE_CLASS_GENERIC };
  }
  return { chokeMode: CHOKE_BARULHO_RELEASE_18MS, voiceClass: VOICE_CLASS_GENERIC };
}
