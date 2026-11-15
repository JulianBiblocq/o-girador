import React, { useState, useEffect } from 'react';
import { Printer, Camera, Zap, X, Lock, Drum, Mic } from 'lucide-react';
import { PaperTabType } from '../../types/paperWorkshop.types';
import { BlankSheetGeneratorTab } from './BlankSheetGeneratorTab';
import { PaperScannerTab } from './PaperScannerTab';
import { MestreJsonInjectorTab } from './MestreJsonInjectorTab';
import { VocalPaperSequenciadorPanel } from './VocalPaperSequenciadorPanel';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { tPaper, PaperWorkshopI18nKey } from '../../i18n/paperWorkshopTranslations';

export interface PaperWorkshopContentProps {
  onClose: () => void;
  initialTab?: PaperTabType;
  embedded?: boolean;
}

export const PaperWorkshopContent: React.FC<PaperWorkshopContentProps> = ({
  onClose,
  initialTab = 'sheets',
  embedded = false,
}) => {
  const { userProfile } = useAuth();
  const lang = useSequencerStore((state) => state.lang) || 'fr';
  const isPt = lang === 'pt';
  const [workshopMode, setWorkshopMode] = useState<'batuque' | 'vocal'>('batuque');
  const [activeTab, setActiveTab] = useState<PaperTabType>(initialTab);
  const [incomingPreset, setIncomingPreset] = useState<any>(undefined);

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const canImport = isLocalhost || Boolean(
    userProfile?.canWriteSequenciador || userProfile?.role === 'mestre' || userProfile?.role === 'admin' || userProfile?.isSystemAdmin
  );

  useEffect(() => {
    if (!initialTab) return;
    setActiveTab(initialTab);
    if (initialTab === 'scanner') setWorkshopMode('batuque');
  }, [initialTab]);

  const tabs: Array<{ id: PaperTabType; key: PaperWorkshopI18nKey; icon: React.FC<any>; lock: boolean }> = [
    { id: 'sheets', key: 'tabSheets', icon: Printer, lock: false },
    { id: 'scanner', key: 'tabScanner', icon: Camera, lock: false },
    { id: 'reserve', key: 'tabReserve', icon: Zap, lock: !canImport },
  ];

  return (
    <div className={embedded ? 'flex flex-col border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] shadow-[3px_3px_0_var(--cordel-shadow-color)]' : 'flex flex-col flex-1 min-h-0 overflow-hidden'}>
      <div className="flex flex-wrap justify-between items-center gap-2 px-3.5 py-2.5 bg-[var(--cordel-surface-muted)] text-[var(--cordel-text)] border-b-2 border-[var(--cordel-border)] shrink-0">
        {!embedded ? (
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[var(--cordel-accent-readable)]" />
            <h2 className="font-cactus text-lg sm:text-xl font-bold uppercase tracking-wider">
              {tPaper(lang, 'workshopTitle')}
            </h2>
          </div>
        ) : (
          <span className="font-cactus font-bold text-xs uppercase tracking-wider text-[var(--cordel-text-muted)]">
            {isPt ? 'Escolha o suporte manuscrito ou vocal :' : 'Choisissez le support manuscrit ou vocal :'}
          </span>
        )}
        <div className="flex items-center gap-2">
          <div className="inline-flex border-2 border-[var(--cordel-border-strong)] overflow-hidden font-mono text-xs font-bold">
            <button
              type="button" onClick={() => setWorkshopMode('batuque')}
              className={`px-2.5 py-1 flex items-center gap-1.5 cursor-pointer transition-colors ${workshopMode === 'batuque' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)]'}`}
            >
              <Drum className="w-3.5 h-3.5" /><span>{isPt ? 'Partitura Batuque' : 'Partition Batuque'}</span>
            </button>
            <button
              type="button" onClick={() => setWorkshopMode('vocal')}
              className={`px-2.5 py-1 flex items-center gap-1.5 cursor-pointer border-l border-[var(--cordel-border)] transition-colors ${workshopMode === 'vocal' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)]'}`}
            >
              <Mic className="w-3.5 h-3.5" /><span>{isPt ? 'Atelier Papel do Canto (Toada)' : 'Atelier Papier du Chant (Toada)'}</span>
            </button>
          </div>
          {!embedded && (
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)] cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {workshopMode === 'batuque' ? (
        <>
          <div className="flex border-b-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon, isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 px-2 text-center font-cactus font-bold text-xs uppercase border-r border-[var(--cordel-border)] last:border-r-0 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    isActive ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tPaper(lang, tab.key)}</span>
                  {tab.lock && <Lock className="w-3 h-3 ml-0.5 shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className={embedded ? 'p-3.5' : 'p-4 overflow-y-auto flex-1 min-h-0'}>
            {activeTab === 'sheets' && <BlankSheetGeneratorTab lang={lang} />}
            {activeTab === 'scanner' && <PaperScannerTab canImport={canImport} lang={lang} onClose={onClose} initialPreset={incomingPreset} />}
            {activeTab === 'reserve' && (
              <MestreJsonInjectorTab canImport={canImport} lang={lang} onSendToTagBuilder={(p) => { setIncomingPreset(p); setActiveTab('scanner'); }} />
            )}
          </div>
        </>
      ) : (
        <div className={embedded ? 'p-3.5' : 'p-4 overflow-y-auto flex-1 min-h-0'}>
          <VocalPaperSequenciadorPanel lang={lang} onClose={onClose} />
        </div>
      )}
    </div>
  );
};
