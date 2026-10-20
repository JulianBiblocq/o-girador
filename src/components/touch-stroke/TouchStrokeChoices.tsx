/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { isDarkText, getVisualStrokeSymbol } from '../../data';
import { audioEngine } from '../../hooks/useAudioSync';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { TouchSelectorState } from './touchStrokeTypes';

interface TouchStrokeChoicesProps {
  selector: TouchSelectorState;
  inst: any;
  isLeftHanded: boolean;
  choicesToShow: string[];
  allChoices: string[];
  activeStrokes: string[];
  hoveredStroke: string | null;
  setHoveredStroke: (val: string | null) => void;
  isExpanded: boolean;
  setIsExpanded: (val: boolean) => void;
  lang: string;
  onClose: () => void;
}

export const TouchStrokeChoices: React.FC<TouchStrokeChoicesProps> = React.memo(({
  selector, inst, isLeftHanded, choicesToShow, allChoices, activeStrokes,
  hoveredStroke, setHoveredStroke, isExpanded, setIsExpanded, lang, onClose,
}) => {
  const [loadingStroke, setLoadingStroke] = useState<string | null>(null);
  const forcedStrokes = useSequencerSettingsStore((state) => state.forcedStrokes) || {};
  const setStrokeForcedState = useSequencerSettingsStore((state) => state.setStrokeForcedState);

  const handleButtonSelect = async (e: React.MouseEvent | React.TouchEvent, strokeVal: string, isSilence: boolean) => {
    e.preventDefault(); e.stopPropagation();
    if (loadingStroke) return;
    if (isSilence) { selector.onSelect(strokeVal); onClose(); return; }

    const forced = forcedStrokes[`${selector.trackId}:${strokeVal}`];
    const isActive = forced !== undefined ? forced : activeStrokes.some((s) => s.toLowerCase() === strokeVal.toLowerCase());
    const isLoaded = audioEngine && audioEngine.isStrokeLoaded(inst.id, strokeVal);

    if (!isLoaded && audioEngine) {
      setLoadingStroke(strokeVal);
      try {
        await audioEngine.loadStrokeSamples(inst.id, strokeVal);
        setStrokeForcedState(`${selector.trackId}:${strokeVal}`, true);
      } catch (err) {
        console.error('Failed to load stroke sample:', err);
      } finally {
        setLoadingStroke(null);
      }
    } else if (!isActive) {
      setStrokeForcedState(`${selector.trackId}:${strokeVal}`, true);
    }

    selector.onSelect(strokeVal);
    if (!isActive) setIsExpanded(false);
    else onClose();
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
      {choicesToShow.map((stroke) => {
        const isSilence = stroke === '0';
        const strokeVal = isSilence ? '0' : stroke;
        const isHovered = hoveredStroke === strokeVal;
        const isLoaded = isSilence || (audioEngine && audioEngine.isStrokeLoaded(inst.id, stroke));
        const visualStroke = getVisualStrokeSymbol(stroke, isLeftHanded, inst.id);
        const bgColor = isSilence ? '#7f8c8d' : (inst.colors[visualStroke as string] || '#111');
        let textColor = isSilence ? '#fff' : (inst.colors.text || '#fff');
        if (isDarkText(inst.id, String(visualStroke))) textColor = '#1a1a1a';

        return (
          <div
            key={stroke}
            data-stroke-val={strokeVal}
            onMouseEnter={() => setHoveredStroke(strokeVal)}
            onMouseLeave={() => setHoveredStroke(null)}
            onMouseDown={(e) => handleButtonSelect(e, strokeVal, isSilence)}
            onTouchStart={(e) => handleButtonSelect(e, strokeVal, isSilence)}
            className={`w-11 h-11 flex items-center justify-center font-bold text-sm cursor-pointer transition-all border-2 ${
              isHovered ? 'border-[#f1c40f] scale-110 shadow-[0_0_8px_#f1c40f] z-10' : 'border-[#1a1a1a]'
            } ${!isLoaded ? 'opacity-40 grayscale border-dashed shadow-none hover:opacity-75 hover:grayscale-0' : ''}`}
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            {loadingStroke === strokeVal ? <span className="animate-spin text-[10px] pointer-events-none">⏳</span> : <span className="pointer-events-none">{isSilence ? 'Ø' : String(visualStroke)}</span>}
          </div>
        );
      })}

      {allChoices.length > choicesToShow.length && !isExpanded && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(true); }}
          className="w-11 h-11 flex items-center justify-center font-cactus font-black text-lg border-2 border-[#1a1a1a] bg-[#f4ecd8] text-black shadow-[2px_2px_0px_#1a1a1a] hover:bg-black hover:text-[#f4ecd8] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer select-none"
          title={lang === 'fr' ? 'Déplier' : 'Expandir'}
        >
          +
        </button>
      )}

      {selector.isSplit ? (
        <button
          onClick={(e) => {
            e.preventDefault(); e.stopPropagation();
            const mergedVal = Array.isArray(selector.currentVal) ? selector.currentVal[0] : String(selector.currentVal);
            selector.onSelect(mergedVal, true);
            onClose();
          }}
          className="w-11 h-11 flex items-center justify-center font-cactus font-black text-lg border-2 border-[#1a1a1a] bg-[#3498db] text-white shadow-[2px_2px_0px_#1a1a1a] hover:bg-black hover:text-[#3498db] transition-all cursor-pointer select-none"
          title={lang === 'fr' ? 'Recoller en croche' : 'Juntar em colcheia'}
        >
          💧
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.preventDefault(); e.stopPropagation();
            selector.onSelect([allChoices[0], allChoices[0]]);
            onClose();
          }}
          className="w-11 h-11 flex items-center justify-center font-cactus font-black text-lg border-2 border-[#1a1a1a] bg-[#f1c40f] text-black shadow-[2px_2px_0px_#1a1a1a] hover:bg-black hover:text-[#f1c40f] transition-all cursor-pointer select-none"
          title={lang === 'fr' ? 'Diviser en doubles croches' : 'Dividir em semicolcheias'}
        >
          ✂️
        </button>
      )}
    </div>
  );
});

TouchStrokeChoices.displayName = 'TouchStrokeChoices';
