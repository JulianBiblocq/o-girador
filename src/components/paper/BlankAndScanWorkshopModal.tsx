/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Modale conteneur Grand Atelier Papier Cordel (< 130 lignes).
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PaperTabType } from '../../types/paperWorkshop.types';
import { BlankSheetGeneratorTab } from './BlankSheetGeneratorTab';
import { PaperScannerTab } from './PaperScannerTab';
import { MestreJsonInjectorTab } from './MestreJsonInjectorTab';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Printer, Camera, Zap, X } from 'lucide-react';

export interface BlankAndScanWorkshopModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PaperTabType;
}

export const BlankAndScanWorkshopModal: React.FC<BlankAndScanWorkshopModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'sheets',
}) => {
  const { userProfile } = useAuth();
  const lang = useSequencerStore((state) => state.lang) || 'fr';
  const [activeTab, setActiveTab] = useState<PaperTabType>(initialTab);

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const canImport = isLocalhost || Boolean(
    userProfile?.canWriteSequenciador || userProfile?.role === 'mestre' || userProfile?.role === 'admin' || (userProfile as any)?.isSystemAdmin
  );

  useEffect(() => {
    if (isOpen && initialTab) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const modalRoot = (typeof document !== 'undefined' && document.getElementById('modal-root')) || (typeof document !== 'undefined' ? document.body : null);
  if (!modalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[300] flex items-center justify-center p-3 select-none">
      <div className="bg-[var(--cordel-bg,#f4ecd8)] text-[var(--cordel-text,#1a1a1a)] border-4 border-[var(--cordel-border,#1a1a1a)] shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-4xl max-h-[92vh] flex flex-col relative overflow-hidden">
        {/* EN-TÊTE CORDEl */}
        <div className="flex justify-between items-center px-4 py-2.5 bg-[var(--cordel-bg)] border-b-3 border-black">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎼</span>
            <h2 className="font-cactus text-2xl font-bold uppercase tracking-wider text-[#1a1a1a]">
              {lang === 'fr' ? 'Grand Atelier Papier Cordel' : 'Grande Oficina de Papel Cordel'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-xl font-bold hover:scale-110 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 ONGLETS PRINCIPAUX */}
        <div className="flex border-b-2 border-black bg-black/5">
          {[
            { id: 'sheets', labelFr: '🖨️ Imprimer Fiches & Légende', labelPt: '🖨️ Imprimir Folhas & Legenda', lock: false },
            { id: 'scanner', labelFr: '📸 Scanner & Assembler', labelPt: '📸 Scanner & Montar', lock: false },
            { id: 'reserve', labelFr: '⚡ Réserve JSON Mestre', labelPt: '⚡ Reserva JSON Mestre', lock: !canImport },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as PaperTabType)}
              className={`flex-1 py-2 px-2 text-center font-cactus font-bold text-xs uppercase border-r-2 border-black transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[var(--cordel-wood,#8b2a1a)] text-[#f4ecd8]'
                  : 'bg-[var(--cordel-bg,#f4ecd8)] text-[#1a1a1a] hover:bg-black/10'
              }`}
            >
              <span>{lang === 'fr' ? tab.labelFr : tab.labelPt}</span>
              {tab.lock && <span className="ml-1 text-[10px]">🔒</span>}
            </button>
          ))}
        </div>

        {/* CONTENU DE L'ONGLET ACTIF */}
        <div className="p-4 overflow-y-auto max-h-[calc(92vh-105px)]">
          {activeTab === 'sheets' && <BlankSheetGeneratorTab lang={lang} />}
          {activeTab === 'scanner' && <PaperScannerTab canImport={canImport} lang={lang} />}
          {activeTab === 'reserve' && (
            <MestreJsonInjectorTab
              canImport={canImport}
              lang={lang}
              onSendToTagBuilder={(p) => {
                setActiveTab('scanner');
              }}
            />
          )}
        </div>
      </div>
    </div>,
    modalRoot
  );
};
