/**
 * MixerLazyModalsHost.tsx — Hôte paresseux (`React.lazy`) des modales Studio PC de la Console (< 85 lignes).
 * Au repos ou sur Mobile / Mode Pratique : `0` nœud DOM, `0` boucle RAF, `0` souscription Zustand de piste.
 */
import React, { useEffect } from 'react';
import { useBusDynamicsUiStore } from '../../stores/busDynamicsUiStore';
import type { StudioRackModuleId } from './masterEffectsTypes';

const StudioRackModal = React.lazy(() =>
  import('./studio-rack/StudioRackModal').then((m) => ({ default: m.StudioRackModal }))
);

const BusDynamicsModal = React.lazy(() =>
  import('./bus-dynamics/BusDynamicsModal').then((m) => ({ default: m.BusDynamicsModal }))
);

interface MixerLazyModalsHostProps {
  isMobile: boolean;
  isPracticeMode: boolean;
  lang: string;
  isPlaying: boolean;
  studioRackModule: StudioRackModuleId | null;
  onCloseStudioRack: () => void;
  masterEQ: { low: number; mid: number; high: number };
  onMasterEQChange: (eq: { low: number; mid: number; high: number }) => void;
  masterCompressor: { threshold: number; ratio: number };
  onMasterCompressorChange: (comp: { threshold: number; ratio: number }) => void;
}

export const MixerLazyModalsHost: React.FC<MixerLazyModalsHostProps> = ({
  isMobile,
  isPracticeMode,
  lang,
  isPlaying,
  studioRackModule,
  onCloseStudioRack,
  masterEQ,
  onMasterEQChange,
  masterCompressor,
  onMasterCompressorChange,
}) => {
  const activeBusDynamicsTrackId = useBusDynamicsUiStore((s) => s.activeBusDynamicsTrackId);
  const studioAllowed = !isMobile && !isPracticeMode;

  useEffect(() => {
    const ui = useBusDynamicsUiStore.getState();
    ui.setStudioPanelsEnabled(studioAllowed);
    if (!studioAllowed && ui.activeBusDynamicsTrackId !== null) ui.closeBusDynamics();
  }, [studioAllowed]);

  if (!studioAllowed) return null;

  return (
    <>
      {studioRackModule !== null && (
        <React.Suspense fallback={null}>
          <StudioRackModal
            initialTab={studioRackModule}
            lang={lang}
            isPlaying={isPlaying}
            masterEQ={masterEQ}
            onMasterEQChange={onMasterEQChange}
            masterCompressor={masterCompressor}
            onMasterCompressorChange={onMasterCompressorChange}
            onClose={onCloseStudioRack}
          />
        </React.Suspense>
      )}
      {activeBusDynamicsTrackId !== null && (
        <React.Suspense fallback={null}>
          <BusDynamicsModal
            trackId={activeBusDynamicsTrackId}
            lang={lang}
            isPlaying={isPlaying}
            isMobile={isMobile}
            isPracticeMode={isPracticeMode}
          />
        </React.Suspense>
      )}
    </>
  );
};

