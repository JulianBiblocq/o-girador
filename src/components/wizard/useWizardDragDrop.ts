import { useRef } from 'react';
import { useWizardStore } from '../../stores/useWizardStore';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';
import { AVAILABLE_INSTRUMENTS, LIMITS, t } from './wizardConstants';
import { clampPositionToCone } from './wizardStageGeometry';
import { computeSmartSinglePlacement } from './wizardFormations';
import { playWizardSpatialHit } from './audio/wizardSpatialPreview';
import { Language } from '../../types';

interface DragSession {
  active: boolean;
  type?: string;
  id?: string;
  startX: number;
  startY: number;
  hasMoved: boolean;
  initialLeft: number;
  initialTop: number;
  element: HTMLElement | null;
  isReadyToRemove: boolean;
}

const IDLE_DRAG: DragSession = {
  active: false, startX: 0, startY: 0, hasMoved: false, initialLeft: 0, initialTop: 0, element: null, isReadyToRemove: false,
};

export function useWizardDragDrop(wizardLang: Language, showToast: (msg: string) => void) {
  const addPlacedInstrument = useWizardStore((s) => s.addPlacedInstrument);
  const updatePlacedInstrumentPosition = useWizardStore((s) => s.updatePlacedInstrumentPosition);
  const removePlacedInstrument = useWizardStore((s) => s.removePlacedInstrument);
  const placedInstruments = useWizardStore((s) => s.placedInstruments);
  const resolveLabel = useInstrumentLabel();

  const placeRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dismissZoneRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<DragSession>({ ...IDLE_DRAG });

  const setDismissVisible = (v: boolean) => {
    const el = dismissZoneRef.current;
    if (!el) return;
    el.style.opacity = v ? '1' : '0';
    el.style.transform = v ? 'translate(-50%, 0)' : 'translate(-50%, -150%)';
    el.style.pointerEvents = v ? 'auto' : 'none';
  };

  const addWithSound = (type: string, x: number, y: number) => {
    if (type === 'apito') { useWizardStore.getState().setHasApito(true); playWizardSpatialHit('apito', 50, 100); return; }
    const count = useWizardStore.getState().placedInstruments.filter((i) => i.instrumentType === type).length;
    if (LIMITS[type] !== undefined && count >= LIMITS[type]) { showToast(t[wizardLang].attentionSurcharge); return; }
    addPlacedInstrument(type, x, y);
    playWizardSpatialHit(type, x, y);
  };

  const handlePalettePointerDown = (e: React.PointerEvent<HTMLDivElement>, type: string) => {
    e.preventDefault(); e.stopPropagation();
    if (type === 'apito') {
      const next = !useWizardStore.getState().hasApito;
      useWizardStore.getState().setHasApito(next);
      if (next) playWizardSpatialHit('apito', 50, 100);
      return;
    }
    const cfg = AVAILABLE_INSTRUMENTS.find((i) => i.id === type);
    const label = resolveLabel(type) || cfg?.label || type;
    if (ghostRef.current) {
      Object.assign(ghostRef.current.style, {
        display: 'none', width: '56px', height: '56px', backgroundColor: 'var(--cordel-surface-elevated)',
        color: 'var(--cordel-text)', border: `3px solid ${cfg?.color || 'var(--cordel-border-strong)'}`,
        borderRadius: '9999px', boxShadow: '2px 2px 0px var(--cordel-shadow-color)',
        transform: `translate3d(${e.clientX - 28}px, ${e.clientY - 28}px, 0)`,
      });
      ghostRef.current.innerHTML = `<img src="${cfg?.iconImg || ''}" class="w-6 h-6 object-contain pointer-events-none p-0.5 rounded-full bg-[var(--cordel-paper-surface)]" /><span class="text-[7px] font-cactus font-bold uppercase truncate max-w-[46px] leading-none mt-0.5">${label}</span>`;
    }
    dragInfoRef.current = { active: true, type, startX: e.clientX, startY: e.clientY, hasMoved: false, initialLeft: 28, initialTop: 28, element: ghostRef.current, isReadyToRemove: false };
  };

  const handlePlacedPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    dragInfoRef.current = { active: true, id, startX: e.clientX, startY: e.clientY, hasMoved: false, element: e.currentTarget, isReadyToRemove: false, initialLeft: e.clientX - (r.left + r.width / 2), initialTop: e.clientY - (r.top + r.height / 2) };
    setDismissVisible(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragInfoRef.current;
    if (!drag.active || !drag.element) return;
    if (!drag.hasMoved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) >= 6) {
      drag.hasMoved = true;
      if (drag.type && ghostRef.current) ghostRef.current.style.display = 'flex';
      setDismissVisible(true);
    }
    if (!drag.hasMoved) return;
    const dRect = dismissZoneRef.current?.getBoundingClientRect();
    const isOver = !!dRect && e.clientX >= dRect.left && e.clientX <= dRect.right && e.clientY >= dRect.top && e.clientY <= dRect.bottom;
    if (drag.type) {
      Object.assign(drag.element.style, { position: 'fixed', transform: `translate3d(${e.clientX - drag.initialLeft}px, ${e.clientY - drag.initialTop}px, 0)`, zIndex: '100025' });
    } else if (drag.id && placeRef.current) {
      const pRect = placeRef.current.getBoundingClientRect();
      const cross = drag.element.querySelector<HTMLElement>('.remove-cross');
      drag.isReadyToRemove = isOver;
      const pos = isOver ? { x: ((e.clientX - drag.initialLeft - pRect.left) / pRect.width) * 100, y: ((e.clientY - drag.initialTop - pRect.top) / pRect.height) * 100 } : clampPositionToCone(e.clientX - drag.initialLeft, e.clientY - drag.initialTop, pRect);
      drag.element.style.left = `${pos.x}%`; drag.element.style.top = `${pos.y}%`;
      if (cross) cross.style.opacity = isOver ? '1' : '0';
      drag.element.style.transform = 'translate(-50%, -50%)'; drag.element.style.zIndex = '9999';
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragInfoRef.current;
    if (!drag.active) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    setDismissVisible(false);
    if (drag.element) {
      if (drag.element === ghostRef.current) ghostRef.current.style.display = 'none';
      else { drag.element.style.zIndex = ''; const cross = drag.element.querySelector<HTMLElement>('.remove-cross'); if (cross) cross.style.opacity = '0'; }
    }
    if (drag.type && !drag.hasMoved) {
      const pt = computeSmartSinglePlacement(drag.type, placedInstruments);
      addWithSound(drag.type, pt.x, pt.y);
    } else if (placeRef.current) {
      const pRect = placeRef.current.getBoundingClientRect();
      const dRect = dismissZoneRef.current?.getBoundingClientRect();
      const isOver = !!dRect && e.clientX >= dRect.left && e.clientX <= dRect.right && e.clientY >= dRect.top && e.clientY <= dRect.bottom;
      if (drag.id) {
        if (isOver || drag.isReadyToRemove) removePlacedInstrument(drag.id);
        else {
          const { x, y } = clampPositionToCone(e.clientX - drag.initialLeft, e.clientY - drag.initialTop, pRect);
          updatePlacedInstrumentPosition(drag.id, x, y);
          const moved = placedInstruments.find((i) => i.id === drag.id);
          if (moved) playWizardSpatialHit(moved.instrumentType, x, y, 0.85);
        }
      } else if (drag.type && !isOver && e.clientX >= pRect.left && e.clientX <= pRect.right && e.clientY >= pRect.top && e.clientY <= pRect.bottom) {
        const { x, y } = clampPositionToCone(e.clientX, e.clientY, pRect);
        addWithSound(drag.type, x, y);
      }
    }
    dragInfoRef.current = { ...IDLE_DRAG };
  };

  return { placeRef, ghostRef, dismissZoneRef, handlePalettePointerDown, handlePlacedPointerDown, handlePointerMove, handlePointerUp };
}
