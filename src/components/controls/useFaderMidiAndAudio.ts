import React, { useEffect } from 'react';
import { channels, busChannels } from '../../hooks/useAudioSync';
import { faderPositionToDb, faderPositionToDbString } from '../../utils/audioMath';

interface UseFaderMidiAndAudioProps {
  trackId?: number;
  isMaster?: boolean;
  getTopPosition: (val: number) => number;
  visualThumbRef: React.MutableRefObject<HTMLDivElement | null>;
  valueTextRef: React.MutableRefObject<HTMLSpanElement | null>;
  onAudioDrag?: (val: number) => void;
}

export function useFaderMidiAndAudio({
  trackId,
  isMaster,
  getTopPosition,
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
        const safeDb = Number.isFinite(db) ? db : -100;
        channelNode.volume.rampTo(safeDb, 0.02);
      }
    }
  };

  useEffect(() => {
    const handleMidiFader = (e: Event) => {
      const customEv = e as CustomEvent<{ targetId: number | 'master'; val: number }>;
      const { targetId, val } = customEv.detail || {};
      const isCurrent = isMaster ? targetId === 'master' : targetId === trackId;
      if (!isCurrent) return;
      const topPx = getTopPosition(val);
      if (visualThumbRef.current) visualThumbRef.current.style.top = `${topPx}px`;
      if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(val);
    };
    window.addEventListener('midi-fader-move', handleMidiFader);
    return () => window.removeEventListener('midi-fader-move', handleMidiFader);
  }, [trackId, isMaster, getTopPosition, visualThumbRef, valueTextRef]);

  return { updateAudioNode };
}
