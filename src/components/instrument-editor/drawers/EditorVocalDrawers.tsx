/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VocalTimbreSelector } from '../VocalTimbreSelector';
import { Language } from '../../../types';

export interface EditorVocalDrawersProps {
  isVocalContext: boolean;
  lang: Language;
  patternId?: number;
  trackId: number;
  isCoro?: boolean;
  hasVocalRecording?: boolean;
  onOpenAlignment?: () => void;
  onImportAudio?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EditorVocalDrawers: React.FC<EditorVocalDrawersProps> = React.memo((props) => {
  const {
    isVocalContext, lang, hasVocalRecording, onOpenAlignment, onImportAudio,
  } = props;

  if (!isVocalContext) return null;

  return (
    <div className="flex flex-col gap-2 p-2 bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] rounded-sm select-none">
      <div className="flex items-center justify-between border-b border-[#1a1a1a]/20 pb-1">
        <span className="font-cactus font-bold text-xs uppercase text-[#1a1a1a]">
          {lang === 'fr' ? 'Atelier Vocal' : 'Oficina Vocal'}
        </span>
        <span className="text-xs">🎙️</span>
      </div>

      <VocalTimbreSelector lang={lang} />

      <div className="flex items-center gap-1.5 pt-1">
        {hasVocalRecording && onOpenAlignment && (
          <button
            type="button"
            onClick={onOpenAlignment}
            className="flex-1 py-1 px-2 bg-[#8b2a1a] text-[#f4ecd8] font-cactus font-bold text-xs rounded-xs cordel-button hover:bg-[#1a1a1a] transition-colors"
            title={lang === 'fr' ? "Ouvrir l'alignement audio" : "Abrir alinhamento de áudio"}
          >
            ⏱️ {lang === 'fr' ? 'Aligner audio' : 'Alinhar áudio'}
          </button>
        )}

        {onImportAudio && (
          <label className="py-1 px-2 bg-[#ece4d0] text-[#1a1a1a] border border-[#1a1a1a] font-cactus font-bold text-xs rounded-xs cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors text-center">
            📥 {lang === 'fr' ? 'Importer audio' : 'Importar áudio'}
            <input type="file" accept="audio/*" onChange={onImportAudio} className="hidden" />
          </label>
        )}
      </div>
    </div>
  );
});

EditorVocalDrawers.displayName = 'EditorVocalDrawers';
