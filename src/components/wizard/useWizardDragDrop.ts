import { useRef } from 'react';
import { useWizardStore } from '../../stores/useWizardStore';
import { AVAILABLE_INSTRUMENTS, LIMITS, t } from './wizardConstants';
import { clampPositionToCone } from './wizardStageGeometry';
import { Language } from '../../types';

export function useWizardDragDrop(wizardLang: Language, showToast: (msg: string) => void) {
  const addPlacedInstrument = useWizardStore((state) => state.addPlacedInstrument);
  const updatePlacedInstrumentPosition = useWizardStore((state) => state.updatePlacedInstrumentPosition);
  const removePlacedInstrument = useWizardStore((state) => state.removePlacedInstrument);
  const placedInstruments = useWizardStore((state) => state.placedInstruments);

  const placeRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dismissZoneRef = useRef<HTMLDivElement>(null);

  const dragInfoRef = useRef<{
    active: boolean;
    type?: string;
    id?: string;
    initialLeft: number;
    initialTop: number;
    element: HTMLElement | null;
    isReadyToRemove: boolean;
  }>({ active: false, element: null, initialLeft: 0, initialTop: 0, isReadyToRemove: false });

  const setDismissZoneVisible = (visible: boolean) => {
    if (!dismissZoneRef.current) return;
    dismissZoneRef.current.style.opacity = visible ? '1' : '0';
    dismissZoneRef.current.style.transform = visible ? 'translate(-50%, 0)' : 'translate(-50%, -150%)';
    dismissZoneRef.current.style.pointerEvents = visible ? 'auto' : 'none';
  };

  const handlePalettePointerDown = (e: React.PointerEvent<HTMLDivElement>, type: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!ghostRef.current) return;
    const cfg = AVAILABLE_INSTRUMENTS.find((i) => i.id === type);
    Object.assign(ghostRef.current.style, {
      display: 'flex', width: '52px', height: '52px', backgroundColor: '#f4ecd8',
      border: `3px solid ${cfg?.color || '#1a1a1a'}`, borderRadius: '9999px', boxShadow: '2px 2px 0px rgba(0,0,0,1)',
      transform: `translate3d(${e.clientX - 26}px, ${e.clientY - 26}px, 0)`,
    });
    ghostRef.current.innerHTML = `
      <img src="${cfg?.iconImg}" class="w-6 h-6 object-contain pointer-events-none p-0.5 rounded-full bg-[#1a1a1a]/5" style="border: 2px solid ${cfg?.color}" />
      <span class="text-[7px] font-cactus font-bold uppercase truncate max-w-[44px] leading-none mt-0.5">${cfg?.label || ''}</span>
    `;
    dragInfoRef.current = { active: true, type, initialLeft: 26, initialTop: 26, element: ghostRef.current, isReadyToRemove: false };
    setDismissZoneVisible(true);
  };

  const handlePlacedPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    dragInfoRef.current = {
      active: true, id, element: e.currentTarget, isReadyToRemove: false,
      initialLeft: e.clientX - (rect.left + rect.width / 2), initialTop: e.clientY - (rect.top + rect.height / 2),
    };
    setDismissZoneVisible(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragInfoRef.current;
    if (!drag.active || !drag.element) return;
    const dRect = dismissZoneRef.current?.getBoundingClientRect();
    const isOver = !!dRect && e.clientX >= dRect.left && e.clientX <= dRect.right && e.clientY >= dRect.top && e.clientY <= dRect.bottom;

    if (drag.type) {
      Object.assign(drag.element.style, {
        position: 'fixed', transform: `translate3d(${e.clientX - drag.initialLeft}px, ${e.clientY - drag.initialTop}px, 0)`, zIndex: '99999',
      });
    } else if (drag.id && placeRef.current) {
      const pRect = placeRef.current.getBoundingClientRect();
      const cross = drag.element.querySelector<HTMLElement>('.remove-cross');
      drag.isReadyToRemove = isOver;
      if (isOver) {
        drag.element.style.left = `${((e.clientX - drag.initialLeft - pRect.left) / pRect.width) * 100}%`;
        drag.element.style.top = `${((e.clientY - drag.initialTop - pRect.top) / pRect.height) * 100}%`;
        drag.element.style.filter = 'grayscale(100%) sepia(100%) hue-rotate(-50deg) saturate(600%)';
        if (cross) cross.style.opacity = '1';
      } else {
        const { x, y } = clampPositionToCone(e.clientX - drag.initialLeft, e.clientY - drag.initialTop, pRect);
        drag.element.style.left = `${x}%`; drag.element.style.top = `${y}%`; drag.element.style.filter = 'none';
        if (cross) cross.style.opacity = '0';
      }
      drag.element.style.transform = 'translate(-50%, -50%)'; drag.element.style.zIndex = '9999';
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragInfoRef.current;
    if (!drag.active) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    drag.active = false;
    setDismissZoneVisible(false);
    if (drag.element) {
      if (drag.element === ghostRef.current) ghostRef.current.style.display = 'none';
      else {
        drag.element.style.zIndex = ''; drag.element.style.filter = 'none';
        const cross = drag.element.querySelector<HTMLElement>('.remove-cross');
        if (cross) cross.style.opacity = '0';
      }
    }
    if (placeRef.current) {
      const pRect = placeRef.current.getBoundingClientRect();
      const dRect = dismissZoneRef.current?.getBoundingClientRect();
      const isOver = !!dRect && e.clientX >= dRect.left && e.clientX <= dRect.right && e.clientY >= dRect.top && e.clientY <= dRect.bottom;
      if (drag.id) {
        if (isOver || drag.isReadyToRemove) removePlacedInstrument(drag.id);
        else {
          const { x, y } = clampPositionToCone(e.clientX - drag.initialLeft, e.clientY - drag.initialTop, pRect);
          updatePlacedInstrumentPosition(drag.id, x, y);
        }
      } else if (drag.type && !isOver) {
        if (e.clientX >= pRect.left && e.clientX <= pRect.right && e.clientY >= pRect.top && e.clientY <= pRect.bottom) {
          const { x, y } = clampPositionToCone(e.clientX, e.clientY, pRect);
          const currentCount = placedInstruments.filter((i) => i.instrumentType === drag.type).length;
          if (LIMITS[drag.type] !== undefined && currentCount >= LIMITS[drag.type]) showToast(t[wizardLang].attentionSurcharge);
          addPlacedInstrument(drag.type, x, y);
        }
      }
    }
    dragInfoRef.current = { active: false, element: null, initialLeft: 0, initialTop: 0, isReadyToRemove: false };
  };

  return { placeRef, ghostRef, dismissZoneRef, handlePalettePointerDown, handlePlacedPointerDown, handlePointerMove, handlePointerUp };
}
