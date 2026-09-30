/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useCallback } from 'react';
import { SongSection, Language } from '../../types';

interface SectionStretchConflictModalProps {
  isOpen: boolean;
  section: SongSection | null;
  targetRange: { start: number; end: number } | null;
  lang: Language;
  onInsert: () => void;
  onOverwrite: () => void;
  onCancel: () => void;
}

export const SectionStretchConflictModal: React.FC<SectionStretchConflictModalProps> = ({
  isOpen,
  section,
  targetRange,
  lang,
  onInsert,
  onOverwrite,
  onCancel,
}) => {
  // Support du raccourci Échap pour fermer le modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    },
    [onCancel]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !section || !targetRange) {
    return null;
  }

  const isFr = lang === 'fr';
  const startMDisplay = targetRange.start + 1;
  const endMDisplay = targetRange.end + 1;
  const countMeasures = targetRange.end - targetRange.start + 1;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none"
      onClick={onCancel}
      data-testid="section-stretch-conflict-modal"
    >
      <div
        className="w-full max-w-lg bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] p-6 flex flex-col gap-4 font-sans text-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête Cordel */}
        <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <h2 className="text-xl font-bold font-cactus tracking-wide uppercase text-[#1a1a1a]">
              {isFr ? 'Zone occupée — Conflit de section' : 'Área ocupada — Conflito de seção'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-lg font-bold text-[#1a1a1a]/70 hover:text-[#1a1a1a] cursor-pointer px-2 py-0.5 rounded transition-colors"
            title={isFr ? 'Fermer (Échap)' : 'Fechar (Esc)'}
            data-testid="section-conflict-close-x"
          >
            ✕
          </button>
        </div>

        {/* Message d'explication */}
        <div className="flex flex-col gap-2.5 text-sm">
          <p className="font-bold text-[#1a1a1a] leading-relaxed">
            {isFr
              ? 'Les mesures cibles contiennent déjà des motifs musicaux. Souhaitez-vous insérer de nouvelles mesures en décalant la suite, ou écraser le contenu existant ?'
              : 'Os compassos de destino já contêm padrões musicais. Deseja inserir novos compassos deslocando o restante, ou sobrescrever o conteúdo existente?'}
          </p>

          <div className="p-3 bg-[#eaddcf]/60 border border-[#1a1a1a]/30 rounded text-xs flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-[#1a1a1a]/70">
                {isFr ? 'Section source :' : 'Seção de origem :'}
              </span>
              <span className="font-bold font-cactus uppercase">
                {section.name} (M{section.startMeasure + 1} - M{section.endMeasure + 1})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#1a1a1a]/70">
                {isFr ? 'Plage d’étirement :' : 'Intervalo de extensão :'}
              </span>
              <span className="font-bold font-cactus uppercase text-[#c05621]">
                M{startMDisplay} - M{endMDisplay} ({countMeasures} {isFr ? 'mesure(s)' : 'compasso(s)'})
              </span>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-[#1a1a1a]/20 mt-1">
          {/* Annuler */}
          <button
            onClick={onCancel}
            className="px-3.5 py-2 bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors"
            data-testid="section-conflict-cancel-btn"
          >
            {isFr ? 'Annuler' : 'Cancelar'}
          </button>

          {/* Écraser */}
          <button
            onClick={onOverwrite}
            className="px-4 py-2 bg-[#e2d5c1] text-[#1a1a1a] border-2 border-[#1a1a1a] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[#d5c3aa] shadow-[2px_2px_0px_#1a1a1a] transition-all active:translate-x-[1px] active:translate-y-[1px]"
            data-testid="section-conflict-overwrite-btn"
          >
            {isFr ? '⚡ Écraser' : '⚡ Sobrescrever'}
          </button>

          {/* Insérer (Mis en avant) */}
          <button
            onClick={onInsert}
            className="px-4 py-2 bg-[#c05621] text-[#f4ecd8] border-2 border-[#1a1a1a] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[#a84414] shadow-[2px_2px_0px_#1a1a1a] transition-all active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5"
            data-testid="section-conflict-insert-btn"
          >
            <span>⤵</span>
            <span>{isFr ? 'Insérer (Décaler la suite)' : 'Inserir (Deslocar restante)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
