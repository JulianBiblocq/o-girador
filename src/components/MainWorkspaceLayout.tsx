import React, { Suspense } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { ErrorBoundary } from './ErrorBoundary';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { MainWorkspaceRodaView } from './workspace/MainWorkspaceRodaView';
import { MainWorkspaceConsoleView } from './workspace/MainWorkspaceConsoleView';
import { MainWorkspaceTimelineView } from './workspace/MainWorkspaceTimelineView';

const AdminPanel = lazyWithRetry(() => import('./AdminPanel').then(m => ({ default: m.AdminPanel })), 'AdminPanel');

const XiloLoadingSpinner: React.FC<{ lang: string }> = ({ lang }) => (
  <div id="circle-sequencer-panel" className="flex-grow w-full h-full flex flex-col justify-center items-center gap-4 bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus font-bold select-none p-6">
    <div className="w-16 h-16 relative flex items-center justify-center animate-spin">
      <svg className="w-full h-full text-[var(--cordel-text)]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5 2.24-5 5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
      </svg>
    </div>
    <div className="text-sm uppercase tracking-widest animate-pulse font-mono">
      {lang === 'pt' ? 'Preparando a Roda...' : 'Préparation de la Roda...'}
    </div>
  </div>
);

export interface MainWorkspaceLayoutProps {
  viewMode: string;
  renderedView: string | null;
  isFadingIn: boolean;
  isMobile: boolean;
  mobileTab: string;
  setMobileTab: (tab: string) => void;
  filteredMestreSignals: any[];
  refreshMestreSignals: () => void;
  hideGlobalSignals: boolean;
  onToggleHideGlobalSignals: () => void;
  measureWidth: number;
  setMeasureWidth: (w: number) => void;
  setSectionToSave: (sec: any) => void;
  setLoadSectionInsertMeasure: (val: any) => void;
  presetFiles: any[];
  localPresets: any[];
  onStepTouchStart?: any;
  activeRightPanel: any;
  onToggleRightPanel: any;
}

export const MainWorkspaceLayout: React.FC<MainWorkspaceLayoutProps> = (props) => {
  const lang = useSequencerStore((state) => state.lang);

  return (
    <div id="main-workspace" className="flex flex-grow min-h-0 overflow-hidden relative w-full mobile-stack cordel-bg">
      <Suspense fallback={<XiloLoadingSpinner lang={lang} />}>
        <MainWorkspaceRodaView
          viewMode={props.viewMode}
          renderedView={props.renderedView}
          isFadingIn={props.isFadingIn}
          isMobile={props.isMobile}
          mobileTab={props.mobileTab}
          filteredMestreSignals={props.filteredMestreSignals}
          refreshMestreSignals={props.refreshMestreSignals}
          hideGlobalSignals={props.hideGlobalSignals}
          onToggleHideGlobalSignals={props.onToggleHideGlobalSignals}
          onStepTouchStart={props.onStepTouchStart}
          activeRightPanel={props.activeRightPanel}
          onToggleRightPanel={props.onToggleRightPanel}
        />

        <MainWorkspaceConsoleView
          viewMode={props.viewMode}
          renderedView={props.renderedView}
          isFadingIn={props.isFadingIn}
          isMobile={props.isMobile}
          onStepTouchStart={props.onStepTouchStart}
        />

        <MainWorkspaceTimelineView
          viewMode={props.viewMode}
          renderedView={props.renderedView}
          isFadingIn={props.isFadingIn}
          isMobile={props.isMobile}
          measureWidth={props.measureWidth}
          setMeasureWidth={props.setMeasureWidth}
          setSectionToSave={props.setSectionToSave}
          setLoadSectionInsertMeasure={props.setLoadSectionInsertMeasure}
          filteredMestreSignals={props.filteredMestreSignals}
          onStepTouchStart={props.onStepTouchStart}
        />

        {props.viewMode === 'admin' && (
          <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
            <ErrorBoundary fallback={<div className="p-4 text-red-500 font-mono">Erreur chargement AdminPanel</div>}>
              <AdminPanel />
            </ErrorBoundary>
          </div>
        )}
      </Suspense>
    </div>
  );
};
