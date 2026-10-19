/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useCallback } from 'react';
import { SongSection, Language } from '../../types';
import { AlertTriangle, FastForward, Edit3, X } from 'lucide-react';

export interface SectionCollisionModalProps {
  isOpen: boolean;
  section: SongSection | null;
  targetRange: { start: number; end: number } | null;
  lang: Language;
  onInsert: () => void;
  onOverwrite: () => void;
  onCancel: () => void;
}

export const SectionCollisionModal: React.FC<SectionCollisionModalProps> = ({
  isOpen,
  section,
  targetRange,
  lang,
  onInsert,
  onOverwrite,
  onCancel,
}) => {
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

  if (!isOpen || !section || !targetRange) return null;

  const isFr = lang === 'fr';
  const startM = targetRange.start + 1;
  const endM = targetRange.end + 1;
  const countM = targetRange.end - targetRange.start + 1;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none"
      onClick={onCancel}
      data-testid="section-collision-modal"
    >
      <div
        className="w-full max-w-lg bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] p-6 flex flex-col gap-4 font-sans text-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-[#8b2a1a] shrink-0" />
            <h2 className="text-xl font-bold font-cactus tracking-wide uppercase text-[#1a1a1a]">
              {isFr ? 'Zone occupée — Conflit de section' : 'Área ocupada — Conflito de seção'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-[#1a1a1a]/70 hover:text-[#1a1a1a] p-1 rounded cursor-pointer transition-colors"
            title={isFr ? 'Fermer (Échap)' : 'Fechar (Esc)'}
            data-testid="section-conflict-close-x"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 text-sm">
          <p className="font-bold text-[#1a1a1a] leading-relaxed">
            {isFr
              ? 'Les mesures cibles contiennent déjà des motifs musicaux. Souhaitez-vous insérer de nouvelles mesures en décalant la suite, ou écraser le contenu existant ?'
              : 'Os compassos de destino já contêm padrões musicais. Deseja inserir novos compassos deslocando o restante, ou sobrescrever o conteúdo existente?'}
          </p>

          <div className="p-3 bg-[#eaddcf] border border-[#1a1a1a]/30 rounded text-xs flex flex-col gap-1.5 text-[#1a1a1a]">
            <div className="flex justify-between items-center">
              <span className="text-[#1a1a1a]/70">{isFr ? 'Section source :' : 'Seção de origem :'}</span>
              <span className="font-bold font-cactus uppercase">{section.name} (M{section.startMeasure + 1} - M{section.endMeasure + 1})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#1a1a1a]/70">{isFr ? 'Plage d’étirement :' : 'Intervalo de extensão :'}</span>
              <span className="font-bold font-cactus uppercase text-[#8b2a1a]">M{startM} - M{endM} ({countM} {isFr ? 'mesure(s)' : 'compasso(s)'})</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-[#1a1a1a]/20 mt-1">
          <button
            onClick={onCancel}
            className="px-3.5 py-2 bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors"
            data-testid="section-conflict-cancel-btn"
          >
            {isFr ? 'Annuler' : 'Cancelar'}
          </button>

          <button
            onClick={onOverwrite}
            className="px-4 py-2 bg-[#eaddcf] text-[#1a1a1a] border-2 border-[#1a1a1a] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[#d5c3aa] shadow-[2px_2px_0px_#1a1a1a] transition-all flex items-center gap-1.5"
            data-testid="section-conflict-overwrite-btn"
          >
            <Edit3 size={14} className="shrink-0" />
            <span>{isFr ? 'Écraser' : 'Sobrescrever'}</span>
          </button>

          <button
            onClick={onInsert}
            className="px-4 py-2 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[#6e2114] shadow-[2px_2px_0px_#1a1a1a] transition-all flex items-center gap-1.5"
            data-testid="section-conflict-insert-btn"
          >
            <FastForward size={14} className="shrink-0" />
            <span>{isFr ? 'Insérer (Décaler la suite)' : 'Inserir (Deslocar restante)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
