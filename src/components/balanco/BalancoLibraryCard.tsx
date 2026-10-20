import React from 'react';
import { BalancoPreset } from '../../types/balanco.types';
import { Language } from '../../types';
import { getPresetBadge } from './balancoHelpers';

interface BalancoLibraryCardProps {
  preset: BalancoPreset;
  isActive: boolean;
  canManage: boolean;
  lang: Language;
  onSelect: (id: string) => void;
  onEdit: (p: BalancoPreset) => void;
  onDelete: (p: BalancoPreset) => void;
}

export const BalancoLibraryCard: React.FC<BalancoLibraryCardProps> = ({
  preset: p,
  isActive,
  canManage,
  lang,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const badge = getPresetBadge(p, lang);

  return (
    <div
      className={`flex items-center justify-between gap-2 p-2.5 border rounded-sm transition-colors ${
        isActive
          ? 'bg-[#eaddcf] border-[#8b2a1a] shadow-[2px_2px_0px_#8b2a1a]'
          : 'bg-white border-black/20 hover:border-black shadow-[1px_1px_0px_#000]'
      }`}
    >
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-cactus font-bold text-sm text-[#1a1a1a] truncate">{p.name}</span>
          <span className={`text-[8px] font-bold px-1.5 py-0.2 border rounded-xs uppercase tracking-wider ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        {!p.isFactory && p.authorName && (
          <span className="text-[9px] text-[#1a1a1a]/70 font-semibold truncate">
            {lang === 'fr' ? 'Par ' : 'Por '} {p.authorName}
          </span>
        )}
        <div className="flex items-center gap-1 text-[8px] font-mono mt-1 flex-wrap">
          {p.offsets.map((val, idx) => (
            <span
              key={idx}
              className={`px-1 py-0.2 rounded-xs border ${
                val === 0 ? 'bg-[#f4ecd8] border-black/15 text-stone-700' : val > 0 ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              P{idx + 1}:{val > 0 ? `+${val}%` : `${val}%`}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onSelect(p.id)}
          className={`px-2 py-1 border border-black text-[10px] font-bold cursor-pointer shadow-[1px_1px_0px_#000] transition-colors ${
            isActive ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white text-[#1a1a1a] hover:bg-black hover:text-white'
          }`}
        >
          {isActive ? (lang === 'fr' ? '✓ Actif' : '✓ Ativo') : lang === 'fr' ? '▶ Charger' : '▶ Carregar'}
        </button>
        <button
          type="button"
          onClick={() => onEdit(p)}
          className="px-2 py-1 bg-white border border-black text-[10px] font-bold text-[#1a1a1a] hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
        >
          ✏️
        </button>
        {canManage && (
          <button
            type="button"
            onClick={() => onDelete(p)}
            className="px-1.5 py-1 bg-[#8b2a1a] text-[#f4ecd8] border border-black text-[10px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
};
