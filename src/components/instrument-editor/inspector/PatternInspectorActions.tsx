/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Copy, Download, CloudUpload, FolderOpen } from 'lucide-react';
import { ImportToadaButton } from '../../ImportToadaButton';
import { AtelierVocalButton } from '../../AtelierVocalButton';

export interface PatternInspectorActionsProps {
  isFr: boolean;
  activePattern: any;
  canPaste: boolean;
  isVoice?: boolean;
  onCopyPattern?: () => void;
  onPastePattern?: () => void;
  onSavePattern?: () => void;
  onLoadPattern?: () => void;
}

export const PatternInspectorActions: React.FC<PatternInspectorActionsProps> = React.memo(({
  isFr, activePattern, canPaste, isVoice = false, onCopyPattern, onPastePattern, onSavePattern, onLoadPattern,
}) => {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <button
        type="button"
        onClick={onCopyPattern}
        disabled={!activePattern}
        className="flex items-center justify-center gap-1.5 px-2 py-1 bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] text-[11px] font-bold font-cactus rounded shadow-[1px_1px_0px_#1a1a1a] hover:bg-black/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        title={isFr ? 'Copier ce motif' : 'Copiar este padrão'}
      >
        <Copy size={12} />
        <span>{isFr ? 'Copier' : 'Copiar'}</span>
      </button>

      <button
        type="button"
        onClick={onPastePattern}
        disabled={!canPaste || !activePattern}
        className={`flex items-center justify-center gap-1.5 px-2 py-1 text-[11px] font-bold font-cactus rounded shadow-[1px_1px_0px_#1a1a1a] border transition-all ${
          canPaste
            ? 'bg-[#f4ecd8] text-[#1a1a1a] border-[#1a1a1a] hover:bg-black/10 active:scale-95 cursor-pointer'
            : 'bg-stone-300 text-stone-500 border-[#1a1a1a]/30 cursor-not-allowed opacity-50'
        }`}
        title={isFr ? 'Coller le motif copié' : 'Colar o padrão copiado'}
      >
        <Download size={12} />
        <span>{isFr ? 'Coller' : 'Colar'}</span>
      </button>

      {isVoice ? (
        <>
          <ImportToadaButton lang={isFr ? 'fr' : 'pt'} className="w-full justify-center" />
          <AtelierVocalButton lang={isFr ? 'fr' : 'pt'} className="w-full justify-center" />
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onSavePattern}
            disabled={!activePattern}
            className="flex items-center justify-center gap-1.5 px-2 py-1 bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] text-[11px] font-bold font-cactus rounded shadow-[1px_1px_0px_#1a1a1a] hover:bg-black/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title={isFr ? 'Sauvegarder ce motif dans le catalogue cloud' : 'Salvar este padrão no catálogo nuvem'}
          >
            <CloudUpload size={12} />
            <span>{isFr ? 'Sauvegarder' : 'Salvar'}</span>
          </button>

          <button
            type="button"
            onClick={onLoadPattern}
            disabled={!activePattern}
            className="flex items-center justify-center gap-1.5 px-2 py-1 bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] text-[11px] font-bold font-cactus rounded shadow-[1px_1px_0px_#1a1a1a] hover:bg-black/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title={isFr ? 'Charger un motif depuis le catalogue' : 'Carregar padrão do catálogo'}
          >
            <FolderOpen size={12} />
            <span>{isFr ? 'Charger' : 'Carregar'}</span>
          </button>
        </>
      )}
    </div>
  );
});

PatternInspectorActions.displayName = 'PatternInspectorActions';
