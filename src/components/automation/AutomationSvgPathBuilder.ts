export const getYFromValue = (val: number, h: number, min: number, max: number): number => {
  const pad = h > 40 ? 16 : 2, clamped = Math.max(min, Math.min(max, val)), range = max - min;
  return h - pad - (range === 0 ? 0.5 : (clamped - min) / range) * (h - pad * 2);
};

export const getValueFromY = (y: number, h: number, min: number, max: number): number => {
  const pad = h > 40 ? 16 : 2;
  return min + Math.max(0, Math.min(1, 1 - (y - pad) / (h - pad * 2))) * (max - min);
};

export interface SvgRenderParams {
  svg: SVGSVGElement;
  type: 'tempo' | 'volume' | 'pan' | 'reverb';
  totalMeasures: number;
  measureWidth: number;
  widths: number[];
  leftPositions: number[];
  totalContentW: number;
  currentValues: number[];
  transitions: ('immediate' | 'ramp' | 'bezier')[];
  min: number;
  max: number;
  color: string;
  isExpanded: boolean;
  isBypassed: boolean;
  isSelectedTrack: boolean;
  selectedRange: { start: number; end: number } | null;
}

export const buildAutomationSvg = ({
  svg, type, totalMeasures, measureWidth, widths, leftPositions, totalContentW,
  currentValues, transitions, min, max, color, isExpanded, isBypassed, isSelectedTrack, selectedRange,
}: SvgRenderParams): void => {
  const height = isExpanded ? 80 : 30;
  svg.setAttribute('width', totalContentW.toString());
  svg.setAttribute('height', height.toString());
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  if (type === 'pan') {
    const zeroY = getYFromValue(0, height, min, max);
    const zeroLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    zeroLine.setAttribute('x1', '0'); zeroLine.setAttribute('y1', String(zeroY));
    zeroLine.setAttribute('x2', String(totalContentW)); zeroLine.setAttribute('y2', String(zeroY));
    zeroLine.setAttribute('stroke', 'rgba(255,255,255,0.25)'); zeroLine.setAttribute('stroke-dasharray', '3 3');
    zeroLine.setAttribute('stroke-width', '1'); zeroLine.setAttribute('pointer-events', 'none');
    svg.appendChild(zeroLine);
  }

  let d = '';
  const nodeXCoords: number[] = [], nodeYCoords: number[] = [];
  for (let i = 0; i < totalMeasures; i++) {
    const mLeft = leftPositions[i] ?? (i * measureWidth);
    const mW = widths[i] ?? measureWidth;
    const nodeX = mLeft + mW / 2;
    const defaultVal = type === 'tempo' ? 100 : (type === 'pan' ? 0 : (type === 'volume' ? 75 : min));
    const val = (currentValues && currentValues[i] !== undefined) ? currentValues[i] : defaultVal;
    const nodeY = getYFromValue(val, height, min, max);
    nodeXCoords.push(nodeX); nodeYCoords.push(nodeY);

    if (i === 0) {
      d += `M 0 ${nodeY} L ${nodeX} ${nodeY}`;
    } else {
      const prevY = nodeYCoords[i - 1];
      const trans = transitions?.[i] || 'immediate';
      if (trans === 'immediate') d += ` L ${mLeft} ${prevY} L ${mLeft} ${nodeY} L ${nodeX} ${nodeY}`;
      else if (trans === 'ramp') d += ` L ${nodeX} ${nodeY}`;
      else d += ` C ${mLeft} ${prevY}, ${mLeft} ${nodeY}, ${nodeX} ${nodeY}`;
    }
  }

  const lastX = totalContentW, lastY = nodeYCoords[totalMeasures - 1] ?? getYFromValue(min, height, min, max);
  d += ` L ${lastX} ${lastY}`;

  const fill = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  fill.setAttribute('d', `${d} L ${lastX} ${height} L 0 ${height} Z`);
  fill.setAttribute('fill', color); fill.setAttribute('opacity', isBypassed ? '0.05' : '0.2');
  fill.setAttribute('pointer-events', 'none');
  svg.appendChild(fill);

  const stroke = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  stroke.setAttribute('d', d); stroke.setAttribute('fill', 'none'); stroke.setAttribute('stroke', color);
  stroke.setAttribute('stroke-width', '2'); stroke.setAttribute('stroke-linecap', 'round');
  stroke.setAttribute('stroke-linejoin', 'round'); stroke.setAttribute('pointer-events', 'none');
  if (isBypassed) { stroke.setAttribute('stroke-dasharray', '4 4'); stroke.setAttribute('opacity', '0.35'); }
  svg.appendChild(stroke);

  if (isSelectedTrack && selectedRange) {
    const sStart = Math.min(selectedRange.start, selectedRange.end), sEnd = Math.max(selectedRange.start, selectedRange.end);
    const selX = leftPositions[sStart] ?? (sStart * measureWidth);
    const selW = ((leftPositions[sEnd] ?? (sEnd * measureWidth)) + (widths[sEnd] ?? measureWidth)) - selX;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(selX)); rect.setAttribute('y', '0'); rect.setAttribute('width', String(selW));
    rect.setAttribute('height', String(height)); rect.setAttribute('fill', 'rgba(230, 126, 34, 0.22)');
    rect.setAttribute('pointer-events', 'none'); svg.appendChild(rect);
  }

  if (isExpanded) {
    for (let i = 0; i < totalMeasures; i++) {
      const x = nodeXCoords[i], y = nodeYCoords[i];
      const val = currentValues[i] !== undefined ? currentValues[i] : (type === 'pan' ? 0 : min);
      const inR = isSelectedTrack && selectedRange && i >= Math.min(selectedRange.start, selectedRange.end) && i <= Math.max(selectedRange.start, selectedRange.end);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(x)); circle.setAttribute('cy', String(y)); circle.setAttribute('r', inR ? '7' : '6');
      circle.setAttribute('fill', isBypassed ? '#666' : (inR ? '#f4ecd8' : 'white')); circle.setAttribute('stroke', inR ? '#e67e22' : color);
      circle.setAttribute('stroke-width', inR ? '3' : '2'); circle.setAttribute('class', 'automation-node-circle');
      circle.setAttribute('pointer-events', 'auto'); circle.dataset.idx = String(i);
      if (isBypassed) circle.setAttribute('opacity', '0.4');
      svg.appendChild(circle);

      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      hit.setAttribute('cx', String(x)); hit.setAttribute('cy', String(y)); hit.setAttribute('r', '14');
      hit.setAttribute('fill', 'transparent'); hit.setAttribute('class', 'automation-node-hit');
      hit.setAttribute('pointer-events', 'auto'); hit.dataset.idx = String(i);
      svg.appendChild(hit);

      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', String(x + 8)); txt.setAttribute('y', String(y - 8));
      txt.setAttribute('fill', isBypassed ? '#888' : 'white'); txt.setAttribute('font-size', '10px');
      txt.setAttribute('font-weight', 'bold'); txt.setAttribute('pointer-events', 'none');
      const r = Math.round(val);
      txt.textContent = type === 'pan' ? (r === 0 ? 'C' : r < 0 ? `L${Math.abs(r)}` : `R${r}`) : type === 'reverb' ? `${r}%` : String(r);
      svg.appendChild(txt);

      if (i > 0) {
        const midX = leftPositions[i] ?? (i * measureWidth), midY = (y + nodeYCoords[i - 1]) / 2;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('cursor', 'pointer'); g.setAttribute('pointer-events', 'auto'); g.dataset.transIdx = String(i);
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', String(midX - 10)); bg.setAttribute('y', String(midY - 10)); bg.setAttribute('width', '20'); bg.setAttribute('height', '20');
        bg.setAttribute('fill', '#1a1a1a'); bg.setAttribute('rx', '4'); bg.setAttribute('stroke', 'rgba(255,255,255,0.2)');
        const ic = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        ic.setAttribute('x', String(midX)); ic.setAttribute('y', String(midY + 4)); ic.setAttribute('fill', color);
        ic.setAttribute('font-size', '12px'); ic.setAttribute('text-anchor', 'middle'); ic.setAttribute('font-weight', 'bold');
        ic.setAttribute('pointer-events', 'none');
        const tr = transitions?.[i] || 'immediate';
        ic.textContent = tr === 'immediate' ? '⎍' : tr === 'ramp' ? '↗' : '〰';
        g.appendChild(bg); g.appendChild(ic); svg.appendChild(g);
      }
    }
  }
};
