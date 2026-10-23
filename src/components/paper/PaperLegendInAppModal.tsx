/**
 * Modale de légende d'écriture in-app Cordel avec anti-veille (< 130 lignes).
 */
import React, { useState } from 'react';
import { X, Printer, Eye } from 'lucide-react';
import { useScreenWakeLock } from '../../hooks/useScreenWakeLock';
import { printCompletePaperLegend } from '../../utils/paper/blankSheetPdfExport';
import { PaperLegendStrokesView } from './legend/PaperLegendStrokesView';
import { PaperLegendRulesView } from './legend/PaperLegendRulesView';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'fr' | 'pt';
}

export const PaperLegendInAppModal: React.FC<Props> = ({ isOpen, onClose, lang: propLang }) => {
  const [activeTab, setActiveTab] = useState<'strokes' | 'rules'>('strokes');
  const storeLang = useSequencerStore((s) => s.lang);
  const setStoreLang = useSequencerStore((s) => s.setLang);
  const currentLang = storeLang || propLang || 'pt';

  // Maintien actif de l'écran du smartphone tant que la légende est consultée
  useScreenWakeLock(isOpen);

  if (!isOpen) return null;
  const isFr = currentLang === 'fr';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-4xl max-h-[96vh] sm:max-h-[90vh] bg-[#f4ecd8] border-3 border-black shadow-[6px_6px_0px_#000] flex flex-col overflow-hidden text-[#1a1a1a]">
        
        {/* En-tête Cordel */}
        <div className="flex items-center justify-between p-2.5 sm:px-4 bg-[#8b2a1a] text-[#f4ecd8] border-b-2 border-black shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-cactus font-bold text-sm sm:text-base uppercase tracking-wider m-0">
              {isFr ? 'Légende d’Écriture Papier' : 'Legenda de Escrita Papel'}
            </h3>
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-black/30 border border-[#f4ecd8]/40 text-[9px] font-mono font-bold text-[#f4ecd8]">
              <Eye className="w-3 h-3 text-[#2a9d8f]" />
              <span>{isFr ? 'Écran maintenu actif' : 'Tela sempre ativa'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Commutateur de langue FR | BR */}
            <div className="flex border border-black bg-black/20 p-0.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setStoreLang(currentLang === 'fr' ? 'pt' : 'fr'); }}
                className={`px-1.5 py-0.5 text-[10px] font-cactus font-bold cursor-pointer pointer-events-auto relative z-10 ${currentLang === 'fr' ? 'bg-[#f4ecd8] text-[#8b2a1a]' : 'text-[#f4ecd8]/70'}`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setStoreLang(currentLang === 'pt' ? 'fr' : 'pt'); }}
                className={`px-1.5 py-0.5 text-[10px] font-cactus font-bold cursor-pointer pointer-events-auto relative z-10 ${currentLang === 'pt' ? 'bg-[#f4ecd8] text-[#8b2a1a]' : 'text-[#f4ecd8]/70'}`}
              >
                BR
              </button>
            </div>

            {/* Impression A4 directe */}
            <button
              type="button"
              onClick={() => printCompletePaperLegend(currentLang)}
              title={isFr ? 'Imprimer PDF A4' : 'Imprimir PDF A4'}
              className="p-1 sm:px-2 sm:py-1 bg-white text-black border border-black font-cactus font-bold text-[10px] uppercase flex items-center gap-1 shadow-[1px_1px_0px_#000] cursor-pointer hover:bg-black hover:text-white"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF A4</span>
            </button>

            {/* Fermeture */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#f4ecd8] hover:bg-black/40 border border-[#f4ecd8]/40 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Indicateur mobile anti-veille */}
        <div className="sm:hidden flex items-center justify-center gap-1 py-0.5 bg-black/10 border-b border-black/20 text-[9px] font-mono text-[#8b2a1a]">
          <Eye className="w-3 h-3 text-[#2a9d8f]" />
          <span>{isFr ? 'Anti-veille actif (écran allumé)' : 'Tela sempre ativa'}</span>
        </div>

        {/* Onglets de navigation */}
        <div className="flex border-b-2 border-black bg-black/5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('strokes')}
            className={`flex-1 py-2 text-center font-cactus font-bold text-xs uppercase cursor-pointer border-r border-black transition-colors ${
              activeTab === 'strokes' ? 'bg-[#f4ecd8] text-[#8b2a1a] shadow-inner' : 'bg-black/10 text-black/60 hover:bg-black/5'
            }`}
          >
            {isFr ? '1. Frappes & Pupitres' : '1. Toques & Naipes'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-2 text-center font-cactus font-bold text-xs uppercase cursor-pointer transition-colors ${
              activeTab === 'rules' ? 'bg-[#f4ecd8] text-[#8b2a1a] shadow-inner' : 'bg-black/10 text-black/60 hover:bg-black/5'
            }`}
          >
            {isFr ? '2. Carreaux & Séquence' : '2. Casas & Sequência'}
          </button>
        </div>

        {/* Corps défilable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'strokes' ? (
            <PaperLegendStrokesView lang={currentLang} />
          ) : (
            <PaperLegendRulesView lang={currentLang} />
          )}
        </div>
      </div>
    </div>
  );
};
