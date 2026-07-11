import React, { useContext } from 'react';
import { useSequencerStore, isToadaBus, isToadaChild, getEffectiveMuteState } from '../stores/useSequencerStore';
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
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
}

const TimelineTrackRowComponent: React.FC<TimelineTrackRowProps> = ({ 
  trackId, 
  visibleRange = { start: 0, end: 8 },
  currentMeasureW,
  onStepTouchStart
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

  const tracks = useSequencerStore(state => state.tracks);
  const dbTrack = tracks.find(t => t.id === trackId);
  const trackInst = dbTrack ? instrumentsConfig[dbTrack.instrumentIdx] : null;

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameVal, setNameVal] = React.useState(dbTrack?.customName || (trackInst ? trackInst.name : ''));

  React.useEffect(() => {
    setNameVal(dbTrack?.customName || (trackInst ? trackInst.name : ''));
  }, [dbTrack?.customName, trackInst?.name]);

  const handleRenameSubmit = () => {
    setIsEditingName(false);
    if (!dbTrack) return;
    useSequencerStore.getState().setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, customName: nameVal.trim() || undefined } : t
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setNameVal(dbTrack?.customName || (inst ? inst.name : ''));
    }
  };

  // Granular primitive selectors to avoid any reference instability or infinite loops
  const instrumentIdx = useSequencerStore(state => state.tracks.find(t => t.id === trackId)?.instrumentIdx ?? 0);
  const isMute = useSequencerStore(state => state.tracks.find(t => t.id === trackId)?.isMute ?? false);
  const isSolo = useSequencerStore(state => state.tracks.find(t => t.id === trackId)?.isSolo ?? false);
  const isMaster = useSequencerStore(state => state.tracks.some(t => String(t.linkedToTrackId) === String(trackId)));

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
      isBusFolder: dbTrack?.isBusFolder,
      isLinkFolder: dbTrack?.isLinkFolder,
      isLinkMaster: dbTrack?.isLinkMaster,
      customName: dbTrack?.customName,
      patterns: JSON.parse(trackStructureJson),
    };
  }, [
    isMacro, 
    fullTrack, 
    trackStructureJson, 
    trackId, 
    instrumentIdx, 
    isMute, 
    isSolo,
    dbTrack?.isBusFolder,
    dbTrack?.isLinkFolder,
    dbTrack?.isLinkMaster,
    dbTrack?.customName
  ]);

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
  const onToggleFoldBus = useSequencerStore(state => state.handleToggleSequencerFoldBus);

  if (!trackData) return null;

  const inst = instrumentsConfig[trackData.instrumentIdx];
  if (!inst) return null;

  const slaves = tracks.filter(t => String(t.linkedToTrackId) === String(trackId));
  const getPluralName = (name: string) => {
    if (name.includes('Alfaia')) return 'Alfaias';
    if (name === 'Caixa') return 'Caixas';
    if (name === 'Tarol') return 'Tarols';
    if (name === 'Agbê') return 'Agbês';
    if (name === 'Mineiro') return 'Mineiros';
    if (name === 'Gonguê') return 'Gonguês';
    return name + 's';
  };
  const linkedSlavesTooltip = isMaster
    ? `${lang === 'fr' ? 'Lié' : 'Vinculado'} : ${inst.name.replace('Alfaia ', '')} et ${slaves.map(s => instrumentsConfig[s.instrumentIdx]?.name.replace('Alfaia ', '')).join(', ')}`
    : undefined;
  const isLinkedChild = dbTrack && dbTrack.linkedToTrackId && !dbTrack.isLinkFolder;
  const isToada = isToadaBus(trackData);
  const isToadaChildTrack = dbTrack && isToadaChild(dbTrack, tracks);
  const isChild = isLinkedChild || isToadaChildTrack;

  const displayName = dbTrack?.isLinkFolder || isToada
    ? (dbTrack?.customName || (isToada ? 'Toada' : `🔗 ${getPluralName(inst.name)}`))
    : (isChild ? `↳ ${dbTrack?.customName || inst.name}` : (dbTrack?.customName || inst.name));
  
  const canPlay = !getEffectiveMuteState(tracks, trackId);

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
      className={`flex border-b border-[var(--cordel-border)]/20 h-10 rounded-none transition-opacity duration-150 relative ${
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
          isMobile ? (isChild ? 'pl-3 pr-1' : 'px-1') : (isChild ? 'pl-8 pr-3' : 'px-3')
        }`}
        style={{ width: HEADER_W, minWidth: HEADER_W, transformOrigin: '0 0' }}
      >
        <div className={`flex items-center min-w-0 flex-grow ${isMobile ? 'gap-0.5' : 'gap-2'}`}>
          {(dbTrack?.isLinkFolder || isToada) && (
            <button
              onClick={() => onToggleFoldBus(String(trackData.id))}
              className="p-0.5 hover:bg-[var(--cordel-text)]/10 rounded cursor-pointer text-[10px] font-bold mr-1 shrink-0 flex items-center justify-center w-4 h-4 border border-[var(--cordel-border)]/30 text-[var(--cordel-text)]"
              title={dbTrack?.isSequencerFolded ? (lang === 'fr' ? 'Déplier' : 'Desdobrar') : (lang === 'fr' ? 'Plier' : 'Dobrar')}
            >
              {dbTrack?.isSequencerFolded ? '▶' : '▼'}
            </button>
          )}
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
            isEditingName ? (
              <input
                type="text"
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                className="font-cactus font-bold text-sm bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm px-1 py-0.5 outline-none max-w-[120px] text-left"
                autoFocus
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
              />
            ) : (
              <span 
                onDoubleClick={() => setIsEditingName(true)}
                className="track-header-name font-cactus text-sm font-bold truncate text-[var(--cordel-text)] tracking-wider cursor-pointer hover:bg-[var(--cordel-text)]/5 rounded px-1"
                title={lang === 'fr' ? 'Double-cliquer pour renommer' : 'Clique duplo para renomear'}
              >
                {displayName}
              </span>
            )
          ) : null}
        </div>
        <div className="track-header-controls flex flex-row gap-1 shrink-0">
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
          const puxTrack = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
          const coroTrack = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
          const isToada = isToadaBus(trackData);

          let activePattern = null;
          let activeTrack = null;
          let currentTrackId = trackData.id;
          let currentInstrumentIdx = trackData.instrumentIdx;
          let currentInst = inst;
          let currentPatternsList = trackData.patterns;
          let currentTrackIdx = trackIndex;
          let isOverridden = false;
          let isSilence = false;

          if (isToada) {
            const pPtn = puxTrack?.patterns.find(p => p.measureAssignments[mIdx]);
            const cPtn = coroTrack?.patterns.find(p => p.measureAssignments[mIdx]);
            if (cPtn) {
              activePattern = cPtn;
              activeTrack = coroTrack;
              currentTrackIdx = tracks.findIndex(t => t.id === coroTrack!.id);
            } else if (pPtn) {
              activePattern = pPtn;
              activeTrack = puxTrack;
              currentTrackIdx = tracks.findIndex(t => t.id === puxTrack!.id);
            }

            if (activeTrack) {
              currentTrackId = activeTrack.id;
              currentInstrumentIdx = activeTrack.instrumentIdx;
              currentInst = instrumentsConfig[currentInstrumentIdx] || inst;
            }

            const toadaPatternsList = [];
            if (puxTrack) toadaPatternsList.push(...puxTrack.patterns);
            if (coroTrack) toadaPatternsList.push(...coroTrack.patterns);
            currentPatternsList = toadaPatternsList;
          } else if (isLinkedChild && dbTrack) {
            const parentBus = tracks.find(p => String(p.id) === String(dbTrack.linkedToTrackId) && p.isLinkFolder);
            if (parentBus) {
              const override = dbTrack.isLinkMaster ? undefined : dbTrack.patternOverrides?.[mIdx];
              if (override === null) {
                isSilence = true;
                activePattern = null;
                isOverridden = true;
              } else if (override !== undefined) {
                activePattern = parentBus.patterns.find(p => p.id === override) || null;
                isOverridden = true;
              } else {
                activePattern = parentBus.patterns.find(p => p.measureAssignments[mIdx]) || null;
                isOverridden = false;
              }
              activeTrack = parentBus;
              currentPatternsList = parentBus.patterns;
              currentTrackIdx = tracks.findIndex(t => t.id === parentBus.id);
            }
          } else {
            activePattern = trackData.patterns.find(p => p.measureAssignments[mIdx]);
            activeTrack = trackData;
          }

          const patternIdx = activePattern && activeTrack ? activeTrack.patterns.findIndex((p: any) => p.id === activePattern.id) : -1;
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

          const hasChildOverrides = dbTrack?.isLinkFolder && tracks.some(child => 
            String(child.linkedToTrackId) === String(dbTrack.id) && 
            !child.isLinkFolder && 
            child.patternOverrides?.[mIdx] !== undefined
          );

          return (
            <TimelineMeasure
              key={mIdx}
              mIdx={mIdx}
              trackId={isLinkedChild && dbTrack ? dbTrack.id : currentTrackId}
              trackIdx={isLinkedChild && dbTrack ? trackIndex : currentTrackIdx}
              instrumentIdx={isLinkedChild && dbTrack ? dbTrack.instrumentIdx : currentInstrumentIdx}
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
              instId={isLinkedChild ? inst.id : currentInst.id}
              instType={isLinkedChild ? inst.type : currentInst.type}
              lang={lang}
              activePatternName={isSilence ? (lang === 'fr' ? 'Silence' : 'Silêncio') : (activePattern ? activePattern.name : null)}
              patternsList={currentPatternsList}
              signalDropdownOpen={uiContext.signalDropdownOpen}
              onPatternAssignForMeasure={onPatternAssignForMeasure}
              onPatternVariationToggleForMeasure={onPatternVariationToggleForMeasure}
              measureAllowVariations={activePattern?.measureAllowVariations?.[mIdx] || false}
              variationsCount={activePattern?.variationsCount || 0}
              isMacro={isMacro}
              isMinZoom={isMinZoom}
              instColors={isLinkedChild ? inst.colors : currentInst.colors}
              instMixerBg={isLinkedChild ? inst.mixerBg : currentInst.mixerBg}
              activePatternActiveSteps={activePattern?.activeSteps}
              onMeasureClick={handleMeasureClick}
              isLinkedChild={!!isLinkedChild}
              isOverridden={isOverridden}
              isSilence={isSilence}
              hasChildOverrides={hasChildOverrides}
              onStepTouchStart={onStepTouchStart}
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
