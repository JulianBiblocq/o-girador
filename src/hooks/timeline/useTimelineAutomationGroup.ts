/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useCallback } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';

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

  const isTypeMatch = (type === 'tempo' && selectedAutomationType === 'bpm') || (type === 'volume' && selectedAutomationType === 'volume');
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
    if (type === 'tempo' || type === 'volume') {
      selectAutomationMeasure(type === 'tempo' ? 'bpm' : 'volume', idx, shiftKey, trackId ?? null);
    }
    const inGroup = isPointInGroup(idx);
    isDraggingGroupRef.current = inGroup;
    dragStartPointRef.current = {
      idx,
      val: localValuesRef.current[idx] ?? (type === 'tempo' ? 100 : 75),
      snapshot: [...localValuesRef.current],
    };
    // Coalescence Undo : pushUndoState() UNE SEULE FOIS au pointerdown (0 Render Thrashing)
    useSequencerStore.getState().pushUndoState();
  }, [type, trackId, selectAutomationMeasure, isPointInGroup, localValuesRef]);

  const onPointerMove = useCallback((draggedIdx: number, rawVal: number) => {
    if (!dragStartPointRef.current) return;
    hasMovedRef.current = true;
    const roundedVal = Math.round(Math.max(min, Math.min(max, rawVal)));

    if (isDraggingGroupRef.current && selectedAutomationRange) {
      const delta = roundedVal - dragStartPointRef.current.val;
      const start = Math.min(selectedAutomationRange.start, selectedAutomationRange.end);
      const end = Math.max(selectedAutomationRange.start, selectedAutomationRange.end);
      const snapshot = dragStartPointRef.current.snapshot;

      for (let i = start; i <= end; i++) {
        const baseVal = snapshot[i] !== undefined ? snapshot[i] : (type === 'tempo' ? 100 : 75);
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
      const store = useSequencerStore.getState();

      if (type === 'tempo') {
        const nextBpms = [...store.measureBpms];
        while (nextBpms.length < totalMeasures) nextBpms.push(store.bpm || 83);
        for (let i = start; i <= end; i++) nextBpms[i] = localValuesRef.current[i];
        useSequencerStore.setState({
          measureBpms: nextBpms,
          bpm: start === 0 ? nextBpms[0] : store.bpm,
          tracksVersion: store.tracksVersion + 1,
        });
      } else if (type === 'volume') {
        if (trackId === null || trackId === undefined) {
          const nextVols = [...store.measureVols];
          while (nextVols.length < totalMeasures) nextVols.push(100);
          for (let i = start; i <= end; i++) nextVols[i] = localValuesRef.current[i];
          useSequencerStore.setState({ measureVols: nextVols, tracksVersion: store.tracksVersion + 1 });
        } else {
          const nextTracks = store.tracks.map(t => {
            if (t.id !== trackId) return t;
            const tVols = [...(t.measureVols || [])];
            while (tVols.length < totalMeasures) tVols.push(t.volumeVal ?? 75);
            for (let i = start; i <= end; i++) tVols[i] = localValuesRef.current[i];
            return { ...t, measureVols: tVols };
          });
          useSequencerStore.setState({ tracks: nextTracks, tracksVersion: store.tracksVersion + 1 });
        }
      }
    } else {
      onChangeValue(draggedIdx, localValuesRef.current[draggedIdx]);
    }
  }, [type, trackId, totalMeasures, selectedAutomationRange, localValuesRef, onChangeValue]);

  return { isSelectedTrack, isPointInGroup, onPointerDown, onPointerMove, onPointerUp };
}
