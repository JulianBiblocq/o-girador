/**
 * offlineBaquePassRenderer.ts — Passe 1 Offline : Percussions Studio, Stems de Bus compressés & Départs Aux (< 105 lignes).
 */
import { BarulhoLookaheadPoint } from '../../audio/barulho/barulhoRampPlanner';
import { EngineRoundRobin } from '../../audio/engine/engineRoundRobin';
import { EngineVirtualStrokes } from '../../audio/engine/engineVirtualStrokes';
import { computeSectionTemperamentMap } from '../../audio/groove/sectionTemperament';
import { instrumentsConfig } from '../../data';
import { instrumentAudioConfigs } from '../../data/audioConfig';
import { resolveTrackFromPackedData } from '../../workers/compiler/compiledTrackIdResolver';
import { buildFlatSongSchedule } from '../../workers/compiler/flatScheduleBuilder';
import { OfflineBarulhoPhraseTracker } from '../baqueBounceBarulhoRenderer';
import { applyBusCompressorInPlace, applyBusInsertEqInPlace, sumBusStemWithPanInto } from '../baqueBounceBusInsertDsp';
import { planBounceBusStems, resolveBusStemReturn } from '../baqueBounceBusStems';
import { scheduleOfflineBounceStroke } from '../baqueBounceStrokeScheduler';
import { resolveBounceNoteTrigger } from '../baqueBounceTiming';
import { buildOfflineTrackGraph } from '../baqueBounceTrackGraph';
import type { FullSongUnrolledTimeline } from './fullSongBounceTiming';
import { accumulateBusAuxSendsIntoBuffers, attachOfflineTrackAuxSends } from './offlineAuxSendsHelper';

export interface OfflineBaquePassBuffers {
  instDryL: Float32Array;
  instDryR: Float32Array;
  revSendL: Float32Array;
  revSendR: Float32Array;
  distSendL: Float32Array;
  distSendR: Float32Array;
}

export async function renderOfflineBaquePass(params: {
  OfflineCtx: typeof OfflineAudioContext;
  rawTracks: any[];
  unrolledTracks: any[];
  baqueTracks: any[];
  timeline: FullSongUnrolledTimeline;
  globalSwing: any;
  chorusAmount: number;
  isEcoMode: boolean;
  disableEq: boolean;
  disableFx: boolean;
  globalBypass: any;
  onProgress?: (pct: number, fr: string, pt: string) => void;
}): Promise<OfflineBaquePassBuffers> {
  const { OfflineCtx, rawTracks, unrolledTracks, baqueTracks, timeline, globalSwing, chorusAmount, isEcoMode, disableEq, disableFx, globalBypass, onProgress } = params;
  const nSamples = timeline.totalSamples, sr = timeline.timing.sampleRate;
  const instDryL = new Float32Array(nSamples), instDryR = new Float32Array(nSamples);
  const revSendL = new Float32Array(nSamples), revSendR = new Float32Array(nSamples);
  const distSendL = new Float32Array(nSamples), distSendR = new Float32Array(nSamples);
  if (baqueTracks.length === 0) return { instDryL, instDryR, revSendL, revSendR, distSendL, distSendR };

  onProgress?.(25, 'Synthèse hors-ligne du Batuque Studio...', 'Síntese offline do Batuque Studio...');
  const temperamentMap = computeSectionTemperamentMap(rawTracks);
  const schedule = buildFlatSongSchedule(unrolledTracks, timeline.timing.totalMeasures, timeline.unrolledTimeSigs, instrumentsConfig, null, null, false);
  const baqueIdSet = new Set(baqueTracks.map((t) => t.id));
  const stemPlan = planBounceBusStems(rawTracks, baqueTracks, disableFx);
  const hasAuxCh = stemPlan.totalChannels + 4 <= 32 && !disableFx;
  const pass1Ch = hasAuxCh ? stemPlan.totalChannels + 4 : stemPlan.totalChannels;
  const pass1Ctx = new OfflineCtx(pass1Ch, nSamples, sr);
  const graph = buildOfflineTrackGraph(pass1Ctx, rawTracks, baqueTracks, timeline.timing, 0, stemPlan);

  if (hasAuxCh) {
    const auxMerger = pass1Ctx.createChannelMerger(pass1Ch); auxMerger.connect(pass1Ctx.destination);
    const makeAuxIn = (chOff: number) => {
      const g = pass1Ctx.createGain(); g.channelCount = 2; g.channelCountMode = 'explicit';
      const sp = pass1Ctx.createChannelSplitter(2); g.connect(sp);
      sp.connect(auxMerger, 0, chOff); sp.connect(auxMerger, 1, chOff + 1); return g;
    };
    attachOfflineTrackAuxSends(pass1Ctx, rawTracks, baqueTracks, graph.trackInputs, makeAuxIn(stemPlan.totalChannels), makeAuxIn(stemPlan.totalChannels + 2), timeline.timing, disableFx, globalBypass);
  }

  const strokesMaps = EngineVirtualStrokes.buildStrokesMaps(instrumentAudioConfigs);
  const configMap = new Map(instrumentAudioConfigs.map((c) => [c.id, c]));
  const sampleCache = new Map<string, AudioBuffer>(), offlineRR = new EngineRoundRobin();
  const lookaheadPts: BarulhoLookaheadPoint[] = [];
  for (let i = 0; i < schedule.length / 4; i++) {
    const packed = schedule[i * 4 + 1], tr = resolveTrackFromPackedData(packed, unrolledTracks, schedule), inst = tr ? instrumentsConfig[tr.instrumentIdx] : null;
    if (!tr || !inst || !baqueIdSet.has(tr.id)) continue;
    const { triggerSec } = resolveBounceNoteTrigger(schedule[i * 4], packed, schedule[i * 4 + 3], tr, unrolledTracks, inst.id, timeline.timing, globalSwing, temperamentMap);
    lookaheadPts.push({ trackId: tr.id, instId: inst.id, timeSec: triggerSec, symbol: String.fromCharCode((packed >>> 9) & 0x7F), velocity: schedule[i * 4 + 2] });
  }
  const barulhoTracker = new OfflineBarulhoPhraseTracker(lookaheadPts, timeline.totalDurationSec);

  for (let i = 0; i < schedule.length / 4; i++) {
    const absTick = schedule[i * 4], packed = schedule[i * 4 + 1], stepVol = schedule[i * 4 + 2], microPct = schedule[i * 4 + 3];
    const tr = resolveTrackFromPackedData(packed, unrolledTracks, schedule), inst = tr ? instrumentsConfig[tr.instrumentIdx] : null;
    if (!tr || !inst || !baqueIdSet.has(tr.id)) continue;
    const { mIdx, circleStepIdx, triggerSec } = resolveBounceNoteTrigger(absTick, packed, microPct, tr, unrolledTracks, inst.id, timeline.timing, globalSwing, temperamentMap);
    await scheduleOfflineBounceStroke({
      offlineCtx: pass1Ctx, graph, track: tr, allTracks: rawTracks, chorusAmount, isEcoMode,
      globalAutomationBypass: globalBypass, instId: inst.id, instCfg: configMap.get(inst.id)!, strokesMaps,
      sampleCache, offlineRR, barulhoTracker, packed, strokeSymbol: String.fromCharCode((packed >>> 9) & 0x7F), mIdx, circleStepIdx, triggerSec, stepVol, totalDurationSec: timeline.totalDurationSec,
    });
  }
  barulhoTracker.finalizeAll(timeline.totalDurationSec);

  onProgress?.(55, 'Mixage des Bus & Compresseurs...', 'Mixando Buses e Compressores...');
  const p1Out = await pass1Ctx.startRendering();
  if (hasAuxCh) {
    revSendL.set(p1Out.getChannelData(stemPlan.totalChannels)); revSendR.set(p1Out.getChannelData(stemPlan.totalChannels + 1));
    distSendL.set(p1Out.getChannelData(stemPlan.totalChannels + 2)); distSendR.set(p1Out.getChannelData(stemPlan.totalChannels + 3));
  }
  for (const busId of stemPlan.busOrder) {
    const s = stemPlan.stemIndexByBus.get(busId), bus = rawTracks.find((t) => String(t.id) === busId);
    if (s === undefined || !bus || 2 * s + 1 >= p1Out.numberOfChannels) continue;
    const bL = p1Out.getChannelData(2 * s), bR = p1Out.getChannelData(2 * s + 1);
    applyBusInsertEqInPlace(bL, bR, sr, bus, disableEq);
    applyBusCompressorInPlace(bL, bR, sr, bus, disableFx);
    accumulateBusAuxSendsIntoBuffers(bL, bR, bus, rawTracks, revSendL, revSendR, distSendL, distSendR, disableFx);
    const ret = resolveBusStemReturn(busId, rawTracks, stemPlan);
    if (ret.gain * ret.sign !== 0) sumBusStemWithPanInto(bL, bR, p1Out.getChannelData(2 * ret.targetStem), p1Out.getChannelData(2 * ret.targetStem + 1), ret.gain * ret.sign, bus.panVal ?? bus.pan);
  }
  instDryL.set(p1Out.getChannelData(0)); instDryR.set(p1Out.getChannelData(1));
  return { instDryL, instDryR, revSendL, revSendR, distSendL, distSendR };
}
