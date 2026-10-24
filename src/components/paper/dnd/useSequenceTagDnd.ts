/**
 * Hook de gestion du glisser-deposer pour la palette et la sequence (< 95 lignes).
 */
import { useState } from 'react';
import { DragStartEvent, DragOverEvent, DragEndEvent, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { PaperSequenceItem } from '../../../types/paperWorkshop.types';

export interface ActiveDragInfo {
  type: 'palette' | 'sequence';
  secName: string;
  secId?: string;
  item?: PaperSequenceItem;
  index?: number;
}

export function useSequenceTagDnd(
  sequenceItems: PaperSequenceItem[],
  onChangeSequence: (items: PaperSequenceItem[]) => void
) {
  const [activeDrag, setActiveDrag] = useState<ActiveDragInfo | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as any;
    if (data?.type === 'palette') {
      setActiveDrag({ type: 'palette', secName: data.secName, secId: data.secId });
    } else if (data?.type === 'sequence-item') {
      setActiveDrag({ type: 'sequence', secName: data.item.sectionName, item: data.item, index: data.index });
    }
  };

  const handleDragOver = (e: DragOverEvent) => {
    if (!e.over) { setOverIndex(null); return; }
    if (e.over.id === 'sequence-container-dropzone') {
      setOverIndex(sequenceItems.length);
      return;
    }
    const overData = e.over.data.current as any;
    if (overData?.type === 'sequence-item') {
      setOverIndex(overData.index);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const currentDrag = activeDrag;
    const targetIdx = overIndex;
    setActiveDrag(null);
    setOverIndex(null);

    if (!currentDrag) return;

    if (currentDrag.type === 'palette') {
      const insertAt = targetIdx !== null && targetIdx >= 0 && targetIdx <= sequenceItems.length
        ? targetIdx
        : sequenceItems.length;
      const newItem: PaperSequenceItem = {
        id: `tag-${Date.now()}-${Math.random()}`,
        sectionName: currentDrag.secName,
        repeatCount: 1,
        ...(currentDrag.secId ? { sectionId: currentDrag.secId } : {}),
      } as any;
      const next = [...sequenceItems];
      next.splice(insertAt, 0, newItem);
      onChangeSequence(next);
      return;
    }

    if (currentDrag.type === 'sequence' && e.over) {
      const activeId = e.active.id;
      const overId = e.over.id;
      const oldIndex = sequenceItems.findIndex((it) => it.id === activeId);
      if (oldIndex < 0) return;

      const newIndex = overId === 'sequence-container-dropzone'
        ? sequenceItems.length - 1
        : sequenceItems.findIndex((it) => it.id === overId);

      if (newIndex >= 0 && oldIndex !== newIndex) {
        onChangeSequence(arrayMove(sequenceItems, oldIndex, newIndex));
      }
    }
  };

  const handleDragCancel = () => {
    setActiveDrag(null);
    setOverIndex(null);
  };

  return {
    sensors,
    activeDrag,
    overIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
