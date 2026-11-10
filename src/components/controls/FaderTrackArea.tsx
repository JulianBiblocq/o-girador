import React from 'react';
import { getFaderThumbTransform } from '../../utils/audioMath';

interface FaderTrackAreaProps {
  railRef: React.RefObject<HTMLDivElement | null>;
  resolvedThumbWidth: number;
  resolvedThumbHeight: number;
  setThumbRef: (el: HTMLDivElement | null) => void;
  resolvedFaderColor: string;
  isMaster: boolean;
  clampedPosition: number;
  handlePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  resetToUnity: (e?: React.SyntheticEvent | Event) => void;
}

export const FaderTrackArea: React.FC<FaderTrackAreaProps> = ({
  railRef,
  resolvedThumbWidth,
  resolvedThumbHeight,
  setThumbRef,
  resolvedFaderColor,
  isMaster,
  clampedPosition,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  resetToUnity,
}) => {
  return (
    <div
      ref={railRef}
      className="relative flex-1 w-full flex justify-center items-center min-h-[60px] cursor-pointer touch-none select-none my-2"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={resetToUnity}
    >
      {/* Tige verticale 2px */}
      <div className="absolute h-full w-[2px] bg-[var(--cordel-border)] pointer-events-none z-0" />

      {/* Repère U —     — 0 aligné à 75% (0.0 dB Unity Gain) */}
      <div className="absolute bottom-[75%] translate-y-1/2 left-0 right-0 flex items-center justify-between px-0.5 pointer-events-none z-0">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-mono font-extrabold text-[var(--cordel-text)] opacity-85 leading-none">
            U
          </span>
          <div className="w-3 h-[2px] bg-[var(--cordel-text)] opacity-80" />
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-[2px] bg-[var(--cordel-text)] opacity-80" />
          <span className="text-[11px] font-mono font-extrabold text-[var(--cordel-text)] opacity-85 leading-none">
            0
          </span>
        </div>
      </div>

      {/* Porteur GPU (inset-0 h-full) positionné en translate3d(0, 100 - pct%, 0) sans Layout Thrashing */}
      <div
        ref={setThumbRef}
        className="absolute inset-0 w-full h-full pointer-events-none will-change-transform z-10"
        style={{ transform: getFaderThumbTransform(clampedPosition) }}
      >
        <div
          className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 shadow-[0_2px_6px_var(--cordel-shadow-color)] flex items-center justify-center pointer-events-none transition-colors ${
            isMaster ? 'master-fader-thumb border-2' : 'cordel-border-sm'
          }`}
          style={{
            width: `${resolvedThumbWidth}px`,
            height: `${resolvedThumbHeight}px`,
            backgroundColor: resolvedFaderColor,
            borderColor: isMaster ? 'var(--master-border, var(--cordel-parchment-bg))' : 'var(--cordel-border)',
          }}
        >
          <div
            className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-[var(--cordel-parchment-bg)] opacity-95 shadow-[0_1px_1px_rgba(0,0,0,0.8)] pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
};
