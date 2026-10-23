
import React, { Suspense } from 'react';
import { useWizardStore } from '../../stores/useWizardStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const WizardOverlay = lazyWithRetry(
  () => import('../WizardOverlay').then((m) => ({ default: m.WizardOverlay })),
  'WizardOverlay'
);
const SettingsPage = lazyWithRetry(
  () => import('../SettingsPage').then((m) => ({ default: m.SettingsPage })),
  'SettingsPage'
);
const SpeedTrainerModal = lazyWithRetry(
  () => import('../SpeedTrainerModal').then((m) => ({ default: m.SpeedTrainerModal })),
  'SpeedTrainerModal'
);
const WallpaperShowcaseModal = lazyWithRetry(
  () => import('../WallpaperShowcaseModal').then((m) => ({ default: m.WallpaperShowcaseModal })),
  'WallpaperShowcaseModal'
);
const BlankAndScanWorkshopModal = lazyWithRetry(
  () => import('../paper/BlankAndScanWorkshopModal').then((m) => ({ default: m.BlankAndScanWorkshopModal })),
  'BlankAndScanWorkshopModal'
);

export interface AppModalsOverlayModalsProps {
  lang: string;
  wallpaperProps: any;
  paperWorkshopProps: any;
  mestreSignals: any[];
  changeViewMode: (mode: any) => void;
}

export const AppModalsOverlayModals: React.FC<AppModalsOverlayModalsProps> = React.memo(({
  lang,
  wallpaperProps,
  paperWorkshopProps,
  mestreSignals,
  changeViewMode,
}) => {
  const isSettingsOpen = useSequencerSettingsStore((state) => state.isSettingsOpen);
  const isWizardOpen = useWizardStore((state) => state.isWizardOpen);
  const setWizardOpen = useWizardStore((state) => state.setWizardOpen);

  return (
    <Suspense fallback={null}>
      {isWizardOpen && <WizardOverlay onClose={() => setWizardOpen(false)} lang={lang as any} />}
      {isSettingsOpen && <SettingsPage mestreSignals={mestreSignals} />}
      <SpeedTrainerModal changeViewMode={changeViewMode} />

      <WallpaperShowcaseModal
        isOpen={wallpaperProps.isWallpaperModalOpen}
        onClose={wallpaperProps.closeWallpaperModal}
        currentWallpaper={wallpaperProps.wallpaper}
        onApplyWallpaper={wallpaperProps.setWallpaper}
        isDarkMode={wallpaperProps.isDarkMode}
        onToggleDarkMode={wallpaperProps.toggleDarkMode}
        lang={lang as any}
      />

      {paperWorkshopProps.isPaperWorkshopOpen && (
        <BlankAndScanWorkshopModal
          isOpen={paperWorkshopProps.isPaperWorkshopOpen}
          onClose={() => paperWorkshopProps.setIsPaperWorkshopOpen(false)}
          initialTab={paperWorkshopProps.paperWorkshopInitialTab}
        />
      )}
    </Suspense>
  );
});

AppModalsOverlayModals.displayName = 'AppModalsOverlayModals';
