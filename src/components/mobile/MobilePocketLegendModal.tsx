import React from 'react';
import { X, BookOpen, Eye } from 'lucide-react';
import { useScreenWakeLock } from '../../hooks/useScreenWakeLock';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useGuideStore } from '../../stores/useGuideStore';
import { i18n } from '../../data';
import { ShortcutsGuide } from '../right-sidebar/ShortcutsGuide';

interface MobilePocketLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'fr' | 'pt';
}

export const MobilePocketLegendModal: React.FC<MobilePocketLegendModalProps> = ({
  isOpen,
  onClose,
  lang: propLang,
}) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const setStoreLang = useSequencerStore((s) => s.setLang);
  const isLeftHanded = useSequencerStore((s) => Boolean(s.isLeftHanded));
  const currentLang = storeLang || propLang || 'pt';
  const isFr = currentLang === 'fr';
  const t = (key: string) => (i18n[currentLang] as Record<string, string>)?.[key] || key;

  useScreenWakeLock(isOpen);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-[var(--cordel-ink-dark)]/80 backdrop-blur-xs select-none"
    >
      <div className="w-full max-w-lg h-[92dvh] bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0px_var(--cordel-shadow-color)] flex flex-col overflow-hidden text-[var(--cordel-text)]">
        <div className="px-3 py-2.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-b-2 border-[var(--cordel-border-strong)] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen size={15} className="shrink-0" />
            <span className="font-cactus font-bold text-xs uppercase tracking-wider truncate">
              {isFr ? 'Légende de Poche & Raccourcis' : 'Legenda de Bolso & Atalhos'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex border border-[var(--cordel-border-strong)] bg-[var(--cordel-ink-dark)]/25 text-[10px] font-cactus font-bold">
              <button
                type="button"
                onClick={() => setStoreLang('fr')}
                className={`px-1.5 py-0.5 cursor-pointer ${isFr ? 'bg-[var(--cordel-on-accent)] text-[var(--cordel-wood)]' : 'text-[var(--cordel-on-accent)]/75'}`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setStoreLang('pt')}
                className={`px-1.5 py-0.5 border-l border-[var(--cordel-border-strong)] cursor-pointer ${!isFr ? 'bg-[var(--cordel-on-accent)] text-[var(--cordel-wood)]' : 'text-[var(--cordel-on-accent)]/75'}`}
              >
                BR
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-ink-dark)]/35 border border-[var(--cordel-on-accent)]/40 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="px-3 py-1 bg-[var(--cordel-surface)] border-b border-[var(--cordel-border)] flex items-center justify-between gap-2 text-[9.5px] font-mono text-[var(--cordel-text-muted)] shrink-0">
          <span className="flex items-center gap-1">
            <Eye size={11} className="text-[var(--cordel-status-success)] shrink-0" />
            <span>{isFr ? 'Anti-veille actif' : 'Tela sempre ativa'}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              useGuideStore.getState().openGuide();
            }}
            className="font-cactus font-bold uppercase text-[10px] text-[var(--cordel-accent-readable)] underline cursor-pointer"
          >
            {isFr ? "Mode d'Emploi complet →" : 'Manual completo →'}
          </button>
        </div>

        <div className="flex-1 min-h-0 p-3 flex flex-col overflow-hidden">
          <ShortcutsGuide lang={currentLang} t={t} isLeftHanded={isLeftHanded} />
        </div>
      </div>
    </div>
  );
};
