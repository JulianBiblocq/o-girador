import React from 'react';

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
      {/* Tige verticale grise 2px */}
      <div className="absolute h-full w-[2px] bg-[var(--cordel-border)] pointer-events-none z-0" />

      {/* Repère U — — 0 aligné à 75% */}
      <div className="absolute bottom-[75%] translate-y-1/2 left-0 right-0 flex items-center justify-between px-1 pointer-events-none z-0">
        <div className="flex items-center gap-0.5">
          <span className="text-[8px] font-mono font-black text-[var(--cordel-text)] opacity-80 leading-none">U</span>
          <div className="w-1.5 h-[1.5px] bg-[var(--cordel-border)] opacity-85" />
        </div>
        <div className="w-2.5 h-[1px] bg-[var(--cordel-border)] opacity-70" />
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-[1.5px] bg-[var(--cordel-border)] opacity-85" />
          <span className="text-[8px] font-mono font-black text-[var(--cordel-text)] opacity-80 leading-none">0</span>
        </div>
      </div>

      {/* Capuchon (thumb) positionné en bottom: % avec translate-y-1/2 */}
      <div
        ref={setThumbRef}
        className={`absolute left-1/2 -translate-x-1/2 translate-y-1/2 shadow-[0_2px_5px_var(--cordel-shadow-color)] flex items-center justify-center pointer-events-none z-10 transition-colors ${
          isMaster ? 'master-fader-thumb' : 'cordel-border-sm'
        }`}
        style={{
          width: `${resolvedThumbWidth}px`,
          height: `${resolvedThumbHeight}px`,
          bottom: `${clampedPosition}%`,
          backgroundColor: resolvedFaderColor,
          borderColor: isMaster ? 'var(--master-border, var(--cordel-border))' : 'var(--cordel-border)',
        }}
      >
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-[var(--cordel-cream,var(--cordel-bg))] opacity-90 shadow-[0_1px_1px_rgba(0,0,0,0.8)] pointer-events-none"
          aria-hidden="true"
        />
      </div>
    </div>
  );
};
