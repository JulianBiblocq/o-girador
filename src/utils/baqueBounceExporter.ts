/**
 * baqueBounceExporter.ts
 * Export hors-ligne (OfflineAudioContext) en 1 clic d'un cycle du Baque (sans Puxador/Coro)
 * calé à l'échantillon 0 sur M1•T1 avec parité complète console (Bus/Link, Pan, EQ, Decay, Choke, Swing) (< 120 lignes).
 */
import { instrumentsConfig } from '../data';
import { instrumentAudioConfigs } from '../data/audioConfig';
import { getEffectiveMuteState, useSequencerStore } from '../stores/useSequencerStore';
import { useTransportStore } from '../stores/useTransportStore';
import { EngineVirtualStrokes } from '../audio/engine/engineVirtualStrokes';
import { EngineTuning } from '../audio/engine/engineTuning';
import { resolveSampleFetchPath, fetchSampleWithRetry } from '../audio/engine/sampleFetchUtils';
import { getCachedPcmSample, reconstructAudioBuffer } from '../audio/audioSampleCache';
import { buildFlatSongSchedule } from '../workers/compiler/flatScheduleBuilder';
import { computePercussionNoteSwing, resolveActivePatternForMeasure } from '../hooks/audio-sync/percussionSwingHelper';
import { audioBufferToWav } from './audio-buffer/audioBufferWavConverter';
import { buildOfflineTrackGraph, scheduleOfflineStrokeHit } from './baqueBounceTrackGraph';
import { processOfflineStereoArraysThroughMasterBus } from '../audio/worklet/master-bus/masterBusProcessor';
import {
  formatBaqueBounceFilename,
  computeBaqueCycleTiming,
  tickToTimeSec,
  type BaqueCycleTimingParams,
  type BaqueCycleTimingResult,
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

function resolveMeasureIndexAtTick(absTick: number, timing: BaqueCycleTimingResult): number {
  let rem = Math.max(0, absTick);
  for (let m = 0; m < timing.totalMeasures; m++) {
    const mTicks = timing.measureTicks[m] || 96;
    if (rem < mTicks || m === timing.totalMeasures - 1) return m;
    rem -= mTicks;
  }
  return 0;
}

export async function renderBaqueCycleOffline(options: { sampleRate?: number } = {}): Promise<BaqueBounceRenderResult> {
  const state = useSequencerStore.getState();
  const globalSwing = useTransportStore.getState().globalSwing;
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
  const offlineCtx = new OfflineCtx(2, timing.exactTotalSamples, timing.sampleRate);
  const graph = buildOfflineTrackGraph(offlineCtx, state.tracks, baqueTracks, timing, startM);
  const strokesMaps = EngineVirtualStrokes.buildStrokesMaps(instrumentAudioConfigs);
  const configMap = new Map(instrumentAudioConfigs.map((c) => [c.id, c]));
  const sampleCache = new Map<string, AudioBuffer>();

  for (let i = 0; i < schedule.length / 4; i++) {
    const absTick = schedule[i * 4], packed = schedule[i * 4 + 1], stepVol = schedule[i * 4 + 2], microPct = schedule[i * 4 + 3];
    const track = baqueTracks[(packed >>> 22) & 0x3FF], inst = track ? instrumentsConfig[track.instrumentIdx] : null;
    if (!track || !inst) continue;
    const strokeSymbol = String.fromCharCode((packed >>> 9) & 0x7F);
    const stroke = EngineVirtualStrokes.resolveStroke(strokesMaps, inst.id, strokeSymbol);
    if (!stroke || !stroke.files.length) continue;
    const buf = await decodeSampleForOffline(offlineCtx, stroke.files[i % stroke.files.length], sampleCache);
    if (!buf) continue;

    const mIdx = resolveMeasureIndexAtTick(absTick, timing);
    const mTicks = timing.measureTicks[mIdx] || 96, mDurSec = timing.measureDurationsSec[mIdx] || 2;
    const tick96nSec = mDurSec / mTicks, stepDurationSec = tick96nSec * 6;
    const activePattern = resolveActivePatternForMeasure(track as any, baqueTracks as any, mIdx, null);
    const circleStepIdx = (packed >>> 16) & 0x3F, isTuplet = ((packed >>> 1) & 1) === 1;
    const swingSec = computePercussionNoteSwing({ activePattern, liveTrack: track as any, circleStepIdx, isTuplet, swingJitter: 0, globalMode: globalSwing.mode, globalSwing, stepDurationSec });
    const stepCount = activePattern ? activePattern.steps : 16;
    const microSec = (microPct / 100) * (tick96nSec * (mTicks / stepCount)) * 0.5;
    const unisonSec = EngineTuning.calculateUnisonMicroDelaySec(track as any, inst.id);
    const pitch = EngineTuning.calculatePitch(inst.id, configMap.get(inst.id)!, track as any) * EngineTuning.calculateMicroDetuneMultiplier(inst.id, track.id);
    const stepDecayNorm = ((packed >>> 2) & 0x7F) / 100;
    const triggerSec = tickToTimeSec(absTick, timing) + swingSec + microSec + unisonSec;

    scheduleOfflineStrokeHit(offlineCtx, graph, track, inst.id, strokeSymbol, buf, pitch, triggerSec, stepVol, stepDecayNorm, timing.totalDurationSec);
  }

  const rendered = await offlineCtx.startRendering();
  if (rendered.numberOfChannels >= 2) {
    const compActive = (state.masterEffectsActive?.compressor ?? true) && !state.ecoConfig?.disableFx;
    processOfflineStereoArraysThroughMasterBus(
      rendered.getChannelData(0),
      rendered.getChannelData(1),
      timing.sampleRate,
      {
        ...(state.masterFX?.masterBus || {}),
        compressorEnabled: compActive,
        ecoBypassAesthetic: Boolean(state.ecoConfig?.disableFx),
        monoCheck: Boolean(state.isMasterMono),
      }
    );
  }
  const rhythmName = state.metadata?.ritmo || state.metadata?.toada || 'baque';
  return { wavBlob: audioBufferToWav(rendered), filename: formatBaqueBounceFilename(rhythmName, timing.bpm), exactTotalSamples: rendered.length, totalDurationSec: timing.totalDurationSec, sampleRate: timing.sampleRate };
}