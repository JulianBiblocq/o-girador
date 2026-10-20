import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { ErrorBoundary } from '../ErrorBoundary';
import { Mixer } from '../Mixer';
import { RightSidebar } from '../RightSidebar';
import { WindowPortal } from '../WindowPortal';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const CircleSequencer = lazyWithRetry(() => import('../CircleSequencer').then(m => ({ default: m.CircleSequencer })), 'CircleSequencer');
const DawLinearSequencer = lazyWithRetry(() => import('../DawLinearSequencer').then(m => ({ default: m.DawLinearSequencer })), 'DawLinearSequencer');

const renderFallback = (labelFr: string, labelPt: string) => (
  <div className="p-4 border-2 border-red-500 bg-red-100 text-red-700 m-4 rounded-sm font-mono text-xs shadow-[2px_2px_0_rgba(0,0,0,1)] z-50">
    <h3 className="font-bold text-sm mb-1">❌ Erreur / Erro</h3>
    <p>Impossible de charger le module "{labelFr}" / Não foi possível carregar o módulo "{labelPt}".</p>
  </div>
);

interface MainWorkspaceRodaViewProps {
  viewMode: string;
  renderedView: string | null;
  isFadingIn: boolean;
  isMobile: boolean;
  mobileTab: string;
  filteredMestreSignals: any[];
  refreshMestreSignals: () => void;
  hideGlobalSignals: boolean;
  onToggleHideGlobalSignals: () => void;
  onStepTouchStart?: any;
  activeRightPanel: any;
  onToggleRightPanel: any;
}

export const MainWorkspaceRodaView: React.FC<MainWorkspaceRodaViewProps> = ({
  viewMode,
  renderedView,
  isFadingIn,
  isMobile,
  mobileTab,
  filteredMestreSignals,
  refreshMestreSignals,
  hideGlobalSignals,
  onToggleHideGlobalSignals,
  onStepTouchStart,
  activeRightPanel,
  onToggleRightPanel,
}) => {
  const lang = useSequencerStore((state) => state.lang);
  const setEditingTrackId = useSequencerStore((state) => state.setEditingTrackId);
  const isTracksCollapsed = useSequencerStore((state) => state.isTracksCollapsed);
  const isLinearDawDetached = useSequencerStore((state) => state.isLinearDawDetached);
  const isCircleSequencerDetached = useSequencerStore((state) => state.isCircleSequencerDetached);
  const toggleLinearDawDetached = useSequencerStore((state) => state.toggleLinearDawDetached);
  const toggleCircleSequencerDetached = useSequencerStore((state) => state.toggleCircleSequencerDetached);

  return (
    <div
      style={{ display: viewMode === 'roda' ? 'flex' : 'none' }}
      className={`flex flex-1 min-h-0 min-w-0 w-full h-full mobile-stack ${isFadingIn && renderedView === 'roda' ? 'fade-in-view' : ''}`}
    >
      {isLinearDawDetached && (
        <WindowPortal onClose={toggleLinearDawDetached} title="Pistes - o-girador" width={1024} height={768}>
          <div className="w-full h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden flex flex-col cordel-bg">
            <DawLinearSequencer isActive={true} mestreSignals={filteredMestreSignals} onStepTouchStart={onStepTouchStart} />
          </div>
        </WindowPortal>
      )}

      {isCircleSequencerDetached && (
        <WindowPortal onClose={toggleCircleSequencerDetached} panelKey="roda" title="Roda - o-girador" width={1024} height={768}>
          <div className="w-full h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden flex flex-col cordel-bg">
            <CircleSequencer isMobile={false} mestreSignals={filteredMestreSignals} onStepTouchStart={onStepTouchStart} isActive={true} />
          </div>
        </WindowPortal>
      )}

      {!isMobile && !isTracksCollapsed ? (
        <div style={{ display: (!isMobile || mobileTab === 'roda') ? 'contents' : 'none' }}>
          {!isLinearDawDetached ? (
            <ErrorBoundary fallback={renderFallback('Séquenceur', 'Sequenciador')}>
              <DawLinearSequencer isActive={viewMode === 'roda' && (!isMobile || mobileTab === 'roda')} mestreSignals={filteredMestreSignals} onStepTouchStart={onStepTouchStart} />
            </ErrorBoundary>
          ) : (
            <div className="flex-1 min-w-0 flex flex-col justify-center items-center p-4">
              <p className="mb-4 text-center">{lang === 'fr' ? 'Les pistes sont détachées dans une autre fenêtre.' : 'As pistas estão separadas em outra janela.'}</p>
              <button onClick={toggleLinearDawDetached} className="btn-cordel px-4 py-2 border-2 border-[var(--cordel-text)] rounded shadow-[4px_4px_0_var(--cordel-text)] font-bold bg-[var(--cordel-bg)] text-[var(--cordel-text)] transition-colors hover:opacity-80">
                {lang === 'fr' ? 'Rattacher' : 'Reanexar'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: (!isMobile || mobileTab === 'mixer') ? 'contents' : 'none' }}>
            <ErrorBoundary fallback={renderFallback('Mixeur', 'Mixador')}>
              <Mixer onStepTouchStart={onStepTouchStart} isActive={viewMode === 'roda' && (!isMobile || mobileTab === 'mixer')} setEditingTrackId={setEditingTrackId} isMobile={isMobile} />
            </ErrorBoundary>
          </div>
          <div style={{ display: (!isMobile || mobileTab === 'roda') ? 'contents' : 'none' }}>
            {!isCircleSequencerDetached ? (
              <ErrorBoundary fallback={renderFallback('Séquenceur', 'Sequenciador')}>
                <CircleSequencer isMobile={isMobile} mestreSignals={filteredMestreSignals} onStepTouchStart={onStepTouchStart} isActive={viewMode === 'roda' && (!isMobile || mobileTab === 'roda')} />
              </ErrorBoundary>
            ) : (
              <div className="flex-1 min-w-0 flex flex-col justify-center items-center p-4">
                <p className="mb-4 text-center">{lang === 'fr' ? 'La Roda est détachée dans une autre fenêtre.' : 'A Roda está separada em outra janela.'}</p>
                <button onClick={toggleCircleSequencerDetached} className="btn-cordel px-4 py-2 border-2 border-[var(--cordel-text)] rounded shadow-[4px_4px_0_var(--cordel-text)] font-bold bg-[var(--cordel-bg)] text-[var(--cordel-text)] transition-colors hover:opacity-80">
                  {lang === 'fr' ? 'Rattacher' : 'Reanexar'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ display: (!isMobile || mobileTab === 'toada') ? 'contents' : 'none' }}>
        <ErrorBoundary fallback={renderFallback('Panneau Latéral', 'Painel Lateral')}>
          <RightSidebar activePanel={activeRightPanel} onTogglePanel={onToggleRightPanel} isMobile={isMobile} mestreSignals={filteredMestreSignals} refreshMestreSignals={refreshMestreSignals} hideGlobalSignals={hideGlobalSignals} onToggleHideGlobalSignals={onToggleHideGlobalSignals} visible={viewMode === 'roda' && (!isMobile || mobileTab === 'toada')} />
        </ErrorBoundary>
      </div>
    </div>
  );
};
