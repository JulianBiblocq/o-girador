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
import { safeRampDb, safeRampTo } from '../../utils/audio/safeAudioParamRamp';

interface UseEcoReverbSendsSyncProps {
  isPlayingRef: React.MutableRefObject<boolean>;
  isPlaying: boolean;
}

export function useEcoReverbSendsSync({
  isPlayingRef,
  isPlaying,
}: UseEcoReverbSendsSyncProps) {
  useEffect(() => {
    let lastDisableFx = Boolean(useSequencerStore.getState().ecoConfig?.disableFx);
    let lastDisableEq = Boolean(useSequencerStore.getState().ecoConfig?.disableEq);
    let lastEcoMode = Boolean(useSequencerStore.getState().isEcoMode);

    const applyEcoReverbSendsAndToggle = (disableFx: boolean, tracks: any[]) => {
      handleReverbEcoToggle(disableFx, isPlayingRef.current);

      tracks.forEach((t) => {
        if (reverbSends[t.id]) {
          try {
            const reverbPct = disableFx ? 0 : (t.fxSends?.reverb ?? t.reverbVal ?? 0);
            const reverbDb = Math.max(-100, Math.min(12, percentToDb(reverbPct)));
            const gainParam = reverbSends[t.id].gain;
            if (gainParam?.units === 'decibels') {
              safeRampDb(gainParam, reverbDb, 0.025);
            } else {
              const lin = reverbDb <= -99 ? 0 : Tone.dbToGain(reverbDb);
              safeRampTo(gainParam, Number.isFinite(lin) ? lin : 0, 0.025, 0, 4);
            }
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
      const nextDisableFx = Boolean(state.ecoConfig?.disableFx);
      const nextDisableEq = Boolean(state.ecoConfig?.disableEq);
      const nextEcoMode = Boolean(state.isEcoMode);

      if (nextDisableFx !== lastDisableFx || nextEcoMode !== lastEcoMode) {
        lastDisableFx = nextDisableFx;
        lastEcoMode = nextEcoMode;
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
