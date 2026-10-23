/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Rendu des nœuds et poignées SVG d'automation (< 65 lignes).
 */

export interface SvgNodeRenderParams {
  svg: SVGSVGElement;
  totalMeasures: number;
  nodeXCoords: number[];
  nodeYCoords: number[];
  currentValues: number[];
  transitions: ('immediate' | 'ramp' | 'bezier')[];
  type: 'tempo' | 'volume' | 'pan' | 'reverb';
  min: number;
  color: string;
  isBypassed: boolean;
  isSelectedTrack: boolean;
  selectedRange: { start: number; end: number } | null;
  leftPositions: number[];
  measureWidth: number;
}

export function renderAutomationExpandedNodes({
  svg, totalMeasures, nodeXCoords, nodeYCoords, currentValues, transitions,
  type, min, color, isBypassed, isSelectedTrack, selectedRange, leftPositions, measureWidth
}: SvgNodeRenderParams): void {
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
      ic.textContent = tr === 'immediate' ? '⎍' : tr === 'ramp' ? '/' : '~';
      g.appendChild(bg); g.appendChild(ic); svg.appendChild(g);
    }
  }
}
