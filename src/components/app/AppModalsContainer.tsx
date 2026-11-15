
import React, { Suspense } from 'react';
import { TouchStrokeSelector } from '../TouchStrokeSelector';
import { GlobalModalsLayout } from '../GlobalModalsLayout';
import { AppModalsOverlayModals } from './AppModalsOverlayModals';
import { useWizardStore } from '../../stores/useWizardStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const SavePresetModal = lazyWithRetry(
  () => import('../SavePresetModal').then((m) => ({ default: m.SavePresetModal })),
  'SavePresetModal'
);
const NewSongIntroModal = lazyWithRetry(
  () => import('../NewSongIntroModal').then((m) => ({ default: m.NewSongIntroModal })),
  'NewSongIntroModal'
);
const VisitorAuthModal = lazyWithRetry(
  () => import('../VisitorAuthModal').then((m) => ({ default: m.VisitorAuthModal })),
  'VisitorAuthModal'
);

interface AppModalsContainerProps {
  touchSelector: any;
  hoveredStroke: string | null;
  setTouchSelector: (val: any) => void;
  setHoveredStroke: (val: string | null) => void;
  isSavedIndicatorVisible: boolean;
  lang: string;
  theme?: { isDarkMode: boolean; toggleDarkMode: () => void };
  exportProps: any;
  modalLayoutProps: any;
  saveModalProps: any;
  visitorAuthProps: any;
  wallpaperProps: any;
  paperWorkshopProps: {
    isPaperWorkshopOpen: boolean;
    setIsPaperWorkshopOpen: (open: boolean) => void;
    paperWorkshopInitialTab: 'sheets' | 'scanner' | 'reserve';
    setPaperWorkshopInitialTab: (tab: 'sheets' | 'scanner' | 'reserve') => void;
  };
  mestreSignals: any[];
  refreshMestreSignals?: () => void | Promise<void>;
  audio: any;
  sequencer: any;
  changeViewMode: (mode: any) => void;
}

export const AppModalsContainer: React.FC<AppModalsContainerProps> = ({
  touchSelector,
  hoveredStroke,
  setTouchSelector,
  setHoveredStroke,
  isSavedIndicatorVisible,
  lang,
  theme,
  modalLayoutProps,
  saveModalProps,
  visitorAuthProps,
  wallpaperProps,
  paperWorkshopProps,
  mestreSignals,
  refreshMestreSignals,
  audio,
  sequencer,
  changeViewMode,
}) => {
  const isIntroModalOpen = useWizardStore((state) => state.isIntroModalOpen);
  const setIntroModalOpen = useWizardStore((state) => state.setIntroModalOpen);
  const setWizardOpen = useWizardStore((state) => state.setWizardOpen);

  return (
    <>
      {touchSelector && (
        <TouchStrokeSelector
          selector={touchSelector}
          hoveredStroke={hoveredStroke}
          setHoveredStroke={setHoveredStroke}
          onClose={() => { setTouchSelector(null); setHoveredStroke(null); }}
        />
      )}

      <div className={`fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-[11px] font-bold border-2 border-[var(--cordel-border)] shadow-[2px_2px_0_var(--cordel-border)] transition-all duration-300 pointer-events-none ${isSavedIndicatorVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span>{lang === 'pt' ? 'Salvo' : 'Sauvegardé'}</span>
      </div>

      <GlobalModalsLayout {...modalLayoutProps} />

      <Suspense fallback={null}>
        {saveModalProps.showSavePresetModal && saveModalProps.presetDataToSave && (
          <SavePresetModal
            presetData={saveModalProps.presetDataToSave}
            defaultName={saveModalProps.presetDataToSave.metadata?.toada || ''}
            onClose={() => saveModalProps.setShowSavePresetModal(false)}
            lang={lang as any}
          />
        )}

        {isIntroModalOpen && (
          <NewSongIntroModal
            onClose={() => setIntroModalOpen(false)}
            onClearSong={() => { setIntroModalOpen(false); sequencer.handleClear(); }}
            onStartWizard={() => { setIntroModalOpen(false); setWizardOpen(true); }}
            onSelectTemplate={(template) => { setIntroModalOpen(false); useSequencerStore.getState().handleCreateFromTemplate(template, audio); }}
            onOpenPaperScanner={() => {
              setIntroModalOpen(false);
              paperWorkshopProps.setPaperWorkshopInitialTab?.('scanner');
              paperWorkshopProps.setIsPaperWorkshopOpen?.(true);
            }}
            lang={lang as any}
          />
        )}

        {visitorAuthProps.showMandatoryVisitorModal && (
          <VisitorAuthModal lang={lang as any} onClose={() => visitorAuthProps.setShowMandatoryVisitorModal(false)} isMandatory={true} />
        )}
      </Suspense>

      <AppModalsOverlayModals
        lang={lang}
        theme={theme}
        wallpaperProps={wallpaperProps}
        paperWorkshopProps={paperWorkshopProps}
        mestreSignals={mestreSignals}
        refreshMestreSignals={refreshMestreSignals}
        changeViewMode={changeViewMode}
      />
    </>
  );
};
