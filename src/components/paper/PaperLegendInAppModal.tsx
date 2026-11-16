/**
 * Modale de légende d'écriture in-app Cordel avec anti-veille (< 138 lignes).
 */
import React, { useState } from 'react';
import { X, Printer, Eye } from 'lucide-react';
import { useScreenWakeLock } from '../../hooks/useScreenWakeLock';
import { printCompletePaperLegend } from '../../utils/paper/blankSheetPdfExport';
import { PaperLegendStrokesView } from './legend/PaperLegendStrokesView';
import { PaperLegendRulesView } from './legend/PaperLegendRulesView';
import { PaperLegendMasterExampleView } from './legend/PaperLegendMasterExampleView';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'fr' | 'pt';
}

export const PaperLegendInAppModal: React.FC<Props> = ({ isOpen, onClose, lang: propLang }) => {
  const [activeTab, setActiveTab] = useState<'strokes' | 'rules' | 'example'>('strokes');
  const storeLang = useSequencerStore((s) => s.lang);
  const setStoreLang = useSequencerStore((s) => s.setLang);
  const currentLang = storeLang || propLang || 'pt';

  useScreenWakeLock(isOpen);

  if (!isOpen) return null;
  const isFr = currentLang === 'fr';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-[var(--cordel-ink-dark)]/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-4xl max-h-[96vh] sm:max-h-[90vh] bg-[var(--cordel-bg)] border-3 border-[var(--cordel-border-strong)] shadow-[6px_6px_0px_var(--cordel-shadow-color)] flex flex-col overflow-hidden text-[var(--cordel-text)]">
        <div className="flex items-center justify-between p-2.5 sm:px-4 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-b-2 border-[var(--cordel-border-strong)] shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-cactus font-bold text-sm sm:text-base uppercase tracking-wider m-0">
              {isFr ? 'Légende d’Écriture Papier' : 'Legenda de Escrita Papel'}
            </h3>
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-[var(--cordel-ink-dark)]/30 border border-[var(--cordel-on-accent)]/40 text-[9px] font-mono font-bold text-[var(--cordel-on-accent)]">
              <Eye className="w-3 h-3 text-[var(--cordel-status-success)]" />
              <span>{isFr ? 'Écran maintenu actif' : 'Tela sempre ativa'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex border border-[var(--cordel-border-strong)] bg-[var(--cordel-ink-dark)]/25 p-0.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setStoreLang(currentLang === 'fr' ? 'pt' : 'fr'); }}
                className={`px-1.5 py-0.5 text-[10px] font-cactus font-bold cursor-pointer pointer-events-auto relative z-10 ${currentLang === 'fr' ? 'bg-[var(--cordel-on-accent)] text-[var(--cordel-wood)]' : 'text-[var(--cordel-on-accent)]/75'}`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setStoreLang(currentLang === 'pt' ? 'fr' : 'pt'); }}
                className={`px-1.5 py-0.5 text-[10px] font-cactus font-bold cursor-pointer pointer-events-auto relative z-10 ${currentLang === 'pt' ? 'bg-[var(--cordel-on-accent)] text-[var(--cordel-wood)]' : 'text-[var(--cordel-on-accent)]/75'}`}
              >
                BR
              </button>
            </div>

            <button
              type="button"
              onClick={() => printCompletePaperLegend(currentLang)}
              title={isFr ? 'Imprimer PDF A4' : 'Imprimir PDF A4'}
              className="p-1 sm:px-2 sm:py-1 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border-strong)] font-cactus font-bold text-[10px] uppercase flex items-center gap-1 shadow-[1px_1px_0px_var(--cordel-shadow-color)] cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF A4</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-ink-dark)]/40 border border-[var(--cordel-on-accent)]/40 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="sm:hidden flex items-center justify-center gap-1 py-0.5 bg-[var(--cordel-surface)] border-b border-[var(--cordel-border)] text-[9px] font-mono text-[var(--cordel-accent-readable)]">
          <Eye className="w-3 h-3 text-[var(--cordel-status-success)]" />
          <span>{isFr ? 'Anti-veille actif (écran allumé)' : 'Tela sempre ativa'}</span>
        </div>

        <div className="flex border-b-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('strokes')}
            className={`flex-1 py-2 text-center font-cactus font-bold text-xs uppercase cursor-pointer border-r border-[var(--cordel-border)] transition-colors ${
              activeTab === 'strokes' ? 'bg-[var(--cordel-bg)] text-[var(--cordel-accent-readable)]' : 'bg-[var(--cordel-surface-muted)] text-[var(--cordel-text-muted)] hover:bg-[var(--cordel-surface-elevated)]'
            }`}
          >
            {isFr ? '1. Frappes & Pupitres' : '1. Toques & Naipes'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-2 text-center font-cactus font-bold text-xs uppercase cursor-pointer transition-colors ${
              activeTab === 'rules' ? 'bg-[var(--cordel-bg)] text-[var(--cordel-accent-readable)]' : 'bg-[var(--cordel-surface-muted)] text-[var(--cordel-text-muted)] hover:bg-[var(--cordel-surface-elevated)]'
            }`}
          >
            {isFr ? '2. Carreaux & Séquence' : '2. Casas & Sequência'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('example')}
            className={`flex-1 py-2 text-center font-cactus font-bold text-xs uppercase cursor-pointer border-l border-[var(--cordel-border)] transition-colors ${
              activeTab === 'example' ? 'bg-[var(--cordel-bg)] text-[var(--cordel-accent-readable)]' : 'bg-[var(--cordel-surface-muted)] text-[var(--cordel-text-muted)] hover:bg-[var(--cordel-surface-elevated)]'
            }`}
          >
            {isFr ? '3. Exemple 32p' : '3. Exemplo 32p'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'strokes' ? (
            <PaperLegendStrokesView lang={currentLang} />
          ) : activeTab === 'rules' ? (
            <PaperLegendRulesView lang={currentLang} />
          ) : (
            <PaperLegendMasterExampleView lang={currentLang} />
          )}
        </div>
      </div>
    </div>
  );
};
