import React from 'react';
import { TimelineStep } from './TimelineStep';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useTimelineMeasureHandlers } from './timeline/useTimelineMeasureHandlers';
import { TimelineMeasureHeaderBadge } from './timeline/TimelineMeasureHeaderBadge';
import { TimelineMeasureToadaDualWave } from './timeline/TimelineMeasureToadaDualWave';
import { TimelineMeasureMacroBlock } from './timeline/TimelineMeasureMacroBlock';

interface TimelineMeasureProps {
  mIdx: number; trackId: number; trackIdx: number; instrumentIdx: number; currentMeasureW: number; widthRatio?: number;
  patternId: number; patternIdx: number; steps: number; spanMeasures?: number; relativeIdx?: number;
  beatResolutions?: number[]; sectionColor: string; isSectionStart: boolean; isSectionEnd: boolean;
  loopStatus: 'inside-active' | 'outside-active' | 'none'; isPanningActive: boolean; instId: string;
  instType: string; lang: string; activePatternName: string | null;
  patternsList: Array<{ id: number; name: string; vocalMode?: string }>; signalDropdownOpen: number | null;
  onPatternAssignForMeasure: (trackId: number, patternId: number | null | undefined, mIdx: number) => void;
  onPatternVariationToggleForMeasure: (trackId: number, patternId: number, mIdx: number, value: boolean) => void;
  measureAllowVariations: boolean; variationsCount: number; isMacro: boolean; isMinZoom: boolean;
  instColors: Record<string, string>; instMixerBg: string; activePatternActiveSteps?: any[];
  onMeasureClick: (mIdx: number, steps: number, clickX: number) => void; isLinkedChild?: boolean;
  isLinkMaster?: boolean; isLinkFolder?: boolean; isSlave?: boolean; parentBusTrackId?: number;
  masterTrackId?: number; slaveTrackIds?: number[]; isOverridden?: boolean; isSilence?: boolean;
  hasChildOverrides?: boolean; isToada?: boolean; toadaVocalBadges?: { pPtnName?: string; cPtnName?: string };
  isToadaComposite?: boolean; toadaCompositePatterns?: { puxPtn: any; coroPtn: any; puxTrackId?: number; coroTrackId?: number };
  onStepTouchStart?: (e: React.MouseEvent | React.TouchEvent, pId: number, sIdx: number, iId: string, val: string | number, onSel: (v: string) => void) => void;
  onOpenPatternPicker?: (trackId: number, measureIdx: number, rect: DOMRect) => void;
}

const TimelineMeasureComponent: React.FC<TimelineMeasureProps> = ({
  mIdx, trackId, trackIdx, instrumentIdx, widthRatio = 1, patternId, patternIdx, steps, spanMeasures = 1,
  relativeIdx = 0, beatResolutions, sectionColor, isSectionStart, isSectionEnd, loopStatus, isPanningActive,
  instId, instType, lang, activePatternName, patternsList, onPatternAssignForMeasure, onPatternVariationToggleForMeasure,
  measureAllowVariations, variationsCount, isMacro, isMinZoom, instColors, instMixerBg, activePatternActiveSteps,
  onMeasureClick, isLinkedChild, isLinkMaster, isLinkFolder, isSlave: propIsSlave, parentBusTrackId, masterTrackId,
  slaveTrackIds, isOverridden, isSilence, hasChildOverrides, isToada, toadaVocalBadges, isToadaComposite,
  onStepTouchStart, onOpenPatternPicker,
}) => {
  const cssMeasureW = widthRatio === 1 ? 'var(--measure-width, 120px)' : `calc(var(--measure-width, 120px) * ${widthRatio})`;
  const timeSigStr = useSequencerStore((s) => s.measureTimeSigs?.[mIdx] || s.timeSig || '4/4');
  const isMulti = useSequencerStore(React.useCallback((s) => s.selectedTimelineCells.some((c) => c.trackId === trackId && c.mIdx === mIdx), [trackId, mIdx]));
  const isActive = useSequencerStore(React.useCallback((s) => s.selectedTimelineCells.length === 0 && s.activeTimelineCell?.trackId === trackId && s.activeTimelineCell?.measureIdx === mIdx, [trackId, mIdx]));
  const isSel = isMulti || isActive;
  const isSlave = propIsSlave !== undefined ? Boolean(propIsSlave) : Boolean(isLinkedChild && !isLinkMaster);

  const defaultBeats = timeSigStr === '2/4' || timeSigStr === '6/8' ? 2 : timeSigStr === '3/4' ? 3 : (parseInt(timeSigStr.split('/')[0], 10) || 4);
  const beatRes = beatResolutions || Array(defaultBeats).fill(4);
  const beatGroups: number[][] = [];
  let stepsInMeasure = 0;
  for (let b = 0; b < defaultBeats; b++) {
    const res = beatRes[b] ?? 4;
    beatGroups.push(Array.from({ length: res }, (_, i) => stepsInMeasure + i));
    stepsInMeasure += res;
  }

  const handlers = useTimelineMeasureHandlers({ trackId, mIdx, steps: stepsInMeasure, patternId, instType, isToada, isPanningActive, onMeasureClick, onOpenPatternPicker });
  const loopBg = loopStatus === 'inside-active' ? 'bg-blue-600/[0.03]' : (loopStatus === 'outside-active' ? 'bg-black/10 dark:bg-black/30 opacity-70' : '');
  const hasActiveDetailedTint = !isMacro && patternId !== -1 && !isSilence && !isToada;
  const tintHex = instMixerBg || instColors?.['D'] || instColors?.['E'] || '#8b2a1a';
  const detailedBlockStyle: React.CSSProperties | undefined = hasActiveDetailedTint
    ? {
        backgroundColor: `${tintHex}2e`, // ~18% d'opacité pour continuité visuelle avec les zooms éloignés
        border: `1px solid ${tintHex}4d`, // 30% d'opacité sur la bordure fine
        borderLeftWidth: relativeIdx > 0 ? '1px' : '2px',
        borderLeftStyle: relativeIdx > 0 ? 'dashed' : 'solid',
        borderLeftColor: `${tintHex}80`,
      }
    : undefined;

  return (
    <div
      className={`h-full cursor-pointer border-r shrink-0 select-none relative transition-all duration-100 ${isMulti ? 'ring-2 ring-inset ring-[#8b2a1a] shadow-[inset_0_0_0_2px_var(--cordel-bg)] bg-[#8b2a1a]/[0.08] z-20' : (isActive ? 'ring-2 ring-inset ring-[#8b2a1a] bg-[#8b2a1a]/[0.08] shadow-[inset_0_0_0_1px_#8b2a1a,0_0_8px_rgba(139,42,26,0.3)] z-20' : '')} ${(mIdx + 1) % 4 === 0 ? 'border-r-2 border-r-blue-500/40 dark:border-r-blue-400/40 shadow-[1px_0_0_0_rgba(59,130,246,0.15)]' : 'border-r-[var(--cordel-border)]/20'} ${loopBg} ${sectionColor ? 'cell-section-tint' : ''} ${isSectionStart ? 'cell-section-start' : ''} ${isSectionEnd ? 'cell-section-end' : ''}`}
      style={{ width: cssMeasureW, minWidth: cssMeasureW, contain: 'layout paint style', opacity: 1.0, WebkitTouchCallout: 'none', userSelect: 'none', ...({ '--section-color': sectionColor } as React.CSSProperties) }}
      onPointerDown={handlers.handlePointerDown} onClick={handlers.handleClick} onDoubleClick={handlers.handleDoubleClick} onContextMenu={handlers.handleContextMenu} onTouchStart={handlers.handleTouchStart} onTouchMove={handlers.handleTouchMove} onTouchEnd={handlers.handleTouchEnd} onTouchCancel={handlers.handleTouchCancel}
    >
      {isSel && <div className="absolute top-0 right-0 w-2.5 h-2.5 pointer-events-none z-20"><div className="w-full h-full bg-[#8b2a1a]" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} /></div>}
      {!isMacro && (
        <div className="cell-detailed w-full h-full relative box-border" style={detailedBlockStyle}>
          <TimelineMeasureHeaderBadge trackId={trackId} mIdx={mIdx} patternId={patternId} activePatternName={activePatternName} patternsList={patternsList} spanMeasures={spanMeasures} relativeIdx={relativeIdx} isToada={isToada} toadaVocalBadges={toadaVocalBadges} isSlave={isSlave} isFollowingMaster={Boolean(isSlave && !isOverridden)} isOverridden={isOverridden} isSilence={isSilence} isSelectedCell={isSel} isPanningActive={isPanningActive} hasChildOverrides={hasChildOverrides} lang={lang} instType={instType} instId={instId} variationsCount={variationsCount} measureAllowVariations={measureAllowVariations} onPatternAssignForMeasure={onPatternAssignForMeasure} onPatternVariationToggleForMeasure={onPatternVariationToggleForMeasure} />
          {isToada || patternId === -1 ? (
            <TimelineMeasureToadaDualWave patternId={patternId} isSelectedCell={isSel} isToadaComposite={isToadaComposite} toadaVocalBadges={toadaVocalBadges} />
          ) : (
            <div className="flex h-full w-full pointer-events-none">
              {beatGroups.map((group, bIdx) => (
                <div key={bIdx} className="flex flex-1 h-full items-center border-r border-[var(--cordel-border)]/20 last:border-r-0">
                  {group.map((sIdx) => (
                    <TimelineStep key={sIdx} trackId={trackId} patternId={patternId} measureIdx={mIdx} stepIdx={sIdx} patternStepOffset={(relativeIdx || 0) * 16} stepsCount={stepsInMeasure} trackIdx={trackIdx} patternIdx={patternIdx} instrumentIdx={instrumentIdx} beatResolutions={beatResolutions} onStepTouchStart={onStepTouchStart} isLinkFolder={isLinkFolder} isSlave={isSlave} isLinkMaster={isLinkMaster} parentBusTrackId={parentBusTrackId} masterTrackId={masterTrackId} slaveTrackIds={slaveTrackIds} hasChildOverrides={hasChildOverrides} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {isMacro && (
        <div className="cell-macro w-full h-full p-1 relative">
          <TimelineMeasureMacroBlock trackId={trackId} mIdx={mIdx} patternId={patternId} spanMeasures={spanMeasures} relativeIdx={relativeIdx} isToada={isToada} isToadaComposite={isToadaComposite} toadaVocalBadges={toadaVocalBadges} isSelectedCell={isSel} isMinZoom={isMinZoom} isPanningActive={isPanningActive} instColors={instColors} instMixerBg={instMixerBg} activePatternName={activePatternName} activePatternActiveSteps={activePatternActiveSteps?.slice(0, stepsInMeasure)} patternsList={patternsList} lang={lang} onPatternAssignForMeasure={onPatternAssignForMeasure} onOpenPatternPicker={onOpenPatternPicker} />
        </div>
      )}
    </div>
  );
};

const arePatternsListsEqual = (p?: Array<{ id: number; name: string; vocalMode?: string }>, n?: Array<{ id: number; name: string; vocalMode?: string }>): boolean => {
  if (p === n) return true;
  if (!p || !n || p.length !== n.length) return false;
  for (let i = 0; i < p.length; i++) if (p[i].id !== n[i].id || p[i].name !== n[i].name || p[i].vocalMode !== n[i].vocalMode) return false;
  return true;
};

export const TimelineMeasure = React.memo(TimelineMeasureComponent, (p, n) => (
  p.mIdx === n.mIdx && p.trackId === n.trackId && p.trackIdx === n.trackIdx && p.instrumentIdx === n.instrumentIdx && (p.widthRatio ?? 1) === (n.widthRatio ?? 1) && p.patternId === n.patternId && p.patternIdx === n.patternIdx && p.steps === n.steps && p.spanMeasures === n.spanMeasures && p.relativeIdx === n.relativeIdx && p.sectionColor === n.sectionColor && p.isSectionStart === n.isSectionStart && p.isSectionEnd === n.isSectionEnd && p.loopStatus === n.loopStatus && p.isPanningActive === n.isPanningActive && p.lang === n.lang && p.activePatternName === n.activePatternName && p.measureAllowVariations === n.measureAllowVariations && p.signalDropdownOpen === n.signalDropdownOpen && p.isMacro === n.isMacro && p.isMinZoom === n.isMinZoom && p.activePatternActiveSteps === n.activePatternActiveSteps && p.isLinkedChild === n.isLinkedChild && p.isLinkMaster === n.isLinkMaster && p.isOverridden === n.isOverridden && p.isLinkFolder === n.isLinkFolder && p.isSlave === n.isSlave && p.isSilence === n.isSilence && p.isToada === n.isToada && p.isToadaComposite === n.isToadaComposite && p.toadaVocalBadges?.pPtnName === n.toadaVocalBadges?.pPtnName && p.toadaVocalBadges?.cPtnName === n.toadaVocalBadges?.cPtnName && p.parentBusTrackId === n.parentBusTrackId && p.masterTrackId === n.masterTrackId && p.hasChildOverrides === n.hasChildOverrides && p.slaveTrackIds === n.slaveTrackIds && p.instMixerBg === n.instMixerBg && arePatternsListsEqual(p.patternsList, n.patternsList)
));
