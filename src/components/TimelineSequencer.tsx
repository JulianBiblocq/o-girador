/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSequencerStore, isLinearDAWVisibleTrack, isToadaBus } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '@/src/ToneLoader';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}
import { TrackGroup, Language, TimeSignature, SongSection, PresetMetadata, RhythmSignal, CloudRhythmSignal, SongMarker } from '../types';
import { ASSETS_BASE_URL, instrumentsConfig, getMaxTicks, getMarkers, isDarkText, getVisualStrokeSymbol } from '../data';
import { CompactPatternRenderer } from './CompactPatternRenderer';
import { TimelineTrackRow } from './TimelineTrackRow';
import { TimelinePlayhead } from './TimelinePlayhead';
import { CompassoSelector } from './CompassoSelector';
import { getExpandedMeasures } from '../utils/measureHelpers';
import { StepEditorPopup } from './StepEditorPopup';
import { useTimelineEditStore } from '../stores/useTimelineEditStore';
import { useSequencer } from '../contexts/SequencerContext';

import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { useAudio } from '../contexts/AudioContext';
import { subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionModal } from './SubscriptionModal';
import { TimelineMinimap } from './timeline/TimelineMinimap';
import { SongSectionModal } from './timeline/SongSectionModal';
import { SongMarkerModal } from './timeline/SongMarkerModal';
import { RhythmSignalsRow } from './timeline/RhythmSignalsRow';
import { VocalRecordingBar } from './VocalRecordingBar';
import { XiloChisel, XiloMagnet } from './XiloIcons';

interface TimelineSequencerProps {
  isMobile: boolean;
  measureWidth: number;
  onMeasureWidthChange: (width: number) => void;
  onExportTablature?: () => void;
  mestreSignals?: CloudRhythmSignal[];
  onSaveCloudSection?: (section: SongSection) => void;
  onLoadCloudSection?: (insertAtMeasure: number) => void;
  isActive?: boolean;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
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
  isActive = true,
  onStepTouchStart,
}) => {
  const sequencer = useSequencer();
  const { hasAccess } = useAuth();
  const [showSubModal, setShowSubModal] = React.useState(false);
  const { isPlaying } = useAudio();

  // 🛡️ FIX (Audit): Direct Zustand selectors to avoid massive cascade re-renders
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const measureTimeSigs = useSequencerStore(useShallow(state => state.measureTimeSigs));
  const measureBpms = useSequencerStore(useShallow(state => state.measureBpms));
  const measureBpmTransitions = useSequencerStore(useShallow(state => state.measureBpmTransitions));
  const measureVols = useSequencerStore(useShallow(state => state.measureVols));
  const measureVolTransitions = useSequencerStore(useShallow(state => state.measureVolTransitions));
  const songSections = useSequencerStore(useShallow(state => state.songSections));
  const songMarkers = useSequencerStore(useShallow(state => state.songMarkers));
  const copiedSection = useSequencerStore(state => state.copiedSection);
  const loopStartMeasure = useSequencerStore(state => state.loopStartMeasure);
  const loopEndMeasure = useSequencerStore(state => state.loopEndMeasure);
  const isLoopRegionActive = useSequencerStore(state => state.isLoopRegionActive);
  const measureSignals = useSequencerStore(useShallow(state => state.measureSignals || []));

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
    handleCreateSongMarker: onCreateMarker,
    handleUpdateSongMarker: onUpdateMarker,
    handleDeleteSongMarker: onDeleteMarker,
    handleCopySongSection: onCopySection,
    handlePasteSongSection: onPasteSection,
    handleSetLoopStart: onSetLoopStart,
    handleSetLoopEnd: onSetLoopEnd,
    handleClearLoop: onClearLoop,
    handleDeleteMeasure: onDeleteMeasure,
    handleInsertMeasure: onInsertMeasure,
  } = sequencer;
  const trackIds = useSequencerStore(useShallow(state => {
    const visibleTrackIds: number[] = [];
    state.tracks.forEach(t => {
      if (isLinearDAWVisibleTrack(t, state.tracks)) {
        visibleTrackIds.push(t.id);
        if (isToadaBus(t) && !t.isSequencerFolded) {
          const puxTrack = state.tracks.find(child => instrumentsConfig[child.instrumentIdx]?.id === 'puxador');
          const coroTrack = state.tracks.find(child => instrumentsConfig[child.instrumentIdx]?.id === 'coro');
          if (puxTrack) visibleTrackIds.push(puxTrack.id);
          if (coroTrack) visibleTrackIds.push(coroTrack.id);
        }
        if (t.isLinkMaster) {
          const parentBus = state.tracks.find(p => String(p.id) === String(t.linkedToTrackId) && p.isLinkFolder);
          if (parentBus && !parentBus.isSequencerFolded) {
            const slaves = state.tracks.filter(child => 
              String(child.linkedToTrackId) === String(parentBus.id) && 
              !child.isLinkFolder && 
              !child.isLinkMaster
            );
            slaves.forEach(slave => visibleTrackIds.push(slave.id));
          }
        }
      }
    });
    return visibleTrackIds;
  }));

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
  const HEADER_W = isMobile ? 80 : (isMacro ? 200 : 230);
  const MEASURE_W = measureWidth;
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // --- Horizontal measures virtualization ---
  const [visibleRange, setVisibleRange] = React.useState(() => {
    const initialWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const initialVisible = Math.ceil((initialWidth - HEADER_W) / MEASURE_W);
    return { start: 0, end: Math.min(totalMeasures - 1, initialVisible + 2) };
  });

  const updateVisibleRange = React.useCallback(() => {
    const el = scrollRef.current;
    const currentMeasureW = measureWidthRef.current;
    
    let scrollLeft = 0;
    let viewportWidth = typeof window !== 'undefined' ? window.innerWidth - HEADER_W : 1200;
    
    if (el) {
      // 🛡️ Performance / CPU impact check: Clamping scrollLeft programmatically 
      // avoids layout shifts, double-commit loops and layout thrashing (Reflow/Paint)
      const maxScrollLeft = Math.max(0, totalMeasures * currentMeasureW - (el.clientWidth - HEADER_W));
      if (el.scrollLeft > maxScrollLeft) {
        el.scrollLeft = maxScrollLeft;
      }
      scrollLeft = el.scrollLeft;
      viewportWidth = el.clientWidth - HEADER_W;
    }
    
    const buffer = 2; // 2 measures buffer on each side
    let start = Math.max(0, Math.floor(scrollLeft / currentMeasureW) - buffer);
    const end = Math.min(
      totalMeasures - 1,
      Math.ceil((scrollLeft + viewportWidth) / currentMeasureW) + buffer
    );
    
    // Safety check: ensure start never exceeds end if layout is in transition
    if (start > end) {
      start = Math.max(0, end - buffer);
    }

    React.startTransition(() => {
      setVisibleRange(prev => {
        if (prev.start === start && prev.end === end) return prev;
        return { start, end };
      });
    });
  }, [totalMeasures, HEADER_W]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      updateVisibleRange();
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    updateVisibleRange();

    const resizeObserver = new ResizeObserver(() => {
      updateVisibleRange();
    });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [updateVisibleRange, scrollRef.current, isActive]);

  useEffect(() => {
    updateVisibleRange();
  }, [measureWidth, totalMeasures, updateVisibleRange]);

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

  // Cache O(1) pour stocker les références DOM sans provoquer de re-rendu
  const sequencerCache = useRef({
    lastMeasure: null as number | null,
    stepsCount: 16,
    stepElementsMap: new Map<number, HTMLElement[]>(),
    activeElements: [] as HTMLElement[]
  });

  // high-frequency DOM manipulation for playback highlighting (Zero Render Thrashing)
  useEffect(() => {
    if (!isActive) {
      sequencerCache.current.activeElements.forEach(el => {
        el.classList.remove('live-playhead-highlight');
      });
      sequencerCache.current.activeElements = [];
      return;
    }

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number; time?: number }) => {
      const { step, measure, maxTicks, ratio = step / maxTicks } = detail;
      
      const cache = sequencerCache.current;

      const isEco = useSequencerStore.getState().isEcoMode || (window as any).oGiradorVisualEcoMode;
      if (isEco) return;

      if (step < 0) {
        cache.lastMeasure = null;
        cache.stepElementsMap.clear();
        cache.activeElements.forEach((el) => {
          el.classList.remove('live-playhead-highlight');
        });
        cache.activeElements = [];
        return;
      }

      // 1. MISE EN CACHE (Exécutée UNIQUEMENT lors d'un changement de mesure)
      if (measure !== cache.lastMeasure) {
        cache.lastMeasure = measure;
        cache.stepElementsMap.clear();
        cache.stepsCount = 16;

        if (containerRef.current) {
          const cells = containerRef.current.querySelectorAll<HTMLElement>(
            `.timeline-step[data-measure="${measure}"]`
          );

          cells.forEach((el) => {
            const stepAttr = el.getAttribute('data-step');
            const stepsAttr = el.getAttribute('data-steps');
            
            if (stepAttr !== null) {
              const stepIdx = parseInt(stepAttr, 10);
              if (!cache.stepElementsMap.has(stepIdx)) {
                cache.stepElementsMap.set(stepIdx, []);
              }
              cache.stepElementsMap.get(stepIdx)!.push(el);
            }
            if (stepsAttr !== null) {
              cache.stepsCount = parseInt(stepsAttr, 10);
            }
          });
        }
      }

      // 2. NETTOYAGE CIBLÉ DE L'ANCIENNE FRAME (0 requête DOM synchrone)
      cache.activeElements.forEach((el) => {
        el.classList.remove('live-playhead-highlight');
      });
      cache.activeElements = []; 

      // 3. APPLICATION DU NOUVEAU SURLIGNAGE VIA CACHE O(1)
      const activeStepIdx = Math.floor(ratio * cache.stepsCount);
      const elementsToHighlight = cache.stepElementsMap.get(activeStepIdx);
      if (elementsToHighlight) {
        elementsToHighlight.forEach((el) => {
          el.classList.add('live-playhead-highlight');
          cache.activeElements.push(el); // Sauvegarde pour nettoyage au tick suivant
        });
      }
    };

    subscribeToTick(handleTick);

    return () => {
      unsubscribeFromTick(handleTick);
      // Nettoyage de sécurité au démontage
      sequencerCache.current.activeElements.forEach((el) => {
        el.classList.remove('live-playhead-highlight');
      });
      sequencerCache.current.activeElements = [];
      sequencerCache.current.lastMeasure = null;
      sequencerCache.current.stepElementsMap.clear();
    };
  }, [isActive]);

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



  // Song Section modals state
  const [sectionModalOpen, setSectionModalOpen] = React.useState<boolean>(false);
  const [editingSection, setEditingSection] = React.useState<SongSection | null>(null);
  
  // Marker modal state
  const [markerModalOpen, setMarkerModalOpen] = React.useState<boolean>(false);
  const [editingMarker, setEditingMarker] = React.useState<SongMarker | null>(null);
  const [defaultMarkerMeasure, setDefaultMarkerMeasure] = React.useState<number>(1);

  const [hoveredPasteMeasure, setHoveredPasteMeasure] = React.useState<number | null>(null);
  const [signalDropdownOpen, setSignalDropdownOpen] = React.useState<number | null>(null);
  const [activeRepeatDropdownSectionId, setActiveRepeatDropdownSectionId] = useState<string | null>(null);

  // States for Click & Drag section creation (Proposal 2)
  const [isDraggingRange, setIsDraggingRange] = React.useState<boolean>(false);
  const [dragStartMeasure, setDragStartMeasure] = React.useState<number | null>(null);
  const [dragCurrentMeasure, setDragCurrentMeasure] = React.useState<number | null>(null);
  const [quickSectionRange, setQuickSectionRange] = React.useState<{ start: number; end: number } | null>(null);
  const [quickSectionName, setQuickSectionName] = React.useState<string>('');
  const [quickSectionColor, setQuickSectionColor] = React.useState<string>('#f19066');
  const [quickSectionLevel, setQuickSectionLevel] = React.useState<number>(0);

  // Global pointerup listener to finalize dragging
  React.useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDraggingRange && dragStartMeasure !== null && dragCurrentMeasure !== null) {
        const start = Math.min(dragStartMeasure, dragCurrentMeasure);
        const end = Math.max(dragStartMeasure, dragCurrentMeasure);
        
        setQuickSectionRange({ start, end });
        setQuickSectionName(lang === 'fr' ? `Partie ${String.fromCharCode(65 + songSections.length)}` : `Parte ${String.fromCharCode(65 + songSections.length)}`);
        setQuickSectionColor('#f19066');
        setQuickSectionLevel(0);
      }
      setIsDraggingRange(false);
      setDragStartMeasure(null);
      setDragCurrentMeasure(null);
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [isDraggingRange, dragStartMeasure, dragCurrentMeasure, lang, songSections.length]);

  const handleEmptySlotPointerDown = (e: React.PointerEvent, mIdx: number) => {
    if (e.button !== 0) return; // Clic gauche seulement
    setIsDraggingRange(true);
    setDragStartMeasure(mIdx);
    setDragCurrentMeasure(mIdx);
    setQuickSectionRange(null); // ferme la popover existante
  };

  const handleEmptySlotPointerEnter = (mIdx: number) => {
    if (isDraggingRange && dragStartMeasure !== null) {
      setDragCurrentMeasure(mIdx);
    }
  };

  const handlePlusClick = (mIdx: number) => {
    setQuickSectionRange({ start: mIdx, end: mIdx });
    setQuickSectionName(lang === 'fr' ? `Partie ${String.fromCharCode(65 + songSections.length)}` : `Parte ${String.fromCharCode(65 + songSections.length)}`);
    setQuickSectionColor('#f19066');
    setQuickSectionLevel(0);
  };

  const handleQuickSectionCreate = () => {
    if (!quickSectionRange) return;
    const name = quickSectionName.trim() || (lang === 'fr' ? 'Sans titre' : 'Sem título');
    onCreateSection(
      name,
      quickSectionRange.start,
      quickSectionRange.end,
      quickSectionColor,
      1, // default repeatCount
      quickSectionLevel
    );
    setQuickSectionRange(null);
  };

  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveRepeatDropdownSectionId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const expanded = useMemo(() => getExpandedMeasures(totalMeasures, songSections), [totalMeasures, songSections]);

  const measureLabelsMap = useMemo(() => {
    const map = new Map<number, string>();
    for (let mIdx = 0; mIdx < totalMeasures; mIdx++) {
      const globalIndices: number[] = [];
      expanded.forEach((item, expIdx) => {
        if (item.baseMeasure === mIdx) {
          globalIndices.push(expIdx + 1);
        }
      });
      const prefix = lang === 'fr' ? 'M.' : 'C.';
      if (globalIndices.length === 0) {
        map.set(mIdx, `${prefix}${mIdx + 1}`);
      } else {
        map.set(mIdx, `${prefix}${globalIndices.join('.')}`);
      }
    }
    return map;
  }, [expanded, totalMeasures, lang]);

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

  // Écouteur global keydown pour la saisie clavier directe sur la case survolée (Étape 5)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Exclusion si en cours de lecture (Contrainte 1)
      if (isPlaying) {
        return;
      }

      // 2. Exclusion stricte des champs de saisie de texte
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      )) {
        return;
      }

      // Touche Escape pour fermer la popup ou vider la cellule
      if (e.key === 'Escape') {
        const isPopupOpen = useTimelineEditStore.getState().activeStepKey !== null;
        if (isPopupOpen) {
          useTimelineEditStore.getState().closeEditor();
          e.preventDefault();
        } else {
          const hovered = (window as any).activeHoveredStep;
          if (hovered) {
            sequencer.handleTrackStepValueChange(
              hovered.trackId,
              hovered.patternId,
              hovered.stepIdx,
              '0'
            );
            e.preventDefault();
          }
        }
        return;
      }

      // Vérifier s'il y a une cellule survolée
      const hovered = (window as any).activeHoveredStep;
      if (!hovered) return;

      const { trackId, patternId, stepIdx, allowedStrokes } = hovered;

      // Touche '0' ou 'Backspace' ou 'Delete' pour vider le pas
      if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
        sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, '0');
        e.preventDefault();
        return;
      }

      // Si la touche correspond à l'un des raccourcis autorisés (insensible à la casse)
      const targetStroke = allowedStrokes.find(
        (s: string) => String(s).toLowerCase() === e.key.toLowerCase()
      );

      if (targetStroke) {
        sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, String(targetStroke));
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isPlaying]);

  const handleRulerClickOrDrag = (clientX: number) => {
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left - HEADER_W + scrollRef.current.scrollLeft;
    const { totalMeasures: tMeasures, measureTimeSigs: mSigs } = propsRef.current;
    
    let measureIdx = 0;
    if (relativeX < 0) {
      measureIdx = 0;
    } else {
      measureIdx = Math.floor(relativeX / MEASURE_W);
    }
    
    if (measureIdx >= tMeasures) {
      measureIdx = tMeasures - 1;
    }
    
    // Trouver la première itération correspondante dans expanded
    const firstMatchIdx = expanded.findIndex(item => item.baseMeasure === measureIdx);
    const targetIteration = firstMatchIdx !== -1 ? expanded[firstMatchIdx].iteration : 1;
    
    if (firstMatchIdx !== -1) {
      useSequencerStore.getState().setCurrentExpandedMeasureIdx(firstMatchIdx);
    }

    window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', { 
      detail: { 
        mIdx: measureIdx, 
        sIdx: 0,
        iteration: targetIteration
      } 
    }));
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
      
      let rafId: number | null = null;
      let latestClientY = e.clientY;
      let latestClientX = e.clientX;

      const performRulerDrag = (clientX: number, clientY: number, isFinal: boolean = false) => {
        const deltaY = clientY - initialY;
        let clamped = initialWidth;
        // Si le mouvement est principalement vertical, on zoome
        if (Math.abs(deltaY) > 5) {
          const newWidth = initialWidth + deltaY * 2;
          clamped = Math.max(120, Math.min(960, newWidth));
          
          React.startTransition(() => {
            const S = clamped / initialWidth;
            if (scrollRef.current) {
              const rect = scrollRef.current.getBoundingClientRect();
              const mouseX = clientX - rect.left - HEADER_W;
              const scrollLeftInit = scrollRef.current.scrollLeft;
              const mouseXGrid = mouseX + scrollLeftInit;
              const newScrollLeft = mouseXGrid * S - mouseX;
              pendingScrollLeft.current = newScrollLeft;
              scrollRef.current.scrollLeft = newScrollLeft;
            }
            onMeasureWidthChange(clamped);
          });
        }
        // Scrubbing horizontal
        if (isFinal || Math.abs(deltaY) <= 5) {
          handleRulerClickOrDrag(clientX);
        }
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        latestClientX = moveEvent.clientX;
        latestClientY = moveEvent.clientY;
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            performRulerDrag(latestClientX, latestClientY, false);
          });
        }
      };
      
      const onPointerUp = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        performRulerDrag(latestClientX, latestClientY, true); // Ensure final values are applied
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
      if ((window as any).oGiradorDetailEditorOpen) return;
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



  // Section Marker double-click and drag handlers
  const handleMarkerRulerDblClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    let measureIdx = Math.floor(clickX / MEASURE_W);
    measureIdx = Math.max(0, Math.min(totalMeasures - 1, measureIdx));
    
    setEditingMarker(null);
    setDefaultMarkerMeasure(measureIdx + 1);
    setMarkerModalOpen(true);
  };

  const handleMarkerPointerDown = (e: React.PointerEvent<HTMLDivElement>, marker: SongMarker) => {
    if (toolMode === 'hand' || isSpacePressed) return;
    if (e.button !== 0) return;
    const el = e.currentTarget;
    if (typeof el.setPointerCapture === 'function') {
      el.setPointerCapture(e.pointerId);
    }
    el.setAttribute('data-has-moved', 'false');
    
    const startX = e.clientX;
    const startMeasure = marker.measure;
    
    const handlePointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      if (Math.abs(dx) > 3) {
        el.setAttribute('data-has-moved', 'true');
      }
      
      const proposedStart = startMeasure + (dx / MEASURE_W);
      
      let snappedStart = marker.measure;
      if (snapMode === 'measure') {
        snappedStart = Math.round(proposedStart);
      } else if (snapMode === 'beat') {
        snappedStart = Math.round(proposedStart * 4) / 4;
      } else {
        snappedStart = proposedStart;
      }
      
      snappedStart = Math.max(0, Math.min(totalMeasures - 1, snappedStart));
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
      
      const finalLeft = parseFloat(el.style.left) || (marker.measure * MEASURE_W);
      const finalStart = Math.max(0, Math.min(totalMeasures - 1, Math.round(finalLeft / MEASURE_W)));
      
      if (finalStart !== marker.measure) {
        onUpdateMarker(marker.id, marker.name, finalStart, marker.color);
      } else {
        el.style.left = `${marker.measure * MEASURE_W}px`;
      }
    };
    
    if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
    dragAbortControllerRef.current = new AbortController();
    const { signal } = dragAbortControllerRef.current;
    
    window.addEventListener('pointermove', handlePointerMove, { signal });
    window.addEventListener('pointerup', handlePointerUp, { signal });
    e.stopPropagation();
  };

  // Section Block Drag-and-Drop Handler (Smart Snapping & Level Dragging)
  const handleSectionBlockPointerDown = (e: React.PointerEvent<HTMLDivElement>, section: SongSection) => {
    if (toolMode === 'hand' || isSpacePressed) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.button !== 0) return;
    
    const el = e.currentTarget;
    if (typeof el.setPointerCapture === 'function') {
      el.setPointerCapture(e.pointerId);
    }
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startMeasure = section.startMeasure;
    const startLevel = section.level || 0;
    const duration = section.endMeasure - section.startMeasure;
    const maxLevel = Math.max(0, ...songSections.map(s => s.level || 0));
    
    const handlePointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;
      
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
      
      const proposedLevel = Math.max(0, Math.min(2, startLevel + Math.round(-dy / 26)));
      const currentTop = (maxLevel - proposedLevel) * 26 + 4;
      el.style.top = `${currentTop}px`;
      
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
      
      const finalTop = parseFloat(el.style.top) ?? ((maxLevel - (section.level || 0)) * 26 + 4);
      const finalLevel = Math.max(0, Math.min(2, maxLevel - Math.round((finalTop - 4) / 26)));
      
      if (finalStart !== section.startMeasure || finalLevel !== (section.level || 0)) {
        onUpdateSection(section.id, section.name, finalStart, finalEnd, section.color, finalLevel);
      } else {
        el.style.left = `${section.startMeasure * MEASURE_W}px`;
        el.style.top = `${((maxLevel - (section.level || 0)) * 26 + 4)}px`;
      }
    };
    
    if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
    dragAbortControllerRef.current = new AbortController();
    const { signal } = dragAbortControllerRef.current;
    
    window.addEventListener('pointermove', handlePointerMove, { signal });
    window.addEventListener('pointerup', handlePointerUp, { signal });
    e.stopPropagation();
  };

  // Section boundary resizing handler with magnetic snapping (Proposal 2)
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    section: SongSection,
    edge: 'left' | 'right'
  ) => {
    e.stopPropagation(); // Avoid triggering block dragging
    if (e.button !== 0) return;

    const el = e.currentTarget.parentElement as HTMLDivElement;
    if (!el) return;
    if (typeof el.setPointerCapture === 'function') {
      el.setPointerCapture(e.pointerId);
    }

    const startX = e.clientX;
    const startMeasure = section.startMeasure;
    const endMeasure = section.endMeasure;

    const handlePointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      const measureDelta = dx / MEASURE_W;

      if (edge === 'left') {
        const proposedStart = startMeasure + measureDelta;
        let snappedStart = startMeasure;
        if (snapMode === 'measure') {
          snappedStart = Math.round(proposedStart);
        } else if (snapMode === 'beat') {
          snappedStart = Math.round(proposedStart * 4) / 4;
        } else {
          snappedStart = proposedStart;
        }

        snappedStart = Math.max(0, Math.min(endMeasure, snappedStart));
        const currentLeft = snappedStart * MEASURE_W;
        const currentWidth = (endMeasure - snappedStart + 1) * MEASURE_W;

        el.style.left = `${currentLeft}px`;
        el.style.width = `${currentWidth - 8}px`;
      } else {
        const proposedEnd = endMeasure + measureDelta;
        let snappedEnd = endMeasure;
        if (snapMode === 'measure') {
          snappedEnd = Math.round(proposedEnd);
        } else if (snapMode === 'beat') {
          snappedEnd = Math.round(proposedEnd * 4) / 4;
        } else {
          snappedEnd = proposedEnd;
        }

        snappedEnd = Math.max(startMeasure, Math.min(totalMeasures - 1, snappedEnd));
        const currentWidth = (snappedEnd - startMeasure + 1) * MEASURE_W;
        el.style.width = `${currentWidth - 8}px`;
      }
    };

    const handlePointerUp = () => {
      if (typeof el.releasePointerCapture === 'function') {
        el.releasePointerCapture(e.pointerId);
      }
      if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();

      const currentLeft = parseFloat(el.style.left) || (section.startMeasure * MEASURE_W);
      const currentWidth = (parseFloat(el.style.width) || 0) + 8;

      const finalStart = Math.max(0, Math.min(totalMeasures - 1, Math.round(currentLeft / MEASURE_W)));
      const finalEnd = Math.max(finalStart, Math.min(totalMeasures - 1, finalStart + Math.round(currentWidth / MEASURE_W) - 1));

      if (finalStart !== section.startMeasure || finalEnd !== section.endMeasure) {
        onUpdateSection(section.id, section.name, finalStart, finalEnd, section.color, section.level);
      } else {
        el.style.left = `${section.startMeasure * MEASURE_W}px`;
        el.style.width = `${(section.endMeasure - section.startMeasure + 1) * MEASURE_W - 8}px`;
      }
    };

    if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
    dragAbortControllerRef.current = new AbortController();
    const { signal } = dragAbortControllerRef.current;

    window.addEventListener('pointermove', handlePointerMove, { signal });
    window.addEventListener('pointerup', handlePointerUp, { signal });
  };



  const zoomStyles = {
    '--zoom-level': String(measureWidth / 480),
    '--measure-width': `${measureWidth}px`,
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    userSelect: 'none',
  } as React.CSSProperties;

  const contextValue = React.useMemo(() => ({
    MEASURE_W, HEADER_W, totalContentW, isMobile, isMacro, isMinZoom, isPanningActive, lang,
    signalDropdownOpen, setSignalDropdownOpen
  }), [MEASURE_W, HEADER_W, totalContentW, isMobile, isMacro, isMinZoom, isPanningActive, lang, signalDropdownOpen]);

  if (!trackIds) return null;

  return (
    <TimelineUIContext.Provider value={contextValue}>
    <div
      ref={containerRef}
      data-zoom={isMacro ? 'macro' : 'normal'}
      data-mobile={isMobile ? 'true' : 'false'}
      style={{ ...zoomStyles, touchAction: 'pan-x pan-y', display: isActive ? 'flex' : 'none' }}
      className={`timeline-sequencer-container flex-1 min-h-0 flex flex-col w-full h-full overflow-hidden sequencer-bg text-[var(--cordel-text)] select-none ${isPlaying ? 'pointer-events-none' : ''}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ══════════ TIMELINE OVERVIEW (MINI-MAP) ══════════ */}
      <TimelineMinimap
        scrollRef={scrollRef}
        pendingScrollLeftRef={pendingScrollLeft}
        totalMeasures={totalMeasures}
        measureWidth={measureWidth}
        onMeasureWidthChange={onMeasureWidthChange}
      />

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
        <div 
          className="relative timeline-scroll-grid" 
          style={{ width: `${HEADER_W + totalContentW + 150}px`, minWidth: `${HEADER_W + totalContentW + 150}px`, minHeight: '100%', transformOrigin: '0 0' }}
        >

          {/* ══════════ MARKER RULER ROW (📍 NEW) ══════════ */}
          <div
            className="flex h-6 border-b border-[var(--cordel-border)]/15 bg-[var(--cordel-bg)]/50 relative select-none"
            style={{ width: `${HEADER_W + totalContentW + 150}px`, minWidth: `${HEADER_W + totalContentW + 150}px` }}
          >
            {/* Sticky Label */}
            <div
              className={`timeline-sticky-header sticky left-0 z-40 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center justify-between font-cactus text-[9px] font-bold uppercase shrink-0 text-[var(--cordel-text)]/40 ${
                isMobile ? 'px-1.5' : 'px-3'
              }`}
              style={{ width: HEADER_W, minWidth: HEADER_W, transformOrigin: '0 0' }}
            >
              <span>{isMobile ? 'Rep.' : (lang === 'fr' ? 'Repères' : 'Marcadores')}</span>
            </div>

            {/* Marker Ruler Track Area */}
            <div 
              className="flex-grow relative h-full cursor-copy"
              onDoubleClick={handleMarkerRulerDblClick}
            >
              {songMarkers.length === 0 && (
                <div className="absolute inset-0 flex items-center pl-4 text-[8px] text-[var(--cordel-text)]/20 italic pointer-events-none">
                  {lang === 'fr' ? 'Double-cliquez ici pour ajouter un repère' : 'Double-clique aqui para adicionar um marcador'}
                </div>
              )}

              {/* Render Section Markers */}
              {songMarkers.map((marker) => {
                const posX = marker.measure * MEASURE_W;
                return (
                  <div
                    key={`marker-${marker.id}`}
                    className={`absolute top-1 h-[16px] px-2 rounded-full text-[9px] font-bold text-white flex items-center gap-1 shadow-sm cursor-grab select-none hover:brightness-110 active:cursor-grabbing transform -translate-x-1/2 border border-black/10 z-40 ${
                      isPanningActive ? 'pointer-events-none' : ''
                    }`}
                    style={{
                      left: `${posX}px`,
                      backgroundColor: marker.color || '#f19066',
                    }}
                    onPointerDown={(e) => handleMarkerPointerDown(e, marker)}
                    onClick={(e) => {
                      if ((e.currentTarget as HTMLElement).dataset.hasMoved === 'true') return;
                      e.stopPropagation();
                      setEditingMarker(marker);
                      setMarkerModalOpen(true);
                    }}
                  >
                    <span>📍 {marker.name}</span>
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMarker(marker.id);
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
              minWidth: `${HEADER_W + totalContentW + 150}px`,
              height: `${32 + (Math.max(0, ...songSections.map(s => s.level || 0)) * 26)}px`,
              zIndex: activeRepeatDropdownSectionId !== null ? 60 : undefined
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
                <XiloMagnet size={11} className="text-[var(--cordel-text)]/70 shrink-0 hidden md:inline-block" />
                <div className="flex cordel-border-sm overflow-hidden select-none h-[22px]">
                  <button
                    onClick={() => setSnapMode('measure')}
                    className={`px-1.5 py-0.5 text-[9px] font-cactus uppercase font-bold cursor-pointer transition-colors leading-none flex items-center justify-center ${
                      snapMode === 'measure'
                        ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-extrabold'
                        : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/10'
                    }`}
                    title={lang === 'fr' ? 'Attraction à la mesure' : 'Atração ao compasso'}
                  >
                    {isMobile ? (lang === 'fr' ? 'Mes.' : 'Comp.') : (lang === 'fr' ? 'Mesure' : 'Compasso')}
                  </button>
                  <button
                    onClick={() => setSnapMode('beat')}
                    className={`px-1.5 py-0.5 text-[9px] font-cactus uppercase font-bold cursor-pointer transition-colors border-l border-[var(--cordel-border)] leading-none flex items-center justify-center ${
                      snapMode === 'beat'
                        ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-extrabold'
                        : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/10'
                    }`}
                    title={lang === 'fr' ? 'Attraction au temps' : 'Atração ao tempo'}
                  >
                    {lang === 'fr' ? 'Temps' : 'Tempos'}
                  </button>
                  <button
                    onClick={() => setSnapMode('none')}
                    className={`px-1.5 py-0.5 text-[9px] font-cactus uppercase font-bold cursor-pointer transition-colors border-l border-[var(--cordel-border)] leading-none flex items-center justify-center ${
                      snapMode === 'none'
                        ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-extrabold'
                        : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/10'
                    }`}
                    title={lang === 'fr' ? 'Mouvement libre' : 'Movimento livre'}
                  >
                    {lang === 'fr' ? 'Libre' : 'Livre'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingSection(null);
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
              {/* Grid of empty measure slots for click-and-drag section creation */}
              <div className="absolute inset-0 flex pointer-events-none z-0">
                {Array.from({ length: totalMeasures }).map((_, mIdx) => {
                  if (mIdx < visibleRange.start || mIdx > visibleRange.end) {
                    return (
                      <div
                        key={mIdx}
                        style={{
                          width: `${MEASURE_W}px`,
                          minWidth: `${MEASURE_W}px`,
                          height: '100%'
                        }}
                      />
                    );
                  }
                  return (
                    <div
                      key={mIdx}
                      className="group relative border-r border-dashed border-[var(--cordel-border)]/15 hover:bg-black/[0.03] flex items-center justify-center cursor-crosshair select-none pointer-events-auto"
                      style={{
                        width: `${MEASURE_W}px`,
                        minWidth: `${MEASURE_W}px`,
                        height: '100%'
                      }}
                      onPointerDown={(e) => handleEmptySlotPointerDown(e, mIdx)}
                      onPointerEnter={() => handleEmptySlotPointerEnter(mIdx)}
                    >
                      {/* Hover '+' button */}
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-[1px_1px_3px_rgba(0,0,0,0.3)] hover:scale-110 cursor-pointer z-20 pointer-events-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlusClick(mIdx);
                        }}
                        title={lang === 'fr' ? 'Créer une section' : 'Criar seção'}
                      >
                        ＋
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Highlight selection during drag */}
              {isDraggingRange && dragStartMeasure !== null && dragCurrentMeasure !== null && (
                <div
                  className="absolute bg-blue-500/25 border-2 border-dashed border-blue-500 pointer-events-none rounded-sm"
                  style={{
                    left: `${Math.min(dragStartMeasure, dragCurrentMeasure) * MEASURE_W + 4}px`,
                    width: `${(Math.abs(dragCurrentMeasure - dragStartMeasure) + 1) * MEASURE_W - 8}px`,
                    top: '4px',
                    bottom: '4px',
                    zIndex: 30
                  }}
                />
              )}

              {/* Quick Section Creator Popover */}
              {quickSectionRange && (
                <div
                  className="absolute z-[85] bg-[var(--cordel-bg)] text-[var(--cordel-text)] p-3 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-col gap-2 rounded-sm"
                  style={{
                    left: `${quickSectionRange.start * MEASURE_W + 4}px`,
                    top: '100%',
                    marginTop: '4px',
                    width: '260px',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-[var(--cordel-border)]/20 pb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">
                      {lang === 'fr' 
                        ? `Nouvelle Section (M. ${quickSectionRange.start + 1} - ${quickSectionRange.end + 1})` 
                        : `Nova Seção (C. ${quickSectionRange.start + 1} - ${quickSectionRange.end + 1})`}
                    </span>
                    <button 
                      className="text-xs hover:text-red-500 font-bold cursor-pointer"
                      onClick={() => setQuickSectionRange(null)}
                    >✕</button>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-bold uppercase opacity-75">{lang === 'fr' ? 'Nom' : 'Nome'}</label>
                    <input
                      type="text"
                      value={quickSectionName}
                      onChange={(e) => setQuickSectionName(e.target.value)}
                      placeholder={lang === 'fr' ? "ex: Couplet" : "ex: Verso"}
                      className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-2 py-1 text-xs font-bold outline-none text-[var(--cordel-text)] focus:bg-[var(--cordel-border)]/10"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickSectionCreate();
                        if (e.key === 'Escape') setQuickSectionRange(null);
                      }}
                    />
                  </div>

                  {/* Level / Imbrication Selector */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-bold uppercase opacity-75">{lang === 'fr' ? "Niveau d'imbrication" : "Nível de aninhamento"}</label>
                    <select
                      value={quickSectionLevel}
                      onChange={(e) => setQuickSectionLevel(parseInt(e.target.value, 10))}
                      className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-1 text-[10px] font-bold text-[var(--cordel-text)] outline-none cursor-pointer"
                    >
                      <option value={0}>{lang === 'fr' ? 'Niveau 0 (Base)' : 'Nível 0 (Base)'}</option>
                      <option value={1}>{lang === 'fr' ? 'Niveau 1 (Groupe)' : 'Nível 1 (Grupo)'}</option>
                      <option value={2}>{lang === 'fr' ? 'Niveau 2 (Super-groupe)' : 'Nível 2 (Super-grupo)'}</option>
                    </select>
                  </div>

                  {/* Colors row */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-bold uppercase opacity-75">{lang === 'fr' ? 'Couleur' : 'Cor'}</label>
                    <div className="flex gap-1.5 justify-center py-1">
                      {[
                        '#e08283', // Rouge
                        '#f19066', // Orange
                        '#f5cd79', // Jaune
                        '#55efc4', // Vert d'eau
                        '#74b9ff', // Bleu pastel
                        '#a29bfe', // Violet doux
                        '#eaddcf'  // Beige
                      ].map((color) => (
                        <button
                          key={color}
                          onClick={() => setQuickSectionColor(color)}
                          className={`w-4.5 h-4.5 rounded-full cursor-pointer border border-black/35 transition-transform ${
                            quickSectionColor === color ? 'scale-120 ring-1 ring-[var(--cordel-text)]' : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-1">
                    <button
                      onClick={handleQuickSectionCreate}
                      className="w-full bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold text-[10px] py-1.5 rounded cordel-border-sm hover:opacity-95 transition-opacity cursor-pointer text-center"
                    >
                      ➕ {lang === 'fr' ? 'Créer la section' : 'Criar seção'}
                    </button>
                    
                    {onLoadCloudSection && (
                      <button
                        onClick={() => {
                          onLoadCloudSection(quickSectionRange.start);
                          setQuickSectionRange(null);
                        }}
                        className="w-full bg-emerald-600 text-white font-bold text-[10px] py-1.5 rounded cordel-border-sm hover:bg-emerald-700 transition-colors cursor-pointer text-center"
                      >
                        ☁️ {lang === 'fr' ? 'Insérer section enregistrée' : 'Inserir seção gravada'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {songSections.map((section) => {
                const startX = section.startMeasure * MEASURE_W;
                const width = (section.endMeasure - section.startMeasure + 1) * MEASURE_W;
                const maxLevel = Math.max(0, ...songSections.map(s => s.level || 0));
                const level = section.level || 0;
                const topOffset = (maxLevel - level) * 26 + 4;

                return (
                  <div
                    key={section.id}
                    className={`absolute flex items-center justify-between px-6 text-xs font-bold rounded cordel-border-sm select-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] cursor-grab active:cursor-grabbing hover:brightness-105 transition-[background-color] ${
                      isPanningActive ? 'pointer-events-none' : ''
                    }`}
                    onPointerDown={(e) => handleSectionBlockPointerDown(e, section)}
                    style={{
                      left: `${startX}px`,
                      width: `${width - 8}px`, // 4px margin left & right
                      marginLeft: '4px',
                      top: `${topOffset}px`,
                      height: '24px',
                      backgroundColor: section.color || '#eaddcf',
                      color: '#1a1a1a', // Toujours lisible en noir sur fond coloré
                      borderColor: '#1a1a1a',
                      borderWidth: '1.5px',
                      zIndex: activeRepeatDropdownSectionId === section.id ? 70 : 10
                    }}
                  >
                    {/* Left resize handle */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center hover:bg-black/15 select-none z-20 rounded-l"
                      onPointerDown={(e) => handleResizePointerDown(e, section, 'left')}
                      title={lang === 'fr' ? "Étendre à gauche" : "Estender para esquerda"}
                    >
                      <div className="flex gap-[0.5px]">
                        <div className="w-[1px] h-2 bg-black/40" />
                        <div className="w-[1px] h-2 bg-black/40" />
                        <div className="w-[1px] h-2 bg-black/40" />
                      </div>
                    </div>

                    {/* Right resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center hover:bg-black/15 select-none z-20 rounded-r"
                      onPointerDown={(e) => handleResizePointerDown(e, section, 'right')}
                      title={lang === 'fr' ? "Étendre à droite" : "Estender para direita"}
                    >
                      <div className="flex gap-[0.5px]">
                        <div className="w-[1px] h-2 bg-black/40" />
                        <div className="w-[1px] h-2 bg-black/40" />
                        <div className="w-[1px] h-2 bg-black/40" />
                      </div>
                    </div>

                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSection(section);
                        setSectionModalOpen(true);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="truncate max-w-[65%] font-cactus uppercase tracking-wider cursor-pointer hover:underline z-10"
                      title={lang === 'fr' ? 'Modifier la section' : 'Editar seção'}
                    >
                      {section.name}
                    </span>
                    
                    <div className="flex gap-1 shrink-0 z-10">
                      <div className="relative flex items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveRepeatDropdownSectionId(activeRepeatDropdownSectionId === section.id ? null : section.id);
                          }}
                          className="bg-white/80 hover:bg-white text-black text-[9px] p-0.5 px-1 rounded cordel-border-sm cursor-pointer font-sans font-bold flex items-center gap-0.5"
                          title={lang === 'fr' ? 'Répétitions' : 'Repetições'}
                        >
                          🔁 x{section.repeatCount || 1}
                        </button>
                        
                        {activeRepeatDropdownSectionId === section.id && (
                          <div
                            className="absolute top-full mt-1 right-0 z-[100] bg-[#f4ecd8] border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] flex flex-col py-1 rounded-sm min-w-[70px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {[1, 2, 3, 4, 5, 6, 7].map((count) => (
                              <button
                                key={count}
                                onClick={() => {
                                  const sectionLength = section.endMeasure - section.startMeasure + 1;
                                  const diff = (count - (section.repeatCount || 1)) * sectionLength;
                                  if (totalMeasures + diff > 20 && !hasAccess('mestre')) {
                                    setShowSubModal(true);
                                  } else {
                                    onUpdateSectionRepeat(section.id, count);
                                  }
                                  setActiveRepeatDropdownSectionId(null);
                                }}
                                className={`px-2 py-1 text-[10px] font-bold text-[#1a1a1a] hover:bg-black/10 text-left w-full cursor-pointer ${
                                  (section.repeatCount || 1) === count ? 'bg-black/15' : ''
                                }`}
                              >
                                x{count}
                              </button>
                            ))}
                            <div className="border-t border-black/10 my-0.5" />
                            <button
                              onClick={async () => {
                                setActiveRepeatDropdownSectionId(null);
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
                              className="px-2 py-1 text-[10px] font-bold text-[#1a1a1a] hover:bg-black/10 text-left w-full cursor-pointer opacity-70"
                            >
                              {lang === 'fr' ? 'Autre...' : 'Outro...'}
                            </button>
                          </div>
                        )}
                      </div>
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
              {copiedSection && Array.from({ length: totalMeasures })
                .map((_, mIdx) => ({ mIdx }))
                .filter(({ mIdx }) => mIdx >= visibleRange.start && mIdx <= visibleRange.end)
                .map(({ mIdx }) => {
                return (
                  <button
                    key={`paste-sec-${mIdx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPasteSection(mIdx);
                    }}
                    onMouseEnter={() => setHoveredPasteMeasure(mIdx)}
                    onMouseLeave={() => setHoveredPasteMeasure(null)}
                    className="absolute top-1 bottom-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-800 dark:text-emerald-300 font-sans font-bold text-[9px] px-2 rounded border border-dashed border-emerald-600 flex items-center justify-center gap-1 cursor-pointer z-30 transition-all hover:scale-105 shadow-[1px_1px_2px_rgba(0,0,0,0.15)]"
                    style={{
                      left: `${mIdx * MEASURE_W + 4}px`,
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
                  return (
                    <div
                      className="absolute top-1 bottom-1 flex items-center justify-between px-3 text-xs font-bold rounded border border-dashed pointer-events-none opacity-50 z-20 animate-pulse"
                      style={{
                        left: `${hoveredPasteMeasure * MEASURE_W}px`,
                        width: `${copiedSection.length * MEASURE_W - 8}px`,
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
            className="flex min-h-14 h-auto border-b-2 border-[var(--cordel-border)] sticky top-0 z-50 bg-[var(--cordel-bg)] cursor-ns-resize select-none relative"
            style={{ width: `${HEADER_W + totalContentW + 150}px`, minWidth: `${HEADER_W + totalContentW + 150}px` }}
            onPointerDown={handleRulerPointerDown}
            onTouchStart={handleRulerTouchStart}
          >
             {/* Sticky corner */}
             <div
               className={`timeline-sticky-header sticky left-0 z-60 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center justify-center ${
                 isMobile ? 'px-1.5' : 'px-3'
               }`}
               style={{ width: HEADER_W, minWidth: HEADER_W, transformOrigin: '0 0' }}
             >
               {isMobile ? (
                 <span className="font-cactus text-sm font-bold uppercase">Inst.</span>
               ) : (
                 <CompassoSelector className="w-full max-w-[180px] shadow-[2px_2px_0px_rgba(0,0,0,1)]" />
               )}
             </div>

            {/* Left spacer column */}
            {visibleRange.start > 0 && (
              <div style={{ width: `${visibleRange.start * MEASURE_W}px`, minWidth: `${visibleRange.start * MEASURE_W}px` }} className="shrink-0" />
            )}

            {/* Measure labels */}
            {Array.from({ length: totalMeasures })
              .map((_, mIdx) => ({ mIdx }))
              .filter(({ mIdx }) => mIdx >= visibleRange.start && mIdx <= visibleRange.end)
              .map(({ mIdx }) => {
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
                    className={`flex flex-col justify-between px-2 py-1 text-[10px] font-bold transition-all border-r shrink-0 ${
                      (mIdx + 1) % 4 === 0
                        ? 'border-r-2 border-r-blue-500/50 dark:border-r-blue-400/50 shadow-[1px_0_0_0_rgba(59,130,246,0.1)]'
                        : 'border-r-[var(--cordel-border)]/30'
                    } ${
                      loopStartMeasure !== null && loopEndMeasure !== null
                        ? (isInLoop ? (isLoopRegionActive ? 'bg-blue-600/5 border-t-4 border-t-blue-600/80 dark:border-t-blue-500/80' : 'bg-gray-500/5 border-t-4 border-t-gray-500/80 dark:border-t-gray-400/80') : (isLoopRegionActive ? 'bg-black/10 dark:bg-black/30 opacity-70' : ''))
                        : ''
                    }`}
                    style={{
                      width: MEASURE_W,
                      minWidth: MEASURE_W,
                      height: '100%',
                    }}
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
                      <span>{measureLabelsMap.get(mIdx)}</span>
                      
                      {/* Loop Delimiters */}
                      <div className="ruler-detailed flex gap-0.5 border-l border-[var(--cordel-border)]/20 pl-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSetLoopStart(mIdx); }}
                          className={`px-1 py-px rounded font-extrabold text-[10px] cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors border ${loopStartMeasure === mIdx ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-[var(--cordel-text)] border-[var(--cordel-border)]/30'}`}
                        > [ </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onSetLoopEnd(mIdx); }}
                          className={`px-1 py-px rounded font-extrabold text-[10px] cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors border ${loopEndMeasure === mIdx ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-[var(--cordel-text)] border-[var(--cordel-border)]/30'}`}
                        > ] </button>
                      </div>

                      {/* Measure Insertion / Deletion */}
                      <div className="ruler-detailed flex gap-0.5 border-l border-[var(--cordel-border)]/20 pl-1.5">
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

                    {/* Time Signature */}
                    <div className="ruler-detailed flex items-center gap-1">
                      <select
                        value={mTimeSig}
                        onChange={e => onMeasureTimeSigChange(mIdx, e.target.value as TimeSignature)}
                        className="bg-[var(--cordel-text)] text-[var(--cordel-bg)] text-[8px] font-bold rounded cordel-border-sm px-0.5 py-px outline-none cursor-pointer"
                        title={lang === 'fr' ? 'Signature rythmique' : 'Assinatura de tempo'}
                      >
                        <option value="4/4">4/4</option>
                        <option value="3/4">3/4</option>
                        <option value="2/4">2/4</option>
                        <option value="6/8">6/8</option>
                        <option value="12/8">12/8</option>
                      </select>
                    </div>

                    {/* Tempo (BPM) */}
                    <div className="ruler-detailed flex items-center gap-1">
                      <input
                        type="number"
                        min={40}
                        max={240}
                        value={mBpm}
                        onChange={e => onMeasureBpmChange(mIdx, Math.max(40, Math.min(240, Math.round(Number(e.target.value)))))}
                        className="w-10 bg-[var(--cordel-bg)] text-[9px] font-bold border border-[var(--cordel-border)]/50 rounded px-0.5 py-px text-center outline-none"
                        style={{ height: '18px' }}
                      />
                      <span className="text-[8px] opacity-75">bpm</span>
                      
                      <button
                        onClick={() => onMeasureTransitionChange(mIdx, mTransition === 'immediate' ? 'ramp' : 'immediate')}
                        className={`px-1 py-px text-[9px] font-extrabold border rounded transition-colors cursor-pointer flex items-center justify-center`}
                        style={{ height: '18px', minWidth: '18px' }}
                      >
                        {mTransition === 'ramp' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">↗</span>
                        ) : (
                          <span className="opacity-60">→</span>
                        )}
                      </button>
                    </div>

                    {/* Section Volume */}
                    <div className="ruler-detailed flex items-center gap-1">
                      <span className="text-[9px] opacity-75">🔊</span>
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
                      
                      <button
                        onClick={() => onMeasureVolTransitionChange(mIdx, mVolTransition === 'immediate' ? 'ramp' : 'immediate')}
                        className={`px-1 py-px text-[9px] font-extrabold border rounded transition-colors cursor-pointer flex items-center justify-center`}
                        style={{ height: '18px', minWidth: '18px' }}
                      >
                        {mVolTransition === 'ramp' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">↗</span>
                        ) : (
                          <span className="opacity-60">→</span>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex w-full opacity-50 text-[8px] pb-0.5">
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

            {/* Right spacer column */}
            {visibleRange.end < totalMeasures - 1 && (
              <div style={{ width: `${(totalMeasures - 1 - visibleRange.end) * MEASURE_W}px`, minWidth: `${(totalMeasures - 1 - visibleRange.end) * MEASURE_W}px` }} className="shrink-0" />
            )}

            {/* Quick Add Measure Button */}
            <div
              className="px-4 z-40 bg-[var(--cordel-bg)] border-r border-[var(--cordel-border)]/30 flex items-center justify-start h-full shrink-0"
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
          {/* Signaux déplacés vers le panneau compas (CompassoSelector) */}
          {/* <RhythmSignalsRow
            totalMeasures={totalMeasures}
            rhythmSignals={rhythmSignals}
            measureSignals={measureSignals}
            onMeasureSignalChange={onMeasureSignalChange}
            visibleRange={visibleRange}
          /> */}

          {/* ══════════ TRACK ROWS ══════════ */}
          {trackIds.map(trackId => (
            <TimelineTrackRow key={trackId} trackId={trackId} visibleRange={visibleRange} currentMeasureW={MEASURE_W} onStepTouchStart={onStepTouchStart} />
          ))}
          {/* ══════════ PLAYHEAD (Bypass React via Ref) ══════════ */}
          <TimelinePlayhead isActive={isActive} />

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



      {/* ══════════ SECTION FORM MODAL ══════════ */}
      <SongSectionModal
        isOpen={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        editingSection={editingSection}
        totalMeasures={totalMeasures}
        lang={lang}
        onCreateSection={onCreateSection}
        onUpdateSection={onUpdateSection}
        onSaveCloudSection={onSaveCloudSection}
        onLoadCloudSection={onLoadCloudSection}
      />

      {/* ══════════ MARKER FORM MODAL ══════════ */}
      <SongMarkerModal
        isOpen={markerModalOpen}
        onClose={() => setMarkerModalOpen(false)}
        editingMarker={editingMarker}
        defaultMeasure={defaultMarkerMeasure}
        totalMeasures={totalMeasures}
        lang={lang}
        onCreateMarker={onCreateMarker}
        onUpdateMarker={onUpdateMarker}
      />

      {/* Tablature Export Modal removed (lifted to App.tsx) */}
      {showSubModal && (
        <SubscriptionModal lang={lang} onClose={() => setShowSubModal(false)} />
      )}
      <VocalRecordingBar />
      <StepEditorPopup />
    </div>
    </TimelineUIContext.Provider>
  );
}, (prev, next) => {
  return prev.isMobile === next.isMobile && 
         prev.measureWidth === next.measureWidth && 
         prev.mestreSignals === next.mestreSignals &&
         prev.isActive === next.isActive;
});
