/**
 * baqueBounceExporter.ts
 * Export hors-ligne (OfflineAudioContext) en 1 clic d'un cycle du Baque (sans Puxador/Coro)
 * calé à l'échantillon 0 sur M1•T1 avec parité complète console + Barulho continu sans couture (< 138 lignes).
 */
import { instrumentsConfig } from '../data';
import { instrumentAudioConfigs } from '../data/audioConfig';
import { getEffectiveMuteState, useSequencerStore } from '../stores/useSequencerStore';
import { useTransportStore } from '../stores/useTransportStore';
import { BarulhoLookaheadPoint, packBarulhoOriginCoord } from '../audio/barulho/barulhoRampPlanner';
import { EngineVirtualStrokes } from '../audio/engine/engineVirtualStrokes';
import { EngineTuning } from '../audio/engine/engineTuning';
import { EngineRoundRobin } from '../audio/engine/engineRoundRobin';
import { ALFAIA_INSTRUMENTS } from '../audio/engine/engineTypes';
import { resolveSampleFetchPath, fetchSampleWithRetry } from '../audio/engine/sampleFetchUtils';
import { getCachedPcmSample, reconstructAudioBuffer } from '../audio/audioSampleCache';
import { buildFlatSongSchedule } from '../workers/compiler/flatScheduleBuilder';
import { audioBufferToWav } from './audio-buffer/audioBufferWavConverter';
import { OfflineBarulhoPhraseTracker } from './baqueBounceBarulhoRenderer';
import { buildOfflineTrackGraph, scheduleOfflineStrokeHit } from './baqueBounceTrackGraph';
import { processOfflineStereoArraysThroughMasterBus } from '../audio/worklet/master-bus/masterBusProcessor';
import { calibrateBounceLoudnessInPlace } from './bounceLoudnessCalibrator';
import { planBounceBusStems } from './baqueBounceBusStems';
import { collapseBounceStemsToStereo } from './baqueBounceBusDynamics';
import {
  formatBaqueBounceFilename, computeBaqueCycleTiming, tickToTimeSec, resolveBounceNoteTrigger,
  type BaqueCycleTimingParams, type BaqueCycleTimingResult,
} from './baqueBounceTiming';

export { formatBaqueBounceFilename, computeBaqueCycleTiming, tickToTimeSec, type BaqueCycleTimingParams, type BaqueCycleTimingResult };

export interface BaqueBounceRenderResult {
  wavBlob: Blob; filename: string; exactTotalSamples: number; totalDurationSec: number; sampleRate: number;
}

async function decodeSampleForOffline(ctx: BaseAudioContext, path: string, cache: Map<string, AudioBuffer>): Promise<AudioBuffer | null> {
  if (cache.has(path)) return cache.get(path)!;
  try {
    const cached = await getCachedPcmSample(path, ctx.sampleRate);
    if (cached) { const b = reconstructAudioBuffer(ctx as AudioContext, cached); cache.set(path, b); return b; }
    const res = await fetchSampleWithRetry(resolveSampleFetchPath(path));
    const buf = await ctx.decodeAudioData(await res.arrayBuffer());
    cache.set(path, buf); return buf;
  } catch { return null; }
}

export async function renderBaqueCycleOffline(options: { sampleRate?: number } = {}): Promise<BaqueBounceRenderResult> {
  const state = useSequencerStore.getState(), globalSwing = useTransportStore.getState().globalSwing;
  const startM = (state.isLoopRegionActive && state.loopStartMeasure != null) ? Math.max(0, state.loopStartMeasure) : 0;
  const endM = (state.isLoopRegionActive && state.loopEndMeasure != null && state.loopEndMeasure >= startM)
    ? Math.min((state.totalMeasures || 1) - 1, state.loopEndMeasure) : Math.max(0, (state.totalMeasures || 1) - 1);
  const cycleMeasures = Math.max(1, endM - startM + 1);
  const slicedSigs = Array.from({ length: cycleMeasures }, (_, i) => state.measureTimeSigs?.[startM + i] || state.timeSig || '4/4');
  const slicedBpms = Array.from({ length: cycleMeasures }, (_, i) => state.measureBpms?.[startM + i] || state.bpm || 88);
  const timing = computeBaqueCycleTiming({ totalMeasures: cycleMeasures, bpm: state.bpm || 88, measureBpms: slicedBpms, measureTimeSigs: slicedSigs, timeSig: state.timeSig || '4/4', sampleRate: options.sampleRate || 44100 });

  const baqueTracks = state.tracks
    .filter((t) => {
      if (t.isBusFolder || t.isLinkFolder) return false;
      const inst = instrumentsConfig[t.instrumentIdx];
      return Boolean(inst && inst.type !== 'voice' && inst.id !== 'puxador' && inst.id !== 'coro' && !getEffectiveMuteState(state.tracks, t.id));
    })
    .map((t) => ({
      ...t, patterns: t.patterns.map((p) => ({ ...p, measureAssignments: Array.from({ length: cycleMeasures }, (_, i) => Boolean(p.measureAssignments?.[startM + i])) })),
    }));

  const schedule = buildFlatSongSchedule(baqueTracks, cycleMeasures, slicedSigs, instrumentsConfig, null, null, false);
  const OfflineCtx = (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext) as typeof OfflineAudioContext;
  const stemPlan = planBounceBusStems(state.tracks, baqueTracks, Boolean(state.ecoConfig?.disableFx));
  const offlineCtx = new OfflineCtx(stemPlan.totalChannels, timing.exactTotalSamples, timing.sampleRate);
  const graph = buildOfflineTrackGraph(offlineCtx, state.tracks, baqueTracks, timing, startM, stemPlan);
  const strokesMaps = EngineVirtualStrokes.buildStrokesMaps(instrumentAudioConfigs);
  const configMap = new Map(instrumentAudioConfigs.map((c) => [c.id, c]));
  const sampleCache = new Map<string, AudioBuffer>(), offlineRR = new EngineRoundRobin();

  const lookaheadPts: BarulhoLookaheadPoint[] = [];
  for (let i = 0; i < schedule.length / 4; i++) {
    const packed = schedule[i * 4 + 1], track = baqueTracks[(packed >>> 22) & 0x3FF], inst = track ? instrumentsConfig[track.instrumentIdx] : null;
    if (!track || !inst) continue;
    const { triggerSec } = resolveBounceNoteTrigger(schedule[i * 4], packed, schedule[i * 4 + 3], track, baqueTracks as any, inst.id, timing, globalSwing);
    lookaheadPts.push({ trackId: track.id, timeSec: triggerSec, symbol: String.fromCharCode((packed >>> 9) & 0x7F), velocity: schedule[i * 4 + 2] });
  }
  const barulhoTracker = new OfflineBarulhoPhraseTracker(lookaheadPts, timing.totalDurationSec);

  for (let i = 0; i < schedule.length / 4; i++) {
    const absTick = schedule[i * 4], packed = schedule[i * 4 + 1], stepVol = schedule[i * 4 + 2], microPct = schedule[i * 4 + 3];
    const track = baqueTracks[(packed >>> 22) & 0x3FF], inst = track ? instrumentsConfig[track.instrumentIdx] : null;
    if (!track || !inst) continue;
    const strokeSymbol = String.fromCharCode((packed >>> 9) & 0x7F);
    const { mIdx, circleStepIdx, triggerSec } = resolveBounceNoteTrigger(absTick, packed, microPct, track, baqueTracks as any, inst.id, timing, globalSwing);

    if (strokeSymbol === '/' || strokeSymbol === '.') {
      barulhoTracker.applyControlSymbol(track.id, strokeSymbol, triggerSec, timing.totalDurationSec);
      continue;
    }
    let stroke = EngineVirtualStrokes.resolveStroke(strokesMaps, inst.id, strokeSymbol);
    if (!stroke || !stroke.files.length) continue;
    const instCfg = configMap.get(inst.id)!, isCalibrated = Boolean(instCfg?.calibratedStudioBank);
    let buf = await decodeSampleForOffline(offlineCtx, offlineRR.selectFile(inst.id, stroke, triggerSec, track.id), sampleCache);
    let forceShort80ms = false;
    if (!buf && ALFAIA_INSTRUMENTS.has(inst.id) && (strokeSymbol === 'A' || strokeSymbol === 'a')) {
      const fbE = EngineVirtualStrokes.resolveStroke(strokesMaps, inst.id, 'e');
      if (fbE) { stroke = fbE; forceShort80ms = true; buf = await decodeSampleForOffline(offlineCtx, offlineRR.selectFile(inst.id, fbE, triggerSec, track.id), sampleCache); }
    }
    if (!buf) continue;

    if (stroke.isBarulho) {
      const coord = packBarulhoOriginCoord(mIdx, circleStepIdx, (packed & 1) === 1);
      barulhoTracker.spawnOrUpdateBarulho(offlineCtx, graph, track.id, strokeSymbol === 'b' ? 'b' : 'B', buf, triggerSec, stepVol, coord, timing.totalDurationSec, { isStudioCalibrated: isCalibrated, strokeBaseGain: stroke.baseGain ?? 1.0 });
      continue;
    }
    barulhoTracker.chokeOnFrankStroke(track.id, inst.id, strokeSymbol, triggerSec, timing.totalDurationSec);
    const pitch = EngineTuning.calculatePitch(inst.id, instCfg, track as any);
    scheduleOfflineStrokeHit(offlineCtx, graph, track, inst.id, strokeSymbol, buf, pitch, triggerSec, stepVol, ((packed >>> 2) & 0x7F) / 100, timing.totalDurationSec, {
      isStudioCalibrated: isCalibrated, forceShort80ms, strokeBaseGain: stroke.baseGain ?? 1.0,
    });
  }
  barulhoTracker.finalizeAll(timing.totalDurationSec);

  const rendered = collapseBounceStemsToStereo(offlineCtx, await offlineCtx.startRendering(), stemPlan, state.tracks, {
    disableEq: Boolean(state.ecoConfig?.disableEq), disableFx: Boolean(state.ecoConfig?.disableFx),
  });
  if (rendered.numberOfChannels >= 2) {
    const chL = rendered.getChannelData(0), chR = rendered.getChannelData(1);
    processOfflineStereoArraysThroughMasterBus(chL, chR, timing.sampleRate, {
      ...(state.masterFX?.masterBus || {}), compressorEnabled: (state.masterEffectsActive?.compressor ?? true) && !state.ecoConfig?.disableFx,
      ecoBypassAesthetic: Boolean(state.ecoConfig?.disableFx), monoCheck: Boolean(state.isMasterMono),
    });
    calibrateBounceLoudnessInPlace(chL, chR, timing.sampleRate);
  }
  const rhythmName = state.metadata?.ritmo || state.metadata?.toada || 'baque';
  return { wavBlob: audioBufferToWav(rendered), filename: formatBaqueBounceFilename(rhythmName, timing.bpm), exactTotalSamples: rendered.length, totalDurationSec: timing.totalDurationSec, sampleRate: timing.sampleRate };
}
