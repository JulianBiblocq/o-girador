/**
 * baqueBounceStrokeScheduler.ts — Planification hors-ligne d'une frappe et de son escouade spatiale Zéro-Phase (< 138 lignes).
 */
import { getCachedPcmSample, reconstructAudioBuffer } from '../audio/audioSampleCache';
import { packBarulhoOriginCoord } from '../audio/barulho/barulhoRampPlanner';
import { applyWebAudioTrackSkinPhysics } from '../audio/engine/alfaiaTrackVoicePhysics';
import { EngineRoundRobin } from '../audio/engine/engineRoundRobin';
import { EngineTuning } from '../audio/engine/engineTuning';
import { ALFAIA_INSTRUMENTS, TUNEABLE_INSTRUMENTS } from '../audio/engine/engineTypes';
import { EngineVirtualStrokes } from '../audio/engine/engineVirtualStrokes';
import { fetchAndDecodeAudioSample, normalizeCanonicalSampleKey } from '../audio/engine/sampleFetchUtils';
import { computeLivePlayerVelocityBreathing } from '../audio/groove/strokeHumanizationDsp';
import { computeBarulhoPartnerEntrySpreadSec } from '../audio/spatial/sectionBarulhoPhaseHelper';
import { computeDeterministicStrokeJitterSec, resolveTrackSectionSpatialProfile } from '../audio/spatial/sectionSpatialAcoustics';
import { COMPOSITE_RIM_LAYER_VELOCITY_SCALE } from '../audio/worklet/horizon/workletCompositeStrokeHelper';
import { InstrumentAudioConfig, StrokeMapping } from '../data/audioConfig';
import { Track } from '../types';
import { PendingStudioInstrumentId, STUDIO_BANK_ENABLED } from '../universes/maracatu/instruments/studioBankRegistry';
import { isAutomationBypassed } from './automationBypassHelper';
import { hasActiveTrackAutomation } from './automationDetectHelper';
import { OfflineBarulhoPhraseTracker } from './baqueBounceBarulhoRenderer';
import { OfflineTrackGraph, scheduleOfflineStrokeHit } from './baqueBounceTrackGraph';

export async function decodeSampleForOffline(
  ctx: BaseAudioContext, rawPath: string, cache: Map<string, AudioBuffer>
): Promise<AudioBuffer | null> {
  const path = normalizeCanonicalSampleKey(rawPath);
  if (cache.has(path)) return cache.get(path)!;
  try {
    const cached = await getCachedPcmSample(path, ctx.sampleRate);
    if (cached) {
      const b = reconstructAudioBuffer(ctx as AudioContext, cached);
      cache.set(path, b); return b;
    }
    const buf = await fetchAndDecodeAudioSample(ctx, path);
    if (buf) cache.set(path, buf);
    return buf;
  } catch { return null; }
}

export interface ScheduleOfflineBounceStrokeArgs {
  offlineCtx: OfflineAudioContext; graph: OfflineTrackGraph; track: Track;
  allTracks?: readonly Track[]; chorusAmount?: number; isEcoMode?: boolean; globalAutomationBypass?: any;
  instId: string; instCfg: InstrumentAudioConfig; strokesMaps: Map<string, Map<string, StrokeMapping>>;
  sampleCache: Map<string, AudioBuffer>; offlineRR: EngineRoundRobin; barulhoTracker: OfflineBarulhoPhraseTracker;
  packed: number; strokeSymbol: string; mIdx: number; circleStepIdx: number;
  triggerSec: number; stepVol: number; totalDurationSec: number;
  isBeatHead?: boolean; partnerRank?: number; measureBpm?: number;
}

export async function scheduleOfflineBounceStroke(a: ScheduleOfflineBounceStrokeArgs): Promise<void> {
  const {
    offlineCtx, graph, track, allTracks, chorusAmount = 0.75, isEcoMode = false, globalAutomationBypass,
    instId, instCfg, strokesMaps, sampleCache, offlineRR, barulhoTracker, packed,
    strokeSymbol, mIdx, circleStepIdx, triggerSec, stepVol, totalDurationSec,
  } = a;

  if (strokeSymbol === '/' || strokeSymbol === '.') {
    barulhoTracker.applyControlSymbol(track.id, strokeSymbol, triggerSec, totalDurationSec);
    return;
  }
  let stroke = EngineVirtualStrokes.resolveStroke(strokesMaps, instId, strokeSymbol);
  if (!stroke || !stroke.files.length) return;

  const hasPanAuto = !isAutomationBypassed(track, 'pan', globalAutomationBypass) && hasActiveTrackAutomation(track, 'pan') && Boolean(track.measurePans?.length);
  const spatial = resolveTrackSectionSpatialProfile(track, instId, isEcoMode, hasPanAuto ? 0 : (track.panVal ?? track.pan ?? 0));
  const rawSynthCount = spatial.isNeutralSolo ? 1 : spatial.synthesizedCount;
  let synthCount = stroke.isBarulho ? rawSynthCount : Math.min(rawSynthCount, Math.max(1, stroke.files.length));

  const isCalibrated = Boolean(instCfg?.calibratedStudioBank);
  let squadIndices = offlineRR.selectSquadFileIndices(instId, stroke, triggerSec, synthCount, track.id);
  let firstBuf = await decodeSampleForOffline(offlineCtx, stroke.files[squadIndices[0]] || stroke.files[0], sampleCache);
  let forceShort80ms = false;
  if (!firstBuf && ALFAIA_INSTRUMENTS.has(instId) && (strokeSymbol === 'A' || strokeSymbol === 'a')) {
    const fbE = EngineVirtualStrokes.resolveStroke(strokesMaps, instId, 'e');
    if (fbE) {
      stroke = fbE; forceShort80ms = true;
      synthCount = Math.min(rawSynthCount, Math.max(1, fbE.files.length));
      squadIndices = offlineRR.selectSquadFileIndices(instId, fbE, triggerSec, synthCount, track.id);
      firstBuf = await decodeSampleForOffline(offlineCtx, fbE.files[squadIndices[0]] || fbE.files[0], sampleCache);
    }
  }
  if (!firstBuf) return;

  const basePitch = EngineTuning.calculatePitch(instId, instCfg, track as any, undefined, allTracks as any, chorusAmount);
  const isSecondStroke = (packed & 1) === 1;
  const stepSeed = mIdx * 64 + circleStepIdx * 2 + (isSecondStroke ? 1 : 0);

  const partnerRank = a.partnerRank ?? 0;
  if (stroke.isBarulho) {
    const coord = packBarulhoOriginCoord(mIdx, circleStepIdx, isSecondStroke);
    const softSym = strokeSymbol === 'b' || (instId === 'apito' && strokeSymbol === 'l') ? 'b' : 'B';
    for (let k = 0; k < synthCount; k++) {
      const pSpec = spatial.isNeutralSolo ? undefined : spatial.players[k];
      const barSpread = pSpec
        ? pSpec.baseDelaySec + computeBarulhoPartnerEntrySpreadSec(k, synthCount)
        : (softSym === 'B' && partnerRank > 0 ? computeBarulhoPartnerEntrySpreadSec(partnerRank, partnerRank + 1) : 0);
      const trigK = Math.max(0, triggerSec + barSpread);
      const vKey = k > 0 ? `${track.id}__p${k}` : track.id;
      if (instId === 'apito' && strokeSymbol !== 'l') {
        applyWebAudioTrackSkinPhysics(graph.activeVoicesByTrack.get(vKey), instId, strokeSymbol, trigK);
      }
      barulhoTracker.spawnOrUpdateBarulho(offlineCtx, graph, track.id, softSym, firstBuf, trigK, stepVol, coord, totalDurationSec, {
        isStudioCalibrated: isCalibrated, strokeBaseGain: stroke.baseGain ?? 1.0, instId,
        pitchRate: TUNEABLE_INSTRUMENTS.has(instId) ? basePitch * (pSpec?.pitchMul ?? 1.0) : 1.0,
        rawSymbol: strokeSymbol, playerIdx: k, partnerRank: softSym === 'B' ? partnerRank : 0, playerSpec: pSpec,
      });
    }
    return;
  }

  const isLegacyRufada = strokeSymbol === 'r' && !STUDIO_BANK_ENABLED[instId as PendingStudioInstrumentId];
  const headNuance = isLegacyRufada ? 0.985 : (stroke.compositeRimSymbol && strokeSymbol === 'a' ? 0.992 : 1.0);
  const finalStepVol = isLegacyRufada ? stepVol * 0.88 : stepVol;
  const decayNorm = ((packed >>> 2) & 0x7F) / 100;
  const rimStroke = stroke.compositeRimSymbol ? EngineVirtualStrokes.resolveStroke(strokesMaps, instId, stroke.compositeRimSymbol) : null;
  const rimIndices = rimStroke ? offlineRR.selectSquadFileIndices(instId, rimStroke, triggerSec, synthCount, track.id) : null;

  for (let k = 0; k < synthCount; k++) {
    const fileK = stroke.files[squadIndices[k] ?? squadIndices[0]] || stroke.files[0];
    const bufK = k === 0 ? firstBuf : (await decodeSampleForOffline(offlineCtx, fileK, sampleCache) || firstBuf);
    const pSpec = spatial.isNeutralSolo ? undefined : spatial.players[k];
    const jitter = pSpec ? computeDeterministicStrokeJitterSec(track.id, k, stepSeed, synthCount, instId) : 0;
    const trigK = Math.max(0, triggerSec + (pSpec ? pSpec.baseDelaySec + jitter : 0));
    const pitchMul = pSpec?.pitchMul ?? 1.0;
    const velK = computeLivePlayerVelocityBreathing(finalStepVol, mIdx + 1, track.id, k, stepSeed, Boolean(a.isBeatHead));

    barulhoTracker.chokeOnFrankStroke(track.id, instId, strokeSymbol, trigK, totalDurationSec, k);
    scheduleOfflineStrokeHit(offlineCtx, graph, track, instId, strokeSymbol, bufK, basePitch * headNuance * pitchMul, trigK, velK, decayNorm, totalDurationSec, {
      isStudioCalibrated: isCalibrated, forceShort80ms, strokeBaseGain: stroke.baseGain ?? 1.0, playerIdx: k, measureBpm: a.measureBpm, playerSpec: pSpec,
    });

    if (rimStroke && rimIndices) {
      const rimBuf = await decodeSampleForOffline(offlineCtx, rimStroke.files[rimIndices[k] ?? rimIndices[0]] || rimStroke.files[0], sampleCache);
      if (rimBuf) {
        scheduleOfflineStrokeHit(offlineCtx, graph, track, instId, rimStroke.symbol, rimBuf, basePitch * pitchMul, trigK, velK * COMPOSITE_RIM_LAYER_VELOCITY_SCALE, decayNorm, totalDurationSec, {
          isStudioCalibrated: isCalibrated, strokeBaseGain: rimStroke.baseGain ?? 1.0, playerIdx: k, measureBpm: a.measureBpm, playerSpec: pSpec,
        });
      }
    }
  }
}
