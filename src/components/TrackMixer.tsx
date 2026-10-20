import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { instrumentsConfig } from '../data';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getBusColor, getTopParentBusId } from '../utils/colorHelpers';
import { TrackContextMenu } from './instrument-editor/TrackContextMenu';
import { useTrackMixerContextMenu } from './mixer/useTrackMixerContextMenu';
import { useTrackMixerPattern } from './mixer/useTrackMixerPattern';
import { TrackMixerHeader } from './mixer/TrackMixerHeader';
import { TrackMixerPatternPreview } from './mixer/TrackMixerPatternPreview';

export interface TrackMixerProps {
  trackId: number;
  index: number;
  totalTracks: number;
  onOpenDetailEditor: (trackId: number) => void;
  isActive?: boolean;
  isDragOver?: boolean;
  dropIndicator?: 'top' | 'bottom' | null;
  isMobile?: boolean;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number | [string, string],
    onSelect: (val: string | number | [string, string], merge?: boolean) => void,
    trackId?: number
  ) => void;
}

const TrackMixerComponent: React.FC<TrackMixerProps> = ({
  trackId,
  index,
  totalTracks: _totalTracks,
  onOpenDetailEditor,
  isActive: _isActive = true,
  isDragOver = false,
  dropIndicator = null,
  isMobile = false,
  onStepTouchStart,
}) => {
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const tracks = useSequencerStore(state => state.tracks);
  const isTracksCollapsed = useSequencerStore(state => state.isTracksCollapsed);
  const isLeftHanded = useSequencerStore(state => state.isLeftHanded);
  const currentMeasure = useSequencerStore(state => state.currentMeasure);

  const { contextMenuPos, handleContextMenuOpen, handleContextMenuClose, touchHandlers } = useTrackMixerContextMenu();

  const { isToada, inst, activePattern, registerStepRef, handleStepClick } = useTrackMixerPattern({
    track: track!,
    tracks,
    isMobile,
    isTracksCollapsed,
    isLeftHanded,
    currentMeasure,
    onStepTouchStart,
  });

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: track ? `track-${track.id}` : 'track-temp',
  });

  const topBusId = useMemo(() => (track ? getTopParentBusId(track, tracks) : null), [track, tracks]);
  const busColor = useMemo(() => (topBusId ? getBusColor(topBusId, tracks, instrumentsConfig) : null), [topBusId, tracks]);

  if (!track || !inst) return null;

  const isUnfolded = isMobile && !isTracksCollapsed;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeft: busColor ? `4px solid ${busColor}` : '4px solid #1a1a1a',
    zIndex: 10,
    ['--cordel-bg' as string]: '#f4ecd8',
    ['--cordel-text' as string]: '#1a1a1a',
    ['--cordel-border' as string]: '#1a1a1a',
    ['--fader-thumb-bg' as string]: '#8b2a1a',
    ['--fader-thumb-border' as string]: '#1a1a1a',
  };

  return (
    <div
      ref={setNodeRef}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleContextMenuOpen(e.clientX, e.clientY);
      }}
      {...touchHandlers}
      className={`flex flex-col relative transition-all duration-300 w-full justify-center border-b-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-none bg-[#f4ecd8] px-3 ${
        isUnfolded ? 'h-auto min-h-[156px] py-2' : 'h-[76px] min-h-[76px] py-1'
      } ${
        isDragOver ? 'ring-4 ring-[var(--cordel-wood)] shadow-[0_0_20px_var(--cordel-wood)] z-30 scale-[1.01] border-[var(--cordel-wood)]' : ''
      }`}
      style={style}
    >
      {dropIndicator === 'top' && <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--cordel-wood)] z-[99] pointer-events-none animate-pulse" />}
      {dropIndicator === 'bottom' && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[var(--cordel-wood)] z-[99] pointer-events-none animate-pulse" />}

      <TrackMixerHeader
        track={track}
        index={index}
        inst={inst}
        isToada={isToada}
        onOpenDetailEditor={onOpenDetailEditor}
        dragHandleProps={{ attributes, listeners }}
      />

      {isUnfolded && activePattern && (
        <TrackMixerPatternPreview
          pattern={activePattern}
          inst={inst}
          track={track}
          tracks={tracks}
          isLeftHanded={isLeftHanded}
          registerStepRef={registerStepRef}
          handleStepClick={handleStepClick}
        />
      )}

      {contextMenuPos && (
        <TrackContextMenu trackId={trackId} x={contextMenuPos.x} y={contextMenuPos.y} onClose={handleContextMenuClose} />
      )}
    </div>
  );
};

export const TrackMixer = React.memo(TrackMixerComponent, (prevProps, nextProps) => {
  if (prevProps.trackId !== nextProps.trackId) return false;
  const keys = Object.keys(prevProps) as Array<keyof TrackMixerProps>;
  for (const key of keys) {
    if (typeof prevProps[key] === 'function') continue;
    if (key === 'trackId') continue;
    if (prevProps[key] !== nextProps[key]) return false;
  }
  return true;
});
