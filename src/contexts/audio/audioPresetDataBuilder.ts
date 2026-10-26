import { Preset } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { CURRENT_AUDIO_SCALE_VERSION } from '../../utils/audioMath';

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
    masterEQ,
    masterCompressor,
    masterVol: typeof masterVol === 'number' && !isNaN(masterVol) && masterVol <= 12 ? masterVol : 0,
    masterReverbVol: storeState.masterFX?.reverb?.returnVolume ?? 0,
    reverbDecay: 0.5 + 7.5 * ((storeState.masterFX?.reverb?.time ?? 30) / 100),
    masterFX: storeState.masterFX,
    masterDistortion: storeState.masterFX?.distortion?.returnVolume ?? 0,
    masterDistortionDrive: storeState.masterFX?.distortion?.drive ?? 0,
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
    audioScaleVersion: CURRENT_AUDIO_SCALE_VERSION
  };
}
