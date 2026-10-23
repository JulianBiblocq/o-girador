import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
      className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[6px_6px_0px_#1a1a1a] w-full max-w-2xl max-h-[90vh] flex flex-col rounded-none my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] px-4 py-3 bg-[#eaddcf]/60">
          <div>
            <h2 className="font-cactus text-lg sm:text-xl font-bold uppercase tracking-wider text-[#1a1a1a] leading-tight">
              {data.title}
            </h2>
            <p className="text-[11px] font-serif text-[#1a1a1a]/70">{data.subtitle} · {data.lastUpdate}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-[#1a1a1a] text-xs font-cactus">
              <button
                type="button"
                onClick={() => setActiveLang('fr')}
                className={`px-2 py-0.5 ${activeLang === 'fr' ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold' : 'bg-transparent text-[#1a1a1a]'}`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setActiveLang('pt')}
                className={`px-2 py-0.5 border-l border-[#1a1a1a] ${activeLang === 'pt' ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold' : 'bg-transparent text-[#1a1a1a]'}`}
              >
                BR
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] font-bold text-base hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer"
              title={data.closeBtn}
            >
              x
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 font-serif text-xs sm:text-sm leading-relaxed">
          {data.articles.map((art) => (
            <article key={art.id} className="border-b border-[#1a1a1a]/20 pb-4 last:border-0 last:pb-0">
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="font-cactus font-bold text-[#8b2a1a] text-xs tracking-wider uppercase">{art.num}</span>
                <h3 className="font-cactus font-bold text-sm sm:text-base text-[#1a1a1a]">{art.title}</h3>
              </div>
              <div className="space-y-1.5 text-[#1a1a1a]/85">
                {art.content.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="border-t-2 border-[#1a1a1a] px-4 py-2.5 bg-[#eaddcf]/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#8b2a1a] text-[#f4ecd8] font-cactus font-bold text-xs uppercase tracking-wide border border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] cursor-pointer"
          >
            {data.closeBtn}
          </button>
        </div>
      </div>
    </div>,
    target
  );
};
