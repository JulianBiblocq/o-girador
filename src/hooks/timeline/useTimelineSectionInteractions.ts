import React, { useState, useEffect, useRef } from 'react';
import { SongSection, Language } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';

export interface UseTimelineSectionInteractionsOptions {
  totalMeasures: number;
  measureWidth: number;
  songSections: SongSection[];
  snapMode: 'measure' | 'beat' | 'none';
  headerWidth: number;
  lang: Language;
  copiedSection: any;
  onPasteSection: (mIdx: number) => void;
  onCreateSection: (name: string, start: number, end: number, color: string, repeat: number, level: number) => void;
  onUpdateSection: (id: string, name: string, start: number, end: number, color: string, level: number) => void;
  toolMode?: 'cursor' | 'hand';
  isSpacePressed?: boolean;
}

export function useTimelineSectionInteractions({
  totalMeasures, measureWidth, songSections, snapMode, headerWidth, lang,
  copiedSection, onPasteSection, onCreateSection, onUpdateSection,
  toolMode = 'cursor', isSpacePressed = false,
}: UseTimelineSectionInteractionsOptions) {
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const [dragStartMeasure, setDragStartMeasure] = useState<number | null>(null);
  const [dragCurrentMeasure, setDragCurrentMeasure] = useState<number | null>(null);
  const [quickSectionRange, setQuickSectionRange] = useState<{ start: number; end: number } | null>(null);
  const [quickSectionName, setQuickSectionName] = useState('');
  const [quickSectionColor, setQuickSectionColor] = useState('#f19066');
  const [quickSectionLevel, setQuickSectionLevel] = useState(0);
  const [snapGuideX, setSnapGuideX] = useState<number | null>(null);
  const dragAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => { dragAbortControllerRef.current?.abort(); }, []);

  useEffect(() => {
    const onUp = () => {
      if (isDraggingRange && dragStartMeasure !== null && dragCurrentMeasure !== null) {
        setQuickSectionRange({ start: Math.min(dragStartMeasure, dragCurrentMeasure), end: Math.max(dragStartMeasure, dragCurrentMeasure) });
        setQuickSectionName(lang === 'fr' ? `Partie ${String.fromCharCode(65 + songSections.length)}` : `Parte ${String.fromCharCode(65 + songSections.length)}`);
        setQuickSectionColor('#f19066');
        setQuickSectionLevel(0);
      }
      setIsDraggingRange(false);
      setDragStartMeasure(null);
      setDragCurrentMeasure(null);
    };
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [isDraggingRange, dragStartMeasure, dragCurrentMeasure, lang, songSections.length]);

  const handleEmptySlotPointerDown = (e: React.PointerEvent, mIdx: number) => {
    if (e.button !== 0) return;
    if (useSequencerStore.getState().copiedSection || copiedSection) {
      e.stopPropagation(); onPasteSection(mIdx); return;
    }
    setIsDraggingRange(true);
    setDragStartMeasure(mIdx);
    setDragCurrentMeasure(mIdx);
    setQuickSectionRange(null);
  };

  const handleEmptySlotPointerEnter = (mIdx: number) => {
    if (isDraggingRange && dragStartMeasure !== null) setDragCurrentMeasure(mIdx);
  };

  const handlePlusClick = (mIdx: number) => {
    if (useSequencerStore.getState().copiedSection || copiedSection) {
      onPasteSection(mIdx); return;
    }
    setQuickSectionRange({ start: mIdx, end: Math.min(Math.max(64, totalMeasures) - 1, mIdx + 3) });
    setQuickSectionName(lang === 'fr' ? `Partie ${String.fromCharCode(65 + songSections.length)}` : `Parte ${String.fromCharCode(65 + songSections.length)}`);
    setQuickSectionColor('#f19066');
    setQuickSectionLevel(0);
  };

  const handleQuickSectionCreate = () => {
    if (!quickSectionRange) return;
    const name = quickSectionName.trim() || (lang === 'fr' ? 'Sans titre' : 'Sem título');
    onCreateSection(name, quickSectionRange.start, quickSectionRange.end, quickSectionColor, 1, quickSectionLevel);
    setQuickSectionRange(null);
  };

  const handleSectionBlockPointerDown = (e: React.PointerEvent<HTMLDivElement>, section: SongSection) => {
    if (toolMode === 'hand' || isSpacePressed || (e.target as HTMLElement).closest('button') || e.button !== 0) return;
    const el = e.currentTarget;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    const startX = e.clientX, startY = e.clientY, startMeasure = section.startMeasure, startLevel = section.level || 0;
    const duration = section.endMeasure - section.startMeasure;
    const maxLevel = Math.max(0, ...songSections.map(s => s.level || 0));

    const onMove = (moveEv: PointerEvent) => {
      const propStart = startMeasure + ((moveEv.clientX - startX) / measureWidth);
      const snapped = snapMode === 'measure' ? Math.round(propStart) : snapMode === 'beat' ? Math.round(propStart * 4) / 4 : propStart;
      const finalStart = Math.max(0, Math.min(totalMeasures - 1 - duration, snapped));
      el.style.left = `${finalStart * measureWidth}px`;
      const propLevel = Math.max(0, Math.min(2, startLevel + Math.round(-(moveEv.clientY - startY) / 26)));
      el.style.top = `${(maxLevel - propLevel) * 26 + 4}px`;
      setSnapGuideX(snapMode !== 'none' ? headerWidth + finalStart * measureWidth : null);
    };

    const onPointerUp = () => {
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
      dragAbortControllerRef.current?.abort();
      setSnapGuideX(null);
      const finLeft = parseFloat(el.style.left) || (section.startMeasure * measureWidth);
      const finStart = Math.max(0, Math.min(totalMeasures - 1 - duration, Math.round(finLeft / measureWidth)));
      const finTop = parseFloat(el.style.top) ?? ((maxLevel - (section.level || 0)) * 26 + 4);
      const finLevel = Math.max(0, Math.min(2, maxLevel - Math.round((finTop - 4) / 26)));
      if (finStart !== section.startMeasure || finLevel !== (section.level || 0)) {
        onUpdateSection(section.id, section.name, finStart, finStart + duration, section.color || '#eaddcf', finLevel);
      } else {
        el.style.left = `${section.startMeasure * measureWidth}px`;
        el.style.top = `${(maxLevel - (section.level || 0)) * 26 + 4}px`;
      }
    };

    dragAbortControllerRef.current?.abort();
    dragAbortControllerRef.current = new AbortController();
    window.addEventListener('pointermove', onMove, { signal: dragAbortControllerRef.current.signal });
    window.addEventListener('pointerup', onPointerUp, { signal: dragAbortControllerRef.current.signal });
    e.stopPropagation();
  };

  return {
    isDraggingRange, dragStartMeasure, dragCurrentMeasure,
    quickSectionRange, setQuickSectionRange, quickSectionName, setQuickSectionName,
    quickSectionColor, setQuickSectionColor, quickSectionLevel, setQuickSectionLevel,
    snapGuideX, setSnapGuideX, handleEmptySlotPointerDown, handleEmptySlotPointerEnter,
    handlePlusClick, handleQuickSectionCreate, handleSectionBlockPointerDown,
  };
}
