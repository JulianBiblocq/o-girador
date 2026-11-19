/**
 * aoVivoHitTiming.ts — Calcul du délai compensé jusqu'à l'impact audible réel (hitTime).
 * Prend en compte outputLatency + getBluetoothVisualOffsetSec() sans départ anticipé en lookahead.
 */
import * as Tone from 'tone';
import { getBluetoothVisualOffsetSec } from '../../utils/bluetoothLatencyStore';
import { getAudioTime } from '../circle-sequencer/circleAudioTime';

export function computeAoVivoHitLeadMs(
  detail: any,
  extraOffsetSec = 0,
  overrideCtxSec?: number,
  overrideOutLatencySec?: number,
  overrideBtOffsetSec?: number
): number {
  if (!detail) return 0;
  if (typeof detail.deltaSec === 'number' && typeof detail.time !== 'number' && typeof detail.hitTime !== 'number') {
    return Math.round(Math.max(0, Math.min(0.45, detail.deltaSec + extraOffsetSec)) * 1000);
  }
  const ctxTime = overrideCtxSec ?? getAudioTime();
  if (!(ctxTime > 0)) return 0;
  const rawCtx = Tone.getContext().rawContext as AudioContext | undefined;
  const outLat = overrideOutLatencySec !== undefined
    ? overrideOutLatencySec
    : typeof rawCtx?.outputLatency === 'number' && !Number.isNaN(rawCtx.outputLatency)
      ? rawCtx.outputLatency
      : 0.05;
  const btSec = overrideBtOffsetSec !== undefined ? overrideBtOffsetSec : getBluetoothVisualOffsetSec();
  const totalLatSec = Math.max(0, outLat + btSec);
  const hitTimeSec = typeof detail.hitTime === 'number' && detail.hitTime > 0
    ? detail.hitTime
    : typeof detail.time === 'number' && detail.time > 0
      ? detail.time + totalLatSec
      : null;
  if (hitTimeSec === null) return 0;
  return Math.round(Math.max(0, Math.min(0.45, hitTimeSec + extraOffsetSec - ctxTime)) * 1000);
}
