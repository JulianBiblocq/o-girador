/**
 * baqueBounceStrokeScheduler.ts — Planification hors-ligne d'une frappe (Barulho, Choke, Rimshot composite) (< 90 lignes).
 */

import { getCachedPcmSample, reconstructAudioBuffer } from '../audio/audioSampleCache';
import { packBarulhoOriginCoord } from '../audio/barulho/barulhoRampPlanner';
import { EngineRoundRobin } from '../audio/engine/engineRoundRobin';
import { EngineTuning } from '../audio/engine/engineTuning';
import { applyWebAudioTrackSkinPhysics } from '../audio/engine/alfaiaTrackVoicePhysics';
import { ALFAIA_INSTRUMENTS, TUNEABLE_INSTRUMENTS } from '../audio/engine/engineTypes';
import { EngineVirtualStrokes } from '../audio/engine/engineVirtualStrokes';
import { PendingStudioInstrumentId, STUDIO_BANK_ENABLED } from '../universes/maracatu/instruments/studioBankRegistry';
import { fetchSampleWithRetry, resolveSampleFetchPath } from '../audio/engine/sampleFetchUtils';
import { COMPOSITE_RIM_LAYER_VELOCITY_SCALE } from '../audio/worklet/horizon/workletCompositeStrokeHelper';
import { InstrumentAudioConfig, StrokeMapping } from '../data/audioConfig';
import { Track } from '../types';
import { OfflineBarulhoPhraseTracker } from './baqueBounceBarulhoRenderer';
import { OfflineTrackGraph, scheduleOfflineStrokeHit } from './baqueBounceTrackGraph';

export async function decodeSampleForOffline(
  ctx: BaseAudioContext,
  path: string,
  cache: Map<string, AudioBuffer>
): Promise<AudioBuffer | null> {
  if (cache.has(path)) return cache.get(path)!;
  try {
    const cached = await getCachedPcmSample(path, ctx.sampleRate);
    if (cached) {
      const b = reconstructAudioBuffer(ctx as AudioContext, cached);
      cache.set(path, b);
      return b;
    }
    const res = await fetchSampleWithRetry(resolveSampleFetchPath(path));
    const buf = await ctx.decodeAudioData(await res.arrayBuffer());
    cache.set(path, buf);
    return buf;
  } catch {
    return null;
  }
}

export interface ScheduleOfflineBounceStrokeArgs {
  offlineCtx: OfflineAudioContext;
  graph: OfflineTrackGraph;
  track: Track;
  allTracks?: readonly Track[];
  chorusAmount?: number;
  instId: string;
  instCfg: InstrumentAudioConfig;
  strokesMaps: Map<string, Map<string, StrokeMapping>>;
  sampleCache: Map<string, AudioBuffer>;
  offlineRR: EngineRoundRobin;
  barulhoTracker: OfflineBarulhoPhraseTracker;
  packed: number;
  strokeSymbol: string;
  mIdx: number;
  circleStepIdx: number;
  triggerSec: number;
  stepVol: number;
  totalDurationSec: number;
}

export async function scheduleOfflineBounceStroke(a: ScheduleOfflineBounceStrokeArgs): Promise<void> {
  const {
    offlineCtx, graph, track, allTracks, chorusAmount = 0.75, instId, instCfg, strokesMaps, sampleCache,
    offlineRR, barulhoTracker, packed, strokeSymbol, mIdx, circleStepIdx, triggerSec, stepVol, totalDurationSec,
  } = a;

  if (strokeSymbol === '/' || strokeSymbol === '.') {
    barulhoTracker.applyControlSymbol(track.id, strokeSymbol, triggerSec, totalDurationSec);
    return;
  }
  let stroke = EngineVirtualStrokes.resolveStroke(strokesMaps, instId, strokeSymbol);
  if (!stroke || !stroke.files.length) return;

  const isCalibrated = Boolean(instCfg?.calibratedStudioBank);
  let buf = await decodeSampleForOffline(offlineCtx, offlineRR.selectFile(instId, stroke, triggerSec, track.id), sampleCache);
  let forceShort80ms = false;
  if (!buf && ALFAIA_INSTRUMENTS.has(instId) && (strokeSymbol === 'A' || strokeSymbol === 'a')) {
    const fbE = EngineVirtualStrokes.resolveStroke(strokesMaps, instId, 'e');
    if (fbE) {
      stroke = fbE;
      forceShort80ms = true;
      buf = await decodeSampleForOffline(offlineCtx, offlineRR.selectFile(instId, fbE, triggerSec, track.id), sampleCache);
    }
  }
  if (!buf) return;

  const basePitch = EngineTuning.calculatePitch(instId, instCfg, track as any, undefined, allTracks as any, chorusAmount);

  if (stroke.isBarulho) {
    if (instId === 'apito' && strokeSymbol !== 'l') {
      applyWebAudioTrackSkinPhysics(graph.activeVoicesByTrack.get(track.id), instId, strokeSymbol, Math.max(0, triggerSec));
    }
    const coord = packBarulhoOriginCoord(mIdx, circleStepIdx, (packed & 1) === 1);
    const softSym = strokeSymbol === 'b' || (instId === 'apito' && strokeSymbol === 'l') ? 'b' : 'B';
    barulhoTracker.spawnOrUpdateBarulho(offlineCtx, graph, track.id, softSym, buf, triggerSec, stepVol, coord, totalDurationSec, {
      isStudioCalibrated: isCalibrated,
      strokeBaseGain: stroke.baseGain ?? 1.0,
      instId,
      pitchRate: TUNEABLE_INSTRUMENTS.has(instId) ? basePitch : 1.0,
      rawSymbol: strokeSymbol,
    });
    return;
  }

  barulhoTracker.chokeOnFrankStroke(track.id, instId, strokeSymbol, triggerSec, totalDurationSec);
  const isLegacyRufada = strokeSymbol === 'r' && !STUDIO_BANK_ENABLED[instId as PendingStudioInstrumentId];
  const headNuance = isLegacyRufada ? 0.985 : (stroke.compositeRimSymbol && strokeSymbol === 'a' ? 0.992 : 1.0);
  const finalStepVol = isLegacyRufada ? stepVol * 0.88 : stepVol;
  const decayNorm = ((packed >>> 2) & 0x7F) / 100;

  scheduleOfflineStrokeHit(offlineCtx, graph, track, instId, strokeSymbol, buf, basePitch * headNuance, triggerSec, finalStepVol, decayNorm, totalDurationSec, {
    isStudioCalibrated: isCalibrated,
    forceShort80ms,
    strokeBaseGain: stroke.baseGain ?? 1.0,
  });

  if (stroke.compositeRimSymbol) {
    const rimStroke = EngineVirtualStrokes.resolveStroke(strokesMaps, instId, stroke.compositeRimSymbol);
    const rimBuf = rimStroke ? await decodeSampleForOffline(offlineCtx, offlineRR.selectFile(instId, rimStroke, triggerSec, track.id), sampleCache) : null;
    if (rimStroke && rimBuf) {
      scheduleOfflineStrokeHit(offlineCtx, graph, track, instId, rimStroke.symbol, rimBuf, basePitch, triggerSec, finalStepVol * COMPOSITE_RIM_LAYER_VELOCITY_SCALE, decayNorm, totalDurationSec, {
        isStudioCalibrated: isCalibrated,
        strokeBaseGain: rimStroke.baseGain ?? 1.0,
      });
    }
  }
}
