import React from 'react';
import { X } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { ErrorBoundary } from '../ErrorBoundary';
import { WindowPortal } from '../WindowPortal';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const TimelineSequencer = lazyWithRetry(() => import('../TimelineSequencer').then(m => ({ default: m.TimelineSequencer })), 'TimelineSequencer');

const renderFallback = (labelFr: string, labelPt: string) => (
  <div className="p-4 border-2 border-red-500 bg-red-100 text-red-700 m-4 rounded-sm font-mono text-xs shadow-[2px_2px_0_rgba(0,0,0,1)] z-50">
    <h3 className="font-bold text-sm mb-1 flex items-center gap-1.5"><X size={14} className="shrink-0" /> Erreur / Erro</h3>
    <p>Impossible de charger le module "{labelFr}" / Não foi possível carregar o módulo "{labelPt}".</p>
  </div>
);

interface MainWorkspaceTimelineViewProps {
  viewMode: string;
  renderedView: string | null;
  isFadingIn: boolean;
  isMobile: boolean;
  measureWidth: number;
  setMeasureWidth: (w: number) => void;
  setSectionToSave: (sec: any) => void;
  setLoadSectionInsertMeasure: (val: any) => void;
  filteredMestreSignals: any[];
  onStepTouchStart?: any;
}

export const MainWorkspaceTimelineView: React.FC<MainWorkspaceTimelineViewProps> = ({
  viewMode,
  renderedView,
  isFadingIn,
  isMobile,
  measureWidth,
  setMeasureWidth,
  setSectionToSave,
  setLoadSectionInsertMeasure,
  filteredMestreSignals,
  onStepTouchStart,
}) => {
  const lang = useSequencerStore((state) => state.lang);
  const isTimelineDetached = useSequencerStore((state) => state.isTimelineDetached);
  const toggleTimelineDetached = useSequencerStore((state) => state.toggleTimelineDetached);

  return (
    <div style={{ display: (viewMode === 'timeline' || isTimelineDetached) ? 'contents' : 'none' }}>
      {isTimelineDetached && (
        <WindowPortal onClose={toggleTimelineDetached} title="Timeline - o-girador">
          <div className="w-full h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden flex flex-col cordel-bg">
            <TimelineSequencer isMobile={false} measureWidth={measureWidth} onMeasureWidthChange={setMeasureWidth} onExportTablature={() => {}} onSaveCloudSection={setSectionToSave} onLoadCloudSection={setLoadSectionInsertMeasure} mestreSignals={filteredMestreSignals} isActive={true} onStepTouchStart={onStepTouchStart} />
          </div>
        </WindowPortal>
      )}

      {!isTimelineDetached && (
        <div
          style={{ display: viewMode === 'timeline' ? 'flex' : 'none', flex: 1, minWidth: 0, flexDirection: 'column', height: '100%' }}
          className={isFadingIn && renderedView === 'timeline' ? 'fade-in-view-slow' : ''}
        >
          {renderedView === 'timeline' && (
            <ErrorBoundary fallback={renderFallback('Linha do Tempo / Timeline', 'Linha do Tempo')}>
              <TimelineSequencer isMobile={isMobile} measureWidth={measureWidth} onMeasureWidthChange={setMeasureWidth} onExportTablature={() => {}} onSaveCloudSection={setSectionToSave} onLoadCloudSection={setLoadSectionInsertMeasure} mestreSignals={filteredMestreSignals} isActive={viewMode === 'timeline'} onStepTouchStart={onStepTouchStart} />
            </ErrorBoundary>
          )}
        </div>
      )}

      {isTimelineDetached && viewMode === 'timeline' && (
        <div
          className={`flex-1 min-w-0 flex flex-col h-full overflow-hidden items-center justify-center ${isFadingIn && renderedView === 'timeline' ? 'fade-in-view-slow' : ''}`}
          style={{ display: viewMode === 'timeline' ? 'flex' : 'none' }}
        >
          <p className="mb-4 text-center text-lg">{lang === 'fr' ? 'Le séquenceur est détaché dans une autre fenêtre.' : 'O sequenciador está separado em outra janela.'}</p>
          <button onClick={toggleTimelineDetached} className="btn-cordel px-4 py-2 border-2 border-[var(--cordel-text)] rounded shadow-[4px_4px_0_var(--cordel-text)] font-bold bg-white text-black hover:bg-gray-100 transition-colors">
            {lang === 'fr' ? 'Rattacher' : 'Reanexar'}
          </button>
        </div>
      )}
    </div>
  );
};
