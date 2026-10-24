
import React from 'react';
import { Zap, Trash2 } from 'lucide-react';
import { DispositionPreset } from '../../../types/disposition.types';
import { formatDispositionSummary } from '../../../utils/dispositionUtils';

interface LoadDispositionItemProps {
  preset: DispositionPreset;
  lang: 'fr' | 'pt';
  isDeletable: boolean;
  isDeleting: boolean;
  onLoad: (preset: DispositionPreset) => void;
  onDelete: (preset: DispositionPreset) => void;
}

export const LoadDispositionItem: React.FC<LoadDispositionItemProps> = ({
  preset,
  lang,
  isDeletable,
  isDeleting,
  onLoad,
  onDelete,
}) => {
  const dateStr = preset.createdAt
    ? new Date(preset.createdAt).toLocaleDateString(
        lang === 'fr' ? 'fr-FR' : 'pt-BR',
        { day: 'numeric', month: 'short', year: 'numeric' }
      )
    : '';
  const summary = formatDispositionSummary(preset.instruments, lang);

  return (
    <div className="bg-[#fdfaf3] border-2 border-[#1a1a1a] p-3 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all flex flex-col gap-2">
      <div className="flex justify-between items-start gap-2">
        <div>
          <h4 className="text-sm md:text-base font-bold text-[#1a1a1a] uppercase leading-tight">
            {preset.name}
          </h4>
          <div className="flex items-center gap-2 text-[10px] text-[#1a1a1a]/60 mt-0.5">
            {dateStr && <span>{dateStr}</span>}
            {preset.authorName && <span>• {preset.authorName}</span>}
            {preset.visibility === 'public' && <span className="text-[#8b2a1a] font-bold">• Public</span>}
            {preset.visibility === 'mestre_group' && <span className="text-[#2e5339] font-bold">• Groupe</span>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => onLoad(preset)}
            className="px-3 py-1 bg-[#2e5339] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer font-bold uppercase text-[11px] flex items-center gap-1"
          >
            <Zap size={12} />
            {lang === 'fr' ? 'Charger' : 'Carregar'}
          </button>

          {isDeletable && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(preset);
              }}
              title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
              className="w-7 h-7 flex items-center justify-center bg-[#8b2a1a]/10 hover:bg-[#8b2a1a] text-[#8b2a1a] hover:text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer text-xs disabled:opacity-50"
            >
              {isDeleting ? '...' : <Trash2 size={13} />}
            </button>
          )}
        </div>
      </div>

      <div className="text-[11px] text-[#1a1a1a]/80 bg-[#ece4d0]/60 p-2 border border-[#1a1a1a]/40 leading-snug">
        <span className="font-bold text-[#8b2a1a]">{lang === 'fr' ? 'Disposition :' : 'Disposição :'}</span>{' '}
        {summary}
        {preset.hasToada && (
          <span className="ml-2 inline-block text-[10px] text-[#2e5339] font-bold">
            [+ {lang === 'fr' ? 'Chant / Toada' : 'Canto / Toada'}]
          </span>
        )}
      </div>
    </div>
  );
};
