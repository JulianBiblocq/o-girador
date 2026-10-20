import React, { useState, useRef, useEffect } from 'react';
import { SongSection } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { checkSectionStretchCollision, executeSectionStretch } from '../../utils/timeline/sectionStretchResolver';
import { getSectionBounds } from '../../utils/timeline/timelineMeasureWidths';

export interface UseTimelineSectionStretchOptions {
  measureWidth: number;
  measureWidths: number[];
  measureLeftPositions: number[];
  isPlaying: boolean;
  handleStop: () => void;
}

export function useTimelineSectionStretch({
  measureWidth, measureWidths, measureLeftPositions, isPlaying, handleStop,
}: UseTimelineSectionStretchOptions) {
  const [stretchConflict, setStretchConflict] = useState<{
    isOpen: boolean; section: SongSection | null; targetRange: { start: number; end: number } | null;
  }>({ isOpen: false, section: null, targetRange: null });

  const dragAbortControllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => { dragAbortControllerRef.current?.abort(); }, []);

  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    section: SongSection,
    edge: 'left' | 'right'
  ) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const el = e.currentTarget.parentElement as HTMLDivElement;
    if (!el) return;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}

    const startX = e.clientX, startMeasure = section.startMeasure, endMeasure = section.endMeasure;
    const sectionLength = endMeasure - startMeasure + 1;
    let currentCopies = 0;
    let ghost: HTMLDivElement | null = null;

    if (edge === 'right') {
      ghost = document.createElement('div');
      ghost.style.position = 'absolute';
      ghost.style.top = el.style.top;
      ghost.style.height = el.style.height;
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '50';
      ghost.style.display = 'flex';
      ghost.style.left = `${measureLeftPositions[endMeasure + 1] ?? ((endMeasure + 1) * measureWidth)}px`;
      el.parentElement?.appendChild(ghost);
    }

    const onMove = (moveEv: PointerEvent) => {
      currentCopies = Math.max(0, Math.round(((moveEv.clientX - startX) / measureWidth) / sectionLength));
      if (ghost) {
        ghost.innerHTML = '';
        const secW = getSectionBounds(startMeasure, endMeasure, measureLeftPositions, measureWidths).width;
        for (let i = 0; i < currentCopies; i++) {
          const block = document.createElement('div');
          block.style.width = `${Math.max(16, secW - 8)}px`;
          block.style.height = '100%';
          block.style.backgroundColor = section.color || '#eaddcf';
          block.style.opacity = '0.5';
          block.style.borderRadius = '0.25rem';
          block.style.border = '1.5px solid #1a1a1a';
          block.style.marginRight = '8px';
          ghost.appendChild(block);
        }
      }
    };

    const onUp = () => {
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
      dragAbortControllerRef.current?.abort();
      if (ghost?.parentElement) ghost.parentElement.removeChild(ghost);

      if (currentCopies > 0) {
        if (isPlaying) handleStop();
        const { hasCollision, targetRange } = checkSectionStretchCollision(section, currentCopies, useSequencerStore.getState().tracks);
        if (hasCollision) setStretchConflict({ isOpen: true, section, targetRange });
        else executeSectionStretch(section.id, targetRange.end, 'overwrite');
      }
    };

    dragAbortControllerRef.current?.abort();
    dragAbortControllerRef.current = new AbortController();
    const { signal } = dragAbortControllerRef.current;
    window.addEventListener('pointermove', onMove, { signal });
    window.addEventListener('pointerup', onUp, { signal });
  };

  const handleConfirmStretchInsert = () => {
    if (!stretchConflict.section || !stretchConflict.targetRange) return;
    executeSectionStretch(stretchConflict.section.id, stretchConflict.targetRange.end, 'insert');
    setStretchConflict({ isOpen: false, section: null, targetRange: null });
  };

  const handleConfirmStretchOverwrite = () => {
    if (!stretchConflict.section || !stretchConflict.targetRange) return;
    executeSectionStretch(stretchConflict.section.id, stretchConflict.targetRange.end, 'overwrite');
    setStretchConflict({ isOpen: false, section: null, targetRange: null });
  };

  const handleCancelStretchConflict = () => {
    setStretchConflict({ isOpen: false, section: null, targetRange: null });
  };

  return {
    stretchConflict, handleResizePointerDown,
    handleConfirmStretchInsert, handleConfirmStretchOverwrite, handleCancelStretchConflict,
  };
}
