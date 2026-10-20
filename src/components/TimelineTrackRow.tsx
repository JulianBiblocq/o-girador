import React, { useContext, useMemo, useState, useCallback } from 'react';
import { useSequencerStore, isToadaBus, isToadaChild, getEffectiveMuteState, selectTracksMeta } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { instrumentsConfig } from '../data';
import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { TimelineMeasure } from './TimelineMeasure';
import { getTrackDisplayName, getBusColor, getTopParentBusId } from '../utils/colorHelpers';
import { AutomationTrack } from './AutomationTrack';
import { TimelineTrackHeader } from './timeline/TimelineTrackHeader';
import { resolveTimelineTrackMeasureData } from './timeline/TimelineTrackToadaMirror';

interface TimelineTrackRowProps {
  trackId: number;
  visibleRange: { start: number; end: number };
  currentMeasureW: number;
  onStepTouchStart?: (e: React.MouseEvent | React.TouchEvent, pId: number, sIdx: number, iId: string, val: string | number, onSel: (v: string) => void) => void;
  isAutomationOpen?: boolean;
  onToggleAutomation?: () => void;
}

const TimelineTrackRowComponent: React.FC<TimelineTrackRowProps> = ({
  trackId,
  visibleRange = { start: 0, end: 8 },
  currentMeasureW,
  onStepTouchStart,
  isAutomationOpen = false,
  onToggleAutomation,
}) => {
  const uiContext = useContext(TimelineUIContext);
  if (!uiContext) return null;
  const { HEADER_W, totalContentW = 0, isMobile, isMacro, isMinZoom, isPanningActive, lang, onOpenPatternPicker, measureWidths, measureLeftPositions } = uiContext;

  const tracksMeta = useSequencerStore(selectTracksMeta);
  const trackMeta = tracksMeta.find((t) => t.id === trackId);
  const trackInst = trackMeta ? instrumentsConfig[trackMeta.instrumentIdx] : null;
  const isToada = Boolean(trackMeta && isToadaBus(trackMeta as any));
  const fullTrack = useSequencerStore((s) => (isMacro && !isToada ? s.tracks.find((t) => t.id === trackId) : null));

  const trackStructureJson = useSequencerStore((state) => {
    if (isToada) {
      const pux = state.tracks.find((c) => instrumentsConfig[c.instrumentIdx]?.id === 'puxador');
      const coro = state.tracks.find((c) => instrumentsConfig[c.instrumentIdx]?.id === 'coro');
      return JSON.stringify({
        pux: pux?.patterns.map((p) => ({ id: p.id, name: p.name, assignments: p.measureAssignments })),
        coro: coro?.patterns.map((p) => ({ id: p.id, name: p.name, assignments: p.measureAssignments })),
      });
    }
    if (isMacro) return '';
    const t = state.tracks.find((c) => c.id === trackId);
    return t ? JSON.stringify(t.patterns.map((p) => ({ id: p.id, name: p.name, steps: p.steps, vocalMode: p.vocalMode, measureAssignments: p.measureAssignments, measureAllowVariations: p.measureAllowVariations, variationsCount: p.variations?.length || 0 }))) : '';
  });

  const autoData = useSequencerStore(useShallow((s) => {
    if (!isAutomationOpen) return null;
    const t = s.tracks.find((c) => c.id === trackId);
    return t ? { measureVols: t.measureVols, volumeVal: t.volumeVal, measurePans: t.measurePans, panVal: t.panVal, measureReverbSends: t.measureReverbSends, reverbVal: t.reverbVal, measureVolTransitions: t.measureVolTransitions, measurePanTransitions: t.measurePanTransitions, measureReverbTransitions: t.measureReverbTransitions, automationBypass: t.automationBypass } : null;
  }));

  const trackData = useMemo(() => {
    if (isMacro && !isToada) return fullTrack;
    if (!trackStructureJson && !isToada) return null;
    return { id: trackId, instrumentIdx: trackMeta?.instrumentIdx ?? 0, isMute: trackMeta?.isMute ?? false, isSolo: trackMeta?.isSolo ?? false, isBusFolder: trackMeta?.isBusFolder, isLinkFolder: trackMeta?.isLinkFolder, isLinkMaster: trackMeta?.isLinkMaster, customName: trackMeta?.customName, patterns: isToada ? [] : (trackStructureJson ? JSON.parse(trackStructureJson) : []) };
  }, [isMacro, isToada, fullTrack, trackStructureJson, trackId, trackMeta]);

  const totalMeasures = useSequencerStore((s) => s.totalMeasures);
  const songSections = useSequencerStore(useShallow((s) => s.songSections));
  const loopStartMeasure = useSequencerStore((s) => s.loopStartMeasure);
  const loopEndMeasure = useSequencerStore((s) => s.loopEndMeasure);
  const isLoopRegionActive = useSequencerStore((s) => s.isLoopRegionActive);
  const onToggleFoldBus = useSequencerStore((s) => s.handleToggleSequencerFoldBus);

  const [automationParam, setAutomationParam] = useState<'volume' | 'pan' | 'reverb'>('volume');

  if (!trackData || !trackInst) return null;
  const trackIndex = tracksMeta.findIndex((t) => t.id === trackId);
  const isToadaChildTrack = Boolean(trackMeta && isToadaChild(trackMeta as any, tracksMeta as any));
  const isLinkedSlave = Boolean(trackMeta?.linkedToTrackId && !trackMeta.isLinkFolder && !trackMeta.isLinkMaster && !isToadaChildTrack);
  const isLinkedChild = Boolean(trackMeta?.linkedToTrackId && !trackMeta.isLinkFolder && !isToadaChildTrack);
  const isLinkFolder = Boolean(trackMeta?.isLinkFolder);
  const isLinkMaster = Boolean(trackMeta?.linkedToTrackId && !trackMeta.isLinkFolder && trackMeta.isLinkMaster && !isToadaChildTrack);
  const isChild = isLinkedSlave || isToadaChildTrack;
  const displayName = isToada ? 'Toada' : (isChild ? `↳ ${getTrackDisplayName(trackMeta as any, tracksMeta as any)}` : getTrackDisplayName(trackMeta as any, tracksMeta as any));

  const parentBus = trackMeta?.isLinkMaster && trackMeta.linkedToTrackId ? tracksMeta.find((p) => String(p.id) === String(trackMeta.linkedToTrackId) && p.isLinkFolder) : null;
  const topBusId = trackMeta ? getTopParentBusId(trackMeta as any, tracksMeta as any) : null;
  const busColor = topBusId ? getBusColor(topBusId, tracksMeta as any, instrumentsConfig) : null;
  const isCollapsed = isToada ? Boolean(trackMeta?.isSequencerFolded) : (trackMeta?.isLinkMaster ? Boolean(parentBus?.isSequencerFolded) : false);

  const parentBusTrackId = (isLinkedSlave || isLinkMaster) ? tracksMeta.find((p) => String(p.id) === String(trackMeta?.linkedToTrackId) && p.isLinkFolder)?.id : undefined;
  const masterTrackId = isLinkedSlave ? tracksMeta.find((t) => String(t.linkedToTrackId) === String(trackMeta?.linkedToTrackId) && t.isLinkMaster)?.id : undefined;
  const slaveTrackIds = isLinkFolder ? tracksMeta.filter((t) => String(t.linkedToTrackId) === String(trackMeta?.id) && !t.isBusFolder && !t.isLinkMaster).map((t) => t.id) : undefined;

  const leftSpacerW = measureLeftPositions?.[visibleRange.start] ?? (Math.max(0, visibleRange.start) * currentMeasureW);
  const rightSpacerCount = Math.max(0, totalMeasures - 1 - visibleRange.end);
  const rightSpacerW = totalContentW && measureLeftPositions ? Math.max(0, totalContentW - (measureLeftPositions[visibleRange.end + 1] ?? ((visibleRange.end + 1) * currentMeasureW))) : rightSpacerCount * currentMeasureW;

  const puxTrack = isToada ? useSequencerStore.getState().tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador') : null;
  const coroTrack = isToada ? useSequencerStore.getState().tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro') : null;

  return (
    <div className="flex flex-col">
      <div className={`flex border-b border-[var(--cordel-border)]/20 h-10 rounded-none transition-opacity duration-150 relative ${!getEffectiveMuteState(tracksMeta, trackId) ? '' : 'opacity-50'}`} style={{ width: `${HEADER_W + totalContentW}px`, minWidth: `${HEADER_W + totalContentW}px` }}>
        <TimelineTrackHeader trackId={trackId} trackIndex={trackIndex} HEADER_W={HEADER_W} isMobile={isMobile} isChild={isChild} busColor={busColor} canFold={Boolean(trackMeta?.isLinkMaster || isToada)} isCollapsed={isCollapsed} onToggleFold={() => onToggleFoldBus(String(isToada ? trackData.id : parentBus?.id))} instIconImg={trackInst.iconImg} instName={trackInst.name} displayName={displayName} customName={trackMeta?.customName} lang={lang} isAutomationOpen={isAutomationOpen} onToggleAutomation={onToggleAutomation} />
        <div className="flex h-full items-center overflow-hidden" style={{ width: `${totalContentW}px`, minWidth: `${totalContentW}px` }}>
          {visibleRange.start > 0 && <div style={{ width: `${leftSpacerW}px`, minWidth: `${leftSpacerW}px` }} className="shrink-0" />}
          {Array.from({ length: totalMeasures }).map((_, mIdx) => ({ mIdx })).filter(({ mIdx }) => mIdx >= visibleRange.start && mIdx <= visibleRange.end).map(({ mIdx }) => {
            const m = resolveTimelineTrackMeasureData(mIdx, isToada, trackData, trackInst, trackIndex, tracksMeta, trackMeta, isLinkedChild, puxTrack, coroTrack);
            const sec = (songSections || []).find((s) => mIdx >= s.startMeasure && mIdx <= s.endMeasure);
            const inLoop = loopStartMeasure !== null && loopEndMeasure !== null && mIdx >= loopStartMeasure && mIdx <= loopEndMeasure;
            const loopStatus = loopStartMeasure !== null && loopEndMeasure !== null ? (inLoop ? (isLoopRegionActive ? 'inside-active' as const : 'none' as const) : (isLoopRegionActive ? 'outside-active' as const : 'none' as const)) : 'none' as const;
            const pIdx = m.activePattern && m.activeTrack?.patterns ? m.activeTrack.patterns.findIndex((p: any) => p.id === m.activePattern!.id) : -1;
            return (
              <TimelineMeasure key={mIdx} mIdx={mIdx} trackId={isLinkedChild && trackMeta ? trackMeta.id : m.currentTrackId} trackIdx={isLinkedChild && trackMeta ? trackIndex : m.currentTrackIdx} instrumentIdx={isLinkedChild && trackMeta ? trackMeta.instrumentIdx : m.currentInstrumentIdx} currentMeasureW={measureWidths?.[mIdx] ?? currentMeasureW} patternId={m.activePattern?.id ?? -1} patternIdx={pIdx} steps={16} spanMeasures={m.spanMeasures} relativeIdx={m.relativeIdx} beatResolutions={m.activePattern?.beatResolutions} sectionColor={sec?.color || ''} isSectionStart={Boolean(sec && mIdx === sec.startMeasure)} isSectionEnd={Boolean(sec && mIdx === sec.endMeasure)} loopStatus={loopStatus} isPanningActive={isPanningActive} instId={isLinkedChild ? trackInst.id : m.currentInst.id} instType={isLinkedChild ? trackInst.type : m.currentInst.type} lang={lang} activePatternName={m.isSilence ? (lang === 'fr' ? 'Silence' : 'Silêncio') : (m.activePattern?.name ?? null)} patternsList={m.currentPatternsList || []} signalDropdownOpen={uiContext.signalDropdownOpen} onPatternAssignForMeasure={useSequencerStore.getState().handleTimelinePatternAssign} onPatternVariationToggleForMeasure={useSequencerStore.getState().handleTimelinePatternVariationToggle} measureAllowVariations={m.activePattern?.measureAllowVariations?.[mIdx] ?? true} variationsCount={m.activePattern?.variations?.length ?? 0} isMacro={isMacro} isMinZoom={isMinZoom} instColors={isLinkedChild ? (trackInst?.colors || {}) : (m.currentInst?.colors || trackInst?.colors || {})} instMixerBg={isLinkedChild ? (trackInst?.mixerBg || '#1a1a1a') : (m.currentInst?.mixerBg || trackInst?.mixerBg || '#1a1a1a')} activePatternActiveSteps={m.sliceSteps} onMeasureClick={(idx, s, cX) => { const st = useSequencerStore.getState(); if (!st.isPlaying) { st.setCurrentMeasure(idx); window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', { detail: { mIdx: idx, sIdx: 0 } })); } else { const mW = measureWidths?.[idx] ?? currentMeasureW; window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', { detail: { mIdx: idx, sIdx: Math.floor(Math.max(0, Math.min(1, cX / mW)) * s) } })); } }} isLinkedChild={isLinkedChild} isLinkMaster={isLinkMaster} isLinkFolder={isLinkFolder} isSlave={isLinkedSlave} parentBusTrackId={parentBusTrackId} masterTrackId={masterTrackId} slaveTrackIds={slaveTrackIds} isOverridden={m.isOverridden} isSilence={m.isSilence} hasChildOverrides={Boolean(trackMeta?.isLinkFolder && tracksMeta.some((c) => String(c.linkedToTrackId) === String(trackMeta.id) && !c.isLinkFolder && c.patternOverrides?.[mIdx] !== undefined))} onStepTouchStart={onStepTouchStart} isToada={isToada} isToadaComposite={m.isToadaComposite} toadaCompositePatterns={m.toadaCompositePatterns} toadaVocalBadges={m.toadaVocalBadges} onOpenPatternPicker={isToada ? undefined : onOpenPatternPicker} />
            );
          })}
          {rightSpacerCount > 0 && <div style={{ width: `${rightSpacerW}px`, minWidth: `${rightSpacerW}px` }} className="shrink-0" />}
        </div>
      </div>
      {isAutomationOpen && (
        <AutomationTrack type={automationParam} trackId={trackId} label={automationParam === 'volume' ? `Vol : ${displayName}` : (automationParam === 'pan' ? `Pan : ${displayName}` : `Rév : ${displayName}`)} totalMeasures={totalMeasures} measureWidth={currentMeasureW} values={automationParam === 'volume' ? (autoData?.measureVols || Array(totalMeasures).fill(autoData?.volumeVal ?? 75)) : (automationParam === 'pan' ? (autoData?.measurePans || Array(totalMeasures).fill(autoData?.panVal ?? 0)) : (autoData?.measureReverbSends || Array(totalMeasures).fill(autoData?.reverbVal ?? 0)))} transitions={automationParam === 'volume' ? (autoData?.measureVolTransitions || Array(totalMeasures).fill('immediate')) : (automationParam === 'pan' ? (autoData?.measurePanTransitions || Array(totalMeasures).fill('immediate')) : (autoData?.measureReverbTransitions || Array(totalMeasures).fill('immediate')))} onChangeValue={(mIdx, val) => { if (automationParam === 'volume') useSequencerStore.getState().handleTrackMeasureVolChange(trackId, mIdx, val); else if (automationParam === 'pan') useSequencerStore.getState().handleTrackMeasurePanChange(trackId, mIdx, val); else useSequencerStore.getState().handleTrackMeasureReverbChange(trackId, mIdx, val); }} onChangeTransition={(mIdx, val) => { if (automationParam === 'volume') useSequencerStore.getState().handleTrackMeasureVolTransitionChange(trackId, mIdx, val); else if (automationParam === 'pan') useSequencerStore.getState().handleTrackMeasurePanTransitionChange(trackId, mIdx, val); else useSequencerStore.getState().handleTrackMeasureReverbTransitionChange(trackId, mIdx, val); }} onClose={onToggleAutomation} min={automationParam === 'pan' ? -100 : 0} max={100} color={automationParam === 'volume' ? (trackInst.colors?.text || '#f19066') : (automationParam === 'pan' ? '#38bdf8' : '#c084fc')} lang={lang} headerWidth={HEADER_W} isBypassed={!!autoData?.automationBypass?.[automationParam]} onToggleBypass={() => useSequencerStore.getState().toggleTrackAutomationBypass(trackId, automationParam)} paramSelector={{ current: automationParam, onChange: setAutomationParam }} />
      )}
    </div>
  );
};

export const TimelineTrackRow = React.memo(TimelineTrackRowComponent, (prev, next) => (
  prev.trackId === next.trackId && prev.currentMeasureW === next.currentMeasureW && prev.visibleRange.start === next.visibleRange.start && prev.visibleRange.end === next.visibleRange.end && prev.isAutomationOpen === next.isAutomationOpen
));
