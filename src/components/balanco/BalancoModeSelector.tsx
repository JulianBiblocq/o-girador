import React from 'react';
import { RotateCcw, BookOpen, Scale, Wrench, CircleOff } from 'lucide-react';
import { BalancoPreset } from '../../types/balanco.types';
import { Language, SwingMode } from '../../types';
import { BalancoSelectedCard } from './BalancoSelectedCard';

interface BalancoModeSelectorProps {
  activeMode: SwingMode;
  selectedPresetId: string;
  selectedPreset: BalancoPreset | undefined;
  presets: BalancoPreset[];
  userProfile: any;
  compact: boolean;
  isLoadingCloud: boolean;
  canManageSelectedPreset: boolean;
  lang: Language;
  onModeChange: (mode: SwingMode) => void;
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
  const modeBtnClass = (isActive: boolean) =>
    `px-3 py-1.5 font-cactus font-bold text-xs uppercase border-2 cursor-pointer transition-colors flex-1 flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
      isActive
        ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]'
        : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-card-btn-border)] hover:bg-[var(--cordel-surface-elevated)]'
    }`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className={`font-bold uppercase text-[var(--cordel-text)] ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {lang === 'fr' ? 'Mode de Balanço Global :' : 'Modo de Balanço Global :'}
        </label>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <button type="button" onClick={() => onModeChange('maracatu')} className={modeBtnClass(activeMode === 'maracatu')}>
            <Scale size={13} className="shrink-0" /> <span>Balanço</span>
          </button>
          <button type="button" onClick={() => onModeChange('custom')} className={modeBtnClass(activeMode === 'custom')}>
            <Wrench size={13} className="shrink-0" /> <span>{lang === 'fr' ? 'Atelier' : 'Ateliê'}</span>
          </button>
          <button type="button" onClick={() => onModeChange('off')} className={modeBtnClass(activeMode === 'off')}>
            <CircleOff size={13} className="shrink-0" /> <span>{lang === 'fr' ? 'Neutre (0%)' : 'Neutro (0%)'}</span>
          </button>
        </div>
      </div>

      {activeMode === 'maracatu' && (
        <div className="flex flex-col gap-2.5 bg-[var(--cordel-surface)] p-3 border border-[var(--cordel-border)] rounded-sm text-[var(--cordel-text)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="font-bold text-[10px] uppercase text-[var(--cordel-text)]">
              {lang === 'fr' ? 'Sélectionner un Preset de Balanço :' : 'Selecionar um Preset de Balanço :'}
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onRefreshCloud}
                disabled={isLoadingCloud}
                title={lang === 'fr' ? 'Synchroniser les presets Cloud' : 'Sincronizar presets na Nuvem'}
                className="px-2 py-0.5 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-card-btn-border)] text-[10px] font-bold hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-colors cursor-pointer shadow-[1px_1px_0px_var(--cordel-shadow-color)] flex items-center gap-1 disabled:opacity-50"
              >
                <RotateCcw size={11} className={isLoadingCloud ? 'animate-spin shrink-0' : 'shrink-0'} />
              </button>
              <button
                type="button"
                onClick={onOpenLibrary}
                className="px-2 py-0.5 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-card-btn-border)] text-[10px] font-bold hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-colors cursor-pointer shadow-[1px_1px_0px_var(--cordel-shadow-color)] flex items-center gap-1"
              >
                <BookOpen size={11} className="shrink-0" />
                <span>{lang === 'fr' ? 'Bibliothèque' : 'Biblioteca'} ({presets.length})</span>
              </button>
            </div>
          </div>

          <select
            value={selectedPresetId}
            onChange={(e) => onPresetSelect(e.target.value)}
            className="w-full bg-[var(--cordel-surface-elevated)] border-2 border-[var(--cordel-border)] px-2.5 py-1.5 text-xs font-bold text-[var(--cordel-text)] shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)] outline-none cursor-pointer"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.isFactory ? '' : p.ownerId === userProfile?.uid || p.ownerId === 'local' ? (lang === 'fr' ? '[perso]' : '[pessoal]') : '[cloud]'}
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
