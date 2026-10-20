import React from 'react';
import { Copy, Scissors, Clipboard, CopyPlus, Repeat, Trash2, Link, Music } from 'lucide-react';

interface TimelineContextMenuItemsProps {
  hasMultiSelect: boolean;
  selectedCellsCount: number;
  timelineClipboard: any;
  showToadaDeploy: boolean;
  measureIdx: number;
  isOverridden: boolean;
  lang: string;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onRepeat: (count: number) => void;
  onDeployToada: () => void;
  onResetToMaster: () => void;
  onClear: () => void;
}

export const TimelineContextMenuItems: React.FC<TimelineContextMenuItemsProps> = ({
  hasMultiSelect, selectedCellsCount, timelineClipboard, showToadaDeploy, measureIdx,
  isOverridden, lang, onCopy, onCut, onPaste, onDuplicate, onRepeat, onDeployToada,
  onResetToMaster, onClear,
}) => {
  const btnClass = "w-full text-left px-2 py-1.5 font-bold flex items-center justify-between transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs group";

  return (
    <>
      <button type="button" onClick={onCopy} className={btnClass}>
        <div className="flex items-center gap-2"><Copy size={13} className="shrink-0" /><span>{hasMultiSelect ? (lang === 'fr' ? `Copier la sélection (${selectedCellsCount})` : `Copiar seleção (${selectedCellsCount})`) : (lang === 'fr' ? 'Copier' : 'Copiar')}</span></div>
        <span className="text-[9px] font-sans opacity-60 font-semibold group-hover:text-[#f4ecd8]">Ctrl+C</span>
      </button>

      <button type="button" onClick={onCut} className={btnClass}>
        <div className="flex items-center gap-2"><Scissors size={13} className="shrink-0" /><span>{hasMultiSelect ? (lang === 'fr' ? `Couper la sélection (${selectedCellsCount})` : `Recortar seleção (${selectedCellsCount})`) : (lang === 'fr' ? 'Couper' : 'Recortar')}</span></div>
        <span className="text-[9px] font-sans opacity-60 font-semibold group-hover:text-[#f4ecd8]">Ctrl+X</span>
      </button>

      <button type="button" disabled={!timelineClipboard} onClick={onPaste} className={`w-full text-left px-2 py-1.5 font-bold flex items-center justify-between transition-all text-xs group ${timelineClipboard ? 'hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
        <div className="flex items-center gap-2"><Clipboard size={13} className="shrink-0" /><span>{timelineClipboard ? (lang === 'fr' ? `Coller (${timelineClipboard.spanMeasures} mes.)` : `Colar (${timelineClipboard.spanMeasures} comp.)`) : (lang === 'fr' ? 'Coller' : 'Colar')}</span></div>
        <span className="text-[9px] font-sans opacity-60 font-semibold group-hover:text-[#f4ecd8]">Ctrl+V</span>
      </button>

      <div className="my-1 border-b border-[#1a1a1a]/30" />

      {showToadaDeploy && (
        <>
          <button type="button" onClick={onDeployToada} className="w-full text-left px-2 py-1.5 font-bold flex items-center gap-2 transition-all hover:bg-[#9a3412] hover:text-white active:translate-x-0.5 cursor-pointer text-xs text-[#9a3412] bg-[#9a3412]/10">
            <Music size={13} className="shrink-0" />
            <span>{lang === 'fr' ? `Dérouler le tour de Toada ici (dès M${measureIdx + 1})` : `Desenrolar Toada aqui (a partir de M${measureIdx + 1})`}</span>
          </button>
          <div className="my-1 border-b border-[#1a1a1a]/30" />
        </>
      )}

      <button type="button" onClick={onDuplicate} className={btnClass}>
        <div className="flex items-center gap-2"><CopyPlus size={13} className="shrink-0" /><span>{hasMultiSelect ? (lang === 'fr' ? `Dupliquer la sélection (${selectedCellsCount} mes.)` : `Duplicar seleção (${selectedCellsCount} comp.)`) : (lang === 'fr' ? 'Dupliquer' : 'Duplicar')}</span></div>
        <span className="text-[9px] font-sans opacity-60 font-semibold group-hover:text-[#f4ecd8]">Ctrl+D</span>
      </button>

      {!hasMultiSelect && (
        <>
          <button type="button" onClick={() => onRepeat(2)} className="w-full text-left px-2 py-1.5 font-bold flex items-center gap-2 transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs">
            <Repeat size={13} className="shrink-0" /><span>{lang === 'fr' ? 'Répéter ×2' : 'Repetir ×2'}</span>
          </button>
          <button type="button" onClick={() => onRepeat(4)} className="w-full text-left px-2 py-1.5 font-bold flex items-center gap-2 transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs">
            <Repeat size={13} className="shrink-0" /><span>{lang === 'fr' ? 'Répéter ×4' : 'Repetir ×4'}</span>
          </button>
        </>
      )}

      <div className="my-1 border-b border-[#1a1a1a]/30" />

      {!hasMultiSelect && isOverridden && (
        <button type="button" onClick={onResetToMaster} className="w-full text-left px-2 py-1.5 font-bold flex items-center gap-2 transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs text-blue-800 hover:text-[#f4ecd8]">
          <Link size={13} className="shrink-0" /><span>{lang === 'fr' ? 'Suivre le maître' : 'Seguir mestre'}</span>
        </button>
      )}

      <button type="button" onClick={onClear} className="w-full text-left px-2 py-1.5 font-bold flex items-center gap-2 transition-all hover:bg-[#b71515] hover:text-white active:translate-x-0.5 cursor-pointer text-xs text-[#b71515]">
        <Trash2 size={13} className="shrink-0" /><span>{hasMultiSelect ? (lang === 'fr' ? `Effacer la sélection (${selectedCellsCount})` : `Limpar seleção (${selectedCellsCount})`) : (lang === 'fr' ? 'Effacer le motif' : 'Limpar padrão')}</span>
      </button>
    </>
  );
};
