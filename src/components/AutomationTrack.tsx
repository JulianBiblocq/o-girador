import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';

export interface AutomationTrackProps {
  type: 'tempo' | 'volume' | 'pan' | 'reverb';
  trackId?: number | null;
  label?: string;
  onClose?: () => void;
  totalMeasures: number;
  measureWidth: number;
  values: number[];
  transitions: ('immediate' | 'ramp' | 'bezier')[];
  onChangeValue: (mIdx: number, val: number) => void;
  onChangeTransition: (mIdx: number, val: 'immediate' | 'ramp' | 'bezier') => void;
  min: number;
  max: number;
  color: string;
  lang: string;
  headerWidth: number;
  isBypassed?: boolean;
  onToggleBypass?: () => void;
  paramSelector?: {
    current: 'volume' | 'pan' | 'reverb';
    onChange: (param: 'volume' | 'pan' | 'reverb') => void;
  };
}

export const AutomationTrack: React.FC<AutomationTrackProps> = React.memo(({
  type,
  trackId = null,
  label,
  onClose,
  totalMeasures,
  measureWidth,
  values,
  transitions,
  onChangeValue,
  onChangeTransition,
  min,
  max,
  color,
  lang,
  headerWidth,
  isBypassed = false,
  onToggleBypass,
  paramSelector,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedAutomationType = useSequencerStore(state => state.selectedAutomationType);
  const selectedAutomationTrackId = useSequencerStore(state => state.selectedAutomationTrackId);
  const selectedAutomationRange = useSequencerStore(state => state.selectedAutomationRange);
  const selectAutomationMeasure = useSequencerStore(state => state.selectAutomationMeasure);
  const setGroupedAutomationValue = useSequencerStore(state => state.setGroupedAutomationValue);
  
  const svgRectRef = useRef<DOMRect | null>(null);
  
  // Local state for dragging to satisfy Zero Render Thrashing
  const draggingIdxRef = useRef<number | null>(null);
  const localValuesRef = useRef<number[]>([...values]);
  const [isExpanded, setIsExpanded] = useState(true);

  // Custom prompt modal states
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptValue, setPromptValue] = useState("");
  const [promptTargetIdx, setPromptTargetIdx] = useState<number | null>(null);

  const getVPadding = (h: number) => h > 40 ? 16 : 2;

  const getYFromValue = (val: number, height: number) => {
    const pad = getVPadding(height);
    const clamped = Math.max(min, Math.min(max, val));
    const range = max - min;
    const percent = range === 0 ? 0.5 : (clamped - min) / range;
    const effectiveHeight = height - (pad * 2);
    return height - pad - (percent * effectiveHeight);
  };

  const getValueFromY = (y: number, height: number) => {
    const pad = getVPadding(height);
    const effectiveHeight = height - (pad * 2);
    let percent = 1 - ((y - pad) / effectiveHeight);
    percent = Math.max(0, Math.min(1, percent));
    return min + percent * (max - min);
  };

  const totalWidth = totalMeasures * measureWidth;

  const renderSvg = useCallback(() => {
    if (!svgRef.current) return;
    const height = isExpanded ? 80 : 30;
    const totalW = totalMeasures * measureWidth;
    
    // Set explicit SVG dimensions
    svgRef.current.setAttribute('width', totalW.toString());
    svgRef.current.setAttribute('height', height.toString());

    // Clear SVG
    while (svgRef.current.firstChild) {
      svgRef.current.removeChild(svgRef.current.firstChild);
    }

    const currentValues = localValuesRef.current;
    
    // Median zero line for Pan
    if (type === 'pan') {
      const zeroY = getYFromValue(0, height);
      const zeroLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      zeroLine.setAttribute('x1', '0');
      zeroLine.setAttribute('y1', zeroY.toString());
      zeroLine.setAttribute('x2', totalW.toString());
      zeroLine.setAttribute('y2', zeroY.toString());
      zeroLine.setAttribute('stroke', 'rgba(255,255,255,0.25)');
      zeroLine.setAttribute('stroke-dasharray', '3 3');
      zeroLine.setAttribute('stroke-width', '1');
      zeroLine.setAttribute('pointer-events', 'none');
      svgRef.current.appendChild(zeroLine);
    }

    // Create Path with centered nodes: Xm = m * measureWidth + measureWidth / 2
    let d = '';
    const nodeXCoords: number[] = [];
    const nodeYCoords: number[] = [];

    for (let i = 0; i < totalMeasures; i++) {
      const nodeX = i * measureWidth + measureWidth / 2;
      const val = currentValues[i] !== undefined ? currentValues[i] : (type === 'pan' ? 0 : min);
      const nodeY = getYFromValue(val, height);

      nodeXCoords.push(nodeX);
      nodeYCoords.push(nodeY);

      if (i === 0) {
        // Start flat line from x = 0 to first centered node
        d += `M 0 ${nodeY} L ${nodeX} ${nodeY}`;
      } else {
        const prevX = nodeXCoords[i - 1];
        const prevY = nodeYCoords[i - 1];
        const boundaryX = i * measureWidth;
        const trans = transitions[i] || 'immediate';

        if (trans === 'immediate') {
          // Sharp step at the exact measure boundary
          d += ` L ${boundaryX} ${prevY} L ${boundaryX} ${nodeY} L ${nodeX} ${nodeY}`;
        } else if (trans === 'ramp') {
          // Linear ramp between centered nodes
          d += ` L ${nodeX} ${nodeY}`;
        } else if (trans === 'bezier') {
          // Cubic bezier centered around measure boundary
          const cp1x = boundaryX;
          const cp1y = prevY;
          const cp2x = boundaryX;
          const cp2y = nodeY;
          d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${nodeX} ${nodeY}`;
        }
      }
    }

    // Extend line to the right end of the last measure
    const lastX = totalW;
    const lastY = nodeYCoords[totalMeasures - 1] ?? getYFromValue(min, height);
    d += ` L ${lastX} ${lastY}`;

    // Fill area below path (pointer-events: none to avoid blocking clicks)
    const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    fillPath.setAttribute('d', `${d} L ${lastX} ${height} L 0 ${height} Z`);
    fillPath.setAttribute('fill', color);
    fillPath.setAttribute('opacity', isBypassed ? '0.05' : '0.2');
    fillPath.setAttribute('pointer-events', 'none');
    svgRef.current.appendChild(fillPath);

    // Stroke path (pointer-events: none)
    const strokePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    strokePath.setAttribute('d', d);
    strokePath.setAttribute('fill', 'none');
    strokePath.setAttribute('stroke', color);
    strokePath.setAttribute('stroke-width', '2');
    strokePath.setAttribute('stroke-linecap', 'round');
    strokePath.setAttribute('stroke-linejoin', 'round');
    strokePath.setAttribute('pointer-events', 'none');
    if (isBypassed) {
      strokePath.setAttribute('stroke-dasharray', '4 4');
      strokePath.setAttribute('opacity', '0.35');
    }
    svgRef.current.appendChild(strokePath);

    // Selection Highlight Overlay
    const isTypeMatch = (type === 'tempo' && selectedAutomationType === 'bpm') || (type === 'volume' && selectedAutomationType === 'volume');
    const isTrackMatch = (trackId ?? null) === (selectedAutomationTrackId ?? null);
    const isSelectedTrack = Boolean(isTypeMatch && isTrackMatch && selectedAutomationRange);

    if (isSelectedTrack && selectedAutomationRange) {
      const selStart = Math.min(selectedAutomationRange.start, selectedAutomationRange.end);
      const selEnd = Math.max(selectedAutomationRange.start, selectedAutomationRange.end);
      const selX = selStart * measureWidth;
      const selW = (selEnd - selStart + 1) * measureWidth;

      const selRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      selRect.setAttribute('x', selX.toString());
      selRect.setAttribute('y', '0');
      selRect.setAttribute('width', selW.toString());
      selRect.setAttribute('height', height.toString());
      selRect.setAttribute('fill', 'rgba(230, 126, 34, 0.22)');
      selRect.setAttribute('pointer-events', 'none');
      svgRef.current.appendChild(selRect);

      const selTopBorder = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      selTopBorder.setAttribute('x1', selX.toString());
      selTopBorder.setAttribute('y1', '1');
      selTopBorder.setAttribute('x2', (selX + selW).toString());
      selTopBorder.setAttribute('y2', '1');
      selTopBorder.setAttribute('stroke', '#e67e22');
      selTopBorder.setAttribute('stroke-width', '2');
      selTopBorder.setAttribute('pointer-events', 'none');
      svgRef.current.appendChild(selTopBorder);
    }

    // Draw Nodes and Hit Targets
    if (isExpanded) {
      for (let i = 0; i < totalMeasures; i++) {
        const x = nodeXCoords[i];
        const y = nodeYCoords[i];
        const val = currentValues[i] !== undefined ? currentValues[i] : (type === 'pan' ? 0 : min);

        const isInRange = isSelectedTrack && selectedAutomationRange &&
          i >= Math.min(selectedAutomationRange.start, selectedAutomationRange.end) &&
          i <= Math.max(selectedAutomationRange.start, selectedAutomationRange.end);

        // 1. Large Invisible Hit-Target Circle (r = 14) for effortless mouse & touch handling
        const hitTarget = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hitTarget.setAttribute('cx', x.toString());
        hitTarget.setAttribute('cy', y.toString());
        hitTarget.setAttribute('r', '14');
        hitTarget.setAttribute('fill', 'transparent');
        hitTarget.setAttribute('cursor', 'ns-resize');
        hitTarget.style.cursor = 'ns-resize';
        hitTarget.setAttribute('pointer-events', 'auto');
        hitTarget.setAttribute('class', 'automation-node-hit');
        hitTarget.dataset.idx = i.toString();

        // 2. Visible Circle Node
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x.toString());
        circle.setAttribute('cy', y.toString());
        circle.setAttribute('r', isInRange ? '7' : '6');
        circle.setAttribute('fill', isBypassed ? '#666' : (isInRange ? '#f4ecd8' : 'white'));
        circle.setAttribute('stroke', isInRange ? '#e67e22' : color);
        circle.setAttribute('stroke-width', isInRange ? '3' : '2');
        circle.setAttribute('cursor', 'ns-resize');
        circle.style.cursor = 'ns-resize';
        circle.setAttribute('pointer-events', 'auto');
        circle.setAttribute('class', 'automation-node-circle');
        circle.dataset.idx = i.toString();
        if (isBypassed) {
          circle.setAttribute('opacity', '0.4');
        }
        
        // 3. Text label (pointer-events: none so it never blocks node interactions)
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', (x + 8).toString());
        text.setAttribute('y', (y - 8).toString());
        text.setAttribute('fill', isBypassed ? '#888' : 'white');
        text.setAttribute('font-size', '10px');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('pointer-events', 'none');
        if (isBypassed) {
          text.setAttribute('opacity', '0.5');
        }

        const rounded = Math.round(val);
        let labelStr = rounded.toString();
        if (type === 'pan') {
          if (rounded === 0) labelStr = 'C';
          else if (rounded < 0) labelStr = `L${Math.abs(rounded)}`;
          else labelStr = `R${rounded}`;
        } else if (type === 'reverb') {
          labelStr = `${rounded}%`;
        }
        text.textContent = labelStr;
        
        svgRef.current.appendChild(circle);
        svgRef.current.appendChild(hitTarget);
        svgRef.current.appendChild(text);

        // 4. Transition Toggle Button (if i > 0, placed at measure boundary)
        if (i > 0) {
          const prevY = nodeYCoords[i - 1];
          const midX = i * measureWidth; // Exactly on measure boundary
          const midY = (y + prevY) / 2;
          
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.setAttribute('cursor', 'pointer');
          g.setAttribute('pointer-events', 'auto');
          g.dataset.transIdx = i.toString();
          if (isBypassed) {
            g.setAttribute('opacity', '0.4');
          }
          
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', (midX - 10).toString());
          rect.setAttribute('y', (midY - 10).toString());
          rect.setAttribute('width', '20');
          rect.setAttribute('height', '20');
          rect.setAttribute('fill', '#1a1a1a');
          rect.setAttribute('rx', '4');
          rect.setAttribute('stroke', 'rgba(255,255,255,0.2)');
          rect.setAttribute('pointer-events', 'auto');
          
          const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          icon.setAttribute('x', midX.toString());
          icon.setAttribute('y', (midY + 4).toString());
          icon.setAttribute('fill', color);
          icon.setAttribute('font-size', '12px');
          icon.setAttribute('text-anchor', 'middle');
          icon.setAttribute('font-family', 'sans-serif');
          icon.setAttribute('font-weight', 'bold');
          icon.setAttribute('pointer-events', 'none');
          
          const trans = transitions[i] || 'immediate';
          if (trans === 'immediate') icon.textContent = '⎍';
          else if (trans === 'ramp') icon.textContent = '↗';
          else icon.textContent = '〰';
          
          g.appendChild(rect);
          g.appendChild(icon);
          svgRef.current.appendChild(g);
        }
      }
    }
  }, [totalMeasures, measureWidth, transitions, min, max, color, isExpanded, isBypassed, type, selectedAutomationType, selectedAutomationTrackId, selectedAutomationRange, trackId]);

  const handlePromptSubmit = useCallback(() => {
    if (promptTargetIdx !== null) {
      let val = parseInt(promptValue, 10);
      if (!isNaN(val)) {
        val = Math.max(min, Math.min(max, val));
        const isTypeMatch = (type === 'tempo' && selectedAutomationType === 'bpm') || (type === 'volume' && selectedAutomationType === 'volume');
        const isTrackMatch = (trackId ?? null) === (selectedAutomationTrackId ?? null);
        if (
          isTypeMatch &&
          isTrackMatch &&
          selectedAutomationRange &&
          promptTargetIdx >= Math.min(selectedAutomationRange.start, selectedAutomationRange.end) &&
          promptTargetIdx <= Math.max(selectedAutomationRange.start, selectedAutomationRange.end)
        ) {
          setGroupedAutomationValue(type === 'tempo' ? 'bpm' : 'volume', val, trackId ?? null);
        } else {
          onChangeValue(promptTargetIdx, val);
        }
        localValuesRef.current[promptTargetIdx] = val;
        renderSvg();
      }
    }
    setPromptOpen(false);
  }, [promptTargetIdx, promptValue, min, max, type, selectedAutomationType, selectedAutomationTrackId, selectedAutomationRange, trackId, setGroupedAutomationValue, onChangeValue, renderSvg]);

  // Sync local ref when props change (only when not dragging)
  useEffect(() => {
    if (draggingIdxRef.current === null) {
      localValuesRef.current = [...values];
      renderSvg();
    }
  }, [values, transitions, totalMeasures, measureWidth, isExpanded, renderSvg]);

  // Pointer Events for dragging
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let lastClickTime = 0;
    let lastClickIdx = -1;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as SVGElement;
      if (target.tagName === 'circle' && target.dataset.idx) {
        e.stopPropagation();
        const idx = parseInt(target.dataset.idx, 10);
        const now = Date.now();

        // Robust double-click / double-tap detection for desktop & tablets
        if (now - lastClickTime < 350 && lastClickIdx === idx) {
          lastClickTime = 0;
          lastClickIdx = -1;
          draggingIdxRef.current = null;
          const currentVal = localValuesRef.current[idx];
          setPromptValue(String(currentVal));
          setPromptTargetIdx(idx);
          setPromptOpen(true);
          return;
        }

        lastClickTime = now;
        lastClickIdx = idx;
        draggingIdxRef.current = idx;

        // Cache SVG bounding box once on pointerdown to prevent Layout Thrashing on pointermove
        svgRectRef.current = svg.getBoundingClientRect();
        
        // Capture on the persistent SVG element to prevent capture loss when child elements re-render
        try {
          svg.setPointerCapture(e.pointerId);
        } catch (_) {}

        // Automation selection (simple click / Shift + click)
        if (type === 'tempo' || type === 'volume') {
          selectAutomationMeasure(
            type === 'tempo' ? 'bpm' : 'volume',
            idx,
            e.shiftKey,
            trackId ?? null
          );
        }
      } else if (target.tagName === 'rect' || target.tagName === 'text') {
        const parent = target.parentNode as SVGElement;
        if (parent && parent.dataset && parent.dataset.transIdx) {
          e.stopPropagation();
          const idx = parseInt(parent.dataset.transIdx, 10);
          const currentTrans = transitions[idx] || 'immediate';
          let nextTrans: 'immediate' | 'ramp' | 'bezier' = 'immediate';
          if (currentTrans === 'immediate') nextTrans = 'ramp';
          else if (currentTrans === 'ramp') nextTrans = 'bezier';
          else nextTrans = 'immediate';
          onChangeTransition(idx, nextTrans);
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (draggingIdxRef.current === null || !isExpanded) return;
      const draggedIdx = draggingIdxRef.current;
      
      const rect = svgRectRef.current || svg.getBoundingClientRect();
      let y = e.clientY - rect.top;
      
      // Clamp Y to SVG bounds
      if (y < 0) y = 0;
      if (y > rect.height) y = rect.height;
      
      const val = getValueFromY(y, rect.height);
      const roundedVal = Math.round(val);
      
      if (localValuesRef.current[draggedIdx] !== roundedVal) {
        localValuesRef.current[draggedIdx] = roundedVal;
        renderSvg(); // Re-render vanilla SVG without React state update (Zero Render Thrashing)
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (draggingIdxRef.current === null) return;
      const draggedIdx = draggingIdxRef.current;
      draggingIdxRef.current = null;
      
      try {
        if (svg.hasPointerCapture(e.pointerId)) {
          svg.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      
      const finalVal = localValuesRef.current[draggedIdx];
      const isTypeMatch = (type === 'tempo' && selectedAutomationType === 'bpm') || (type === 'volume' && selectedAutomationType === 'volume');
      const isTrackMatch = (trackId ?? null) === (selectedAutomationTrackId ?? null);
      if (
        isTypeMatch &&
        isTrackMatch &&
        selectedAutomationRange &&
        draggedIdx >= Math.min(selectedAutomationRange.start, selectedAutomationRange.end) &&
        draggedIdx <= Math.max(selectedAutomationRange.start, selectedAutomationRange.end)
      ) {
        setGroupedAutomationValue(type === 'tempo' ? 'bpm' : 'volume', finalVal, trackId ?? null);
      } else {
        onChangeValue(draggedIdx, finalVal);
      }
      
      svgRectRef.current = null;
    };

    const handleDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | SVGElement;
      if (!target) return;
      const idxStr = target.getAttribute?.('data-idx') ?? target.dataset?.idx ?? target.getAttribute?.('data-measure-idx') ?? target.dataset?.measureIdx;
      if (idxStr !== null && idxStr !== undefined) {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(idxStr, 10);
        if (!isNaN(idx)) {
          const currentVal = localValuesRef.current[idx];
          setPromptValue(String(currentVal));
          setPromptTargetIdx(idx);
          setPromptOpen(true);
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('dblclick', handleDoubleClick);
    }
    svg.addEventListener('dblclick', handleDoubleClick);
    svg.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      if (container) {
        container.removeEventListener('dblclick', handleDoubleClick);
      }
      svg.removeEventListener('dblclick', handleDoubleClick);
      svg.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isExpanded, max, min, onChangeTransition, onChangeValue, renderSvg, transitions, type, selectedAutomationType, selectedAutomationTrackId, selectedAutomationRange, trackId, selectAutomationMeasure, setGroupedAutomationValue]);

  const height = isExpanded ? 80 : 30;

  return (
    <div 
      className="flex border-b border-[var(--cordel-border)]/20 bg-[#111] relative select-none" 
      ref={containerRef}
      style={{
        width: `${headerWidth + totalWidth}px`,
        minWidth: `${headerWidth + totalWidth}px`,
      }}
    >
      {/* Header */}
      <div 
        className="timeline-sticky-header flex flex-col p-2 border-r border-black relative shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.5)] z-20 sticky left-0"
        style={{ width: `${headerWidth}px`, minWidth: `${headerWidth}px`, backgroundColor: '#1a1a1a' }}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-bold text-gray-400 hover:text-white cursor-pointer pointer-events-auto shrink-0"
              title={isExpanded ? (lang === 'fr' ? 'Réduire' : 'Recolher') : (lang === 'fr' ? 'Développer' : 'Expandir')}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
            <span 
              className="text-xs font-black uppercase tracking-wider truncate"
              style={{ color }}
              title={label}
            >
              {label ? label : (
                type === 'tempo' ? (lang === 'fr' ? 'Tempo' : 'Andamento') :
                type === 'pan' ? (lang === 'fr' ? 'Panoramique' : 'Panorâmico') :
                type === 'reverb' ? (lang === 'fr' ? 'Send Réverbe' : 'Envio Reverb') :
                (lang === 'fr' ? 'Volume Global' : 'Volume Mestre')
              )}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onToggleBypass && (
              <button
                onClick={onToggleBypass}
                className={`px-1.5 py-0.5 text-[9px] font-bold tracking-wider rounded uppercase transition-all cursor-pointer ${
                  !isBypassed
                    ? 'border border-[#a83220] bg-[#8b2a1a] text-[#f4ecd8] hover:bg-[#a83220] shadow-xs'
                    : 'border border-dashed border-gray-600/50 bg-black/40 text-gray-400 line-through hover:text-gray-200'
                }`}
                title={
                  lang === 'fr'
                    ? (isBypassed ? "Activer l'automation (actuellement débrayée)" : "Débrayer l'automation (passer en manuel)")
                    : (isBypassed ? "Ativar automação (atualmente desativada)" : "Desativar automação (modo manual)")
                }
              >
                AUTO
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-xs font-bold text-gray-400 hover:text-red-400 cursor-pointer pointer-events-auto ml-0.5 shrink-0 px-1"
                title={lang === 'fr' ? "Fermer l'automation" : "Fechar automação"}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {paramSelector && isExpanded && (
          <div className="flex items-center gap-1 my-1">
            {(['volume', 'pan', 'reverb'] as const).map((p) => {
              const active = paramSelector.current === p;
              const labelMap = { volume: 'Vol', pan: 'Pan', reverb: 'Rev' };
              return (
                <button
                  key={p}
                  onClick={() => paramSelector.onChange(p)}
                  className={`flex-1 py-0.5 text-[9px] font-bold rounded uppercase transition-colors cursor-pointer border text-center ${
                    active
                      ? 'bg-amber-600 text-white border-amber-400 shadow-xs'
                      : 'bg-black/40 text-gray-400 hover:text-gray-200 border-white/10 hover:border-white/30'
                  }`}
                >
                  {labelMap[p]}
                </button>
              );
            })}
          </div>
        )}
        
        {isExpanded && (
          <div className="flex flex-col mt-auto gap-0.5 text-[9px] text-gray-500 font-medium">
            {type === 'pan' ? (
              <>
                <div className="flex justify-between"><span>Max</span><span className="text-gray-400">R 100</span></div>
                <div className="flex justify-between"><span>Center</span><span className="text-gray-400">C (0)</span></div>
                <div className="flex justify-between"><span>Min</span><span className="text-gray-400">L 100</span></div>
              </>
            ) : type === 'reverb' ? (
              <>
                <div className="flex justify-between"><span>Max</span><span className="text-gray-400">100%</span></div>
                <div className="flex justify-between"><span>Min</span><span className="text-gray-400">0%</span></div>
              </>
            ) : (
              <>
                <div className="flex justify-between"><span>Max</span><span className="text-gray-400">{max}</span></div>
                <div className="flex justify-between"><span>Min</span><span className="text-gray-400">{min}</span></div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Grid Background & SVG with explicit totalWidth */}
      <div 
        className="relative overflow-hidden shrink-0" 
        style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px`, height: `${height}px` }}
      >
        {/* Vertical Grid Lines & Clickable Measure Columns */}
        <div 
          className="absolute inset-0 flex z-0"
          style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px`, height: `${height}px` }}
        >
          {Array.from({ length: totalMeasures }).map((_, i) => {
            const isTypeMatch = (type === 'tempo' && selectedAutomationType === 'bpm') || (type === 'volume' && selectedAutomationType === 'volume');
            const isTrackMatch = (trackId ?? null) === (selectedAutomationTrackId ?? null);
            const isSelected = Boolean(
              isTypeMatch &&
              isTrackMatch &&
              selectedAutomationRange &&
              i >= Math.min(selectedAutomationRange.start, selectedAutomationRange.end) &&
              i <= Math.max(selectedAutomationRange.start, selectedAutomationRange.end)
            );

            return (
              <div 
                key={i} 
                data-automation-type={type === 'tempo' ? 'bpm' : 'volume'}
                data-measure-idx={i}
                onClick={(e) => {
                  if (type === 'tempo' || type === 'volume') {
                    e.stopPropagation();
                    selectAutomationMeasure(
                      type === 'tempo' ? 'bpm' : 'volume',
                      i,
                      e.shiftKey,
                      trackId ?? null
                    );
                  }
                }}
                className={`border-l border-white/20 h-full cursor-pointer hover:bg-white/5 transition-colors ${
                  isSelected ? 'bg-amber-500/20 shadow-[inset_0_2px_0_#e67e22]' : ''
                }`}
                style={{ width: `${measureWidth}px`, minWidth: `${measureWidth}px` }}
              />
            );
          })}
        </div>
        
        <svg
          ref={svgRef}
          className="absolute inset-0 z-10 overflow-visible pointer-events-none"
          style={{ 
            width: `${totalWidth}px`,
            minWidth: `${totalWidth}px`,
            height: `${height}px`,
            touchAction: 'none'
          }}
        />
      </div>

      {/* Custom Prompt Modal */}
      {promptOpen && promptTargetIdx !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
             onPointerDown={(e) => e.stopPropagation()} // Stop it from leaking
        >
          <div className="bg-[var(--cordel-wood)] text-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] rounded shadow-2xl p-6 w-[320px] animate-in fade-in zoom-in duration-200">
            <h3 className="font-cactus text-xl mb-4 text-[#f4ecd8]">
              {lang === 'fr' 
                ? `Mesure ${promptTargetIdx + 1} - ${
                    label || (
                      type === 'tempo' ? 'Tempo (BPM)' : 
                      type === 'pan' ? 'Panoramique' : 
                      type === 'reverb' ? 'Send Réverbe (%)' : 'Volume'
                    )
                  }` 
                : `Compasso ${promptTargetIdx + 1} - ${
                    label || (
                      type === 'tempo' ? 'Andamento (BPM)' : 
                      type === 'pan' ? 'Panorâmico' : 
                      type === 'reverb' ? 'Envio Reverb (%)' : 'Volume'
                    )
                  }`}
            </h3>
            <p className="text-sm opacity-80 mb-2 text-[#f4ecd8]">
              {type === 'pan'
                ? (lang === 'fr' ? 'De -100 (Gauche) à +100 (Droite), 0 = Centre :' : 'De -100 (Esquerda) a +100 (Direita), 0 = Centro:')
                : (lang === 'fr' ? `Valeur comprise entre ${min} et ${max} :` : `Valor entre ${min} e ${max}:`)}
            </p>
            <input
              type="number"
              min={min}
              max={max}
              autoFocus
              className="w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border mb-4 p-2 font-bold"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePromptSubmit();
                if (e.key === 'Escape') setPromptOpen(false);
              }}
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setPromptOpen(false)}
                className="px-4 py-2 text-sm cordel-border hover:bg-black/10 transition-colors rounded text-[#f4ecd8]"
              >
                {lang === 'fr' ? 'Annuler' : 'Cancelar'}
              </button>
              <button 
                onClick={handlePromptSubmit}
                className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white cordel-border transition-colors rounded font-bold"
              >
                {lang === 'fr' ? 'Valider' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
