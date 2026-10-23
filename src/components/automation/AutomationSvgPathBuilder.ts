import { renderAutomationExpandedNodes } from './AutomationSvgNodesRenderer';

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
    renderAutomationExpandedNodes({
      svg, totalMeasures, nodeXCoords, nodeYCoords, currentValues, transitions,
      type, min, color, isBypassed, isSelectedTrack, selectedRange, leftPositions, measureWidth
    });
  }
};
