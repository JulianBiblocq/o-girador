
import React from 'react';
import { ASSETS_BASE_URL } from '../../data';
import { TrackGroup } from '../../types';
import { WorkspacePistasRow } from './WorkspacePistasRow';

interface WorkspacePistasOverlayProps {
  tracks: TrackGroup[];
  isPistasOpen: boolean;
  currentMeasure: number;
  defaultBeats: number;
  isLeftHanded: boolean;
  sequencer: any;
  handleStepClick: (e: React.MouseEvent, trackId: number, activePattern: any, inst: any, stepIdx: number, currentVal: any) => void;
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
  handleStepClick,
  registerStepRef,
  trackResolutionsRef,
  scrollRef,
  onScroll,
}) => {
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
      className="absolute inset-0 z-30 bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden shadow-[-4px_0_12px_rgba(0,0,0,0.15)] flex flex-col"
    >
      {/* Texture subtile d'arrière-plan opaque en harmonie avec le thème */}
      <div
        className="absolute inset-0 pointer-events-none bg-cover bg-center bg-no-repeat select-none z-0 invert mix-blend-multiply opacity-15 dark:invert-0 dark:opacity-20 dark:mix-blend-normal"
        style={{
          backgroundImage: `url(${ASSETS_BASE_URL}Pictures/atelier.png)`,
        }}
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
            handleStepClick={handleStepClick}
            registerStepRef={registerStepRef}
            trackResolutionsRef={trackResolutionsRef}
          />
        ))}
      </div>
    </div>
  );
};
