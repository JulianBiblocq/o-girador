/**
 * Bandeau d'état et de diagnostic pour le scanner Vision (< 80 lignes).
 * Affiche l'indicateur de chargement, de succès ou d'erreur directement dans la modale.
 */
import React from 'react';
import { Loader2, Check, AlertTriangle, X } from 'lucide-react';

export interface ScanStatusBannerData {
  type: 'loading' | 'success' | 'error';
  message: string;
}

interface Props {
  banner: ScanStatusBannerData | null;
  onDismiss: () => void;
  lang: 'fr' | 'pt';
}

export const PaperScanStatusBanner: React.FC<Props> = ({ banner, onDismiss, lang }) => {
  if (!banner) return null;

  const isFr = lang === 'fr';

  if (banner.type === 'loading') {
    return (
      <div className="flex items-center gap-2 p-2.5 bg-[#fef3c7] dark:bg-[#78350f]/30 border-2 border-[#d97706] text-[#92400e] dark:text-[#fef3c7] font-sans text-xs shadow-xs animate-pulse">
        <Loader2 size={16} className="animate-spin text-[#d97706] shrink-0" />
        <div className="flex-1 font-bold">
          {banner.message || (isFr ? 'Scan en cours...' : 'Escaneamento em andamento...')}
        </div>
      </div>
    );
  }

  if (banner.type === 'success') {
    return (
      <div className="flex items-center justify-between gap-2 p-2.5 bg-[#dcfce7] dark:bg-[#14532d]/30 border-2 border-[#15803d] text-[#14532d] dark:text-[#dcfce7] font-sans text-xs shadow-xs">
        <div className="flex items-center gap-2 flex-1">
          <Check size={16} className="text-[#15803d] shrink-0" />
          <span className="font-bold">{banner.message}</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[#15803d] hover:text-black dark:hover:text-white p-0.5 cursor-pointer shrink-0"
          title={isFr ? 'Fermer' : 'Fechar'}
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2 p-2.5 bg-[#fee2e2] dark:bg-[#7f1d1d]/30 border-2 border-[#b91c1c] text-[#7f1d1d] dark:text-[#fee2e2] font-sans text-xs shadow-xs">
      <div className="flex items-start gap-2 flex-1">
        <AlertTriangle size={16} className="text-[#b91c1c] shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="font-cactus font-bold uppercase text-[11px] text-[#b91c1c]">
            {isFr ? 'Erreur de numérisation :' : 'Erro de escaneamento :'}
          </span>
          <span className="font-medium break-words">{banner.message}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-[#b91c1c] hover:text-black dark:hover:text-white p-0.5 cursor-pointer shrink-0"
        title={isFr ? 'Fermer' : 'Fechar'}
      >
        <X size={15} />
      </button>
    </div>
  );
};
