import React from 'react';
import { RotateCcw, BookOpen, Scale, Wrench } from 'lucide-react';
import { BalancoPreset } from '../../types/balanco.types';
import { Language } from '../../types';
import { BalancoSelectedCard } from './BalancoSelectedCard';

interface BalancoModeSelectorProps {
  activeMode: 'maracatu' | 'custom';
  selectedPresetId: string;
  selectedPreset: BalancoPreset | undefined;
  presets: BalancoPreset[];
  userProfile: any;
  compact: boolean;
  isLoadingCloud: boolean;
  canManageSelectedPreset: boolean;
  lang: Language;
  onModeChange: (mode: 'maracatu' | 'custom') => void;
  onRefreshCloud: () => void;
  onOpenLibrary: () => void;
  onPresetSelect: (id: string) => void;
  onLoadToCustom: (p: BalancoPreset) => void;
  onRequestDelete: (p: BalancoPreset) => void;
}

export const BalancoModeSelector: React.FC<BalancoModeSelectorProps> = ({
  activeMode,
  selectedPresetId,
  selectedPreset,
  presets,
  userProfile,
  compact,
  isLoadingCloud,
  canManageSelectedPreset,
  lang,
  onModeChange,
  onRefreshCloud,
  onOpenLibrary,
  onPresetSelect,
  onLoadToCustom,
  onRequestDelete,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className={`font-bold uppercase ${compact ? 'text-[10px]' : 'text-xs text-[#1a1a1a]'}`}>
          {lang === 'fr' ? 'Mode de Balanço :' : 'Modo de Balanço :'}
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onModeChange('maracatu')}
            className={`px-3 py-1.5 font-cactus font-bold text-xs uppercase border-2 border-black cursor-pointer transition-colors flex-1 flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              activeMode === 'maracatu' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#d5c3b0]'
            }`}
          >
            <Scale size={13} className="shrink-0" /> Balanço
          </button>
          <button
            type="button"
            onClick={() => onModeChange('custom')}
            className={`px-3 py-1.5 font-cactus font-bold text-xs uppercase border-2 border-black cursor-pointer transition-colors flex-1 flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              activeMode === 'custom' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#d5c3b0]'
            }`}
          >
            <Wrench size={13} className="shrink-0" /> {lang === 'fr' ? 'Atelier' : 'Ateliê'}
          </button>
        </div>
      </div>

      {activeMode === 'maracatu' && (
        <div className="flex flex-col gap-2.5 bg-[#eaddcf]/40 p-3 border border-black/15 rounded-sm">
          <div className="flex items-center justify-between gap-2">
            <label className="font-bold text-[10px] uppercase text-[#1a1a1a]">
              {lang === 'fr' ? 'Sélectionner un Balanço :' : 'Selecionar um Balanço :'}
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onRefreshCloud}
                disabled={isLoadingCloud}
                className="px-2 py-0.5 bg-white border border-black text-[10px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] flex items-center gap-1 disabled:opacity-50"
              >
                <RotateCcw size={11} className={isLoadingCloud ? 'animate-spin shrink-0' : 'shrink-0'} />
              </button>
              <button
                type="button"
                onClick={onOpenLibrary}
                className="px-2 py-0.5 bg-white border border-black text-[10px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] flex items-center gap-1"
              >
                <BookOpen size={11} className="shrink-0" />
                <span>{lang === 'fr' ? 'Bibliothèque' : 'Biblioteca'} ({presets.length})</span>
              </button>
            </div>
          </div>

          <select
            value={selectedPresetId}
            onChange={(e) => onPresetSelect(e.target.value)}
            className="w-full bg-[#f4ecd8] border-2 border-black px-2 py-1.5 text-xs font-bold text-[#1a1a1a] shadow-[1.5px_1.5px_0px_#000] outline-none cursor-pointer"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.isFactory ? '★' : p.ownerId === userProfile?.uid || p.ownerId === 'local' ? (lang === 'fr' ? '[perso]' : '[pessoal]') : '[cloud]'}
              </option>
            ))}
          </select>

          {selectedPreset && (
            <BalancoSelectedCard
              selectedPreset={selectedPreset}
              canManage={canManageSelectedPreset}
              lang={lang}
              onLoadToCustom={onLoadToCustom}
              onRequestDelete={onRequestDelete}
            />
          )}
        </div>
      )}
    </div>
  );
};
