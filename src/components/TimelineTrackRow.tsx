import React, { useContext, useMemo, useState } from 'react';
import { useSequencerStore, isToadaBus, isToadaChild, getEffectiveMuteState, selectTracksMeta } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { instrumentsConfig } from '../data';
import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { TimelineMeasure } from './TimelineMeasure';
import { getTrackDisplayName, getBusColor, getTopParentBusId, getInstrumentPrimaryStrongColor } from '../utils/colorHelpers';
import { getTrackGroupVisual } from './workspace/trackGroupVisual';
import { TimelineTrackAutomationLane } from './timeline/TimelineTrackAutomationLane';
import { TimelineTrackHeader } from './timeline/TimelineTrackHeader';
import { resolveTimelineTrackMeasureData } from './timeline/TimelineTrackToadaMirror';
import { isSlaveTrack } from '../utils/trackMasterResolver';

interface TimelineTrackRowProps {
  trackId: number; visibleRange: { start: number; end: number }; currentMeasureW: number;
  onStepTouchStart?: (e: React.MouseEvent | React.TouchEvent, pId: number, sIdx: number, iId: string, val: string | number, onSel: (v: string) => void) => void;
  isAutomationOpen?: boolean; onToggleAutomation?: () => void;
}

const TimelineTrackRowComponent: React.FC<TimelineTrackRowProps> = ({
  trackId, visibleRange = { start: 0, end: 8 }, currentMeasureW, onStepTouchStart, isAutomationOpen = false, onToggleAutomation,
}) => {
  const uiContext = useContext(TimelineUIContext);
  if (!uiContext) return null;
  const { HEADER_W, totalContentW = 0, isMobile, isMacro, isMinZoom, isPanningActive, lang, onOpenPatternPicker, measureWidths, measureLeftPositions } = uiContext;

  const tracksMeta = useSequencerStore(selectTracksMeta);
  const trackMeta = tracksMeta.find((t) => t.id === trackId);
  const trackInst = trackMeta ? instrumentsConfig[trackMeta.instrumentIdx] : null;
  const isToada = Boolean(trackMeta && isToadaBus(trackMeta as any));

  const liveTrack = useSequencerStore((s) => s.tracks.find((c) => c.id === trackId));
  const tracksVersion = useSequencerStore((s) => s.tracksVersion);

  const autoData = useSequencerStore(
    useShallow((s) => {
      if (!isAutomationOpen) return null;
      const t = s.tracks.find((c) => c.id === trackId);
      return t
        ? {
            measureVols: t.measureVols, volumeVal: t.volumeVal, measurePans: t.measurePans, panVal: t.panVal,
            measureReverbSends: t.measureReverbSends, reverbVal: t.reverbVal, measureVolTransitions: t.measureVolTransitions,
            measurePanTransitions: t.measurePanTransitions, measureReverbTransitions: t.measureReverbTransitions, automationBypass: t.automationBypass,
          }
        : null;
    })
  );
  const globalBypass = useSequencerStore((s) => s.globalAutomationBypass);

  const trackData = useMemo(() => {
    if (isMacro && !isToada) return liveTrack || null;
    if (!liveTrack && !isToada) return null;
    const patterns = isToada
      ? []
      : (liveTrack?.patterns || []).map((p) => ({
          id: p.id, name: p.name, steps: p.steps, vocalMode: p.vocalMode,
          measureAssignments: p.measureAssignments, measureAllowVariations: p.measureAllowVariations,
          variationsCount: p.variations?.length || 0,
        }));
    return {
      id: trackId, instrumentIdx: trackMeta?.instrumentIdx ?? 0, isMute: trackMeta?.isMute ?? false,
      isSolo: trackMeta?.isSolo ?? false, isBusFolder: trackMeta?.isBusFolder, isLinkFolder: trackMeta?.isLinkFolder,
      isLinkMaster: trackMeta?.isLinkMaster, customName: trackMeta?.customName, patterns,
    };
  }, [isMacro, isToada, liveTrack, tracksVersion, trackId, trackMeta]);

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
  const isLinkedSlave = Boolean(trackMeta && isSlaveTrack(trackMeta as any, tracksMeta as any) && !isToadaChildTrack);
  const isLinkFolder = Boolean(trackMeta?.isLinkFolder && !trackMeta?.isBusFolder);
  const isLinkMaster = Boolean(trackMeta?.isLinkMaster && !trackMeta?.isBusFolder && !isToadaChildTrack);
  const isChild = isLinkedSlave || isToadaChildTrack;
  const displayName = isToada ? 'Toada' : isChild ? `↳ ${getTrackDisplayName(trackMeta as any, tracksMeta as any)}` : getTrackDisplayName(trackMeta as any, tracksMeta as any);

  const parentBus = trackMeta?.isLinkMaster && trackMeta.linkedToTrackId ? tracksMeta.find((p) => String(p.id) === String(trackMeta.linkedToTrackId) && p.isLinkFolder) : null;
  const topBusId = trackMeta ? getTopParentBusId(trackMeta as any, tracksMeta as any) : null;
  const busColor = topBusId ? getBusColor(topBusId, tracksMeta as any, instrumentsConfig) : null;
  const groupVisual = trackMeta ? getTrackGroupVisual(trackMeta as any, tracksMeta as any) : null;
  const badgeColor = getInstrumentPrimaryStrongColor(trackInst, trackMeta);
  const isCollapsed = isToada ? Boolean(trackMeta?.isSequencerFolded) : trackMeta?.isLinkMaster ? Boolean(parentBus ? parentBus.isSequencerFolded : trackMeta?.isSequencerFolded) : false;

  const parentBusTrackId = isLinkedSlave || isLinkMaster ? tracksMeta.find((p) => String(p.id) === String(trackMeta?.linkedToTrackId) && p.isLinkFolder)?.id : undefined;
  const masterTrackId = isLinkedSlave ? tracksMeta.find((t) => String(t.linkedToTrackId) === String(trackMeta?.linkedToTrackId) && t.isLinkMaster)?.id : undefined;
  const slaveTrackIds = isLinkFolder ? tracksMeta.filter((t) => String(t.linkedToTrackId) === String(trackMeta?.id) && !t.isBusFolder && !t.isLinkMaster).map((t) => t.id) : undefined;

  const leftSpacerW = measureLeftPositions?.[visibleRange.start] ?? Math.max(0, visibleRange.start) * currentMeasureW;
  const rightSpacerCount = Math.max(0, totalMeasures - 1 - visibleRange.end);
  const rightSpacerW = totalContentW && measureLeftPositions ? Math.max(0, totalContentW - (measureLeftPositions[visibleRange.end + 1] ?? (visibleRange.end + 1) * currentMeasureW)) : rightSpacerCount * currentMeasureW;
  const safeBaseW = currentMeasureW > 0 ? currentMeasureW : 120;
  const totalContentRatio = totalContentW > 0 ? totalContentW / safeBaseW : totalMeasures;
  const leftSpacerRatio = leftSpacerW / safeBaseW;
  const rightSpacerRatio = rightSpacerW / safeBaseW;

  const allTracksSnapshot = useSequencerStore.getState().tracks;
  const puxTrack = isToada ? allTracksSnapshot.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador') : null;
  const coroTrack = isToada ? allTracksSnapshot.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro') : null;
  const isMuted = Boolean(getEffectiveMuteState(tracksMeta, trackId));

  return (
    <div className="flex flex-col">
      <div className="flex border-b border-[var(--cordel-border)]/20 h-10 rounded-none relative" style={{ width: `calc(${HEADER_W}px + var(--measure-width, 120px) * ${totalContentRatio})`, minWidth: `calc(${HEADER_W}px + var(--measure-width, 120px) * ${totalContentRatio})` }}>
        <TimelineTrackHeader trackId={trackId} trackIndex={trackIndex} HEADER_W={HEADER_W} isMobile={isMobile} isChild={isChild} busColor={busColor} badgeColor={badgeColor} groupVisual={groupVisual} canFold={Boolean(trackMeta?.isLinkMaster || isToada)} isCollapsed={isCollapsed} onToggleFold={() => onToggleFoldBus(String(isToada ? trackData.id : (parentBus?.id ?? trackData.id)))} instIconImg={trackInst.iconImg} instName={trackInst.name} displayName={displayName} customName={trackMeta?.customName} lang={lang} isAutomationOpen={isAutomationOpen} onToggleAutomation={onToggleAutomation} isMute={isMuted} />
        <div className={`flex h-full items-center overflow-hidden ${isMuted ? 'opacity-40' : ''}`} style={{ width: `calc(var(--measure-width, 120px) * ${totalContentRatio})`, minWidth: `calc(var(--measure-width, 120px) * ${totalContentRatio})` }}>
          {visibleRange.start > 0 && <div style={{ width: `calc(var(--measure-width, 120px) * ${leftSpacerRatio})`, minWidth: `calc(var(--measure-width, 120px) * ${leftSpacerRatio})` }} className="shrink-0" />}
          {Array.from({ length: totalMeasures }).map((_, mIdx) => ({ mIdx })).filter(({ mIdx }) => mIdx >= visibleRange.start && mIdx <= visibleRange.end).map(({ mIdx }) => {
            const m = resolveTimelineTrackMeasureData(mIdx, isToada, trackData, trackInst, trackIndex, tracksMeta, trackMeta, isLinkedSlave, puxTrack, coroTrack, allTracksSnapshot);
            const sec = (songSections || []).find((s) => mIdx >= s.startMeasure && mIdx <= s.endMeasure);
            const inLoop = loopStartMeasure !== null && loopEndMeasure !== null && mIdx >= loopStartMeasure && mIdx <= loopEndMeasure;
            const loopStatus = loopStartMeasure !== null && loopEndMeasure !== null ? (inLoop ? (isLoopRegionActive ? ('inside-active' as const) : ('none' as const)) : isLoopRegionActive ? ('outside-active' as const) : ('none' as const)) : ('none' as const);
            const pIdx = m.activePattern && m.activeTrack?.patterns ? m.activeTrack.patterns.findIndex((p: any) => p.id === m.activePattern!.id) : -1;
            const mW = measureWidths?.[mIdx] ?? currentMeasureW;
            return (
              <TimelineMeasure key={mIdx} mIdx={mIdx} trackId={isLinkedSlave && trackMeta ? trackMeta.id : m.currentTrackId} trackIdx={isLinkedSlave && trackMeta ? trackIndex : m.currentTrackIdx} instrumentIdx={isLinkedSlave && trackMeta ? trackMeta.instrumentIdx : m.currentInstrumentIdx} currentMeasureW={mW} widthRatio={mW / safeBaseW} patternId={m.activePattern?.id ?? -1} patternIdx={pIdx} steps={16} spanMeasures={m.spanMeasures} relativeIdx={m.relativeIdx} beatResolutions={m.activePattern?.beatResolutions} sectionColor={sec?.color || ''} isSectionStart={Boolean(sec && mIdx === sec.startMeasure)} isSectionEnd={Boolean(sec && mIdx === sec.endMeasure)} loopStatus={loopStatus} isPanningActive={isPanningActive} instId={isLinkedSlave ? trackInst.id : m.currentInst.id} instType={isLinkedSlave ? trackInst.type : m.currentInst.type} lang={lang} activePatternName={m.isSilence ? (lang === 'fr' ? 'Silence' : 'Silêncio') : (m.activePattern?.name ?? null)} patternsList={m.currentPatternsList || []} signalDropdownOpen={uiContext.signalDropdownOpen} onPatternAssignForMeasure={useSequencerStore.getState().handleTimelinePatternAssign} onPatternVariationToggleForMeasure={useSequencerStore.getState().handleTimelinePatternVariationToggle} measureAllowVariations={m.activePattern?.measureAllowVariations?.[mIdx] ?? true} variationsCount={m.activePattern?.variations?.length ?? 0} isMacro={isMacro} isMinZoom={isMinZoom} instColors={isLinkedSlave ? (trackInst?.colors || {}) : (m.currentInst?.colors || trackInst?.colors || {})} instMixerBg={getInstrumentPrimaryStrongColor(isLinkedSlave ? trackInst : (m.currentInst || trackInst), trackMeta)} activePatternActiveSteps={m.sliceSteps} onMeasureClick={(idx, s, cX) => { const st = useSequencerStore.getState(); if (!st.isPlaying) { st.setCurrentMeasure(idx); window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', { detail: { mIdx: idx, sIdx: 0 } })); } else { const curMW = measureWidths?.[idx] ?? currentMeasureW; window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', { detail: { mIdx: idx, sIdx: Math.floor(Math.max(0, Math.min(1, cX / curMW)) * s) } })); } }} isLinkedChild={isLinkedSlave} isLinkMaster={isLinkMaster} isLinkFolder={isLinkFolder} isSlave={isLinkedSlave} parentBusTrackId={parentBusTrackId} masterTrackId={masterTrackId} slaveTrackIds={slaveTrackIds} isOverridden={m.isOverridden} isSilence={m.isSilence} hasChildOverrides={Boolean(trackMeta?.isLinkFolder && tracksMeta.some((c) => String(c.linkedToTrackId) === String(trackMeta.id) && !c.isLinkFolder && c.patternOverrides?.[mIdx] !== undefined))} onStepTouchStart={onStepTouchStart} isToada={isToada} isToadaComposite={m.isToadaComposite} toadaCompositePatterns={m.toadaCompositePatterns} toadaVocalBadges={m.toadaVocalBadges} onOpenPatternPicker={isToada ? undefined : onOpenPatternPicker} />
            );
          })}
          {rightSpacerCount > 0 && <div style={{ width: `calc(var(--measure-width, 120px) * ${rightSpacerRatio})`, minWidth: `calc(var(--measure-width, 120px) * ${rightSpacerRatio})` }} className="shrink-0" />}
        </div>
      </div>
      {isAutomationOpen && (
        <TimelineTrackAutomationLane automationParam={automationParam} setAutomationParam={setAutomationParam} trackId={trackId} displayName={displayName} totalMeasures={totalMeasures} currentMeasureW={currentMeasureW} autoData={autoData} onToggleAutomation={onToggleAutomation || (() => {})} trackInst={trackInst} lang={lang} HEADER_W={HEADER_W} globalBypass={globalBypass} />
      )}
    </div>
  );
};

export const TimelineTrackRow = React.memo(TimelineTrackRowComponent, (prev, next) => (
  prev.trackId === next.trackId && prev.currentMeasureW === next.currentMeasureW && prev.visibleRange.start === next.visibleRange.start && prev.visibleRange.end === next.visibleRange.end && prev.isAutomationOpen === next.isAutomationOpen
));
