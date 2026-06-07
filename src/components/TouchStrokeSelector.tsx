/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { instrumentsConfig } from '../data';
import { Language } from '../types';
import { getNextStepValue } from './InstrumentDetailEditor';

export interface TouchSelectorState {
  patternId: number;
  stepIdx: number;
  instId: string;
  x: number;
  y: number;
  currentVal: string | number;
  onSelect: (val: string) => void;
}

interface TouchStrokeSelectorProps {
  selector: TouchSelectorState;
  hoveredStroke: string | null;
  setHoveredStroke: (val: string | null) => void;
  onClose: () => void;
  lang: Language;
}

const getStrokeDescription = (instId: string, instType: string, stroke: string, lang: Language): string => {
  const isPt = lang === 'pt';
  if (stroke === '0') {
    return isPt ? 'Silêncio' : 'Silence';
  }

  if (instId === 'caixa') {
    switch (stroke) {
      case 'D': return isPt ? 'Mão Direita (Forte)' : 'Main Droite (Fort)';
      case 'd': return isPt ? 'Mão Direita (Fraca)' : 'Main Droite (Faible)';
      case 'G': return isPt ? 'Mão Esquerda (Forte)' : 'Main Gauche (Fort)';
      case 'g': return isPt ? 'Mão Esquerda (Fraca)' : 'Main Gauche (Faible)';
      case 'rd': return isPt ? 'Rufada Direita' : 'Roulement court D';
      case 'rg': return isPt ? 'Rufada Esquerda' : 'Roulement court G';
      case 'x': return isPt ? 'Toque no aro' : 'Coup sur le cerclage';
      case 'f': return isPt ? 'Fla' : 'Fla';
      case 'b': return isPt ? 'Barulho / Vassourada' : 'Fatra (brossé)';
      default: return stroke;
    }
  }

  if (instId === 'marcante' || instId === 'meiao' || instId === 'repique') {
    switch (stroke) {
      case 'D': return isPt ? 'Mão Direita (Forte)' : 'Main Droite (Fort)';
      case 'd': return isPt ? 'Mão Direita (Fraca)' : 'Main Droite (Faible)';
      case 'G': return isPt ? 'Mão Esquerda (Forte)' : 'Main Gauche (Fort)';
      case 'g': return isPt ? 'Mão Esquerda (Fraca)' : 'Main Gauche (Faible)';
      case 'b': return isPt ? 'Toque abafado (Barulho)' : 'Coup étouffé (Barulho)';
      case 'x': return isPt ? 'Toque no aro' : 'Coup sur le cerclage';
      case 'i': return isPt ? 'Bacalhau (Iguarassu)' : 'Bacalhau (Iguarassu)';
      default: return stroke;
    }
  }

  if (instType === 'gongue') {
    switch (stroke) {
      case 'GRV': return isPt ? 'Grave Forte' : 'Grave Fort';
      case 'grv': return isPt ? 'Grave Fraco' : 'Grave Faible';
      case 'AIG': return isPt ? 'Agudo Forte' : 'Aigu Fort';
      case 'aig': return isPt ? 'Agudo Fraco' : 'Aigu Faible';
      case 'b': return isPt ? 'Toque abafado' : 'Coup étouffé';
      default: return stroke;
    }
  }

  if (instId === 'agbe') {
    switch (stroke) {
      case 'G': return isPt ? 'Esquerda (Forte)' : 'Gauche (Fort)';
      case 'g': return isPt ? 'Esquerda (Fraca)' : 'Gauche (Faible)';
      case 'D': return isPt ? 'Direita (Forte)' : 'Droite (Fort)';
      case 'd': return isPt ? 'Direita (Fraca)' : 'Droite (Faible)';
      case 'b': return isPt ? 'Vassourada (Barulho)' : 'Brossé (Barulho)';
      case 's': return isPt ? 'Salto / Lançamento' : 'Saut / Lancer';
      default: return stroke;
    }
  }

  if (instId === 'mineiro') {
    switch (stroke) {
      case 'P': return isPt ? 'Cima / Puxar (Forte)' : 'Haut / Pousser (Fort)';
      case 'p': return isPt ? 'Cima / Puxar (Fraco)' : 'Haut / Pousser (Faible)';
      case 'T': return isPt ? 'Baixo / Tirar (Forte)' : 'Bas / Tirer (Fort)';
      case 't': return isPt ? 'Baixo / Tirar (Fraco)' : 'Bas / Tirer (Faible)';
      default: return stroke;
    }
  }

  if (instType === 'voice') {
    switch (stroke) {
      case 'P': return isPt ? 'Puxador' : 'Puxador';
      case 'C': return isPt ? 'Coro' : 'Chœur';
      default: return stroke;
    }
  }

  return stroke;
};

export const TouchStrokeSelector: React.FC<TouchStrokeSelectorProps> = ({
  selector,
  hoveredStroke,
  setHoveredStroke,
  onClose,
  lang,
}) => {
  const hoveredStrokeRef = useRef<string | null>(null);
  const [isSticky, setIsSticky] = useState<boolean>(false);
  const stickyTimeRef = useRef<number>(0);

  useEffect(() => {
    hoveredStrokeRef.current = hoveredStroke;
  }, [hoveredStroke]);

  // Keep track of when sticky mode is activated to prevent emulated click race conditions
  useEffect(() => {
    if (isSticky) {
      stickyTimeRef.current = Date.now();
    }
  }, [isSticky]);

  const inst = instrumentsConfig.find((i) => i.id === selector.instId);
  if (!inst) return null;

  // Extract strokes excluding 'text' key
  const instStrokes = Object.keys(inst.colors).filter((k) => k !== 'text');
  // Include "0" (silence) at the beginning of the list
  const allChoices = ['0', ...instStrokes];

  useEffect(() => {
    // 1. Touch drag-to-select tracking
    const handleTouchMove = (e: TouchEvent) => {
      if (isSticky) return; // Don't track drag move once we are in sticky tap mode
      
      // Prevent default page scroll/overscroll while actively dragging/sliding to select a note
      if (e.cancelable) {
        e.preventDefault();
      }

      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element) {
        const target = element.closest('[data-stroke-val]');
        if (target) {
          const strokeVal = target.getAttribute('data-stroke-val');
          if (strokeVal !== null) {
            setHoveredStroke(strokeVal);
          }
        } else {
          setHoveredStroke(null);
        }
      }
    };

    const handleTouchEnd = () => {
      if (isSticky) return;

      // If the user dragged to a DIFFERENT stroke, select it and close
      if (hoveredStrokeRef.current !== null && hoveredStrokeRef.current !== String(selector.currentVal)) {
        selector.onSelect(hoveredStrokeRef.current);
        onClose();
      } else {
        // Otherwise (tap or no drag change), enter sticky mode so they can view options and tap one
        setIsSticky(true);
      }
    };

    // 2. Mouse up validation
    const handleMouseUp = () => {
      if (isSticky) return;

      // If the user dragged to a DIFFERENT stroke, select it and close
      if (hoveredStrokeRef.current !== null && hoveredStrokeRef.current !== String(selector.currentVal)) {
        selector.onSelect(hoveredStrokeRef.current);
        onClose();
      } else {
        setIsSticky(true);
      }
    };

    // Use passive: false to allow e.preventDefault() to freeze background scrolling
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [selector, onClose, setHoveredStroke, inst, isSticky]);

  // 3. Sticky outside click handler
  useEffect(() => {
    if (!isSticky) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      // Cooldown of 400ms to ignore emulated mouse events after touch release
      if (Date.now() - stickyTimeRef.current < 400) {
        return;
      }
      const container = document.getElementById('touch-stroke-selector-bubble');
      if (container && !container.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('touchstart', handleOutsideClick);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isSticky, onClose]);

  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
  const bubbleWidth = Math.min(270, screenWidth - 24);
  const leftPos = Math.max(bubbleWidth / 2 + 12, Math.min(screenWidth - bubbleWidth / 2 - 12, selector.x));
  const arrowOffset = selector.x - leftPos;

  return (
    <div
      className="fixed z-[9999] flex flex-col items-center pointer-events-none"
      style={{
        left: `${leftPos}px`,
        top: `${selector.y}px`,
        transform: 'translate(-50%, -100%) translateY(-15px)',
      }}
    >
      {/* Popover Bubble Container */}
      <div 
        id="touch-stroke-selector-bubble"
        className="flex flex-col gap-1.5 p-2 bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[4px_4px_0_#1a1a1a] pointer-events-auto select-none rounded-none max-w-[270px] min-w-[210px] items-center"
      >
        {/* Helper translation header */}
        <span className="text-[10px] font-bold border-b border-[#1a1a1a]/25 pb-1 mb-1 text-center text-[#1a1a1a] uppercase tracking-wider font-cactus w-full">
          {hoveredStroke 
            ? getStrokeDescription(selector.instId, inst.type, hoveredStroke, lang) 
            : (lang === 'fr' ? 'Glissez ou touchez un coup' : 'Arraste ou toque num golpe')}
        </span>

        {/* Choices container */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
          {allChoices.map((stroke) => {
            const isSilence = stroke === '0';
            const strokeVal = isSilence ? '0' : stroke;
            const isHovered = hoveredStroke === strokeVal;

            let bgColor = isSilence ? '#7f8c8d' : (inst.colors[stroke] || '#111');
            let textColor = isSilence ? '#fff' : (inst.colors.text || '#fff');
            if (inst.id === 'gongue' && (stroke === 'AIG' || stroke === 'aig')) {
              textColor = '#000';
            }

            // Display label formatting
            let displayLabel = stroke;
            if (isSilence) {
              displayLabel = 'Ø';
            } else if (inst.type === 'gongue') {
              if (stroke === 'GRV') displayLabel = 'G';
              else if (stroke === 'grv') displayLabel = 'g';
              else if (stroke === 'AIG') displayLabel = 'A';
              else if (stroke === 'aig') displayLabel = 'a';
            }

            const handleButtonSelect = (e: React.MouseEvent | React.TouchEvent) => {
              e.stopPropagation();
              e.preventDefault();
              selector.onSelect(strokeVal);
              onClose();
            };

            return (
              <div
                key={stroke}
                data-stroke-val={strokeVal}
                onMouseEnter={() => setHoveredStroke(strokeVal)}
                onMouseLeave={() => setHoveredStroke(null)}
                onClick={handleButtonSelect}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }} // Prevent native magnifier / long press menu and stop propagation
                onTouchEnd={handleButtonSelect}
                className={`w-11 h-11 flex items-center justify-center font-bold text-sm cursor-pointer transition-all border-2 ${
                  isHovered
                    ? 'border-[#f1c40f] scale-110 shadow-[0_0_8px_#f1c40f] z-10'
                    : 'border-[#1a1a1a]'
                }`}
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                }}
              >
                <span className="pointer-events-none">{displayLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popover Downward Arrow */}
      <div
        className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#1a1a1a]"
        style={{ 
          marginTop: '-2px',
          transform: `translateX(${arrowOffset}px)`
        }}
      />
    </div>
  );
};
