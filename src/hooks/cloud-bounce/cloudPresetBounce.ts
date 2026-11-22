import { auth } from '../../firebase/config';
import { Preset } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { renderFullSongBounceOffline } from '../../utils/bounce/fullSongBounceExporter';
import { calculatePresetTiming } from './cloudPresetTimingCalculator';
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

  setStage(5, 'Préparation du rendu hors-ligne...', 'Preparando renderização offline...');
  const timing = calculatePresetTiming(presetData, storeState, baseBpm, auth.currentUser, options);

  const bounce = await renderFullSongBounceOffline({
    presetData,
    baseBpm,
    masterVol: audio?.masterVol,
    masterEQ: audio?.masterEQ,
    masterCompressor: audio?.masterCompressor,
    presetTiming: timing,
    onProgress: (pct, fr, pt) => {
      setProgress(pct);
      setStage(pct, fr, pt);
    },
  });

  setStage(90, "Envoi de l'audio sur le Cloud...", 'Enviando áudio para a nuvem...');
  const audioUrl = await normalizeAndUploadPresetAudio(
    bounce.wavBlob,
    presetId,
    timing,
    presetData,
    baseBpm,
    (pct) => setProgress(pct),
    { skipNormalization: true }
  );

  setStage(100, 'Terminé !', 'Concluído!');
  return audioUrl;
}
