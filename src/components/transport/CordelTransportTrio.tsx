/**
 * Trio de transport SVG Cordel [ ⏮ ] [ ▶/⏸ ] [ ⏹ ] (< 115 lignes).
 * 100 % vectoriel monochrome (currentColor), jetons CSS var(--cordel-...) exclusivement,
 * title & aria-label bilingues FR/BR, zéro débordement sur 360px.
 */

import React from 'react';
import { useTransportStore } from '../../stores/useTransportStore';

export interface CordelTransportTrioProps {
  isPlaying: boolean;
  isLoading?: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onRewind: () => void;
  lang: string;
  variant?: 'studio' | 'mobile';
}

export const CordelTransportTrio: React.FC<CordelTransportTrioProps> = ({
  isPlaying,
  isLoading = false,
  onTogglePlay,
  onStop,
  onRewind,
  lang,
  variant = 'studio',
}) => {
  const isPaused = useTransportStore((s) => s.isPaused);
  const isPt = lang === 'pt';

  const rewindLabel = isPt
    ? 'Voltar ao início (Início do loop / Compasso 1) [Home]'
    : 'Retour au début (Début de boucle / Mesure 1) [Home]';
  const playPauseLabel = isLoading
    ? (isPt ? 'Carregando sons...' : 'Chargement des sons...')
    : isPlaying
      ? (isPt ? 'Pausar (Congelar posição) [Espaço]' : 'Pause (Arrêt sur image) [Espace]')
      : isPaused
        ? (isPt ? 'Retomar reprodução [Espaço]' : 'Reprendre la lecture [Espace]')
        : (isPt ? 'Tocar [Espaço]' : 'Lecture [Espace]');
  const stopLabel = isPt
    ? 'Parar (Repouso 12h no compasso atual) [Shift+Espaço]'
    : 'Stop (Repos 12h sur la mesure courante) [Shift+Espace]';

  const isMobile = variant === 'mobile';
  const sideBtnSize = isMobile
    ? 'w-9 min-h-[42px] h-full border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-y-0.5'
    : 'w-7 h-8 sm:w-10 sm:h-10 cordel-border cordel-button';
  const mainBtnSize = isMobile
    ? 'w-12 min-h-[42px] h-full border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-y-0.5'
    : 'w-9 h-9 sm:w-14 sm:h-14 cordel-border cordel-button';

  const mainBtnColor = isLoading
    ? 'bg-[var(--cordel-surface-muted)] text-[var(--cordel-text-muted)] cursor-wait'
    : isPlaying
      ? 'bg-[var(--cordel-gold)] text-[var(--cordel-ink-dark)]'
      : isPaused
        ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] ring-2 ring-[var(--cordel-gold)]'
        : 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:brightness-110';

  const stopBtnColor = isPaused
    ? 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-gold)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
    : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]';

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
      <button
        type="button"
        data-testid="transport-rewind-btn"
        onClick={onRewind}
        title={rewindLabel}
        aria-label={rewindLabel}
        className={`${sideBtnSize} bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] flex items-center justify-center transition-colors shrink-0 cursor-pointer`}
      >
        <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="4" y="5" width="3" height="14" />
          <polygon points="19,5 9,12 19,19" />
        </svg>
      </button>

      <button
        type="button"
        data-testid="transport-play-btn"
        data-tour-id="transport-play-btn"
        onClick={onTogglePlay}
        disabled={isLoading}
        title={playPauseLabel}
        aria-label={playPauseLabel}
        className={`${mainBtnSize} ${mainBtnColor} flex items-center justify-center transition-colors shrink-0 cursor-pointer`}
      >
        {isLoading ? (
          <svg className="w-4 h-4 sm:w-7 sm:h-7 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <circle cx="12" cy="12" r="9" strokeDasharray="28" strokeDashoffset="10" />
          </svg>
        ) : isPlaying ? (
          <svg className="w-4 h-4 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4.5" height="14" />
            <rect x="13.5" y="5" width="4.5" height="14" />
          </svg>
        ) : (
          <svg className="w-4 h-4 sm:w-7 sm:h-7 ml-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="6,4 20,12 6,20" />
          </svg>
        )}
      </button>

      <button
        type="button"
        data-testid="transport-stop-btn"
        onClick={onStop}
        title={stopLabel}
        aria-label={stopLabel}
        className={`${sideBtnSize} ${stopBtnColor} flex items-center justify-center transition-colors shrink-0 cursor-pointer`}
      >
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" />
        </svg>
      </button>
    </div>
  );
};
