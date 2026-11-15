import React, { useState } from 'react';
import { Sliders, Globe, Target, RotateCcw, Loader2 } from 'lucide-react';
import { CordelOptions } from '../../../utils/cordelEffect';
import { MobileSignalLightAccordion } from '../../mobile/editor/MobileSignalLightAccordion';
import { MobileSignalFramingAccordion } from '../../mobile/editor/MobileSignalFramingAccordion';
import { PhotoLabPresetsBar } from '../../mobile/editor/PhotoLabPresetsBar';

interface PhotoBoothControlsSidebarProps {
  overrideMode: 'global' | 'local';
  selectedFrameIndex: number;
  options: CordelOptions;
  hasLocalOverride: boolean;
  isReprocessing: boolean;
  lang: 'fr' | 'pt';
  setOverrideMode: (mode: 'global' | 'local') => void;
  onUpdateOption: (patch: Partial<CordelOptions>) => void;
  onResetLocalOverride: () => void;
}

export const PhotoBoothControlsSidebar: React.FC<PhotoBoothControlsSidebarProps> = ({
  overrideMode,
  selectedFrameIndex,
  options,
  hasLocalOverride,
  isReprocessing,
  lang,
  setOverrideMode,
  onUpdateOption,
  onResetLocalOverride,
}) => {
  const [openSection, setOpenSection] = useState<'light' | 'framing' | null>('light');

  return (
    <div className="flex flex-col gap-2 bg-[var(--cordel-surface)] text-[var(--cordel-text)] p-2.5 border border-[var(--cordel-border)] rounded-sm text-xs">
      <div className="flex items-center justify-between border-b border-[var(--cordel-border)]/35 pb-1">
        <span className="font-cactus font-bold uppercase text-xs flex items-center gap-1.5 text-[var(--cordel-accent-readable)]">
          <Sliders size={13} />
          <span>{lang === 'fr' ? 'Réglages Gravure' : 'Ajustes Gravura'}</span>
        </span>
        {isReprocessing && (
          <span className="text-[10px] text-[var(--cordel-accent-readable)] font-bold flex items-center gap-1 animate-pulse">
            <Loader2 size={11} className="animate-spin" />
            <span>...</span>
          </span>
        )}
      </div>

      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setOverrideMode('global')}
          className={`flex-1 py-1 font-cactus font-bold text-[10px] uppercase border border-[var(--cordel-border-strong)] cursor-pointer shadow-[1px_1px_0px_var(--cordel-shadow-color)] flex items-center justify-center gap-1 transition-colors ${
            overrideMode === 'global'
              ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
              : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]'
          }`}
        >
          <Globe size={11} />
          <span>{lang === 'fr' ? 'Global (Tout)' : 'Global (Tudo)'}</span>
        </button>
        <button
          type="button"
          onClick={() => setOverrideMode('local')}
          className={`flex-1 py-1 font-cactus font-bold text-[10px] uppercase border border-[var(--cordel-border-strong)] cursor-pointer shadow-[1px_1px_0px_var(--cordel-shadow-color)] flex items-center justify-center gap-1 transition-colors ${
            overrideMode === 'local'
              ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
              : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]'
          }`}
        >
          <Target size={11} />
          <span>{lang === 'fr' ? `Trame ${selectedFrameIndex + 1}` : `Quadro ${selectedFrameIndex + 1}`}</span>
        </button>
      </div>

      {overrideMode === 'local' && hasLocalOverride && (
        <button
          type="button"
          onClick={onResetLocalOverride}
          className="w-full py-0.5 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border-strong)] text-[9px] font-bold hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-colors cursor-pointer flex items-center justify-center gap-1"
        >
          <RotateCcw size={10} />
          <span>{lang === 'fr' ? 'Réaligner sur les réglages globaux' : 'Reverter para global'}</span>
        </button>
      )}

      <div className="flex flex-col gap-1.5">
        <PhotoLabPresetsBar
          currentOptions={options}
          onApplyOptions={(newOpts) => onUpdateOption(newOpts)}
          lang={lang}
        />
        <MobileSignalLightAccordion
          isOpen={openSection === 'light'}
          onToggle={() => setOpenSection((p) => (p === 'light' ? null : 'light'))}
          options={options}
          onUpdate={onUpdateOption}
          lang={lang}
        />
        <MobileSignalFramingAccordion
          isOpen={openSection === 'framing'}
          onToggle={() => setOpenSection((p) => (p === 'framing' ? null : 'framing'))}
          options={options}
          onUpdate={onUpdateOption}
          lang={lang}
        />
      </div>
    </div>
  );
};
