/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SavePresetProgressBarProps {
  progress: number;
  stepLabel?: string;
  lang: 'fr' | 'pt';
}

export const SavePresetProgressBar: React.FC<SavePresetProgressBarProps> = ({
  progress,
  stepLabel,
  lang,
}) => {
  return (
    <div className="flex flex-col gap-1.5 p-3 bg-black/5 border-2 border-[var(--cordel-border,#1a1a1a)] shadow-[2px_2px_0px_rgba(0,0,0,1)]">
      <div className="flex justify-between items-center text-xs font-bold">
        <span className="flex items-center gap-1.5 truncate">
          <svg className="animate-spin h-3.5 w-3.5 text-[var(--cordel-wood,#8b2a1a)] shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {stepLabel || (lang === 'fr' ? 'Sauvegarde en cours...' : 'Salvando...')}
        </span>
        <span className="font-mono text-xs font-extrabold text-[var(--cordel-wood,#8b2a1a)] ml-2 shrink-0">
          {progress}%
        </span>
      </div>

      <div className="w-full h-3 bg-stone-200 dark:bg-stone-800 border border-[var(--cordel-border,#1a1a1a)] overflow-hidden">
        <div
          className="h-full bg-[var(--cordel-wood,#8b2a1a)] transition-all duration-200 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <p className="text-[10px] text-stone-600 dark:text-stone-400 italic mt-0.5 leading-tight">
        {lang === 'fr'
          ? "Veuillez laisser l'onglet ouvert au premier plan pendant l'enregistrement."
          : 'Por favor, mantenha esta aba aberta em primeiro plano durante a gravação.'}
      </p>
    </div>
  );
};
