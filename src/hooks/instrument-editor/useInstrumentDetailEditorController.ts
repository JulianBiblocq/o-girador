import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useWindow } from '../../contexts/WindowContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { instrumentsConfig } from '../../data';
import { Pattern, Track } from '../../types';

export function resolveDeepLinkPatternId(rawId: number | string | null | undefined, patterns: Pattern[]): number | undefined {
  if (rawId === undefined || rawId === null) return undefined;
  const match = patterns.find((p) => p.id === rawId || String(p.id) === String(rawId));
  if (match) return match.id;
  const asNum = typeof rawId === 'number' ? rawId : Number(rawId);
  return Number.isFinite(asNum) ? asNum : undefined;
}

export function resolveActiveVocalChild(
  track: Track | undefined, isToada: boolean, familyTracks: Track[],
  deepLinkPatternId: number | string | null | undefined, currentMeasure: number
): Track | undefined {
  if (!track || !isToada) return undefined;
  const pux = familyTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coro = familyTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
  const { selectedVocalPatternId: gId, selectedVocalTrackId: gTrackId } = useAudioStore.getState();
  const hasDlPtn = deepLinkPatternId !== undefined && deepLinkPatternId !== null;
  const targetPtnId = hasDlPtn ? deepLinkPatternId : gId;
  if (!hasDlPtn && gTrackId !== null && gTrackId !== undefined) {
    if (pux && String(pux.id) === String(gTrackId)) return pux;
    if (coro && String(coro.id) === String(gTrackId)) return coro;
  }
  if (targetPtnId !== null && targetPtnId !== undefined) {
    const puxHas = Boolean(pux?.patterns?.some((p) => String(p.id) === String(targetPtnId)));
    const coroHas = Boolean(coro?.patterns?.some((p) => String(p.id) === String(targetPtnId)));
    if (puxHas && coroHas) return coro?.patterns?.find((p) => String(p.id) === String(targetPtnId) && p.measureAssignments?.[currentMeasure]) ? coro : pux;
    if (puxHas) return pux;
    if (coroHas) return coro;
  }
  return coro?.patterns?.find((p) => p.measureAssignments?.[currentMeasure]) ? coro : pux;
}

export function useInstrumentDetailEditorController(onClose: () => void, isMobile = false, isDetached = false) {
  const hostWin = useWindow();
  const isClosing = false;
  const handleClose = useCallback(() => { onClose(); }, [onClose]);

  const [isMaximized, setIsMaximized] = useState(false);
  const toggleMaximized = useCallback(() => setIsMaximized((prev) => !prev), []);
  const [isWideViewport, setIsWideViewport] = useState<boolean>(() => Boolean(hostWin && hostWin.innerWidth >= 1280));

  useEffect(() => {
    if (!hostWin?.matchMedia) return;
    const mq = hostWin.matchMedia('(min-width: 1280px)');
    setIsWideViewport(mq.matches);
    const onChange = (ev: MediaQueryListEvent) => setIsWideViewport(ev.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [hostWin]);

  const isExpandedLayout = (isMaximized || isDetached) && isWideViewport;

  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setMouseDownOnBackdrop(true);
  }, []);
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (mouseDownOnBackdrop && e.target === e.currentTarget) handleClose();
    setMouseDownOnBackdrop(false);
  }, [mouseDownOnBackdrop, handleClose]);

  const [contextMenuPos, setContextMenuPos] = useState<{ trackId: number; x: number; y: number } | null>(null);
  const handleOpenContextMenu = useCallback((cTrackId: number, x: number, y: number) => {
    setContextMenuPos({ trackId: cTrackId, x: x, y: y });
  }, []);
  const handleCloseContextMenu = useCallback(() => { setContextMenuPos(null); }, []);

  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [addPickerAnchorRect, setAddPickerAnchorRect] = useState<DOMRect | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const handleToggleAddPicker = useCallback(() => {
    if (!isAddPickerOpen && addBtnRef.current) {
      setAddPickerAnchorRect(addBtnRef.current.getBoundingClientRect());
      setIsAddPickerOpen(true);
    } else {
      setIsAddPickerOpen(false);
    }
  }, [isAddPickerOpen]);
  const handleCloseAddPicker = useCallback(() => { setIsAddPickerOpen(false); }, []);

  const [patternCardContextMenu, setPatternCardContextMenu] = useState<{ pattern: Pattern; x: number; y: number } | null>(null);
  const [isInspectorMobileOpen, setIsInspectorMobileOpen] = useState<boolean>(() => {
    const deepLink = useSequencerStore.getState().editorDeepLink;
    if (!deepLink?.expandTuning) return false;
    return isMobile || Boolean(hostWin && hostWin.innerWidth < 1024);
  });
  const [editingPatternId, setEditingPatternId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const patternDOMRefs = useRef<Map<number, HTMLElement>>(new Map());
  const badgeDOMRefs = useRef<Map<number, HTMLElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  return {
    isClosing, handleClose, isMaximized, toggleMaximized, isExpandedLayout,
    handleMouseDown, handleMouseUp, contextMenuPos, handleOpenContextMenu, handleCloseContextMenu,
    isAddPickerOpen, addPickerAnchorRect, addBtnRef, handleToggleAddPicker, handleCloseAddPicker,
    patternCardContextMenu, setPatternCardContextMenu, isInspectorMobileOpen, setIsInspectorMobileOpen,
    editingPatternId, setEditingPatternId, editName, setEditName, sensors, patternDOMRefs, badgeDOMRefs, containerRef,
  };
}
