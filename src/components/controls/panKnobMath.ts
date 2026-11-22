/**
 * panKnobMath.ts — Calculs mathématiques, arc bipolaire SVG et synchronisation DOM directe Zéro-Render pour `PanKnob` (< 125 lignes).
 */

import type React from 'react';
import type { PanCrownTickSpec } from './usePanSquadTicks';

export function getLeftPanPrefix(lang?: string): 'G' | 'E' {
  return lang === 'fr' ? 'G' : 'E';
}

export function formatPanCartouche(val: number, lang = 'pt'): string {
  const v = Math.max(-100, Math.min(100, Math.round(Number(val) || 0)));
  if (Math.abs(v) <= 2) return 'C';
  return v < 0 ? `${getLeftPanPrefix(lang)}${Math.abs(v)}` : `D${v}`;
}

export function formatPanDirectionalCartouche(val: number, lang = 'pt'): string {
  const v = Math.max(-100, Math.min(100, Math.round(Number(val) || 0)));
  if (Math.abs(v) <= 2) return 'C';
  return v < 0 ? `◄ ${getLeftPanPrefix(lang)}${Math.abs(v)}` : `D${v} ►`;
}

export function formatPanTitle(val: number, lang = 'pt'): string {
  const v = Math.max(-100, Math.min(100, Math.round(Number(val) || 0)));
  if (Math.abs(v) <= 2) return lang === 'fr' ? 'Pan : Centre' : 'Pan: Centro';
  return `${lang === 'fr' ? 'Pan : ' : 'Pan: '}${formatPanCartouche(v, lang)}`;
}

export function getPanCartoucheClassName(val: number): string {
  const isCentered = Math.abs(Math.round(Number(val) || 0)) <= 2;
  const base = 'min-w-[32px] px-1 py-px text-center font-mono text-[8px] font-black leading-tight border rounded-[1px] pointer-events-none tabular-nums whitespace-nowrap';
  return isCentered
    ? `${base} bg-[var(--cordel-surface)] text-[var(--cordel-text)]/75 border-[var(--cordel-border)]/55`
    : `${base} bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-[var(--cordel-ink-dark)]`;
}

export function buildPanBipolarArcPath(val: number, cx = 16, cy = 16, r = 11.2): string {
  const v = Math.max(-100, Math.min(100, Number(val) || 0));
  if (Math.abs(v) <= 2) return '';
  const deg = v * 1.35;
  const rad = ((deg - 90) * Math.PI) / 180;
  const endX = cx + r * Math.cos(rad);
  const endY = cy + r * Math.sin(rad);
  const sweep = deg > 0 ? 1 : 0;
  return `M ${cx} ${(cy - r).toFixed(2)} A ${r} ${r} 0 0 ${sweep} ${endX.toFixed(2)} ${endY.toFixed(2)}`;
}

export function syncMotorizedPanDomElement(panKnobEl: SVGGElement | null, interpPan: number, lang = 'pt'): void {
  if (!panKnobEl) return;
  panKnobEl.style.transform = '';
  panKnobEl.setAttribute('transform', `rotate(${interpPan * 1.35} 16 16)`);
  const svg = panKnobEl.ownerSVGElement;
  const arcEl = svg?.querySelector('[data-pan-arc="1"]');
  if (arcEl) arcEl.setAttribute('d', buildPanBipolarArcPath(interpPan));
  const root = panKnobEl.closest('[data-pan-root="1"]');
  const cartouche = root?.querySelector('[data-pan-cartouche="1"]') as HTMLElement | null;
  if (cartouche) {
    cartouche.textContent = formatPanDirectionalCartouche(interpPan, lang);
    cartouche.className = getPanCartoucheClassName(interpPan);
  }
}

export function syncPanKnobVisualDom(
  val: number,
  lang: string,
  rotationEl: SVGGElement | null,
  arcEl: SVGPathElement | null,
  cartoucheEl: HTMLSpanElement | null,
  inputEl: HTMLInputElement | null,
  containerEl: HTMLDivElement | null,
  ticks: readonly PanCrownTickSpec[] | undefined,
  tickEls: Array<SVGGElement | null>
): void {
  if (rotationEl) {
    rotationEl.style.transform = '';
    rotationEl.setAttribute('transform', `rotate(${val * 1.35} 16 16)`);
  }
  if (arcEl) arcEl.setAttribute('d', buildPanBipolarArcPath(val));
  const title = formatPanTitle(val, lang);
  if (cartoucheEl) {
    cartoucheEl.textContent = formatPanDirectionalCartouche(val, lang);
    cartoucheEl.className = getPanCartoucheClassName(val);
    cartoucheEl.title = title;
  }
  if (containerEl) containerEl.title = title;
  if (ticks && ticks.length > 0) {
    for (let i = 0; i < ticks.length; i++) {
      const g = tickEls[i];
      if (!g) continue;
      const eff = ticks[i].isFixedWorld
        ? Math.max(-100, Math.min(100, ticks[i].baseOffset))
        : Math.max(-100, Math.min(100, ticks[i].baseOffset + val));
      g.setAttribute('transform', `rotate(${eff * 1.35} 16 16)`);
    }
  }
  if (inputEl) {
    inputEl.value = String(val);
    inputEl.title = title;
  }
}

export function calculatePanFromDelta(
  startY: number, startX: number, currentY: number, currentX: number, startValue: number
): number {
  const diffY = startY - currentY;
  const diffX = currentX - startX;
  const diff = Math.abs(diffY) >= Math.abs(diffX) ? diffY : diffX;
  let val = Math.max(-100, Math.min(100, Math.round(startValue + (diff / 140) * 200)));
  if (Math.abs(val) <= 2) val = 0;
  return val;
}

export interface UsePanKnobInteractionProps {
  trackId?: number;
  value: number;
  defaultValue?: number;
  lang?: string;
  onChange: (val: number) => void;
  panKnobRef?: React.RefObject<SVGGElement | null>;
  memberTicks?: readonly PanCrownTickSpec[];
}
