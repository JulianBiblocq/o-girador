import { Preset } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { CURRENT_AUDIO_SCALE_VERSION, faderPositionToDb } from '../../utils/audioMath';
import { CURRENT_LUTHERIE_VERSION } from './acousticNormalizer';
import { DEFAULT_STUDIO_MASTER_BUS_CONFIG } from '../../audio/effects/studioFxPresets';

export function buildCurrentPresetData(
  sequencer: any,
  masterEQ: { low: number; mid: number; high: number },
  masterCompressor: { threshold: number; ratio: number },
  masterVol: number,
  audioSync: any
): Preset {
  const storeState = useSequencerStore.getState();
  const transportState = useTransportStore.getState();
  const audioState = useAudioStore.getState();

  const tracksCopy = JSON.parse(JSON.stringify(storeState.tracks || []));
  tracksCopy.forEach((t: any) => {
    t.patterns?.forEach((p: any) => { delete p.vocalAudioData; });
    t.volumeVal = typeof t.volumeVal === 'number' && !isNaN(t.volumeVal) ? t.volumeVal : 75;
    const rawPan = typeof t.panVal === 'number' && !isNaN(t.panVal)
      ? t.panVal
      : (typeof t.pan === 'number' ? (Math.abs(t.pan) <= 1 && t.pan !== 0 ? Math.round(t.pan * 100) : t.pan) : 0);
    t.panVal = rawPan;
    t.pan = rawPan;
    t.isMute = Boolean(t.isMute);
    t.isSolo = Boolean(t.isSolo);
  });

  const currentPreRoll = transportState.preRollSettings;
  const activeVocalPreset = audioState.vocalPreset || 'guide';

  const rawMeta = storeState.metadata || sequencer?.metadata || {};
  const cleanMetadata = {
    ...rawMeta,
    toada: rawMeta.toada || '',
    nacao: rawMeta.nacao || '',
    compositor: rawMeta.compositor || '',
    ritmo: rawMeta.ritmo || '',
    youtubeUrl: rawMeta.youtubeUrl || '',
    description: rawMeta.description || '',
    descriptionPt: rawMeta.descriptionPt || '',
    descriptionFr: rawMeta.descriptionFr || '',
    partitionImage: rawMeta.partitionImage,
    rhythmSignals: Array.isArray(rawMeta.rhythmSignals) ? rawMeta.rhythmSignals : [],
    vocalPreset: activeVocalPreset,
    preRollSettings: currentPreRoll,
  };

  const effectiveSwing = audioSync?.globalSwing || transportState.globalSwing || { mode: 'maracatu', customOffsets: [0, 8, -29, -58] };
  const safeMasterVolDb = typeof masterVol === 'number' && !isNaN(masterVol)
    ? (masterVol <= 12 ? masterVol : faderPositionToDb(masterVol))
    : 0;
  const serializedMasterFX = {
    reverb: {
      returnVolume: storeState.masterFX?.reverb?.returnVolume ?? 70,
      time: storeState.masterFX?.reverb?.time ?? 30,
      isMuted: Boolean(storeState.masterFX?.reverb?.isMuted),
      spaceType: storeState.masterFX?.reverb?.spaceType ?? 'wood_studio',
      preDelayMs: storeState.masterFX?.reverb?.preDelayMs ?? 12,
      lowCutHz: storeState.masterFX?.reverb?.lowCutHz ?? 140,
      dampHz: storeState.masterFX?.reverb?.dampHz ?? 7500,
      stereoWidth: storeState.masterFX?.reverb?.stereoWidth ?? 100,
      presetId: storeState.masterFX?.reverb?.presetId ?? 'studio_bois',
    },
    distortion: {
      returnVolume: storeState.masterFX?.distortion?.returnVolume ?? 0,
      drive: storeState.masterFX?.distortion?.drive ?? 20,
      isMuted: Boolean(storeState.masterFX?.distortion?.isMuted),
      character: storeState.masterFX?.distortion?.character ?? 'soft_tube',
      preHpfHz: storeState.masterFX?.distortion?.preHpfHz ?? 180,
      toneHz: storeState.masterFX?.distortion?.toneHz ?? 6500,
      presetId: storeState.masterFX?.distortion?.presetId ?? 'warm_triode',
    },
    masterBus: {
      ...DEFAULT_STUDIO_MASTER_BUS_CONFIG,
      ...(storeState.masterFX?.masterBus || {}),
    },
  };

  return {
    bpm: storeState.bpm || sequencer?.bpm || 83,
    timeSig: storeState.timeSig || sequencer?.timeSig || '4/4',
    version: 3,
    vocalPreset: activeVocalPreset,
    totalMeasures: storeState.totalMeasures || 8,
    tracks: tracksCopy,
    rodaTrackOrder: storeState.rodaTrackOrder || [],
    letras: storeState.letras ?? sequencer?.letras ?? '',
    metadata: cleanMetadata,
    preRollSettings: currentPreRoll,
    measureTimeSigs: storeState.measureTimeSigs || Array(storeState.totalMeasures || 8).fill('4/4'),
    measureBpms: storeState.measureBpms || Array(storeState.totalMeasures || 8).fill(storeState.bpm || 83),
    measureBpmTransitions: storeState.measureBpmTransitions || Array(storeState.totalMeasures || 8).fill('immediate'),
    measureVols: storeState.measureVols || Array(storeState.totalMeasures || 8).fill(100),
    measureVolTransitions: storeState.measureVolTransitions || Array(storeState.totalMeasures || 8).fill('immediate'),
    songSections: Array.isArray(storeState.songSections) ? JSON.parse(JSON.stringify(storeState.songSections)) : [],
    songMarkers: Array.isArray(storeState.songMarkers) ? JSON.parse(JSON.stringify(storeState.songMarkers)) : [],
    measureSignals: Array.isArray(storeState.measureSignals) ? JSON.parse(JSON.stringify(storeState.measureSignals)) : Array(storeState.totalMeasures || 8).fill(null),
    mestreSignals: Array.isArray(storeState.mestreSignals) ? JSON.parse(JSON.stringify(storeState.mestreSignals)) : [],
    masterEQ: {
      low: typeof masterEQ?.low === 'number' && !isNaN(masterEQ.low) ? masterEQ.low : 0,
      mid: typeof masterEQ?.mid === 'number' && !isNaN(masterEQ.mid) ? masterEQ.mid : 0,
      high: typeof masterEQ?.high === 'number' && !isNaN(masterEQ.high) ? masterEQ.high : 0,
    },
    masterCompressor: {
      threshold: typeof masterCompressor?.threshold === 'number' && !isNaN(masterCompressor.threshold) ? masterCompressor.threshold : -6,
      ratio: typeof masterCompressor?.ratio === 'number' && !isNaN(masterCompressor.ratio) ? masterCompressor.ratio : 2,
    },
    masterVol: safeMasterVolDb,
    masterReverbVol: serializedMasterFX.reverb.returnVolume,
    reverbDecay: 0.5 + 7.5 * (serializedMasterFX.reverb.time / 100),
    masterFX: serializedMasterFX,
    masterEffectsActive: {
      compressor: Boolean(storeState.masterEffectsActive?.compressor ?? true),
      reverb: Boolean(storeState.masterEffectsActive?.reverb ?? true),
      disto: Boolean(storeState.masterEffectsActive?.disto ?? true),
    },
    masterDistortion: serializedMasterFX.distortion.returnVolume,
    masterDistortionDrive: serializedMasterFX.distortion.drive,
    isSwingOn: effectiveSwing.mode !== 'off',
    globalSwing: effectiveSwing,
    loopStartMeasure: storeState.loopStartMeasure,
    loopEndMeasure: storeState.loopEndMeasure,
    isLoopRegionActive: Boolean(storeState.isLoopRegionActive),
    loopMode: storeState.loopMode ?? 'infinite',
    isLoopExitRequested: false,
    isLooping: storeState.isLooping ?? true,
    vocalTransposeSteps: storeState.vocalTransposeSteps ?? 0,
    isMasterVolumeBypassed: Boolean(storeState.isMasterVolumeBypassed),
    globalAutomationBypass: storeState.globalAutomationBypass || { all: false, volume: false, pan: false, reverb: false },
    audioScaleVersion: CURRENT_AUDIO_SCALE_VERSION,
    lutherieVersion: CURRENT_LUTHERIE_VERSION
  } as Preset;
}
