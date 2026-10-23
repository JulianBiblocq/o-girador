/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Carte miniature de signal pour la galerie mobile Mestre (< 70 lignes).
 */

import React from 'react';
import { Pencil, Copy, Trash2, Check } from 'lucide-react';
import { CloudRhythmSignal } from '../../../types';
import { tMobile } from '../../../i18n/mobileTranslations';

interface MobileMestreSignalCardProps {
  sig: CloudRhythmSignal;
  isSelected: boolean;
  imgSrc: string;
  copiedId: string | null;
  lang: 'fr' | 'pt';
  onSelectSignal: (signal: CloudRhythmSignal) => void;
  onCopy: (e: React.MouseEvent, sig: CloudRhythmSignal) => void;
  onDelete: (e: React.MouseEvent, sig: CloudRhythmSignal) => void;
  onImgError: () => void;
}

export const MobileMestreSignalCard: React.FC<MobileMestreSignalCardProps> = ({
  sig, isSelected, imgSrc, copiedId, lang, onSelectSignal, onCopy, onDelete, onImgError
}) => {
  const framesCount = sig.frames?.length || sig.beatsCount || 1;

  return (
    <div
      onClick={() => onSelectSignal(sig)}
      className={`p-1.5 flex flex-col gap-1 bg-[var(--cordel-surface)] border-2 transition-all cursor-pointer shadow-[2px_2px_0px_var(--cordel-border)] ${
        isSelected ? 'border-[#8b2a1a] ring-2 ring-[#8b2a1a]/30' : 'border-[var(--cordel-border)] hover:border-[#8b2a1a]'
      }`}
    >
      <div className="relative aspect-square w-full bg-[var(--cordel-card-btn-bg)] border border-[var(--cordel-border)] overflow-hidden flex items-center justify-center">
        {imgSrc ? (
          <img src={imgSrc} alt={sig.name} onError={onImgError} className="w-full h-full object-contain" />
        ) : (
          <div className="font-cactus font-bold text-lg text-[var(--cordel-text)] opacity-40">
            {sig.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="absolute top-1 left-1 px-1 py-0.5 font-mono font-bold text-[9px] bg-black/75 text-white">
          {framesCount > 1 ? `${framesCount}T` : '1T'}
        </span>
      </div>

      <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-text)] truncate">
        {sig.name}
      </span>

      <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-[var(--cordel-border)]/30">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelectSignal(sig); }}
          className="flex-1 py-0.5 px-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-border)] font-cactus font-bold text-[10px] uppercase flex items-center justify-center gap-1 hover:border-[#8b2a1a]"
          title={tMobile(lang, 'editSignal')}
        >
          <Pencil size={10} /> <span>{tMobile(lang, 'editSignal')}</span>
        </button>

        {sig.cordelOptions && (
          <button
            type="button"
            onClick={(e) => onCopy(e, sig)}
            className={`p-1 border border-[var(--cordel-border)] cursor-pointer ${
              copiedId === sig.id ? 'bg-[#15803d] text-white' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:border-[#8b2a1a]'
            }`}
            title={copiedId === sig.id ? tMobile(lang, 'styleApplied') : tMobile(lang, 'copyStyle')}
          >
            {copiedId === sig.id ? <Check size={11} /> : <Copy size={11} />}
          </button>
        )}

        <button
          type="button"
          onClick={(e) => onDelete(e, sig)}
          className="p-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:text-red-600 border border-[var(--cordel-border)] cursor-pointer"
          title="Supprimer"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
};
