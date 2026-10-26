import React, { useEffect } from 'react';
import { channels, busChannels } from '../../hooks/useAudioSync';
import { faderPositionToDb, faderPositionToDbString } from '../../utils/audioMath';
import { safeRampDb } from '../../utils/audio/safeAudioParamRamp';

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
    if (trackId !== undefined) {
      const channelNode = channels[trackId] || (busChannels ? busChannels[trackId] : undefined);
      if (channelNode && channelNode.volume) {
        const db = faderPositionToDb(val);
        safeRampDb(channelNode.volume, db, 0.02);
      }
    }
  };

  useEffect(() => {
    const handleMidiFader = (e: Event) => {
      const customEv = e as CustomEvent<{ targetId: number | 'master'; val: number }>;
      const { targetId, val } = customEv.detail || {};
      const isCurrent = isMaster ? targetId === 'master' : targetId === trackId;
      if (!isCurrent) return;
      if (visualThumbRef.current) visualThumbRef.current.style.bottom = `${val}%`;
      if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(val);
    };
    window.addEventListener('midi-fader-move', handleMidiFader);
    return () => window.removeEventListener('midi-fader-move', handleMidiFader);
  }, [trackId, isMaster, visualThumbRef, valueTextRef]);

  return { updateAudioNode };
}
