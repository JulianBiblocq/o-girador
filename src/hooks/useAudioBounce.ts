import { useState } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudio } from '../contexts/AudioContext';
import { telemetryService } from '../services/telemetryService';
import { calculateBounceDuration, normalizeAudioBlob } from './audio-bounce/audioBounceHelpers';

export function useAudioBounce() {
  const [estEnCalcul, setEstEnCalcul] = useState(false);
  const audio = useAudio();

  const genererBounce = async (): Promise<Blob> => {
    setEstEnCalcul(true);
    try {
      const state = useSequencerStore.getState();
      const { dureeTotaleSec, isFiniteLoop } = calculateBounceDuration(state);

      if (audio.isPlaying) {
        audio.handleStop();
        await new Promise(r => setTimeout(r, 100));
      } else {
        audio.handleStop();
      }

      const previousIsLooping = state.isLooping;
      const previousLoopIteration = state.currentLoopIteration;
      if (isFiniteLoop) {
        state.setIsLooping(true);
        state.setCurrentLoopIteration(1);
      } else {
        state.setIsLooping(false);
      }

      const recorder = new Tone.Recorder();
      Tone.getDestination().connect(recorder);
      recorder.start();

      await audio.handleTogglePlay();
      await new Promise(resolve => setTimeout(resolve, dureeTotaleSec * 1000));

      Tone.getDestination().disconnect(recorder);
      const rawBlob = await recorder.stop();
      recorder.dispose();
      audio.handleStop();

      state.setIsLooping(previousIsLooping);
      state.setCurrentLoopIteration(previousLoopIteration);

      const finalBlob = await normalizeAudioBlob(rawBlob);
      setEstEnCalcul(false);
      return finalBlob;
    } catch (err: any) {
      console.error("[Export Danse] Erreur bloquante durant l'enregistrement :", err);
      telemetryService.logError(err, 'useAudioBounce');
      audio.handleStop();
      setEstEnCalcul(false);
      throw err;
    }
  };

  return { genererBounce, estEnCalcul };
}
