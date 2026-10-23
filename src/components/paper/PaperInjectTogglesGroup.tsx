/**
 * Boutons de liaison Alfaias et Caixas pour l'injection papier (< 80 lignes).
 */
import React from 'react';

interface Props {
  hasAl: boolean;
  linkAl: boolean;
  onToggleAl: () => void;
  hasCx: boolean;
  currentCxMode: 'none' | 'caixa_tarol' | 'two_caixas';
  onCycleCx: () => void;
}

export const PaperInjectTogglesGroup: React.FC<Props> = ({
  hasAl,
  linkAl,
  onToggleAl,
  hasCx,
  currentCxMode,
  onCycleCx,
}) => {
  return (
    <>
      {hasAl && (
        <button
          type="button"
          onClick={onToggleAl}
          className={`px-2 py-1 rounded font-bold transition-colors border flex items-center gap-1 ${
            linkAl
              ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a] dark:bg-[#f4ecd8] dark:text-[#1a1a1a]'
              : 'bg-transparent text-stone-500 border-stone-400/40 line-through'
          }`}
          title="Lier Marcante, Meião et Repique dans un groupe ALFAIAS"
        >
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>3 Alfaias</span>
        </button>
      )}

      {hasCx && (
        <button
          type="button"
          onClick={onCycleCx}
          className={`px-2 py-1 rounded font-bold transition-colors border flex items-center gap-1 ${
            currentCxMode !== 'none'
              ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a] dark:bg-[#f4ecd8] dark:text-[#1a1a1a]'
              : 'bg-transparent text-stone-500 border-stone-400/40 line-through'
          }`}
          title={
            currentCxMode === 'caixa_tarol'
              ? 'Mode Caixa (Maître) + Tarol (Esclave) lié. Clic pour basculer sur 2 Caixas'
              : currentCxMode === 'two_caixas'
              ? 'Mode 2 Caixas liées G/D. Clic pour délier (Caixas libres)'
              : 'Caixas libres (non liées). Clic pour lier Cx + Tarol'
          }
        >
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>
            {currentCxMode === 'caixa_tarol'
              ? 'Cx + Tarol'
              : currentCxMode === 'two_caixas'
              ? '2 Caixas (G/D)'
              : 'Caixas libres'}
          </span>
        </button>
      )}
    </>
  );
};
