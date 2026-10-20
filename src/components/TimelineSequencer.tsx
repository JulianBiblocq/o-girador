/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore, getVisibleTimelineTrackIds } from '../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { SongSection, CloudRhythmSignal } from '../types';
import { TimelineTrackRow } from './TimelineTrackRow';
import { TimelinePlayhead } from './TimelinePlayhead';
import { getExpandedMeasures } from '../utils/measureHelpers';
import { StepEditorPopup } from './StepEditorPopup';
import { useSequencer } from '../contexts/SequencerContext';
import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { useAudio } from '../contexts/AudioContext';
import { subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';
import { useAuth } from '../contexts/AuthContext';
import { TimelineMinimap } from './timeline/TimelineMinimap';
import { SongSectionModal } from './timeline/SongSectionModal';
import { SectionCollisionModal } from './timeline/SectionCollisionModal';
import { SongMarkerModal } from './timeline/SongMarkerModal';
import { TimelineContextMenu } from './TimelineContextMenu';
import { AutomationTrack } from './AutomationTrack';
import { useTimelineShortcuts } from '../hooks/useTimelineShortcuts';
import { TimelinePatternPickerPopover } from './TimelinePatternPickerPopover';
import { useTimelineMultiSelection } from '../hooks/timeline/useTimelineMultiSelection';
import { computeTimelinePositions } from '../utils/timeline/timelineMeasureWidths';

import { useTimelineViewport } from '../hooks/timeline/useTimelineViewport';
import { useTimelinePinchPan } from '../hooks/timeline/useTimelinePinchPan';
import { useTimelineScrubbing } from '../hooks/timeline/useTimelineScrubbing';
import { useTimelineSectionInteractions } from '../hooks/timeline/useTimelineSectionInteractions';
import { useTimelineSectionStretch } from '../hooks/timeline/useTimelineSectionStretch';
import { useTimelineMarkerInteractions } from '../hooks/timeline/useTimelineMarkerInteractions';
import { TimelineMarkerRulerRow } from './timeline/TimelineMarkerRulerRow';
import { TimelineSectionsRow } from './timeline/TimelineSectionsRow';
import { TimelineRulerRow } from './timeline/TimelineRulerRow';

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
    onSelect: (val: string) => void,
    subIndex?: 0 | 1
  ) => void;
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
  const [insertMeasuresPrompt, setInsertMeasuresPrompt] = useState<{isOpen: boolean, targetIdx: number | null}>({isOpen: false, targetIdx: null});
  const [insertAmountStr, setInsertAmountStr] = useState("1");
  const { isPlaying, seekToMeasure, handleTimelineNavigate, handleStop } = useAudio();

  // Replier automatiquement toutes les pistes de liens du séquenceur lors du montage
  useEffect(() => {
    useSequencerStore.getState().setTracks(prev =>
      prev.map(t => t.isLinkFolder ? { ...t, isSequencerFolded: true } : t)
    );
  }, []);

  // Raccourcis universels DAW & Timeline
  useTimelineShortcuts();

  // Sélecteurs atomiques Zustand
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const timeSig = useSequencerStore(state => state.timeSig);
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
  const enabledSignalIds = useSequencerSettingsStore(state => state.enabledSignalIds);

  const {
    lang,
    metadata,
    handleMeasureTimeSigChange: onMeasureTimeSigChange,
    handleMeasureBpmChange: onMeasureBpmChange,
    handleMeasureTransitionChange: onMeasureTransitionChange,
    handleMeasureVolChange: onMeasureVolChange,
    handleMeasureVolTransitionChange: onMeasureVolTransitionChange,
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
    handleDeleteMeasure: onDeleteMeasure,
    handleInsertMeasure: onInsertMeasure,
  } = sequencer;

  const isMasterVolumeBypassed = useSequencerStore(state => state.isMasterVolumeBypassed);
  const toggleMasterVolumeBypass = useSequencerStore(state => state.toggleMasterVolumeBypass);
  const isMultiSelectMode = useSequencerStore(state => state.isMultiSelectMode);
  const toggleMultiSelectMode = useSequencerStore(state => state.toggleMultiSelectMode);
  const selectedTimelineCellsCount = useSequencerStore(state => state.selectedTimelineCells.length);
  const clearTimelineSelection = useSequencerStore(state => state.clearTimelineSelection);
  const clearAutomationSelection = useSequencerStore(state => state.clearAutomationSelection);
  const trackIds = useSequencerStore(useShallow(state => getVisibleTimelineTrackIds(state)));

  const localRhythmSignals = metadata?.rhythmSignals || [];
  const rhythmSignals = useMemo(() => [
    ...mestreSignals.map(s => ({ id: s.id, name: s.name, image: s.imageUrl, isCloud: true })),
    ...localRhythmSignals.map(s => ({ id: s.id, name: s.name, image: s.image, isCloud: false }))
  ], [mestreSignals, localRhythmSignals]);

  const onMeasureSignalChange = useCallback((mIdx: number, sigId: string | null) => {
    sequencer.setMeasureSignals((prev: (string | null)[]) => {
      const arr = [...prev];
      while (arr.length <= mIdx) arr.push(null);
      arr[mIdx] = sigId;
      return arr;
    });
  }, [sequencer]);

  const [expandedAutomationTrackIds, setExpandedAutomationTrackIds] = useState<Set<number>>(() => new Set());
  const toggleAutomationTrack = useCallback((trackId: number) => {
    setExpandedAutomationTrackIds(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }, []);

  const [pickerState, setPickerState] = useState<{
    trackId: number;
    measureIdx: number;
    rect: DOMRect;
  } | null>(null);

  const handleOpenPatternPicker = useCallback((trackId: number, measureIdx: number, rect: DOMRect) => {
    setPickerState({ trackId, measureIdx, rect });
  }, []);

  const HEADER_W = isMobile ? 80 : 200;
  const MEASURE_W = measureWidth;
  const isMacro = MEASURE_W <= 240;
  const isMinZoom = MEASURE_W <= 120;

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [toolMode] = useState<'cursor' | 'hand'>('cursor');
  const [isSpacePressed] = useState<boolean>(false);
  const [snapMode, setSnapMode] = useState<'measure' | 'beat' | 'none'>('measure');

  const [sectionModalOpen, setSectionModalOpen] = useState<boolean>(false);
  const [editingSection, setEditingSection] = useState<SongSection | null>(null);
  const [signalDropdownOpen, setSignalDropdownOpen] = useState<number | null>(null);

  // Mesures dépliées & étiquettes de mesures
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

  // Positions proportionnelles
  const { widths: measureWidths, leftPositions: measureLeftPositions, totalContentW } = useMemo(() => {
    return computeTimelinePositions(totalMeasures, MEASURE_W, measureTimeSigs, timeSig);
  }, [totalMeasures, MEASURE_W, measureTimeSigs, timeSig]);

  // 1. Hook Viewport (Virtualisation intelligente)
  const { visibleRange } = useTimelineViewport({
    totalMeasures,
    measureWidth: MEASURE_W,
    headerWidth: HEADER_W,
    scrollRef,
    isPlaying,
    isActive,
  });

  // 2. Hook Pinch & Pan (Gestes & Zoom DAW)
  const {
    pendingScrollLeft,
    handleZoom,
    isPanningActive,
    handleViewportPointerDown,
    handleViewportPointerMove,
    handleViewportPointerUp,
  } = useTimelinePinchPan({
    containerRef,
    scrollRef,
    gridRef,
    measureWidth: MEASURE_W,
    headerWidth: HEADER_W,
    totalMeasures,
    isPlaying,
    onMeasureWidthChange,
    toolMode,
    isSpacePressed,
    isMultiSelectMode,
    clearTimelineSelection,
    clearAutomationSelection,
  });

  // 3. Hook Scrubbing (Règle temporelle & transport)
  const {
    handleRulerPointerDown,
    handleRulerPointerMove,
    handleRulerPointerUp,
  } = useTimelineScrubbing({
    scrollRef,
    headerWidth: HEADER_W,
    measureWidth: MEASURE_W,
    measureWidths,
    measureLeftPositions,
    totalMeasures,
    expanded,
    isPlaying,
    seekToMeasure,
    handleTimelineNavigate,
  });

  // 4. Hook Section Interactions (Création au drag, déplacement)
  const {
    isDraggingRange,
    dragStartMeasure,
    dragCurrentMeasure,
    quickSectionRange,
    setQuickSectionRange,
    quickSectionName,
    setQuickSectionName,
    quickSectionColor,
    setQuickSectionColor,
    quickSectionLevel,
    setQuickSectionLevel,
    snapGuideX,
    setSnapGuideX,
    handleEmptySlotPointerDown,
    handleEmptySlotPointerEnter,
    handlePlusClick,
    handleQuickSectionCreate,
    handleSectionBlockPointerDown,
  } = useTimelineSectionInteractions({
    totalMeasures,
    measureWidth: MEASURE_W,
    songSections,
    snapMode,
    headerWidth: HEADER_W,
    lang,
    copiedSection,
    onPasteSection,
    onCreateSection,
    onUpdateSection,
    toolMode,
    isSpacePressed,
  });

  // 5. Hook Section Stretch (Étirement et arbitrage de conflit)
  const {
    stretchConflict,
    handleResizePointerDown,
    handleConfirmStretchInsert,
    handleConfirmStretchOverwrite,
    handleCancelStretchConflict,
  } = useTimelineSectionStretch({
    measureWidth: MEASURE_W,
    measureWidths,
    measureLeftPositions,
    isPlaying,
    handleStop,
  });

  // 6. Hook Marker Interactions (Création, édition & drag repères)
  const {
    markerModalOpen,
    setMarkerModalOpen,
    editingMarker,
    setEditingMarker,
    defaultMarkerMeasure,
    handleMarkerRulerDblClick,
    handleMarkerPointerDown,
  } = useTimelineMarkerInteractions({
    totalMeasures,
    measureWidth: MEASURE_W,
    measureWidths,
    measureLeftPositions,
    headerWidth: HEADER_W,
    snapMode,
    setSnapGuideX,
    onUpdateMarker,
    toolMode,
    isSpacePressed,
  });

  // Gestion unifiée de la multi-sélection, raccourcis timeline et frappes sur cellules
  useTimelineMultiSelection({
    isPlaying,
    onTrackStepValueChange: sequencer.handleTrackStepValueChange,
  });

  // High-frequency DOM manipulation for playback highlighting (Zero Render Thrashing)
  const sequencerCache = useRef({
    lastMeasure: null as number | null,
    stepsCount: 16,
    stepElementsMap: new Map<number, HTMLElement[]>(),
    activeElements: [] as HTMLElement[],
  });

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

      cache.activeElements.forEach((el) => {
        el.classList.remove('live-playhead-highlight');
      });
      cache.activeElements = [];

      const activeStepIdx = Math.floor(ratio * cache.stepsCount);
      const elementsToHighlight = cache.stepElementsMap.get(activeStepIdx);
      if (elementsToHighlight) {
        elementsToHighlight.forEach((el) => {
          el.classList.add('live-playhead-highlight');
          cache.activeElements.push(el);
        });
      }
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
      sequencerCache.current.activeElements.forEach((el) => {
        el.classList.remove('live-playhead-highlight');
      });
      sequencerCache.current.activeElements = [];
      sequencerCache.current.lastMeasure = null;
      sequencerCache.current.stepElementsMap.clear();
    };
  }, [isActive]);

  const zoomStyles = {
    '--zoom-level': String(measureWidth / 480),
    '--measure-width': `${measureWidth}px`,
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    userSelect: 'none',
  } as React.CSSProperties;

  const contextValue = useMemo(() => ({
    MEASURE_W, HEADER_W, totalContentW, measureWidths, measureLeftPositions, isMobile, isMacro, isMinZoom, isPanningActive, lang,
    signalDropdownOpen, setSignalDropdownOpen,
    onOpenPatternPicker: handleOpenPatternPicker,
  }), [MEASURE_W, HEADER_W, totalContentW, measureWidths, measureLeftPositions, isMobile, isMacro, isMinZoom, isPanningActive, lang, signalDropdownOpen, handleOpenPatternPicker]);

  if (!trackIds) return null;

  return (
    <TimelineUIContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        data-zoom={isMacro ? 'macro' : 'normal'}
        data-mobile={isMobile ? 'true' : 'false'}
        style={{ ...zoomStyles, touchAction: 'pan-x pan-y', display: isActive ? 'flex' : 'none' }}
        className="timeline-sequencer-container timeline-container flex-1 min-h-0 flex flex-col w-full h-full overflow-hidden sequencer-bg text-[var(--cordel-text)] select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* ══════════ TIMELINE OVERVIEW (MINI-MAP) ══════════ */}
        <TimelineMinimap
          scrollRef={scrollRef}
          pendingScrollLeftRef={pendingScrollLeft}
          totalMeasures={totalMeasures}
          measureWidth={MEASURE_W}
          onMeasureWidthChange={onMeasureWidthChange}
        />

        <div
          id="timeline-scroll-container"
          ref={scrollRef}
          style={{ scrollBehavior: 'auto' }}
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerUp}
          onPointerCancel={handleViewportPointerUp}
          onClick={(e) => {
            const targetEl = e.target as HTMLElement;
            const isClickingEmpty = targetEl === scrollRef.current || 
                                    targetEl === gridRef.current || 
                                    targetEl?.classList?.contains('grid-lines-overlay') ||
                                    targetEl?.classList?.contains('wallpaper-surface-bg');
            if (isClickingEmpty && !e.shiftKey && !e.ctrlKey && !e.metaKey && !isMultiSelectMode) {
              clearTimelineSelection();
              clearAutomationSelection();
            }
          }}
          className={`flex-grow overflow-x-auto overflow-y-auto relative custom-scrollbar ${
            isPanningActive ? 'cursor-grab select-none' : ''
          }`}
        >
          {/* Calque de fond en filigrane gravure */}
          <div
            className="absolute inset-0 pointer-events-none z-0 wallpaper-surface-bg"
            style={{
              width: `max(100%, ${HEADER_W + totalContentW + 300}px)`,
              minHeight: '100%',
              transform: 'translateZ(0)',
            }}
          />

          <div 
            ref={gridRef}
            className="relative timeline-scroll-grid z-[1]" 
            style={{ width: `${HEADER_W + totalContentW + 150}px`, minWidth: `${HEADER_W + totalContentW + 150}px`, minHeight: '100%', transformOrigin: '0 0' }}
          >
            {/* ══════════ MARKER RULER ROW (📍 NEW) ══════════ */}
            <TimelineMarkerRulerRow
              headerWidth={HEADER_W}
              totalContentW={totalContentW}
              isMobile={isMobile}
              lang={lang}
              songMarkers={songMarkers}
              measureLeftPositions={measureLeftPositions}
              measureWidth={MEASURE_W}
              isPanningActive={isPanningActive}
              onMarkerRulerDblClick={handleMarkerRulerDblClick}
              onMarkerPointerDown={handleMarkerPointerDown}
              onMarkerClick={(marker) => {
                if (seekToMeasure) seekToMeasure(marker.measure, 0);
                else if (handleTimelineNavigate) handleTimelineNavigate(marker.measure, 0, 16);
              }}
              onMarkerEdit={(marker) => {
                setEditingMarker(marker);
                setMarkerModalOpen(true);
              }}
              onDeleteMarker={onDeleteMarker}
            />

            {/* ══════════ SECTIONS ROW ══════════ */}
            <TimelineSectionsRow
              headerWidth={HEADER_W}
              totalContentW={totalContentW}
              isMobile={isMobile}
              lang={lang}
              songSections={songSections}
              snapMode={snapMode}
              setSnapMode={setSnapMode}
              onOpenCreateSectionModal={() => {
                setEditingSection(null);
                setSectionModalOpen(true);
              }}
              measureLeftPositions={measureLeftPositions}
              measureWidths={measureWidths}
              isDraggingRange={isDraggingRange}
              dragStartMeasure={dragStartMeasure}
              dragCurrentMeasure={dragCurrentMeasure}
              emptySlotsProps={{
                totalMeasures,
                visibleRange,
                measureWidths,
                measureWidth: MEASURE_W,
                copiedSection,
                lang,
                onEmptySlotPointerDown: handleEmptySlotPointerDown,
                onEmptySlotPointerEnter: handleEmptySlotPointerEnter,
                onPlusClick: handlePlusClick,
              }}
              bannersProps={{
                songSections,
                totalMeasures,
                visibleRange,
                measureWidths,
                measureLeftPositions,
                measureWidth: MEASURE_W,
                isPanningActive,
                copiedSection,
                lang,
                onSectionBlockPointerDown: handleSectionBlockPointerDown,
                onResizePointerDown: handleResizePointerDown,
                onEditSection: (section) => {
                  setEditingSection(section);
                  setSectionModalOpen(true);
                },
                onDeleteSection,
                onCopySection,
                onPasteSection,
              }}
              quickPopoverProps={{
                quickSectionRange,
                quickSectionName,
                quickSectionColor,
                quickSectionLevel,
                totalMeasures,
                measureLeftPositions,
                measureWidth: MEASURE_W,
                lang,
                onClose: () => setQuickSectionRange(null),
                onNameChange: setQuickSectionName,
                onColorChange: setQuickSectionColor,
                onLevelChange: setQuickSectionLevel,
                onRangeChange: setQuickSectionRange,
                onCreate: handleQuickSectionCreate,
                onLoadCloudSection,
              }}
            />

            {/* ══════════ RULER ROW ══════════ */}
            <TimelineRulerRow
              headerWidth={HEADER_W}
              totalContentW={totalContentW}
              isMobile={isMobile}
              lang={lang}
              totalMeasures={totalMeasures}
              measureWidth={MEASURE_W}
              measureWidths={measureWidths}
              measureLeftPositions={measureLeftPositions}
              visibleRange={visibleRange}
              loopStartMeasure={loopStartMeasure}
              loopEndMeasure={loopEndMeasure}
              isLoopRegionActive={isLoopRegionActive}
              setIsLoopRegionActive={(active) => sequencer.setIsLoopRegionActive(active)}
              measureTimeSigs={measureTimeSigs}
              measureLabelsMap={measureLabelsMap}
              measureSignals={measureSignals}
              rhythmSignals={rhythmSignals}
              enabledSignalIds={enabledSignalIds}
              signalDropdownOpen={signalDropdownOpen}
              setSignalDropdownOpen={setSignalDropdownOpen}
              onMeasureSignalChange={onMeasureSignalChange}
              onSetLoopStart={onSetLoopStart}
              onSetLoopEnd={onSetLoopEnd}
              onMeasureTimeSigChange={onMeasureTimeSigChange}
              onInsertMeasure={onInsertMeasure}
              onDeleteMeasure={onDeleteMeasure}
              confirmAsync={sequencer.confirmAsync}
              onPointerDown={handleRulerPointerDown}
              onPointerMove={handleRulerPointerMove}
              onPointerUp={handleRulerPointerUp}
              onZoom={handleZoom}
              isMultiSelectMode={isMultiSelectMode}
              selectedTimelineCellsCount={selectedTimelineCellsCount}
              toggleMultiSelectMode={toggleMultiSelectMode}
              onOpenAddMeasuresModal={() => {
                setInsertAmountStr("1");
                setInsertMeasuresPrompt({ isOpen: true, targetIdx: null });
              }}
              isPlaying={isPlaying}
              alertAsync={sequencer.alertAsync}
            />

            {/* ══════════ AUTOMATION TRACKS ══════════ */}
            <AutomationTrack
              type="tempo"
              trackId={null}
              totalMeasures={totalMeasures}
              measureWidth={MEASURE_W}
              values={measureBpms || []}
              transitions={measureBpmTransitions || []}
              onChangeValue={onMeasureBpmChange}
              onChangeTransition={onMeasureTransitionChange}
              min={40}
              max={240}
              color="#f19066"
              lang={lang}
              headerWidth={HEADER_W}
            />
            <AutomationTrack
              type="volume"
              trackId={null}
              totalMeasures={totalMeasures}
              measureWidth={MEASURE_W}
              values={measureVols || []}
              transitions={measureVolTransitions || []}
              onChangeValue={onMeasureVolChange}
              onChangeTransition={onMeasureVolTransitionChange}
              min={0}
              max={100}
              color="#55efc4"
              lang={lang}
              headerWidth={HEADER_W}
              isBypassed={isMasterVolumeBypassed}
              onToggleBypass={toggleMasterVolumeBypass}
            />

            {/* ══════════ TRACK ROWS ══════════ */}
            {trackIds.map(trackId => (
              <TimelineTrackRow 
                key={trackId} 
                trackId={trackId} 
                visibleRange={visibleRange} 
                currentMeasureW={MEASURE_W} 
                onStepTouchStart={onStepTouchStart}
                isAutomationOpen={expandedAutomationTrackIds.has(trackId)}
                onToggleAutomation={() => toggleAutomationTrack(trackId)}
              />
            ))}

            {/* ══════════ PLAYHEAD (Bypass React via Ref) ══════════ */}
            <TimelinePlayhead isActive={isActive} />

            {/* ══════════ SNAP GUIDE ══════════ */}
            {snapGuideX !== null && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 shadow-[0_0_8px_#f1c40f] z-50 pointer-events-none"
                style={{ left: `${snapGuideX}px` }}
              />
            )}
          </div>
        </div>

        {/* Panning Hotkey overlay tooltip */}
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

        {/* ══════════ SECTION STRETCH CONFLICT MODAL ══════════ */}
        <SectionCollisionModal
          isOpen={stretchConflict.isOpen}
          section={stretchConflict.section}
          targetRange={stretchConflict.targetRange}
          lang={lang}
          onInsert={handleConfirmStretchInsert}
          onOverwrite={handleConfirmStretchOverwrite}
          onCancel={handleCancelStretchConflict}
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

        <StepEditorPopup />
        <TimelineContextMenu />

        {/* ══════════ INSERT MEASURES PROMPT MODAL ══════════ */}
        {insertMeasuresPrompt.isOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] p-6 rounded cordel-border w-full max-w-sm cordel-shadow text-center font-cactus relative">
              <h3 className="text-xl font-bold mb-4 uppercase tracking-wider">
                {lang === 'fr' ? 'Ajouter des mesures' : 'Adicionar compassos'}
              </h3>
              <p className="mb-4 text-sm font-sans font-bold">
                {lang === 'fr' ? 'Combien de mesures voulez-vous ajouter ?' : 'Quantos compassos deseja adicionar?'}
              </p>
              <input
                type="number"
                min="1"
                max="64"
                value={insertAmountStr}
                onChange={(e) => setInsertAmountStr(e.target.value)}
                className="w-24 text-center bg-[var(--cordel-border)]/10 border-2 border-[var(--cordel-border)] rounded px-2 py-1 mb-6 text-xl font-bold font-sans outline-none focus:border-emerald-600"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const amount = parseInt(insertAmountStr, 10);
                    if (!isNaN(amount) && amount > 0) {
                      const idx = insertMeasuresPrompt.targetIdx ?? totalMeasures;
                      const newTotal = Math.min(64, totalMeasures + amount);
                      const hasFullPlayback = useSequencerStore.getState().hasFullPlaybackAccess;
                      if (newTotal > 30 && !hasAccess('mestre') && !hasFullPlayback) {
                        useSequencerStore.getState().openSubscriptionModal();
                      } else {
                        onInsertMeasure && onInsertMeasure(idx, newTotal - totalMeasures);
                      }
                      setInsertMeasuresPrompt({ isOpen: false, targetIdx: null });
                    }
                  }
                }}
              />
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setInsertMeasuresPrompt({ isOpen: false, targetIdx: null })}
                  className="px-4 py-2 cordel-border-sm cordel-button bg-[var(--cordel-wood)] text-[#f4ecd8] font-bold"
                >
                  {lang === 'fr' ? 'Annuler' : 'Cancelar'}
                </button>
                <button
                  onClick={() => {
                    const amount = parseInt(insertAmountStr, 10);
                    if (!isNaN(amount) && amount > 0) {
                      const idx = insertMeasuresPrompt.targetIdx ?? totalMeasures;
                      const newTotal = Math.min(64, totalMeasures + amount);
                      const hasFullPlayback = useSequencerStore.getState().hasFullPlaybackAccess;
                      if (newTotal > 30 && !hasAccess('mestre') && !hasFullPlayback) {
                        useSequencerStore.getState().openSubscriptionModal();
                      } else {
                        onInsertMeasure && onInsertMeasure(idx, newTotal - totalMeasures);
                      }
                      setInsertMeasuresPrompt({ isOpen: false, targetIdx: null });
                    }
                  }}
                  className="px-4 py-2 cordel-border-sm cordel-button bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold hover:scale-105 transition-transform"
                >
                  {lang === 'fr' ? 'Ajouter' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Pattern Picker Popover on Double-Click */}
        {pickerState && (
          <TimelinePatternPickerPopover
            trackId={pickerState.trackId}
            measureIdx={pickerState.measureIdx}
            anchorRect={pickerState.rect}
            onClose={() => setPickerState(null)}
          />
        )}
      </div>
    </TimelineUIContext.Provider>
  );
}, (prev, next) => {
  return prev.isMobile === next.isMobile && 
         prev.measureWidth === next.measureWidth && 
         prev.mestreSignals === next.mestreSignals &&
         prev.isActive === next.isActive;
});
