/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState, useRef } from 'react';
import { Info } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencer } from '../../contexts/SequencerContext';
import { useIsScreenUnder1280 } from '../../hooks/useIsScreenUnder1280';
import { ErrorBoundary } from '../ErrorBoundary';
import { RightSidebar } from '../RightSidebar';
import { RightSidebarCollapsedTab } from '../right-sidebar/RightSidebarCollapsedTab';
import { WindowPortal } from '../WindowPortal';
import { CircleSequencer } from '../CircleSequencer';
import { DawLinearSequencer } from '../DawLinearSequencer';
import { RodaCentralTopBar } from '../roda/RodaCentralTopBar';
import { WorkspaceTrackColumn } from './WorkspaceTrackColumn';
import { WorkspacePistasOverlay } from './WorkspacePistasOverlay';
import { useWorkspacePistasProps } from './useWorkspacePistasProps';

const renderFallback = (fr: string, pt: string) => (
  <div className="p-3 border-2 border-red-500 bg-red-100 text-red-700 m-2 rounded font-mono text-xs z-50">
    <p>Erreur / Erro: "{fr}" / "{pt}"</p>
  </div>
);

interface MainWorkspaceRodaViewProps {
  viewMode: string; renderedView: string | null; isFadingIn: boolean; isMobile: boolean; mobileTab: string;
  filteredMestreSignals: any[]; refreshMestreSignals: () => void; hideGlobalSignals: boolean;
  onToggleHideGlobalSignals: () => void; onStepTouchStart?: any; activeRightPanel: any; onToggleRightPanel: any;
}

export const MainWorkspaceRodaView: React.FC<MainWorkspaceRodaViewProps> = ({
  viewMode, renderedView, isFadingIn, isMobile, mobileTab,
  filteredMestreSignals, refreshMestreSignals, hideGlobalSignals,
  onToggleHideGlobalSignals, onStepTouchStart, activeRightPanel, onToggleRightPanel,
}) => {
  const sequencer = useSequencer(), lang = useSequencerStore((s) => s.lang);
  const setEditingTrackId = useSequencerStore((s) => s.setEditingTrackId), isTracksCollapsed = useSequencerStore((s) => s.isTracksCollapsed);
  const isLinearDawDetached = useSequencerStore((s) => s.isLinearDawDetached), isCircleSequencerDetached = useSequencerStore((s) => s.isCircleSequencerDetached);
  const toggleLinearDawDetached = useSequencerStore((s) => s.toggleLinearDawDetached), toggleCircleSequencerDetached = useSequencerStore((s) => s.toggleCircleSequencerDetached);

  const isUnder1280 = useIsScreenUnder1280();
  const [isDrawerOpenUnder1280, setIsDrawerOpenUnder1280] = useState(false);
  const prevIsUnder1280Ref = useRef(isUnder1280);

  useEffect(() => { useSequencerStore.setState({ isTracksCollapsed: true }); }, []);

  useEffect(() => {
    if (isUnder1280 && !prevIsUnder1280Ref.current) {
      setIsDrawerOpenUnder1280(false);
      onToggleRightPanel(null, true);
    } else if (!isUnder1280 && prevIsUnder1280Ref.current) {
      setIsDrawerOpenUnder1280(false);
      if (!activeRightPanel) onToggleRightPanel('info', true);
    }
    prevIsUnder1280Ref.current = isUnder1280;
  }, [isUnder1280, activeRightPanel, onToggleRightPanel]);

  const pistasProps = useWorkspacePistasProps(viewMode === 'roda');
  const isPistasOpen = !isTracksCollapsed;

  const handleOpenDrawer = () => {
    if (isUnder1280) setIsDrawerOpenUnder1280(true);
    if (!activeRightPanel) onToggleRightPanel('info', true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpenUnder1280(false);
    onToggleRightPanel(null, true);
  };

  return (
    <div
      style={{ display: viewMode === 'roda' ? 'flex' : 'none' }}
      className={`flex flex-1 min-h-0 min-w-0 w-full h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] select-none relative overflow-hidden ${isFadingIn && renderedView === 'roda' ? 'fade-in-view' : ''}`}
    >
      {isLinearDawDetached && (
        <WindowPortal onClose={toggleLinearDawDetached} title="Pistes - o-girador" width={1024} height={768}>
          <div className="w-full h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden flex flex-col cordel-bg"><DawLinearSequencer isActive mestreSignals={filteredMestreSignals} onStepTouchStart={onStepTouchStart} /></div>
        </WindowPortal>
      )}
      {isCircleSequencerDetached && (
        <WindowPortal onClose={toggleCircleSequencerDetached} panelKey="roda" title="Roda - o-girador" width={1024} height={768}>
          <div className="w-full h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden flex flex-col cordel-bg"><CircleSequencer isMobile={false} mestreSignals={filteredMestreSignals} onStepTouchStart={onStepTouchStart} isActive /></div>
        </WindowPortal>
      )}
      {(!isMobile || mobileTab === 'mixer') && (
        <WorkspaceTrackColumn tracks={pistasProps.visibleTracks} isPistasOpen={isPistasOpen} onOpenDetailEditor={setEditingTrackId} scrollRef={pistasProps.trackScrollRef} onScroll={pistasProps.handleTrackScroll} />
      )}
      {(!isMobile || mobileTab === 'roda') && (
        <div className="flex-1 min-w-[420px] h-full relative flex flex-col overflow-hidden">
          {!isMobile && (
            <RodaCentralTopBar
              isPistasOpen={isPistasOpen}
              className="w-full shrink-0"
              rightAction={isUnder1280 && !isDrawerOpenUnder1280 ? (
                <button type="button" onClick={handleOpenDrawer} className="h-8 px-2 border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-[10px] font-cactus font-bold flex items-center gap-1 shadow-[1px_1px_0_#000] cursor-pointer shrink-0" title="Informations">
                  <Info size={12} /><span>INFOS</span>
                </button>
              ) : null}
            />
          )}
          <div className="flex-1 min-h-0 w-full relative overflow-hidden">
            {!isCircleSequencerDetached && (
              <ErrorBoundary fallback={renderFallback('Roda', 'Roda')}>
                <CircleSequencer isMobile={isMobile} mestreSignals={filteredMestreSignals} onStepTouchStart={onStepTouchStart} isActive={viewMode === 'roda' && !isPistasOpen} />
              </ErrorBoundary>
            )}
            {!isMobile && (
              <WorkspacePistasOverlay tracks={pistasProps.visibleTracks} isPistasOpen={isPistasOpen} currentMeasure={pistasProps.currentMeasure} defaultBeats={pistasProps.defaultBeats} isLeftHanded={pistasProps.isLeftHanded} sequencer={sequencer} handleStepClick={(_e, id) => { if (!useSequencerStore.getState().isPracticeMode) setEditingTrackId(id); }} registerStepRef={pistasProps.registerStepRef} trackResolutionsRef={pistasProps.trackResolutionsRef} scrollRef={pistasProps.pistasScrollRef} onScroll={pistasProps.handlePistasScroll} />
            )}
          </div>
        </div>
      )}
      {(!isMobile || mobileTab === 'toada') && (
        <ErrorBoundary fallback={renderFallback('Panneau Latéral', 'Painel Lateral')}>
          {isUnder1280 && !isMobile ? (
            isDrawerOpenUnder1280 ? (
              <>
                <div onClick={handleCloseDrawer} className="absolute inset-0 bg-black/40 z-30 transition-opacity" />
                <RightSidebar activePanel={activeRightPanel || 'info'} onTogglePanel={onToggleRightPanel} isMobile={false} isDrawer onCloseDrawer={handleCloseDrawer} mestreSignals={filteredMestreSignals} refreshMestreSignals={refreshMestreSignals} hideGlobalSignals={hideGlobalSignals} onToggleHideGlobalSignals={onToggleHideGlobalSignals} visible />
              </>
            ) : (
              <RightSidebarCollapsedTab onOpen={handleOpenDrawer} lang={lang} />
            )
          ) : !isMobile && activeRightPanel === null ? (
            <RightSidebarCollapsedTab onOpen={handleOpenDrawer} lang={lang} />
          ) : (
            <RightSidebar activePanel={activeRightPanel} onTogglePanel={onToggleRightPanel} isMobile={isMobile} isDrawer={false} mestreSignals={filteredMestreSignals} refreshMestreSignals={refreshMestreSignals} hideGlobalSignals={hideGlobalSignals} onToggleHideGlobalSignals={onToggleHideGlobalSignals} visible={viewMode === 'roda'} />
          )}
        </ErrorBoundary>
      )}
    </div>
  );
};
