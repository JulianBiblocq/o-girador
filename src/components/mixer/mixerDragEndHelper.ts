import { DragEndEvent } from '@dnd-kit/core';
import { useSequencerStore } from '../../stores/useSequencerStore';

export function executeMixerDragEnd(
  event: DragEndEvent,
  activeGroupIds: number[],
  onReorderPatternsDnd?: (trackId: number, oldIndex: number, newIndex: number) => void,
  handleReorderMixerTracks?: (sourceId: number, targetId: number, dropSide?: 'left' | 'right') => void,
  handleReorderTracksDnd?: (sourceId: number, targetId: number, dropSide?: 'left' | 'right') => void
) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const activeId = String(active.id);
  const overId = String(over.id);

  if (activeId.startsWith('pattern-') && overId.startsWith('pattern-')) {
    const activePatternId = Number(activeId.replace('pattern-', ''));
    const overPatternId = Number(overId.replace('pattern-', ''));
    const track = useSequencerStore.getState().tracks.find(t => t.patterns.some(p => p.id === activePatternId));
    if (track && onReorderPatternsDnd) {
      const oldIndex = track.patterns.findIndex(p => p.id === activePatternId);
      const newIndex = track.patterns.findIndex(p => p.id === overPatternId);
      onReorderPatternsDnd(track.id, oldIndex, newIndex);
    }
  } else if (activeId.startsWith('track-') && overId.startsWith('track-')) {
    const activeTrackId = Number(activeId.replace('track-', ''));
    const overTrackId = Number(overId.replace('track-', ''));
    if (activeGroupIds.length > 1) {
      useSequencerStore.getState().handleReorderWagon(activeGroupIds, overTrackId);
    } else {
      const activeTranslated = active.rect?.current?.translated;
      const overRect = over.rect;
      let dropSide: 'left' | 'right' = 'right';
      if (activeTranslated && overRect) {
        const activeCenter = activeTranslated.left + activeTranslated.width / 2;
        const overCenter = overRect.left + overRect.width / 2;
        dropSide = activeCenter < overCenter ? 'left' : 'right';
      }
      const reorderFn = handleReorderMixerTracks || handleReorderTracksDnd;
      if (reorderFn) reorderFn(activeTrackId, overTrackId, dropSide);
    }
  }
}
