import React, { useEffect } from 'react';
import { faderPositionToDbString, setFaderThumbPercent } from '../../utils/audioMath';
import { applyRealtimeMasterFader, applyRealtimeTrackOrBusFader } from '../../hooks/audio-sync/realtimeFaderAudioUpdater';

interface UseFaderMidiAndAudioProps {
  trackId?: number;
  isMaster?: boolean;
  visualThumbRef: React.MutableRefObject<HTMLDivElement | null>;
  valueTextRef: React.MutableRefObject<HTMLSpanElement | null>;
  onAudioDrag?: (val: number) => void;
}

export function useFaderMidiAndAudio({
  trackId,
  isMaster,
  visualThumbRef,
  valueTextRef,
  onAudioDrag,
}: UseFaderMidiAndAudioProps) {
  const updateAudioNode = (val: number) => {
    if (onAudioDrag) {
      onAudioDrag(val);
      return;
    }
    if (isMaster) {
      applyRealtimeMasterFader(val, 0.018);
      return;
    }
    if (trackId !== undefined) {
      applyRealtimeTrackOrBusFader(trackId, val, 0.018);
    }
  };

  useEffect(() => {
    const handleMidiFader = (e: Event) => {
      const customEv = e as CustomEvent<{ targetId: number | 'master'; val: number }>;
      const { targetId, val } = customEv.detail || {};
      const isCurrent = isMaster ? targetId === 'master' : targetId === trackId;
      if (!isCurrent) return;
      setFaderThumbPercent(visualThumbRef.current, val);
      if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(val);
    };
    window.addEventListener('midi-fader-move', handleMidiFader);
    return () => window.removeEventListener('midi-fader-move', handleMidiFader);
  }, [trackId, isMaster, visualThumbRef, valueTextRef]);

  return { updateAudioNode };
}
