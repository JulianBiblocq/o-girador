/**
 * baqueBounceBarulhoHelpers.ts — Primitives d'enveloppe linéaire, lookahead Bounce & pré-coupures Apito (< 120 lignes).
 */
import type { ApitoPlannedCutEvent } from '../audio/barulho/apitoBreathCutPlanner';
import type { BakedBarulhoAudio } from '../audio/barulho/barulhoLoopRegionAnalyzer';
import { BarulhoLookaheadPoint, packBarulhoOriginCoord } from '../audio/barulho/barulhoRampPlanner';
import { instrumentsConfig } from '../data';
import { resolveTrackFromPackedData } from '../workers/compiler/compiledTrackIdResolver';
import { resolveBounceNoteTrigger, type BaqueCycleTimingResult } from './baqueBounceTiming';
import { getRodaStepDurationTicks } from './rodaTimeSigGeometry';

export interface OfflineBarulhoGainSeg {
  t: number;
  g: number;
}

export interface ActiveOfflineBarulhoVoice {
  trackId: number;
  instId?: string;
  src: AudioBufferSourceNode;
  gainNode: GainNode;
  segs: OfflineBarulhoGainSeg[];
  originCoord: number;
  zeroStopTime: number | null;
}

export function evalOfflineBarulhoGainAt(segs: readonly OfflineBarulhoGainSeg[], t: number): number {
  if (segs.length === 0) return 0;
  if (t <= segs[0].t) return segs[0].g;
  for (let i = 0; i < segs.length - 1; i++) {
    const a = segs[i], b = segs[i + 1];
    if (t <= b.t) return Math.max(0, a.g + ((t - a.t) / Math.max(1e-6, b.t - a.t)) * (b.g - a.g));
  }
  return Math.max(0, segs[segs.length - 1].g);
}

export function pushOfflineBarulhoLinearRamp(
  v: ActiveOfflineBarulhoVoice,
  t0: number,
  t1: number,
  targetG: number
): void {
  const g0 = evalOfflineBarulhoGainAt(v.segs, t0);
  const safeT1 = Math.max(t0 + 0.001, t1);
  while (v.segs.length > 0 && v.segs[v.segs.length - 1].t >= t0) v.segs.pop();
  v.segs.push({ t: t0, g: g0 }, { t: safeT1, g: targetG });
  v.gainNode.gain.cancelScheduledValues(t0);
  v.gainNode.gain.setValueAtTime(g0, t0);
  v.gainNode.gain.linearRampToValueAtTime(targetG, safeT1);
  v.zeroStopTime = targetG <= 0.0001 ? safeT1 + 0.002 : null;
}

export function createOfflineLoopingBarulhoNodes(
  ctx: OfflineAudioContext,
  baked: BakedBarulhoAudio,
  destNode: AudioNode,
  pitchRate = 1.0
): { src: AudioBufferSourceNode; gainNode: GainNode } {
  const src = ctx.createBufferSource();
  const gainNode = ctx.createGain();
  src.buffer = baked.buffer;
  src.playbackRate.value = pitchRate > 0 ? pitchRate : 1.0;
  src.loop = true;
  src.loopStart = baked.region.loopResumeSec;
  src.loopEnd = baked.region.loopWrapSec;
  src.connect(gainNode);
  gainNode.connect(destNode);
  return { src, gainNode };
}

export function isInterMeasureSustainedBarulhoCoord(prevCoord: number, nextCoord: number): boolean {
  if (prevCoord <= 0 || nextCoord <= 0) return false;
  const prevStepSub = (prevCoord - 1) & 0x7F;
  const nextStepSub = (nextCoord - 1) & 0x7F;
  const prevM = (prevCoord - 1) >>> 7;
  const nextM = (nextCoord - 1) >>> 7;
  return prevStepSub === nextStepSub && prevM !== nextM;
}

export function scheduleApitoOfflinePreCutIfAny(
  v: ActiveOfflineBarulhoVoice,
  cuts: readonly ApitoPlannedCutEvent[],
  tStart: number,
  maxEndSec: number
): void {
  if (v.instId !== 'apito') return;
  for (let i = 0; i < cuts.length; i++) {
    const cut = cuts[i];
    if (cut.trackId !== v.trackId || cut.fadeStartSec <= tStart + 0.002) continue;
    if (cut.fadeStartSec >= maxEndSec - 0.001) break;
    if (v.zeroStopTime !== null && v.zeroStopTime <= cut.fadeStartSec) break;
    pushOfflineBarulhoLinearRamp(v, cut.fadeStartSec, Math.min(maxEndSec, cut.fadeStartSec + cut.fadeDurationSec), 0);
    break;
  }
}

export function buildOfflineBounceLookaheadPoints(
  schedule: Float32Array | Float64Array,
  tracks: any[],
  baqueIdSet: Set<number>,
  timing: BaqueCycleTimingResult,
  globalSwing: any,
  temperamentMap: any
): BarulhoLookaheadPoint[] {
  const pts: BarulhoLookaheadPoint[] = [];
  const apitoActiveInMeasure = new Set<string>();
  for (let i = 0; i < schedule.length / 4; i++) {
    const packed = schedule[i * 4 + 1], tr = resolveTrackFromPackedData(packed, tracks, schedule), inst = tr ? instrumentsConfig[tr.instrumentIdx] : null;
    if (!tr || !inst || !baqueIdSet.has(tr.id)) continue;
    const { mIdx, circleStepIdx, triggerSec, measureBpm } = resolveBounceNoteTrigger(schedule[i * 4], packed, schedule[i * 4 + 3], tr, tracks, inst.id, timing, globalSwing, temperamentMap);
    const sig = timing.measureTimeSigs?.[mIdx] || '4/4';
    const actPtn = tr.patterns?.find((p: any) => p.measureAssignments?.[mIdx]);
    const stepDurSec = ((60 / Math.max(20, measureBpm || 100)) / 24) * getRodaStepDurationTicks(sig, actPtn, circleStepIdx);
    const coord = packBarulhoOriginCoord(mIdx, circleStepIdx, (packed & 1) === 1);
    pts.push({ trackId: tr.id, instId: inst.id, timeSec: triggerSec, symbol: String.fromCharCode((packed >>> 9) & 0x7F), velocity: schedule[i * 4 + 2], stepDurationSec: stepDurSec, originCoord: coord, seqId: mIdx });
    if (inst.id === 'apito') apitoActiveInMeasure.add(`${tr.id}:${mIdx}`);
  }
  for (const tr of tracks) {
    const inst = tr ? instrumentsConfig[tr.instrumentIdx] : null;
    if (!tr || !inst || inst.id !== 'apito' || !baqueIdSet.has(tr.id)) continue;
    for (let m = 0; m < timing.totalMeasures; m++) {
      if (!apitoActiveInMeasure.has(`${tr.id}:${m}`)) {
        pts.push({ trackId: tr.id, instId: 'apito', timeSec: timing.measureStartsSec[m] ?? 0, symbol: '/', velocity: 0, stepDurationSec: 0.15, seqId: m });
      }
    }
  }
  pts.sort((a, b) => a.timeSec - b.timeSec);
  return pts;
}
