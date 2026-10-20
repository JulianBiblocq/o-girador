import React from 'react';
import { CordelOptions } from '../../../utils/cordelEffect';

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
  return (
    <div className="flex flex-col gap-2.5 bg-[#eaddcf]/50 p-3 border border-black/15 rounded-sm text-xs">
      <div className="flex items-center justify-between border-b border-black/15 pb-1.5">
        <span className="font-cactus font-bold uppercase text-xs">
          🎛️ {lang === 'fr' ? 'Réglages Photo-Gravure' : 'Ajustes Foto-Gravura'}
        </span>
        {isReprocessing && <span className="text-[10px] text-[#8b2a1a] font-bold animate-pulse">⚙️ ...</span>}
      </div>

      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setOverrideMode('global')}
          className={`flex-1 py-1 font-cactus font-bold text-[10px] uppercase border border-black cursor-pointer shadow-[1px_1px_0px_#000] ${
            overrideMode === 'global' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white text-black'
          }`}
        >
          🌐 {lang === 'fr' ? 'Global (Tout)' : 'Global (Tudo)'}
        </button>
        <button
          type="button"
          onClick={() => setOverrideMode('local')}
          className={`flex-1 py-1 font-cactus font-bold text-[10px] uppercase border border-black cursor-pointer shadow-[1px_1px_0px_#000] ${
            overrideMode === 'local' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white text-black'
          }`}
        >
          🎯 {lang === 'fr' ? `Trame ${selectedFrameIndex + 1}` : `Quadro ${selectedFrameIndex + 1}`}
        </button>
      </div>

      {overrideMode === 'local' && hasLocalOverride && (
        <button
          type="button"
          onClick={onResetLocalOverride}
          className="w-full py-0.5 bg-white border border-black text-[9px] font-bold hover:bg-[#8b2a1a] hover:text-white transition-colors cursor-pointer"
        >
          ↺ {lang === 'fr' ? 'Réaligner sur les réglages globaux' : 'Reverter para global'}
        </button>
      )}

      {/* Sliders Cordel */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] font-bold">
            <span>{lang === 'fr' ? 'Contraste Xilo' : 'Contraste Xilo'}</span>
            <span>{options.sobelContrast ?? 50}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={options.sobelContrast ?? 50}
            onChange={(e) => onUpdateOption({ sobelContrast: Number(e.target.value) })}
            className="w-full accent-[#8b2a1a]"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] font-bold">
            <span>{lang === 'fr' ? 'Ombres & Encrage' : 'Sombras & Tinta'}</span>
            <span>{options.shadow ?? 128}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={options.shadow ?? 128}
            onChange={(e) => onUpdateOption({ shadow: Number(e.target.value) })}
            className="w-full accent-[#8b2a1a]"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] font-bold">
            <span>{lang === 'fr' ? 'Grain Bois Cordel' : 'Granulação Madeira'}</span>
            <span>{options.woodGrain ?? 10}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            value={options.woodGrain ?? 10}
            onChange={(e) => onUpdateOption({ woodGrain: Number(e.target.value) })}
            className="w-full accent-[#8b2a1a]"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] font-bold">
            <span>Zoom</span>
            <span>{options.zoom ?? 120}%</span>
          </div>
          <input
            type="range"
            min="100"
            max="200"
            value={options.zoom ?? 120}
            onChange={(e) => onUpdateOption({ zoom: Number(e.target.value) })}
            className="w-full accent-[#8b2a1a]"
          />
        </div>
      </div>
    </div>
  );
};
