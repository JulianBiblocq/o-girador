/**
 * PolarityInvertButton.tsx — Bouton `[ Ø ]` d'inversion de polarité 180° (Pistes ET Bus / Link / Toada) (< 50 lignes).
 * Sélecteur atomique booléen par `trackId` : seul ce bouton se re-rend au basculement.
 */
import React, { useCallback } from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { getBusDynamicsStrings } from './busDynamicsI18n';

interface PolarityInvertButtonProps {
  trackId: number;
  lang: string;
}

const PolarityInvertButtonComponent: React.FC<PolarityInvertButtonProps> = ({ trackId, lang }) => {
  const inverted = useSequencerStore(useCallback((s) => Boolean(s.tracks.find((t) => t.id === trackId)?.phaseInverted), [trackId]));
  const s = getBusDynamicsStrings(lang);

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().toggleTrackPhaseInvert(trackId); }}
      aria-pressed={inverted}
      aria-label={s.polarityTitle}
      title={inverted ? s.polarityActiveTitle : s.polarityTitle}
      className={`w-7 shrink-0 h-full cordel-border-sm flex items-center justify-center rounded-sm cursor-pointer ${
        inverted
          ? 'bg-[var(--polarity-active-bg)] text-[var(--polarity-active-text)] border-[var(--polarity-active-bg)]'
          : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="pointer-events-none">
        <circle cx="12" cy="12" r="7" />
        <path d="M5 19 L19 5" />
      </svg>
    </button>
  );
};

export const PolarityInvertButton = React.memo(PolarityInvertButtonComponent);

