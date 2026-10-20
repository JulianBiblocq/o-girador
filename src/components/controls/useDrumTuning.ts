import { useState, useEffect, useRef } from 'react';

interface UseDrumTuningProps {
  currentTuning: number;
  isControlled: boolean;
  trackId?: number;
  setTrackTuning: (trackId: number, tuning: number) => void;
  onChange?: (tuning: number) => void;
  onPreview?: () => void;
}

export function useDrumTuning({
  currentTuning,
  isControlled,
  trackId,
  setTrackTuning,
  onChange,
  onPreview,
}: UseDrumTuningProps) {
  const [localTuning, setLocalTuning] = useState(currentTuning);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isDragging) {
      setLocalTuning(currentTuning);
    }
  }, [currentTuning, isDragging]);

  const updateTuningFromEvent = (e: React.PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = y / rect.height;
    const mappedY = ratio * 180; // viewBox height is 180

    // R_y goes from 40 to 140
    let newTuning = ((140 - mappedY) / 100) * 12 - 6;
    newTuning = Math.round(newTuning);
    newTuning = Math.max(-6, Math.min(6, newTuning));

    setLocalTuning(newTuning);
    if (isControlled && onChange) {
      onChange(newTuning);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    updateTuningFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      updateTuningFromEvent(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    setIsDragging(false);

    if (!isControlled && trackId !== undefined) {
      if (localTuning !== currentTuning) {
        setTrackTuning(trackId, localTuning);
      }
    } else if (onChange) {
      onChange(localTuning);
    }

    if (dragStartPosRef.current && onPreview) {
      const dist = Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y);
      if (dist < 4) {
        onPreview();
      }
    }
    dragStartPosRef.current = null;
  };

  return {
    localTuning,
    svgRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
