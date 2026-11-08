/**
 * Menu tiroir Mobile avec sélecteur de mode, égalisation, [ FR | BR ] et aperçu partition (< 135 lignes).
 */

import React, { useState } from 'react';
import { X, Sliders, Moon, Sun, Monitor, Printer } from 'lucide-react';
import { MobileViewModeSelector } from './MobileViewModeSelector';
import { MobilePartitionPreviewModal } from './MobilePartitionPreviewModal';
import { openAoVivoLabWithActiveTrack } from '../AoVivo/aoVivoStrokeTester';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { tMobile } from '../../i18n/mobileTranslations';

interface Props {
  isOpen: boolean; onClose: () => void;
  masterEQ: { low: number; mid: number; high: number }; setMasterEQ: (eq: { low: number; mid: number; high: number }) => void;
  lang?: 'fr' | 'pt'; onToggleLang?: () => void;
  isDarkMode: boolean; onToggleDarkMode: () => void; onToggleStudio: () => void;
  onOpenPaperWorkshop?: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
  primaryTrackId?: number | null; referenceTrackId?: number | null;
}

const EQ_PROFILES = [
  { id: 'speaker', key: 'speaker' as const, eq: { low: 2.5, mid: -1.5, high: 2.0 } },
  { id: 'room', key: 'room' as const, eq: { low: -3.0, mid: 1.5, high: -1.0 } },
  { id: 'headphone', key: 'headphones' as const, eq: { low: 0, mid: 0, high: 0 } },
  { id: 'focus', key: 'danceFocus' as const, eq: { low: -2.0, mid: 3.0, high: 1.0 } },
];

export const MobileMenuSheet: React.FC<Props> = ({
  isOpen, onClose, masterEQ, setMasterEQ, lang: propLang,
  isDarkMode, onToggleDarkMode, onToggleStudio, primaryTrackId, referenceTrackId,
}) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const lang = storeLang || propLang || 'pt';
  const setStoreLang = useSequencerStore((s) => s.setLang);
  const [isPartitionModalOpen, setIsPartitionModalOpen] = useState(false);

  if (!isOpen) return null;
  const setLang = (l: 'fr' | 'pt') => setStoreLang(l);

  return (
    <>
      <div onClick={(e) => e.target === e.currentTarget && onClose()} className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs select-none">
        <div className="w-full max-w-sm max-h-[88dvh] flex flex-col bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] shadow-[4px_4px_0px_var(--cordel-border)] overflow-hidden text-[var(--cordel-text)]">
          <div className="p-2.5 border-b-2 border-[var(--cordel-border)] flex items-center justify-between bg-[var(--cordel-surface)] shrink-0">
            <span className="font-cactus font-bold text-xs uppercase tracking-wider text-[var(--cordel-text)]">{tMobile(lang, 'toolsMenu')}</span>
            <button type="button" onClick={onClose} className="p-1 text-[var(--cordel-text)] hover:text-[var(--cordel-accent)] active:scale-95 cursor-pointer"><X size={16} /></button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3 custom-scrollbar">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono uppercase text-[var(--cordel-text-muted)] tracking-wider font-bold">{tMobile(lang, 'viewMode')}</span>
              <MobileViewModeSelector lang={lang} />
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--cordel-border)]/40">
              <span className="text-[10px] font-mono uppercase text-[var(--cordel-text-muted)] tracking-wider flex items-center gap-1 font-bold">
                <Sliders size={12} className="text-[var(--cordel-accent)]" /> {tMobile(lang, 'masterEQ')}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {EQ_PROFILES.map((prof) => {
                  const isActive = masterEQ.low === prof.eq.low && masterEQ.mid === prof.eq.mid && masterEQ.high === prof.eq.high;
                  return (
                    <button
                      key={prof.id} type="button" onClick={() => setMasterEQ(prof.eq)}
                      className={`p-2 text-left border-2 transition-all text-[9.5px] font-cactus font-bold uppercase tracking-wider cursor-pointer ${
                        isActive ? 'bg-[var(--cordel-accent)] text-[var(--cordel-parchment-bg)] border-[var(--cordel-border)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]'
                      }`}
                    >
                      {tMobile(lang, prof.key)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--cordel-border)]/40">
              <div className="grid grid-cols-2 gap-2 items-center">
                <div className="flex border-2 border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] overflow-hidden font-mono text-[10px] font-bold h-9">
                  <button
                    type="button" onClick={(e) => { e.stopPropagation(); setLang(lang === 'fr' ? 'pt' : 'fr'); }}
                    className={`flex-1 flex items-center justify-center transition-colors cursor-pointer pointer-events-auto relative z-10 ${lang === 'fr' ? 'bg-[var(--cordel-accent)] text-[var(--cordel-parchment-bg)] font-bold' : 'text-[var(--cordel-card-btn-text)]'}`}
                  >
                    FR
                  </button>
                  <button
                    type="button" onClick={(e) => { e.stopPropagation(); setLang(lang === 'pt' ? 'fr' : 'pt'); }}
                    className={`flex-1 flex items-center justify-center transition-colors border-l border-[var(--cordel-border)] cursor-pointer pointer-events-auto relative z-10 ${lang === 'pt' ? 'bg-[var(--cordel-accent)] text-[var(--cordel-parchment-bg)] font-bold' : 'text-[var(--cordel-card-btn-text)]'}`}
                  >
                    BR
                  </button>
                </div>

                <button
                  type="button" onClick={onToggleDarkMode}
                  className="h-9 px-2 bg-[var(--cordel-card-btn-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-card-btn-text)] font-cactus font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isDarkMode ? <Sun size={13} /> : <Moon size={13} />}
                  {isDarkMode ? tMobile(lang, 'themeLight') : tMobile(lang, 'themeDark')}
                </button>
              </div>

              <button
                type="button" onClick={() => setIsPartitionModalOpen(true)}
                className="p-2 bg-[var(--cordel-card-btn-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-card-btn-text)] font-cactus font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={14} /> {tMobile(lang, 'printScores')}
              </button>

              <button
                type="button" onClick={() => { openAoVivoLabWithActiveTrack(primaryTrackId); onClose(); }}
                className="p-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] font-cactus font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sliders size={14} /> {lang === 'pt' ? 'Labo Posição Ao Vivo (Mobile)' : 'Labo Position Ao Vivo (Mobile)'}
              </button>

              <button
                type="button" onClick={() => { onClose(); onToggleStudio(); }}
                className="p-2.5 bg-[var(--cordel-accent)] text-[var(--cordel-parchment-bg)] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:translate-y-0.5 cursor-pointer"
              >
                <Monitor size={15} /> {lang === 'pt' ? 'Modo Estúdio Completo' : 'Mode Édition Studio'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <MobilePartitionPreviewModal isOpen={isPartitionModalOpen} onClose={() => setIsPartitionModalOpen(false)} primaryTrackId={primaryTrackId} referenceTrackId={referenceTrackId} lang={lang} />
    </>
  );
};
