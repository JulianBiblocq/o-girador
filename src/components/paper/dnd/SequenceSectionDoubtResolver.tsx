/**
 * Bandeau interactif Cordel de résolution des doutes de nom de section (< 110 lignes).
 */
import React, { useState } from 'react';
import { AlertTriangle, Check, CheckCheck, X } from 'lucide-react';

interface Props {
  baseName: string;
  candidates: string[];
  duplicateCount?: number;
  onResolve: (chosenCandidate: string, applyToAll: boolean) => void;
  onClose?: () => void;
  lang?: 'fr' | 'pt';
}

export const SequenceSectionDoubtResolver: React.FC<Props> = ({
  baseName, candidates, duplicateCount = 1, onResolve, onClose, lang = 'fr',
}) => {
  const isFr = lang === 'fr';
  const [applyToAll, setApplyToAll] = useState(false);
  const hasMultiple = duplicateCount > 1;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute left-0 top-full mt-1.5 z-50 min-w-[240px] max-w-[320px] p-2 bg-[#fdfbf7] dark:bg-[#241d18] border-2 border-[#9a3412] shadow-[3px_3px_0px_#9a3412] font-sans text-xs text-[#1a1a1a] dark:text-[#f4ecd8]"
    >
      <div className="flex items-start justify-between gap-1.5 mb-1.5 pb-1 border-b border-[#9a3412]/30">
        <div className="flex items-center gap-1 text-[#9a3412] font-bold">
          <AlertTriangle size={13} className="shrink-0" />
          <span className="font-cactus uppercase text-[11px]">
            {isFr ? `Doute sur « ${baseName} »` : `Dúvida em « ${baseName} »`}
          </span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-0.5 text-[#1a1a1a]/60 dark:text-[#f4ecd8]/60 hover:text-[#9a3412] cursor-pointer">
            <X size={12} />
          </button>
        )}
      </div>

      {candidates.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] text-[#1a1a1a]/80 dark:text-[#f4ecd8]/80">
            {isFr ? 'Voulez-vous dire :' : 'Quis dizer :'}
          </p>

          <div className="flex flex-wrap gap-1">
            {candidates.map((cand) => (
              <button
                key={cand}
                type="button"
                onClick={() => onResolve(cand, applyToAll)}
                className="px-2 py-0.5 bg-[#efe6d0] hover:bg-[#9a3412] hover:text-[#f4ecd8] border border-[#1a1a1a] dark:border-[#f4ecd8]/40 shadow-[1px_1px_0px_#1a1a1a] font-cactus font-bold text-[10px] uppercase cursor-pointer transition-colors flex items-center gap-1"
              >
                <Check size={10} className="shrink-0" />
                <span>{cand}</span>
              </button>
            ))}
          </div>

          {hasMultiple && (
            <label className="flex items-center gap-1.5 pt-1 mt-0.5 border-t border-[#9a3412]/20 cursor-pointer select-none text-[10px] text-[#9a3412] font-bold">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="rounded-xs accent-[#9a3412]"
              />
              <span className="flex items-center gap-1">
                <CheckCheck size={11} />
                {isFr ? `Appliquer à tous les « ${baseName} » (${duplicateCount})` : `Aplicar a todos os « ${baseName} » (${duplicateCount})`}
              </span>
            </label>
          )}
        </div>
      ) : (
        <p className="text-[10px] italic text-[#9a3412] py-0.5">
          {isFr ? 'Doute : motif inconnu (à corriger manuellement)' : 'Dúvida: motivo desconhecido (corrigir manualmente)'}
        </p>
      )}
    </div>
  );
};
