/**
 * BusCompMixSlider.tsx — Tirette horizontale « COMP » (mix parallèle 0..100 %) + jauge GR 60 FPS intégrée (< 125 lignes).
 * - `getBoundingClientRect()` lu UNE fois au `pointerdown` (0 Layout Thrashing pendant `pointermove`).
 * - Pendant le geste : `transform: scaleX()` direct (GPU) + prévisualisation audio directe du Worklet,
 *   commit Store coalescé (~10 Hz, `skipUndo`) puis commit final au relâchement : 0 render thrashing.
 */
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { previewBusCompressorParams } from '../../../audio/effects/busCompressorInsert';
import { beginBusCompMixGesture, commitBusCompMix, pointerToMixPct, resetBusCompMixToDefault } from './busCompMixGesture';
import { useBusCompGrMeter } from './useBusCompGrMeter';

const COMMIT_INTERVAL_MS = 100;
const KEY_STEP_PCT = 5;

interface BusCompMixSliderProps {
  trackId: number;
  mixPct: number;
  lit: boolean;
  grActive: boolean;
  label: string;
  title: string;
}

export const BusCompMixSlider: React.FC<BusCompMixSliderProps> = ({ trackId, mixPct, lit, grActive, label, title }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const mixBarRef = useRef<HTMLDivElement>(null);
  const grBarRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<{ left: number; width: number } | null>(null);
  const pendingRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useBusCompGrMeter(trackId, grActive, grBarRef);

  const applyMixVisual = (pct: number) => {
    if (mixBarRef.current) mixBarRef.current.style.transform = `scaleX(${Math.max(0, Math.min(100, pct)) / 100})`;
  };

  useLayoutEffect(() => { if (!rectRef.current) applyMixVisual(mixPct); }, [mixPct]);
  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);

  const flushCommit = () => {
    timerRef.current = null;
    if (pendingRef.current === null) return;
    commitBusCompMix(trackId, pendingRef.current);
    pendingRef.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !rootRef.current) return;
    e.stopPropagation();
    try { rootRef.current.setPointerCapture(e.pointerId); } catch (_) {}
    const r = rootRef.current.getBoundingClientRect();
    rectRef.current = { left: r.left, width: r.width };
    const pct = pointerToMixPct(e.clientX, r.left, r.width);
    applyMixVisual(pct);
    previewBusCompressorParams(trackId, { mixPct: pct, enabled: true });
    beginBusCompMixGesture(trackId, pct);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = rectRef.current;
    if (!r) return;
    e.stopPropagation();
    const pct = pointerToMixPct(e.clientX, r.left, r.width);
    applyMixVisual(pct);
    previewBusCompressorParams(trackId, { mixPct: pct });
    pendingRef.current = pct;
    if (timerRef.current === null) timerRef.current = window.setTimeout(flushCommit, COMMIT_INTERVAL_MS);
  };

  const endGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rectRef.current) return;
    rectRef.current = null;
    try { rootRef.current?.releasePointerCapture(e.pointerId); } catch (_) {}
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    flushCommit();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = resetBusCompMixToDefault(trackId);
    if (v === null) return;
    applyMixVisual(v);
    previewBusCompressorParams(trackId, { mixPct: v });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    beginBusCompMixGesture(trackId, mixPct + dir * KEY_STEP_PCT);
  };

  return (
    <div
      ref={rootRef}
      role="slider" tabIndex={0} aria-label={title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={mixPct}
      title={title}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
      onPointerUp={endGesture} onPointerCancel={endGesture} onLostPointerCapture={endGesture}
      onDoubleClick={handleDoubleClick} onKeyDown={handleKeyDown}
      onTouchStart={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}
      className="relative flex-1 min-w-0 h-[18px] select-none touch-none cursor-ew-resize overflow-hidden rounded-sm cordel-border-sm bg-[var(--vu-track-bg)] border-[var(--cordel-border)]/30"
    >
      <div
        ref={mixBarRef}
        className={`absolute inset-0 origin-left pointer-events-none will-change-transform bg-[var(--fx-comp-accent)] ${lit ? 'opacity-45' : 'opacity-15'}`}
        style={{ transform: 'scaleX(0)' }}
      />
      <div
        ref={grBarRef}
        className="absolute top-0 left-0 right-0 h-[3px] origin-right pointer-events-none will-change-transform bg-[var(--bus-gr-bar)]"
        style={{ transform: 'scaleX(0)' }}
      />
      <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-bold tracking-tighter pointer-events-none text-[var(--fx-active-text)] ${lit ? 'opacity-100' : 'opacity-55'}`}>
        {label}
      </span>
    </div>
  );
};

