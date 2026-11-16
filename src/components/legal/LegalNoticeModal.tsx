import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { LEGAL_NOTICE_FR, LEGAL_NOTICE_BR } from './legalNoticeContent';

interface LegalNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'fr' | 'pt';
}

export const LegalNoticeModal: React.FC<LegalNoticeModalProps> = ({ isOpen, onClose, lang = 'fr' }) => {
  const [activeLang, setActiveLang] = useState<'fr' | 'pt'>(lang);

  useEffect(() => { setActiveLang(lang); }, [lang]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const data = activeLang === 'fr' ? LEGAL_NOTICE_FR : LEGAL_NOTICE_BR;
  const target = typeof document !== 'undefined' ? (document.getElementById('modal-root') || document.body) : null;
  if (!target) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100020] bg-[var(--cordel-ink-dark)]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] shadow-[6px_6px_0px_var(--cordel-shadow-color)] w-full max-w-2xl max-h-[90vh] flex flex-col rounded-none my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[var(--cordel-border-strong)] px-4 py-3 bg-[var(--cordel-surface)]">
          <div>
            <h2 className="font-cactus text-lg sm:text-xl font-bold uppercase tracking-wider text-[var(--cordel-text)] leading-tight">
              {data.title}
            </h2>
            <p className="text-[11px] font-serif text-[var(--cordel-text-muted)]">{data.subtitle} · {data.lastUpdate}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-[var(--cordel-border-strong)] text-xs font-cactus">
              <button
                type="button"
                onClick={() => setActiveLang('fr')}
                className={`px-2 py-0.5 cursor-pointer ${activeLang === 'fr' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] font-bold' : 'bg-transparent text-[var(--cordel-text)]'}`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setActiveLang('pt')}
                className={`px-2 py-0.5 border-l border-[var(--cordel-border-strong)] cursor-pointer ${activeLang === 'pt' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] font-bold' : 'bg-transparent text-[var(--cordel-text)]'}`}
              >
                BR
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center border border-[var(--cordel-border-strong)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer"
              title={data.closeBtn}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 font-serif text-xs sm:text-sm leading-relaxed custom-scrollbar">
          {data.articles.map((art) => (
            <article key={art.id} className="border-b border-[var(--cordel-border)]/40 pb-4 last:border-0 last:pb-0">
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="font-cactus font-bold text-[var(--cordel-accent-readable)] text-xs tracking-wider uppercase">{art.num}</span>
                <h3 className="font-cactus font-bold text-sm sm:text-base text-[var(--cordel-text)]">{art.title}</h3>
              </div>
              <div className="space-y-1.5 text-[var(--cordel-text-muted)]">
                {art.content.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="border-t-2 border-[var(--cordel-border-strong)] px-4 py-2.5 bg-[var(--cordel-surface)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] font-cactus font-bold text-xs uppercase tracking-wide border border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer"
          >
            {data.closeBtn}
          </button>
        </div>
      </div>
    </div>,
    target
  );
};
