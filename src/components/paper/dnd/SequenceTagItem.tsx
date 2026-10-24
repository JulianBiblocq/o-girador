/**
 * Brique de sequence sortable avec poignee GripVertical et boutons de controle (< 90 lignes).
 */
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PaperSequenceItem } from '../../../types/paperWorkshop.types';
import { GripVertical, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';

interface Props {
  item: PaperSequenceItem;
  index: number;
  totalCount: number;
  onUpdateRepeat: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  isDropTargetBefore?: boolean;
}

export const SequenceTagItem: React.FC<Props> = ({
  item, index, totalCount, onUpdateRepeat, onRemove, onMove, isDropTargetBefore,
}) => {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({
    id: item.id,
    data: { type: 'sequence-item', item, index },
  });

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
        className={`flex items-center gap-1 px-1.5 py-1 bg-[#efe6d0] border border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] select-none transition-all ${
          isDragging ? 'opacity-30 scale-95 border-dashed border-[#9a3412]' : ''
        }`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          style={{ touchAction: 'none' }}
          title="Glisser pour réorganiser"
          className="cursor-grab active:cursor-grabbing p-0.5 text-[#1a1a1a] hover:bg-black/10 rounded-xs flex items-center justify-center shrink-0"
        >
          <GripVertical size={13} className="text-[#1a1a1a]" />
        </button>

        <span className="font-cactus font-bold text-xs text-[#1a1a1a] truncate max-w-[120px]">
          {item.sectionName.trim() || '...'}
        </span>

        <div className="flex items-center bg-[#e6dec8] border border-[#1a1a1a] px-1 py-0.5 ml-1 gap-1">
          <button type="button" onClick={() => onUpdateRepeat(item.id, -1)} className="px-1 text-[10px] font-black text-[#1a1a1a] hover:bg-[#c25e38] hover:text-[#f4ecd8] cursor-pointer transition-colors">-</button>
          <span className="font-extrabold text-[10px] min-w-[18px] text-center text-[#8b2a1a]">×{item.repeatCount}</span>
          <button type="button" onClick={() => onUpdateRepeat(item.id, 1)} className="px-1 text-[10px] font-black text-[#1a1a1a] hover:bg-[#c25e38] hover:text-[#f4ecd8] cursor-pointer transition-colors">+</button>
        </div>

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
    </div>
  );
};
