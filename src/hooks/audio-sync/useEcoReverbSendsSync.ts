import React, { useEffect } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import {
  reverbSends,
  handleReverbEcoToggle,
  syncTrackInsertChain,
  getDeferredReverbActivation,
  ensureReverbConnected,
  setDeferredReverbActivation
} from '../../audio/effectsChain';
import { percentToDb } from './audioParamsCache';

interface UseEcoReverbSendsSyncProps {
  isPlayingRef: React.MutableRefObject<boolean>;
  isPlaying: boolean;
}

export function useEcoReverbSendsSync({
  isPlayingRef,
  isPlaying,
}: UseEcoReverbSendsSyncProps) {
  useEffect(() => {
    let lastDisableFx = useSequencerStore.getState().ecoConfig?.disableFx ?? useSequencerStore.getState().isEcoMode;
    let lastDisableEq = useSequencerStore.getState().ecoConfig?.disableEq ?? useSequencerStore.getState().isEcoMode;

    const applyEcoReverbSendsAndToggle = (disableFx: boolean, tracks: any[]) => {
      handleReverbEcoToggle(disableFx, isPlayingRef.current);

      tracks.forEach((t) => {
        if (reverbSends[t.id]) {
          try {
            const reverbPct = t.fxSends?.reverb ?? t.reverbVal ?? 0;
            const reverbDb = percentToDb(disableFx ? 0 : reverbPct);
            reverbSends[t.id].gain.value = reverbDb;
          } catch (_) {}
        }
      });
    };

    const applyEqSync = (tracks: any[]) => {
      tracks.forEach((t) => {
        try {
          syncTrackInsertChain(t.id, t);
        } catch (_) {}
      });
    };

    const initialStore = useSequencerStore.getState();
    applyEcoReverbSendsAndToggle(lastDisableFx, initialStore.tracks);
    applyEqSync(initialStore.tracks);

    const unsubscribe = useSequencerStore.subscribe((state) => {
      const nextDisableFx = state.ecoConfig?.disableFx ?? state.isEcoMode;
      const nextDisableEq = state.ecoConfig?.disableEq ?? state.isEcoMode;

      if (nextDisableFx !== lastDisableFx) {
        lastDisableFx = nextDisableFx;
        applyEcoReverbSendsAndToggle(nextDisableFx, state.tracks);
      }
      if (nextDisableEq !== lastDisableEq) {
        lastDisableEq = nextDisableEq;
        applyEqSync(state.tracks);
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
