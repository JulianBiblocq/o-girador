/**
 * fullSongBounceExporter.ts — Rendu Hors-Ligne Complet (~1-2 s) du Morceau (Percussions + Bus + FX + Toada + Master -14 LUFS) (< 120 lignes).
 */
import { processOfflineStereoArraysThroughMasterBus } from '../../audio/worklet/master-bus/masterBusProcessor';
import { instrumentsConfig } from '../../data';
import type { PresetTimingCalculation } from '../../hooks/cloud-bounce/cloudPresetTimingCalculator';
import { getEffectiveMuteState, getEffectiveSkinChorusAmount, useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { audioBufferToWav } from '../audio-buffer/audioBufferWavConverter';
import { calibrateBounceLoudnessInPlace } from '../bounceLoudnessCalibrator';
import { buildFullSongUnrolledTimeline, formatFullSongBounceFilename, unrollTracksForFullSong } from './fullSongBounceTiming';
import { renderOfflineBaquePass } from './offlineBaquePassRenderer';
import { buildOfflineMasterFxStage } from './offlineMasterFxGraph';
import { scheduleOfflineVocalTracks } from './offlineVocalToadaRenderer';

export interface FullSongBounceOptions {
  presetData?: any;
  baseBpm?: number;
  sampleRate?: number;
  masterVol?: number;
  masterEQ?: { low: number; mid: number; high: number };
  masterCompressor?: { threshold: number; ratio: number };
  presetTiming?: PresetTimingCalculation;
  onProgress?: (pct: number, labelFr: string, labelPt: string) => void;
}

export interface FullSongBounceResult {
  wavBlob: Blob;
  filename: string;
  totalDurationSec: number;
  musicalDurationSec: number;
  sampleRate: number;
  expandedMeasuresCount: number;
}

export async function renderFullSongBounceOffline(opts: FullSongBounceOptions = {}): Promise<FullSongBounceResult> {
  const store = useSequencerStore.getState(), transport = useTransportStore.getState();
  const src = opts.presetData || store;
  const sr = Math.max(8000, Math.round(Number(opts.sampleRate) || 44100));
  const OfflineCtx = (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext) as typeof OfflineAudioContext;

  opts.onProgress?.(10, 'Préparation de la structure complète...', 'Preparando a estrutura completa...');
  const timeline = buildFullSongUnrolledTimeline({
    totalMeasures: src.totalMeasures ?? store.totalMeasures, bpm: src.bpm ?? opts.baseBpm ?? store.bpm,
    timeSig: src.timeSig ?? store.timeSig, measureBpms: src.measureBpms ?? store.measureBpms,
    measureBpmTransitions: src.measureBpmTransitions ?? store.measureBpmTransitions,
    measureTimeSigs: src.measureTimeSigs ?? store.measureTimeSigs, measureVols: src.measureVols ?? store.measureVols,
    songSections: src.songSections ?? store.songSections,
    isLoopRegionActive: src.isLoopRegionActive ?? store.isLoopRegionActive,
    loopStartMeasure: src.loopStartMeasure ?? store.loopStartMeasure,
    loopEndMeasure: src.loopEndMeasure ?? store.loopEndMeasure,
    loopMode: src.loopMode ?? store.loopMode,
  }, sr, opts.presetTiming?.expandedMeasures);

  const rawTracks: any[] = src.tracks || store.tracks || [];
  const unrolledTracks = unrollTracksForFullSong(rawTracks, timeline.expanded);
  const disableEq = Boolean(store.ecoConfig?.disableEq), disableFx = Boolean(store.ecoConfig?.disableFx);
  const globalSwing = src.globalSwing || transport.globalSwing;
  const baqueTracks = unrolledTracks.filter((t) => {
    if (t.isBusFolder || t.isLinkFolder) return false;
    const inst = instrumentsConfig[t.instrumentIdx];
    return Boolean(inst && inst.type !== 'voice' && inst.id !== 'puxador' && inst.id !== 'coro' && !getEffectiveMuteState(rawTracks, t.id));
  });

  const baquePass = await renderOfflineBaquePass({
    OfflineCtx, rawTracks, unrolledTracks, baqueTracks, timeline, globalSwing,
    chorusAmount: getEffectiveSkinChorusAmount(store), isEcoMode: disableFx,
    disableEq, disableFx, globalBypass: store.globalAutomationBypass, onProgress: opts.onProgress,
  });

  opts.onProgress?.(72, 'Rendu des Voix Toada & Effets Master...', 'Renderizando Vozes Toada & Efeitos Master...');
  const nSamples = timeline.totalSamples;
  const fxCtx = new OfflineCtx(4, nSamples, sr);
  const fxNodes = buildOfflineMasterFxStage(fxCtx, {
    masterVolDb: opts.masterVol ?? src.masterVol ?? 0,
    masterEQ: opts.masterEQ ?? src.masterEQ ?? { low: 0, mid: 0, high: 0 },
    masterFX: src.masterFX ?? store.masterFX,
    masterEffectsActive: src.masterEffectsActive ?? store.masterEffectsActive,
    disableFx, disableEq, isMasterVolBypassed: Boolean(src.isMasterVolumeBypassed ?? store.isMasterVolumeBypassed),
    globalBypass: store.globalAutomationBypass, unrolledMasterVols: timeline.unrolledMasterVols, timing: timeline.timing,
  });

  if (baqueTracks.length > 0) {
    const injectStereo = (l: Float32Array, r: Float32Array, target: AudioNode) => {
      const b = fxCtx.createBuffer(2, nSamples, sr); b.copyToChannel(l as any, 0); b.copyToChannel(r as any, 1);
      const s = fxCtx.createBufferSource(); s.buffer = b; s.connect(target); s.start(0);
    };
    injectStereo(baquePass.instDryL, baquePass.instDryR, fxNodes.instDryInput);
    injectStereo(baquePass.revSendL, baquePass.revSendR, fxNodes.revSendInput);
    injectStereo(baquePass.distSendL, baquePass.distSendR, fxNodes.distSendInput);
  }

  await scheduleOfflineVocalTracks({
    fxCtx, allTracks: rawTracks, unrolledTracks, timing: timeline.timing, unrolledBpms: timeline.unrolledBpms,
    unrolledTimeSigs: timeline.unrolledTimeSigs, voxTarget: fxNodes.voxDryInput, revSendTarget: fxNodes.revSendInput,
    distSendTarget: fxNodes.distSendInput, globalSwing, vocalTransposeSteps: Number(src.vocalTransposeSteps ?? store.vocalTransposeSteps ?? 0),
    disableEq, disableFx, globalBypass: store.globalAutomationBypass,
    referencePitchHz: (src.metadata as any)?.referencePitchHz ?? (store.metadata as any)?.referencePitchHz,
    ignoreGlobalPitch: Boolean(src.metadata?.ignoreMelodyPitch ?? store.metadata?.ignoreMelodyPitch),
  });

  const fxOut = await fxCtx.startRendering();
  opts.onProgress?.(88, 'Mastering LUFS (-14 LUFS / -0.5 dBFS)...', 'Masterização LUFS (-14 LUFS / -0.5 dBFS)...');
  const outL = fxOut.getChannelData(0), outR = fxOut.getChannelData(1);
  const compOverride = opts.masterCompressor ?? src.masterCompressor;
  processOfflineStereoArraysThroughMasterBus(outL, outR, sr, {
    ...(src.masterFX?.masterBus || store.masterFX?.masterBus || {}),
    ...(compOverride ? { thresholdDb: compOverride.threshold, ratio: compOverride.ratio } : {}),
    compressorEnabled: ((src.masterEffectsActive ?? store.masterEffectsActive)?.compressor ?? true) && !disableFx,
    ecoBypassAesthetic: disableFx, monoCheck: Boolean(src.isMasterMono ?? store.isMasterMono), sumSidechainToMix: true,
  }, fxOut.getChannelData(2), fxOut.getChannelData(3));
  calibrateBounceLoudnessInPlace(outL, outR, sr);

  const finalBuf = fxCtx.createBuffer(2, nSamples, sr);
  finalBuf.copyToChannel(outL as any, 0); finalBuf.copyToChannel(outR as any, 1);
  const title = src.metadata?.toada || src.name || store.metadata?.toada || store.metadata?.ritmo || 'morceau';
  return {
    wavBlob: audioBufferToWav(finalBuf), filename: formatFullSongBounceFilename(title, timeline.timing.bpm),
    totalDurationSec: timeline.totalDurationSec, musicalDurationSec: timeline.musicalDurationSec,
    sampleRate: sr, expandedMeasuresCount: timeline.expanded.length,
  };
}
