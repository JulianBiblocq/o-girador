/**
 * GridCursorStrokeBadge.tsx — Badge flottant sous le curseur PC (souris fine, 0 re-render React, GPU translate3d) (< 115 lignes).
 */
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getVisualStrokeSymbol, isDarkText } from '../../../data';
import { useSequencer } from '../../../contexts/SequencerContext';
import { useWindow } from '../../../contexts/WindowContext';
import { applyCordelInkedPatina } from '../../../utils/colorHelpers';

export interface GridCursorStrokeBadgeProps {
  gridZoneRef: React.RefObject<HTMLElement | null>;
  instrument: { id: string; type: string; colors: Record<string, string>; color?: string };
  activeTool?: string;
  isMultiSelectActive: boolean;
  isTupletEditMode: boolean;
}

export const GridCursorStrokeBadge: React.FC<GridCursorStrokeBadgeProps> = React.memo(({
  gridZoneRef, instrument, activeTool = 'D', isMultiSelectActive, isTupletEditMode,
}) => {
  const { isLeftHanded } = useSequencer();
  const hostWin = useWindow();
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const isInsideRef = useRef(false);
  const lastPosRef = useRef({ x: -9999, y: -9999 });

  const isDisabled =
    instrument.type === 'voice' || isMultiSelectActive || isTupletEditMode || activeTool === 'scissors';

  useEffect(() => {
    const zoneEl = gridZoneRef.current;
    const badgeEl = badgeRef.current;
    if (!zoneEl || !badgeEl || isDisabled) {
      isInsideRef.current = false;
      if (badgeEl) badgeEl.style.opacity = '0';
      return;
    }
    const win = zoneEl.ownerDocument?.defaultView || window;
    const hide = () => { if (badgeRef.current) badgeRef.current.style.opacity = '0'; };

    const syncBadge = (x: number, y: number, suppressed: boolean) => {
      const el = badgeRef.current;
      if (!el) return;
      if (suppressed || !isInsideRef.current) { el.style.opacity = '0'; return; }
      el.style.transform = `translate3d(${Math.round(x + 14)}px, ${Math.round(y + 14)}px, 0)`;
      el.style.opacity = '1';
    };

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || (e.pointerType !== 'mouse' && e.pointerType !== 'pen')) {
        isInsideRef.current = false; hide(); return;
      }
      if (win.matchMedia && !win.matchMedia('(pointer: fine)').matches) {
        isInsideRef.current = false; hide(); return;
      }
      const onControl = Boolean((e.target as HTMLElement | null)?.closest?.('button, select'));
      isInsideRef.current = true;
      lastPosRef.current.x = e.clientX;
      lastPosRef.current.y = e.clientY;
      syncBadge(e.clientX, e.clientY, onControl || e.ctrlKey || e.metaKey || e.shiftKey);
    };

    const onLeave = () => { isInsideRef.current = false; hide(); };
    const onKey = (e: KeyboardEvent) => {
      if (!isInsideRef.current) return;
      syncBadge(lastPosRef.current.x, lastPosRef.current.y, e.ctrlKey || e.metaKey || e.shiftKey);
    };

    zoneEl.addEventListener('pointerenter', onPointer, { passive: true });
    zoneEl.addEventListener('pointermove', onPointer, { passive: true });
    zoneEl.addEventListener('pointerleave', onLeave, { passive: true });
    zoneEl.addEventListener('pointercancel', onLeave, { passive: true });
    zoneEl.addEventListener('touchstart', onLeave, { passive: true });
    win.addEventListener('keydown', onKey, { passive: true });
    win.addEventListener('keyup', onKey, { passive: true });
    win.addEventListener('blur', onLeave);
    return () => {
      zoneEl.removeEventListener('pointerenter', onPointer);
      zoneEl.removeEventListener('pointermove', onPointer);
      zoneEl.removeEventListener('pointerleave', onLeave);
      zoneEl.removeEventListener('pointercancel', onLeave);
      zoneEl.removeEventListener('touchstart', onLeave);
      win.removeEventListener('keydown', onKey);
      win.removeEventListener('keyup', onKey);
      win.removeEventListener('blur', onLeave);
      isInsideRef.current = false;
    };
  }, [gridZoneRef, isDisabled]);

  if (isDisabled) return null;

  const isEraser = activeTool === '0' || activeTool === '';
  const visualSymbol = isEraser ? '⌫' : String(getVisualStrokeSymbol(activeTool, isLeftHanded, instrument.id));
  const rawCol = isEraser ? '' : (instrument.colors?.[activeTool] || instrument.colors?.[visualSymbol] || instrument.color || '');
  const bgCol = isEraser ? 'var(--cordel-paper-surface)' : (rawCol ? applyCordelInkedPatina(rawCol) : 'var(--cordel-parchment-panel)');
  const txtCol = isEraser
    ? '#c0392b'
    : (isDarkText(instrument.id, activeTool, rawCol ? bgCol : undefined) ? 'var(--cordel-ink-dark)' : 'var(--cordel-on-accent)');
  const borderCls = isEraser ? 'border-[#c0392b]' : 'border-[var(--cordel-ink-dark)]';
  const portalBody = (hostWin?.document || (typeof document !== 'undefined' ? document : null))?.body;
  if (!portalBody) return null;

  return createPortal(
    <div
      ref={badgeRef}
      aria-hidden="true"
      data-testid="grid-cursor-stroke-badge"
      style={{ backgroundColor: bgCol, color: txtCol, opacity: 0, transform: 'translate3d(-9999px, -9999px, 0)', willChange: 'transform, opacity' }}
      className={`hidden [@media(pointer:fine)]:flex fixed top-0 left-0 z-[120] pointer-events-none select-none items-center justify-center min-w-[26px] h-[22px] px-1.5 border-2 ${borderCls} shadow-[2px_2px_0px_var(--cordel-ink-dark)] font-mono font-extrabold text-xs leading-none`}
    >
      {visualSymbol}
    </div>,
    portalBody
  );
});

GridCursorStrokeBadge.displayName = 'GridCursorStrokeBadge';
