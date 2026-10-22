/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensors,
  useSensor,
  DragEndEvent,
  TouchSensor,
  pointerWithin,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TrackMixer } from '../TrackMixer';
import { useSequencerStore, selectTracksMeta } from '../../stores/useSequencerStore';

interface MixerTrackListProps {
  trackIds: string[];
  trackIdsNumbers: number[];
  isActive?: boolean;
  isMobile?: boolean;
  onOpenDetailEditor: (id: number) => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number | [string, string],
    onSelect: (val: string | number | [string, string], merge?: boolean) => void,
    trackId?: number,
    isSplit?: boolean
  ) => void;
}

export const MixerTrackList: React.FC<MixerTrackListProps> = ({
  trackIds,
  trackIdsNumbers,
  isActive = true,
  isMobile = false,
  onOpenDetailEditor,
  onStepTouchStart,
}) => {
  const tracks = useSequencerStore(selectTracksMeta);
  const handleReorderRodaTracks = useSequencerStore(state => state.handleReorderRodaTracks);

  const [activeDragTrackId, setActiveDragTrackId] = useState<number | null>(null);
  const [overDragTrackId, setOverDragTrackId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragStart = (event: any) => {
    const activeId = String(event.active.id);
    if (activeId.startsWith('track-')) setActiveDragTrackId(Number(activeId.replace('track-', '')));
  };

  const handleDragOver = (event: any) => {
    const overId = event.over ? String(event.over.id) : null;
    if (overId && overId.startsWith('track-')) setOverDragTrackId(Number(overId.replace('track-', '')));
    else setOverDragTrackId(null);
  };

  const handleDragCancel = () => {
    setActiveDragTrackId(null);
    setOverDragTrackId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragTrackId(null);
    setOverDragTrackId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId.startsWith('track-') && overId.startsWith('track-')) {
        handleReorderRodaTracks(Number(activeId.replace('track-', '')), Number(overId.replace('track-', '')));
      }
    }
  };

  return (
    <div id="mixer-section" className="flex-grow overflow-y-auto pr-1 relative z-[1]">
      <div id="tracks-mixer-container" className="flex flex-col gap-[5px] py-1.5 px-2">
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={trackIds} strategy={verticalListSortingStrategy}>
            {trackIdsNumbers.map((trackId, idx) => {
              const track = tracks.find(t => t.id === trackId);
              const isDragOverBus = activeDragTrackId !== null &&
                overDragTrackId === trackId &&
                activeDragTrackId !== trackId &&
                track?.isBusFolder &&
                !tracks.find(t => t.id === activeDragTrackId)?.isBusFolder;

              let dropIndicator: 'top' | 'bottom' | null = null;
              if (activeDragTrackId !== null && overDragTrackId === trackId && activeDragTrackId !== trackId) {
                const activeTrack = tracks.find(t => t.id === activeDragTrackId);
                const isRouting = track?.isBusFolder && activeTrack && !activeTrack.isBusFolder && activeTrack.busId !== String(trackId);
                if (!isRouting) {
                  const activeIdx = trackIdsNumbers.indexOf(activeDragTrackId);
                  const overIdx = trackIdsNumbers.indexOf(trackId);
                  if (activeIdx !== -1 && overIdx !== -1) {
                    dropIndicator = activeIdx < overIdx ? 'bottom' : 'top';
                  }
                }
              }

              return (
                <TrackMixer
                  key={trackId}
                  trackId={trackId}
                  index={idx}
                  totalTracks={trackIdsNumbers.length}
                  onOpenDetailEditor={onOpenDetailEditor}
                  isActive={isActive}
                  isDragOver={isDragOverBus}
                  dropIndicator={dropIndicator}
                  isMobile={isMobile}
                  onStepTouchStart={onStepTouchStart}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};
