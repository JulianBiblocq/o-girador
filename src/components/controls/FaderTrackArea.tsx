import React from 'react';

interface FaderTrackAreaProps {
  trackAreaRef: React.RefObject<HTMLDivElement | null>;
  topPadding: number;
  bottomPadding: number;
  unityTop: number;
  resolvedThumbWidth: number;
  resolvedThumbHeight: number;
  setThumbRef: (el: HTMLDivElement | null) => void;
  resolvedFaderColor: string;
  isMaster: boolean;
  topPosition: number;
  handlePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  resetToUnity: (e?: React.SyntheticEvent | Event) => void;
}

export const FaderTrackArea: React.FC<FaderTrackAreaProps> = ({
  trackAreaRef,
  topPadding,
  bottomPadding,
  unityTop,
  resolvedThumbWidth,
  resolvedThumbHeight,
  setThumbRef,
  resolvedFaderColor,
  isMaster,
  topPosition,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  resetToUnity,
}) => {
  return (
    <div
      ref={trackAreaRef}
      className="flex-1 w-full relative flex items-center justify-center min-h-[44px] cursor-pointer touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={resetToUnity}
    >
      <div 
        className="absolute w-1 bg-[var(--cordel-border)] pointer-events-none z-0"
        style={{ top: `${topPadding}px`, bottom: `${bottomPadding}px` }}
      />

      <div
        className="absolute flex items-center justify-end pointer-events-none z-0"
        style={{
          top: `${unityTop}px`,
          right: `calc(50% + ${(resolvedThumbWidth / 2) + 2}px)`,
          transform: 'translateY(-50%)',
        }}
      >
        <span className="text-[8px] font-mono font-black text-[var(--cordel-text)] opacity-80 mr-0.5 select-none leading-none">
          U
        </span>
        <div className="w-1.5 h-[1.5px] bg-[var(--cordel-border)] opacity-85" />
      </div>

      <div
        className="absolute w-2.5 h-[1px] bg-[var(--cordel-border)] opacity-70 pointer-events-none z-0 -translate-x-1/2 left-1/2"
        style={{
          top: `${unityTop}px`,
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div
        className="absolute flex items-center pointer-events-none z-0"
        style={{
          top: `${unityTop}px`,
          left: `calc(50% + ${(resolvedThumbWidth / 2) + 2}px)`,
          transform: 'translateY(-50%)',
        }}
      >
        <div className="w-1.5 h-[1.5px] bg-[var(--cordel-border)] opacity-85" />
        <span className="text-[8px] font-mono font-black text-[var(--cordel-text)] opacity-80 ml-0.5 select-none leading-none">
          0
        </span>
      </div>

      <div
        ref={setThumbRef}
        className={`absolute shadow-[0_2px_5px_var(--cordel-shadow-color)] flex items-center justify-center pointer-events-none z-10 transition-colors ${
          isMaster ? 'master-fader-thumb' : 'cordel-border-sm'
        }`}
        style={{
          width: `${resolvedThumbWidth}px`,
          height: `${resolvedThumbHeight}px`,
          left: `calc(50% - ${resolvedThumbWidth / 2}px)`,
          top: `${topPosition}px`,
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
