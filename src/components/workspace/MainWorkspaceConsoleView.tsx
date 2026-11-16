import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { dockSatellite } from '../../utils/satelliteCoordinator';
import { ErrorBoundary } from '../ErrorBoundary';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const ConsoleMixer = lazyWithRetry(
  () => import('../ConsoleMixer').then((m) => ({ default: m.ConsoleMixer })),
  'ConsoleMixer'
);

const renderFallback = (labelFr: string, labelPt: string) => (
  <div className="p-4 border-2 border-[var(--cordel-status-danger)] bg-[var(--cordel-surface)] text-[var(--cordel-status-danger)] m-4 rounded-sm font-mono text-xs shadow-[2px_2px_0_var(--cordel-shadow-color)] z-50">
    <h3 className="font-bold text-sm mb-1">Erreur / Erro</h3>
    <p>Impossible de charger le module "{labelFr}" / Não foi possível carregar o módulo "{labelPt}".</p>
  </div>
);

interface MainWorkspaceConsoleViewProps {
  viewMode: string;
  renderedView: string | null;
  isFadingIn: boolean;
  isMobile: boolean;
  onStepTouchStart?: any;
}

export const MainWorkspaceConsoleView: React.FC<MainWorkspaceConsoleViewProps> = ({
  viewMode,
  renderedView,
  isFadingIn,
  isMobile,
  onStepTouchStart,
}) => {
  const lang = useSequencerStore((state) => state.lang);
  const editingTrackId = useSequencerStore((state) => state.editingTrackId);
  const setEditingTrackId = useSequencerStore((state) => state.setEditingTrackId);
  const isSatelliteOpen = useDesktopWorkspaceStore((state) => state.isSatelliteOpen);
  const satelliteMode = useDesktopWorkspaceStore((state) => state.satelliteMode);

  const isMixerOnSatellite = !isMobile && isSatelliteOpen && satelliteMode === 'mixer';

  return (
    <div style={{ display: viewMode === 'console' ? 'contents' : 'none' }}>
      {!isMixerOnSatellite ? (
        <div
          className={`flex-1 min-w-0 flex flex-col h-full overflow-hidden ${isFadingIn && renderedView === 'console' ? 'fade-in-view' : ''}`}
          style={{ display: viewMode === 'console' ? 'flex' : 'none' }}
        >
          {renderedView === 'console' && (
            <ErrorBoundary fallback={renderFallback('Mixeur Console', 'Mesa de Som')}>
              <ConsoleMixer
                isMobile={isMobile}
                onStepTouchStart={onStepTouchStart}
                isActive={viewMode === 'console'}
                editingTrackId={editingTrackId}
                setEditingTrackId={setEditingTrackId}
              />
            </ErrorBoundary>
          )}
        </div>
      ) : (
        <div
          className="flex-1 min-w-0 flex flex-col h-full overflow-hidden items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] p-6"
          style={{ display: viewMode === 'console' ? 'flex' : 'none' }}
        >
          <p className="mb-4 text-center font-cactus font-bold text-base">
            {lang === 'pt'
              ? 'A Mesa de Som está aberta na Tela 2 (Modo Mixagem).'
              : "La Console de Mixage est ouverte sur l'Écran 2 (Mode Mixage)."}
          </p>
          <button
            type="button"
            onClick={() => dockSatellite({ reanchorToScreen1: true })}
            className="px-4 py-2 border-2 border-[var(--cordel-border-strong)] shadow-[3px_3px_0_var(--cordel-shadow-color)] font-cactus font-bold uppercase text-xs bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)] cursor-pointer transition-colors"
          >
            {lang === 'pt' ? 'Reancorar na Tela 1' : "Ré-ancrer sur l'Écran 1"}
          </button>
        </div>
      )}
    </div>
  );
};
