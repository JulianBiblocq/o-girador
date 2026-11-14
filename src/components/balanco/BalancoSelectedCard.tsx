import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';
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
  const badgeTone = selectedPreset.isFactory
    ? 'bg-[var(--cordel-surface-muted)] text-[var(--cordel-text)] border-[var(--cordel-border)]'
    : 'bg-[var(--cordel-status-success)] text-[var(--cordel-on-accent)] border-[var(--cordel-border)]';

  return (
    <div className="flex flex-col gap-2 bg-[var(--cordel-surface-elevated)] p-2.5 border border-[var(--cordel-border)] rounded-sm shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-cactus font-bold text-sm text-[var(--cordel-text)] truncate">
              {selectedPreset.name}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 border rounded-xs uppercase tracking-wider ${badgeTone}`}>
              {badge.label}
            </span>
          </div>
          {!selectedPreset.isFactory && selectedPreset.authorName && (
            <span className="text-[10px] text-[var(--cordel-text-muted)] font-semibold">
              {lang === 'fr' ? 'Par ' : 'Por '} {selectedPreset.authorName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onLoadToCustom(selectedPreset)}
            className="px-2 py-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-card-btn-border)] text-[10px] font-bold hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-colors cursor-pointer shadow-[1px_1px_0px_var(--cordel-shadow-color)] flex items-center gap-1 whitespace-nowrap"
          >
            <Edit3 size={12} className="shrink-0" />
            <span>{lang === 'fr' ? 'Modifier' : 'Editar'}</span>
          </button>
          {canManage && (
            <button
              type="button"
              data-testid="balanco-delete-preset-btn"
              onClick={() => onRequestDelete(selectedPreset)}
              aria-label={lang === 'fr' ? 'Supprimer ce preset' : 'Excluir este preset'}
              title={lang === 'fr' ? 'Supprimer ce preset' : 'Excluir este preset'}
              className="px-1.5 py-1 bg-[var(--cordel-status-danger)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border)] text-[10px] font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-[1px_1px_0px_var(--cordel-shadow-color)] flex items-center justify-center"
            >
              <Trash2 size={14} className="shrink-0" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold bg-[var(--cordel-surface-muted)] px-2 py-1 border border-[var(--cordel-border)] rounded-xs overflow-x-auto">
        <span className="text-[var(--cordel-text-muted)] uppercase text-[8px] font-sans">Offsets :</span>
        {selectedPreset.offsets.map((val, idx) => {
          const safeVal = val ?? 0;
          const pillTone =
            safeVal === 0
              ? 'bg-[var(--cordel-surface)] border-[var(--cordel-border)] text-[var(--cordel-text-muted)]'
              : safeVal > 0
              ? 'bg-[var(--cordel-surface-elevated)] border-[var(--cordel-accent)] text-[var(--cordel-accent-readable)]'
              : 'bg-[var(--cordel-surface-elevated)] border-[var(--cordel-status-success)] text-[var(--cordel-status-success)]';
          return (
            <span key={idx} className={`px-1 py-0.5 rounded-xs border ${pillTone}`}>
              P{idx + 1}: {safeVal > 0 ? `+${safeVal}%` : `${safeVal}%`}
            </span>
          );
        })}
      </div>
    </div>
  );
};
