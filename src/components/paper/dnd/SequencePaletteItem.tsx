/**
 * Item de palette d'etiquettes glissable (useDraggable) et cliquable (< 65 lignes).
 */
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';

interface Props {
  sec: string | { id: string; name: string };
  onAdd: (sec: string | { id: string; name: string }) => void;
}

export const SequencePaletteItem: React.FC<Props> = ({ sec, onAdd }) => {
  const secName = typeof sec === 'string' ? sec : sec.name;
  const secId = typeof sec === 'string' ? undefined : sec.id;
  const secKey = secId || secName;
  const displayLabel = secName.trim() || '...';

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-tag-${secKey}`,
    data: { type: 'palette', secName, secId },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      onClick={() => onAdd(sec)}
      style={{ touchAction: 'none' }}
      className={`px-2 py-1 bg-[#f4ecd8] hover:bg-[#e6dec8] !text-[#1a1a1a] border-2 border-[#1a1a1a] text-[11px] font-cactus font-extrabold flex items-center gap-1 cursor-grab active:cursor-grabbing select-none transition-colors shadow-[2px_2px_0px_#1a1a1a] ${
        isDragging ? 'opacity-40 scale-95 border-dashed border-[#9a3412]' : ''
      }`}
    >
      <Plus size={11} className="text-[#8b2a1a] font-black stroke-[3] shrink-0 pointer-events-none" />
      <span className="!text-[#1a1a1a] pointer-events-none">{displayLabel}</span>
    </button>
  );
};
