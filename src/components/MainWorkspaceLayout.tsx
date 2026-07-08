/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useMemo } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { ErrorBoundary } from './ErrorBoundary';
import { Mixer } from './Mixer';
import { RightSidebar } from './RightSidebar';

// Lazy load views for optimal bundle splitting (Time-to-Interactive reduction)
const ConsoleMixer = lazy(() => import('./ConsoleMixer').then(m => ({ default: m.ConsoleMixer })));
const CircleSequencer = lazy(() => import('./CircleSequencer').then(m => ({ default: m.CircleSequencer })));
const TimelineSequencer = lazy(() => import('./TimelineSequencer').then(m => ({ default: m.TimelineSequencer })));
const QuizEngine = lazy(() => import('./QuizEngine').then(m => ({ default: m.QuizEngine })));
const DicteeEngine = lazy(() => import('./DicteeEngine').then(m => ({ default: m.DicteeEngine })));
const InspecteurEngine = lazy(() => import('./InspecteurEngine').then(m => ({ default: m.InspecteurEngine })));
const MestreEngine = lazy(() => import('./MestreEngine').then(m => ({ default: m.MestreEngine })));
const RythmeLiveEngine = lazy(() => import('./RythmeLiveEngine').then(m => ({ default: m.RythmeLiveEngine })));
const VaralCordel = lazy(() => import('./VaralCordel').then(m => ({ default: m.VaralCordel })));
const MestreStudio = lazy(() => import('./MestreStudio').then(m => ({ default: m.MestreStudio })));
const AdminPanel = lazy(() => import('./AdminPanel').then(m => ({ default: m.AdminPanel })));

const renderFallback = (labelFr: string, labelPt: string) => {
  return (
    <div className="p-4 border-2 border-red-500 bg-red-100 text-red-700 m-4 rounded-sm font-mono text-xs shadow-[2px_2px_0_rgba(0,0,0,1)] z-50">
      <h3 className="font-bold text-sm mb-1">❌ Erreur / Erro</h3>
      <p>Impossible de charger le module "{labelFr}" / Não foi possível carregar o módulo "{labelPt}".</p>
    </div>
  );
};

// Xilogravura woodcut-styled custom SVG Loading Screen
const XiloLoadingSpinner: React.FC<{ lang: string }> = ({ lang }) => (
  <div className="flex-grow w-full h-full flex flex-col justify-center items-center gap-4 bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus font-bold select-none p-6">
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

interface MainWorkspaceLayoutProps {
  viewMode: string;
  renderedView: string | null;
  isFadingIn: boolean;
  hasVisitedStudio: boolean;
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
  mestreRhythmState: any;
  setMestreRhythmState: (state: any) => void;
  unlockedFolhetos: any[];
  justUnlockedBookletId: any;
  onClearJustUnlocked: () => void;
  onLaunchExercise: (ex: any) => void;
  onGameExit: () => void;
  onQuizSuccess: () => void;
  onDicteeSuccess: () => void;
  onInspecteurSuccess: () => void;
  onMestreSuccess: () => void;
  onRythmeLiveSuccess: () => void;
  onVaralExit: () => void;
  presetFiles: any[];
  localPresets: any[];
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
}

export const MainWorkspaceLayout: React.FC<MainWorkspaceLayoutProps> = ({
  viewMode,
  renderedView,
  isFadingIn,
  hasVisitedStudio,
  isMobile,
  mobileTab,
  setMobileTab,
  filteredMestreSignals,
  refreshMestreSignals,
  hideGlobalSignals,
  onToggleHideGlobalSignals,
  measureWidth,
  setMeasureWidth,
  setSectionToSave,
  setLoadSectionInsertMeasure,
  mestreRhythmState,
  setMestreRhythmState,
  unlockedFolhetos,
  justUnlockedBookletId,
  onClearJustUnlocked,
  onLaunchExercise,
  onGameExit,
  onQuizSuccess,
  onDicteeSuccess,
  onInspecteurSuccess,
  onMestreSuccess,
  onRythmeLiveSuccess,
  onVaralExit,
  presetFiles,
  localPresets,
  onStepTouchStart,
}) => {
  const sequencer = useSequencer();
  const lang = useSequencerStore(state => state.lang);
  const editingTrackId = useSequencerStore(state => state.editingTrackId);
  const setEditingTrackId = useSequencerStore(state => state.setEditingTrackId);

  const activeRightPanel = useSequencerStore(state => state.metadata ? 'letras' : 'info');

  const handleSetEditingTrackId = React.useCallback((id: number | null) => {
    setEditingTrackId(id);
  }, [setEditingTrackId]);

  const handleToggleSidebarPanel = React.useCallback(() => {
    // Toggles between letras and info panels
  }, []);

  const activeVaralExercise = useMemo(() => {
    // Stub or resolver logic if needed for varal exercise
    return null;
  }, []);

  return (
    <div id="main-workspace" className="flex flex-grow min-h-0 overflow-hidden relative w-full mobile-stack cordel-bg">
      <Suspense fallback={<XiloLoadingSpinner lang={lang} />}>
        {/* 1. RODA VIEW */}
        <div 
          style={{ display: viewMode === 'roda' ? 'flex' : 'none' }}
          className={`flex flex-1 min-h-0 min-w-0 w-full h-full mobile-stack ${isFadingIn && renderedView === 'roda' ? 'fade-in-view' : ''}`}
        >
          {/* Left column tracks mixers */}
          <div style={{ display: (!isMobile || mobileTab === 'mixer') ? 'contents' : 'none' }}>
            <ErrorBoundary fallback={renderFallback('Mixeur', 'Mixador')}>
              <Mixer
                onStepTouchStart={onStepTouchStart}
                isActive={viewMode === 'roda' && (!isMobile || mobileTab === 'mixer')}
                setEditingTrackId={handleSetEditingTrackId}
              />
            </ErrorBoundary>
          </div>

          {/* Center circle visual canvas engine */}
          <div style={{ display: (!isMobile || mobileTab === 'roda') ? 'contents' : 'none' }}>
            <ErrorBoundary fallback={renderFallback('Séquenceur Circulaire', 'Sequenciador Circular')}>
              {renderedView === 'roda' && (
                <CircleSequencer
                  isMobile={isMobile}
                  mestreSignals={filteredMestreSignals}
                  onStepTouchStart={onStepTouchStart}
                  isActive={viewMode === 'roda' && (!isMobile || mobileTab === 'roda')}
                />
              )}
            </ErrorBoundary>
          </div>

          {/* Right drawer sidebar context panel */}
          <div style={{ display: (!isMobile || mobileTab === 'toada') ? 'contents' : 'none' }}>
            <ErrorBoundary fallback={renderFallback('Panneau Latéral', 'Painel Lateral')}>
              <RightSidebar
                activePanel={isMobile ? (activeRightPanel || 'letras') : 'info'}
                onTogglePanel={handleToggleSidebarPanel}
                isMobile={isMobile}
                mestreSignals={filteredMestreSignals}
                refreshMestreSignals={refreshMestreSignals}
                hideGlobalSignals={hideGlobalSignals}
                onToggleHideGlobalSignals={onToggleHideGlobalSignals}
                visible={viewMode === 'roda' && (!isMobile || mobileTab === 'toada')}
              />
            </ErrorBoundary>
          </div>
        </div>

        {/* 2. MIXER CONSOLE VIEW */}
        <div 
          className={`flex-1 min-w-0 flex flex-col h-full overflow-x-auto overflow-y-hidden custom-scrollbar ${isFadingIn && renderedView === 'console' ? 'fade-in-view' : ''}`}
          style={{ display: viewMode === 'console' ? 'flex' : 'none' }}
        >
          {renderedView === 'console' && (
            <ErrorBoundary fallback={renderFallback('Mixeur Console', 'Mesa de Som')}>
              <ConsoleMixer
                isMobile={isMobile}
                onStepTouchStart={onStepTouchStart}
                isActive={viewMode === 'console'}
                editingTrackId={editingTrackId}
                setEditingTrackId={handleSetEditingTrackId}
              />
            </ErrorBoundary>
          )}
        </div>

        {/* 3. TIMELINE VIEW */}
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
              />
            </ErrorBoundary>
          )}
        </div>

        {/* 4. GAME & EXERCISE ENGINES */}
        {viewMode === 'quiz' && (
          <ErrorBoundary fallback={renderFallback('Quiz', 'Questionário')}>
            <QuizEngine
              lang={sequencer.lang}
              onExit={onGameExit}
              onSuccess={onQuizSuccess}
              exerciseData={activeVaralExercise}
            />
          </ErrorBoundary>
        )}

        {viewMode === 'dictee' && (
          <ErrorBoundary fallback={renderFallback('Dictée Rythmique', 'Ditado Rítmico')}>
            <DicteeEngine
              lang={sequencer.lang}
              onExit={onGameExit}
              onSuccess={onDicteeSuccess}
              exerciseData={activeVaralExercise}
            />
          </ErrorBoundary>
        )}

        {viewMode === 'inspecteur' && (
          <ErrorBoundary fallback={renderFallback('Inspecteur', 'Inspetor')}>
            <InspecteurEngine
              lang={sequencer.lang}
              onExit={onGameExit}
              exerciseData={activeVaralExercise}
              onSuccess={onInspecteurSuccess}
            />
          </ErrorBoundary>
        )}

        {viewMode === 'mestre' && (
          <ErrorBoundary fallback={renderFallback('Mestre', 'Mestre')}>
            <MestreEngine
              lang={sequencer.lang}
              onExit={onGameExit}
              rhythmState={mestreRhythmState}
              setRhythmState={setMestreRhythmState}
              onSuccess={onMestreSuccess}
              exerciseData={activeVaralExercise}
            />
          </ErrorBoundary>
        )}

        {viewMode === 'rythmelive' && (
          <ErrorBoundary fallback={renderFallback('Rythme Live', 'Ritmo Live')}>
            <RythmeLiveEngine
              lang={sequencer.lang}
              onExit={onGameExit}
              onSuccess={onRythmeLiveSuccess}
              exerciseData={activeVaralExercise}
            />
          </ErrorBoundary>
        )}

        {viewMode === 'varal' && (
          <ErrorBoundary fallback={renderFallback('Varal de Cordel', 'Varal de Cordel')}>
            <VaralCordel
              lang={sequencer.lang}
              onExit={onVaralExit}
              unlockedFolhetos={unlockedFolhetos}
              justUnlockedBookletId={justUnlockedBookletId}
              onClearJustUnlocked={onClearJustUnlocked}
              onLaunchExercise={onLaunchExercise}
            />
          </ErrorBoundary>
        )}

        {/* 5. DASHBOARDS & ADMIN */}
        {hasVisitedStudio && (
          <div 
            className="flex-1 w-full h-full overflow-hidden flex flex-col relative z-20"
            style={{ display: viewMode === 'studio' ? 'flex' : 'none' }}
          >
            <ErrorBoundary fallback={renderFallback('Studio Mestre', 'Estúdio Mestre')}>
              <MestreStudio
                isActive={viewMode === 'studio'}
                lang={sequencer.lang}
                onExit={onVaralExit}
                presetFiles={presetFiles}
                localPresets={localPresets}
              />
            </ErrorBoundary>
          </div>
        )}

        {viewMode === 'admin' && (
          <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
            <ErrorBoundary fallback={renderFallback('Panneau Admin', 'Painel de Administração')}>
              <AdminPanel />
            </ErrorBoundary>
          </div>
        )}
      </Suspense>
    </div>
  );
};
