import { auth } from '../../firebase/config';
import { Preset } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { calculatePresetTiming } from './cloudPresetTimingCalculator';
import { recordPresetLive } from './cloudPresetLiveRecorder';
import { normalizeAndUploadPresetAudio } from './cloudPresetUploader';

export async function renderAndUploadPresetBounce(
  presetId: string,
  presetData: Preset,
  baseBpm: number,
  audio: any,
  options: any,
  setStage: (pct: number, fr: string, pt: string) => void,
  setProgress: (pct: number) => void
): Promise<string | null> {
  const storeState = useSequencerStore.getState();
  const transportState = useTransportStore.getState();
  const lang = options?.lang || storeState.lang || 'fr';

  const prevMetro = transportState.isMetroOn;
  const prevPreRoll = transportState.preRollSettings;
  const prevIsLooping = storeState.isLooping;
  const prevIsLoopRegionActive = storeState.isLoopRegionActive;
  const prevLoopStart = storeState.loopStartMeasure;
  const prevLoopEnd = storeState.loopEndMeasure;
  const prevLoopMode = storeState.loopMode;
  const prevLoopIteration = storeState.currentLoopIteration;
  const prevIsLoopBypassed = storeState.isLoopBypassed;
  const prevIsLoopExitRequested = storeState.isLoopExitRequested;

  try {
    setStage(5, "Initialisation de l'enregistrement...", "Inicializando gravação...");
    const timing = calculatePresetTiming(presetData, storeState, baseBpm, auth.currentUser, options);

    transportState.setIsMetroOn(false);
    transportState.setPreRollSettings({ ...prevPreRoll, enabled: false });

    useSequencerStore.setState({
      isLooping: timing.isLoopRegionActive,
      isLoopRegionActive: timing.isLoopRegionActive,
      loopStartMeasure: timing.loopStart,
      loopEndMeasure: timing.loopEnd,
      loopMode: timing.numLoops,
      currentLoopIteration: 1,
      isLoopBypassed: false,
      isLoopExitRequested: false,
    });

    const audioBlob = await recordPresetLive(timing, audio, lang, (pct, label) => {
      setProgress(pct);
      setStage(pct, label, label);
    });

    setStage(87, "Normalisation & Finalisation de l'audio...", "Normalização e finalização do áudio...");
    const audioUrl = await normalizeAndUploadPresetAudio(
      audioBlob, presetId, timing, presetData, baseBpm, (pct) => setProgress(pct)
    );

    setStage(100, "Terminé !", "Concluído!");
    return audioUrl;
  } finally {
    useTransportStore.getState().setIsMetroOn(prevMetro);
    useTransportStore.getState().setPreRollSettings(prevPreRoll);
    useSequencerStore.setState({
      isLooping: prevIsLooping,
      isLoopRegionActive: prevIsLoopRegionActive,
      loopStartMeasure: prevLoopStart,
      loopEndMeasure: prevLoopEnd,
      loopMode: prevLoopMode,
      currentLoopIteration: prevLoopIteration,
      isLoopBypassed: prevIsLoopBypassed,
      isLoopExitRequested: prevIsLoopExitRequested,
    });
  }
}
