/**
 * Bandeau de reprise rapide d'un import Cloud (< 50 lignes).
 */
import React from 'react';
import { Cloud, X, ArrowRight } from 'lucide-react';
import { PaperScanDraftDocument } from '../../utils/paper/paperScanCloudStorage';

interface Props {
  draft: PaperScanDraftDocument;
  onResume: (draft: PaperScanDraftDocument) => void;
  onDismiss: () => void;
  lang: 'fr' | 'pt';
}

export const PaperResumeDraftBanner: React.FC<Props> = ({ draft, onResume, onDismiss, lang }) => {
  const isFr = lang === 'fr';
  const deviceBadge = draft.deviceType === 'mobile' ? '[Mobile]' : '[PC]';

  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-[#efe6d0] dark:bg-[#2b2725] border-2 border-[#8b2a1a] dark:border-[#f59e0b] shadow-[2px_2px_0px_#1a1a1a] text-xs font-sans">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Cloud size={15} className="text-[#8b2a1a] dark:text-[#f59e0b] shrink-0" />
        <span className="font-cactus font-bold text-xs truncate text-[#1a1a1a] dark:text-[#f4ecd8]">
          <span className="text-[#8b2a1a] dark:text-[#f59e0b]">
            {isFr ? 'Reprendre l\'import : ' : 'Continuar importação : '}
          </span>
          <span className="font-bold underline">{draft.title}</span>{' '}
          <span className="text-[10px] font-mono opacity-75">{deviceBadge}</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onResume(draft)}
          className="px-2.5 py-1 bg-[#8b2a1a] hover:bg-[#9a3412] text-[#f4ecd8] border border-black font-cactus font-bold text-xs uppercase flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000] transition-colors"
        >
          <span>{isFr ? 'Charger' : 'Carregar'}</span>
          <ArrowRight size={11} />
        </button>
        <button
          type="button"
          onClick={onDismiss}
          title={isFr ? 'Ignorer' : 'Ignorar'}
          className="p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
