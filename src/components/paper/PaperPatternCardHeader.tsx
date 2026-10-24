/**
 * En-tête d'une carte de motif avec boutons Mesure/BPM, Rescanner et Pin (< 75 lignes).
 */
import React from 'react';
import { Pencil, Settings2, Camera, Cloud, Pin } from 'lucide-react';

interface Props {
  secName: string;
  onRename?: (newName: string) => void;
  displaySig: string;
  displaySteps: number;
  displayBpm: number;
  isOverridden: boolean;
  onOpenOverrideModal: () => void;
  onRescan?: () => void;
  isReusable: boolean;
  onToggleReusable: () => void;
  lang: 'fr' | 'pt';
}

export const PaperPatternCardHeader: React.FC<Props> = ({
  secName, onRename, displaySig, displaySteps, displayBpm, isOverridden,
  onOpenOverrideModal, onRescan, isReusable, onToggleReusable, lang,
}) => {
  const isFr = lang === 'fr';

  return (
    <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5 pb-1 border-b border-black/10">
      <div className="flex items-center gap-1.5">
        <div className="relative flex items-center">
          <input
            type="text"
            value={secName}
            onChange={(e) => onRename?.(e.target.value)}
            placeholder={isFr ? 'Nom section...' : 'Nome seção...'}
            aria-label={isFr ? 'Nom de la section' : 'Nome da seção'}
            className="bg-[#f4ecd8] text-[#1a1a1a] font-bold border border-[#1a1a1a] px-2 pr-5 py-0.5 w-24 sm:w-32 text-xs font-cactus uppercase focus:outline-none focus:ring-2 focus:ring-[#9a3412] shadow-[1px_1px_0px_#1a1a1a]"
          />
          <Pencil size={10} className="absolute right-1.5 text-[#1a1a1a]/50 pointer-events-none" />
        </div>
        <span className={`px-1.5 py-0.2 font-mono text-[9px] font-bold border ${isOverridden ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black' : 'bg-black/10 text-black/80 border-black/30'}`}>
          {displaySig} ({displaySteps}p)
        </span>
        <span className="font-mono text-[9px] text-[#8b2a1a] font-bold">BPM={displayBpm}</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenOverrideModal}
          title={isFr ? 'Modifier ce pattern seul (BPM, Signature)' : 'Ajustar este padrão'}
          className="px-1.5 py-0.5 bg-[#f4ecd8] hover:bg-[#e2d5b8] text-[#1a1a1a] font-bold border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] text-[10px] cursor-pointer flex items-center gap-1 transition-colors"
        >
          <Settings2 size={11} className="text-[#1a1a1a] shrink-0" />
          <span className="font-cactus font-bold text-[9px] text-[#1a1a1a]">{isFr ? 'Mesure / BPM' : 'Compasso / BPM'}</span>
        </button>

        {onRescan && (
          <button
            type="button"
            onClick={onRescan}
            title={isFr ? 'Rescanner ce motif en gros plan' : 'Reescanear este padrão'}
            className="px-1.5 py-0.5 bg-[#f4ecd8] hover:bg-[#e2d5b8] text-[#1a1a1a] font-bold border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] text-[10px] cursor-pointer flex items-center gap-1 transition-colors"
          >
            <Camera size={11} className="text-[#1a1a1a] shrink-0" />
            <span className="font-cactus font-bold text-[9px] text-[#1a1a1a]">{isFr ? 'Rescanner' : 'Reescanear'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleReusable}
          className={`px-1.5 py-0.5 border font-cactus font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
            isReusable ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black shadow-[1px_1px_0px_#000]' : 'bg-[#f4ecd8] !text-[#1a1a1a] border-black/40 hover:bg-[#eaddcf]'
          }`}
        >
          {isReusable ? <Cloud size={11} className="shrink-0" /> : <Pin size={11} className="shrink-0" />}
          <span>{isReusable ? (isFr ? 'Bibliothèque' : 'Biblioteca') : (isFr ? 'Ce morceau' : 'Esta música')}</span>
        </button>
      </div>
    </div>
  );
};
