/**
 * Barre d'actions d'injection en bas du Scanner (< 45 lignes).
 */
import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  canImport: boolean;
  sequenceItemsLength: number;
  vigilanceCount: number;
  onInject: (openOnFirst: boolean) => void;
  lang: 'fr' | 'pt';
}

export const PaperScannerBottomBar: React.FC<Props> = ({
  canImport, sequenceItemsLength, vigilanceCount, onInject, lang,
}) => {
  const isFr = lang === 'fr';

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-sans text-xs">
      <div className="text-[10px] font-extrabold text-[#8b2a1a] dark:text-[#f59e0b]">
        {!canImport ? (isFr ? 'Import réservé au Mestre.' : 'Importação reservada.') : `${sequenceItemsLength} bloc(s) prêts`}
      </div>
      <div className="flex items-center gap-2">
        {vigilanceCount > 0 && (
          <button
            type="button"
            onClick={() => onInject(true)}
            className="py-2 px-3 bg-[#d97706] hover:bg-[#b45309] text-white border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_#000] cursor-pointer"
          >
            <AlertTriangle size={13} />
            <span>{isFr ? 'Injecter & Ouvrir sur le 1er Point' : 'Injetar & Abrir no 1º Ponto'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onInject(false)}
          disabled={sequenceItemsLength === 0}
          className="py-2 px-4 bg-[#8b2a1a] disabled:opacity-40 text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_#000] hover:bg-black cursor-pointer"
        >
          <CheckCircle size={14} />
          <span>{isFr ? 'Injecter dans la Roda' : 'Injetar na Roda'}</span>
        </button>
      </div>
    </div>
  );
};
