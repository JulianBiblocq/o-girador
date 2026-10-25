/**
 * Brique de sequence sortable avec alerte Cordel et resolution de doutes (< 125 lignes).
 */
import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PaperSequenceItem } from '../../../types/paperWorkshop.types';
import { GripVertical, Trash2, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { SequenceTagTempoControl } from './SequenceTagTempoControl';
import { SequenceSectionDoubtResolver } from './SequenceSectionDoubtResolver';

interface Props {
  item: PaperSequenceItem;
  index: number;
  totalCount: number;
  globalBpm: number;
  nextSectionBpm: number;
  usedBpms: number[];
  doubtInfo?: { hasDoubt: boolean; baseName: string; candidates: string[]; duplicateCount?: number };
  onResolveDoubt?: (id: string, candidate: string, applyToAll: boolean) => void;
  onUpdateRepeat: (id: string, delta: number) => void;
  onUpdateTempo: (id: string, updates: Partial<PaperSequenceItem>) => void;
  onRemove: (id: string) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  isDropTargetBefore?: boolean;
  lang?: 'fr' | 'pt';
}

export const SequenceTagItem: React.FC<Props> = ({
  item, index, totalCount, globalBpm, nextSectionBpm, usedBpms, doubtInfo,
  onResolveDoubt, onUpdateRepeat, onUpdateTempo, onRemove, onMove, isDropTargetBefore, lang = 'fr',
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id, data: { type: 'sequence-item', item, index },
  });
  const [isDoubtOpen, setIsDoubtOpen] = useState(false);
  const hasDoubt = Boolean(doubtInfo?.hasDoubt);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative flex items-center">
      {isDropTargetBefore && (
        <div className="absolute -left-1.5 top-0 bottom-0 w-1 bg-[#9a3412] shadow-[0_0_4px_#9a3412] z-20 animate-pulse rounded-full" />
      )}
      <div
        className={`flex items-center gap-1 px-1.5 py-1 select-none transition-all ${
          hasDoubt
            ? 'bg-[#9a3412]/10 border-2 border-[#9a3412] shadow-[2px_2px_0px_#9a3412]'
            : 'bg-[#efe6d0] border border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a]'
        } ${isDragging ? 'opacity-30 scale-95 border-dashed border-[#9a3412]' : ''}`}
      >
        <button
          type="button" {...attributes} {...listeners} style={{ touchAction: 'none' }}
          title={lang === 'fr' ? 'Glisser pour réorganiser' : 'Arraste para reordenar'}
          className="cursor-grab active:cursor-grabbing p-0.5 text-[#1a1a1a] hover:bg-black/10 rounded-xs flex items-center justify-center shrink-0"
        >
          <GripVertical size={13} className="text-[#1a1a1a]" />
        </button>

        {hasDoubt && (
          <button
            type="button" onClick={() => setIsDoubtOpen(!isDoubtOpen)}
            title={lang === 'fr' ? 'Doute de section — cliquez pour résoudre' : 'Dúvida de seção — clique para resolver'}
            className="p-0.5 text-[#9a3412] hover:scale-110 cursor-pointer animate-pulse shrink-0"
          >
            <AlertTriangle size={13} />
          </button>
        )}

        <span
          onClick={() => { if (hasDoubt) setIsDoubtOpen(!isDoubtOpen); }}
          className={`font-cactus font-bold text-xs truncate max-w-[120px] ${hasDoubt ? 'text-[#9a3412] underline decoration-dashed cursor-pointer' : 'text-[#1a1a1a]'}`}
        >
          {item.sectionName.trim() || '...'}
        </span>

        <div className="flex items-center bg-[#e6dec8] border border-[#1a1a1a] px-1 py-0.5 ml-0.5 gap-1">
          <button type="button" onClick={() => onUpdateRepeat(item.id, -1)} className="px-1 text-[10px] font-black text-[#1a1a1a] hover:bg-[#c25e38] hover:text-[#f4ecd8] cursor-pointer transition-colors">-</button>
          <span className="font-extrabold text-[10px] min-w-[18px] text-center text-[#8b2a1a]">x{item.repeatCount}</span>
          <button type="button" onClick={() => onUpdateRepeat(item.id, 1)} className="px-1 text-[10px] font-black text-[#1a1a1a] hover:bg-[#c25e38] hover:text-[#f4ecd8] cursor-pointer transition-colors">+</button>
        </div>

        <SequenceTagTempoControl
          item={item} isLast={index === totalCount - 1} globalBpm={globalBpm}
          nextSectionBpm={nextSectionBpm} usedBpms={usedBpms} onUpdateTempo={onUpdateTempo} lang={lang}
        />

        <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className="p-0.5 text-[#1a1a1a]/75 hover:text-[#1a1a1a] disabled:opacity-25 font-bold cursor-pointer">
          <ArrowLeft size={11} />
        </button>
        <button type="button" onClick={() => onMove(index, 1)} disabled={index === totalCount - 1} className="p-0.5 text-[#1a1a1a]/75 hover:text-[#1a1a1a] disabled:opacity-25 font-bold cursor-pointer">
          <ArrowRight size={11} />
        </button>
        <button type="button" onClick={() => onRemove(item.id)} className="ml-0.5 text-[#8b2a1a] hover:scale-110 cursor-pointer">
          <Trash2 size={12} />
        </button>
      </div>

      {hasDoubt && isDoubtOpen && doubtInfo && (
        <SequenceSectionDoubtResolver
          baseName={doubtInfo.baseName}
          candidates={doubtInfo.candidates}
          duplicateCount={doubtInfo.duplicateCount}
          onResolve={(cand, applyAll) => {
            onResolveDoubt?.(item.id, cand, applyAll);
            setIsDoubtOpen(false);
          }}
          onClose={() => setIsDoubtOpen(false)}
          lang={lang}
        />
      )}
    </div>
  );
};
