/**
 * selectiveTrackChokePhysics.ts — Règles Web Audio / Bounce d'étouffement sélectif par instrument (< 136 lignes).
 * Parité stricte avec `workletSkinPhysics.ts` :
 * - Caixa (`20 ms` sur `B/b` pour toute frappe, `-5.5 dB / 28 ms` ring damp sur coups forts/Rufada, immunité totale de `X` et `C`),
 *   Gonguê (`X` 20 ms tout, `G/A` -6 dB / 25 ms), Agbê/Mineiro (`25 ms`), Apito (`20 ms`) et Timbal Low-Pass Choke `< 160 Hz`.
 */
import {
  GONGUE_OPEN_DUCK_GAIN, SNARE_GHOST_TOUCH_DUCK_GAIN, SNARE_STRONG_RING_DUCK_GAIN,
  TIMBAL_LP_AIR_DECAY_SEC, TIMBAL_LP_CUTOFF_HZ, TIMBAL_LP_MIX_RAMP_SEC,
} from '../worklet/processor/workletSkinPhysics';
import { ActiveVoice, ALFAIA_INSTRUMENTS } from './engineTypes';

const CAIXA_OPEN_RING = new Set(['D', 'E', 'A', 'a', 'F', 'f', 'R', 'r']);
const GONGUE_ALL_OPEN = new Set(['G', 'g', 'A', 'a']);
const TIMBAL_HIGH_VOICES = new Set(['A', 'a', 'F', 'f', 'S', 's', 'T', 't', 'V', 'v']);
const TIMBAL_LP_TRIGGERS = new Set(['P', 'p', 'S', 's', 'V', 'v']);

export function isWebAudioLoopVoiceSymbol(instId: string, sym?: string): boolean {
  return Boolean(sym && (sym === 'B' || sym === 'b' || (instId === 'apito' && (sym === 'L' || sym === 'l' || sym === 'W'))));
}

export function resolveFrankStrokeBarulhoChokeSec(instId: string, sym: string): number {
  if (ALFAIA_INSTRUMENTS.has(instId)) {
    return sym === 'A' || sym === 'a' ? 0.025 : (sym === 'D' || sym === 'E' ? 0.022 : 0.018);
  }
  if (instId === 'caixa') return 0.020;
  if (instId === 'agbe' && (sym === 'D' || sym === 'E' || sym === 'S' || sym === 's')) return 0.025;
  if (instId === 'mineiro' && (sym === 'P' || sym === 'T')) return 0.025;
  if (instId === 'gongue' && (sym === 'X' || sym === 'x' || sym === 'G' || sym === 'A')) return 0.020;
  if (instId === 'apito') return 0.020;
  if (instId === 'timbal' && (TIMBAL_LP_TRIGGERS.has(sym) || TIMBAL_HIGH_VOICES.has(sym) || sym === 'G' || sym === 'g')) return 0.020;
  return 0.018;
}

export interface ChokeVoiceOps {
  chokeVoiceIn: (v: ActiveVoice, time: number, rampSec: number) => void;
  duckVoiceIn: (v: ActiveVoice, time: number, durSec: number, gainMul: number) => void;
  lowPassChokeVoice: (v: ActiveVoice, time: number, cutoffHz: number, filterRampSec: number, ampDecaySec: number) => void;
}

export function applyNonAlfaiaSelectiveChoke(
  voices: ActiveVoice[], instId: string, strokeSymbol: string, time: number, ops: ChokeVoiceOps
): void {
  if (instId === 'caixa') {
    if (strokeSymbol === 'X' || strokeSymbol === 'x' || strokeSymbol === 'C' || strokeSymbol === 'c') return;
    const isGhost = strokeSymbol === 'd' || strokeSymbol === 'e';
    if (!isGhost && !CAIXA_OPEN_RING.has(strokeSymbol)) return;
    for (const v of voices) {
      if (!v?.gainNode || !v.strokeSymbol || !CAIXA_OPEN_RING.has(v.strokeSymbol) || !(v.time < time && time < v.expectedEnd)) continue;
      if (isGhost && !v.isDucked) ops.duckVoiceIn(v, time, 0.035, SNARE_GHOST_TOUCH_DUCK_GAIN);
      else if (!isGhost) ops.duckVoiceIn(v, time, 0.028, SNARE_STRONG_RING_DUCK_GAIN);
    }
    return;
  }

  if (instId === 'gongue') {
    if (strokeSymbol === 'X' || strokeSymbol === 'x') {
      for (const v of voices) {
        if (v?.gainNode && v.strokeSymbol && GONGUE_ALL_OPEN.has(v.strokeSymbol) && v.time < time && time < v.expectedEnd) {
          ops.chokeVoiceIn(v, time, 0.020);
        }
      }
    } else if (strokeSymbol === 'G' || strokeSymbol === 'A') {
      for (const v of voices) {
        if (v?.gainNode && (v.strokeSymbol === 'G' || v.strokeSymbol === 'A') && v.time < time && time < v.expectedEnd) {
          ops.duckVoiceIn(v, time, 0.025, GONGUE_OPEN_DUCK_GAIN);
        }
      }
    }
    return;
  }

  if (instId === 'agbe') {
    if (strokeSymbol !== 'D' && strokeSymbol !== 'E' && strokeSymbol !== 'S' && strokeSymbol !== 's') return;
    const opp = strokeSymbol === 'D' ? 'E' : (strokeSymbol === 'E' ? 'D' : '');
    for (const v of voices) {
      const sym = v?.strokeSymbol;
      if (v?.gainNode && (sym === 'V' || sym === 'v' || (opp !== '' && sym === opp)) && v.time < time && time < v.expectedEnd) {
        ops.chokeVoiceIn(v, time, 0.025);
      }
    }
    return;
  }

  if (instId === 'mineiro') {
    if (strokeSymbol !== 'P' && strokeSymbol !== 'T') return;
    const opp = strokeSymbol === 'P' ? 'T' : 'P';
    for (const v of voices) {
      const sym = v?.strokeSymbol;
      if (v?.gainNode && (sym === 'L' || sym === 'l' || sym === opp) && v.time < time && time < v.expectedEnd) {
        ops.chokeVoiceIn(v, time, 0.025);
      }
    }
    return;
  }

  if (instId === 'apito') {
    if (strokeSymbol === 'l' || strokeSymbol === '/' || strokeSymbol === '.') return;
    for (const v of voices) {
      const sym = v?.strokeSymbol;
      if (v?.gainNode && (sym === 'C' || sym === 'c' || sym === 'w') && v.time < time && time < v.expectedEnd) {
        ops.chokeVoiceIn(v, time, 0.020);
      }
    }
    return;
  }

  if (instId === 'timbal') {
    if (strokeSymbol === 'G' || strokeSymbol === 'g') {
      for (const v of voices) {
        if (v?.gainNode && (v.strokeSymbol === 'G' || v.strokeSymbol === 'g') && v.time < time && time < v.expectedEnd) {
          ops.chokeVoiceIn(v, time, 0.022);
        }
      }
    } else if (TIMBAL_LP_TRIGGERS.has(strokeSymbol)) {
      for (const v of voices) {
        if (!v?.gainNode || !(v.time < time && time < v.expectedEnd)) continue;
        if (v.strokeSymbol === 'G' || v.strokeSymbol === 'g') {
          ops.lowPassChokeVoice(v, time, TIMBAL_LP_CUTOFF_HZ, TIMBAL_LP_MIX_RAMP_SEC, TIMBAL_LP_AIR_DECAY_SEC);
        } else if (v.strokeSymbol && TIMBAL_HIGH_VOICES.has(v.strokeSymbol)) {
          ops.chokeVoiceIn(v, time, 0.020);
        }
      }
    } else if (strokeSymbol === 'A' || strokeSymbol === 'a' || strokeSymbol === 'T' || strokeSymbol === 't' || strokeSymbol === 'F' || strokeSymbol === 'f') {
      for (const v of voices) {
        if (v?.gainNode && v.strokeSymbol && TIMBAL_HIGH_VOICES.has(v.strokeSymbol) && v.time < time && time < v.expectedEnd) {
          ops.chokeVoiceIn(v, time, 0.020);
        }
      }
    }
  }
}
