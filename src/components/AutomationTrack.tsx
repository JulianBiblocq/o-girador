import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useTimelineAutomationGroup } from '../hooks/timeline/useTimelineAutomationGroup';
import { computeTimelinePositions } from '../utils/timeline/timelineMeasureWidths';
import { AutomationTrackHeader } from './automation/AutomationTrackHeader';
import { AutomationValuePromptModal } from './automation/AutomationValuePromptModal';
import { buildAutomationSvg } from './automation/AutomationSvgPathBuilder';
import { useAutomationTrackDrag } from './automation/useAutomationTrackDrag';
import type { AutomationTrackProps } from './automation/automationTrackTypes';

export type { AutomationTrackProps };

export const AutomationTrack: React.FC<AutomationTrackProps> = React.memo(({
  type, trackId = null, label, onClose, totalMeasures, measureWidth, values, transitions,
  onChangeValue, onChangeTransition, min, max, color, lang, headerWidth, isBypassed = false,
  onToggleBypass, defaultExpanded = true, onExpandedChange, paramSelector,
}) => {
  const svgRef = useRef<SVGSVGElement>(null), containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [promptState, setPromptState] = useState<{ isOpen: boolean; idx: number | null; val: number }>({ isOpen: false, idx: null, val: 0 });

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => { const next = !prev; onExpandedChange?.(next); return next; });
  }, [onExpandedChange]);

  const { selectedAutomationType, selectedAutomationTrackId, selectedAutomationRange, selectAutomationMeasure, setGroupedAutomationValue, measureTimeSigs, timeSig } = useSequencerStore(
    useShallow(s => ({
      selectedAutomationType: s.selectedAutomationType, selectedAutomationTrackId: s.selectedAutomationTrackId,
      selectedAutomationRange: s.selectedAutomationRange, selectAutomationMeasure: s.selectAutomationMeasure,
      setGroupedAutomationValue: s.setGroupedAutomationValue, measureTimeSigs: s.measureTimeSigs, timeSig: s.timeSig,
    }))
  );

  const localValuesRef = useRef<number[]>(Array.isArray(values) ? [...values] : []);
  const { widths, leftPositions, totalContentW } = useMemo(
    () => computeTimelinePositions(totalMeasures, measureWidth, measureTimeSigs, timeSig),
    [totalMeasures, measureWidth, measureTimeSigs, timeSig]
  );

  const hasActiveAutomation = useMemo(() => {
    const baseVal = type === 'tempo' ? (values?.[0] ?? 120) : type === 'pan' ? 0 : type === 'reverb' ? 0 : (trackId !== null ? (values?.[0] ?? 75) : 100);
    return Boolean(
      values?.some((v, idx) => v !== undefined && (type === 'tempo' ? idx > 0 && v !== values[0] : v !== baseVal)) ||
      transitions?.some((t) => t && t !== 'immediate')
    );
  }, [values, transitions, type, trackId]);

  const isTypeMatch = (type === 'tempo' && selectedAutomationType === 'bpm') || (type === 'volume' && selectedAutomationType === 'volume');
  const isTrackMatch = (trackId ?? null) === (selectedAutomationTrackId ?? null);
  const isSelectedTrack = Boolean(isTypeMatch && isTrackMatch && selectedAutomationRange);

  const renderSvg = useCallback(() => {
    if (!isExpanded || !svgRef.current) return;
    buildAutomationSvg({
      svg: svgRef.current, type, totalMeasures, measureWidth, widths, leftPositions, totalContentW,
      currentValues: localValuesRef.current, transitions, min, max, color, isExpanded, isBypassed,
      isSelectedTrack, selectedRange: selectedAutomationRange,
    });
  }, [type, totalMeasures, measureWidth, widths, leftPositions, totalContentW, transitions, min, max, color, isExpanded, isBypassed, isSelectedTrack, selectedAutomationRange]);

  const autoGroup = useTimelineAutomationGroup({ type, trackId: trackId ?? null, min, max, totalMeasures, localValuesRef, renderSvg, onChangeValue });
  const { draggingIdxRef } = useAutomationTrackDrag({
    svgRef, containerRef, localValuesRef, isExpanded, min, max, transitions, onChangeTransition, autoGroup,
    onOpenPrompt: (idx, val) => setPromptState({ isOpen: true, idx, val }),
  });

  useEffect(() => {
    if (draggingIdxRef.current === null) {
      localValuesRef.current = Array.isArray(values) ? [...values] : [];
      if (isExpanded) renderSvg();
    }
  }, [values, transitions, totalMeasures, measureWidth, isExpanded, renderSvg]);

  const handlePromptSubmit = useCallback((val: number) => {
    if (promptState.idx === null) return;
    if (isSelectedTrack && selectedAutomationRange &&
        promptState.idx >= Math.min(selectedAutomationRange.start, selectedAutomationRange.end) &&
        promptState.idx <= Math.max(selectedAutomationRange.start, selectedAutomationRange.end)) {
      setGroupedAutomationValue(type === 'tempo' ? 'bpm' : 'volume', val, trackId ?? null);
    } else {
      onChangeValue(promptState.idx, val);
    }
    localValuesRef.current[promptState.idx] = val;
    renderSvg();
  }, [promptState.idx, isSelectedTrack, selectedAutomationRange, setGroupedAutomationValue, type, trackId, onChangeValue, renderSvg]);

  const height = isExpanded ? 80 : 24;
  const firstVal = values?.[0] ?? (type === 'tempo' ? 120 : type === 'pan' ? 0 : 100), unit = type === 'tempo' ? 'BPM' : '%';

  return (
    <div ref={containerRef} className="flex border-b border-[var(--cordel-border)]/20 relative select-none box-border" style={{ width: `${headerWidth + totalContentW}px`, minWidth: `${headerWidth + totalContentW}px`, height: `${height}px` }}>
      <AutomationTrackHeader type={type} label={label} color={color} lang={lang} headerWidth={headerWidth} min={min} max={max} isExpanded={isExpanded} onToggleExpand={handleToggleExpand} isBypassed={isBypassed} onToggleBypass={onToggleBypass} onClose={onClose} hasActiveAutomation={hasActiveAutomation} paramSelector={paramSelector} />

      {isExpanded ? (
        <div className="relative z-10 overflow-hidden shrink-0 bg-[#111] pointer-events-auto h-full" style={{ width: `${totalContentW}px`, minWidth: `${totalContentW}px` }}>
          <div className="absolute inset-0 flex z-0 h-full" style={{ width: `${totalContentW}px`, minWidth: `${totalContentW}px` }}>
            {Array.from({ length: totalMeasures }).map((_, i) => {
              const isSel = Boolean(isSelectedTrack && selectedAutomationRange && i >= Math.min(selectedAutomationRange.start, selectedAutomationRange.end) && i <= Math.max(selectedAutomationRange.start, selectedAutomationRange.end));
              return (
                <div
                  key={i} data-automation-type={type === 'tempo' ? 'bpm' : 'volume'} data-measure-idx={i}
                  onClick={(e) => { if (type === 'tempo' || type === 'volume') { e.stopPropagation(); selectAutomationMeasure(type === 'tempo' ? 'bpm' : 'volume', i, e.shiftKey, trackId ?? null); } }}
                  className={`border-l border-white/20 h-full cursor-pointer hover:bg-white/5 transition-colors ${isSel ? 'bg-amber-500/20 shadow-[inset_0_2px_0_#e67e22]' : ''}`}
                  style={{ width: `${widths[i] ?? measureWidth}px`, minWidth: `${widths[i] ?? measureWidth}px` }}
                />
              );
            })}
          </div>
          <svg ref={svgRef} className="absolute inset-0 z-10 overflow-visible pointer-events-none h-full" style={{ width: `${totalContentW}px`, minWidth: `${totalContentW}px`, touchAction: 'none' }} />
        </div>
      ) : (
        <div onClick={handleToggleExpand} className="relative z-10 overflow-hidden shrink-0 bg-[#111] hover:bg-[#191919] cursor-pointer pointer-events-auto h-full flex items-center px-3 transition-colors" style={{ width: `${totalContentW}px`, minWidth: `${totalContentW}px` }} title={lang === 'fr' ? "Cliquer pour déplier la courbe d'automation" : 'Clique para expandir a curva de automação'}>
          <div className="absolute left-0 right-0 top-1/2 border-t border-dashed pointer-events-none" style={{ borderColor: color, opacity: isBypassed ? 0.15 : 0.35 }} />
          <span className="relative z-10 px-1.5 py-0 text-[9px] font-mono font-bold rounded bg-[#111]/90 border border-white/10" style={{ color: isBypassed ? '#888' : color }}>
            {hasActiveAutomation ? (lang === 'fr' ? `● Automation active (${firstVal} ${unit})` : `● Automação ativa (${firstVal} ${unit})`) : `${firstVal} ${unit}`}
          </span>
        </div>
      )}

      <AutomationValuePromptModal isOpen={promptState.isOpen} onClose={() => setPromptState(p => ({ ...p, isOpen: false }))} targetIdx={promptState.idx} type={type} label={label} min={min} max={max} lang={lang} initialValue={promptState.val} onSubmit={handlePromptSubmit} />
    </div>
  );
});
