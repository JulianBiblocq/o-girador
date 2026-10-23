/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language } from '../../types';

interface BodyProps {
  isEditing: boolean;
  activeTextLang: 'pt' | 'fr';
  localDescriptionPt: string;
  setLocalDescriptionPt: (val: string) => void;
  localDescriptionFr: string;
  setLocalDescriptionFr: (val: string) => void;
  currentDisplayText: string;
  lang: Language;
  isPlaying: boolean;
  onStartEdit: () => void;
}

export const DescriptionModalBody: React.FC<BodyProps> = ({
  isEditing,
  activeTextLang,
  localDescriptionPt,
  setLocalDescriptionPt,
  localDescriptionFr,
  setLocalDescriptionFr,
  currentDisplayText,
  lang,
  isPlaying,
  onStartEdit,
}) => {
  return (
    <div className="p-4 sm:p-5 overflow-y-auto flex-grow custom-scrollbar min-h-[220px] max-h-[60vh]">
      {isEditing ? (
        <div className="flex flex-col gap-2 h-full">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a]/80 font-cactus">
            {activeTextLang === 'pt' ? 'Texto em Português (BR) :' : 'Texte en Français (FR) :'}
          </label>
          <textarea
            value={activeTextLang === 'pt' ? localDescriptionPt : localDescriptionFr}
            onChange={(e) => {
              if (activeTextLang === 'pt') {
                setLocalDescriptionPt(e.target.value);
              } else {
                setLocalDescriptionFr(e.target.value);
              }
            }}
            placeholder={
              activeTextLang === 'pt'
                ? 'Conte a história do ritmo, a toada, os mestres, curiosidades...'
                : "Racontez l'histoire du rythme, de la toada, des mestres, anecdotes..."
            }
            rows={12}
            className="xilo-textarea w-full p-3.5 text-sm sm:text-base leading-relaxed resize-y font-sans min-h-[200px] text-[#1a1a1a] bg-[#fcf9f2] border-3 border-[#1a1a1a]"
            autoFocus
          />
        </div>
      ) : (
        <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-4 sm:p-6 rounded-[2px_4px_3px_5px] shadow-inner min-h-[180px]">
          {currentDisplayText ? (
            <div className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-[#1a1a1a] select-text">
              {currentDisplayText}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2 text-[#1a1a1a]/50">
              <span className="text-3xl"></span>
              <span className="italic text-xs sm:text-sm font-bold">
                {lang === 'fr' ? 'Aucune traduction disponible dans cette langue.' : 'Sem tradução disponível neste idioma.'}
              </span>
              {!isPlaying && (
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="mt-2 text-xs font-cactus font-bold text-[#8b2a1a] hover:underline uppercase cursor-pointer"
                >
                  + {lang === 'fr' ? 'Rédiger une histoire' : 'Escrever uma história'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
