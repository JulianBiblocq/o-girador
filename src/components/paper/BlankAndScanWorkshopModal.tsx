/**
 * BlankAndScanWorkshopModal.tsx
 * Modale conteneur Grand Atelier Papier Cordel : Partition Batuque & Atelier Papier du Chant (Toada) (< 130 lignes).
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PaperTabType } from '../../types/paperWorkshop.types';
import { BlankSheetGeneratorTab } from './BlankSheetGeneratorTab';
import { PaperScannerTab } from './PaperScannerTab';
import { MestreJsonInjectorTab } from './MestreJsonInjectorTab';
import { VocalPaperSequenciadorPanel } from './VocalPaperSequenciadorPanel';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Printer, Camera, Zap, X, Lock, Drum, Mic } from 'lucide-react';
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
  const [workshopMode, setWorkshopMode] = useState<'batuque' | 'vocal'>('batuque');
  const [activeTab, setActiveTab] = useState<PaperTabType>(initialTab);

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const canImport = isLocalhost || Boolean(
    userProfile?.canWriteSequenciador || userProfile?.role === 'mestre' || userProfile?.role === 'admin' || (userProfile as any)?.isSystemAdmin
  );

  const [incomingPreset, setIncomingPreset] = useState<any>(undefined);

  useEffect(() => {
    if (isOpen && initialTab) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const modalRoot = (typeof document !== 'undefined' && document.getElementById('modal-root')) || (typeof document !== 'undefined' ? document.body : null);
  if (!modalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[300] flex items-center justify-center p-3 select-none">
      <div className="bg-[var(--cordel-bg,#f4ecd8)] text-[var(--cordel-text,#1a1a1a)] border-4 border-[var(--cordel-border,#1a1a1a)] shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-4xl max-h-[92vh] flex flex-col relative overflow-hidden">
        <div className="flex flex-wrap justify-between items-center gap-2 px-4 py-3 bg-[#1a1a1a] text-[#f4ecd8] border-b-3 border-black">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#d99b26]" />
            <h2 className="font-cactus text-xl sm:text-2xl font-bold uppercase tracking-wider text-[#f4ecd8]">
              {tPaper(lang, 'workshopTitle')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex border-2 border-[#d99b26] rounded overflow-hidden font-mono text-xs font-bold">
              <button
                type="button" onClick={() => setWorkshopMode('batuque')}
                className={`px-2.5 py-1 flex items-center gap-1.5 cursor-pointer ${workshopMode === 'batuque' ? 'bg-[#d99b26] text-black' : 'bg-[#2b2b2b] text-[#f4ecd8]'}`}
              >
                <Drum className="w-3.5 h-3.5" /><span>Partition Batuque</span>
              </button>
              <button
                type="button" onClick={() => setWorkshopMode('vocal')}
                className={`px-2.5 py-1 flex items-center gap-1.5 cursor-pointer ${workshopMode === 'vocal' ? 'bg-[#d99b26] text-black' : 'bg-[#2b2b2b] text-[#f4ecd8]'}`}
              >
                <Mic className="w-3.5 h-3.5" /><span>Atelier Papier du Chant (Toada)</span>
              </button>
            </div>
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center text-xl font-bold text-[#f4ecd8] hover:text-[#d99b26] cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {workshopMode === 'batuque' ? (
          <>
            <div className="flex border-b-2 border-black bg-[#1a1a1a]">
              {[
                { id: 'sheets', key: 'tabSheets' as PaperWorkshopI18nKey, icon: Printer, lock: false },
                { id: 'scanner', key: 'tabScanner' as PaperWorkshopI18nKey, icon: Camera, lock: false },
                { id: 'reserve', key: 'tabReserve' as PaperWorkshopI18nKey, icon: Zap, lock: !canImport },
              ].map((tab) => {
                const Icon = tab.icon, isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id} type="button" onClick={() => setActiveTab(tab.id as PaperTabType)}
                    className={`flex-1 py-2.5 px-2 text-center font-cactus font-bold text-xs uppercase border-r-2 border-black transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      isActive ? 'bg-[#8b2a1a] text-[#f4ecd8] shadow-[inset_0_-2px_0_#d99b26]' : 'bg-[#2b2b2b] text-[#f4ecd8] hover:bg-[#383838]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#f4ecd8]' : 'text-[#d99b26]'}`} />
                    <span>{tPaper(lang, tab.key)}</span>
                    {tab.lock && <Lock className="w-3 h-3 text-[#d99b26] ml-1" />}
                  </button>
                );
              })}
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(92vh-105px)]">
              {activeTab === 'sheets' && <BlankSheetGeneratorTab lang={lang} />}
              {activeTab === 'scanner' && <PaperScannerTab canImport={canImport} lang={lang} onClose={onClose} initialPreset={incomingPreset} />}
              {activeTab === 'reserve' && (
                <MestreJsonInjectorTab canImport={canImport} lang={lang} onSendToTagBuilder={(p) => { setIncomingPreset(p); setActiveTab('scanner'); }} />
              )}
            </div>
          </>
        ) : (
          <div className="p-4 overflow-y-auto max-h-[calc(92vh-65px)]">
            <VocalPaperSequenciadorPanel lang={lang} onClose={onClose} />
          </div>
        )}
      </div>
    </div>,
    modalRoot
  );
};