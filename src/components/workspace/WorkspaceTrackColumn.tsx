/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  DndContext,
  PointerSensor,
  useSensors,
  useSensor,
  DragEndEvent,
  TouchSensor,
  pointerWithin,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TrackGroup } from '../../types';
import { i18n } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { MixerHeader } from '../mixer/MixerHeader';
import { WorkspaceTrackCard } from './WorkspaceTrackCard';

interface WorkspaceTrackColumnProps {
  tracks: TrackGroup[];
  isPistasOpen: boolean;
  onOpenDetailEditor: (id: number) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

const SortableTrackItem: React.FC<{
  track: TrackGroup;
  index: number;
  tracks: TrackGroup[];
  isPistasOpen: boolean;
  onOpenDetailEditor: (id: number) => void;
}> = ({ track, index, tracks, isPistasOpen, onOpenDetailEditor }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `track-${track.id}`,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <WorkspaceTrackCard
        track={track}
        index={index}
        tracks={tracks}
        isPistasOpen={isPistasOpen}
        onOpenDetailEditor={onOpenDetailEditor}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
};

export const WorkspaceTrackColumn: React.FC<WorkspaceTrackColumnProps> = ({
  tracks,
  isPistasOpen,
  onOpenDetailEditor,
  scrollRef,
  onScroll,
}) => {
  const lang = useSequencerStore(state => state.lang);
  const t = (key: string) => (i18n[lang as 'pt' | 'fr'] as any)?.[key] || key;
  const handleReorderRodaTracks = useSequencerStore(state => state.handleReorderRodaTracks);
  const trackIds = React.useMemo(() => tracks.map(t => `track-${t.id}`), [tracks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
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
    <div
      className="w-[290px] min-w-[290px] max-w-[290px] shrink-0 h-full flex flex-col relative z-20 bg-[#181411] border-r-2 border-[#1a1a1a] select-none overflow-hidden"
    >
      {/* Fond texturé d'origine (papier peint sombre) sur 100% de la hauteur */}
      <div
        className="absolute inset-0 pointer-events-none z-0 wallpaper-surface-bg !bg-[#f4ecd8] !opacity-[0.16]"
        style={{ transform: 'translateZ(0)' }}
      />

      {/* En-tête interne h-[52px] */}
      <div className="h-[52px] min-h-[52px] max-h-[52px] px-2 flex items-center shrink-0 border-b border-[var(--cordel-border,#1a1a1a)]/40 relative z-10">
        <MixerHeader t={t} noBorder={true} className="w-full" />
      </div>

      {/* Liste des pistes défilante avec gap-[5px] et padding py-1.5 px-2 */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto no-scrollbar relative z-10 flex flex-col gap-[5px] py-1.5 px-2"
      >
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
          <SortableContext items={trackIds} strategy={verticalListSortingStrategy}>
            {tracks.map((track, idx) => (
              <SortableTrackItem
                key={track.id}
                track={track}
                index={idx}
                tracks={tracks}
                isPistasOpen={isPistasOpen}
                onOpenDetailEditor={onOpenDetailEditor}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};
