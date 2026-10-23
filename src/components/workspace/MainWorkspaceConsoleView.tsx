import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { ErrorBoundary } from '../ErrorBoundary';
import { WindowPortal } from '../WindowPortal';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const ConsoleMixer = lazyWithRetry(() => import('../ConsoleMixer').then(m => ({ default: m.ConsoleMixer })), 'ConsoleMixer');

const renderFallback = (labelFr: string, labelPt: string) => (
  <div className="p-4 border-2 border-red-500 bg-red-100 text-red-700 m-4 rounded-sm font-mono text-xs shadow-[2px_2px_0_rgba(0,0,0,1)] z-50">
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
  const isConsoleDetached = useSequencerStore((state) => state.isConsoleDetached);
  const toggleConsoleDetached = useSequencerStore((state) => state.toggleConsoleDetached);

  return (
    <div style={{ display: (viewMode === 'console' || isConsoleDetached) ? 'contents' : 'none' }}>
      {isConsoleDetached && (
        <WindowPortal onClose={toggleConsoleDetached} panelKey="mixer" title="Console - o-girador" width={1280} height={800}>
          <div className="w-full h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden flex flex-col cordel-bg">
            <ConsoleMixer isMobile={false} onStepTouchStart={onStepTouchStart} isActive={true} editingTrackId={editingTrackId} setEditingTrackId={setEditingTrackId} />
          </div>
        </WindowPortal>
      )}

      {!isConsoleDetached && (
        <div
          className={`flex-1 min-w-0 flex flex-col h-full overflow-hidden ${isFadingIn && renderedView === 'console' ? 'fade-in-view' : ''}`}
          style={{ display: viewMode === 'console' ? 'flex' : 'none' }}
        >
          {renderedView === 'console' && (
            <ErrorBoundary fallback={renderFallback('Mixeur Console', 'Mesa de Som')}>
              <ConsoleMixer isMobile={isMobile} onStepTouchStart={onStepTouchStart} isActive={viewMode === 'console'} editingTrackId={editingTrackId} setEditingTrackId={setEditingTrackId} />
            </ErrorBoundary>
          )}
        </div>
      )}

      {isConsoleDetached && viewMode === 'console' && (
        <div
          className={`flex-1 min-w-0 flex flex-col h-full overflow-hidden items-center justify-center ${isFadingIn && renderedView === 'console' ? 'fade-in-view' : ''}`}
          style={{ display: viewMode === 'console' ? 'flex' : 'none' }}
        >
          <p className="mb-4 text-center text-lg">{lang === 'fr' ? 'La console est détachée dans une autre fenêtre.' : 'A mesa de som está separada em outra janela.'}</p>
          <button onClick={toggleConsoleDetached} className="btn-cordel px-4 py-2 border-2 border-[var(--cordel-text)] rounded shadow-[4px_4px_0_var(--cordel-text)] font-bold bg-white text-black hover:bg-gray-100 transition-colors">
            {lang === 'fr' ? 'Rattacher' : 'Reanexar'}
          </button>
        </div>
      )}
    </div>
  );
};
