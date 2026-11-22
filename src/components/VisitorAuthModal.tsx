import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getVisitorModalCopy } from '../utils/subscriptionModalCopy';
import type { VisitorModalReason } from '../utils/userAccessPolicy';
import { LegalNoticeModal } from './legal/LegalNoticeModal';
import { XiloClose, XiloInfo } from './XiloIcons';

interface VisitorAuthModalProps {
  onClose: () => void;
  lang: 'fr' | 'pt';
  reason?: VisitorModalReason;
}

export const VisitorAuthModal: React.FC<VisitorAuthModalProps> = ({
  onClose,
  lang,
  reason = 'default',
}) => {
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const { signInWithGoogle } = useAuth();
  const setLang = useSequencerStore((s) => s.setLang);
  const copy = getVisitorModalCopy(lang, reason);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLegalOpen) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose, isLegalOpen]);

  const handleSignIn = async () => {
    await signInWithGoogle();
    onClose();
  };

  const modalRoot = (typeof document !== 'undefined' && (document.getElementById('modal-root') || document.body)) || null;

  const content = (
    <div
      data-wizard-submodal="true"
      data-testid="visitor-auth-modal"
      className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[100050] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border-strong)] p-5 sm:p-7 max-w-md w-full shadow-[8px_8px_0px_var(--cordel-shadow-color)] flex flex-col gap-4 relative my-auto max-h-[95dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b-2 border-[var(--cordel-border)] pb-2.5">
          <div className="inline-flex items-center border-2 border-[var(--cordel-border-strong)] font-mono text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setLang('fr')}
              className={`px-2 py-0.5 cursor-pointer transition-colors ${lang === 'fr' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)]'}`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLang('pt')}
              className={`px-2 py-0.5 border-l border-[var(--cordel-border)] cursor-pointer transition-colors ${lang === 'pt' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)]'}`}
            >
              BR
            </button>
          </div>
          <button
            type="button"
            data-testid="visitor-auth-close-btn"
            aria-label={lang === 'fr' ? 'Fermer' : 'Fechar'}
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-colors cursor-pointer"
          >
            <XiloClose size={15} />
          </button>
        </div>

        <h2 className="font-cactus text-2xl sm:text-3xl font-black text-[var(--cordel-text)] uppercase leading-tight text-center">
          {copy.title}
        </h2>

        {copy.contextBanner && (
          <div className="p-2.5 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] text-xs font-semibold flex items-start gap-2 leading-snug">
            <XiloInfo size={16} className="shrink-0 mt-0.5 text-[var(--cordel-accent-readable)]" />
            <span>{copy.contextBanner}</span>
          </div>
        )}

        <div className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] p-3.5 sm:p-4 text-[var(--cordel-text)]">
          <p className="font-bold mb-2.5 text-sm font-cactus uppercase tracking-wide">{copy.intro}</p>
          <ul className="text-xs sm:text-sm flex flex-col gap-2.5 text-left font-semibold leading-snug">
            {copy.benefits.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <svg viewBox="0 0 12 12" className="w-3 h-3 shrink-0 mt-1 text-[var(--cordel-accent-readable)]" fill="currentColor" aria-hidden="true">
                  <path d="M6 1 L11 6 L6 11 L1 6 Z" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-center gap-2 mt-1">
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full py-3.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] font-cactus font-bold text-sm sm:text-base tracking-wider uppercase text-center border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0px_var(--cordel-shadow-color)] hover:bg-[var(--cordel-accent)] transition-all cursor-pointer"
          >
            {copy.cta}
          </button>
          <p className="text-[11px] text-[var(--cordel-text-muted)] text-center leading-tight mt-1 font-serif">
            {lang === 'fr' ? 'En vous connectant, vous acceptez nos ' : 'Ao entrar, você concorda com nossos '}
            <a
              href="#legal"
              onClick={(e) => { e.preventDefault(); setIsLegalOpen(true); }}
              className="underline hover:text-[var(--cordel-accent-readable)] font-semibold cursor-pointer"
            >
              {lang === 'fr' ? 'CGU et Politique de Confidentialité' : 'Termos de Uso e Política de Privacidade'}
            </a>.
          </p>
        </div>
      </div>
      <LegalNoticeModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} lang={lang} />
    </div>
  );

  return modalRoot ? createPortal(content, modalRoot) : content;
};
