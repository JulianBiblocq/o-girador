import React from 'react';
import { UndoIcon, RedoIcon } from './HeaderIcons';

interface HeaderMobileEditSectionProps {
  lang: 'pt' | 'fr';
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCloseMenu: () => void;
}

export const HeaderMobileEditSection: React.FC<HeaderMobileEditSectionProps> = ({
  lang,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCloseMenu,
}) => (
  <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-3">
    <span className="text-[10px] font-bold text-[#d99b26] uppercase tracking-wide flex items-center gap-1">
      {lang === 'pt' ? 'Edição' : 'Édition'}
    </span>
    <div className="grid grid-cols-2 gap-1.5 mt-1">
      <button
        onClick={() => {
          onUndo();
          onCloseMenu();
        }}
        disabled={!canUndo}
        className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1"
      >
        <UndoIcon className="w-4 h-4" /> {lang === 'pt' ? 'Desfazer' : 'Annuler'}
      </button>
      <button
        onClick={() => {
          onRedo();
          onCloseMenu();
        }}
        disabled={!canRedo}
        className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1"
      >
        <RedoIcon className="w-4 h-4" /> {lang === 'pt' ? 'Refazer' : 'Rétablir'}
      </button>
    </div>
  </div>
);
