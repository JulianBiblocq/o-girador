
import { useEffect, useRef } from 'react';
import { audioEngine } from '../../hooks/useAudioSync';
import { getStrokesForInstrument } from '../../utils/instrumentStrokes';
import { getUpperTagName } from '../../utils/crossRealmDom';
import { TouchSelectorState } from './touchStrokeTypes';
import { Language } from '../../types';

interface UseTouchStrokeGesturesProps {
  selector: TouchSelectorState;
  inst: any;
  lang: Language;
  isLeftHanded: boolean;
  hoveredStroke: string | null;
  setHoveredStroke: (val: string | null) => void;
  isSticky: boolean;
  setIsSticky: (val: boolean) => void;
  stickyTimeRef: React.MutableRefObject<number>;
  currentWindow: Window | null;
  onClose: () => void;
}

export function useTouchStrokeGestures({
  selector, inst, lang, isLeftHanded, hoveredStroke, setHoveredStroke,
  isSticky, setIsSticky, stickyTimeRef, currentWindow, onClose,
}: UseTouchStrokeGesturesProps) {
  const hoveredStrokeRef = useRef<string | null>(null);

  useEffect(() => {
    hoveredStrokeRef.current = hoveredStroke;
  }, [hoveredStroke]);

  // Touch drag-to-select tracking
  useEffect(() => {
    if (isSticky || !currentWindow) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      const element = currentWindow.document.elementFromPoint(touch.clientX, touch.clientY);
      if (element) {
        const target = element.closest('[data-stroke-val]');
        setHoveredStroke(target ? target.getAttribute('data-stroke-val') : null);
      }
    };

    const handleRelease = () => {
      const targetVal = hoveredStrokeRef.current;
      if (targetVal !== null && targetVal !== String(selector.currentVal)) {
        if (targetVal !== '0' && audioEngine && !audioEngine.isStrokeLoaded(inst.id, targetVal)) {
          void audioEngine.loadStrokeSamples(inst.id, targetVal).catch(() => {});
        }
        selector.onSelect(targetVal);
        onClose();
      } else {
        setIsSticky(true);
      }
    };

    currentWindow.addEventListener('touchmove', handleTouchMove, { passive: false });
    currentWindow.addEventListener('touchend', handleRelease);
    currentWindow.addEventListener('mouseup', handleRelease);

    return () => {
      currentWindow.removeEventListener('touchmove', handleTouchMove);
      currentWindow.removeEventListener('touchend', handleRelease);
      currentWindow.removeEventListener('mouseup', handleRelease);
    };
  }, [selector, onClose, setHoveredStroke, inst, isSticky, currentWindow, setIsSticky]);

  // Sticky outside click handler
  useEffect(() => {
    if (!isSticky || !currentWindow) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (Date.now() - stickyTimeRef.current < 400) return;
      const container = currentWindow.document.getElementById('touch-stroke-selector-bubble');
      if (container && e.target && !container.contains(e.target as Node)) onClose();
    };
    currentWindow.addEventListener('mousedown', handleOutsideClick);
    currentWindow.addEventListener('touchstart', handleOutsideClick);
    return () => {
      currentWindow.removeEventListener('mousedown', handleOutsideClick);
      currentWindow.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isSticky, onClose, currentWindow, stickyTimeRef]);

  // Keyboard shortcuts listener
  useEffect(() => {
    if (!currentWindow) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = getUpperTagName(e.target);
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const key = e.key;
      if (key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (key === '0' || key === 'Backspace' || key === 'Delete' || key === '-') {
        e.preventDefault(); selector.onSelect('0'); onClose(); return;
      }
      const strokes = getStrokesForInstrument(inst.id, inst.type, lang, isLeftHanded);
      const matched = strokes.find((s) => s.shortcut.toLowerCase() === key.toLowerCase() || s.symbol.toLowerCase() === key.toLowerCase());
      if (matched) { e.preventDefault(); selector.onSelect(matched.symbol); onClose(); }
    };
    currentWindow.addEventListener('keydown', handleKeyDown);
    return () => currentWindow.removeEventListener('keydown', handleKeyDown);
  }, [selector, onClose, inst, lang, isLeftHanded, currentWindow]);
}
