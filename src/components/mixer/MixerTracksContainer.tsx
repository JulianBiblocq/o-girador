import React, { useRef, useEffect } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { TrackMeta } from '../../stores/useSequencerStore';
import { MixerAddChannel } from '../MixerAddChannel';
import { MixerWagonGhost } from '../MixerWagonGhost';
import { MixerTrackItem } from './MixerTrackItem';
import { getTrackGroupKey, computeBusAndLinkPositions, computeMidiAndOrdinal } from './mixerHierarchyHelpers';

interface MixerTracksContainerProps {
  displayedTracks: TrackMeta[];
  displayedTrackIds: string[];
  allOrderedTracks: TrackMeta[];
  tracksMeta: TrackMeta[];
  mixerBankOffset: number;
  isActive: boolean;
  lang: string;
  copiedPattern: any;
  handleCopyPattern: (pattern: any) => void;
  handlePastePattern: (trackId: number, patternId: number) => void;
  onOpenDetailEditor: (trackId: number) => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  dnd: any;
}

export const MixerTracksContainer: React.FC<MixerTracksContainerProps> = ({
  displayedTracks,
  displayedTrackIds,
  allOrderedTracks,
  tracksMeta,
  mixerBankOffset,
  isActive,
  lang,
  copiedPattern,
  handleCopyPattern,
  handlePastePattern,
  onOpenDetailEditor,
  onStepTouchStart,
  dnd,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        let target = e.target as HTMLElement | null;
        while (target && target !== el) {
          if (target.scrollHeight > target.clientHeight) {
            const overflowY = window.getComputedStyle(target).overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') return;
          }
          target = target.parentElement;
        }
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div ref={scrollRef} className="flex-grow flex overflow-x-auto pt-4 pb-4 pl-4 pr-0 custom-scrollbar bg-transparent relative z-10">
      <DndContext
        sensors={dnd.sensors}
        collisionDetection={dnd.customCollisionDetection}
        onDragStart={dnd.handleDragStart}
        onDragMove={dnd.handleDragMove}
        onDragOver={dnd.handleDragOver}
        onDragEnd={dnd.handleDragEnd}
        onDragCancel={dnd.handleDragCancel}
      >
        <SortableContext items={displayedTrackIds} strategy={horizontalListSortingStrategy}>
          {displayedTracks.map((track, index) => {
            const trackId = track.id;
            const prevTrack = index > 0 ? displayedTracks[index - 1] : null;
            const nextTrack = index < displayedTracks.length - 1 ? displayedTracks[index + 1] : null;
            const activeTrack = dnd.activeDragTrackId !== null ? tracksMeta.find(t => t.id === dnd.activeDragTrackId) : null;
            const overTrack = dnd.overDragTrackId !== null ? tracksMeta.find(t => t.id === dnd.overDragTrackId) : null;

            const activeGroupKey = getTrackGroupKey(activeTrack, tracksMeta);
            const hoveredGroupKey = getTrackGroupKey(overTrack, tracksMeta);
            const currentTrackGroupKey = getTrackGroupKey(track, tracksMeta);
            const isOverBusHeaderLeft = Boolean(overTrack?.isBusFolder && dnd.overDropSide === 'left');
            const isLinkGroup = Boolean(overTrack && (overTrack.isLinkFolder || tracksMeta.some(t => String(t.id) === String(overTrack.busId || overTrack.linkedToTrackId) && t.isLinkFolder)));
            const canIntegrateGroup = !isLinkGroup && !isOverBusHeaderLeft;
            const isThisGroupHovered = !!(hoveredGroupKey && currentTrackGroupKey === hoveredGroupKey && dnd.activeDragTrackId !== null && !activeTrack?.isBusFolder && canIntegrateGroup);
            const isExternalHoveringThisGroup = !!(isThisGroupHovered && (!activeGroupKey || activeGroupKey !== hoveredGroupKey));

            let dropIndicator: 'left' | 'right' | null = null;
            if (dnd.activeDragTrackId !== null && dnd.overDragTrackId === trackId && dnd.activeDragTrackId !== trackId && !isExternalHoveringThisGroup) {
              const activeIdx = displayedTracks.findIndex(t => t.id === dnd.activeDragTrackId);
              const overIdx = displayedTracks.findIndex(t => t.id === trackId);
              if (activeIdx !== -1 && overIdx !== -1) dropIndicator = dnd.overDropSide || (activeIdx < overIdx ? 'right' : 'left');
            }

            const { busPosition, linkPosition } = computeBusAndLinkPositions(track, prevTrack, nextTrack, tracksMeta);
            const { channelOrdinal, isUnderMidiControl, midiFaderIndex } = computeMidiAndOrdinal(track, index, allOrderedTracks, mixerBankOffset);

            return (
              <MixerTrackItem
                key={trackId}
                track={track}
                index={index}
                channelOrdinal={channelOrdinal}
                midiFaderIndex={midiFaderIndex}
                isUnderMidiControl={isUnderMidiControl}
                isActive={isActive}
                busPosition={busPosition}
                linkPosition={linkPosition}
                isThisGroupHovered={isThisGroupHovered}
                dropIndicator={dropIndicator}
                wagonSize={dnd.activeDragWagonTracks && dnd.activeDragWagonTracks.length > 1 ? dnd.activeDragWagonTracks.length : 1}
                isWagonMember={dnd.activeGroupTrackIdsRef.current.includes(trackId)}
                isDraggingWagon={dnd.activeDragWagonTracks !== null && dnd.activeDragWagonTracks.length > 1}
                onOpenDetailEditor={onOpenDetailEditor}
                onStepTouchStart={onStepTouchStart}
                handleCopyPattern={handleCopyPattern}
                handlePastePattern={handlePastePattern}
                copiedPattern={copiedPattern}
              />
            );
          })}
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {dnd.activeDragWagonTracks && dnd.activeDragWagonTracks.length > 0 ? <MixerWagonGhost tracks={dnd.activeDragWagonTracks} lang={lang} /> : null}
        </DragOverlay>
      </DndContext>
      <MixerAddChannel isActive={isActive} />
    </div>
  );
};
