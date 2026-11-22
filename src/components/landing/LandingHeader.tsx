import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { GoogleLoginButton } from '../GoogleLoginButton';

interface LandingHeaderProps {
  currentLang: 'fr' | 'pt';
  onLanguageSelect: (lang: 'fr' | 'pt') => void;
  isManualOpen?: boolean;
  onReturnToApp?: (e?: React.MouseEvent) => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  currentLang,
  onLanguageSelect,
  isManualOpen = false,
  onReturnToApp,
}) => {
  const isFr = currentLang === 'fr';
  const hasSeenWelcome =
    typeof window !== 'undefined' && localStorage.getItem('ogirador_has_seen_welcome') === 'true';
  const showReturnBtn = Boolean((isManualOpen || hasSeenWelcome) && onReturnToApp);

  const langBtnBase =
    'px-2.5 sm:px-3 h-[34px] font-cactus font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors flex items-center justify-center';
  const langActive = 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]';
  const langIdle =
    'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]';

  return (
    <header className="w-full relative bg-transparent px-4 sm:px-6 pt-3 sm:pt-4 pb-0 z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div>
          {showReturnBtn && (
            <button
              type="button"
              onClick={onReturnToApp}
              className="px-3 h-[34px] bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 cordel-wood-shadow-sm cursor-pointer transition-colors"
            >
              <ArrowLeft size={14} className="shrink-0 stroke-current" />
              <span>{isFr ? 'Retour à la Roda' : 'Voltar à Roda'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 z-40">
          <div
            role="group"
            aria-label={isFr ? 'Langue' : 'Idioma'}
            className="inline-flex border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface-elevated)] cordel-wood-shadow-sm overflow-hidden select-none"
          >
            <button
              type="button"
              onClick={() => onLanguageSelect('fr')}
              className={`${langBtnBase} ${isFr ? langActive : langIdle}`}
              aria-pressed={isFr}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => onLanguageSelect('pt')}
              className={`${langBtnBase} border-l-2 border-[var(--cordel-border-strong)] ${!isFr ? langActive : langIdle}`}
              aria-pressed={!isFr}
            >
              BR
            </button>
          </div>

          <GoogleLoginButton lang={currentLang} align="right" size="normal" />
        </div>
      </div>
    </header>
  );
};
