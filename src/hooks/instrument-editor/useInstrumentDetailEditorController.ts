
import React, { useState, useRef, useCallback } from 'react';
import { PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Pattern } from '../../types';

export function useInstrumentDetailEditorController(onClose: () => void) {
  const [isClosing, setIsClosing] = useState(false);
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => { onClose(); }, 120);
  }, [onClose]);

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
    setContextMenuPos({ trackId: cTrackId, x, y });
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
  const [isInspectorMobileOpen, setIsInspectorMobileOpen] = useState(false);
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
    isClosing, handleClose, handleMouseDown, handleMouseUp,
    contextMenuPos, handleOpenContextMenu, handleCloseContextMenu,
    isAddPickerOpen, addPickerAnchorRect, addBtnRef,
    handleToggleAddPicker, handleCloseAddPicker,
    patternCardContextMenu, setPatternCardContextMenu,
    isInspectorMobileOpen, setIsInspectorMobileOpen,
    editingPatternId, setEditingPatternId, editName, setEditName,
    sensors, patternDOMRefs, badgeDOMRefs, containerRef,
  };
}
