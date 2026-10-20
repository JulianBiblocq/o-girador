import React from 'react';
import { BalancoPreset } from '../../types/balanco.types';
import { Language } from '../../types';
import { getPresetBadge } from './balancoHelpers';

interface BalancoSelectedCardProps {
  selectedPreset: BalancoPreset;
  canManage: boolean;
  lang: Language;
  onLoadToCustom: (p: BalancoPreset) => void;
  onRequestDelete: (p: BalancoPreset) => void;
}

export const BalancoSelectedCard: React.FC<BalancoSelectedCardProps> = ({
  selectedPreset,
  canManage,
  lang,
  onLoadToCustom,
  onRequestDelete,
}) => {
  const badge = getPresetBadge(selectedPreset, lang);

  return (
    <div className="flex flex-col gap-2 bg-[#f4ecd8] p-2.5 border border-black/20 rounded-sm shadow-[1px_1px_0px_#000]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-cactus font-bold text-sm text-[#1a1a1a]">{selectedPreset.name}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.2 border rounded-xs uppercase tracking-wider ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          {!selectedPreset.isFactory && selectedPreset.authorName && (
            <span className="text-[10px] text-[#1a1a1a]/70 font-semibold">
              {lang === 'fr' ? 'Par ' : 'Por '} {selectedPreset.authorName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onLoadToCustom(selectedPreset)}
            className="px-2 py-1 bg-white text-[#1a1a1a] border border-black text-[10px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] flex items-center gap-1 whitespace-nowrap"
          >
            ✏️ {lang === 'fr' ? 'Modifier' : 'Editar'}
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => onRequestDelete(selectedPreset)}
              className="px-1.5 py-1 bg-[#8b2a1a] text-[#f4ecd8] border border-black text-[10px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold bg-[#eaddcf]/60 px-2 py-1 border border-black/10 rounded-xs overflow-x-auto">
        <span className="text-[#1a1a1a]/60 uppercase text-[8px] font-sans">Offsets :</span>
        {selectedPreset.offsets.map((val, idx) => (
          <span
            key={idx}
            className={`px-1 py-0.2 rounded-xs border ${
              val === 0
                ? 'bg-white/70 border-black/15 text-stone-700'
                : val > 0
                ? 'bg-amber-100/90 border-amber-400 text-amber-900'
                : 'bg-emerald-100/90 border-emerald-400 text-emerald-900'
            }`}
          >
            P{idx + 1}: {val > 0 ? `+${val}%` : `${val}%`}
          </span>
        ))}
      </div>
    </div>
  );
};
