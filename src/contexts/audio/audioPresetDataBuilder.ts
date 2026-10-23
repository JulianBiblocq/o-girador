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
  const tracksCopy = JSON.parse(JSON.stringify(useSequencerStore.getState().tracks));
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

  const currentPreRoll = useTransportStore.getState().preRollSettings;
  const activeVocalPreset = useAudioStore.getState().vocalPreset || 'guide';

  const cleanMetadata = sequencer.metadata ? {
    ...sequencer.metadata,
    vocalPreset: activeVocalPreset,
    partitionImage: sequencer.metadata.partitionImage,
    preRollSettings: currentPreRoll,
  } : undefined;

  const storeState = useSequencerStore.getState();

  return {
    bpm: sequencer.bpm,
    timeSig: sequencer.timeSig,
    version: 3,
    vocalPreset: activeVocalPreset,
    totalMeasures: storeState.totalMeasures,
    tracks: tracksCopy,
    rodaTrackOrder: storeState.rodaTrackOrder,
    letras: sequencer.letras,
    metadata: cleanMetadata,
    preRollSettings: currentPreRoll,
    measureTimeSigs: storeState.measureTimeSigs,
    measureBpms: sequencer.measureBpms,
    measureBpmTransitions: sequencer.measureBpmTransitions,
    measureVols: sequencer.measureVols,
    measureVolTransitions: sequencer.measureVolTransitions,
    songSections: Array.isArray(storeState.songSections) ? JSON.parse(JSON.stringify(storeState.songSections)) : [],
    songMarkers: Array.isArray(storeState.songMarkers) ? JSON.parse(JSON.stringify(storeState.songMarkers)) : [],
    measureSignals: Array.isArray(storeState.measureSignals) ? JSON.parse(JSON.stringify(storeState.measureSignals)) : Array(storeState.totalMeasures).fill(null),
    masterEQ,
    masterCompressor,
    masterVol,
    masterReverbVol: storeState.masterFX.reverb.returnVolume,
    reverbDecay: 0.5 + 7.5 * (storeState.masterFX.reverb.time / 100),
    masterFX: storeState.masterFX,
    masterDistortion: storeState.masterFX.distortion.returnVolume,
    masterDistortionDrive: storeState.masterFX.distortion.drive,
    isSwingOn: audioSync.globalSwing.mode !== 'off',
    globalSwing: audioSync.globalSwing,
    loopStartMeasure: storeState.loopStartMeasure,
    loopEndMeasure: storeState.loopEndMeasure,
    isLoopRegionActive: storeState.isLoopRegionActive,
    loopMode: storeState.loopMode,
    isLoopExitRequested: false,
    isLooping: sequencer.isLooping,
    vocalTransposeSteps: storeState.vocalTransposeSteps ?? 0,
    isMasterVolumeBypassed: Boolean(storeState.isMasterVolumeBypassed),
    globalAutomationBypass: storeState.globalAutomationBypass || { all: false, volume: false, pan: false, reverb: false },
    audioScaleVersion: CURRENT_AUDIO_SCALE_VERSION
  };
}
