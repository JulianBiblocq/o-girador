/**
 * alfaiaTrackVoicePhysics.ts — Physique acoustique Web Audio (Live & Bounce Offline) isolée par piste (< 115 lignes).
 * Parité stricte avec `workletSkinPhysics.ts` :
 * - Alfaia : `A/a` (25 ms), `D/E` (22 ms), `d/e` (ducking -3.5 dB / 35 ms sur `D/E`), immunité peau sur `X`/`C`.
 * - Autres instruments délégués à `selectiveTrackChokePhysics.ts`.
 */
import { ALFAIA_GHOST_DUCK_GAIN } from '../worklet/processor/workletSkinPhysics';
import { ActiveVoice, ALFAIA_INSTRUMENTS } from './engineTypes';
import {
  applyNonAlfaiaSelectiveChoke,
  ChokeVoiceOps,
  isWebAudioLoopVoiceSymbol,
  resolveFrankStrokeBarulhoChokeSec,
} from './selectiveTrackChokePhysics';

const ALFAIA_WOOD_STROKES = new Set(['C', 'c', 'X', 'x']);

export function computeAnalyticalVoiceGainAtTime(v: ActiveVoice, t: number): number {
  const peak = Math.max(0.0001, v.velocity);
  if (t <= v.holdEnd) return peak;
  if (t >= v.expectedEnd) return 0.0001;
  if (v.isFullBuffer) {
    return Math.max(0.0001, peak * (1 - (t - v.holdEnd) / Math.max(0.0001, v.expectedEnd - v.holdEnd)));
  }
  const releaseSec = Math.max(0.0001, v.releaseEnd - v.holdEnd);
  const midRelease = v.holdEnd + releaseSec * 0.5;
  const midGain = Math.max(0.0001, peak * 0.35);
  if (t <= midRelease) {
    return Math.max(0.0001, peak + (midGain - peak) * ((t - v.holdEnd) / Math.max(0.0001, midRelease - v.holdEnd)));
  }
  if (t <= v.releaseEnd) {
    return Math.max(0.0001, midGain * Math.pow(0.0001 / midGain, (t - midRelease) / Math.max(0.0001, v.releaseEnd - midRelease)));
  }
  return Math.max(0.0001, 0.0001 * (1 - (t - v.releaseEnd) / Math.max(0.0001, v.expectedEnd - v.releaseEnd)));
}

function holdGainAt(v: ActiveVoice, time: number): AudioParam {
  const gp = v.gainNode.gain as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
  if (typeof gp.cancelAndHoldAtTime === 'function') {
    gp.cancelAndHoldAtTime(time);
  } else {
    gp.cancelScheduledValues(time);
    gp.setValueAtTime(computeAnalyticalVoiceGainAtTime(v, time), time);
  }
  return gp;
}

function chokeVoiceIn(v: ActiveVoice, time: number, rampSec: number): void {
  try {
    const gp = holdGainAt(v, time);
    gp.linearRampToValueAtTime(0.0001, time + rampSec);
    gp.setValueAtTime?.(0, time + rampSec + 0.001);
    v.expectedEnd = time + rampSec + 0.002;
    v.source?.stop(v.expectedEnd);
  } catch (_) {}
}

function duckVoiceIn(v: ActiveVoice, time: number, durSec: number, gainMul: number): void {
  try {
    const gp = holdGainAt(v, time);
    const targetEnd = Math.min(v.expectedEnd, time + durSec);
    gp.linearRampToValueAtTime(Math.max(0.0001, computeAnalyticalVoiceGainAtTime(v, targetEnd) * gainMul), targetEnd);
    v.velocity = Math.max(0.0001, v.velocity * gainMul);
    v.isDucked = true;
    if (targetEnd < v.expectedEnd) {
      if (!v.isFullBuffer && targetEnd < v.releaseEnd) gp.exponentialRampToValueAtTime?.(0.0001, v.releaseEnd);
      gp.linearRampToValueAtTime(0, v.expectedEnd);
    }
  } catch (_) {}
}

function lowPassChokeVoice(v: ActiveVoice, time: number, cutoffHz: number, filterRampSec: number, ampDecaySec: number): void {
  v.isLowPassChoked = true;
  if (v.lpFilter) {
    try {
      v.lpFilter.frequency.cancelScheduledValues(time);
      v.lpFilter.frequency.setValueAtTime(20000, time);
      v.lpFilter.frequency.exponentialRampToValueAtTime(cutoffHz, time + filterRampSec);
    } catch (_) {}
  }
  chokeVoiceIn(v, time, ampDecaySec);
}

const CHOKE_OPS: ChokeVoiceOps = { chokeVoiceIn, duckVoiceIn, lowPassChokeVoice };

export function applyWebAudioTrackSkinPhysics(
  voices: ActiveVoice[] | undefined,
  instrumentId: string,
  strokeSymbol: string,
  time: number
): void {
  if (!voices || voices.length === 0) return;
  const isAlfaia = ALFAIA_INSTRUMENTS.has(instrumentId);

  if (!isWebAudioLoopVoiceSymbol(instrumentId, strokeSymbol) && strokeSymbol !== '/' && strokeSymbol !== '.') {
    const barChokeSec = resolveFrankStrokeBarulhoChokeSec(instrumentId, strokeSymbol);
    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      if (v && v.gainNode && isWebAudioLoopVoiceSymbol(instrumentId, v.strokeSymbol) && v.time < time && time < v.expectedEnd) {
        chokeVoiceIn(v, time, barChokeSec);
      }
    }
  }

  if (isAlfaia) {
    if (strokeSymbol === 'd' || strokeSymbol === 'e') {
      for (const v of voices) {
        if (v?.gainNode && (v.strokeSymbol === 'D' || v.strokeSymbol === 'E') && !v.isDucked && v.time < time && time < v.expectedEnd) {
          duckVoiceIn(v, time, 0.035, ALFAIA_GHOST_DUCK_GAIN);
        }
      }
      return;
    }
    if (strokeSymbol !== 'A' && strokeSymbol !== 'a' && strokeSymbol !== 'D' && strokeSymbol !== 'E') return;
    const rampSec = strokeSymbol === 'A' || strokeSymbol === 'a' ? 0.025 : 0.022;
    for (const v of voices) {
      if (v?.gainNode && (!v.strokeSymbol || !ALFAIA_WOOD_STROKES.has(v.strokeSymbol)) && v.time < time && time < v.expectedEnd) {
        chokeVoiceIn(v, time, rampSec);
      }
    }
    return;
  }

  applyNonAlfaiaSelectiveChoke(voices, instrumentId, strokeSymbol, time, CHOKE_OPS);
}
