/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Accordéon Cadrage sur les Mains Cordel (< 85 lignes).
 */

import React from 'react';
import { ChevronDown, ChevronRight, Crop, RotateCcw, FlipHorizontal, Lock } from 'lucide-react';
import { CordelOptions } from '../../../utils/cordelEffect';
import { tMobile } from '../../../i18n/mobileTranslations';

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  options: CordelOptions;
  onUpdate: (patch: Partial<CordelOptions>) => void;
  lang: 'fr' | 'pt';
}

export const MobileSignalFramingAccordion: React.FC<Props> = ({ isOpen, onToggle, options, onUpdate, lang }) => {
  const resetFraming = () => {
    onUpdate({ zoom: 120, posX: 0, posY: 0 });
  };

  return (
    <div className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-2 flex items-center justify-between bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] font-cactus font-bold text-xs uppercase cursor-pointer"
      >
        <span className="flex items-center gap-1.5 truncate">
          <Crop size={14} className="text-[#8b2a1a] shrink-0" />
          <span className="truncate">{tMobile(lang, 'framingHands')}</span>
        </span>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {isOpen && (
        <div className="p-2.5 flex flex-col gap-2.5 border-t border-[var(--cordel-border)]/30 text-[var(--cordel-text)]">
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[11px]">
              <span>{tMobile(lang, 'zoom')}</span>
              <span className="font-bold tabular-nums">{options.zoom}%</span>
            </div>
            <input
              type="range" min={50} max={180} value={options.zoom}
              onChange={(e) => onUpdate({ zoom: Number(e.target.value) })}
              className="w-full accent-[#8b2a1a]"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[11px]">
              <span>{tMobile(lang, 'positionX')}</span>
              <span className="font-bold tabular-nums">{options.posX}</span>
            </div>
            <input
              type="range" min={-100} max={100} value={options.posX}
              onChange={(e) => onUpdate({ posX: Number(e.target.value) })}
              className="w-full accent-[#8b2a1a]"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[11px]">
              <span>{tMobile(lang, 'positionY')}</span>
              <span className="font-bold tabular-nums">{options.posY}</span>
            </div>
            <input
              type="range" min={-100} max={100} value={options.posY}
              onChange={(e) => onUpdate({ posY: Number(e.target.value) })}
              className="w-full accent-[#8b2a1a]"
            />
          </div>

          {/* Bascules Miroir & Cadrage fixe */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[var(--cordel-border)]/20">
            <button
              type="button"
              onClick={() => onUpdate({ isMirror: !options.isMirror })}
              className={`py-1 px-1.5 text-[10px] font-cactus font-bold uppercase border cursor-pointer flex items-center justify-center gap-1 ${
                options.isMirror ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[var(--cordel-border)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/40'
              }`}
            >
              <FlipHorizontal size={11} />
              <span>{tMobile(lang, 'mirror')}: {options.isMirror ? 'ON' : 'OFF'}</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ lockFraming: options.lockFraming === false ? true : false })}
              className={`py-1 px-1.5 text-[10px] font-cactus font-bold uppercase border cursor-pointer flex items-center justify-center gap-1 ${
                options.lockFraming !== false ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[var(--cordel-border)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/40'
              }`}
            >
              <Lock size={11} />
              <span>{tMobile(lang, 'lockFraming')}: {options.lockFraming !== false ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div className="flex justify-end pt-0.5">
            <button
              type="button" onClick={resetFraming}
              className="px-2 py-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-border)] font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer hover:border-[#8b2a1a]"
            >
              <RotateCcw size={10} /> <span>{tMobile(lang, 'resetFilters')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
