/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Tiroir de saisie optionnelle des métadonnées lors du scan (< 80 lignes).
 */
import React, { useState } from 'react';
import { Info, ChevronDown, ChevronRight } from 'lucide-react';
import { PresetMetadata } from '../../types';

interface Props {
  metadata: Partial<PresetMetadata>;
  onChange: (updates: Partial<PresetMetadata>) => void;
  lang: 'fr' | 'pt';
}

export const PaperScannerMetadataDrawer: React.FC<Props> = ({ metadata, onChange, lang }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-2 border-[var(--cordel-border,#1a1a1a)] bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2.5 py-1.5 flex items-center justify-between text-left font-cactus font-bold text-xs uppercase bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer select-none"
      >
        <span className="flex items-center gap-1.5">
          <Info size={13} className="text-[#8b2a1a] dark:text-[#f59e0b]" />
          <span>{lang === 'fr' ? 'Informations du morceau (optionnel)' : 'Informações da música (opcional)'}</span>
        </span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {isOpen && (
        <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border-t border-[var(--cordel-border,#1a1a1a)]/30">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-bold uppercase opacity-75">{lang === 'fr' ? 'Titre du morceau' : 'Título da música'}</label>
            <input
              type="text"
              value={metadata.toada || ''}
              onChange={(e) => onChange({ toada: e.target.value })}
              placeholder={lang === 'fr' ? 'Ex: Convenção 1' : 'Ex: Toada Nova'}
              className="p-1 bg-[#efe6d0] text-[#1a1a1a] border border-[#1a1a1a] dark:bg-[#262220] dark:text-[#f4ecd8] dark:border-[#f4ecd8]/40 font-sans text-xs outline-none"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-bold uppercase opacity-75">{lang === 'fr' ? 'Groupe / Nação' : 'Grupo / Nação'}</label>
            <input
              type="text"
              value={metadata.nacao || ''}
              onChange={(e) => onChange({ nacao: e.target.value })}
              placeholder={lang === 'fr' ? 'Ex: Maracatu Nação Estrela' : 'Ex: Estrela Brilhante'}
              className="p-1 bg-[#efe6d0] text-[#1a1a1a] border border-[#1a1a1a] dark:bg-[#262220] dark:text-[#f4ecd8] dark:border-[#f4ecd8]/40 font-sans text-xs outline-none"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-bold uppercase opacity-75">{lang === 'fr' ? 'Auteur / Compositeur' : 'Autor / Compositor'}</label>
            <input
              type="text"
              value={metadata.compositor || ''}
              onChange={(e) => onChange({ compositor: e.target.value })}
              placeholder="Ex: Mestre Walter"
              className="p-1 bg-[#efe6d0] text-[#1a1a1a] border border-[#1a1a1a] dark:bg-[#262220] dark:text-[#f4ecd8] dark:border-[#f4ecd8]/40 font-sans text-xs outline-none"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-bold uppercase opacity-75">{lang === 'fr' ? 'Rythme / Sous-titre' : 'Ritmo / Subtítulo'}</label>
            <input
              type="text"
              value={metadata.ritmo || ''}
              onChange={(e) => onChange({ ritmo: e.target.value })}
              placeholder="Ex: Luanda / C 1"
              className="p-1 bg-[#efe6d0] text-[#1a1a1a] border border-[#1a1a1a] dark:bg-[#262220] dark:text-[#f4ecd8] dark:border-[#f4ecd8]/40 font-sans text-xs outline-none"
            />
          </div>
          <div className="flex flex-col gap-0.5 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase opacity-75">{lang === 'fr' ? 'Lien YouTube (Vidéo ou Shorts)' : 'Link do YouTube'}</label>
            <input
              type="text"
              value={metadata.youtubeUrl || ''}
              onChange={(e) => onChange({ youtubeUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
              className="p-1 bg-[#efe6d0] text-[#1a1a1a] border border-[#1a1a1a] dark:bg-[#262220] dark:text-[#f4ecd8] dark:border-[#f4ecd8]/40 font-sans text-xs outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
