import React, { useContext } from 'react';
import { Pattern } from '../types';
import { useSequencerStore, isToadaBus, isToadaChild, getEffectiveMuteState, selectTracksMeta } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { instrumentsConfig, ASSETS_BASE_URL } from '../data';
import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { TimelineMeasure } from './TimelineMeasure';
import { useSequencer } from '../contexts/SequencerContext';
import { getNextStepValue } from '../utils/instrumentStrokes';
import { getTrackDisplayName, getBusColor, getTopParentBusId } from '../utils/colorHelpers';
import { useNomenclatureStore } from '../stores/useNomenclatureStore';
import { Activity } from 'lucide-react';
import { AutomationTrack } from './AutomationTrack';

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
  isAutomationOpen?: boolean;
  onToggleAutomation?: () => void;
}

const TimelineTrackRowComponent: React.FC<TimelineTrackRowProps> = ({ 
  trackId, 
  visibleRange = { start: 0, end: 8 },
  currentMeasureW,
  onStepTouchStart,
  isAutomationOpen = false,
  onToggleAutomation
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

  const tracksMeta = useSequencerStore(selectTracksMeta);
  const trackMeta = tracksMeta.find(t => t.id === trackId);
  const trackInst = trackMeta ? instrumentsConfig[trackMeta.instrumentIdx] : null;

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameVal, setNameVal] = React.useState(
    trackMeta?.customName || (trackMeta ? useNomenclatureStore.getState().getInstrumentLabel(trackMeta as any) : '')
  );



  React.useEffect(() => {
    setNameVal(trackMeta?.customName || (trackInst ? trackInst.name : ''));
  }, [trackMeta?.customName, trackInst?.name]);

  const handleRenameSubmit = () => {
    setIsEditingName(false);
    if (!trackMeta) return;
    useSequencerStore.getState().setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, customName: nameVal.trim() || undefined } : t
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setNameVal(trackMeta?.customName || (inst ? inst.name : ''));
    }
  };

  const instrumentIdx = trackMeta?.instrumentIdx ?? 0;
  const isMute = trackMeta?.isMute ?? false;
  const isSolo = trackMeta?.isSolo ?? false;
  const isMaster = tracksMeta.some(t => String(t.linkedToTrackId) === String(trackId));

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

  const trackAutomationData = useSequencerStore(
    useShallow((state) => {
      if (!isAutomationOpen) return null;
      const t = state.tracks.find(curr => curr.id === trackId);
      if (!t) return null;
      return {
        measureVols: t.measureVols,
        volumeVal: t.volumeVal,
        measurePans: t.measurePans,
        panVal: t.panVal,
        measureReverbSends: t.measureReverbSends,
        reverbVal: t.reverbVal,
        measureVolTransitions: t.measureVolTransitions,
        measurePanTransitions: t.measurePanTransitions,
        measureReverbTransitions: t.measureReverbTransitions,
        automationBypass: t.automationBypass,
      };
    })
  );

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
      isBusFolder: trackMeta?.isBusFolder,
      isLinkFolder: trackMeta?.isLinkFolder,
      isLinkMaster: trackMeta?.isLinkMaster,
      customName: trackMeta?.customName,
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
    trackMeta?.isBusFolder,
    trackMeta?.isLinkFolder,
    trackMeta?.isLinkMaster,
    trackMeta?.customName
  ]);

  const trackIndex = tracksMeta.findIndex(t => t.id === trackId);
  const hasSolo = tracksMeta.some(t => t.isSolo);
  
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

  const slaves = tracksMeta.filter(t => String(t.linkedToTrackId) === String(trackId));
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
  const isLinkedChild = !!(trackMeta && trackMeta.linkedToTrackId && !trackMeta.isLinkFolder);
  const isLinkedSlave = Boolean(trackMeta && trackMeta.linkedToTrackId && !trackMeta.isLinkFolder && !trackMeta.isLinkMaster);
  const isLinkFolder = Boolean(trackMeta?.isLinkFolder);
  const isLinkMaster = Boolean(trackMeta && trackMeta.linkedToTrackId && !trackMeta.isLinkFolder && trackMeta.isLinkMaster);
  const isToada = isToadaBus(trackData);
  const isToadaChildTrack = Boolean(trackMeta && isToadaChild(trackMeta as any, tracksMeta as any));
  const isChild = isLinkedSlave || isToadaChildTrack;

  const displayName = isToada
    ? 'Toada'
    : (isChild ? `↳ ${getTrackDisplayName(trackMeta as any, tracksMeta as any)}` : getTrackDisplayName(trackMeta as any, tracksMeta as any));
  
  const canPlay = !getEffectiveMuteState(tracksMeta, trackId);

  const sequencer = useSequencer();

  const parentBus = React.useMemo(() => {
    if (trackMeta?.isLinkMaster && trackMeta.linkedToTrackId) {
      return tracksMeta.find(p => String(p.id) === String(trackMeta.linkedToTrackId) && p.isLinkFolder);
    }
    return null;
  }, [trackMeta?.isLinkMaster, trackMeta?.linkedToTrackId, tracksMeta]);

  const topBusId = React.useMemo(() => {
    if (!trackMeta) return null;
    return getTopParentBusId(trackMeta as any, tracksMeta as any);
  }, [trackMeta, tracksMeta]);

  const busColor = React.useMemo(() => {
    if (!topBusId) return null;
    return getBusColor(topBusId, tracksMeta as any, instrumentsConfig);
  }, [topBusId, tracksMeta]);

  const isCollapsed = React.useMemo(() => {
    if (isToada) return trackMeta?.isFolded;
    if (trackMeta?.isLinkMaster) return parentBus?.isFolded;
    return false;
  }, [isToada, trackMeta?.isFolded, trackMeta?.isLinkMaster, parentBus?.isFolded]);

  const handleToggleFold = () => {
    if (isToada) {
      onToggleFoldBus(String(trackData.id));
    } else if (trackMeta?.isLinkMaster && parentBus) {
      onToggleFoldBus(String(parentBus.id));
    }
  };

  const parentBusTrackId = (isLinkedSlave || isLinkMaster)
    ? tracksMeta.find(p => String(p.id) === String(trackMeta?.linkedToTrackId) && p.isLinkFolder)?.id
    : undefined;
  const masterTrackId = isLinkedSlave
    ? tracksMeta.find(t => String(t.linkedToTrackId) === String(trackMeta?.linkedToTrackId) && t.isLinkMaster)?.id
    : undefined;
  const slaveTrackIds = isLinkFolder
    ? tracksMeta.filter(t => String(t.linkedToTrackId) === String(trackMeta?.id) && !t.isBusFolder && !t.isLinkMaster).map(t => t.id)
    : undefined;


  const handleMeasureClick = (mIdx: number, steps: number, clickX: number) => {
    const ratio = Math.max(0, Math.min(1, clickX / currentMeasureW));
    const stepIdx = Math.floor(ratio * steps);
    window.dispatchEvent(
      new CustomEvent('o-girador-timeline-nav', {
        detail: { mIdx, sIdx: stepIdx }
      })
    );
  };

  const [automationParam, setAutomationParam] = React.useState<'volume' | 'pan' | 'reverb'>('volume');

  const handleTrackMeasureVolChange = React.useCallback((mIdx: number, val: number) => {
    useSequencerStore.getState().handleTrackMeasureVolChange(trackId, mIdx, val);
  }, [trackId]);

  const handleTrackMeasureVolTransitionChange = React.useCallback((mIdx: number, val: 'immediate' | 'ramp' | 'bezier') => {
    useSequencerStore.getState().handleTrackMeasureVolTransitionChange(trackId, mIdx, val);
  }, [trackId]);

  const handleTrackMeasurePanChange = React.useCallback((mIdx: number, val: number) => {
    useSequencerStore.getState().handleTrackMeasurePanChange(trackId, mIdx, val);
  }, [trackId]);

  const handleTrackMeasurePanTransitionChange = React.useCallback((mIdx: number, val: 'immediate' | 'ramp' | 'bezier') => {
    useSequencerStore.getState().handleTrackMeasurePanTransitionChange(trackId, mIdx, val);
  }, [trackId]);

  const handleTrackMeasureReverbChange = React.useCallback((mIdx: number, val: number) => {
    useSequencerStore.getState().handleTrackMeasureReverbChange(trackId, mIdx, val);
  }, [trackId]);

  const handleTrackMeasureReverbTransitionChange = React.useCallback((mIdx: number, val: 'immediate' | 'ramp' | 'bezier') => {
    useSequencerStore.getState().handleTrackMeasureReverbTransitionChange(trackId, mIdx, val);
  }, [trackId]);

  const handleToggleAutomationBypass = React.useCallback(() => {
    useSequencerStore.getState().toggleTrackAutomationBypass(trackId, automationParam);
  }, [trackId, automationParam]);

  const leftSpacerWidth = Math.max(0, visibleRange.start) * currentMeasureW;
  const rightSpacerCount = Math.max(0, totalMeasures - 1 - visibleRange.end);
  const rightSpacerWidth = rightSpacerCount * currentMeasureW;

  return (
    <div className="flex flex-col">
      <div
        className={`flex border-b border-[var(--cordel-border)]/20 h-10 rounded-none transition-opacity duration-150 relative ${
          !canPlay ? 'opacity-50' : ''
        }`}
        style={{ 
          width: `${HEADER_W + totalContentW}px`,
          minWidth: `${HEADER_W + totalContentW}px`,
        }}
      >
      {/* ── Sticky track header ── */}
      <div
        className={`timeline-sticky-header sticky left-0 z-35 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center justify-between py-1 shadow-[2px_0_5px_rgba(0,0,0,0.15)] shrink-0 ${
          isMobile ? (isChild ? 'pl-3 pr-1' : 'px-1') : (isChild ? 'pl-8 pr-3' : 'px-3')
        }`}
        style={{ 
          width: HEADER_W, 
          minWidth: HEADER_W, 
          transformOrigin: '0 0',
          borderLeft: busColor ? `4px solid ${busColor}` : undefined
        }}
      >
        <div className={`flex items-center min-w-0 flex-grow ${isMobile ? 'gap-0.5' : 'gap-2'}`}>
          {(trackMeta?.isLinkMaster || isToada) && (
            <button
              onClick={handleToggleFold}
              className="p-0.5 hover:bg-[var(--cordel-text)]/10 rounded cursor-pointer text-[10px] font-bold mr-1 shrink-0 flex items-center justify-center w-4 h-4 border border-[var(--cordel-border)]/30 text-[var(--cordel-text)] pointer-events-auto"
              title={isCollapsed ? (lang === 'fr' ? 'Déplier' : 'Desdobrar') : (lang === 'fr' ? 'Plier' : 'Dobrar')}
            >
              {isCollapsed ? '▶' : '▼'}
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

          {/* Automation Curve Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAutomation?.();
            }}
            className={`p-0.5 rounded cursor-pointer shrink-0 flex items-center justify-center transition-all ml-auto pointer-events-auto ${
              isAutomationOpen
                ? 'bg-[#8b2a1a] text-[#f4ecd8] border border-black shadow-sm'
                : 'bg-transparent hover:bg-[var(--cordel-text)]/10 text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)] border border-transparent hover:border-[var(--cordel-border)]/30'
            }`}
            style={{ width: '22px', height: '22px' }}
            title={lang === 'fr' 
              ? (isAutomationOpen ? "Masquer l'automation de volume" : "Afficher l'automation de volume") 
              : (isAutomationOpen ? "Ocultar automação de volume" : "Mostrar automação de volume")}
          >
            <Activity className="w-3.5 h-3.5" />
          </button>
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
          const isToada = isToadaBus(trackData);

          let activePattern: Pattern | null = null;
          let activeTrack: any = null;
          let currentTrackId = trackData.id;
          let currentInstrumentIdx = trackData.instrumentIdx;
          let currentInst = inst;
          let currentPatternsList = trackData.patterns;
          let currentTrackIdx = trackIndex;
          let isOverridden = false;
          let isSilence = false;

          if (isToada) {
            const puxTrack = useSequencerStore.getState().tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
            const coroTrack = useSequencerStore.getState().tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
            const pPtn = puxTrack?.patterns.find(p => p.measureAssignments[mIdx]);
            const cPtn = coroTrack?.patterns.find(p => p.measureAssignments[mIdx]);
            if (cPtn) {
              activePattern = cPtn;
              activeTrack = coroTrack;
              currentTrackIdx = tracksMeta.findIndex(t => t.id === coroTrack!.id);
            } else if (pPtn) {
              activePattern = pPtn;
              activeTrack = puxTrack;
              currentTrackIdx = tracksMeta.findIndex(t => t.id === puxTrack!.id);
            }

            if (activeTrack) {
              currentTrackId = activeTrack.id;
              currentInstrumentIdx = activeTrack.instrumentIdx;
              currentInst = instrumentsConfig[currentInstrumentIdx] || inst;
            }

            const toadaPatternsList: Pattern[] = [];
            if (puxTrack) toadaPatternsList.push(...puxTrack.patterns);
            if (coroTrack) toadaPatternsList.push(...coroTrack.patterns);
            currentPatternsList = toadaPatternsList;
          } else if (isLinkedChild && trackMeta) {
            const parentBus = useSequencerStore.getState().tracks.find(p => String(p.id) === String(trackMeta.linkedToTrackId) && p.isLinkFolder);
            if (parentBus) {
              const override = trackMeta.isLinkMaster ? undefined : trackMeta.patternOverrides?.[mIdx];
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
              currentTrackIdx = tracksMeta.findIndex(t => t.id === parentBus.id);
            }
          } else {
            activePattern = trackData.patterns.find((p: any) => p.measureAssignments[mIdx]);
            activeTrack = trackData;
          }

          const patternIdx = activePattern && activeTrack ? activeTrack.patterns.findIndex((p: any) => p.id === activePattern.id) : -1;
          const steps = activePattern ? activePattern.steps : 16;

          // Find if there is a section covering this measure
          const measureSection = songSections.find(s => mIdx >= s.startMeasure && mIdx <= s.endMeasure);
          const isSectionStart = !!(measureSection && mIdx === measureSection.startMeasure);
          const isSectionEnd = !!(measureSection && mIdx === measureSection.endMeasure);
          const sectionColor = measureSection?.color || '';

          const isInLoop = loopStartMeasure !== null && loopEndMeasure !== null && mIdx >= loopStartMeasure && mIdx <= loopEndMeasure;
          const loopStatus = loopStartMeasure !== null && loopEndMeasure !== null
            ? (isInLoop ? (isLoopRegionActive ? 'inside-active' as const : 'none' as const) : (isLoopRegionActive ? 'outside-active' as const : 'none' as const))
            : 'none' as const;

          const hasChildOverrides = Boolean(
            trackMeta?.isLinkFolder && tracksMeta.some(child => 
              String(child.linkedToTrackId) === String(trackMeta.id) && 
              !child.isLinkFolder && 
              child.patternOverrides?.[mIdx] !== undefined
            )
          );

          return (
            <TimelineMeasure
              key={mIdx}
              mIdx={mIdx}
              trackId={isLinkedChild && trackMeta ? trackMeta.id : currentTrackId}
              trackIdx={isLinkedChild && trackMeta ? trackIndex : currentTrackIdx}
              instrumentIdx={isLinkedChild && trackMeta ? trackMeta.instrumentIdx : currentInstrumentIdx}
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
              measureAllowVariations={activePattern?.measureAllowVariations?.[mIdx] ?? true}
              variationsCount={activePattern?.variations?.length || 0}
              isMacro={isMacro}
              isMinZoom={isMinZoom}
              instColors={isLinkedChild ? inst.colors : currentInst.colors}
              instMixerBg={isLinkedChild ? inst.mixerBg : currentInst.mixerBg}
              activePatternActiveSteps={activePattern?.activeSteps}
              onMeasureClick={handleMeasureClick}
              isLinkedChild={!!isLinkedChild}
              isLinkMaster={isLinkMaster}
              isLinkFolder={isLinkFolder}
              isSlave={isLinkedSlave}
              parentBusTrackId={parentBusTrackId}
              masterTrackId={masterTrackId}
              slaveTrackIds={slaveTrackIds}
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

      {isAutomationOpen && (
        <AutomationTrack
          type={automationParam}
          label={
            automationParam === 'volume'
              ? (lang === 'fr' ? `Vol : ${displayName}` : `Vol: ${displayName}`)
              : automationParam === 'pan'
              ? (lang === 'fr' ? `Pan : ${displayName}` : `Pan: ${displayName}`)
              : (lang === 'fr' ? `Rév : ${displayName}` : `Rev: ${displayName}`)
          }
          totalMeasures={totalMeasures}
          measureWidth={currentMeasureW}
          values={
            automationParam === 'volume'
              ? (trackAutomationData?.measureVols || Array(totalMeasures).fill(trackAutomationData?.volumeVal ?? 100))
              : automationParam === 'pan'
              ? (trackAutomationData?.measurePans || Array(totalMeasures).fill(trackAutomationData?.panVal ?? 0))
              : (trackAutomationData?.measureReverbSends || Array(totalMeasures).fill(trackAutomationData?.reverbVal ?? 0))
          }
          transitions={
            automationParam === 'volume'
              ? (trackAutomationData?.measureVolTransitions || Array(totalMeasures).fill('immediate'))
              : automationParam === 'pan'
              ? (trackAutomationData?.measurePanTransitions || Array(totalMeasures).fill('immediate'))
              : (trackAutomationData?.measureReverbTransitions || Array(totalMeasures).fill('immediate'))
          }
          onChangeValue={
            automationParam === 'volume'
              ? handleTrackMeasureVolChange
              : automationParam === 'pan'
              ? handleTrackMeasurePanChange
              : handleTrackMeasureReverbChange
          }
          onChangeTransition={
            automationParam === 'volume'
              ? handleTrackMeasureVolTransitionChange
              : automationParam === 'pan'
              ? handleTrackMeasurePanTransitionChange
              : handleTrackMeasureReverbTransitionChange
          }
          onClose={onToggleAutomation}
          min={automationParam === 'pan' ? -100 : 0}
          max={100}
          color={
            automationParam === 'volume'
              ? (inst.colors?.text || '#f19066')
              : automationParam === 'pan'
              ? '#38bdf8'
              : '#c084fc'
          }
          lang={lang}
          headerWidth={HEADER_W}
          isBypassed={!!trackAutomationData?.automationBypass?.[automationParam]}
          onToggleBypass={handleToggleAutomationBypass}
          paramSelector={{
            current: automationParam,
            onChange: setAutomationParam,
          }}
        />
      )}
    </div>
  );
};

export const TimelineTrackRow = React.memo(TimelineTrackRowComponent, (prev, next) => {
  return prev.trackId === next.trackId &&
         prev.currentMeasureW === next.currentMeasureW &&
         prev.visibleRange.start === next.visibleRange.start &&
         prev.visibleRange.end === next.visibleRange.end &&
         prev.isAutomationOpen === next.isAutomationOpen;
});
