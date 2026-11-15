/**
 * Carte miniature de signal pour la galerie Mestre / Photomaton (< 95 lignes).
 */
import React from 'react';
import { Pencil, Copy, Trash2, Check } from 'lucide-react';
import { CloudRhythmSignal } from '../../../types';
import { tMobile } from '../../../i18n/mobileTranslations';

export type GallerySignalItem = CloudRhythmSignal & { isLocalSignal?: boolean };

interface MobileMestreSignalCardProps {
  sig: GallerySignalItem;
  isSelected: boolean;
  imgSrc: string;
  copiedId: string | null;
  lang: 'fr' | 'pt';
  onSelectSignal: (signal: GallerySignalItem) => void;
  onCopy: (e: React.MouseEvent, sig: GallerySignalItem) => void;
  onDelete: (e: React.MouseEvent, sig: GallerySignalItem) => void;
  onImgError: () => void;
}

export const MobileMestreSignalCard: React.FC<MobileMestreSignalCardProps> = ({
  sig, isSelected, imgSrc, copiedId, lang, onSelectSignal, onCopy, onDelete, onImgError,
}) => {
  const framesCount = sig.frames?.length || sig.beatsCount || 1;
  const sourceBadge = sig.isLocalSignal ? (lang === 'fr' ? 'Local' : 'Local') : 'Cloud';

  return (
    <div
      onClick={() => onSelectSignal(sig)}
      className={`p-1.5 flex flex-col gap-1 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-2 transition-all cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] ${
        isSelected
          ? 'border-[var(--cordel-accent-readable)] ring-2 ring-[var(--cordel-accent-readable)]/35'
          : 'border-[var(--cordel-border)] hover:border-[var(--cordel-accent-readable)]'
      }`}
    >
      <div className="relative aspect-square w-full bg-[var(--cordel-paper-surface)] border border-[var(--cordel-border)] overflow-hidden flex items-center justify-center">
        {imgSrc ? (
          <img src={imgSrc} alt={sig.name} onError={onImgError} className="w-full h-full object-contain" />
        ) : (
          <div className="font-cactus font-bold text-lg text-[var(--cordel-paper-ink)] opacity-45">
            {(sig.name || 'SG').slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="absolute top-1 left-1 px-1 py-0.5 font-mono font-bold text-[9px] bg-[var(--cordel-ink-dark)]/85 text-[var(--cordel-on-accent)]">
          {framesCount > 1 ? `${framesCount}T` : '1T'}
        </span>
        <span className={`absolute top-1 right-1 px-1 py-0.5 font-cactus font-bold text-[8px] uppercase border border-[var(--cordel-border-strong)] ${
          sig.isLocalSignal
            ? 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)]'
            : 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
        }`}>
          {sourceBadge}
        </span>
      </div>

      <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-text)] truncate">
        {sig.name}
      </span>

      <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-[var(--cordel-border)]/30">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelectSignal(sig); }}
          className="flex-1 py-0.5 px-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] border border-[var(--cordel-border)] font-cactus font-bold text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer transition-colors"
          title={tMobile(lang, 'editSignal')}
        >
          <Pencil size={10} /> <span>{tMobile(lang, 'editSignal')}</span>
        </button>

        {sig.cordelOptions && (
          <button
            type="button"
            onClick={(e) => onCopy(e, sig)}
            className={`p-1 border border-[var(--cordel-border)] cursor-pointer transition-colors ${
              copiedId === sig.id
                ? 'bg-[var(--cordel-status-success)] text-[var(--cordel-on-accent)]'
                : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'
            }`}
            title={copiedId === sig.id ? tMobile(lang, 'styleApplied') : tMobile(lang, 'copyStyle')}
          >
            {copiedId === sig.id ? <Check size={11} /> : <Copy size={11} />}
          </button>
        )}

        <button
          type="button"
          onClick={(e) => onDelete(e, sig)}
          className="p-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:bg-[var(--cordel-status-danger)] hover:text-[var(--cordel-on-accent)] border border-[var(--cordel-border)] cursor-pointer transition-colors"
          title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
};
