/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { faderPositionToDbString } from '../../utils/audioMath';

interface TrackInkVolumeSliderProps {
  trackId: number;
  volumeVal?: number;
}

export const TrackInkVolumeSlider: React.FC<TrackInkVolumeSliderProps> = ({ trackId, volumeVal = 75 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const handleTrackVolumeChange = useSequencerStore(state => state.handleTrackVolumeChange);

  const calculateVolumeFromEvent = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const nextVal = Math.round(ratio * 100);
    handleTrackVolumeChange(trackId, nextVal);
  }, [handleTrackVolumeChange, trackId]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    calculateVolumeFromEvent(e.clientX);

    const onPointerMove = (moveEv: PointerEvent) => {
      calculateVolumeFromEvent(moveEv.clientX);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleTrackVolumeChange(trackId, 75);
  };

  const pct = Math.max(0, Math.min(100, volumeVal));

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={handleDoubleClick}
      className="absolute bottom-0 left-0 right-0 h-2 flex items-center px-3 cursor-ew-resize z-20 group"
      title={`Volume: ${faderPositionToDbString(volumeVal)} (Double-clic pour réinitialiser à 0 dB)`}
    >
      <div className="relative w-full h-[1.5px] bg-[#1a1a1a]/25 dark:bg-[#f4ecd8]/25 rounded-full">
        <div
          className="absolute top-0 left-0 h-full bg-[#1a1a1a] dark:bg-[#f4ecd8] rounded-full"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#1a1a1a] dark:bg-[#f4ecd8] shadow-[0_0_2px_rgba(0,0,0,0.5)] group-hover:scale-125 transition-transform"
          style={{ left: `${pct}%` }}
        />
        {isDragging && (
          <div
            className="absolute -top-6 -translate-x-1/2 px-1 py-0.5 bg-[#1a1a1a] text-[#f4ecd8] text-[9px] font-mono font-bold rounded shadow-md pointer-events-none select-none z-30"
            style={{ left: `${pct}%` }}
          >
            {faderPositionToDbString(volumeVal)}
          </div>
        )}
      </div>
    </div>
  );
};
