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
    <div className="bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] p-3 shadow-[3px_3px_0px_var(--cordel-shadow-color)] flex flex-col gap-2">
      <div className="flex justify-between items-start gap-2">
        <div>
          <h4 className="text-sm md:text-base font-bold text-[var(--cordel-text)] uppercase leading-tight">
            {preset.name}
          </h4>
          <div className="flex items-center gap-2 text-[10px] text-[var(--cordel-text-muted)] mt-0.5 font-sans">
            {dateStr && <span>{dateStr}</span>}
            {preset.authorName && <span>• {preset.authorName}</span>}
            {preset.visibility === 'public' && <span className="text-[var(--cordel-accent-readable)] font-bold">• Public</span>}
            {preset.visibility === 'mestre_group' && <span className="text-[var(--cordel-status-success)] font-bold">• {lang === 'fr' ? 'Groupe' : 'Grupo'}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => onLoad(preset)}
            className="px-3 py-1 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors cursor-pointer font-bold uppercase text-[11px] flex items-center gap-1"
          >
            <Zap size={12} />
            {lang === 'fr' ? 'Charger' : 'Carregar'}
          </button>

          {isDeletable && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={(e) => { e.stopPropagation(); onDelete(preset); }}
              title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
              className="w-7 h-7 flex items-center justify-center bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-status-danger)] text-[var(--cordel-accent-readable)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] transition-colors cursor-pointer text-xs disabled:opacity-50"
            >
              {isDeleting ? '...' : <Trash2 size={13} />}
            </button>
          )}
        </div>
      </div>

      <div className="text-[11px] text-[var(--cordel-text)] bg-[var(--cordel-surface-elevated)] p-2 border border-[var(--cordel-border)] leading-snug font-sans">
        <span className="font-bold text-[var(--cordel-accent-readable)]">{lang === 'fr' ? 'Disposition :' : 'Disposição :'}</span>{' '}
        {summary}
        {preset.hasToada && (
          <span className="ml-2 inline-block text-[10px] text-[var(--cordel-status-success)] font-bold">
            [+ {lang === 'fr' ? 'Chant / Toada' : 'Canto / Toada'}]
          </span>
        )}
      </div>
    </div>
  );
};
