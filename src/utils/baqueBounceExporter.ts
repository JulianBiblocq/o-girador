/**
 * baqueBounceExporter.ts
 * Export hors-ligne (OfflineAudioContext) en 1 clic d'un cycle du Baque (sans Puxador/Coro)
 * calé à l'échantillon 0 sur M1•T1 et coupé à N * measureDurationSec (< 90 lignes).
 */
import { instrumentsConfig } from '../data';
import { instrumentAudioConfigs } from '../data/audioConfig';
import { useSequencerStore } from '../stores/useSequencerStore';
import { EngineVirtualStrokes } from '../audio/engine/engineVirtualStrokes';
import { EngineTuning } from '../audio/engine/engineTuning';
import { resolveSampleFetchPath, fetchSampleWithRetry } from '../audio/engine/sampleFetchUtils';
import { getCachedPcmSample, reconstructAudioBuffer } from '../audio/audioSampleCache';
import { buildFlatSongSchedule } from '../workers/compiler/flatScheduleBuilder';
import { audioBufferToWav } from './audio-buffer/audioBufferWavConverter';
import { faderPositionToGain } from './audioMath';
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

export async function renderBaqueCycleOffline(options: { sampleRate?: number } = {}): Promise<BaqueBounceRenderResult> {
  const state = useSequencerStore.getState();
  const startM = (state.isLoopRegionActive && state.loopStartMeasure != null) ? Math.max(0, state.loopStartMeasure) : 0;
  const endM = (state.isLoopRegionActive && state.loopEndMeasure != null && state.loopEndMeasure >= startM)
    ? Math.min((state.totalMeasures || 1) - 1, state.loopEndMeasure) : Math.max(0, (state.totalMeasures || 1) - 1);
  const cycleMeasures = Math.max(1, endM - startM + 1);
  const slicedSigs = Array.from({ length: cycleMeasures }, (_, i) => state.measureTimeSigs?.[startM + i] || state.timeSig || '4/4');
  const slicedBpms = Array.from({ length: cycleMeasures }, (_, i) => state.bpm || state.measureBpms?.[startM + i] || 88);
  const timing = computeBaqueCycleTiming({ totalMeasures: cycleMeasures, bpm: state.bpm || 88, measureBpms: slicedBpms, measureTimeSigs: slicedSigs, timeSig: state.timeSig || '4/4', sampleRate: options.sampleRate || 44100 });

  const nonVocal = state.tracks.filter((t) => {
    const inst = instrumentsConfig[t.instrumentIdx];
    return !t.isBusFolder && inst && inst.type !== 'voice' && inst.id !== 'puxador' && inst.id !== 'coro' && !t.isMute;
  });
  const hasSolo = nonVocal.some((t) => t.isSolo);
  const baqueTracks = (hasSolo ? nonVocal.filter((t) => t.isSolo) : nonVocal).map((t) => ({
    ...t, patterns: t.patterns.map((p) => ({ ...p, measureAssignments: Array.from({ length: cycleMeasures }, (_, i) => Boolean(p.measureAssignments?.[startM + i])) })),
  }));

  const schedule = buildFlatSongSchedule(baqueTracks, cycleMeasures, slicedSigs, instrumentsConfig, null, null, false);
  const OfflineCtx = (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext) as typeof OfflineAudioContext;
  const offlineCtx = new OfflineCtx(2, timing.exactTotalSamples, timing.sampleRate);
  const strokesMaps = EngineVirtualStrokes.buildStrokesMaps(instrumentAudioConfigs);
  const configMap = new Map(instrumentAudioConfigs.map((c) => [c.id, c]));
  const sampleCache = new Map<string, AudioBuffer>();

  for (let i = 0; i < schedule.length / 4; i++) {
    const absTick = schedule[i * 4], packed = schedule[i * 4 + 1], stepVol = schedule[i * 4 + 2];
    const track = baqueTracks[(packed >>> 22) & 0xFF], inst = track ? instrumentsConfig[track.instrumentIdx] : null;
    if (!track || !inst) continue;
    const stroke = EngineVirtualStrokes.resolveStroke(strokesMaps, inst.id, String.fromCharCode((packed >>> 9) & 0x7F));
    if (!stroke || !stroke.files.length) continue;
    const buf = await decodeSampleForOffline(offlineCtx, stroke.files[i % stroke.files.length], sampleCache);
    if (!buf) continue;
    const src = offlineCtx.createBufferSource(), gain = offlineCtx.createGain();
    src.buffer = buf; src.playbackRate.value = EngineTuning.calculatePitch(inst.id, configMap.get(inst.id)!, track);
    gain.gain.value = Math.min(1.5, faderPositionToGain(track.volumeVal ?? 80) * Math.pow(Math.max(0, stepVol), 1.5));
    src.connect(gain); gain.connect(offlineCtx.destination);
    src.start(Math.max(0, Math.min(timing.totalDurationSec - 0.001, tickToTimeSec(absTick, timing))));
  }

  const rendered = await offlineCtx.startRendering();
  const rhythmName = state.metadata?.ritmo || state.metadata?.toada || 'baque';
  return { wavBlob: audioBufferToWav(rendered), filename: formatBaqueBounceFilename(rhythmName, timing.bpm), exactTotalSamples: rendered.length, totalDurationSec: timing.totalDurationSec, sampleRate: timing.sampleRate };
}
