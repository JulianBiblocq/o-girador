import React, { useEffect } from 'react';
import * as Tone from 'tone';
import { useTransportStore } from '../../stores/useTransportStore';
import { metroChannel } from './audioEngineNodes';
import { GlobalSwing } from '../../types';

interface UseMetroChannelSyncProps {
  isMetroOnRef: React.MutableRefObject<boolean>;
  globalSwingRef: React.MutableRefObject<GlobalSwing>;
  metroVolumeRef: React.MutableRefObject<number>;
  metroSoundRef: React.MutableRefObject<string>;
  soloPatternPlayIdRef: React.MutableRefObject<number | null>;
  soloPatternVariationIdRef: React.MutableRefObject<string | null>;
  soloPhraseMeasureRef: React.MutableRefObject<number>;
  soloLoopCycleRef: React.MutableRefObject<number>;
}

export function useMetroChannelSync({
  isMetroOnRef,
  globalSwingRef,
  metroVolumeRef,
  metroSoundRef,
  soloPatternPlayIdRef,
  soloPatternVariationIdRef,
  soloPhraseMeasureRef,
  soloLoopCycleRef,
}: UseMetroChannelSyncProps) {
  useEffect(() => {
    const syncTransport = (state: ReturnType<typeof useTransportStore.getState>) => {
      isMetroOnRef.current = state.isMetroOn;
      globalSwingRef.current = state.globalSwing;
      metroVolumeRef.current = state.metroVolume;
      metroSoundRef.current = state.metroSound;
      if (soloPatternPlayIdRef.current !== state.soloPatternPlayId) {
        soloPhraseMeasureRef.current = 0;
        soloLoopCycleRef.current = 0;
      }
      soloPatternPlayIdRef.current = state.soloPatternPlayId;
      soloPatternVariationIdRef.current = state.soloPatternVariationId;
      
      if (metroChannel) {
        const gain = Math.max(0.00001, state.metroVolume / 100);
        const db = state.metroVolume === 0 ? -Infinity : Tone.gainToDb(gain);
        const now = Tone.context.currentTime;
        metroChannel.volume.setValueAtTime(db, now);
        metroChannel.mute = !state.isMetroOn;
      }
    };

    syncTransport(useTransportStore.getState());
    const unsub = useTransportStore.subscribe((state) => {
      syncTransport(state);
    });
    return unsub;
  }, [isMetroOnRef, globalSwingRef, metroVolumeRef, metroSoundRef, soloPatternPlayIdRef, soloPatternVariationIdRef, soloPhraseMeasureRef, soloLoopCycleRef]);
}
