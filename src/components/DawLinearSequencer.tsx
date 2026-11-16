import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useLiveMeasure } from '../hooks/useLiveMeasure';
import { useSequencer } from '../contexts/SequencerContext';
import { DawTrackRow } from './DawTrackRow';
import { useDawPlayhead } from './daw/useDawPlayhead';
import { useDawVisibleTracks } from './daw/useDawVisibleTracks';
import { DawRulerHeader } from './daw/DawRulerHeader';
import { StrokeInfoPopover } from './pedagogy/StrokeInfoPopover';
import { StrokeInfoPopoverTarget } from './pedagogy/strokeInfoTypes';

interface DawLinearSequencerProps {
  isActive: boolean;
  mestreSignals?: any[];
}

const getBeatsFromTimeSig = (sig: string): number => {
  if (sig === '3/4') return 3;
  if (sig === '2/4' || sig === '6/8') return 2;
  if (sig === '12/8') return 4;
  return parseInt(sig?.split('/')[0], 10) || 4;
};

export const DawLinearSequencer: React.FC<DawLinearSequencerProps> = ({ isActive }) => {
  const sequencer = useSequencer();
  const lang = useSequencerStore((state) => state.lang);
  const isLeftHanded = useSequencerStore((state) => state.isLeftHanded);
  const currentMeasure = useLiveMeasure(isActive);
  const timeSig = useSequencerStore((state) => state.timeSig);
  const measureTimeSigs = useSequencerStore((state) => state.measureTimeSigs);
  const handleReorderRodaTracks = useSequencerStore((state) => state.handleReorderRodaTracks);
  const [pedagogyTarget, setPedagogyTarget] = useState<StrokeInfoPopoverTarget | null>(null);

  useEffect(() => { if (!isActive) setPedagogyTarget(null); }, [isActive]);

  const activeTimeSig = (measureTimeSigs && measureTimeSigs[currentMeasure]) || timeSig;
  const defaultBeats = getBeatsFromTimeSig(activeTimeSig);

  const { tracks, visibleTracks, sortableTrackIds, visibleTrackIds } = useDawVisibleTracks();
  const { registerStepRef, trackResolutionsRef } = useDawPlayhead(isActive, visibleTrackIds);

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

  if (!isActive) return null;

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="flex-grow flex flex-col justify-start bg-[var(--cordel-bg)] text-[var(--cordel-text)] select-none w-full h-full overflow-x-auto overflow-y-auto custom-scrollbar relative"
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      <div
        className="absolute inset-0 pointer-events-none z-0 wallpaper-surface-bg"
        style={{ width: 'max(100%, 1240px)', minHeight: '100%', transform: 'translateZ(0)' }}
      />

      <div className="min-w-[1240px] p-5 flex flex-col justify-start h-full relative z-[1]">
        <DawRulerHeader defaultBeats={defaultBeats} lang={lang} />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortableTrackIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-[5px] py-1.5 flex-grow">
              {visibleTracks.map((track, trackIdx) => (
                <DawTrackRow
                  key={track.id}
                  track={track}
                  trackIdx={trackIdx}
                  tracks={tracks}
                  currentMeasure={currentMeasure}
                  defaultBeats={defaultBeats}
                  lang={lang}
                  isLeftHanded={isLeftHanded}
                  sequencer={sequencer}
                  onSelectPedagogyTarget={setPedagogyTarget}
                  registerStepRef={registerStepRef}
                  trackResolutionsRef={trackResolutionsRef}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      <StrokeInfoPopover target={pedagogyTarget} onClose={() => setPedagogyTarget(null)} />
    </div>
  );
};
