import React, { useState, useEffect } from 'react';
import { ASSETS_BASE_URL } from '../../data';
import { TrackGroup } from '../../types';
import { WorkspacePistasRow } from './WorkspacePistasRow';
import { StrokeInfoPopover } from '../pedagogy/StrokeInfoPopover';
import { StrokeInfoPopoverTarget } from '../pedagogy/strokeInfoTypes';

interface WorkspacePistasOverlayProps {
  tracks: TrackGroup[];
  isPistasOpen: boolean;
  currentMeasure: number;
  defaultBeats: number;
  isLeftHanded: boolean;
  sequencer: any;
  registerStepRef: (trackId: number | string, stepIdx: number, el: HTMLButtonElement | null) => void;
  trackResolutionsRef: React.MutableRefObject<Record<string, { beats: number; resArray: number[]; totalSteps: number }>>;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const WorkspacePistasOverlay: React.FC<WorkspacePistasOverlayProps> = ({
  tracks,
  isPistasOpen,
  currentMeasure,
  defaultBeats,
  isLeftHanded,
  sequencer,
  registerStepRef,
  trackResolutionsRef,
  scrollRef,
  onScroll,
}) => {
  const [pedagogyTarget, setPedagogyTarget] = useState<StrokeInfoPopoverTarget | null>(null);

  useEffect(() => {
    if (!isPistasOpen) setPedagogyTarget(null);
  }, [isPistasOpen]);

  const overlayStyle: React.CSSProperties = {
    clipPath: isPistasOpen ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)',
    transform: isPistasOpen ? 'translateX(0)' : 'translateX(-24px)',
    opacity: isPistasOpen ? 1 : 0,
    pointerEvents: isPistasOpen ? 'auto' : 'none',
    transition: isPistasOpen
      ? 'clip-path 420ms cubic-bezier(0.22, 1, 0.36, 1), transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease-out'
      : 'clip-path 380ms cubic-bezier(0.22, 1, 0.36, 1), transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease-in',
  };

  return (
    <div
      style={overlayStyle}
      onContextMenu={(e) => e.preventDefault()}
      className="absolute inset-0 z-30 bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden shadow-[-4px_0_12px_rgba(0,0,0,0.15)] flex flex-col"
    >
      <div
        className="absolute inset-0 pointer-events-none bg-cover bg-center bg-no-repeat select-none z-0 invert mix-blend-multiply opacity-15 dark:invert-0 dark:opacity-20 dark:mix-blend-normal"
        style={{ backgroundImage: `url(${ASSETS_BASE_URL}Pictures/atelier.png)` }}
        aria-hidden="true"
      />

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="w-full h-full overflow-y-auto no-scrollbar flex flex-col gap-[5px] py-1.5 px-2 select-none relative z-10"
      >
        {tracks.map((track) => (
          <WorkspacePistasRow
            key={track.id}
            track={track}
            tracks={tracks}
            currentMeasure={currentMeasure}
            defaultBeats={defaultBeats}
            isLeftHanded={isLeftHanded}
            sequencer={sequencer}
            onSelectPedagogyTarget={setPedagogyTarget}
            registerStepRef={registerStepRef}
            trackResolutionsRef={trackResolutionsRef}
          />
        ))}
      </div>
      <StrokeInfoPopover target={pedagogyTarget} onClose={() => setPedagogyTarget(null)} />
    </div>
  );
};
