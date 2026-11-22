/**
 * Accordéon Lumière & Finesse de Gravure Cordel (< 130 lignes).
 */

import React from 'react';
import { ChevronDown, ChevronRight, Sliders, RotateCcw } from 'lucide-react';
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

export const MobileSignalLightAccordion: React.FC<Props> = ({ isOpen, onToggle, options, onUpdate, lang }) => {
  const resetFilters = () => {
    onUpdate({ brightness: 0, threshold: 128, shadow: 128, sobelContrast: 55, detail: 82, woodGrain: 10, bgRemovalMode: 'none', bgTolerance: 40 });
  };
  const applyBrightness = (v: number) => onUpdate({ brightness: v });
  const applyThreshold = (v: number) => onUpdate({ threshold: v, shadow: v });
  const applyContrast = (v: number) => onUpdate({ sobelContrast: v, detail: Math.round((v / 100) * 150) });
  const applyWoodGrain = (v: number) => onUpdate({ woodGrain: v });
  const applyTolerance = (v: number) => onUpdate({ bgTolerance: v });

  return (
    <div className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-2 flex items-center justify-between bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] font-cactus font-bold text-xs uppercase cursor-pointer"
      >
        <span className="flex items-center gap-1.5 truncate">
          <Sliders size={14} className="text-[var(--cordel-accent-readable)] shrink-0" />
          <span className="truncate">{tMobile(lang, 'lightAndCarving')}</span>
        </span>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {isOpen && (
        <div className="p-2.5 flex flex-col gap-2.5 border-t border-[var(--cordel-border)]/30 text-[var(--cordel-text)]">
          <StudioRangeSlider
            surfaceTone="theme" accentVar={ACCENT_VAR} min={-50} max={50} step={1} resetValue={0}
            value={options.brightness ?? 0} ariaLabel={tMobile(lang, 'brightness')}
            labelContent={<span className="text-[11px] font-normal">{tMobile(lang, 'brightness')}</span>}
            formatValue={(v) => String(v)}
            onScrub={applyBrightness} onCommit={applyBrightness} onReset={applyBrightness}
          />

          <StudioRangeSlider
            surfaceTone="theme" accentVar={ACCENT_VAR} min={20} max={220} step={1} resetValue={128}
            value={options.threshold ?? options.shadow ?? 128} ariaLabel={tMobile(lang, 'sobelThreshold')}
            labelContent={<span className="text-[11px] font-normal">{tMobile(lang, 'sobelThreshold')}</span>}
            formatValue={(v) => String(v)}
            onScrub={applyThreshold} onCommit={applyThreshold} onReset={applyThreshold}
          />

          <StudioRangeSlider
            surfaceTone="theme" accentVar={ACCENT_VAR} min={0} max={100} step={1} resetValue={55}
            value={options.sobelContrast ?? 55} ariaLabel={tMobile(lang, 'sobelContrast')}
            labelContent={<span className="text-[11px] font-normal">{tMobile(lang, 'sobelContrast')}</span>}
            formatValue={(v) => `${v}%`}
            onScrub={applyContrast} onCommit={applyContrast} onReset={applyContrast}
          />

          <StudioRangeSlider
            surfaceTone="theme" accentVar={ACCENT_VAR} min={0} max={100} step={1} resetValue={10}
            value={options.woodGrain ?? 10} ariaLabel={tMobile(lang, 'woodgrain')}
            labelContent={<span className="text-[11px] font-normal">{tMobile(lang, 'woodgrain')}</span>}
            formatValue={(v) => `${v}%`}
            onScrub={applyWoodGrain} onCommit={applyWoodGrain} onReset={applyWoodGrain}
          />

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
                    (options.bgRemovalMode || 'none') === m ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/40'
                  }`}
                >
                  {m === 'none' ? (lang === 'fr' ? 'Aucun' : 'Nenhum') : m === 'green' ? (lang === 'fr' ? 'Vert' : 'Verde') : (lang === 'fr' ? 'Blanc' : 'Branco')}
                </button>
              ))}
            </div>
            {options.bgRemovalMode && options.bgRemovalMode !== 'none' && (
              <div className="pt-0.5">
                <StudioRangeSlider
                  surfaceTone="theme" accentVar={ACCENT_VAR} min={10} max={90} step={1} resetValue={40}
                  value={options.bgTolerance ?? 40} ariaLabel={lang === 'fr' ? 'Tolérance' : 'Tolerância'}
                  labelContent={<span className="text-[10px] font-normal">{lang === 'fr' ? 'Tolérance' : 'Tolerância'}</span>}
                  formatValue={(v) => `${v}%`}
                  onScrub={applyTolerance} onCommit={applyTolerance} onReset={applyTolerance}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-0.5">
            <button
              type="button" onClick={resetFilters}
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
