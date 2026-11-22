/**
 * baqueBounceExporter.ts
 * Export hors-ligne (OfflineAudioContext) en 1 clic d'un cycle du Baque (sans Puxador/Coro)
 * calé à l'échantillon 0 sur M1•T1 avec parité complète console, Tempérament de Section & Barulho continu (< 115 lignes).
 */
import { instrumentsConfig } from '../data';
import { instrumentAudioConfigs } from '../data/audioConfig';
import { getEffectiveMuteState, getEffectiveRodaBreathingAmount, getEffectiveSkinChorusAmount, useSequencerStore } from '../stores/useSequencerStore';
import { useTransportStore } from '../stores/useTransportStore';
import { BarulhoLookaheadPoint } from '../audio/barulho/barulhoRampPlanner';
import { EngineVirtualStrokes } from '../audio/engine/engineVirtualStrokes';
import { EngineRoundRobin } from '../audio/engine/engineRoundRobin';
import { computeSectionTemperamentMap } from '../audio/groove/sectionTemperament';
import { resolveAudibleSympathySnareTrack } from '../audio/groove/snareSympathyPlanner';
import { buildFlatSongSchedule } from '../workers/compiler/flatScheduleBuilder';
import { resolveTrackFromPackedData } from '../workers/compiler/compiledTrackIdResolver';
import { audioBufferToWav } from './audio-buffer/audioBufferWavConverter';
import { OfflineBarulhoPhraseTracker } from './baqueBounceBarulhoRenderer';
import { buildOfflineTrackGraph } from './baqueBounceTrackGraph';
import { processOfflineStereoArraysThroughMasterBus } from '../audio/worklet/master-bus/masterBusProcessor';
import { calibrateBounceLoudnessInPlace } from './bounceLoudnessCalibrator';
import { planBounceBusStems } from './baqueBounceBusStems';
import { collapseBounceStemsToStereo } from './baqueBounceBusDynamics';
import { scheduleOfflineBounceStroke } from './baqueBounceStrokeScheduler';
import { scheduleOfflineSnareSympathyIfEligible } from './baqueBounceSympathyHelper';
import {
  formatBaqueBounceFilename, computeBaqueCycleTiming, tickToTimeSec, resolveBounceNoteTrigger,
  type BaqueCycleTimingParams, type BaqueCycleTimingResult,
} from './baqueBounceTiming';

export { formatBaqueBounceFilename, computeBaqueCycleTiming, tickToTimeSec, type BaqueCycleTimingParams, type BaqueCycleTimingResult };

export interface BaqueBounceRenderResult {
  wavBlob: Blob; filename: string; exactTotalSamples: number; totalDurationSec: number; sampleRate: number;
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
  const temperamentMap = computeSectionTemperamentMap(state.tracks);

  const slicedAllTracks = state.tracks.map((t) => ({
    ...t,
    patternOverrides: undefined,
    patterns: t.patterns.map((p) => ({ ...p, measureAssignments: Array.from({ length: cycleMeasures }, (_, i) => Boolean(p.measureAssignments?.[startM + i])) })),
  }));
  const baqueTracks = slicedAllTracks.filter((t) => {
    if (t.isBusFolder || t.isLinkFolder) return false;
    const inst = instrumentsConfig[t.instrumentIdx];
    return Boolean(inst && inst.type !== 'voice' && inst.id !== 'puxador' && inst.id !== 'coro' && !getEffectiveMuteState(state.tracks, t.id));
  });

  const schedule = buildFlatSongSchedule(slicedAllTracks, cycleMeasures, slicedSigs, instrumentsConfig, null, null, false);
  const baqueTrackIdSet = new Set(baqueTracks.map((t) => t.id));
  const OfflineCtx = (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext) as typeof OfflineAudioContext;
  const stemPlan = planBounceBusStems(state.tracks, baqueTracks, Boolean(state.ecoConfig?.disableFx));
  const offlineCtx = new OfflineCtx(stemPlan.totalChannels, timing.exactTotalSamples, timing.sampleRate);
  const graph = buildOfflineTrackGraph(offlineCtx, state.tracks, baqueTracks, timing, startM, stemPlan);
  const strokesMaps = EngineVirtualStrokes.buildStrokesMaps(instrumentAudioConfigs);
  const configMap = new Map(instrumentAudioConfigs.map((c) => [c.id, c]));
  const sampleCache = new Map<string, AudioBuffer>(), offlineRR = new EngineRoundRobin();

  const lookaheadPts: BarulhoLookaheadPoint[] = [];
  for (let i = 0; i < schedule.length / 4; i++) {
    const packed = schedule[i * 4 + 1], track = resolveTrackFromPackedData(packed, slicedAllTracks, schedule), inst = track ? instrumentsConfig[track.instrumentIdx] : null;
    if (!track || !inst || !baqueTrackIdSet.has(track.id)) continue;
    const { triggerSec } = resolveBounceNoteTrigger(schedule[i * 4], packed, schedule[i * 4 + 3], track, slicedAllTracks as any, inst.id, timing, globalSwing, temperamentMap);
    lookaheadPts.push({ trackId: track.id, instId: inst.id, timeSec: triggerSec, symbol: String.fromCharCode((packed >>> 9) & 0x7F), velocity: schedule[i * 4 + 2] });
  }
  const barulhoTracker = new OfflineBarulhoPhraseTracker(lookaheadPts, timing.totalDurationSec);

  const chorusAmount = getEffectiveSkinChorusAmount(state), breathingAmount = getEffectiveRodaBreathingAmount(state);
  const snareCandidate = resolveAudibleSympathySnareTrack(state.tracks, breathingAmount, null);
  const lastBuzzTimeSecRef = { value: -10 };
  for (let i = 0; i < schedule.length / 4; i++) {
    const absTick = schedule[i * 4], packed = schedule[i * 4 + 1], stepVol = schedule[i * 4 + 2], microPct = schedule[i * 4 + 3];
    const track = resolveTrackFromPackedData(packed, slicedAllTracks, schedule), inst = track ? instrumentsConfig[track.instrumentIdx] : null;
    if (!track || !inst || !baqueTrackIdSet.has(track.id)) continue;
    const strokeSymbol = String.fromCharCode((packed >>> 9) & 0x7F);
    const { mIdx, circleStepIdx, triggerSec, isBeatHead, partnerRank, measureBpm } = resolveBounceNoteTrigger(absTick, packed, microPct, track, slicedAllTracks as any, inst.id, timing, globalSwing, temperamentMap);
    await scheduleOfflineBounceStroke({
      offlineCtx, graph, track, allTracks: state.tracks, chorusAmount, isEcoMode: Boolean(state.isEcoMode),
      globalAutomationBypass: state.globalAutomationBypass, instId: inst.id, instCfg: configMap.get(inst.id)!, strokesMaps, sampleCache,
      offlineRR, barulhoTracker, packed, strokeSymbol, mIdx, circleStepIdx, triggerSec, stepVol, totalDurationSec: timing.totalDurationSec,
      isBeatHead, partnerRank, measureBpm,
    });
    await scheduleOfflineSnareSympathyIfEligible({
      offlineCtx, graph, alfaiaTrackId: track.id, alfaiaInstId: inst.id, strokeSymbol, stepVol,
      stepSeed: mIdx * 64 + circleStepIdx * 2 + (packed & 1), triggerSec, totalDurationSec: timing.totalDurationSec,
      breathingAmount, snareCandidate, lastBuzzTimeSecRef, lookaheadPoints: barulhoTracker.lookahead,
      allTracks: state.tracks, configMap, strokesMaps, sampleCache, offlineRR,
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
