/**
 * Barre de recherche et filtres pour la bibliothèque de Balanços (< 55 lignes).
 */

import React from 'react';
import { User, Users, Star } from 'lucide-react';
import { Language } from '../../types';


interface Props {
  librarySearch: string;
  setLibrarySearch: (v: string) => void;
  libraryFilter: 'all' | 'factory' | 'my' | 'group';
  setLibraryFilter: (v: 'all' | 'factory' | 'my' | 'group') => void;
  hasGroup: boolean;
  totalCount: number;
  factoryCount: number;
  myCount: number;
  groupCount: number;
  lang: Language;
}

export const BalancoLibraryFilterBar: React.FC<Props> = ({
  librarySearch, setLibrarySearch, libraryFilter, setLibraryFilter,
  hasGroup, totalCount, factoryCount, myCount, groupCount, lang,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={librarySearch}
        onChange={(e) => setLibrarySearch(e.target.value)}
        placeholder={lang === 'fr' ? 'Rechercher un balanço, auteur...' : 'Buscar balanço, autor...'}
        className="w-full bg-white border border-black px-2.5 py-1.5 text-xs font-bold text-[#1a1a1a] outline-none shadow-[1px_1px_0px_#000]"
      />
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {(['all', 'factory', 'my', ...(hasGroup ? ['group'] : [])] as const).map((filterKey) => (
          <button
            key={filterKey}
            type="button"
            onClick={() => setLibraryFilter(filterKey as any)}
            className={`px-2.5 py-1 text-[10px] font-bold border border-black cursor-pointer shadow-[1px_1px_0px_#000] whitespace-nowrap transition-colors inline-flex items-center gap-1 ${
              libraryFilter === filterKey ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white text-[#1a1a1a] hover:bg-[#eaddcf]'
            }`}
          >
            {filterKey === 'all' && `${lang === 'fr' ? 'Tous' : 'Todos'} (${totalCount})`}
            {filterKey === 'factory' && (<><Star size={11} className="shrink-0" /> {lang === 'fr' ? 'Usine' : 'Fábrica'} ({factoryCount})</>)}

            {filterKey === 'my' && (<><User size={11} className="shrink-0" /> {lang === 'fr' ? 'Mes Balanços' : 'Meus Balanços'} ({myCount})</>)}
            {filterKey === 'group' && (<><Users size={11} className="shrink-0" /> {lang === 'fr' ? 'Mon Groupe' : 'Meu Grupo'} ({groupCount})</>)}
          </button>
        ))}
      </div>
    </div>
  );
};
