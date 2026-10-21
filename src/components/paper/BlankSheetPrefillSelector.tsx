/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Sélecteur de pré-remplissage des fiches vierges par famille de rythmes (< 70 lignes).
 */
import React from 'react';

interface Props {
  selectedFamily: string;
  onSelectFamily: (family: string) => void;
  lang: 'fr' | 'pt';
}

export const BlankSheetPrefillSelector: React.FC<Props> = ({ selectedFamily, onSelectFamily, lang }) => {
  const isFr = lang === 'fr';

  const families = [
    { id: '', label: isFr ? 'Vierge (Vide)' : 'Livre (Vazio)' },
    { id: 'bases_paradas', label: isFr ? 'Bases & Paradas' : 'Bases e Paradas' },
    { id: 'luanda', label: 'Luanda' },
    { id: 'igarassu', label: 'Igarassu' },
    { id: 'ijexa', label: 'Ijexá' },
    { id: 'aruanda', label: 'Aruanda' },
  ];

  return (
    <div className="flex flex-col gap-1 p-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)]">
      <div className="flex items-center justify-between">
        <label className="font-cactus font-bold uppercase text-[10.5px] text-[#8b2a1a]">
          {isFr ? 'Pré-remplir la grille avec :' : 'Preencher a grelha com:'}
        </label>
        <span className="text-[9px] text-[var(--cordel-text-muted)] italic font-mono">
          {isFr ? '+ 2 lignes vierges manuscrites' : '+ 2 linhas livres'}
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
        {families.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelectFamily(f.id)}
            className={`py-1 px-1 text-[9.5px] font-cactus font-bold truncate border cursor-pointer transition-colors ${
              selectedFamily === f.id
                ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[var(--cordel-border)] shadow-[1px_1px_0px_#000]'
                : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/40 hover:bg-black/5'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
};
