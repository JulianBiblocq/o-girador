import React from 'react';
import { X } from 'lucide-react';
import { ErrorBoundary } from '../ErrorBoundary';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const TimelineSequencer = lazyWithRetry(
  () => import('../TimelineSequencer').then((m) => ({ default: m.TimelineSequencer })),
  'TimelineSequencer'
);

const renderFallback = (labelFr: string, labelPt: string) => (
  <div className="p-4 border-2 border-[var(--cordel-status-danger)] bg-[var(--cordel-surface)] text-[var(--cordel-status-danger)] m-4 rounded-sm font-mono text-xs shadow-[2px_2px_0_var(--cordel-shadow-color)] z-50">
    <h3 className="font-bold text-sm mb-1 flex items-center gap-1.5">
      <X size={14} className="shrink-0" /> Erreur / Erro
    </h3>
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
}) => (
  <div style={{ display: viewMode === 'timeline' ? 'contents' : 'none' }}>
    <div
      style={{ display: viewMode === 'timeline' ? 'flex' : 'none', flex: 1, minWidth: 0, flexDirection: 'column', height: '100%' }}
      className={isFadingIn && renderedView === 'timeline' ? 'fade-in-view-slow' : ''}
    >
      {renderedView === 'timeline' && (
        <ErrorBoundary fallback={renderFallback('Linha do Tempo / Timeline', 'Linha do Tempo')}>
          <TimelineSequencer
            isMobile={isMobile}
            measureWidth={measureWidth}
            onMeasureWidthChange={setMeasureWidth}
            onExportTablature={() => {}}
            onSaveCloudSection={setSectionToSave}
            onLoadCloudSection={setLoadSectionInsertMeasure}
            mestreSignals={filteredMestreSignals}
            isActive={viewMode === 'timeline'}
            onStepTouchStart={onStepTouchStart}
          />
        </ErrorBoundary>
      )}
    </div>
  </div>
);
