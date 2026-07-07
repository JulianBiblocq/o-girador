/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { instrumentsConfig, isDarkText, getVisualStrokeSymbol } from '../data';
import { Language } from '../types';
import { getNextStepValue } from '../utils/instrumentStrokes';
import { useSequencer } from '../contexts/SequencerContext';

export interface TouchSelectorState {
  patternId: number;
  stepIdx: number;
  instId: string;
  x: number;
  y: number;
  currentVal: string | number;
  onSelect: (val: string) => void;
  isStickyDefault?: boolean;
}

interface TouchStrokeSelectorProps {
  selector: TouchSelectorState;
  hoveredStroke: string | null;
  setHoveredStroke: (val: string | null) => void;
  onClose: () => void;
}

const getStrokeDescription = (instId: string, instType: string, stroke: string, lang: Language): string => {
  const isPt = lang === 'pt';
  if (stroke === '0') {
    return isPt ? 'Silêncio' : 'Silence';
  }

  if (instId === 'timbal') {
    switch (stroke) {
      case 'G': return isPt ? 'Baixo (Forte - Mão Forte)' : 'Basse (Fort - Main Forte)';
      case 'g': return isPt ? 'Baixo (Fraca - Mão Fraca)' : 'Basse (Faible - Main Faible)';
      case 'A': return isPt ? 'Aberto (Forte - Mão Forte)' : 'Ouvert (Fort - Main Forte)';
      case 'a': return isPt ? 'Aberto (Fraca - Mão Fraca)' : 'Ouvert (Faible - Main Faible)';
      case 'S': return isPt ? 'Slap (Forte - Mão Forte)' : 'Claqué (Fort - Main Forte)';
      case 's': return isPt ? 'Slap (Fraca - Mão Fraca)' : 'Claqué (Faible - Main Faible)';
      case 'D': return isPt ? 'Dedilhado (Forte - Mão Forte)' : 'Fantôme (Fort - Main Forte)';
      case 'd': return isPt ? 'Dedilhado (Fraca - Mão Fraca)' : 'Fantôme (Faible - Main Faible)';
      case 'P': return isPt ? 'Preso (Forte - Mão Forte)' : 'Fermé (Fort - Main Forte)';
      case 'p': return isPt ? 'Preso (Fraca - Mão Fraca)' : 'Fermé (Faible - Main Faible)';
      case 'F': return isPt ? 'Fla aberto' : 'Fla ouvert';
      case 'V': return isPt ? 'Fla slap' : 'Fla claqué';
      case 'C': return isPt ? 'Clap (mãos)' : 'Clap (mains)';
      case 'B': return isPt ? 'Tremor (Barulho)' : 'Tremblement';
      default: return stroke;
    }
  }

  if (instId === 'caixa' || instId === 'tarol') {
    switch (stroke) {
      case 'D': return isPt ? 'Mão Direita (Forte)' : 'Main Droite (Fort)';
      case 'd': return isPt ? 'Mão Direita (Fraca)' : 'Main Droite (Faible)';
      case 'E': return isPt ? 'Mão Esquerda (Forte)' : 'Main Gauche (Fort)';
      case 'e': return isPt ? 'Mão Esquerda (Fraca)' : 'Main Gauche (Faible)';

      case 'R': return isPt ? 'Rufada Direita' : 'Roulement court D';
      case 'r': return isPt ? 'Rufada Esquerda' : 'Roulement court G';
      case 'X': return isPt ? 'Toque no aro' : 'Coup sur le cerclage';
      case 'F': return isPt ? 'Fla' : 'Fla';
      case 'C': return isPt ? 'Click' : 'Click';
      case 'B': return isPt ? 'Tremor (Barulho)' : 'Tremblement';
      default: return stroke;
    }
  }

  if (instId === 'marcante' || instId === 'meiao' || instId === 'repique') {
    switch (stroke) {
      case 'D': return isPt ? 'Mão Direita (Forte)' : 'Main Droite (Fort)';
      case 'd': return isPt ? 'Mão Direita (Fraca)' : 'Main Droite (Faible)';
      case 'E': return isPt ? 'Mão Esquerda (Forte)' : 'Main Gauche (Fort)';
      case 'e': return isPt ? 'Mão Esquerda (Fraca)' : 'Main Gauche (Faible)';

      case 'X': return isPt ? 'Toque no aro' : 'Coup sur le cerclage';
      case 'C': return isPt ? 'Click' : 'Click';
      case 'I': return isPt ? 'Bacalhau (Iguarassu)' : 'Bacalhau (Iguarassu)';
      case 'B': return isPt ? 'Tremor (Barulho)' : 'Tremblement';
      default: return stroke;
    }
  }

  if (instType === 'gongue') {
    switch (stroke) {
      case 'G': return isPt ? 'Grave Forte' : 'Grave Fort';
      case 'g': return isPt ? 'Grave Fraco' : 'Grave Faible';
      case 'A': return isPt ? 'Agudo Forte' : 'Aigu Fort';
      case 'a': return isPt ? 'Agudo Fraco' : 'Aigu Faible';
      case 'X': return isPt ? 'Toque no aro' : 'Coup sur le cerclage';
      case 'B': return isPt ? 'Tremor (Barulho)' : 'Tremblement';
      default: return stroke;
    }
  }

  if (instId === 'agbe') {
    switch (stroke) {
      case 'E': return isPt ? 'Esquerda (Forte)' : 'Gauche (Fort)';
      case 'e': return isPt ? 'Esquerda (Fraca)' : 'Gauche (Faible)';
      case 'D': return isPt ? 'Direita (Forte)' : 'Droite (Fort)';
      case 'd': return isPt ? 'Direita (Fraca)' : 'Droite (Faible)';
      case 'S': return isPt ? 'Salto' : 'Salto';
      case 'V': return isPt ? 'Volta' : 'Volta';
      case 'B': return isPt ? 'Tremor (Barulho)' : 'Tremblement';
      default: return stroke;
    }
  }

  if (instId === 'mineiro') {
    switch (stroke) {
      case 'P': return isPt ? 'Push (Forte)' : 'Pousser (Fort)';
      case 'p': return isPt ? 'Push (Fraco)' : 'Pousser (Faible)';
      case 'T': return isPt ? 'Pull (Forte)' : 'Tirer (Fort)';
      case 't': return isPt ? 'Pull (Fraco)' : 'Tirer (Faible)';
      case 'L': return isPt ? 'Lado' : 'Lado';
      case 'B': return isPt ? 'Tremor (Barulho)' : 'Tremblement';
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

const TouchStrokeSelectorComponent: React.FC<TouchStrokeSelectorProps> = ({
  selector,
  hoveredStroke,
  setHoveredStroke,
  onClose,
}) => {
  const { lang, isLeftHanded = false } = useSequencer();
  const hoveredStrokeRef = useRef<string | null>(null);
  const [isSticky, setIsSticky] = useState<boolean>(selector.isStickyDefault || false);
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
    if (isSticky) return; // Don't register drag tracking listeners if we are in sticky mode

    // 1. Touch drag-to-select tracking
    const handleTouchMove = (e: TouchEvent) => {
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
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 640;
  const bubbleWidth = Math.min(270, screenWidth - 24);
  const bubbleHeight = 150; // approximate height of the bubble
  const leftPos = Math.max(bubbleWidth / 2 + 12, Math.min(screenWidth - bubbleWidth / 2 - 12, selector.x));
  const arrowOffset = selector.x - leftPos;

  // Collision detection for top of screen
  const isTooHigh = selector.y - bubbleHeight - 15 < 0;
  
  const transformStyle = isTooHigh 
    ? 'translate(-50%, 0) translateY(15px)' // render below the step
    : 'translate(-50%, -100%) translateY(-15px)'; // render above the step (default)

  return (
    <div
      className="fixed z-[999999] flex flex-col items-center pointer-events-none"
      style={{
        left: `${leftPos}px`,
        top: `${selector.y}px`,
        transform: transformStyle,
      }}
    >
      {/* If rendering below, put arrow on top */}
      {isTooHigh && (
        <div
          className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-[#1a1a1a]"
          style={{ 
            marginBottom: '-2px',
            transform: `translateX(${arrowOffset}px)`
          }}
        />
      )}
      {/* Popover Bubble Container */}
      <div 
        id="touch-stroke-selector-bubble"
        className="flex flex-col gap-1.5 p-2 bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[4px_4px_0_#1a1a1a] pointer-events-auto select-none rounded-none max-w-[270px] min-w-[210px] items-center"
      >
        {/* Helper translation header */}
        <span className="text-[10px] font-bold border-b border-[#1a1a1a]/25 pb-1 mb-1 text-center text-[#1a1a1a] uppercase tracking-wider font-cactus w-full">
          {hoveredStroke 
            ? getStrokeDescription(selector.instId, inst.type, String(getVisualStrokeSymbol(hoveredStroke, isLeftHanded, inst.id)), lang) 
            : (lang === 'fr' ? 'Glissez ou touchez un coup' : 'Arraste ou toque num golpe')}
        </span>

        {/* Choices container */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
          {allChoices.map((stroke) => {
            const isSilence = stroke === '0';
            const strokeVal = isSilence ? '0' : stroke;
            const isHovered = hoveredStroke === strokeVal;

            const visualStroke = getVisualStrokeSymbol(stroke, isLeftHanded, inst.id);
            let bgColor = isSilence ? '#7f8c8d' : (inst.colors[visualStroke as string] || '#111');
            let textColor = isSilence ? '#fff' : (inst.colors.text || '#fff');
            if (isDarkText(inst.id, String(visualStroke))) {
              textColor = '#1a1a1a';
            }

            // Display label formatting
            let displayLabel = String(visualStroke);
            if (isSilence) {
              displayLabel = 'Ø';
            }

            const handleButtonSelect = (e: React.MouseEvent | React.TouchEvent) => {
              e.preventDefault();
              e.stopPropagation();
              selector.onSelect(strokeVal);
              onClose();
            };

            return (
              <div
                key={stroke}
                data-stroke-val={strokeVal}
                onMouseEnter={() => setHoveredStroke(strokeVal)}
                onMouseLeave={() => setHoveredStroke(null)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleButtonSelect(e);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleButtonSelect(e);
                }}
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

      {/* Popover Downward Arrow (default, when rendering above) */}
      {!isTooHigh && (
        <div
          className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#1a1a1a]"
          style={{ 
            marginTop: '-2px',
            transform: `translateX(${arrowOffset}px)`
          }}
        />
      )}
    </div>
  );
};

export const TouchStrokeSelector = React.memo(TouchStrokeSelectorComponent);

