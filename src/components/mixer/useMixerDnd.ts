import { useRef, useState, useCallback } from 'react';
import { PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragMoveEvent } from '@dnd-kit/core';
import { TrackGroup } from '../../types';
import { useSequencerStore, TrackMeta } from '../../stores/useSequencerStore';
import { createMixerCollisionDetection } from './customMixerCollision';
import { executeMixerDragEnd } from './mixerDragEndHelper';
import { resolveMixerDragWagon } from './mixerHierarchyHelpers';

interface UseMixerDndProps {
  tracksMeta: TrackMeta[];
  displayedTracks: TrackMeta[];
  handleReorderMixerTracks?: (sourceId: number, targetId: number, dropSide?: 'left' | 'right') => void;
  handleReorderTracksDnd?: (sourceId: number, targetId: number, dropSide?: 'left' | 'right') => void;
  onReorderPatternsDnd?: (trackId: number, oldIndex: number, newIndex: number) => void;
}

export function useMixerDnd({
  tracksMeta,
  displayedTracks,
  handleReorderMixerTracks,
  handleReorderTracksDnd,
  onReorderPatternsDnd,
}: UseMixerDndProps) {
  const [activeDragTrackId, setActiveDragTrackId] = useState<number | null>(null);
  const [activeDragWagonTracks, setActiveDragWagonTracks] = useState<TrackGroup[] | null>(null);
  const [overDragTrackId, setOverDragTrackId] = useState<number | null>(null);
  const [overDropSide, setOverDropSide] = useState<'left' | 'right' | null>(null);

  const activeGroupTrackIdsRef = useRef<number[]>([]);
  const activeDragGroupElementsRef = useRef<HTMLElement[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const cleanupGroupDrag = useCallback(() => {
    activeDragGroupElementsRef.current.forEach(el => {
      el.classList.remove('mixer-strip-lifted');
      el.style.transform = '';
      el.style.transition = '';
      el.style.zIndex = '';
    });
    activeDragGroupElementsRef.current = [];
    activeGroupTrackIdsRef.current = [];
    setActiveDragWagonTracks(null);
  }, []);

  const handleDragStart = useCallback((event: any) => {
    const activeId = String(event.active.id);
    if (!activeId.startsWith('track-')) return;
    const activeTrackId = Number(activeId.replace('track-', ''));
    setActiveDragTrackId(activeTrackId);

    const currentFullTracks = useSequencerStore.getState().tracks;
    const { blockTrackIds, wagonTracks } = resolveMixerDragWagon(
      activeTrackId,
      tracksMeta,
      displayedTracks,
      currentFullTracks
    );
    activeGroupTrackIdsRef.current = blockTrackIds;
    setActiveDragWagonTracks(wagonTracks);
  }, [tracksMeta, displayedTracks]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const activeTranslated = event.active?.rect?.current?.translated;
    const overRect = event.over?.rect;
    if (activeTranslated && overRect) {
      const activeCenter = activeTranslated.left + activeTranslated.width / 2;
      const overCenter = overRect.left + overRect.width / 2;
      setOverDropSide(activeCenter < overCenter ? 'left' : 'right');
    }
  }, []);

  const customCollisionDetection = useCallback(
    createMixerCollisionDetection(activeGroupTrackIdsRef, tracksMeta, displayedTracks),
    [tracksMeta, displayedTracks]
  );

  const handleDragOver = useCallback((event: any) => {
    const overId = event.over ? String(event.over.id) : null;
    setOverDragTrackId(overId && overId.startsWith('track-') ? Number(overId.replace('track-', '')) : null);

    const activeTranslated = event.active?.rect?.current?.translated;
    const overRect = event.over?.rect;
    if (activeTranslated && overRect) {
      const activeCenter = activeTranslated.left + activeTranslated.width / 2;
      const overCenter = overRect.left + overRect.width / 2;
      setOverDropSide(activeCenter < overCenter ? 'left' : 'right');
    } else {
      setOverDropSide(null);
    }
  }, []);

  const handleDragCancel = useCallback(() => {
    cleanupGroupDrag();
    setActiveDragTrackId(null);
    setOverDragTrackId(null);
    setOverDropSide(null);
    setActiveDragWagonTracks(null);
  }, [cleanupGroupDrag]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const activeGroupIds = [...activeGroupTrackIdsRef.current];
    cleanupGroupDrag();
    setActiveDragTrackId(null);
    setOverDragTrackId(null);
    setOverDropSide(null);
    setActiveDragWagonTracks(null);

    executeMixerDragEnd(event, activeGroupIds, onReorderPatternsDnd, handleReorderMixerTracks, handleReorderTracksDnd);
  }, [cleanupGroupDrag, onReorderPatternsDnd, handleReorderMixerTracks, handleReorderTracksDnd]);

  return {
    sensors,
    activeDragTrackId,
    activeDragWagonTracks,
    overDragTrackId,
    overDropSide,
    activeGroupTrackIdsRef,
    handleDragStart,
    handleDragMove,
    handleDragOver,
    handleDragCancel,
    handleDragEnd,
    customCollisionDetection,
  };
}
