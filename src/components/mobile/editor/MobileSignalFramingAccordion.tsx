/**
 * Accordéon Cadrage sur les Mains Cordel (< 110 lignes).
 */

import React from 'react';
import { ChevronDown, ChevronRight, Crop, RotateCcw, FlipHorizontal, Lock } from 'lucide-react';
import { CordelOptions } from '../../../utils/cordelEffect';
import { tMobile } from '../../../i18n/mobileTranslations';
import { StudioRangeSlider } from '../../ui/StudioRangeSlider';

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  options: CordelOptions;
  onUpdate: (patch: Partial<CordelOptions>) => void;
  lang: 'fr' | 'pt';
}

const ACCENT_VAR = 'var(--cordel-accent-readable)';

export const MobileSignalFramingAccordion: React.FC<Props> = ({ isOpen, onToggle, options, onUpdate, lang }) => {
  const resetFraming = () => {
    onUpdate({ zoom: 120, posX: 0, posY: 0 });
  };
  const applyZoom = (v: number) => onUpdate({ zoom: v });
  const applyPosX = (v: number) => onUpdate({ posX: v });
  const applyPosY = (v: number) => onUpdate({ posY: v });

  return (
    <div className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-2 flex items-center justify-between bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] font-cactus font-bold text-xs uppercase cursor-pointer"
      >
        <span className="flex items-center gap-1.5 truncate">
          <Crop size={14} className="text-[var(--cordel-accent-readable)] shrink-0" />
          <span className="truncate">{tMobile(lang, 'framingHands')}</span>
        </span>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {isOpen && (
        <div className="p-2.5 flex flex-col gap-2.5 border-t border-[var(--cordel-border)]/30 text-[var(--cordel-text)]">
          <StudioRangeSlider
            surfaceTone="theme" accentVar={ACCENT_VAR} min={50} max={300} step={1} resetValue={120}
            value={options.zoom} ariaLabel={tMobile(lang, 'zoom')}
            labelContent={<span className="text-[11px] font-normal">{tMobile(lang, 'zoom')}</span>}
            formatValue={(v) => `${v}%`}
            onScrub={applyZoom} onCommit={applyZoom} onReset={applyZoom}
          />

          <StudioRangeSlider
            surfaceTone="theme" accentVar={ACCENT_VAR} min={-100} max={100} step={1} resetValue={0}
            value={options.posX} ariaLabel={tMobile(lang, 'positionX')}
            labelContent={<span className="text-[11px] font-normal">{tMobile(lang, 'positionX')}</span>}
            formatValue={(v) => String(v)}
            onScrub={applyPosX} onCommit={applyPosX} onReset={applyPosX}
          />

          <StudioRangeSlider
            surfaceTone="theme" accentVar={ACCENT_VAR} min={-100} max={100} step={1} resetValue={0}
            value={options.posY} ariaLabel={tMobile(lang, 'positionY')}
            labelContent={<span className="text-[11px] font-normal">{tMobile(lang, 'positionY')}</span>}
            formatValue={(v) => String(v)}
            onScrub={applyPosY} onCommit={applyPosY} onReset={applyPosY}
          />

          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[var(--cordel-border)]/20">
            <button
              type="button"
              onClick={() => onUpdate({ isMirror: !options.isMirror })}
              className={`py-1 px-1.5 text-[10px] font-cactus font-bold uppercase border cursor-pointer flex items-center justify-center gap-1 ${
                options.isMirror ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/40'
              }`}
            >
              <FlipHorizontal size={11} />
              <span>{tMobile(lang, 'mirror')}: {options.isMirror ? 'ON' : 'OFF'}</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ lockFraming: options.lockFraming === false ? true : false })}
              className={`py-1 px-1.5 text-[10px] font-cactus font-bold uppercase border cursor-pointer flex items-center justify-center gap-1 ${
                options.lockFraming !== false ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/40'
              }`}
            >
              <Lock size={11} />
              <span>{tMobile(lang, 'lockFraming')}: {options.lockFraming !== false ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div className="flex justify-end pt-0.5">
            <button
              type="button" onClick={resetFraming}
              className="px-2 py-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-border)] font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer hover:border-[var(--cordel-accent-readable)]"
            >
              <RotateCcw size={10} /> <span>{tMobile(lang, 'resetFilters')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
