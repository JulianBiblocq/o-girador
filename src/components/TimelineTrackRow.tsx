import React, { useContext } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { instrumentsConfig, ASSETS_BASE_URL } from '../data';
import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { TimelineMeasure } from './TimelineMeasure';
import { useSequencer } from '../contexts/SequencerContext';
import { getNextStepValue } from '../utils/instrumentStrokes';

interface TimelineTrackRowProps {
  trackId: number;
  visibleRange: { start: number; end: number };
  currentMeasureW: number;
}

const TimelineTrackRowComponent: React.FC<TimelineTrackRowProps> = ({ 
  trackId, 
  visibleRange = { start: 0, end: 8 },
  currentMeasureW
}) => {
  const uiContext = useContext(TimelineUIContext);
  
  if (!uiContext) return null;
  const { 
    HEADER_W, 
    totalContentW, 
    isMobile, 
    isMacro, 
    isMinZoom, 
    isPanningActive, 
    lang, 
  } = uiContext;

  // Granular primitive selectors to avoid any reference instability or infinite loops
  const instrumentIdx = useSequencerStore(state => state.tracks.find(t => t.id === trackId)?.instrumentIdx ?? 0);
  const isMute = useSequencerStore(state => state.tracks.find(t => t.id === trackId)?.isMute ?? false);
  const isSolo = useSequencerStore(state => state.tracks.find(t => t.id === trackId)?.isSolo ?? false);

  // Subscribe to full track only in Macro mode (where compact preview must update on step changes)
  const fullTrack = useSequencerStore(state => {
    if (isMacro) {
      return state.tracks.find(t => t.id === trackId);
    }
    return null;
  });

  // Stringified track structure to check for structural changes without subscribing to activeSteps/lyrics/etc.
  const trackStructureJson = useSequencerStore(state => {
    if (isMacro) return '';
    const t = state.tracks.find(curr => curr.id === trackId);
    if (!t) return '';
    return JSON.stringify(t.patterns.map(p => ({
      id: p.id,
      name: p.name,
      steps: p.steps,
      vocalMode: p.vocalMode,
      measureAssignments: p.measureAssignments,
      measureAllowVariations: p.measureAllowVariations,
      variationsCount: p.variations?.length || 0,
    })));
  });

  // Re-generate the track object for rendering purposes (isolated from step updates)
  const trackData = React.useMemo(() => {
    if (isMacro) {
      return fullTrack;
    }
    if (!trackStructureJson) return null;
    return {
      id: trackId,
      instrumentIdx,
      isMute,
      isSolo,
      patterns: JSON.parse(trackStructureJson),
    };
  }, [isMacro, fullTrack, trackStructureJson, trackId, instrumentIdx, isMute, isSolo]);

  const trackIndex = useSequencerStore(state => state.tracks.findIndex(t => t.id === trackId));
  const hasSolo = useSequencerStore(state => state.tracks.some(t => t.isSolo));
  
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const songSections = useSequencerStore(useShallow(state => state.songSections));
  const loopStartMeasure = useSequencerStore(state => state.loopStartMeasure);
  const loopEndMeasure = useSequencerStore(state => state.loopEndMeasure);
  const isLoopRegionActive = useSequencerStore(state => state.isLoopRegionActive);

  // Actions Zustand
  const onMuteToggle = useSequencerStore(state => state.handleTrackMuteToggle);
  const onSoloToggle = useSequencerStore(state => state.handleTrackSoloToggle);
  const onPatternAssignForMeasure = useSequencerStore(state => state.handleTimelinePatternAssign);
  const onPatternVariationToggleForMeasure = useSequencerStore(state => state.handleTimelinePatternVariationToggle);

  if (!trackData) return null;

  const inst = instrumentsConfig[trackData.instrumentIdx];
  if (!inst) return null;
  
  const isMutedBySolo = hasSolo && !trackData.isSolo;
  const canPlay = trackData.isSolo || (!trackData.isMute && !isMutedBySolo);

  const sequencer = useSequencer();

  const handleGridPointerDown = (e: React.PointerEvent) => {
    if (isPanningActive) return;
    const stepEl = (e.target as HTMLElement).closest('.timeline-step') as HTMLElement;
    if (!stepEl) return;
    
    e.stopPropagation();
    
    const { trackId: tIdStr, patternId: pIdStr, step: stepStr, val } = stepEl.dataset;
    if (!tIdStr || !pIdStr || stepStr === undefined) return;
    
    const tId = Number(tIdStr);
    const pId = Number(pIdStr);
    const sIdx = Number(stepStr);
    
    const nextVal = getNextStepValue(inst.id, inst.type, val || '');
    sequencer.handleTrackStepValueChange(tId, pId, sIdx, String(nextVal));
  };

  const handleMeasureClick = (mIdx: number, steps: number, clickX: number) => {
    const ratio = Math.max(0, Math.min(1, clickX / currentMeasureW));
    const stepIdx = Math.floor(ratio * steps);
    window.dispatchEvent(
      new CustomEvent('o-girador-timeline-nav', {
        detail: { mIdx, sIdx: stepIdx }
      })
    );
  };

  const leftSpacerWidth = Math.max(0, visibleRange.start) * currentMeasureW;
  const rightSpacerCount = Math.max(0, totalMeasures - 1 - visibleRange.end);
  const rightSpacerWidth = rightSpacerCount * currentMeasureW;

  return (
    <div
      className={`flex border-b border-[var(--cordel-border)]/20 h-12 transition-opacity duration-150 relative ${
        !canPlay ? 'opacity-50' : ''
      }`}
      style={{ 
        width: `${HEADER_W + totalContentW}px`,
        minWidth: `${HEADER_W + totalContentW}px`,
        // Suppression du contain: 'strict' pour corriger définitivement le bug d'affichage (Culling) après C2
      }}
    >
      {/* ── Sticky track header ── */}
      <div
        className={`timeline-sticky-header sticky left-0 z-35 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center justify-between py-1 shadow-[2px_0_5px_rgba(0,0,0,0.15)] shrink-0 ${
          isMobile ? 'px-1' : 'px-3'
        }`}
        style={{ width: HEADER_W, minWidth: HEADER_W, transformOrigin: '0 0' }}
      >
        <div className={`flex items-center min-w-0 flex-grow ${isMobile ? 'gap-0.5' : 'gap-2'}`}>
          {isMobile ? (
            <span className="font-mono text-[10px] text-[var(--cordel-text)]/60 shrink-0">
              #{trackIndex + 1}
            </span>
          ) : null}
          <img
            src={`${ASSETS_BASE_URL}${inst.iconImg}`}
            alt={inst.name}
            className={`track-header-icon object-contain filter invert-[var(--cordel-invert)] dark:invert-0 shrink-0 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`}
          />
          {!isMobile ? (
            <span className="track-header-name font-cactus text-sm font-bold truncate text-[var(--cordel-text)] tracking-wider">
              {inst.name}
            </span>
          ) : null}
        </div>
        <div className={`track-header-controls flex shrink-0 ${isMobile || isMacro ? 'flex-col gap-0.5' : 'flex-row gap-1'}`}>
          <button
            onClick={() => onMuteToggle(trackData.id)}
            className={`flex items-center justify-center font-bold cordel-border-sm cursor-pointer transition-colors ${
              isMobile ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[11px]'
            } ${
              (trackData.isMute && !trackData.isSolo) ? 'bg-red-600 text-white border-red-600' : 'bg-transparent text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
            title="Mute"
          >M</button>
          <button
            onClick={() => onSoloToggle(trackData.id)}
            className={`flex items-center justify-center font-bold cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
              isMobile ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[11px]'
            } ${
              trackData.isSolo ? 'bg-amber-500 text-black border-amber-500' : 'bg-transparent text-[var(--cordel-text)]'
            }`}
            title="Solo"
          >S</button>
        </div>
      </div>

      {/* Left spacer column */}
      {visibleRange.start > 0 && (
        <div style={{ width: `${leftSpacerWidth}px`, minWidth: `${leftSpacerWidth}px` }} className="shrink-0" />
      )}

      {/* ── Measure cells (Isolés dans TimelineMeasure.tsx pour éviter le render thrashing) ── */}
      {Array.from({ length: totalMeasures })
        .map((_, mIdx) => ({ mIdx }))
        .filter(({ mIdx }) => mIdx >= visibleRange.start && mIdx <= visibleRange.end)
        .map(({ mIdx }) => {
          const activePattern = trackData.patterns.find(p => p.measureAssignments[mIdx]);
          const patternIdx = activePattern ? trackData.patterns.findIndex(p => p.id === activePattern.id) : -1;
          const steps = activePattern ? activePattern.steps : 16;

          // Find if there is a section covering this measure
          const measureSection = songSections.find(s => mIdx >= s.startMeasure && mIdx <= s.endMeasure);
          const isSectionStart = measureSection && mIdx === measureSection.startMeasure;
          const isSectionEnd = measureSection && mIdx === measureSection.endMeasure;
          const sectionColor = measureSection?.color || '';

          const isInLoop = loopStartMeasure !== null && loopEndMeasure !== null && mIdx >= loopStartMeasure && mIdx <= loopEndMeasure;
          const loopStatus = loopStartMeasure !== null && loopEndMeasure !== null
            ? (isInLoop ? (isLoopRegionActive ? 'inside-active' as const : 'none' as const) : (isLoopRegionActive ? 'outside-active' as const : 'none' as const))
            : 'none' as const;

          return (
            <TimelineMeasure
              key={mIdx}
              mIdx={mIdx}
              trackId={trackData.id}
              trackIdx={trackIndex}
              instrumentIdx={trackData.instrumentIdx}
              currentMeasureW={currentMeasureW}
              patternId={activePattern ? activePattern.id : -1}
              patternIdx={patternIdx}
              steps={steps}
              beatResolutions={activePattern?.beatResolutions}
              sectionColor={sectionColor}
              isSectionStart={isSectionStart}
              isSectionEnd={isSectionEnd}
              loopStatus={loopStatus}
              isPanningActive={isPanningActive}
              instId={inst.id}
              instType={inst.type}
              lang={lang}
              activePatternName={activePattern ? activePattern.name : null}
              patternsList={trackData.patterns}
              signalDropdownOpen={uiContext.signalDropdownOpen}
              onPatternAssignForMeasure={onPatternAssignForMeasure}
              onPatternVariationToggleForMeasure={onPatternVariationToggleForMeasure}
              measureAllowVariations={activePattern?.measureAllowVariations?.[mIdx] || false}
              variationsCount={activePattern?.variationsCount || 0}
              isMacro={isMacro}
              isMinZoom={isMinZoom}
              instColors={inst.colors}
              instMixerBg={inst.mixerBg}
              activePatternActiveSteps={activePattern?.activeSteps}
              onGridPointerDown={handleGridPointerDown}
              onMeasureClick={handleMeasureClick}
            />
          );
        })}

      {/* Right spacer column */}
      {rightSpacerCount > 0 && (
        <div style={{ width: `${rightSpacerWidth}px`, minWidth: `${rightSpacerWidth}px` }} className="shrink-0" />
      )}
    </div>
  );
};

export const TimelineTrackRow = React.memo(TimelineTrackRowComponent, (prev, next) => {
  return prev.trackId === next.trackId &&
         prev.currentMeasureW === next.currentMeasureW &&
         prev.visibleRange.start === next.visibleRange.start &&
         prev.visibleRange.end === next.visibleRange.end;
});
