/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useMemo } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { ErrorBoundary } from './ErrorBoundary';
import { Mixer } from './Mixer';
import { RightSidebar } from './RightSidebar';
import { WindowPortal } from './WindowPortal';

import { lazyWithRetry } from '../utils/lazyWithRetry';

// Lazy load views for optimal bundle splitting (Time-to-Interactive reduction) with auto-retry on deploy
const ConsoleMixer = lazyWithRetry(() => import('./ConsoleMixer').then(m => ({ default: m.ConsoleMixer })), 'ConsoleMixer');
const CircleSequencer = lazyWithRetry(() => import('./CircleSequencer').then(m => ({ default: m.CircleSequencer })), 'CircleSequencer');
const DawLinearSequencer = lazyWithRetry(() => import('./DawLinearSequencer').then(m => ({ default: m.DawLinearSequencer })), 'DawLinearSequencer');
const TimelineSequencer = lazyWithRetry(() => import('./TimelineSequencer').then(m => ({ default: m.TimelineSequencer })), 'TimelineSequencer');

// TODO: Réactiver le Studio des Jeux plus tard
// const MestreStudio = lazyWithRetry(() => import('./MestreStudio').then(m => ({ default: m.MestreStudio })), 'MestreStudio');
const AdminPanel = lazyWithRetry(() => import('./AdminPanel').then(m => ({ default: m.AdminPanel })), 'AdminPanel');

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
  activeRightPanel: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais' | null;
  onToggleRightPanel: (panel: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais', force?: boolean) => void;
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

  presetFiles,
  localPresets,
  onStepTouchStart,
  activeRightPanel,
  onToggleRightPanel,
}) => {
  const sequencer = useSequencer();
  const lang = useSequencerStore(state => state.lang);
  const editingTrackId = useSequencerStore(state => state.editingTrackId);
  const setEditingTrackId = useSequencerStore(state => state.setEditingTrackId);
  const isTracksCollapsed = useSequencerStore(state => state.isTracksCollapsed);
  const isFocusMode = useAudioStore(state => state.isFocusRecordingMode);

  const isLinearDawDetached = useSequencerStore(state => state.isLinearDawDetached);
  const isCircleSequencerDetached = useSequencerStore(state => state.isCircleSequencerDetached);
  const isConsoleDetached = useSequencerStore(state => state.isConsoleDetached);
  const isTimelineDetached = useSequencerStore(state => state.isTimelineDetached);
  const toggleLinearDawDetached = useSequencerStore(state => state.toggleLinearDawDetached);
  const toggleCircleSequencerDetached = useSequencerStore(state => state.toggleCircleSequencerDetached);
  const toggleConsoleDetached = useSequencerStore(state => state.toggleConsoleDetached);
  const toggleTimelineDetached = useSequencerStore(state => state.toggleTimelineDetached);

  const handleSetEditingTrackId = React.useCallback((id: number | null) => {
    setEditingTrackId(id);
  }, [setEditingTrackId]);


  return (
    <div 
      id="main-workspace" 
      className="flex flex-grow min-h-0 overflow-hidden relative w-full mobile-stack cordel-bg"
      style={{ visibility: isFocusMode ? 'hidden' : 'visible' }}
    >
      <Suspense fallback={<XiloLoadingSpinner lang={lang} />}>
        {/* 1. RODA VIEW */}
        <div 
          style={{ display: viewMode === 'roda' ? 'flex' : 'none' }}
          className={`flex flex-1 min-h-0 min-w-0 w-full h-full mobile-stack ${isFadingIn && renderedView === 'roda' ? 'fade-in-view' : ''}`}
        >
          {/* Linear DAW detached Window */}
          {isLinearDawDetached ? (
            <WindowPortal onClose={toggleLinearDawDetached} title="Pistes - o-girador" width={1024} height={768}>
              <div className="w-full h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden flex flex-col cordel-bg">
                <DawLinearSequencer
                  isActive={true}
                  mestreSignals={filteredMestreSignals}
                  onStepTouchStart={onStepTouchStart}
                />
              </div>
            </WindowPortal>
          ) : null}

          {/* Circle Sequencer detached Window */}
          {isCircleSequencerDetached ? (
            <WindowPortal onClose={toggleCircleSequencerDetached} title="Roda - o-girador" width={1024} height={768}>
              <div className="w-full h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden flex flex-col cordel-bg">
                <CircleSequencer
                  isMobile={false}
                  mestreSignals={filteredMestreSignals}
                  onStepTouchStart={onStepTouchStart}
                  isActive={true}
                />
              </div>
            </WindowPortal>
          ) : null}

          {/* RODA VIEW MAIN WINDOW CONTENTS */}
          {(!isMobile && !isTracksCollapsed) ? (
            /* --- LINEAR DAW MODE (PISTES) --- */
            <>
              <div style={{ display: (!isMobile || mobileTab === 'roda') ? 'contents' : 'none' }}>
                {!isLinearDawDetached ? (
                  <ErrorBoundary fallback={renderFallback('Séquenceur', 'Sequenciador')}>
                    <DawLinearSequencer
                      isActive={viewMode === 'roda' && (!isMobile || mobileTab === 'roda')}
                      mestreSignals={filteredMestreSignals}
                      onStepTouchStart={onStepTouchStart}
                    />
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
            </>
          ) : (
            /* --- CIRCLE SEQUENCER MODE (RODA) --- */
            <>
              <div style={{ display: (!isMobile || mobileTab === 'mixer') ? 'contents' : 'none' }}>
                <ErrorBoundary fallback={renderFallback('Mixeur', 'Mixador')}>
                  <Mixer
                    onStepTouchStart={onStepTouchStart}
                    isActive={viewMode === 'roda' && (!isMobile || mobileTab === 'mixer')}
                    setEditingTrackId={handleSetEditingTrackId}
                    isMobile={isMobile}
                  />
                </ErrorBoundary>
              </div>
              <div style={{ display: (!isMobile || mobileTab === 'roda') ? 'contents' : 'none' }}>
                {!isCircleSequencerDetached ? (
                  <ErrorBoundary fallback={renderFallback('Séquenceur', 'Sequenciador')}>
                    <CircleSequencer
                      isMobile={isMobile}
                      mestreSignals={filteredMestreSignals}
                      onStepTouchStart={onStepTouchStart}
                      isActive={viewMode === 'roda' && (!isMobile || mobileTab === 'roda')}
                    />
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

          {/* Right drawer sidebar context panel */}
          <div style={{ display: (!isMobile || mobileTab === 'toada') ? 'contents' : 'none' }}>
            <ErrorBoundary fallback={renderFallback('Panneau Latéral', 'Painel Lateral')}>
              <RightSidebar
                activePanel={activeRightPanel}
                onTogglePanel={onToggleRightPanel}
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
          style={{ display: (!isMobile || mobileTab === 'console') && (viewMode === 'console' || isConsoleDetached) ? 'contents' : 'none' }}
        >
          {isConsoleDetached ? (
            <WindowPortal onClose={toggleConsoleDetached} title="Console - o-girador">
              <div className="w-full h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden flex flex-col cordel-bg">
                <ConsoleMixer
                  isMobile={false}
                  onStepTouchStart={onStepTouchStart}
                  isActive={true}
                  editingTrackId={editingTrackId}
                  setEditingTrackId={handleSetEditingTrackId}
                />
              </div>
            </WindowPortal>
          ) : null}
          
          {!isConsoleDetached && (
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
                    setEditingTrackId={handleSetEditingTrackId}
                  />
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

        {/* 3. TIMELINE VIEW */}
        <div 
          style={{ display: (!isMobile || mobileTab === 'timeline') && (viewMode === 'timeline' || isTimelineDetached) ? 'contents' : 'none' }}
        >
          {isTimelineDetached ? (
            <WindowPortal onClose={toggleTimelineDetached} title="Timeline - o-girador">
              <div className="w-full h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden flex flex-col cordel-bg">
                <TimelineSequencer
                  isMobile={false}
                  measureWidth={measureWidth}
                  onMeasureWidthChange={setMeasureWidth}
                  onExportTablature={() => {}}
                  onSaveCloudSection={setSectionToSave}
                  onLoadCloudSection={setLoadSectionInsertMeasure}
                  mestreSignals={filteredMestreSignals}
                  isActive={true}
                  onStepTouchStart={onStepTouchStart}
                />
              </div>
            </WindowPortal>
          ) : null}

          {!isTimelineDetached && (
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
