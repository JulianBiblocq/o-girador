import React, { useState } from 'react';
import { Sliders, Globe, Target, RotateCcw, Loader2 } from 'lucide-react';
import { CordelOptions } from '../../../utils/cordelEffect';
import { MobileSignalLightAccordion } from '../../mobile/editor/MobileSignalLightAccordion';
import { MobileSignalFramingAccordion } from '../../mobile/editor/MobileSignalFramingAccordion';
import { PhotoLabPresetsBar } from '../../mobile/editor/PhotoLabPresetsBar';
import { tMobile } from '../../../i18n/mobileTranslations';

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
    <div className="flex flex-col gap-2 bg-[#eaddcf]/50 p-2.5 border border-black/15 rounded-sm text-xs">
      {/* En-tête */}
      <div className="flex items-center justify-between border-b border-black/15 pb-1">
        <span className="font-cactus font-bold uppercase text-xs flex items-center gap-1.5 text-[#8b2a1a]">
          <Sliders size={13} />
          <span>{lang === 'fr' ? 'Réglages Gravure' : 'Ajustes Gravura'}</span>
        </span>
        {isReprocessing && (
          <span className="text-[10px] text-[#8b2a1a] font-bold flex items-center gap-1 animate-pulse">
            <Loader2 size={11} className="animate-spin" />
            <span>...</span>
          </span>
        )}
      </div>

      {/* Bascule Global / Trame locale */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setOverrideMode('global')}
          className={`flex-1 py-1 font-cactus font-bold text-[10px] uppercase border border-black cursor-pointer shadow-[1px_1px_0px_#000] flex items-center justify-center gap-1 ${
            overrideMode === 'global' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white text-black hover:bg-black/5'
          }`}
        >
          <Globe size={11} />
          <span>{lang === 'fr' ? 'Global (Tout)' : 'Global (Tudo)'}</span>
        </button>
        <button
          type="button"
          onClick={() => setOverrideMode('local')}
          className={`flex-1 py-1 font-cactus font-bold text-[10px] uppercase border border-black cursor-pointer shadow-[1px_1px_0px_#000] flex items-center justify-center gap-1 ${
            overrideMode === 'local' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white text-black hover:bg-black/5'
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
          className="w-full py-0.5 bg-white border border-black text-[9px] font-bold hover:bg-[#8b2a1a] hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1"
        >
          <RotateCcw size={10} />
          <span>{lang === 'fr' ? 'Réaligner sur les réglages globaux' : 'Reverter para global'}</span>
        </button>
      )}

      {/* Accordéons complets haute qualité */}
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

