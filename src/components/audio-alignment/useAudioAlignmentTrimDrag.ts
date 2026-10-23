
import React, { useRef } from 'react';

export function useAudioAlignmentTrimDrag(params: {
  audioBuffer: AudioBuffer;
  pixelsPerSecond: number;
  setTrimStartSec: (sec: number) => void;
  setTrimEndSec: (sec: number) => void;
  trimStartSecRef: React.MutableRefObject<number>;
  trimEndSecRef: React.MutableRefObject<number>;
  currentTotalWaveXRef: React.MutableRefObject<number>;
  updateLiveTimingBadges: (totalX?: number) => void;
}) {
  const {
    audioBuffer, pixelsPerSecond, setTrimStartSec, setTrimEndSec,
    trimStartSecRef, trimEndSecRef, currentTotalWaveXRef, updateLiveTimingBadges,
  } = params;

  const isDraggingTrimRef = useRef<'start' | 'end' | null>(null);
  const trimDragStartXRef = useRef(0);
  const trimDragStartSecRef = useRef(0);

  const handleTrimPointerDown = (e: React.PointerEvent<HTMLDivElement>, type: 'start' | 'end') => {
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    isDraggingTrimRef.current = type;
    trimDragStartXRef.current = e.clientX;
    trimDragStartSecRef.current = type === 'start' ? trimStartSecRef.current : trimEndSecRef.current;
  };

  const handleTrimPointerMove = (e: React.PointerEvent<HTMLDivElement>, type: 'start' | 'end') => {
    if (isDraggingTrimRef.current !== type) return;
    e.stopPropagation();
    const newSec = trimDragStartSecRef.current + (e.clientX - trimDragStartXRef.current) / pixelsPerSecond;

    if (type === 'start') {
      const clamped = Math.max(0, Math.min(trimEndSecRef.current - 0.05, newSec));
      setTrimStartSec(clamped);
      trimStartSecRef.current = clamped;
    } else {
      const clamped = Math.min(audioBuffer.duration, Math.max(trimStartSecRef.current + 0.05, newSec));
      setTrimEndSec(clamped);
      trimEndSecRef.current = clamped;
    }
    updateLiveTimingBadges(currentTotalWaveXRef.current);
  };

  const handleTrimPointerUp = (e: React.PointerEvent<HTMLDivElement>, type: 'start' | 'end') => {
    if (isDraggingTrimRef.current === type) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
      isDraggingTrimRef.current = null;
    }
  };

  return { handleTrimPointerDown, handleTrimPointerMove, handleTrimPointerUp };
}
