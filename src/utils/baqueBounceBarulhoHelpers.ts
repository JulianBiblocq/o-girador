/**
 * baqueBounceBarulhoHelpers.ts — Primitives d'enveloppe linéaire et de création de nœuds bouclés pour Barulho Offline (< 65 lignes).
 */
import type { BakedBarulhoAudio } from '../audio/barulho/barulhoLoopRegionAnalyzer';

export interface OfflineBarulhoGainSeg {
  t: number;
  g: number;
}

export interface ActiveOfflineBarulhoVoice {
  trackId: number;
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
