import React from 'react';
import { Scissors, Link as LinkIcon } from 'lucide-react';
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
  const forcedStrokes = useSequencerSettingsStore((state) => state.forcedStrokes);
  const setStrokeForcedState = useSequencerSettingsStore((state) => state.setStrokeForcedState);

  const handleButtonSelect = (e: React.MouseEvent | React.TouchEvent, strokeVal: string, isSilence: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSilence) {
      selector.onSelect(strokeVal);
      onClose();
      return;
    }

    const forced = forcedStrokes?.[`${selector.trackId}:${strokeVal}`];
    const isActive = forced !== undefined ? forced : activeStrokes.some((s) => s.toLowerCase() === strokeVal.toLowerCase());
    if (!isActive) {
      setStrokeForcedState(`${selector.trackId}:${strokeVal}`, true);
    }
    if (audioEngine && !audioEngine.isStrokeLoaded(inst.id, strokeVal)) {
      void audioEngine.loadStrokeSamples(inst.id, strokeVal).catch(() => {});
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
        const visualStroke = getVisualStrokeSymbol(stroke, isLeftHanded, inst.id);
        const bgColor = isSilence ? 'var(--cordel-surface-elevated)' : (inst.colors[visualStroke as string] || 'var(--cordel-ink-dark)');
        let textColor = isSilence ? 'var(--cordel-text)' : (inst.colors.text || 'var(--cordel-on-accent)');
        if (!isSilence && isDarkText(inst.id, String(visualStroke))) textColor = 'var(--cordel-ink-dark)';

        return (
          <div
            key={stroke}
            data-stroke-val={strokeVal}
            onMouseEnter={() => setHoveredStroke(strokeVal)}
            onMouseLeave={() => setHoveredStroke(null)}
            onMouseDown={(e) => handleButtonSelect(e, strokeVal, isSilence)}
            onTouchStart={(e) => handleButtonSelect(e, strokeVal, isSilence)}
            className={`w-11 h-11 flex items-center justify-center font-bold text-sm cursor-pointer transition-all border-2 ${
              isHovered ? 'border-[var(--cordel-gold)] scale-110 z-10' : 'border-[var(--cordel-border-strong)]'
            }`}
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            <span className="pointer-events-none">{isSilence ? 'Ø' : String(visualStroke)}</span>
          </div>
        );
      })}

      {allChoices.length > choicesToShow.length && !isExpanded && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(true); }}
          className="w-11 h-11 flex items-center justify-center font-cactus font-black text-lg border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-all cursor-pointer select-none"
          title={lang === 'fr' ? 'Déplier' : 'Expandir'}
        >
          +
        </button>
      )}

      {selector.isSplit ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault(); e.stopPropagation();
            const mergedVal = Array.isArray(selector.currentVal) ? selector.currentVal[0] : String(selector.currentVal);
            selector.onSelect(mergedVal, true);
            onClose();
          }}
          className="w-11 h-11 flex items-center justify-center border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] hover:bg-[var(--cordel-accent)] transition-all cursor-pointer select-none"
          title={lang === 'fr' ? 'Recoller en croche' : 'Juntar em colcheia'}
        >
          <LinkIcon size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault(); e.stopPropagation();
            selector.onSelect([allChoices[0], allChoices[0]]);
            onClose();
          }}
          className="w-11 h-11 flex items-center justify-center border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-gold)] text-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] hover:brightness-110 transition-all cursor-pointer select-none"
          title={lang === 'fr' ? 'Diviser en doubles croches' : 'Dividir em semicolcheias'}
        >
          <Scissors size={18} />
        </button>
      )}
    </div>
  );
});

TouchStrokeChoices.displayName = 'TouchStrokeChoices';
