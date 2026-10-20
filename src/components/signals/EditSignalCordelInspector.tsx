import React from 'react';
import { CordelOptions, defaultCordelOptions } from '../../utils/cordelEffect';

interface EditSignalCordelInspectorProps {
  options: CordelOptions;
  lang: 'fr' | 'pt';
  onOptionsChange: (patch: Partial<CordelOptions>) => void;
  onReset: () => void;
}

export const EditSignalCordelInspector: React.FC<EditSignalCordelInspectorProps> = ({
  options,
  lang,
  onOptionsChange,
  onReset,
}) => {
  return (
    <div className="border-2 border-[var(--cordel-border)] p-3 bg-black/5 flex flex-col gap-2.5">
      <div className="flex justify-between items-center border-b border-[var(--cordel-border)]/20 pb-1">
        <span className="font-cactus font-bold uppercase text-[11px] tracking-wider text-[var(--cordel-wood)] flex items-center gap-1">
          📐 {lang === 'fr' ? 'Réglages de gravure Cordel' : 'Configurações de gravura Cordel'}
        </span>
        <button
          type="button"
          onClick={onReset}
          className="text-[9px] font-cactus font-bold uppercase underline hover:text-[var(--cordel-wood)] cursor-pointer"
        >
          ↺ {lang === 'fr' ? 'Réinitialiser' : 'Redefinir'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] font-cactus font-bold uppercase">
            <span>{lang === 'fr' ? 'Contraste Xilo' : 'Contraste Xilo'}</span>
            <span>{options.sobelContrast ?? 50}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={options.sobelContrast ?? 50}
            onChange={(e) => onOptionsChange({ sobelContrast: Number(e.target.value) })}
            className="w-full accent-[var(--cordel-wood)]"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] font-cactus font-bold uppercase">
            <span>{lang === 'fr' ? 'Ombres & Encre' : 'Sombras & Tinta'}</span>
            <span>{options.shadow ?? 128}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={options.shadow ?? 128}
            onChange={(e) => onOptionsChange({ shadow: Number(e.target.value) })}
            className="w-full accent-[var(--cordel-wood)]"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] font-cactus font-bold uppercase">
            <span>Zoom</span>
            <span>{options.zoom ?? 120}%</span>
          </div>
          <input
            type="range"
            min="100"
            max="200"
            value={options.zoom ?? 120}
            onChange={(e) => onOptionsChange({ zoom: Number(e.target.value) })}
            className="w-full accent-[var(--cordel-wood)]"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] font-cactus font-bold uppercase">
            <span>{lang === 'fr' ? 'Grain Bois' : 'Granulação'}</span>
            <span>{options.woodGrain ?? 10}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            value={options.woodGrain ?? 10}
            onChange={(e) => onOptionsChange({ woodGrain: Number(e.target.value) })}
            className="w-full accent-[var(--cordel-wood)]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--cordel-border)]/20 pt-1.5 mt-0.5">
        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-cactus font-bold uppercase">
          <input
            type="checkbox"
            checked={options.isMirror ?? true}
            onChange={(e) => onOptionsChange({ isMirror: e.target.checked })}
            className="accent-[var(--cordel-wood)] cursor-pointer"
          />
          ↔️ {lang === 'fr' ? 'Effet Miroir Horizontal' : 'Efeito Espelho'}
        </label>
      </div>
    </div>
  );
};
