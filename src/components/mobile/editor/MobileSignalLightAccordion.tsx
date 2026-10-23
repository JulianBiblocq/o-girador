/**
 * Accordéon Lumière & Finesse de Gravure Cordel (< 90 lignes).
 */

import React from 'react';
import { ChevronDown, ChevronRight, Sliders, RotateCcw } from 'lucide-react';
import { CordelOptions } from '../../../utils/cordelEffect';
import { tMobile } from '../../../i18n/mobileTranslations';

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  options: CordelOptions;
  onUpdate: (patch: Partial<CordelOptions>) => void;
  lang: 'fr' | 'pt';
}

export const MobileSignalLightAccordion: React.FC<Props> = ({ isOpen, onToggle, options, onUpdate, lang }) => {
  const resetFilters = () => {
    onUpdate({ brightness: 0, threshold: 128, shadow: 128, sobelContrast: 55, detail: 82, woodGrain: 10, bgRemovalMode: 'none', bgTolerance: 40 });
  };

  return (
    <div className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-2 flex items-center justify-between bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] font-cactus font-bold text-xs uppercase cursor-pointer"
      >
        <span className="flex items-center gap-1.5 truncate">
          <Sliders size={14} className="text-[#8b2a1a] shrink-0" />
          <span className="truncate">{tMobile(lang, 'lightAndCarving')}</span>
        </span>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {isOpen && (
        <div className="p-2.5 flex flex-col gap-2.5 border-t border-[var(--cordel-border)]/30 text-[var(--cordel-text)]">
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[11px]">
              <span>{tMobile(lang, 'brightness')}</span>
              <span className="font-bold tabular-nums">{options.brightness ?? 0}</span>
            </div>
            <input
              type="range" min={-50} max={50} value={options.brightness ?? 0}
              onChange={(e) => onUpdate({ brightness: Number(e.target.value) })}
              className="w-full accent-[#8b2a1a]"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[11px]">
              <span>{tMobile(lang, 'sobelThreshold')}</span>
              <span className="font-bold tabular-nums">{options.threshold ?? options.shadow ?? 128}</span>
            </div>
            <input
              type="range" min={20} max={220} value={options.threshold ?? options.shadow ?? 128}
              onChange={(e) => { const v = Number(e.target.value); onUpdate({ threshold: v, shadow: v }); }}
              className="w-full accent-[#8b2a1a]"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[11px]">
              <span>{tMobile(lang, 'sobelContrast')}</span>
              <span className="font-bold tabular-nums">{options.sobelContrast ?? 55}%</span>
            </div>
            <input
              type="range" min={0} max={100} value={options.sobelContrast ?? 55}
              onChange={(e) => { const v = Number(e.target.value); onUpdate({ sobelContrast: v, detail: Math.round((v / 100) * 150) }); }}
              className="w-full accent-[#8b2a1a]"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[11px]">
              <span>{tMobile(lang, 'woodgrain')}</span>
              <span className="font-bold tabular-nums">{options.woodGrain ?? 10}%</span>
            </div>
            <input
              type="range" min={0} max={100} value={options.woodGrain ?? 10}
              onChange={(e) => onUpdate({ woodGrain: Number(e.target.value) })}
              className="w-full accent-[#8b2a1a]"
            />
          </div>

          {/* Détourage fond */}
          <div className="flex flex-col gap-1 pt-1 border-t border-[var(--cordel-border)]/20">
            <div className="flex justify-between text-[11px]">
              <span>{lang === 'fr' ? 'Détourage fond' : 'Recorte fundo'}</span>
              <span className="font-bold uppercase text-[9px]">
                {options.bgRemovalMode === 'green' ? (lang === 'fr' ? 'Vert' : 'Verde') : options.bgRemovalMode === 'white' ? (lang === 'fr' ? 'Blanc' : 'Branco') : (lang === 'fr' ? 'Aucun' : 'Nenhum')}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(['none', 'green', 'white'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onUpdate({ bgRemovalMode: m })}
                  className={`py-0.5 text-[9px] font-cactus font-bold uppercase border cursor-pointer ${
                    (options.bgRemovalMode || 'none') === m ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[var(--cordel-border)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/40'
                  }`}
                >
                  {m === 'none' ? (lang === 'fr' ? 'Aucun' : 'Nenhum') : m === 'green' ? (lang === 'fr' ? 'Vert' : 'Verde') : (lang === 'fr' ? 'Blanc' : 'Branco')}
                </button>
              ))}
            </div>
            {options.bgRemovalMode && options.bgRemovalMode !== 'none' && (
              <div className="flex flex-col gap-0.5 pt-0.5">
                <div className="flex justify-between text-[10px]">
                  <span>{lang === 'fr' ? 'Tolérance' : 'Tolerância'}</span>
                  <span className="font-bold tabular-nums">{options.bgTolerance ?? 40}%</span>
                </div>
                <input
                  type="range" min={10} max={90} value={options.bgTolerance ?? 40}
                  onChange={(e) => onUpdate({ bgTolerance: Number(e.target.value) })}
                  className="w-full accent-[#8b2a1a]"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-0.5">
            <button
              type="button" onClick={resetFilters}
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
