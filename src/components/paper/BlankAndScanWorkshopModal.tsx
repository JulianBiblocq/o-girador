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
import { Printer, Camera, Zap, X, Lock } from 'lucide-react';
import { tPaper, PaperWorkshopI18nKey } from '../../i18n/paperWorkshopTranslations';

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
        {/* EN-TÊTE CORDEL HAUT CONTRASTE */}
        <div className="flex justify-between items-center px-4 py-3 bg-[#1a1a1a] text-[#f4ecd8] border-b-3 border-black">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#d99b26]" />
            <h2 className="font-cactus text-2xl font-bold uppercase tracking-wider text-[#f4ecd8]">
              {tPaper(lang, 'workshopTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-xl font-bold text-[#f4ecd8] hover:text-[#d99b26] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 ONGLETS PRINCIPAUX HAUT CONTRASTE */}
        <div className="flex border-b-2 border-black bg-[#1a1a1a]">
          {[
            { id: 'sheets', key: 'tabSheets' as PaperWorkshopI18nKey, icon: Printer, lock: false },
            { id: 'scanner', key: 'tabScanner' as PaperWorkshopI18nKey, icon: Camera, lock: false },
            { id: 'reserve', key: 'tabReserve' as PaperWorkshopI18nKey, icon: Zap, lock: !canImport },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as PaperTabType)}
                className={`flex-1 py-2.5 px-2 text-center font-cactus font-bold text-xs uppercase border-r-2 border-black transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  isActive
                    ? 'bg-[#8b2a1a] text-[#f4ecd8] shadow-[inset_0_-2px_0_#d99b26]'
                    : 'bg-[#2b2b2b] text-[#f4ecd8] hover:bg-[#383838]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#f4ecd8]' : 'text-[#d99b26]'}`} />
                <span>{tPaper(lang, tab.key)}</span>
                {tab.lock && <Lock className="w-3 h-3 text-[#d99b26] ml-1" />}
              </button>
            );
          })}
        </div>

        {/* CONTENU DE L'ONGLET ACTIF */}
        <div className="p-4 overflow-y-auto max-h-[calc(92vh-105px)]">
          {activeTab === 'sheets' && <BlankSheetGeneratorTab lang={lang} />}
          {activeTab === 'scanner' && <PaperScannerTab canImport={canImport} lang={lang} onClose={onClose} />}
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
