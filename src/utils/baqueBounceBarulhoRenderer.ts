/**
 * baqueBounceBarulhoRenderer.ts — Rendu Offline Bounce sans couture des phrases Barulho & Escouades Spatiales (< 132 lignes).
 */
import { getOrBakeBarulhoAudioBuffer, type BakedBarulhoAudio } from '../audio/barulho/barulhoLoopRegionAnalyzer';
import {
  BARULHO_RETRIGGER_CHOKE_SEC, BarulhoLookaheadPoint, DEFAULT_BARULHO_DOT_STOP_SEC,
  DEFAULT_BARULHO_FADEIN_SEC, DEFAULT_BARULHO_FADEOUT_SEC, findBarulhoLookaheadIndex,
  resolveSlashFadeOutRampSec, resolveSoftBarulhoRampSpec,
} from '../audio/barulho/barulhoRampPlanner';
import { computeEnginePeakGain } from '../audio/engine/engineStrokePlayback';
import { resolveFrankStrokeBarulhoChokeSec } from '../audio/engine/selectiveTrackChokePhysics';
import { BARULHO_PARTNER_ATTACK_RAMP_SEC, computeBarulhoDecorrelatedReadFrame } from '../audio/spatial/sectionBarulhoPhaseHelper';
import type { SectionPlayerAcousticSpec } from '../audio/spatial/sectionSpatialAcoustics';
import { createSpatialPlayerRouting } from '../audio/spatial/webAudioPlayerPanner';
import { computeBarulhoSoftEntryFrame } from '../audio/worklet/processor/workletEventFlags';
import type { OfflineTrackGraph } from './baqueBounceTrackGraph';

interface GainSeg { t: number; g: number; }
interface ActiveOfflineBarulho {
  trackId: number; src: AudioBufferSourceNode; gainNode: GainNode; segs: GainSeg[]; originCoord: number; zeroStopTime: number | null;
}

function evalGainAt(segs: readonly GainSeg[], t: number): number {
  if (segs.length === 0) return 0;
  if (t <= segs[0].t) return segs[0].g;
  for (let i = 0; i < segs.length - 1; i++) {
    const a = segs[i], b = segs[i + 1];
    if (t <= b.t) return Math.max(0, a.g + ((t - a.t) / Math.max(1e-6, b.t - a.t)) * (b.g - a.g));
  }
  return Math.max(0, segs[segs.length - 1].g);
}

function pushLinearRamp(v: ActiveOfflineBarulho, t0: number, t1: number, targetG: number): void {
  const g0 = evalGainAt(v.segs, t0), safeT1 = Math.max(t0 + 0.001, t1);
  while (v.segs.length > 0 && v.segs[v.segs.length - 1].t >= t0) v.segs.pop();
  v.segs.push({ t: t0, g: g0 }, { t: safeT1, g: targetG });
  v.gainNode.gain.cancelScheduledValues(t0); v.gainNode.gain.setValueAtTime(g0, t0);
  v.gainNode.gain.linearRampToValueAtTime(targetG, safeT1);
  v.zeroStopTime = targetG <= 0.0001 ? safeT1 + 0.002 : null;
}

function createLoopingNodes(ctx: OfflineAudioContext, baked: BakedBarulhoAudio, destNode: AudioNode, pitchRate = 1.0) {
  const src = ctx.createBufferSource(), gainNode = ctx.createGain();
  src.buffer = baked.buffer; src.playbackRate.value = pitchRate > 0 ? pitchRate : 1.0; src.loop = true;
  src.loopStart = baked.region.loopResumeSec; src.loopEnd = baked.region.loopWrapSec;
  src.connect(gainNode); gainNode.connect(destNode);
  return { src, gainNode };
}

export class OfflineBarulhoPhraseTracker {
  private readonly activeByKey = new Map<string, ActiveOfflineBarulho>();
  private readonly lookahead: readonly BarulhoLookaheadPoint[];

  constructor(basePoints: readonly BarulhoLookaheadPoint[], cycleDurationSec: number) {
    const pts = [...basePoints];
    if (cycleDurationSec > 0.05) {
      for (let i = 0; i < basePoints.length; i++) {
        const p = basePoints[i];
        pts.push({ trackId: p.trackId, instId: p.instId, timeSec: p.timeSec + cycleDurationSec, symbol: p.symbol, velocity: p.velocity });
      }
    }
    pts.sort((a, b) => a.timeSec - b.timeSec);
    this.lookahead = pts;
  }

  private chokeKey(key: string, t: number, rampSec: number, maxEndSec: number): void {
    const v = this.activeByKey.get(key);
    if (!v) return;
    this.activeByKey.delete(key);
    if (v.zeroStopTime !== null && t >= v.zeroStopTime) { v.src.stop(Math.min(maxEndSec, v.zeroStopTime)); return; }
    const g0 = evalGainAt(v.segs, t), stopT = Math.min(maxEndSec, t + (g0 <= 0.0005 ? 0.002 : rampSec));
    v.gainNode.gain.cancelScheduledValues(t); v.gainNode.gain.setValueAtTime(g0, t); v.gainNode.gain.linearRampToValueAtTime(0, stopT);
    v.src.stop(Math.min(maxEndSec, stopT + 0.002));
  }

  public applyControlSymbol(trackId: number, symbol: '/' | '.', triggerSec: number, maxEndSec: number): void {
    const t = Math.max(0, triggerSec);
    if (t >= maxEndSec - 0.001) return;
    const keys = Array.from(this.activeByKey.entries()).filter(([, v]) => v.trackId === trackId).map(([k]) => k);
    if (symbol === '.') { keys.forEach((k) => this.chokeKey(k, t, DEFAULT_BARULHO_DOT_STOP_SEC, maxEndSec)); return; }
    const ptIdx = findBarulhoLookaheadIndex(this.lookahead, trackId, t, '/');
    const rampSec = ptIdx >= 0 ? resolveSlashFadeOutRampSec(this.lookahead, ptIdx) : DEFAULT_BARULHO_FADEOUT_SEC;
    for (const k of keys) {
      const v = this.activeByKey.get(k);
      if (v && (v.zeroStopTime === null || t < v.zeroStopTime)) { v.originCoord = 0; pushLinearRamp(v, t, Math.min(maxEndSec, t + rampSec), 0); }
    }
  }

  public chokeOnFrankStroke(trackId: number, instId: string, symbol: string, triggerSec: number, maxEndSec: number, playerIdx?: number): void {
    const ramp = resolveFrankStrokeBarulhoChokeSec(instId, symbol), t = Math.max(0, triggerSec);
    if (playerIdx !== undefined) { this.chokeKey(`${trackId}__p${playerIdx}`, t, ramp, maxEndSec); return; }
    for (const [k, v] of Array.from(this.activeByKey.entries())) if (v.trackId === trackId) this.chokeKey(k, t, ramp, maxEndSec);
  }

  public spawnOrUpdateBarulho(
    ctx: OfflineAudioContext, graph: OfflineTrackGraph, trackId: number, symbol: 'B' | 'b',
    rawBuffer: AudioBuffer, triggerSec: number, velocity: number, originCoord: number, maxEndSec: number,
    opts: { isStudioCalibrated?: boolean; strokeBaseGain?: number; instId?: string; pitchRate?: number; rawSymbol?: string; playerIdx?: number; playerSpec?: SectionPlayerAcousticSpec }
  ): void {
    const trackInput = graph.trackInputs.get(trackId), t = Math.max(0, triggerSec);
    if (!trackInput || t >= maxEndSec - 0.001) return;
    const pIdx = opts.playerIdx ?? 0, key = `${trackId}__p${pIdx}`;
    const adjVel = velocity > 3.0 ? velocity / 100 : velocity, pitchRate = opts.pitchRate ?? 1.0;
    const baked = getOrBakeBarulhoAudioBuffer(ctx, rawBuffer, opts.instId ?? '');
    const sr = baked.buffer.sampleRate, hasLoop = baked.region.loopWrapFrame > baked.region.loopResumeFrame;
    const spatialRoute = createSpatialPlayerRouting(ctx, trackInput, opts.playerSpec, baked.buffer.numberOfChannels || 1);

    if (symbol === 'b') {
      const ptIdx = findBarulhoLookaheadIndex(this.lookahead, trackId, t, opts.rawSymbol || 'b');
      const spec = ptIdx >= 0 ? resolveSoftBarulhoRampSpec(this.lookahead, ptIdx) : { rampSec: DEFAULT_BARULHO_FADEIN_SEC, targetVelocity: adjVel };
      const targetGain = computeEnginePeakGain(spec.targetVelocity, opts.strokeBaseGain ?? 1.0, Boolean(opts.isStudioCalibrated), false) * spatialRoute.gainCompensation;
      const existing = this.activeByKey.get(key);
      if (existing && (existing.zeroStopTime === null || t < existing.zeroStopTime)) { pushLinearRamp(existing, t, Math.min(maxEndSec, t + spec.rampSec), targetGain); return; }
      if (existing) this.chokeKey(key, t, 0.002, maxEndSec);
      const entrySec = (pIdx > 0 && hasLoop
        ? computeBarulhoDecorrelatedReadFrame(pIdx, baked.region.loopResumeFrame, baked.region.loopWrapFrame, sr)
        : computeBarulhoSoftEntryFrame(trackId, baked.region.bodyStartFrame, baked.region.loopResumeFrame, baked.region.loopWrapFrame, baked.region.softEntryFrame)) / sr;
      const { src, gainNode } = createLoopingNodes(ctx, baked, spatialRoute.entryNode, pitchRate);
      const endT = Math.min(maxEndSec, t + spec.rampSec);
      gainNode.gain.setValueAtTime(0, t); gainNode.gain.linearRampToValueAtTime(targetGain, endT); src.start(t, entrySec);
      this.activeByKey.set(key, { trackId, src, gainNode, segs: [{ t, g: 0 }, { t: endT, g: targetGain }], originCoord: 0, zeroStopTime: null });
      return;
    }

    const peakGain = computeEnginePeakGain(adjVel, opts.strokeBaseGain ?? 1.0, Boolean(opts.isStudioCalibrated), false) * spatialRoute.gainCompensation;
    if (this.activeByKey.has(key)) this.chokeKey(key, t, BARULHO_RETRIGGER_CHOKE_SEC, maxEndSec);
    const { src, gainNode } = createLoopingNodes(ctx, baked, spatialRoute.entryNode, pitchRate);
    if (pIdx > 0 && hasLoop) {
      const entrySec = computeBarulhoDecorrelatedReadFrame(pIdx, baked.region.loopResumeFrame, baked.region.loopWrapFrame, sr) / sr;
      const endT = Math.min(maxEndSec, t + BARULHO_PARTNER_ATTACK_RAMP_SEC);
      gainNode.gain.setValueAtTime(0, t); gainNode.gain.linearRampToValueAtTime(peakGain, endT); src.start(t, entrySec);
      this.activeByKey.set(key, { trackId, src, gainNode, segs: [{ t, g: 0 }, { t: endT, g: peakGain }], originCoord, zeroStopTime: null });
    } else {
      gainNode.gain.setValueAtTime(peakGain, t); src.start(t, 0);
      this.activeByKey.set(key, { trackId, src, gainNode, segs: [{ t, g: peakGain }], originCoord, zeroStopTime: null });
    }
  }

  public finalizeAll(maxEndSec: number): void {
    this.activeByKey.forEach((v) => { try { v.src.stop(v.zeroStopTime !== null ? Math.min(maxEndSec, v.zeroStopTime) : maxEndSec); } catch (_) {} });
    this.activeByKey.clear();
  }
}
