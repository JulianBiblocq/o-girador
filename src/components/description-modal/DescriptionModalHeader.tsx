/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Landmark, User, Music, Edit3 } from 'lucide-react';
import { Language, PresetMetadata } from '../../types';

interface HeaderProps {
  metadata: PresetMetadata;
  lang: Language;
  activeTextLang: 'pt' | 'fr';
  setActiveTextLang: (l: 'pt' | 'fr') => void;
  isEditing: boolean;
  setIsEditing: (e: boolean) => void;
  isPlaying: boolean;
  onClose: () => void;
}

export const DescriptionModalHeader: React.FC<HeaderProps> = ({
  metadata,
  lang,
  activeTextLang,
  setActiveTextLang,
  isEditing,
  setIsEditing,
  isPlaying,
  onClose,
}) => {
  return (
    <div className="p-4 sm:p-5 border-b-3 border-[#1a1a1a] bg-[#ebe2cb] flex flex-col gap-2 shrink-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] sm:text-xs uppercase font-cactus font-bold tracking-wider text-[#8b2a1a] flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 shrink-0 text-[#8b2a1a]" />
            <span>{lang === 'fr' ? 'Histoire & Contexte' : 'História & Contexto'}</span>
          </span>
          <h2 className="font-cactus font-bold text-lg sm:text-2xl uppercase tracking-wide truncate leading-tight text-[#1a1a1a]">
            {metadata.toada || (lang === 'fr' ? 'Toada sem título' : 'Toada sem título')}
          </h2>
        </div>

        <button
          onClick={onClose}
          type="button"
          className="text-[#1a1a1a] hover:text-[#8b2a1a] hover:bg-[#1a1a1a]/10 w-8 h-8 flex items-center justify-center font-bold text-xl border-2 border-[#1a1a1a] rounded-[3px] transition-colors shrink-0 cursor-pointer shadow-[2px_2px_0px_#1a1a1a]"
          title={lang === 'fr' ? 'Fermer (Échap)' : 'Fechar (Esc)'}
        >
          ✕
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
        {metadata.nacao && (
          <span className="px-2 py-0.5 bg-[#fcf9f2] border border-[#1a1a1a] rounded-xs shadow-[1px_1px_0px_#1a1a1a] flex items-center gap-1">
            <Landmark className="w-3 h-3 shrink-0 opacity-70" />
            <span>{metadata.nacao}</span>
          </span>
        )}
        {metadata.compositor && (
          <span className="px-2 py-0.5 bg-[#fcf9f2] border border-[#1a1a1a] rounded-xs shadow-[1px_1px_0px_#1a1a1a] flex items-center gap-1">
            <User className="w-3 h-3 shrink-0 opacity-70" />
            <span>{metadata.compositor}</span>
          </span>
        )}
        {metadata.ritmo && (
          <span className="px-2 py-0.5 bg-[#fcf9f2] border border-[#1a1a1a] rounded-xs shadow-[1px_1px_0px_#1a1a1a] flex items-center gap-1">
            <Music className="w-3 h-3 shrink-0 opacity-70" />
            <span>{metadata.ritmo}</span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#1a1a1a]/20">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTextLang('pt')}
            className={`px-3 py-1 text-xs font-cactus font-bold uppercase transition-all cursor-pointer rounded-xs ${
              activeTextLang === 'pt'
                ? 'bg-[#1a1a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,0.3)]'
                : 'bg-[#fcf9f2] text-[#1a1a1a] border-2 border-[#1a1a1a]/40 hover:border-[#1a1a1a]'
            }`}
          >
            Português
          </button>
          <button
            type="button"
            onClick={() => setActiveTextLang('fr')}
            className={`px-3 py-1 text-xs font-cactus font-bold uppercase transition-all cursor-pointer rounded-xs ${
              activeTextLang === 'fr'
                ? 'bg-[#1a1a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,0.3)]'
                : 'bg-[#fcf9f2] text-[#1a1a1a] border-2 border-[#1a1a1a]/40 hover:border-[#1a1a1a]'
            }`}
          >
            Français
          </button>
        </div>

        {!isEditing ? (
          <button
            type="button"
            disabled={isPlaying}
            onClick={() => setIsEditing(true)}
            title={
              isPlaying
                ? (lang === 'fr' ? 'Mettre en pause pour éditer' : 'Pausar para editar')
                : (lang === 'fr' ? 'Modifier le texte' : 'Editar texto')
            }
            className={`px-3 py-1 text-xs font-cactus font-bold uppercase border-2 transition-all flex items-center gap-1.5 rounded-xs ${
              isPlaying
                ? 'bg-[#1a1a1a]/10 text-[#1a1a1a]/40 border-[#1a1a1a]/20 cursor-not-allowed'
                : 'bg-[#8b2a1a] hover:bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a] cursor-pointer shadow-[2px_2px_0px_#1a1a1a]'
            }`}
          >
            <Edit3 className="w-3 h-3 shrink-0" />
            <span>{lang === 'fr' ? 'Modifier' : 'Editar'}</span>
          </button>
        ) : (
          <span className="text-[11px] font-bold text-[#8b2a1a] uppercase font-cactus flex items-center gap-1">
            <Edit3 className="w-3 h-3 shrink-0" />
            <span>{lang === 'fr' ? 'Mode Édition' : 'Modo Edição'}</span>
          </span>
        )}
      </div>
    </div>
  );
};
