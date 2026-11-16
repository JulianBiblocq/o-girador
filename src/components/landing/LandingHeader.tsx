import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { GoogleLoginButton } from '../GoogleLoginButton';

interface LandingHeaderProps {
  currentLang: 'fr' | 'pt';
  isManualOpen?: boolean;
  onReturnToApp?: (e?: React.MouseEvent) => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  currentLang,
  isManualOpen = false,
  onReturnToApp,
}) => {
  const isFr = currentLang === 'fr';

  return (
    <header className="w-full relative pt-3 sm:pt-4 px-4 sm:px-6 max-w-7xl mx-auto z-30 flex items-center justify-between gap-3">
      <div>
        {isManualOpen && onReturnToApp && (
          <button
            type="button"
            onClick={onReturnToApp}
            className="px-3 py-1.5 bg-[var(--cordel-surface)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 cordel-wood-shadow-sm cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} className="shrink-0" />
            <span>{isFr ? 'Retour au Sequenciador' : 'Voltar ao Sequenciador'}</span>
          </button>
        )}
      </div>
      <div className="z-40">
        <GoogleLoginButton lang={currentLang} align="right" size="large" />
      </div>
    </header>
  );
};
