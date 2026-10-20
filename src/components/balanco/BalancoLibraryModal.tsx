import React, { useState, useMemo } from 'react';
import { BalancoPreset } from '../../types/balanco.types';
import { Language } from '../../types';
import { BalancoLibraryCard } from './BalancoLibraryCard';
import { canManagePreset } from './balancoHelpers';

interface BalancoLibraryModalProps {
  isOpen: boolean;
  presets: BalancoPreset[];
  selectedPresetId: string;
  userProfile: any;
  isLoadingCloud: boolean;
  lang: Language;
  onClose: () => void;
  onSelectPreset: (id: string) => void;
  onLoadToCustom: (p: BalancoPreset) => void;
  onRequestDelete: (p: BalancoPreset) => void;
  onRefreshCloud: () => void;
}

export const BalancoLibraryModal: React.FC<BalancoLibraryModalProps> = ({
  isOpen,
  presets,
  selectedPresetId,
  userProfile,
  isLoadingCloud,
  lang,
  onClose,
  onSelectPreset,
  onLoadToCustom,
  onRequestDelete,
  onRefreshCloud,
}) => {
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'factory' | 'my' | 'group'>('all');
  const [librarySearch, setLibrarySearch] = useState<string>('');

  const filteredPresets = useMemo(() => {
    return presets.filter((p) => {
      if (libraryFilter === 'factory' && !p.isFactory) return false;
      if (libraryFilter === 'my') {
        const isMy = p.ownerId === 'local' || (userProfile?.uid && p.ownerId === userProfile.uid);
        if (!isMy) return false;
      }
      if (libraryFilter === 'group') {
        if (!userProfile?.groupId || !p.groupId) return false;
        if (String(p.groupId).toLowerCase() !== String(userProfile.groupId).toLowerCase()) return false;
      }
      if (librarySearch.trim()) {
        const term = librarySearch.toLowerCase().trim();
        return p.name.toLowerCase().includes(term) || Boolean(p.authorName?.toLowerCase().includes(term));
      }
      return true;
    });
  }, [presets, libraryFilter, librarySearch, userProfile]);

  const factoryCount = useMemo(() => presets.filter((p) => p.isFactory).length, [presets]);
  const myCount = useMemo(() => presets.filter((p) => p.ownerId === 'local' || (userProfile?.uid && p.ownerId === userProfile.uid)).length, [presets, userProfile]);
  const groupCount = useMemo(() => userProfile?.groupId ? presets.filter((p) => p.groupId && String(p.groupId).toLowerCase() === String(userProfile.groupId).toLowerCase()).length : 0, [presets, userProfile]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4 select-none" onClick={onClose}>
      <div className="bg-[#f4ecd8] border-[3px] border-[#1a1a1a] p-4 sm:p-5 max-w-xl w-full max-h-[85vh] rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-3 text-[#1a1a1a]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <div>
              <h4 className="font-cactus text-xl font-bold uppercase leading-tight">
                {lang === 'fr' ? 'Bibliothèque des Balanços' : 'Biblioteca de Balanços'}
              </h4>
              <span className="text-[10px] text-[#1a1a1a]/70 font-bold">
                {presets.length} {lang === 'fr' ? 'presets disponibles' : 'presets disponíveis'}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-lg font-bold hover:text-[#8b2a1a] cursor-pointer">✕</button>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
            placeholder={lang === 'fr' ? '🔍 Rechercher un balanço, auteur...' : '🔍 Buscar balanço, autor...'}
            className="w-full bg-white border border-black px-2.5 py-1.5 text-xs font-bold text-[#1a1a1a] outline-none shadow-[1px_1px_0px_#000]"
          />
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {(['all', 'factory', 'my', ...(userProfile?.groupId ? ['group'] : [])] as const).map((filterKey) => (
              <button
                key={filterKey}
                type="button"
                onClick={() => setLibraryFilter(filterKey as any)}
                className={`px-2.5 py-1 text-[10px] font-bold border border-black cursor-pointer shadow-[1px_1px_0px_#000] whitespace-nowrap transition-colors ${
                  libraryFilter === filterKey ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white text-[#1a1a1a] hover:bg-[#eaddcf]'
                }`}
              >
                {filterKey === 'all' && `${lang === 'fr' ? 'Tous' : 'Todos'} (${presets.length})`}
                {filterKey === 'factory' && `★ ${lang === 'fr' ? 'Usine' : 'Fábrica'} (${factoryCount})`}
                {filterKey === 'my' && `👤 ${lang === 'fr' ? 'Mes Balanços' : 'Meus Balanços'} (${myCount})`}
                {filterKey === 'group' && `👥 ${lang === 'fr' ? 'Mon Groupe' : 'Meu Grupo'} (${groupCount})`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[50vh] flex flex-col gap-2 pr-1">
          {filteredPresets.length === 0 ? (
            <div className="text-center py-8 font-bold text-xs text-[#1a1a1a]/60 bg-[#eaddcf]/30 border border-black/10 rounded-sm">
              {lang === 'fr' ? 'Aucun balanço ne correspond à votre recherche.' : 'Nenhum balanço encontrado.'}
            </div>
          ) : (
            filteredPresets.map((p) => (
              <BalancoLibraryCard
                key={p.id}
                preset={p}
                isActive={selectedPresetId === p.id}
                canManage={canManagePreset(p, userProfile)}
                lang={lang}
                onSelect={(id) => { onSelectPreset(id); onClose(); }}
                onEdit={(preset) => { onLoadToCustom(preset); onClose(); }}
                onDelete={onRequestDelete}
              />
            ))
          )}
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-[#1a1a1a]/20">
          <button
            type="button"
            onClick={onRefreshCloud}
            disabled={isLoadingCloud}
            className="px-2.5 py-1 bg-white border border-black text-xs font-bold text-[#1a1a1a] hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className={isLoadingCloud ? 'animate-spin inline-block' : ''}>🔄</span>
            {lang === 'fr' ? 'Synchroniser Cloud' : 'Sincronizar Nuvem'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-1.5 bg-[#1a1a1a] text-[#f4ecd8] font-cactus font-bold text-xs border border-black shadow-[2px_2px_0px_#000] hover:bg-[#8b2a1a] transition-colors cursor-pointer">
            {lang === 'fr' ? 'Fermer' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  );
};
