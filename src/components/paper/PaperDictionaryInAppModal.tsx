/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Modale de consultation in-app du Dictionnaire de Rythmes (< 140 lignes).
 */
import React, { useState } from 'react';
import { X, Search, Eye, Printer } from 'lucide-react';
import { useScreenWakeLock } from '../../hooks/useScreenWakeLock';
import { getDictionaryEntries, DictionaryFamily } from '../../utils/paper/paperRhythmDictionary';
import { PaperDictionaryCardList } from './PaperDictionaryCardList';
import { exportBlankSheetToPdf } from '../../utils/paper/blankSheetPdfExport';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'fr' | 'pt';
  onPrefillFamily?: (family: string) => void;
  onSelectFamily?: (family: string) => void;
}

export const PaperDictionaryInAppModal: React.FC<Props> = ({ isOpen, onClose, lang = 'pt', onPrefillFamily, onSelectFamily }) => {
  const handleFamilySelection = onPrefillFamily || onSelectFamily;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFamily, setActiveFamily] = useState<DictionaryFamily>('bases_paradas');

  useScreenWakeLock(isOpen);

  if (!isOpen) return null;
  const isFr = lang === 'fr';

  const families: Array<{ id: DictionaryFamily; label: string }> = [
    { id: 'bases_paradas', label: isFr ? 'Bases & Paradas' : 'Bases e Paradas' },
    { id: 'luanda', label: 'Luanda' },
    { id: 'igarassu', label: 'Igarassu' },
    { id: 'ijexa', label: 'Ijexá' },
    { id: 'aruanda', label: 'Aruanda' },
    { id: 'cloud', label: isFr ? 'Cloud & Actif' : 'Nuvem & Ativo' },
    { id: 'all', label: isFr ? 'Tout voir' : 'Ver todos' },
  ];

  const entries = getDictionaryEntries(activeFamily, searchQuery);

  const handlePrintDictionaryA4 = () => {
    exportBlankSheetToPdf({
      sheetType: 'dictionary' as any,
      gridMode: '4/4',
      pupitres: ['al', 'cx', 'gg', 'ab', 'mi'],
      includeVariationLine: true,
      sectionName: activeFamily === 'all' ? 'bases_paradas' : activeFamily,
    }, lang);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-4xl max-h-[96vh] sm:max-h-[90vh] bg-[#f4ecd8] border-3 border-black shadow-[6px_6px_0px_#000] flex flex-col overflow-hidden text-[#1a1a1a]">
        
        {/* En-tête */}
        <div className="flex items-center justify-between p-2.5 sm:px-4 bg-[#8b2a1a] text-[#f4ecd8] border-b-2 border-black shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-cactus font-bold text-sm sm:text-base uppercase tracking-wider m-0">
              {isFr ? 'Dictionnaire de Rythmes In-App' : 'Dicionário de Ritmos In-App'}
            </h3>
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-black/30 border border-[#f4ecd8]/40 text-[9px] font-mono font-bold text-[#f4ecd8]">
              <Eye className="w-3 h-3 text-[#2a9d8f]" />
              <span>{isFr ? 'Écran maintenu allumé' : 'Tela sempre ativa'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintDictionaryA4}
              className="p-1 sm:px-2.5 sm:py-1 bg-white text-black border border-black font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer hover:bg-black hover:text-white"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isFr ? 'Fiche A4' : 'Folha A4'}</span>
            </button>
            <button type="button" onClick={onClose} className="p-1 text-[#f4ecd8] hover:bg-black/40 border border-[#f4ecd8]/40 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barre de recherche et onglets de familles */}
        <div className="p-2 border-b-2 border-black bg-black/5 flex flex-col gap-1.5 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isFr ? 'Rechercher un rythme, variation ou instrument...' : 'Pesquisar ritmo, variação ou naipe...'}
              className="w-full pl-7 pr-3 py-1 bg-white border border-black text-xs font-sans placeholder-gray-500"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5">
            {families.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFamily(f.id)}
                className={`px-2 py-1 text-[10px] font-cactus font-bold uppercase whitespace-nowrap border cursor-pointer ${
                  activeFamily === f.id ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black shadow-[1px_1px_0px_#000]' : 'bg-white/80 text-black border-black/40 hover:bg-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des cartes */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <PaperDictionaryCardList
            entries={entries}
            lang={lang}
            onPrefillFamily={(fam) => {
              if (handleFamilySelection) handleFamilySelection(fam);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
