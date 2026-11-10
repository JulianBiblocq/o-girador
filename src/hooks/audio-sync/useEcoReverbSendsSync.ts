import React, { useEffect } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import {
  handleReverbEcoToggle,
  getDeferredReverbActivation,
  ensureReverbConnected,
  setDeferredReverbActivation
} from '../../audio/effectsChain';
import { applyFxSendsEco, applyMasterDistortionEco, applyHaasEco, applyEqEco } from './ecoAudioLightening';

interface UseEcoReverbSendsSyncProps {
  isPlayingRef: React.MutableRefObject<boolean>;
  isPlaying: boolean;
}

/**
 * Synchronise le Palier 2 Eco (`ecoConfig.disableFx` / `ecoConfig.disableEq`) avec le graphe audio.
 * Le Palier 1 (`isEcoMode` seul) n'a AUCUN effet audio : seul `disableFx` / `disableEq` est observe.
 */
export function useEcoReverbSendsSync({
  isPlayingRef,
  isPlaying,
}: UseEcoReverbSendsSyncProps) {
  useEffect(() => {
    const initial = useSequencerStore.getState();
    let lastDisableFx = Boolean(initial.ecoConfig?.disableFx);
    let lastDisableEq = Boolean(initial.ecoConfig?.disableEq);

    const applyFx = (disableFx: boolean, state: any) => {
      handleReverbEcoToggle(disableFx, isPlayingRef.current);
      applyFxSendsEco(disableFx, state.tracks);
      applyMasterDistortionEco(disableFx, state);
      applyHaasEco(disableFx);
    };

    applyFx(lastDisableFx, initial);
    applyEqEco(initial.tracks);

    const unsubscribe = useSequencerStore.subscribe((state) => {
      const nextDisableFx = Boolean(state.ecoConfig?.disableFx);
      const nextDisableEq = Boolean(state.ecoConfig?.disableEq);

      if (nextDisableFx !== lastDisableFx) {
        lastDisableFx = nextDisableFx;
        applyFx(nextDisableFx, state);
      }
      if (nextDisableEq !== lastDisableEq) {
        lastDisableEq = nextDisableEq;
        applyEqEco(state.tracks);
      }
    });

    return () => unsubscribe();
  }, [isPlayingRef]);

  // Reset Destination Volume to neutral and process deferred reverb when stopped
  useEffect(() => {
    if (!isPlaying) {
      try {
        Tone.Destination.volume.setValueAtTime(0, Tone.context.currentTime);
      } catch (_) {}

      if (getDeferredReverbActivation()) {
        ensureReverbConnected();
        setDeferredReverbActivation(false);
      }
    }
  }, [isPlaying]);
}
