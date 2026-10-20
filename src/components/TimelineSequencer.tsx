import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore, getVisibleTimelineTrackIds } from '../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { SongSection, CloudRhythmSignal } from '../types';
import { TimelineTrackRow } from './TimelineTrackRow';
import { TimelinePlayhead } from './TimelinePlayhead';
import { useSequencer } from '../contexts/SequencerContext';
import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { TimelineMinimap } from './timeline/TimelineMinimap';
import { TimelineMarkerRulerRow } from './timeline/TimelineMarkerRulerRow';
import { TimelineSectionsRow } from './timeline/TimelineSectionsRow';
import { TimelineRulerRow } from './timeline/TimelineRulerRow';
import { TimelineGlobalAutomationsArea } from './timeline/TimelineGlobalAutomationsArea';
import { TimelineModalsContainer } from './timeline/TimelineModalsContainer';
import { useTimelineShortcuts } from '../hooks/useTimelineShortcuts';
import { useTimelineMultiSelection } from '../hooks/timeline/useTimelineMultiSelection';
import { useTimelinePlayheadHighlight } from '../hooks/timeline/useTimelinePlayheadHighlight';
import { useTimelineGridController } from '../hooks/timeline/useTimelineGridController';

export interface TimelineSequencerProps {
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
    patternId: number, stepIdx: number, instId: string,
    currentVal: string | number, onSelect: (val: string) => void, subIndex?: 0 | 1
  ) => void;
}

export const TimelineSequencer = React.memo<TimelineSequencerProps>(({
  isMobile, measureWidth, onMeasureWidthChange, mestreSignals = [],
  onSaveCloudSection, onLoadCloudSection, isActive = true, onStepTouchStart,
}) => {
  const sequencer = useSequencer(), { hasAccess } = useAuth();
  const { isPlaying, seekToMeasure, handleTimelineNavigate, handleStop } = useAudio();
  const scrollRef = useRef<HTMLDivElement>(null), gridRef = useRef<HTMLDivElement>(null), containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    useSequencerStore.getState().setTracks(prev => prev.map(t => t.isLinkFolder ? { ...t, isSequencerFolded: true } : t));
  }, []);
  useTimelineShortcuts();

  const totalMeasures = useSequencerStore(s => s.totalMeasures), timeSig = useSequencerStore(s => s.timeSig);
  const measureTimeSigs = useSequencerStore(useShallow(s => s.measureTimeSigs)), measureBpms = useSequencerStore(useShallow(s => s.measureBpms));
  const measureBpmTransitions = useSequencerStore(useShallow(s => s.measureBpmTransitions)), measureVols = useSequencerStore(useShallow(s => s.measureVols));
  const measureVolTransitions = useSequencerStore(useShallow(s => s.measureVolTransitions)), songSections = useSequencerStore(useShallow(s => s.songSections));
  const songMarkers = useSequencerStore(useShallow(s => s.songMarkers)), copiedSection = useSequencerStore(s => s.copiedSection);
  const loopStartMeasure = useSequencerStore(s => s.loopStartMeasure), loopEndMeasure = useSequencerStore(s => s.loopEndMeasure);
  const isLoopRegionActive = useSequencerStore(s => s.isLoopRegionActive), measureSignals = useSequencerStore(useShallow(s => s.measureSignals || []));
  const enabledSignalIds = useSequencerSettingsStore(s => s.enabledSignalIds), isMasterVolumeBypassed = useSequencerStore(s => s.isMasterVolumeBypassed);
  const toggleMasterVolumeBypass = useSequencerStore(s => s.toggleMasterVolumeBypass), isMultiSelectMode = useSequencerStore(s => s.isMultiSelectMode);
  const toggleMultiSelectMode = useSequencerStore(s => s.toggleMultiSelectMode), selectedTimelineCellsCount = useSequencerStore(s => s.selectedTimelineCells.length);
  const clearTimelineSelection = useSequencerStore(s => s.clearTimelineSelection), clearAutomationSelection = useSequencerStore(s => s.clearAutomationSelection);
  const trackIds = useSequencerStore(useShallow(s => getVisibleTimelineTrackIds(s)));

  const { lang, metadata, handleMeasureTimeSigChange, handleMeasureBpmChange, handleMeasureTransitionChange, handleMeasureVolChange, handleMeasureVolTransitionChange, handleCreateSongSection, handleUpdateSongSection, handleDeleteSongSection, handleCreateSongMarker, handleUpdateSongMarker, handleDeleteSongMarker, handleCopySongSection, handlePasteSongSection, handleSetLoopStart, handleSetLoopEnd, handleDeleteMeasure, handleInsertMeasure } = sequencer;

  const [insertPrompt, setInsertPrompt] = useState<{ isOpen: boolean; targetIdx: number | null }>({ isOpen: false, targetIdx: null });
  const [expandedAutoIds, setExpandedAutoIds] = useState<Set<number>>(() => new Set());
  const [pickerState, setPickerState] = useState<{ trackId: number; measureIdx: number; rect: DOMRect } | null>(null);
  const [sectionModalOpen, setSectionModalOpen] = useState(false), [editingSection, setEditingSection] = useState<SongSection | null>(null);
  const [signalDropdownOpen, setSignalDropdownOpen] = useState<number | null>(null);

  const toggleAutoTrack = useCallback((id: number) => setExpandedAutoIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const rhythmSignals = useMemo(() => [...mestreSignals.map(s => ({ id: s.id, name: s.name, image: s.imageUrl, isCloud: true })), ...(metadata?.rhythmSignals || []).map(s => ({ id: s.id, name: s.name, image: s.image, isCloud: false }))], [mestreSignals, metadata?.rhythmSignals]);
  const onMeasureSignalChange = useCallback((m: number, sig: string | null) => sequencer.setMeasureSignals((prev: (string | null)[]) => { const a = [...prev]; while (a.length <= m) a.push(null); a[m] = sig; return a; }), [sequencer]);

  useTimelineMultiSelection({ isPlaying, onTrackStepValueChange: sequencer.handleTrackStepValueChange });
  useTimelinePlayheadHighlight({ containerRef, isActive });

  const g = useTimelineGridController({
    containerRef, scrollRef, gridRef, measureWidth, totalMeasures, onMeasureWidthChange, isMobile, isPlaying, isActive, timeSig, measureTimeSigs, songSections, copiedSection, lang, seekToMeasure, handleTimelineNavigate, handleStop,
    onCreateSection: (name, start, end, color, repeat, level) => handleCreateSongSection(name, start, end, color, repeat, level),
    onUpdateSection: (id, name, start, end, color, level) => handleUpdateSongSection(id, name, start, end, color, level),
    onPasteSection: handlePasteSongSection,
    onUpdateMarker: (id, name, measure, color) => handleUpdateSongMarker(id, name, measure, color),
    clearTimelineSelection, clearAutomationSelection, isMultiSelectMode,
  });

  const ctxVal = useMemo(() => ({
    MEASURE_W: g.MEASURE_W, HEADER_W: g.HEADER_W, totalContentW: g.totalContentW, measureWidths: g.widths, measureLeftPositions: g.leftPositions, isMobile, isMacro: g.isMacro, isMinZoom: g.isMinZoom, isPanningActive: g.pinchPan.isPanningActive, lang, signalDropdownOpen, setSignalDropdownOpen, onOpenPatternPicker: (trackId: number, measureIdx: number, rect: DOMRect) => setPickerState({ trackId, measureIdx, rect }),
  }), [g, isMobile, lang, signalDropdownOpen]);

  if (!trackIds) return null;

  return (
    <TimelineUIContext.Provider value={ctxVal}>
      <div ref={containerRef} data-zoom={g.isMacro ? 'macro' : 'normal'} data-mobile={isMobile ? 'true' : 'false'} style={{ '--zoom-level': String(measureWidth / 480), '--measure-width': `${measureWidth}px`, touchAction: 'pan-x pan-y', display: isActive ? 'flex' : 'none' } as React.CSSProperties} className="timeline-sequencer-container timeline-container flex-1 min-h-0 flex flex-col w-full h-full overflow-hidden sequencer-bg text-[var(--cordel-text)] select-none" onContextMenu={e => e.preventDefault()}>
        <TimelineMinimap scrollRef={scrollRef} pendingScrollLeftRef={g.pinchPan.pendingScrollLeft} totalMeasures={totalMeasures} measureWidth={g.MEASURE_W} onMeasureWidthChange={onMeasureWidthChange} />
        <div id="timeline-scroll-container" ref={scrollRef} style={{ scrollBehavior: 'auto' }} onPointerDown={g.pinchPan.handleViewportPointerDown} onPointerMove={g.pinchPan.handleViewportPointerMove} onPointerUp={g.pinchPan.handleViewportPointerUp} onPointerCancel={g.pinchPan.handleViewportPointerUp} onClick={e => { const el = e.target as HTMLElement; if ((el === scrollRef.current || el === gridRef.current || el?.classList?.contains('wallpaper-surface-bg')) && !e.shiftKey && !e.ctrlKey && !e.metaKey && !isMultiSelectMode) { clearTimelineSelection(); clearAutomationSelection(); } }} className={`flex-grow overflow-x-auto overflow-y-auto relative custom-scrollbar ${g.pinchPan.isPanningActive ? 'cursor-grab select-none' : ''}`}>
          <div className="absolute inset-0 pointer-events-none z-0 wallpaper-surface-bg" style={{ width: `max(100%, ${g.HEADER_W + g.totalContentW + 300}px)`, minHeight: '100%', transform: 'translateZ(0)' }} />
          <div ref={gridRef} className="relative timeline-scroll-grid z-[1]" style={{ width: `${g.HEADER_W + g.totalContentW + 150}px`, minWidth: `${g.HEADER_W + g.totalContentW + 150}px`, minHeight: '100%', transformOrigin: '0 0' }}>
            <TimelineMarkerRulerRow headerWidth={g.HEADER_W} totalContentW={g.totalContentW} isMobile={isMobile} lang={lang} songMarkers={songMarkers} measureLeftPositions={g.leftPositions} measureWidth={g.MEASURE_W} isPanningActive={g.pinchPan.isPanningActive} onMarkerRulerDblClick={g.markerInteractions.handleMarkerRulerDblClick} onMarkerPointerDown={g.markerInteractions.handleMarkerPointerDown} onMarkerClick={m => (seekToMeasure ? seekToMeasure(m.measure, 0) : handleTimelineNavigate?.(m.measure, 0, 16))} onMarkerEdit={m => { g.markerInteractions.setEditingMarker(m); g.markerInteractions.setMarkerModalOpen(true); }} onDeleteMarker={handleDeleteSongMarker} />
            <TimelineSectionsRow headerWidth={g.HEADER_W} totalContentW={g.totalContentW} isMobile={isMobile} lang={lang} songSections={songSections} snapMode={g.snapMode} setSnapMode={g.setSnapMode} onOpenCreateSectionModal={() => { setEditingSection(null); setSectionModalOpen(true); }} measureLeftPositions={g.leftPositions} measureWidths={g.widths} isDraggingRange={g.sectionInteractions.isDraggingRange} dragStartMeasure={g.sectionInteractions.dragStartMeasure} dragCurrentMeasure={g.sectionInteractions.dragCurrentMeasure} emptySlotsProps={{ totalMeasures, visibleRange: g.visibleRange, measureWidths: g.widths, measureWidth: g.MEASURE_W, copiedSection, lang, onEmptySlotPointerDown: g.sectionInteractions.handleEmptySlotPointerDown, onEmptySlotPointerEnter: g.sectionInteractions.handleEmptySlotPointerEnter, onPlusClick: g.sectionInteractions.handlePlusClick }} bannersProps={{ songSections, totalMeasures, visibleRange: g.visibleRange, measureWidths: g.widths, measureLeftPositions: g.leftPositions, measureWidth: g.MEASURE_W, isPanningActive: Boolean(g.pinchPan.isPanningActive), copiedSection, lang, onSectionBlockPointerDown: g.sectionInteractions.handleSectionBlockPointerDown, onResizePointerDown: g.sectionStretch.handleResizePointerDown, onEditSection: s => { setEditingSection(s); setSectionModalOpen(true); }, onDeleteSection: handleDeleteSongSection, onCopySection: handleCopySongSection, onPasteSection: handlePasteSongSection }} quickPopoverProps={{ quickSectionRange: g.sectionInteractions.quickSectionRange, quickSectionName: g.sectionInteractions.quickSectionName, quickSectionColor: g.sectionInteractions.quickSectionColor, quickSectionLevel: g.sectionInteractions.quickSectionLevel, totalMeasures, measureLeftPositions: g.leftPositions, measureWidth: g.MEASURE_W, lang, onClose: () => g.sectionInteractions.setQuickSectionRange(null), onNameChange: g.sectionInteractions.setQuickSectionName, onColorChange: g.sectionInteractions.setQuickSectionColor, onLevelChange: g.sectionInteractions.setQuickSectionLevel, onRangeChange: g.sectionInteractions.setQuickSectionRange, onCreate: g.sectionInteractions.handleQuickSectionCreate, onLoadCloudSection }} />
            <TimelineRulerRow headerWidth={g.HEADER_W} totalContentW={g.totalContentW} isMobile={isMobile} lang={lang} totalMeasures={totalMeasures} measureWidth={g.MEASURE_W} measureWidths={g.widths} measureLeftPositions={g.leftPositions} visibleRange={g.visibleRange} loopStartMeasure={loopStartMeasure} loopEndMeasure={loopEndMeasure} isLoopRegionActive={isLoopRegionActive} setIsLoopRegionActive={a => sequencer.setIsLoopRegionActive(a)} measureTimeSigs={measureTimeSigs} measureLabelsMap={g.measureLabelsMap} measureSignals={measureSignals} rhythmSignals={rhythmSignals} enabledSignalIds={enabledSignalIds} signalDropdownOpen={signalDropdownOpen} setSignalDropdownOpen={setSignalDropdownOpen} onMeasureSignalChange={onMeasureSignalChange} onSetLoopStart={handleSetLoopStart} onSetLoopEnd={handleSetLoopEnd} onMeasureTimeSigChange={handleMeasureTimeSigChange} onInsertMeasure={handleInsertMeasure} onDeleteMeasure={handleDeleteMeasure} confirmAsync={sequencer.confirmAsync} onPointerDown={g.scrubbing.handleRulerPointerDown} onPointerMove={g.scrubbing.handleRulerPointerMove} onPointerUp={g.scrubbing.handleRulerPointerUp} onZoom={g.pinchPan.handleZoom} isMultiSelectMode={isMultiSelectMode} selectedTimelineCellsCount={selectedTimelineCellsCount} toggleMultiSelectMode={toggleMultiSelectMode} onOpenAddMeasuresModal={() => setInsertPrompt({ isOpen: true, targetIdx: null })} isPlaying={isPlaying} alertAsync={sequencer.alertAsync} />
            <TimelineGlobalAutomationsArea totalMeasures={totalMeasures} measureWidth={g.MEASURE_W} headerWidth={g.HEADER_W} lang={lang} measureBpms={measureBpms || []} measureBpmTransitions={measureBpmTransitions || []} measureVols={measureVols || []} measureVolTransitions={measureVolTransitions || []} isMasterVolumeBypassed={Boolean(isMasterVolumeBypassed)} onMeasureBpmChange={handleMeasureBpmChange} onMeasureTransitionChange={handleMeasureTransitionChange} onMeasureVolChange={handleMeasureVolChange} onMeasureVolTransitionChange={handleMeasureVolTransitionChange} toggleMasterVolumeBypass={toggleMasterVolumeBypass} />
            {trackIds.map(id => (<TimelineTrackRow key={id} trackId={id} visibleRange={g.visibleRange} currentMeasureW={g.MEASURE_W} onStepTouchStart={onStepTouchStart} isAutomationOpen={expandedAutoIds.has(id)} onToggleAutomation={() => toggleAutoTrack(id)} />))}
            <TimelinePlayhead isActive={isActive} />
            {g.sectionInteractions.snapGuideX !== null && <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 shadow-[0_0_8px_#f1c40f] z-50 pointer-events-none" style={{ left: `${g.sectionInteractions.snapGuideX}px` }} />}
          </div>
        </div>
        {g.pinchPan.isPanningActive && <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-[var(--cordel-bg)] border border-[var(--cordel-border)]/50 rounded-full px-4 py-1.5 text-[10px] font-bold text-[var(--cordel-text)] cordel-shadow z-50 flex items-center gap-1.5 animate-pulse uppercase tracking-wider"><span>✋ {lang === 'fr' ? 'Mode Déplacement Actif' : 'Modo Arrastar Ativo'}</span><span className="text-[8px] opacity-60 normal-case">{lang === 'fr' ? '(Glissez le fond pour scroller)' : '(Arraste o fundo para rolar)'}</span></div>}
        <TimelineModalsContainer
          totalMeasures={totalMeasures} lang={lang} hasAccess={role => hasAccess(role as any)}
          sectionModal={{ isOpen: sectionModalOpen, onClose: () => setSectionModalOpen(false), editingSection, onCreateSection: (name, start, end, color, repeat, level) => handleCreateSongSection(name, start, end, color, repeat, level), onUpdateSection: (id, name, start, end, color, level) => handleUpdateSongSection(id, name, start, end, color, level), onSaveCloudSection, onLoadCloudSection }}
          stretchConflict={{ isOpen: g.sectionStretch.stretchConflict.isOpen, section: g.sectionStretch.stretchConflict.section, targetRange: g.sectionStretch.stretchConflict.targetRange, onInsert: g.sectionStretch.handleConfirmStretchInsert, onOverwrite: g.sectionStretch.handleConfirmStretchOverwrite, onCancel: g.sectionStretch.handleCancelStretchConflict }}
          markerModal={{ isOpen: g.markerInteractions.markerModalOpen, onClose: () => g.markerInteractions.setMarkerModalOpen(false), editingMarker: g.markerInteractions.editingMarker, defaultMeasure: g.markerInteractions.defaultMarkerMeasure, onCreateMarker: (name, measure, color) => handleCreateSongMarker(name, measure, color), onUpdateMarker: (id, name, measure, color) => handleUpdateSongMarker(id, name, measure, color) }}
          insertMeasuresPrompt={{ isOpen: insertPrompt.isOpen, targetIdx: insertPrompt.targetIdx, onClose: () => setInsertPrompt({ isOpen: false, targetIdx: null }), onInsertMeasure: handleInsertMeasure }}
          pickerState={pickerState} onClosePicker={() => setPickerState(null)}
        />
      </div>
    </TimelineUIContext.Provider>
  );
}, (prev, next) => prev.isMobile === next.isMobile && prev.measureWidth === next.measureWidth && prev.mestreSignals === next.mestreSignals && prev.isActive === next.isActive);
