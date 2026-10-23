
import { useRef, useCallback } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { commitGroupedAutomationValues } from './timelineGroupCommitHelper';

export interface UseTimelineAutomationGroupParams {
  type: 'tempo' | 'volume' | 'pan' | 'reverb';
  trackId: number | null;
  min: number;
  max: number;
  totalMeasures: number;
  localValuesRef: React.MutableRefObject<number[]>;
  renderSvg: () => void;
  onChangeValue: (mIdx: number, val: number) => void;
}

export function useTimelineAutomationGroup({
  type,
  trackId,
  min,
  max,
  totalMeasures,
  localValuesRef,
  renderSvg,
  onChangeValue,
}: UseTimelineAutomationGroupParams) {
  const isDraggingGroupRef = useRef(false);
  const dragStartPointRef = useRef<{ idx: number; val: number; snapshot: number[] } | null>(null);
  const hasMovedRef = useRef(false);

  const selectedAutomationType = useSequencerStore(s => s.selectedAutomationType);
  const selectedAutomationTrackId = useSequencerStore(s => s.selectedAutomationTrackId);
  const selectedAutomationRange = useSequencerStore(s => s.selectedAutomationRange);
  const selectAutomationMeasure = useSequencerStore(s => s.selectAutomationMeasure);

  const mappedType = type === 'tempo' ? 'bpm' : type;
  const isTypeMatch = selectedAutomationType === mappedType;
  const isTrackMatch = (trackId ?? null) === (selectedAutomationTrackId ?? null);
  const isSelectedTrack = Boolean(isTypeMatch && isTrackMatch && selectedAutomationRange);

  const isPointInGroup = useCallback((idx: number) => {
    if (!isSelectedTrack || !selectedAutomationRange) return false;
    const start = Math.min(selectedAutomationRange.start, selectedAutomationRange.end);
    const end = Math.max(selectedAutomationRange.start, selectedAutomationRange.end);
    return idx >= start && idx <= end;
  }, [isSelectedTrack, selectedAutomationRange]);

  const onPointerDown = useCallback((idx: number, shiftKey: boolean) => {
    hasMovedRef.current = false;
    selectAutomationMeasure(mappedType, idx, shiftKey, trackId ?? null);
    const inGroup = isPointInGroup(idx);
    isDraggingGroupRef.current = inGroup;
    const fallbackDefault = type === 'tempo' ? 100 : type === 'volume' ? 75 : 0;
    dragStartPointRef.current = {
      idx,
      val: localValuesRef.current[idx] ?? fallbackDefault,
      snapshot: [...localValuesRef.current],
    };
    useSequencerStore.getState().pushUndoState();
  }, [mappedType, trackId, selectAutomationMeasure, isPointInGroup, localValuesRef, type]);

  const onPointerMove = useCallback((draggedIdx: number, rawVal: number) => {
    if (!dragStartPointRef.current) return;
    hasMovedRef.current = true;
    const roundedVal = Math.round(Math.max(min, Math.min(max, rawVal)));

    if (isDraggingGroupRef.current && selectedAutomationRange) {
      const delta = roundedVal - dragStartPointRef.current.val;
      const start = Math.min(selectedAutomationRange.start, selectedAutomationRange.end);
      const end = Math.max(selectedAutomationRange.start, selectedAutomationRange.end);
      const snapshot = dragStartPointRef.current.snapshot;
      const fallbackDefault = type === 'tempo' ? 100 : type === 'volume' ? 75 : 0;

      for (let i = start; i <= end; i++) {
        const baseVal = snapshot[i] !== undefined ? snapshot[i] : fallbackDefault;
        localValuesRef.current[i] = Math.round(Math.max(min, Math.min(max, baseVal + delta)));
      }
      renderSvg();
    } else {
      if (localValuesRef.current[draggedIdx] !== roundedVal) {
        localValuesRef.current[draggedIdx] = roundedVal;
        renderSvg();
      }
    }
  }, [min, max, type, selectedAutomationRange, localValuesRef, renderSvg]);

  const onPointerUp = useCallback((draggedIdx: number) => {
    const startPoint = dragStartPointRef.current;
    dragStartPointRef.current = null;
    const wasGroup = isDraggingGroupRef.current;
    isDraggingGroupRef.current = false;

    if (!hasMovedRef.current || !startPoint) return;
    hasMovedRef.current = false;

    if (wasGroup && selectedAutomationRange) {
      const start = Math.min(selectedAutomationRange.start, selectedAutomationRange.end);
      const end = Math.max(selectedAutomationRange.start, selectedAutomationRange.end);
      commitGroupedAutomationValues(type, trackId ?? null, totalMeasures, start, end, localValuesRef.current);
    } else {
      onChangeValue(draggedIdx, localValuesRef.current[draggedIdx]);
    }
  }, [type, trackId, totalMeasures, selectedAutomationRange, localValuesRef, onChangeValue]);

  return { isSelectedTrack, isPointInGroup, onPointerDown, onPointerMove, onPointerUp };
}
