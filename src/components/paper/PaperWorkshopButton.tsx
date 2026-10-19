/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bouton Cordel [ 🎼 Atelier Papier ] pour la barre supérieure (< 65 lignes).
 */
import React from 'react';
import { FileText } from 'lucide-react';

interface PaperWorkshopButtonProps {
  lang: 'fr' | 'pt';
  onClick: () => void;
  className?: string;
  isCompact?: boolean;
}

export const PaperWorkshopButton: React.FC<PaperWorkshopButtonProps> = ({
  lang,
  onClick,
  className = '',
  isCompact = false,
}) => {
  const label = lang === 'pt' ? 'Atelier Papel' : 'Atelier Papier';
  const title = lang === 'pt'
    ? 'Atelier de Partituras em Papel (Impressão, Scanner, Réserve Mestre) [Ctrl+Shift+I]'
    : "Grand Atelier Papier (Impression fiches vierges, Scanner, Réserve Mestre) [Ctrl+Shift+I]";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1 text-[11px] font-cactus font-bold flex items-center justify-center gap-1.5 border-2 border-[var(--cordel-border,#1a1a1a)] shadow-[2px_2px_0px_var(--cordel-border,#1a1a1a)] bg-[var(--cordel-bg,#f4ecd8)] text-[var(--cordel-text,#1a1a1a)] hover:bg-[var(--cordel-wood,#8b2a1a)] hover:text-[#f4ecd8] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors cursor-pointer select-none ${className}`}
    >
      <FileText className="w-3.5 h-3.5 shrink-0" />
      {!isCompact && <span>{label}</span>}
    </button>
  );
};
