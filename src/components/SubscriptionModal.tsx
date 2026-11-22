import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getSubscriptionModalCopy } from '../utils/subscriptionModalCopy';
import type { SubscriptionModalReason } from '../utils/userAccessPolicy';
import { XiloClose, XiloMestre } from './XiloIcons';

interface SubscriptionModalProps {
  onClose: () => void;
  lang: 'fr' | 'pt';
  reason?: SubscriptionModalReason;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  onClose,
  lang,
  reason = 'measures_limit',
}) => {
  const setLang = useSequencerStore((s) => s.setLang);
  const copy = getSubscriptionModalCopy(lang, reason);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  const modalRoot = (typeof document !== 'undefined' && (document.getElementById('modal-root') || document.body)) || null;
  const mailtoHref = `mailto:contact@ogirador.com?subject=${encodeURIComponent(copy.mailSubject)}`;

  const content = (
    <div
      data-wizard-submodal="true"
      data-testid="subscription-modal"
      className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[100050] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border-strong)] p-6 sm:p-7 max-w-md w-full shadow-[8px_8px_0px_var(--cordel-shadow-color)] flex flex-col gap-5 relative my-auto"
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
            aria-label={lang === 'fr' ? 'Fermer' : 'Fechar'}
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-colors cursor-pointer"
          >
            <XiloClose size={15} />
          </button>
        </div>

        <div className="text-center flex flex-col items-center gap-2">
          <XiloMestre size={28} className="text-[var(--cordel-accent-readable)]" />
          <h2 className="font-cactus text-2xl sm:text-3xl font-black text-[var(--cordel-text)] uppercase leading-tight">
            {copy.title}
          </h2>
        </div>

        <div className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] p-4 text-center font-semibold text-sm text-[var(--cordel-text)] flex flex-col gap-2.5 leading-snug">
          <p>{copy.primaryText}</p>
          <p className="text-[var(--cordel-accent-readable)] font-bold">{copy.secondaryText}</p>
        </div>

        <div className="flex justify-center">
          <a
            href={mailtoHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] font-cactus font-bold text-sm sm:text-base tracking-wider uppercase text-center border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0px_var(--cordel-shadow-color)] hover:bg-[var(--cordel-accent)] transition-all"
          >
            {copy.ctaLabel}
          </a>
        </div>

        <p className="text-xs text-center font-semibold text-[var(--cordel-text-muted)]">
          {copy.footerHint}
        </p>
      </div>
    </div>
  );

  return modalRoot ? createPortal(content, modalRoot) : content;
};
