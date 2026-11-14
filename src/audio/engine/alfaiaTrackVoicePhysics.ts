/**
 * alfaiaTrackVoicePhysics.ts — Physique de peau Web Audio (Live & Bounce Offline) isolée par piste (< 138 lignes).
 * Parité stricte avec `workletSkinPhysics.ts` :
 * - Toute frappe franche hors `B`/`b` coupe un Barulho actif en 18–25 ms anti-clic.
 * - `A` / `a` : choke des résonances de peau Alfaia en 25 ms. `D` / `E` : 22 ms.
 * - `d` / `e` après `D`/`E` : ducking doux -3.5 dB sur 35 ms. `P` / `p` (Timbal) : 8 ms.
 */
import { ALFAIA_GHOST_DUCK_GAIN } from '../worklet/processor/workletSkinPhysics';
import { ActiveVoice, ALFAIA_INSTRUMENTS } from './engineTypes';

const ALFAIA_WOOD_STROKES = new Set(['C', 'c', 'I', 'i', 'X', 'x']);

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
    gp.setValueAtTime(0, time + rampSec + 0.001);
    v.expectedEnd = time + rampSec + 0.002;
    v.source?.stop(v.expectedEnd);
  } catch (_) {}
}

export function applyWebAudioTrackSkinPhysics(
  voices: ActiveVoice[] | undefined,
  instrumentId: string,
  strokeSymbol: string,
  time: number
): void {
  if (!voices || voices.length === 0) return;
  const isAlfaia = ALFAIA_INSTRUMENTS.has(instrumentId);

  if (strokeSymbol !== 'B' && strokeSymbol !== 'b' && strokeSymbol !== '/' && strokeSymbol !== '.') {
    const barChokeSec = isAlfaia
      ? (strokeSymbol === 'A' || strokeSymbol === 'a' ? 0.025 : (strokeSymbol === 'D' || strokeSymbol === 'E' ? 0.022 : 0.018))
      : (strokeSymbol === 'p' || strokeSymbol === 'P' ? 0.008 : 0.018);
    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      if (v && v.gainNode && (v.strokeSymbol === 'B' || v.strokeSymbol === 'b') && v.time < time && time < v.expectedEnd) {
        chokeVoiceIn(v, time, barChokeSec);
      }
    }
  }

  if (isAlfaia) {
    if (strokeSymbol === 'd' || strokeSymbol === 'e') {
      const duckEnd = time + 0.035;
      for (let i = 0; i < voices.length; i++) {
        const v = voices[i];
        const isStrong = v?.strokeSymbol === 'D' || v?.strokeSymbol === 'E';
        if (v && v.gainNode && isStrong && !v.isDucked && v.time < time && time < v.expectedEnd) {
          try {
            const gp = holdGainAt(v, time);
            const targetEnd = Math.min(v.expectedEnd, duckEnd);
            gp.linearRampToValueAtTime(Math.max(0.0001, computeAnalyticalVoiceGainAtTime(v, targetEnd) * ALFAIA_GHOST_DUCK_GAIN), targetEnd);
            v.velocity *= ALFAIA_GHOST_DUCK_GAIN;
            v.isDucked = true;
            if (targetEnd < v.expectedEnd) {
              if (!v.isFullBuffer && targetEnd < v.releaseEnd) gp.exponentialRampToValueAtTime(0.0001, v.releaseEnd);
              gp.linearRampToValueAtTime(0, v.expectedEnd);
            }
          } catch (_) {}
        }
      }
      return;
    }

    const isAbafado = strokeSymbol === 'A' || strokeSymbol === 'a';
    const isStrong = strokeSymbol === 'D' || strokeSymbol === 'E';
    if (!isAbafado && !isStrong) return;
    const rampSec = isAbafado ? 0.025 : 0.022;
    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      const isSkinVoice = !v?.strokeSymbol || !ALFAIA_WOOD_STROKES.has(v.strokeSymbol);
      if (v && v.gainNode && isSkinVoice && v.time < time && time < v.expectedEnd) chokeVoiceIn(v, time, rampSec);
    }
    return;
  }

  if (strokeSymbol !== 'p' && strokeSymbol !== 'P') return;
  for (let i = 0; i < voices.length; i++) {
    const v = voices[i];
    if (v && v.gainNode && v.time < time && time < v.expectedEnd) chokeVoiceIn(v, time, 0.008);
  }
}
