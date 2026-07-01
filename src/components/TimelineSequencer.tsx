/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSequencerStore } from '../stores/useSequencerStore';
import React, { useEffect, useRef } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '@/src/ToneLoader';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}
import { TrackGroup, Language, TimeSignature, SongSection, PresetMetadata, RhythmSignal, CloudRhythmSignal } from '../types';
import { ASSETS_BASE_URL, instrumentsConfig, getMaxTicks, getMarkers, isDarkText, getVisualStrokeSymbol } from '../data';
import { CompactPatternRenderer } from './CompactPatternRenderer';
import { TimelineTrackRow } from './TimelineTrackRow';
import { TimelinePlayhead } from './TimelinePlayhead';

import { useSequencer } from '../contexts/SequencerContext';

import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionModal } from './SubscriptionModal';

interface TimelineSequencerProps {
  isMobile: boolean;
  measureWidth: number;
  onMeasureWidthChange: (width: number) => void;
  onExportTablature?: () => void;
  mestreSignals?: CloudRhythmSignal[];
  onSaveCloudSection?: (section: SongSection) => void;
  onLoadCloudSection?: (insertAtMeasure: number) => void;
}

const HEADER_W = 180;

function getDisplayVal(val: string | number) {
  if (val === 0 || val === '0' || !val) return '';
  return String(val);
}

export const TimelineSequencer = React.memo<TimelineSequencerProps>(({
  isMobile,
  measureWidth,
  onMeasureWidthChange,
  onExportTablature,
  mestreSignals = [],
  onSaveCloudSection,
  onLoadCloudSection,
}) => {
  const sequencer = useSequencer();
  const { hasAccess } = useAuth();
  const [showSubModal, setShowSubModal] = React.useState(false);

  // 🛡️ FIX (Audit): Direct Zustand selectors to avoid massive cascade re-renders
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const measureTimeSigs = useSequencerStore(state => state.measureTimeSigs);
  const measureBpms = useSequencerStore(state => state.measureBpms);
  const measureBpmTransitions = useSequencerStore(state => state.measureBpmTransitions);
  const measureVols = useSequencerStore(state => state.measureVols);
  const measureVolTransitions = useSequencerStore(state => state.measureVolTransitions);
  const songSections = useSequencerStore(state => state.songSections);
  const copiedSection = useSequencerStore(state => state.copiedSection);
  const loopStartMeasure = useSequencerStore(state => state.loopStartMeasure);
  const loopEndMeasure = useSequencerStore(state => state.loopEndMeasure);
  const isLoopRegionActive = useSequencerStore(state => state.isLoopRegionActive);
  const measureSignals = useSequencerStore(state => state.measureSignals) || [];

  const {
    lang,
    metadata,
    letras,
    handleTrackMuteToggle: onMuteToggle,
    handleTrackSoloToggle: onSoloToggle,
    handleTimelinePatternAssign: onPatternAssignForMeasure,
    handleTimelinePatternVariationToggle: onPatternVariationToggleForMeasure,
    handleMeasureTimeSigChange: onMeasureTimeSigChange,
    handleMeasureBpmChange: onMeasureBpmChange,
    handleMeasureTransitionChange: onMeasureTransitionChange,
    handleMeasureVolChange: onMeasureVolChange,
    handleMeasureVolTransitionChange: onMeasureVolTransitionChange,
    handleTotalMeasuresChange: onTotalMeasuresChange,
    handleCreateSongSection: onCreateSection,
    handleUpdateSongSection: onUpdateSection,
    handleUpdateSectionRepeat: onUpdateSectionRepeat,
    handleDeleteSongSection: onDeleteSection,
    handleCopySongSection: onCopySection,
    handlePasteSongSection: onPasteSection,
    handleSetLoopStart: onSetLoopStart,
    handleSetLoopEnd: onSetLoopEnd,
    handleClearLoop: onClearLoop,
    handleDeleteMeasure: onDeleteMeasure,
    handleInsertMeasure: onInsertMeasure,
  } = sequencer;
  const tracks = useSequencerStore(state => state.tracks);

  const localRhythmSignals = metadata?.rhythmSignals || [];
  const rhythmSignals = [
    ...mestreSignals.map(s => ({ id: s.id, name: s.name, image: s.imageUrl, isCloud: true })),
    ...localRhythmSignals.map(s => ({ id: s.id, name: s.name, image: s.image, isCloud: false }))
  ];

  const onMeasureSignalChange = (mIdx: number, sigId: string | null) => {
    sequencer.setMeasureSignals(prev => {
      const arr = [...prev];
      while (arr.length <= mIdx) arr.push(null);
      arr[mIdx] = sigId;
      return arr;
    });
  };
  const isMacro = measureWidth <= 240;
  const isMinZoom = measureWidth <= 120;
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const HEADER_W = isMobile ? 80 : (isMacro ? 150 : 180);
  const MEASURE_W = measureWidth;
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // 🛡️ FIX (Audit): Centralized AbortController for all drag/drop events
  const dragAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (dragAbortControllerRef.current) {
        dragAbortControllerRef.current.abort();
      }
    };
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const measureWidthRef = useRef(measureWidth);
  const initialPinchDist = useRef<number | null>(null);
  const initialMeasureWidth = useRef<number>(0);

  useEffect(() => {
    measureWidthRef.current = measureWidth;
  }, [measureWidth]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        initialPinchDist.current = dist;
        initialMeasureWidth.current = measureWidthRef.current;
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDist.current !== null) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (dist > 0) {
          const factor = dist / initialPinchDist.current;
          let targetW = Math.round(initialMeasureWidth.current * factor);
          targetW = Math.max(120, Math.min(960, targetW));
          onMeasureWidthChange(targetW);
        }
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialPinchDist.current = null;
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onMeasureWidthChange]);

  // Navigation & Snapping States
  const [toolMode] = React.useState<'cursor' | 'hand'>('cursor');
  const [isSpacePressed, setIsSpacePressed] = React.useState<boolean>(false);
  const [snapMode, setSnapMode] = React.useState<'measure' | 'beat' | 'none'>('measure');
  const [snapGuideX, setSnapGuideX] = React.useState<number | null>(null);

  const isPanningActive = toolMode === 'hand' || isSpacePressed;
  
  // Refs for panning state
  const isPanningDragging = React.useRef<boolean>(false);
  const panPointerId = React.useRef<number | null>(null);
  const panStartX = React.useRef<number>(0);
  const panStartY = React.useRef<number>(0);
  const panStartScrollLeft = React.useRef<number>(0);
  const panStartScrollTop = React.useRef<number>(0);

  // Refs for mini-map
  const minimapContainerRef = React.useRef<HTMLDivElement>(null);
  const minimapSliderRef = React.useRef<HTMLDivElement>(null);
  const isMinimapDragging = React.useRef<boolean>(false);
  const minimapPointerId = React.useRef<number | null>(null);

  // Song Section modals state
  const [sectionModalOpen, setSectionModalOpen] = React.useState<boolean>(false);
  const [editingSection, setEditingSection] = React.useState<SongSection | null>(null);
  const [sectionFormName, setSectionFormName] = React.useState<string>('');
  const [sectionFormStart, setSectionFormStart] = React.useState<number | string>(1);
  const [sectionFormEnd, setSectionFormEnd] = React.useState<number | string>(4);
  const [sectionFormColor, setSectionFormColor] = React.useState<string>('#f19066');
  const [sectionFormLevel, setSectionFormLevel] = React.useState<number>(0);
  const [hoveredPasteMeasure, setHoveredPasteMeasure] = React.useState<number | null>(null);
  const [signalDropdownOpen, setSignalDropdownOpen] = React.useState<number | null>(null);

  // Tablature state and logic removed (lifted to App.tsx)

  const isScrubbing = useRef(false);
  const pendingScrollLeft = useRef<number | null>(null);
  const propsRef = useRef({ totalMeasures, measureTimeSigs });
  
  React.useLayoutEffect(() => {
    if (pendingScrollLeft.current !== null && scrollRef.current) {
      scrollRef.current.scrollLeft = pendingScrollLeft.current;
      pendingScrollLeft.current = null;
    }
  }, [measureWidth]);

  useEffect(() => {
    propsRef.current = { totalMeasures, measureTimeSigs };
  });

  const handleRulerClickOrDrag = (clientX: number) => {
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left - HEADER_W + scrollRef.current.scrollLeft;
    const { totalMeasures: tMeasures, measureTimeSigs: mSigs } = propsRef.current;
    
    if (relativeX < 0) {
      window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', { detail: { mIdx: 0, sIdx: 0 } }));
      return;
    }
    
    const measureIdx = Math.floor(relativeX / MEASURE_W);
    if (measureIdx >= tMeasures) {
      const lastMeasureIdx = tMeasures - 1;
      const mTimeSig = mSigs[lastMeasureIdx] || '4/4';
      const steps = mTimeSig === '6/8' || mTimeSig === '12/8' ? 24 : 16;
      window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', { detail: { mIdx: lastMeasureIdx, sIdx: steps - 1 } }));
      return;
    }
    
    const mTimeSig = mSigs[measureIdx] || '4/4';
    const steps = mTimeSig === '6/8' || mTimeSig === '12/8' ? 24 : 16;
    const xInMeasure = relativeX - measureIdx * MEASURE_W;
    const ratio = Math.max(0, Math.min(1, xInMeasure / MEASURE_W));
    const stepIdx = Math.floor(ratio * steps);
    
    window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', { detail: { mIdx: measureIdx, sIdx: stepIdx } }));
  };

  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (['INPUT', 'SELECT', 'BUTTON'].includes(target.tagName)) return;
    
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < HEADER_W) return; // Clic sur en-tête d'instruments, ignoré
    
    if (e.pointerType === 'mouse') {
      const initialY = e.clientY;
      const initialWidth = measureWidthRef.current;
      
      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaY = moveEvent.clientY - initialY;
        // Si le mouvement est principalement vertical, on zoome
        if (Math.abs(deltaY) > 5) {
          const newWidth = initialWidth + deltaY * 2;
          const clamped = Math.max(120, Math.min(960, newWidth));
          onMeasureWidthChange(clamped);
        }
        // Scrubbing horizontal
        handleRulerClickOrDrag(moveEvent.clientX);
      };
      
      const onPointerUp = () => {
        isScrubbing.current = false;
        if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
        document.body.style.cursor = 'default';
      };
      
      isScrubbing.current = true;
      handleRulerClickOrDrag(e.clientX);
      
      if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
      dragAbortControllerRef.current = new AbortController();
      const { signal } = dragAbortControllerRef.current;
      
      window.addEventListener('pointermove', onPointerMove, { signal });
      window.addEventListener('pointerup', onPointerUp, { signal });
      document.body.style.cursor = 'ns-resize';
      e.preventDefault();
      return;
    }

    // Fallback pour tactile / autres pointeurs
    isScrubbing.current = true;
    handleRulerClickOrDrag(e.clientX);
    e.preventDefault();
  };

  const handleRulerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (['INPUT', 'SELECT', 'BUTTON'].includes(target.tagName)) return;
    
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const clickX = touch.clientX - rect.left;
    if (clickX < HEADER_W) return;
    
    isScrubbing.current = true;
    handleRulerClickOrDrag(touch.clientX);
    // Don't preventDefault here unconditionally if it causes issues, but we already filtered inputs.
    e.preventDefault();
  };



  // Total scrollable content width (excluding sticky header column)
  const totalContentW = totalMeasures * MEASURE_W;

  // 1. Mouse wheel horizontal scroll
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Keyboard listener for Spacebar panning shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const activeEl = document.activeElement;
        const isInput = activeEl && (
          activeEl.tagName === 'INPUT' || 
          activeEl.tagName === 'TEXTAREA' || 
          (activeEl as HTMLElement).isContentEditable
        );
        if (!isInput) {
          e.preventDefault();
          setIsSpacePressed(true);
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 2. Scrubbing ruler handler (Global mouse move/up listener)
  React.useEffect(() => {
    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbing.current) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          handleRulerClickOrDrag(e.clientX);
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isScrubbing.current) {
        const touch = e.touches[0];
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          handleRulerClickOrDrag(touch.clientX);
        });
        e.preventDefault();
      }
    };

    const handleMouseUp = () => {
      if (isScrubbing.current) {
        isScrubbing.current = false;
        if (rafId) cancelAnimationFrame(rafId);
      }
    };

    const handleTouchEnd = () => {
      if (isScrubbing.current) {
        isScrubbing.current = false;
        if (rafId) cancelAnimationFrame(rafId);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);



  // Viewport Panning logic
  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const isHandMode = toolMode === 'hand' || isSpacePressed;
    const targetEl = e.target as HTMLElement;
    const isClickingEmpty = targetEl?.classList?.contains('cell-detailed') || 
                            targetEl?.classList?.contains('cell-macro') || 
                            targetEl?.classList?.contains('grid-lines-overlay');

    if (e.button === 0 && (isHandMode || isClickingEmpty)) {
      isPanningDragging.current = true;
      panPointerId.current = e.pointerId;
      const el = e.currentTarget;
      if (typeof el.setPointerCapture === 'function') {
        el.setPointerCapture(e.pointerId);
      }
      
      panStartX.current = e.clientX;
      panStartY.current = e.clientY;
      panStartScrollLeft.current = el.scrollLeft;
      panStartScrollTop.current = el.scrollTop;
      
      el.classList.add('panning-dragging');
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanningDragging.current && e.pointerId === panPointerId.current) {
      const dx = e.clientX - panStartX.current;
      const dy = e.clientY - panStartY.current;
      const el = e.currentTarget;
      el.scrollLeft = panStartScrollLeft.current - dx;
      el.scrollTop = panStartScrollTop.current - dy;
      
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanningDragging.current && e.pointerId === panPointerId.current) {
      isPanningDragging.current = false;
      panPointerId.current = null;
      const el = e.currentTarget;
      if (typeof el.releasePointerCapture === 'function') {
        el.releasePointerCapture(e.pointerId);
      }
      el.classList.remove('panning-dragging');
      e.stopPropagation();
    }
  };

  // Mini-Map Viewport synchronisation
  const updateMinimapViewport = React.useCallback(() => {
    if (!scrollRef.current || !minimapSliderRef.current || !minimapContainerRef.current) return;
    const scrollEl = scrollRef.current;
    const sliderEl = minimapSliderRef.current;
    const containerEl = minimapContainerRef.current;
    
    const totalContentWidth = totalMeasures * MEASURE_W;
    const viewportWidth = scrollEl.clientWidth - HEADER_W;
    const minimapWidth = containerEl.clientWidth;
    
    if (totalContentWidth <= 0 || minimapWidth <= 0) return;
    
    const ratio = minimapWidth / totalContentWidth;
    const sliderWidth = Math.max(16, Math.min(minimapWidth, viewportWidth * ratio));
    const sliderLeft = scrollEl.scrollLeft * ratio;
    
    sliderEl.style.width = `${sliderWidth}px`;
    sliderEl.style.left = `${sliderLeft}px`;
  }, [totalMeasures, MEASURE_W, HEADER_W]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      updateMinimapViewport();
    };
    el.addEventListener('scroll', handleScroll);
    updateMinimapViewport();
    
    window.addEventListener('resize', updateMinimapViewport);
    
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateMinimapViewport);
    };
  }, [updateMinimapViewport]);

  // Mini-Map Navigation / Dragging logic
  const handleMinimapDrag = React.useCallback((clientX: number) => {
    if (!scrollRef.current || !minimapContainerRef.current || !minimapSliderRef.current) return;
    const scrollEl = scrollRef.current;
    const containerEl = minimapContainerRef.current;
    const sliderEl = minimapSliderRef.current;
    
    const rect = containerEl.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const minimapWidth = rect.width;
    
    const totalContentWidth = totalMeasures * MEASURE_W;
    if (totalContentWidth <= 0) return;
    const ratio = minimapWidth / totalContentWidth;
    if (ratio <= 0) return;
    
    const sliderWidth = parseFloat(sliderEl.style.width) || 50;
    
    let newLeft = clickX - sliderWidth / 2;
    if (newLeft < 0) newLeft = 0;
    if (newLeft > minimapWidth - sliderWidth) newLeft = minimapWidth - sliderWidth;
    
    scrollEl.scrollLeft = newLeft / ratio;
    sliderEl.style.left = `${newLeft}px`;
  }, [totalMeasures, MEASURE_W]);

  const handleMinimapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isMinimapDragging.current = true;
    minimapPointerId.current = e.pointerId;
    const containerEl = minimapContainerRef.current;
    if (containerEl) {
      containerEl.setPointerCapture(e.pointerId);
    }
    handleMinimapDrag(e.clientX);
    e.preventDefault();
  };

  const handleMinimapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMinimapDragging.current && e.pointerId === minimapPointerId.current) {
      handleMinimapDrag(e.clientX);
    }
  };

  const handleMinimapPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMinimapDragging.current && e.pointerId === minimapPointerId.current) {
      isMinimapDragging.current = false;
      minimapPointerId.current = null;
      const containerEl = minimapContainerRef.current;
      if (containerEl) {
        containerEl.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleMinimapZoomRightPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (e.button !== 0) return;
    e.stopPropagation(); // Prevent minimap panning
    
    if (!minimapContainerRef.current || !minimapSliderRef.current || !scrollRef.current) return;
    const initialX = e.clientX;
    const initialS = minimapSliderRef.current.clientWidth;
    const initialL = minimapSliderRef.current.offsetLeft;
    const M = minimapContainerRef.current.clientWidth;
    const V = scrollRef.current.clientWidth;
    
    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - initialX;
      const targetS = Math.max(16, initialS + deltaX);
      
      const newW = ((M * V) / targetS - HEADER_W) / totalMeasures;
      const clampedW = Math.max(120, Math.min(960, newW));
      
      const newC = HEADER_W + totalMeasures * clampedW;
      pendingScrollLeft.current = (initialL / M) * newC;
      
      onMeasureWidthChange(clampedW);
    };
    
    const onPointerUp = () => {
      if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
      document.body.style.cursor = 'default';
    };
    
    if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
    dragAbortControllerRef.current = new AbortController();
    const { signal } = dragAbortControllerRef.current;
    
    window.addEventListener('pointermove', onPointerMove, { signal });
    window.addEventListener('pointerup', onPointerUp, { signal });
    document.body.style.cursor = 'ew-resize';
  };

  const handleMinimapZoomLeftPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (e.button !== 0) return;
    e.stopPropagation();
    
    if (!minimapContainerRef.current || !minimapSliderRef.current || !scrollRef.current) return;
    const initialX = e.clientX;
    const initialS = minimapSliderRef.current.clientWidth;
    const initialL = minimapSliderRef.current.offsetLeft;
    const M = minimapContainerRef.current.clientWidth;
    const V = scrollRef.current.clientWidth;
    
    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - initialX;
      const targetS = Math.max(16, initialS - deltaX);
      const targetL = initialL + deltaX;
      
      const newW = ((M * V) / targetS - HEADER_W) / totalMeasures;
      const clampedW = Math.max(120, Math.min(960, newW));
      
      const newC = HEADER_W + totalMeasures * clampedW;
      pendingScrollLeft.current = (targetL / M) * newC;
      
      onMeasureWidthChange(clampedW);
    };
    
    const onPointerUp = () => {
      if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
      document.body.style.cursor = 'default';
    };
    
    if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
    dragAbortControllerRef.current = new AbortController();
    const { signal } = dragAbortControllerRef.current;
    
    window.addEventListener('pointermove', onPointerMove, { signal });
    window.addEventListener('pointerup', onPointerUp, { signal });
    document.body.style.cursor = 'ew-resize';
  };

  // Section Marker double-click and drag handlers
  const handleMarkerRulerDblClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    let measureIdx = Math.floor(clickX / MEASURE_W);
    measureIdx = Math.max(0, Math.min(totalMeasures - 1, measureIdx));
    
    setEditingSection(null);
    setSectionFormName(lang === 'fr' ? 'Partie A' : 'Parte A');
    setSectionFormStart(measureIdx + 1);
    setSectionFormEnd(Math.min(measureIdx + 4, totalMeasures));
    setSectionFormColor('#f19066');
    setSectionFormLevel(0);
    setSectionModalOpen(true);
  };

  const handleMarkerPointerDown = (e: React.PointerEvent<HTMLDivElement>, section: SongSection) => {
    if (toolMode === 'hand' || isSpacePressed) return;
    if (e.button !== 0) return;
    const el = e.currentTarget;
    if (typeof el.setPointerCapture === 'function') {
      el.setPointerCapture(e.pointerId);
    }
    el.setAttribute('data-has-moved', 'false');
    
    const startX = e.clientX;
    const startMeasure = section.startMeasure;
    const duration = section.endMeasure - section.startMeasure;
    
    const handlePointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      if (Math.abs(dx) > 3) {
        el.setAttribute('data-has-moved', 'true');
      }
      
      const proposedStart = startMeasure + (dx / MEASURE_W);
      
      let snappedStart = section.startMeasure;
      if (snapMode === 'measure') {
        snappedStart = Math.round(proposedStart);
      } else if (snapMode === 'beat') {
        snappedStart = Math.round(proposedStart * 4) / 4;
      } else {
        snappedStart = proposedStart;
      }
      
      snappedStart = Math.max(0, Math.min(totalMeasures - 1 - duration, snappedStart));
      const currentLeft = snappedStart * MEASURE_W;
      
      el.style.left = `${currentLeft}px`;
      
      if (snapMode !== 'none') {
        setSnapGuideX(HEADER_W + currentLeft);
      } else {
        setSnapGuideX(null);
      }
    };
    
    const handlePointerUp = () => {
      if (typeof el.releasePointerCapture === 'function') {
        el.releasePointerCapture(e.pointerId);
      }
      if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
      setSnapGuideX(null);
      
      const finalLeft = parseFloat(el.style.left) || (section.startMeasure * MEASURE_W);
      const finalStart = Math.max(0, Math.min(totalMeasures - 1 - duration, Math.round(finalLeft / MEASURE_W)));
      const finalEnd = finalStart + duration;
      
      if (finalStart !== section.startMeasure) {
        onUpdateSection(section.id, section.name, finalStart, finalEnd, section.color);
      } else {
        el.style.left = `${section.startMeasure * MEASURE_W}px`;
      }
    };
    
    if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
    dragAbortControllerRef.current = new AbortController();
    const { signal } = dragAbortControllerRef.current;
    
    window.addEventListener('pointermove', handlePointerMove, { signal });
    window.addEventListener('pointerup', handlePointerUp, { signal });
    e.stopPropagation();
  };

  // Section Block Drag-and-Drop Handler (Smart Snapping)
  const handleSectionBlockPointerDown = (e: React.PointerEvent<HTMLDivElement>, section: SongSection) => {
    if (toolMode === 'hand' || isSpacePressed) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.button !== 0) return;
    
    const el = e.currentTarget;
    if (typeof el.setPointerCapture === 'function') {
      el.setPointerCapture(e.pointerId);
    }
    
    const startX = e.clientX;
    const startMeasure = section.startMeasure;
    const duration = section.endMeasure - section.startMeasure;
    
    const handlePointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      const proposedStart = startMeasure + (dx / MEASURE_W);
      
      let snappedStart = section.startMeasure;
      if (snapMode === 'measure') {
        snappedStart = Math.round(proposedStart);
      } else if (snapMode === 'beat') {
        snappedStart = Math.round(proposedStart * 4) / 4;
      } else {
        snappedStart = proposedStart;
      }
      
      snappedStart = Math.max(0, Math.min(totalMeasures - 1 - duration, snappedStart));
      const currentLeft = snappedStart * MEASURE_W;
      
      el.style.left = `${currentLeft}px`;
      
      if (snapMode !== 'none') {
        setSnapGuideX(HEADER_W + currentLeft);
      } else {
        setSnapGuideX(null);
      }
    };
    
    const handlePointerUp = () => {
      if (typeof el.releasePointerCapture === 'function') {
        el.releasePointerCapture(e.pointerId);
      }
      if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
      setSnapGuideX(null);
      
      const finalLeft = parseFloat(el.style.left) || (section.startMeasure * MEASURE_W);
      const finalStart = Math.max(0, Math.min(totalMeasures - 1 - duration, Math.round(finalLeft / MEASURE_W)));
      const finalEnd = finalStart + duration;
      
      if (finalStart !== section.startMeasure) {
        onUpdateSection(section.id, section.name, finalStart, finalEnd, section.color);
      } else {
        el.style.left = `${section.startMeasure * MEASURE_W}px`;
      }
    };
    
    if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
    dragAbortControllerRef.current = new AbortController();
    const { signal } = dragAbortControllerRef.current;
    
    window.addEventListener('pointermove', handlePointerMove, { signal });
    window.addEventListener('pointerup', handlePointerUp, { signal });
    e.stopPropagation();
  };



  const zoomStyles = {
    '--zoom-level': String(measureWidth / 480),
    '--measure-width': `${measureWidth}px`,
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    userSelect: 'none',
  } as React.CSSProperties;

  if (!tracks) return null;

  return (
    <TimelineUIContext.Provider value={{
      MEASURE_W, HEADER_W, totalContentW, isMobile, isMacro, isMinZoom, isPanningActive, lang,
      signalDropdownOpen, setSignalDropdownOpen
    }}>
    <div
      ref={containerRef}
      data-zoom={isMacro ? 'macro' : 'normal'}
      data-mobile={isMobile ? 'true' : 'false'}
      style={{ ...zoomStyles, touchAction: 'pan-x pan-y' }}
      className="timeline-sequencer-container flex-1 min-h-0 flex flex-col w-full h-full overflow-hidden sequencer-bg text-[var(--cordel-text)] select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ══════════ TIMELINE OVERVIEW (MINI-MAP) ══════════ */}
      <div className="border-b border-[var(--cordel-border)]/20 bg-[var(--cordel-bg)] px-4 py-2 shrink-0 select-none">
        <div className="flex justify-between items-center text-[9px] font-bold text-[var(--cordel-text)]/70 uppercase mb-1 tracking-wider">
          <span>🗺️ {lang === 'fr' ? 'Vue d\'ensemble (Mini-Map)' : 'Visão Geral (Mini-Map)'}</span>
          <span className="text-[8px] text-[var(--cordel-text)]/40 normal-case">{lang === 'fr' ? 'Glissez ou cliquez pour naviguer rapidement' : 'Clique ou arraste para navegar rapidamente'}</span>
        </div>
        <div 
          ref={minimapContainerRef}
          className="h-10 w-full relative bg-black/40 rounded border border-[var(--cordel-border)]/15 overflow-hidden cursor-pointer"
          onPointerDown={handleMinimapPointerDown}
          onPointerMove={handleMinimapPointerMove}
          onPointerUp={handleMinimapPointerUp}
          onPointerCancel={handleMinimapPointerUp}
        >
          {/* Miniature Grid Lines */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: totalMeasures }).map((_, mIdx) => {
              if (mIdx === 0 || mIdx === totalMeasures) return null;
              const isSection = mIdx % 4 === 0;
              return (
                <div 
                  key={mIdx}
                  className={`absolute top-0 bottom-0 w-[1px] ${
                    isSection ? 'bg-blue-500/25' : 'bg-[var(--cordel-border)]/5'
                  }`}
                  style={{ left: `${(mIdx / totalMeasures) * 100}%` }}
                />
              );
            })}
          </div>

          {/* Miniature Track Preview */}
          <div className="absolute inset-0 flex flex-col justify-around py-0.5 pointer-events-none">
            {tracks.map((track) => {
              const inst = instrumentsConfig[track.instrumentIdx];
              if (!inst) return null;
              return (
                <div key={track.id} className="h-1 w-full relative">
                  {Array.from({ length: totalMeasures }).map((_, mIdx) => {
                    const activePattern = track.patterns.find(p => p.measureAssignments[mIdx]);
                    if (!activePattern) return null;
                    const bg = inst.colors['D'] || inst.colors['E'] || '#3b82f6';
                    return (
                      <div 
                        key={mIdx}
                        className="absolute top-0 bottom-0 rounded-xs opacity-50"
                        style={{
                          left: `${(mIdx / totalMeasures) * 100}%`,
                          width: `${(1 / totalMeasures) * 100}%`,
                          backgroundColor: bg
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Viewport Translucent Slider */}
          <div 
            ref={minimapSliderRef}
            className="absolute top-0 bottom-0 bg-blue-500/10 dark:bg-blue-400/10 border-y-2 border-blue-500 dark:border-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.25)] cursor-grab active:cursor-grabbing z-10"
            style={{ width: '100px', left: '0px' }}
          >
            {/* Left Handle */}
            <div
              className="absolute left-0 top-0 bottom-0 w-2.5 bg-blue-500 dark:bg-blue-400 cursor-ew-resize opacity-80 hover:opacity-100"
              onPointerDown={handleMinimapZoomLeftPointerDown}
            />
            {/* Right Handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-2.5 bg-blue-500 dark:bg-blue-400 cursor-ew-resize opacity-80 hover:opacity-100"
              onPointerDown={handleMinimapZoomRightPointerDown}
            />
          </div>
        </div>
      </div>

      <div
        id="timeline-scroll-container"
        ref={scrollRef}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        onPointerCancel={handleViewportPointerUp}
        className={`flex-grow overflow-x-auto overflow-y-auto relative custom-scrollbar ${
          isPanningActive ? 'cursor-grab select-none' : ''
        }`}
      >
        {/* 
          We use a single wrapper with explicit width so the ruler row and
          every track row share the same coordinate space.
        */}
        <div style={{ width: `${HEADER_W + totalContentW + 150}px`, minHeight: '100%' }} className="relative">

          {/* ══════════ MARKER RULER ROW (📍 NEW) ══════════ */}
          <div
            className="flex h-7 border-b border-[var(--cordel-border)]/15 bg-[var(--cordel-bg)]/50 relative select-none"
            style={{ width: `${HEADER_W + totalContentW + 150}px` }}
          >
            {/* Sticky Label */}
            <div
              className={`sticky left-0 z-40 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center justify-between font-cactus text-[9px] font-bold uppercase shrink-0 text-[var(--cordel-text)]/40 ${
                isMobile ? 'px-1.5' : 'px-3'
              }`}
              style={{ width: HEADER_W, minWidth: HEADER_W }}
            >
              <span>{isMobile ? 'Rep.' : (lang === 'fr' ? 'Repères' : 'Marcadores')}</span>
            </div>

            {/* Marker Ruler Track Area */}
            <div 
              className="flex-grow relative h-full cursor-copy"
              onDoubleClick={handleMarkerRulerDblClick}
            >
              {songSections.length === 0 && (
                <div className="absolute inset-0 flex items-center pl-4 text-[8px] text-[var(--cordel-text)]/20 italic pointer-events-none">
                  {lang === 'fr' ? 'Double-cliquez ici pour ajouter un repère de section' : 'Double-clique aqui para adicionar um marcador'}
                </div>
              )}

              {/* Render Section Markers */}
              {songSections.map((section) => {
                const posX = section.startMeasure * MEASURE_W;
                return (
                  <div
                    key={`marker-${section.id}`}
                    className={`absolute top-1 h-[18px] px-2 rounded-full text-[9px] font-bold text-white flex items-center gap-1 shadow-sm cursor-grab select-none hover:brightness-110 active:cursor-grabbing transform -translate-x-1/2 border border-black/10 z-40 ${
                      isPanningActive ? 'pointer-events-none' : ''
                    }`}
                    style={{
                      left: `${posX}px`,
                      backgroundColor: section.color || '#f19066',
                    }}
                    onPointerDown={(e) => handleMarkerPointerDown(e, section)}
                    onClick={(e) => {
                      if ((e.currentTarget as HTMLElement).dataset.hasMoved === 'true') return;
                      e.stopPropagation();
                      setEditingSection(section);
                      setSectionFormName(section.name);
                      setSectionFormStart(section.startMeasure + 1);
                      setSectionFormEnd(section.endMeasure + 1);
                      setSectionFormColor(section.color || '#f19066');
                      setSectionFormLevel(section.level || 0);
                      setSectionModalOpen(true);
                    }}
                  >
                    <span>📍 {section.name}</span>
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSection(section.id);
                      }}
                      className="opacity-70 hover:opacity-100 cursor-pointer ml-1 text-[11px]"
                      title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                    >
                      &times;
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ══════════ SECTIONS ROW ══════════ */}
          <div
            className="flex border-b border-[var(--cordel-border)]/30 bg-[var(--cordel-bg)]/80 relative"
            style={{ 
              width: `${HEADER_W + totalContentW + 150}px`, 
              height: `${40 + (Math.max(0, ...songSections.map(s => s.level || 0)) * 34)}px` 
            }}
          >
            {/* Sticky header */}
            <div
              className={`sticky left-0 z-40 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center justify-between font-cactus text-[11px] font-bold uppercase shrink-0 ${
                isMobile ? 'px-1' : 'px-2'
              }`}
              style={{ width: HEADER_W, minWidth: HEADER_W }}
            >
              <div className="flex items-center gap-1">
                <span className="text-[9px] md:text-[10px] uppercase font-bold text-[var(--cordel-text)]/70 shrink-0 select-none hidden md:inline-block" title="Magnétisme">🧲</span>
                <select
                  value={snapMode}
                  onChange={(e) => setSnapMode(e.target.value as 'measure' | 'beat' | 'none')}
                  className="bg-[var(--cordel-text)] text-[var(--cordel-bg)] text-[9px] md:text-[10px] font-bold rounded cordel-border-sm px-1 py-0.5 outline-none cursor-pointer tracking-wider shadow-[1.5px_1.5px_0_var(--cordel-border)] max-w-[75px] md:max-w-[85px]"
                  title={lang === 'fr' ? 'Attraction' : 'Atração'}
                >
                  <option value="measure">{isMobile ? (lang === 'fr' ? 'Mes.' : 'Comp.') : (lang === 'fr' ? 'Mesure' : 'Compasso')}</option>
                  <option value="beat">{isMobile ? (lang === 'fr' ? 'Tps' : 'Tmp') : (lang === 'fr' ? 'Temps' : 'Tempos')}</option>
                  <option value="none">{lang === 'fr' ? 'Libre' : 'Livre'}</option>
                </select>
              </div>
              <button
                onClick={() => {
                  setEditingSection(null);
                  setSectionFormName(lang === 'fr' ? 'Partie A' : 'Parte A');
                  setSectionFormStart(1);
                  setSectionFormEnd(Math.min(4, totalMeasures));
                  setSectionFormColor('#f19066');
                  setSectionFormLevel(0);
                  setSectionModalOpen(true);
                }}
                className="bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold text-[10px] px-1 py-0.5 rounded cordel-border-sm hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center gap-0.5"
                title={lang === 'fr' ? 'Créer une section' : 'Criar seção'}
              >
                <span>➕</span>
                {!isMobile && <span>{lang === 'fr' ? 'Sect.' : 'Seção'}</span>}
              </button>
            </div>

            {/* Space where sections will render */}
            <div className="flex-grow relative h-full">
              {songSections.map((section) => {
                const startX = section.startMeasure * MEASURE_W;
                const width = (section.endMeasure - section.startMeasure + 1) * MEASURE_W;
                const maxLevel = Math.max(0, ...songSections.map(s => s.level || 0));
                const level = section.level || 0;
                const topOffset = (maxLevel - level) * 34 + 4;

                return (
                  <div
                    key={section.id}
                    className={`absolute flex items-center justify-between px-3 text-xs font-bold rounded cordel-border-sm select-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] cursor-grab active:cursor-grabbing hover:brightness-105 transition-[background-color] ${
                      isPanningActive ? 'pointer-events-none' : ''
                    }`}
                    onPointerDown={(e) => handleSectionBlockPointerDown(e, section)}
                    style={{
                      left: `${startX}px`,
                      width: `${width - 8}px`, // 4px margin left & right
                      marginLeft: '4px',
                      top: `${topOffset}px`,
                      height: '32px',
                      backgroundColor: section.color || '#eaddcf',
                      color: '#1a1a1a', // Toujours lisible en noir sur fond coloré
                      borderColor: '#1a1a1a',
                      borderWidth: '1.5px',
                    }}
                  >
                    <span className="truncate max-w-[50%] font-cactus uppercase tracking-wider">{section.name}</span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const val = await sequencer.promptAsync(
                            lang === 'fr' ? 'Nombre de répétitions pour cette section ?' : 'Número de repetições?',
                            (section.repeatCount || 1).toString()
                          );
                          if (val) {
                            const count = parseInt(val, 10);
                            if (!isNaN(count) && count > 0) {
                              const sectionLength = section.endMeasure - section.startMeasure + 1;
                              const diff = (count - (section.repeatCount || 1)) * sectionLength;
                              if (totalMeasures + diff > 20 && !hasAccess('mestre')) {
                                setShowSubModal(true);
                              } else {
                                onUpdateSectionRepeat(section.id, count);
                              }
                            }
                          }
                        }}
                        className="bg-white/80 hover:bg-white text-black text-[9px] p-0.5 px-1 rounded cordel-border-sm cursor-pointer font-sans font-bold flex items-center gap-0.5"
                        title={lang === 'fr' ? 'Répétitions' : 'Repetições'}
                      >
                        🔁 x{section.repeatCount || 1}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopySection(section);
                        }}
                        className="bg-white/80 hover:bg-white text-black text-[9px] p-0.5 px-1 rounded cordel-border-sm cursor-pointer font-sans"
                        title={lang === 'fr' ? 'Copier le bloc' : 'Copiar bloco'}
                      >
                        📋 Copier
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSection(section);
                          setSectionFormName(section.name);
                          setSectionFormStart(section.startMeasure + 1);
                          setSectionFormEnd(section.endMeasure + 1);
                          setSectionFormColor(section.color || '#f19066');
                          setSectionFormLevel(section.level || 0);
                          setSectionModalOpen(true);
                        }}
                        className="bg-white/80 hover:bg-white text-black text-[9px] p-0.5 px-1 rounded cordel-border-sm cursor-pointer"
                        title={lang === 'fr' ? 'Modifier' : 'Editar'}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSection(section.id);
                        }}
                        className="bg-red-800/80 hover:bg-red-800 text-white text-[9px] p-0.5 px-1 rounded cordel-border-sm cursor-pointer"
                        title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Paste buttons in the sections bar */}
              {copiedSection && Array.from({ length: totalMeasures }).map((_, mIdx) => {
                const startX = mIdx * MEASURE_W;
                return (
                  <button
                    key={`paste-sec-${mIdx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPasteSection(mIdx);
                    }}
                    onMouseEnter={() => setHoveredPasteMeasure(mIdx)}
                    onMouseLeave={() => setHoveredPasteMeasure(null)}
                    className="absolute top-1 bottom-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-800 dark:text-emerald-300 font-sans font-bold text-[9px] px-2 rounded border border-dashed border-emerald-600 flex items-center justify-center gap-1 cursor-pointer z-30 transition-all hover:scale-105 shadow-[1px_1px_2px_rgba(0,0,0,0.1)]"
                    style={{
                      left: `${startX + 4}px`,
                      width: `${Math.min(100, MEASURE_W - 8)}px`,
                    }}
                    title={lang === 'fr' ? `Coller à la mesure ${mIdx + 1}` : `Colar no compasso ${mIdx + 1}`}
                  >
                    📋 {lang === 'fr' ? `Coller M.${mIdx + 1}` : `Colar C.${mIdx + 1}`}
                  </button>
                );
              })}

              {/* Ghost preview block */}
              {copiedSection && hoveredPasteMeasure !== null && (
                (() => {
                  const startX = hoveredPasteMeasure * MEASURE_W;
                  const width = copiedSection.length * MEASURE_W;
                  return (
                    <div
                      className="absolute top-1 bottom-1 flex items-center justify-between px-3 text-xs font-bold rounded border border-dashed pointer-events-none opacity-50 z-20 animate-pulse"
                      style={{
                        left: `${startX}px`,
                        width: `${width - 8}px`,
                        marginLeft: '4px',
                        backgroundColor: copiedSection.color || '#f19066',
                        color: '#1a1a1a',
                        borderColor: '#1a1a1a',
                        borderWidth: '1.5px',
                      }}
                    >
                      <span className="truncate max-w-[80%] font-cactus uppercase tracking-wider">
                        {copiedSection.name} ({lang === 'fr' ? 'Aperçu' : 'Prévia'})
                      </span>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {/* ══════════ RULER ROW ══════════ */}
          <div
            className="flex min-h-16 h-auto border-b-2 border-[var(--cordel-border)] sticky top-0 z-30 bg-[var(--cordel-bg)] cursor-ns-resize select-none"
            style={{ width: `${HEADER_W + totalContentW + 150}px` }}
            onPointerDown={handleRulerPointerDown}
            onTouchStart={handleRulerTouchStart}
          >
             {/* Sticky corner */}
             <div
               className={`sticky left-0 z-40 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center font-cactus text-sm font-bold uppercase ${
                 isMobile ? 'px-1.5' : 'px-3'
               }`}
               style={{ width: HEADER_W, minWidth: HEADER_W }}
             >
               <span>{isMobile ? 'Inst.' : (lang === 'fr' ? 'Instruments' : 'Instrumentos')}</span>
             </div>

            {/* Measure labels */}
            {Array.from({ length: totalMeasures }).map((_, mIdx) => {
              const mTimeSig = measureTimeSigs[mIdx] || '4/4';
              const mBpm = measureBpms[mIdx] || 100;
              const mTransition = measureBpmTransitions[mIdx] || 'immediate';
              const mVol = measureVols[mIdx] !== undefined ? measureVols[mIdx] : 100;
              const mVolTransition = measureVolTransitions[mIdx] || 'immediate';
              const localBeats = mTimeSig === '3/4' || mTimeSig === '6/8' ? 3 : mTimeSig === '2/4' ? 2 : mTimeSig === '12/8' ? 12 : 4;

              const isInLoop = loopStartMeasure !== null && loopEndMeasure !== null && mIdx >= loopStartMeasure && mIdx <= loopEndMeasure;

              return (
                <div
                  key={mIdx}
                  className={`flex flex-col justify-between px-2 py-1 text-[10px] font-bold relative transition-all border-r ${
                    (mIdx + 1) % 4 === 0
                      ? 'border-r-2 border-r-blue-500/50 dark:border-r-blue-400/50 shadow-[1px_0_0_0_rgba(59,130,246,0.1)]'
                      : 'border-r-[var(--cordel-border)]/30'
                  } ${
                    loopStartMeasure !== null && loopEndMeasure !== null
                      ? (isInLoop ? (isLoopRegionActive ? 'bg-blue-600/5 border-t-4 border-t-blue-600/80 dark:border-t-blue-500/80' : 'bg-gray-500/5 border-t-4 border-t-gray-500/80 dark:border-t-gray-400/80') : (isLoopRegionActive ? 'bg-black/10 dark:bg-black/30 opacity-70' : ''))
                      : ''
                  }`}
                  style={{ width: MEASURE_W, minWidth: MEASURE_W }}
                >
                  {isInLoop && (
                    <div
                      className="absolute top-[-4px] left-0 right-0 h-3 cursor-pointer z-50 hover:bg-white/20 transition-colors"
                      title={isLoopRegionActive ? (lang === 'fr' ? 'Désactiver la sélection' : 'Desativar seleção') : (lang === 'fr' ? 'Activer la sélection' : 'Ativar seleção')}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        sequencer.setIsLoopRegionActive(!isLoopRegionActive);
                      }}
                    />
                  )}
                  <div className="ruler-measure-header flex flex-wrap items-center justify-between w-full mt-0.5 gap-x-2 gap-y-1">
                    <span className="font-cactus text-xs tracking-wide flex items-center gap-1.5 shrink-0">
                      <span>{lang === 'fr' ? 'M.' : 'C.'} {mIdx + 1}</span>
                      
                      {/* Loop Delimiters */}
                      <div className="ruler-detailed flex gap-0.5 border-l border-[var(--cordel-border)]/20 pl-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetLoopStart(mIdx);
                          }}
                          className={`px-1 py-px rounded font-extrabold text-[10px] cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors border ${
                            loopStartMeasure === mIdx 
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-transparent text-[var(--cordel-text)] border-[var(--cordel-border)]/30'
                          }`}
                          title={lang === 'fr' ? 'Définir comme début de boucle' : 'Definir como início do loop'}
                        >
                          [
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetLoopEnd(mIdx);
                          }}
                          className={`px-1 py-px rounded font-extrabold text-[10px] cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors border ${
                            loopEndMeasure === mIdx 
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-transparent text-[var(--cordel-text)] border-[var(--cordel-border)]/30'
                          }`}
                          title={lang === 'fr' ? 'Définir comme fin de boucle' : 'Definir como fim do loop'}
                        >
                          ]
                        </button>
                      </div>

                      {/* Measure Insertion / Deletion */}
                      <div className="flex gap-0.5 ml-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInsertMeasure && onInsertMeasure(mIdx);
                          }}
                          className="w-4 h-4 flex items-center justify-center rounded bg-emerald-600/10 text-emerald-700 hover:bg-emerald-700 hover:text-white border border-emerald-600/30 transition-colors font-bold text-[9px] cursor-pointer"
                          title={lang === 'fr' ? 'Insérer une mesure avant' : 'Inserir compasso antes'}
                        >
                          ➕
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(lang === 'fr' ? `Supprimer la mesure ${mIdx + 1} ?` : `Excluir o compasso ${mIdx + 1} ?`)) {
                              onDeleteMeasure && onDeleteMeasure(mIdx);
                            }
                          }}
                          className="w-4 h-4 flex items-center justify-center rounded bg-rose-600/10 text-rose-700 hover:bg-rose-700 hover:text-white border border-rose-600/30 transition-colors font-bold text-[9px] cursor-pointer"
                          title={lang === 'fr' ? 'Supprimer la mesure' : 'Excluir compasso'}
                        >
                          ✕
                        </button>
                      </div>

                    </span>

                    <div 
                      className="ruler-detailed flex items-center gap-1.5"
                      onClick={e => e.stopPropagation()}
                      onMouseDown={e => e.stopPropagation()}
                      onTouchStart={e => e.stopPropagation()}
                    >
                      {/* Signature rythmique */}
                      <select
                        value={mTimeSig}
                        onChange={e => onMeasureTimeSigChange(mIdx, e.target.value as TimeSignature)}
                        className="bg-[var(--cordel-bg)] text-[9px] font-cactus font-bold border border-[var(--cordel-border)]/50 rounded px-0.5 py-px outline-none cursor-pointer"
                        style={{ height: '18px' }}
                      >
                        <option value="4/4">4/4</option>
                        <option value="3/4">3/4</option>
                        <option value="2/4">2/4</option>
                        <option value="6/8">6/8</option>
                        <option value="12/8">12/8</option>
                      </select>

                      {/* BPM Input */}
                      <div className="flex items-center gap-0.5">
                        <span className="text-[8px] opacity-75">BPM:</span>
                        <input
                          type="number"
                          min={40}
                          max={240}
                          value={mBpm}
                          onChange={e => onMeasureBpmChange(mIdx, Math.round(Number(e.target.value)))}
                          className="w-10 bg-[var(--cordel-bg)] text-[9px] font-bold border border-[var(--cordel-border)]/50 rounded px-0.5 py-px text-center outline-none"
                          style={{ height: '18px' }}
                        />
                      </div>

                      {/* Transition Toggle */}
                      <button
                        onClick={() => onMeasureTransitionChange(mIdx, mTransition === 'immediate' ? 'ramp' : 'immediate')}
                        className={`px-1 py-px text-[9px] font-extrabold border rounded transition-colors cursor-pointer flex items-center justify-center`}
                        style={{ height: '18px', minWidth: '18px' }}
                        title={
                          mTransition === 'ramp'
                            ? (lang === 'fr' ? 'Transition progressive (Rampe)' : 'Transição progressiva (Rampa)')
                            : (lang === 'fr' ? 'Transition immédiate' : 'Transição imediata')
                        }
                      >
                        {mTransition === 'ramp' ? (
                          <span className="text-amber-600 dark:text-amber-500 font-black">↗</span>
                        ) : (
                          <span className="opacity-60">→</span>
                        )}
                      </button>

                      {/* Vol Input */}
                      <div className="flex items-center gap-0.5 ml-1.5 border-l border-[var(--cordel-border)]/20 pl-1.5">
                        <span className="text-[8px] opacity-75 font-cactus">VOL:</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={mVol}
                          onChange={e => onMeasureVolChange(mIdx, Math.max(0, Math.min(100, Math.round(Number(e.target.value)))))}
                          className="w-10 bg-[var(--cordel-bg)] text-[9px] font-bold border border-[var(--cordel-border)]/50 rounded px-0.5 py-px text-center outline-none"
                          style={{ height: '18px' }}
                        />
                        <span className="text-[8px] opacity-75">%</span>
                      </div>

                      {/* Vol Transition Toggle */}
                      <button
                        onClick={() => onMeasureVolTransitionChange(mIdx, mVolTransition === 'immediate' ? 'ramp' : 'immediate')}
                        className={`px-1 py-px text-[9px] font-extrabold border rounded transition-colors cursor-pointer flex items-center justify-center`}
                        style={{ height: '18px', minWidth: '18px' }}
                        title={
                          mVolTransition === 'ramp'
                            ? (lang === 'fr' ? 'Transition progressive (Fade)' : 'Transição progressiva (Fade)')
                            : (lang === 'fr' ? 'Transition immédiate' : 'Transição imediata')
                        }
                      >
                        {mVolTransition === 'ramp' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">↗</span>
                        ) : (
                          <span className="opacity-60">→</span>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="ruler-detailed flex w-full opacity-50 text-[8px] pb-0.5">
                    {Array.from({ length: localBeats }).map((_, b) => (
                      <span
                        key={b}
                        className="text-left pl-1 border-l border-[var(--cordel-border)]/10"
                        style={{ width: `${100 / localBeats}%` }}
                      >
                        {b + 1}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Quick Add Measure Button */}
            <div
              className="flex items-center justify-start px-4 z-40 bg-[var(--cordel-bg)] border-r border-[var(--cordel-border)]/30"
              style={{ width: 150, minWidth: 150 }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  const newTotal = Math.min(64, totalMeasures + 1);
                  if (newTotal > 20 && !hasAccess('mestre')) {
                    setShowSubModal(true);
                  } else {
                    onTotalMeasuresChange(newTotal);
                  }
                }}
                className="px-2 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] flex items-center justify-center gap-1 w-full"
                title={lang === 'fr' ? 'Ajouter une mesure' : 'Adicionar compasso'}
                style={{ height: '28px' }}
              >
                <span>➕</span>
                <span>{lang === 'fr' ? 'Mesure' : 'Compasso'}</span>
              </button>
            </div>
          </div>

          {/* ══════════ SIGNAUX DU RYTHME ROW ══════════ */}
          {rhythmSignals.length > 0 && (
            <div
              className="flex border-b border-[var(--cordel-border)]/20 h-8"
              style={{ width: `${HEADER_W + totalContentW + 150}px` }}
            >
              {/* Sticky header */}
              <div
                className={`sticky left-0 z-35 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center py-1 gap-1 ${
                  isMobile ? 'px-1' : 'px-2'
                }`}
                style={{ width: HEADER_W, minWidth: HEADER_W }}
              >
                <span className="text-base">🙌</span>
                {!isMobile && (
                  <span className="font-cactus text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-text)]">
                    {lang === 'fr' ? 'Signaux' : 'Sinais'}
                  </span>
                )}
              </div>

              {/* Measure signal cells */}
              {Array.from({ length: totalMeasures }).map((_, mIdx) => {
                const sigId = measureSignals[mIdx] ?? null;
                const activeSig = rhythmSignals.find(s => s.id === sigId) || null;
                const isSectionStart = mIdx % 4 === 0;
                const isCurrentMeasure = false;

                return (
                  <div
                    key={mIdx}
                    className={`relative border-r border-[var(--cordel-border)]/20 flex items-center justify-center ${
                      isCurrentMeasure ? 'bg-[var(--cordel-border)]/10' : ''
                    }`}
                    style={{ width: MEASURE_W, minWidth: MEASURE_W }}
                  >
                    {activeSig ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSignalDropdownOpen(signalDropdownOpen === mIdx ? null : mIdx);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--cordel-border)]/20 hover:bg-[var(--cordel-border)]/40 transition-colors rounded text-[9px] font-bold text-[var(--cordel-text)] max-w-full"
                        title={activeSig.name}
                      >
                        {activeSig.image ? (
                          <img src={activeSig.image} alt={activeSig.name} className="w-6 h-6 object-contain flex-shrink-0" />
                        ) : (
                          <span className="text-[12px] flex-shrink-0 leading-none">📢</span>
                        )}
                        <span className="ruler-detailed truncate max-w-[70px]">{activeSig.name}</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSignalDropdownOpen(signalDropdownOpen === mIdx ? null : mIdx);
                        }}
                        className="w-6 h-6 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)]/40 border border-dashed border-[var(--cordel-border)]/30 rounded text-[10px] font-bold hover:bg-[var(--cordel-border)]/20 hover:text-[var(--cordel-text)] transition-colors cursor-pointer"
                        title={lang === 'fr' ? 'Assigner un signal' : 'Atribuir um sinal'}
                      >
                        +
                      </button>
                    )}

                    {/* Dropdown de sélection */}
                    {signalDropdownOpen === mIdx && (
                      <div
                        className="absolute top-full left-0 z-50 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] cordel-shadow min-w-[140px] flex flex-col py-1"
                        style={{ marginTop: 2 }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Aucun signal */}
                        <button
                          onClick={() => {
                            onMeasureSignalChange?.(mIdx, null);
                            setSignalDropdownOpen(null);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/20 cursor-pointer text-left"
                        >
                          <span className="text-xs opacity-50">✕</span>
                          <span className="opacity-70">{lang === 'fr' ? 'Aucun' : 'Nenhum'}</span>
                        </button>
                        <div className="border-t border-[var(--cordel-border)]/20 my-0.5" />
                        {rhythmSignals.map(sig => (
                          <button
                            key={sig.id}
                            onClick={() => {
                              onMeasureSignalChange?.(mIdx, sig.id);
                              setSignalDropdownOpen(null);
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/20 cursor-pointer text-left ${
                              sigId === sig.id ? 'bg-[var(--cordel-border)]/30' : ''
                            }`}
                          >
                            {sig.image ? (
                              <img src={sig.image} alt={sig.name} className="w-6 h-6 object-contain flex-shrink-0" />
                            ) : (
                              <span className="text-[12px] w-6 h-6 flex items-center justify-center bg-black/10 rounded flex-shrink-0 leading-none">📢</span>
                            )}
                            <span className="truncate">{sig.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Spacer */}
              <div style={{ width: 150, minWidth: 150 }} />
            </div>
          )}

          {/* ══════════ TRACK ROWS ══════════ */}
          {tracks.map(track => (
            <TimelineTrackRow key={track.id} trackId={track.id} />
          ))}
          {/* ══════════ PLAYHEAD (Bypass React via Ref) ══════════ */}
          <TimelinePlayhead />

          {/* ══════════ SNAP GUIDE (📍 NEW) ══════════ */}
          {snapGuideX !== null && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 shadow-[0_0_8px_#f1c40f] z-50 pointer-events-none"
              style={{ left: `${snapGuideX}px` }}
            />
          )}
        </div>
      </div>

      {/* 📍 NEW - Panning Hotkey overlay tooltip (similar to sandbox) */}
      {isPanningActive && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-[var(--cordel-bg)] border border-[var(--cordel-border)]/50 rounded-full px-4 py-1.5 text-[10px] font-bold text-[var(--cordel-text)] cordel-shadow z-50 flex items-center gap-1.5 animate-pulse uppercase tracking-wider">
          <span>✋ {lang === 'fr' ? 'Mode Déplacement Actif' : 'Modo Arrastar Ativo'}</span>
          <span className="text-[8px] opacity-60 normal-case">{lang === 'fr' ? '(Glissez le fond pour scroller)' : '(Arraste o fundo para rolar)'}</span>
        </div>
      )}

      {/* Bottom legend */}
      {!isMobile && (
        <div className="h-8 border-t border-[var(--cordel-border)] flex items-center justify-center px-4 bg-[var(--cordel-bg)] text-[10px] font-bold opacity-80 uppercase tracking-widest gap-4 shrink-0">
          <span>💡 {lang === 'fr'
            ? 'Cliquer-glisser sur la règle ou utiliser la molette pour défiler · Cliquer sur la timeline pour naviguer'
            : 'Clique e arraste na régua ou use o scroll para navegar · Clique na timeline para navegar'}</span>
        </div>
      )}

      {/* ══════════ SECTION FORM MODAL ══════════ */}
      {sectionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-[460px] bg-[var(--cordel-bg)] text-[var(--cordel-text)] p-5 cordel-border-sm cordel-shadow flex flex-col gap-4">
            <h3 className="font-cactus text-xl font-bold uppercase border-b border-[var(--cordel-border)] pb-2 text-[var(--cordel-text)]">
              {editingSection 
                ? (lang === 'fr' ? 'Modifier la Section' : 'Editar Seção')
                : (lang === 'fr' ? 'Créer une Section' : 'Criar Seção')}
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">{lang === 'fr' ? 'Nom de la section' : 'Nome da seção'}</label>
              <input
                type="text"
                value={sectionFormName}
                onChange={(e) => setSectionFormName(e.target.value)}
                placeholder="Ex: Partie A / Refrain"
                className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-3 py-1.5 text-sm font-bold outline-none rounded-none focus:bg-[var(--cordel-border)]/10 text-[var(--cordel-text)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">{lang === 'fr' ? 'Début (Mesure)' : 'Compasso inicial'}</label>
                <input
                  type="number"
                  min={1}
                  max={totalMeasures}
                  value={sectionFormStart}
                  onChange={(e) => setSectionFormStart(e.target.value)}
                  onBlur={() => {
                    let val = parseInt(String(sectionFormStart)) || 1;
                    val = Math.max(1, Math.min(totalMeasures, val));
                    setSectionFormStart(val);
                    let endVal = parseInt(String(sectionFormEnd)) || 1;
                    if (endVal < val) {
                      setSectionFormEnd(val);
                    }
                  }}
                  className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-2 py-1.5 text-sm font-bold outline-none rounded-none text-center text-[var(--cordel-text)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">{lang === 'fr' ? 'Fin (Mesure)' : 'Compasso final'}</label>
                <input
                  type="number"
                  min={sectionFormStart}
                  max={totalMeasures}
                  value={sectionFormEnd}
                  onChange={(e) => setSectionFormEnd(e.target.value)}
                  onBlur={() => {
                    let val = parseInt(String(sectionFormEnd)) || 1;
                    let startVal = parseInt(String(sectionFormStart)) || 1;
                    val = Math.max(startVal, Math.min(totalMeasures, val));
                    setSectionFormEnd(val);
                  }}
                  className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-2 py-1.5 text-sm font-bold outline-none rounded-none text-center text-[var(--cordel-text)]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">{lang === 'fr' ? 'Couleur du bloc' : 'Cor do bloco'}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  { value: '#e08283', label: 'Rouge' },
                  { value: '#f19066', label: 'Orange' },
                  { value: '#f5cd79', label: 'Jaune' },
                  { value: '#55efc4', label: 'Vert d\'eau' },
                  { value: '#74b9ff', label: 'Bleu pastel' },
                  { value: '#a29bfe', label: 'Violet doux' },
                  { value: '#eaddcf', label: 'Cordel beige' }
                ].map((colorOpt) => (
                  <button
                    key={colorOpt.value}
                    onClick={() => setSectionFormColor(colorOpt.value)}
                    className={`w-7 h-7 rounded-full cursor-pointer cordel-border-sm transition-transform ${
                      sectionFormColor === colorOpt.value ? 'scale-115 ring-2 ring-[var(--cordel-text)]' : 'opacity-85'
                    }`}
                    style={{ backgroundColor: colorOpt.value }}
                    title={colorOpt.label}
                  />
                ))}
              </div>
            </div>
            <div className="mb-3.5">
              <label className="block text-xs font-bold mb-1.5 opacity-90">{lang === 'fr' ? 'Niveau d\'imbrication' : 'Nível de aninhamento'}</label>
              <select
                value={sectionFormLevel}
                onChange={(e) => setSectionFormLevel(parseInt(e.target.value))}
                className="w-full bg-white/10 border border-[var(--cordel-border)]/50 rounded p-1.5 text-xs text-[var(--cordel-text)] outline-none focus:border-[var(--cordel-border)]"
              >
                <option value={0} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">{lang === 'fr' ? 'Niveau 0 (Base)' : 'Nível 0 (Base)'}</option>
                <option value={1} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">{lang === 'fr' ? 'Niveau 1 (Groupe)' : 'Nível 1 (Grupo)'}</option>
                <option value={2} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">{lang === 'fr' ? 'Niveau 2 (Super-groupe)' : 'Nível 2 (Super-grupo)'}</option>
              </select>
            </div>

            <div className="flex flex-wrap justify-end gap-2.5 mt-2 border-t border-[var(--cordel-border)]/30 pt-3">
              <div className="flex flex-wrap gap-2.5 mr-auto">
                {editingSection && onSaveCloudSection && (
                  <button
                    onClick={() => {
                      onSaveCloudSection(editingSection);
                      setSectionModalOpen(false);
                    }}
                    className="px-3 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[#6b1e11]"
                    title={lang === 'fr' ? 'Sauvegarder dans le Cloud' : 'Salvar na Nuvem'}
                  >
                    ☁️ {lang === 'fr' ? 'Sauvegarder' : 'Salvar'}
                  </button>
                )}
                {onLoadCloudSection && (
                  <button
                    onClick={() => {
                      let startVal = parseInt(String(sectionFormStart)) || 1;
                      startVal = Math.max(1, Math.min(totalMeasures, startVal));
                      onLoadCloudSection(startVal - 1);
                      setSectionModalOpen(false);
                    }}
                    className="px-3 py-1.5 bg-white/10 text-[var(--cordel-text)] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-white/20"
                    title={lang === 'fr' ? 'Importer une Section' : 'Importar uma Seção'}
                  >
                    📥 {lang === 'fr' ? 'Importer' : 'Importar'}
                  </button>
                )}
              </div>
              <button
                onClick={() => setSectionModalOpen(false)}
                className="px-3 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
              >
                {lang === 'fr' ? 'Annuler' : 'Cancelar'}
              </button>
               <button
                onClick={() => {
                  if (!sectionFormName.trim()) return;
                  let startVal = parseInt(String(sectionFormStart)) || 1;
                  startVal = Math.max(1, Math.min(totalMeasures, startVal));
                  let endVal = parseInt(String(sectionFormEnd)) || 1;
                  endVal = Math.max(startVal, Math.min(totalMeasures, endVal));
                  if (editingSection) {
                    onUpdateSection(editingSection.id, sectionFormName, startVal - 1, endVal - 1, sectionFormColor, sectionFormLevel);
                  } else {
                    onCreateSection(sectionFormName, startVal - 1, endVal - 1, sectionFormColor, 1, sectionFormLevel);
                  }
                  setSectionModalOpen(false);
                }}
                className="px-4 py-1.5 bg-[var(--cordel-wood)] text-[#f4ecd8] border border-[var(--cordel-border)] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
              >
                {lang === 'fr' ? 'Valider' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tablature Export Modal removed (lifted to App.tsx) */}
      {showSubModal && (
        <SubscriptionModal lang={lang} onClose={() => setShowSubModal(false)} />
      )}
    </div>
    </TimelineUIContext.Provider>
  );
}, (prev, next) => {
  return prev.isMobile === next.isMobile && 
         prev.measureWidth === next.measureWidth && 
         prev.mestreSignals === next.mestreSignals;
});
