/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Square, Check } from 'lucide-react';

export interface AudioAlignmentFooterProps {
  isPlayingPreview: boolean;
  handleTogglePreview: () => void;
  onCancel: () => void;
  handleValidate: () => void;
  isProcessing: boolean;
  lang: string;
}

export const AudioAlignmentFooter: React.FC<AudioAlignmentFooterProps> = React.memo(({
  isPlayingPreview, handleTogglePreview, onCancel, handleValidate, isProcessing, lang,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t-2 border-[#1a1a1a]/15">
      <button
        onClick={handleTogglePreview}
        className={`px-5 py-2.5 border-2 border-[#1a1a1a] font-bold text-xs rounded-sm cursor-pointer shadow-[3px_3px_0px_#1a1a1a] transition-all flex items-center gap-2 ${
          isPlayingPreview
            ? 'bg-[#8b2a1a] text-[#fdfaf2] hover:bg-[#1a1a1a]'
            : 'bg-[#2a5d4e] text-[#fdfaf2] hover:bg-[#1a1a1a]'
        }`}
      >
        {isPlayingPreview ? (
          <>
            <Square className="w-4 h-4 fill-current" />
            {lang === 'fr' ? 'Arrêter Écoute' : 'Parar Reprodução'}
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            {lang === 'fr' ? 'Écouter avec la Roda' : 'Ouvir com a Roda'}
          </>
        )}
      </button>

      <div className="flex gap-3 w-full sm:w-auto justify-end">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="px-5 py-2.5 text-xs font-bold border-2 border-[#1a1a1a] bg-[#ece4d0] hover:bg-[#1a1a1a] hover:text-[#ece4d0] transition-colors cursor-pointer rounded-sm shadow-[3px_3px_0px_#1a1a1a]"
        >
          {lang === 'fr' ? 'Annuler' : 'Cancelar'}
        </button>
        <button
          onClick={handleValidate}
          disabled={isProcessing}
          className="px-5 py-2.5 text-xs font-bold bg-[#8b2a1a] text-[#fdfaf2] border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#ece4d0] transition-colors cursor-pointer rounded-sm shadow-[3px_3px_0px_#1a1a1a] flex items-center gap-2"
        >
          {isProcessing ? (
            <span>{lang === 'fr' ? 'Rendu en cours...' : 'Processando...'}</span>
          ) : (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              {lang === 'fr' ? 'Valider le chant' : 'Confirmar o canto'}
            </>
          )}
        </button>
      </div>
    </div>
  );
});

AudioAlignmentFooter.displayName = 'AudioAlignmentFooter';
