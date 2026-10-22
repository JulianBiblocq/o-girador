/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencer } from '../../contexts/SequencerContext';
import { ErrorBoundary } from '../ErrorBoundary';
import { RightSidebar } from '../RightSidebar';
import { WindowPortal } from '../WindowPortal';
import { CircleSequencer } from '../CircleSequencer';
import { DawLinearSequencer } from '../DawLinearSequencer';
import { RodaCentralTopBar } from '../roda/RodaCentralTopBar';
import { WorkspaceTrackColumn } from './WorkspaceTrackColumn';
import { WorkspacePistasOverlay } from './WorkspacePistasOverlay';
import { useWorkspacePistasProps } from './useWorkspacePistasProps';

const renderFallback = (fr: string, pt: string) => (
  <div className="p-4 border-2 border-red-500 bg-red-100 text-red-700 m-4 rounded-sm font-mono text-xs shadow-[2px_2px_0_rgba(0,0,0,1)] z-50">
    <h3 className="font-bold text-sm mb-1">Erreur / Erro</h3>
    <p>Impossible de charger "{fr}" / Não foi possível carregar "{pt}".</p>
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
  viewMode, renderedView, isFadingIn, isMobile, mobileTab,
  filteredMestreSignals, refreshMestreSignals, hideGlobalSignals,
  onToggleHideGlobalSignals, onStepTouchStart, activeRightPanel, onToggleRightPanel,
}) => {
  const sequencer = useSequencer();
  const setEditingTrackId = useSequencerStore((state) => state.setEditingTrackId);
  const isTracksCollapsed = useSequencerStore((state) => state.isTracksCollapsed);
  const isLinearDawDetached = useSequencerStore((state) => state.isLinearDawDetached);
  const isCircleSequencerDetached = useSequencerStore((state) => state.isCircleSequencerDetached);
  const toggleLinearDawDetached = useSequencerStore((state) => state.toggleLinearDawDetached);
  const toggleCircleSequencerDetached = useSequencerStore((state) => state.toggleCircleSequencerDetached);

  const pistasProps = useWorkspacePistasProps(viewMode === 'roda');
  const isPistasOpen = !isTracksCollapsed;

  const handleStepClick = (_e: React.MouseEvent, trackId: number) => {
    setEditingTrackId(trackId);
  };

  return (
    <div
      style={{ display: viewMode === 'roda' ? 'flex' : 'none' }}
      className={`flex flex-1 min-h-0 min-w-0 w-full h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] select-none relative overflow-hidden ${isFadingIn && renderedView === 'roda' ? 'fade-in-view' : ''}`}
    >
      {/* Fenêtres détachées (Portals) */}
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

      {/* Colonne 1 : Gauche permanente pleine hauteur (Mixer / Pistes) */}
      {(!isMobile || mobileTab === 'mixer') && (
        <WorkspaceTrackColumn
          tracks={pistasProps.visibleTracks}
          isPistasOpen={isPistasOpen}
          onOpenDetailEditor={setEditingTrackId}
          scrollRef={pistasProps.trackScrollRef}
          onScroll={pistasProps.handleTrackScroll}
        />
      )}

      {/* Colonne 2 : Zone Centrale pleine hauteur (Roda / Volet Pistes) */}
      {(!isMobile || mobileTab === 'roda') && (
        <div className="flex-1 min-w-0 h-full relative flex flex-col overflow-hidden">
          {/* Barre Supérieure Centrale (h-[52px]) */}
          {!isMobile && (
            <RodaCentralTopBar isPistasOpen={isPistasOpen} className="h-[52px] min-h-[52px] max-h-[52px] px-3 shrink-0" />
          )}

          {/* Espace Roda + Volet Pistas (commence sous les 52px, aligné avec la 1re piste) */}
          <div className="flex-1 min-h-0 w-full relative overflow-hidden">
            {!isCircleSequencerDetached && (
              <ErrorBoundary fallback={renderFallback('Roda', 'Roda')}>
                <CircleSequencer isMobile={isMobile} mestreSignals={filteredMestreSignals} onStepTouchStart={onStepTouchStart} isActive={viewMode === 'roda'} />
              </ErrorBoundary>
            )}

            {!isMobile && (
              <WorkspacePistasOverlay
                tracks={pistasProps.visibleTracks} isPistasOpen={isPistasOpen}
                currentMeasure={pistasProps.currentMeasure} defaultBeats={pistasProps.defaultBeats}
                isLeftHanded={pistasProps.isLeftHanded} sequencer={sequencer} handleStepClick={handleStepClick}
                registerStepRef={pistasProps.registerStepRef} trackResolutionsRef={pistasProps.trackResolutionsRef}
                scrollRef={pistasProps.pistasScrollRef} onScroll={pistasProps.handlePistasScroll}
              />
            )}
          </div>
        </div>
      )}

      {/* Colonne 3 : Droite pleine hauteur (RightSidebar / INFORMATIONS) */}
      {(!isMobile || mobileTab === 'toada') && (
        <ErrorBoundary fallback={renderFallback('Panneau Latéral', 'Painel Lateral')}>
          <RightSidebar
            activePanel={activeRightPanel} onTogglePanel={onToggleRightPanel} isMobile={isMobile}
            mestreSignals={filteredMestreSignals} refreshMestreSignals={refreshMestreSignals}
            hideGlobalSignals={hideGlobalSignals} onToggleHideGlobalSignals={onToggleHideGlobalSignals}
            visible={viewMode === 'roda'}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};
