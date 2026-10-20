/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudioStore } from '../stores/useAudioStore';
import { ErrorBoundary } from './ErrorBoundary';
import { ExportMenuModal } from './ExportMenuModal';
import { VocalValidationModal } from './VocalValidationModal';
import { ToadaQuickDeployPrompt } from './ToadaQuickDeployPrompt';
import { VisitorAuthModal } from './VisitorAuthModal';
import { SubscriptionModal } from './SubscriptionModal';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { CordelCustomDialogPortal } from './modals/CordelCustomDialogPortal';
import { InstrumentDetailEditorOverlay } from './modals/InstrumentDetailEditorOverlay';

const SaveSectionModal = lazyWithRetry(() => import('./CloudSectionModals').then((m) => ({ default: m.SaveSectionModal })), 'SaveSectionModal');
const LoadSectionModal = lazyWithRetry(() => import('./CloudSectionModals').then((m) => ({ default: m.LoadSectionModal })), 'LoadSectionModal');
const AoVivoOverlay = lazyWithRetry(() => import('./AoVivoOverlay').then((m) => ({ default: m.AoVivoOverlay })), 'AoVivoOverlay');

interface GlobalModalsLayoutProps {
  showExportMenu: boolean;
  setShowExportMenu: (val: boolean) => void;
  selectedExportTracks: Set<number>;
  setSelectedExportTracks: React.Dispatch<React.SetStateAction<Set<number>>>;
  selectedAnnexTracks: Set<number>;
  setSelectedAnnexTracks: React.Dispatch<React.SetStateAction<Set<number>>>;
  executeExport: (wantsPrint: boolean) => void;
  printLegendOnly: () => void;
  customDialog: any;
  setCustomDialog: (val: any) => void;
  sectionToSave: any;
  setSectionToSave: (val: any) => void;
  loadSectionInsertMeasure: number | null;
  setLoadSectionInsertMeasure: (val: number | null) => void;
  isMobile: boolean;
  mobileTab: string;
  viewMode: string;
  toastMessage: string | null;
  handleStepTouchStart: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number | [string, string],
    onSelect: (val: string | [string, string], merge?: boolean) => void,
    trackId: number,
    isSplit?: boolean
  ) => void;
}

export const GlobalModalsLayout: React.FC<GlobalModalsLayoutProps> = ({
  showExportMenu,
  setShowExportMenu,
  selectedExportTracks,
  setSelectedExportTracks,
  selectedAnnexTracks,
  setSelectedAnnexTracks,
  executeExport,
  printLegendOnly,
  customDialog,
  setCustomDialog,
  sectionToSave,
  setSectionToSave,
  loadSectionInsertMeasure,
  setLoadSectionInsertMeasure,
  isMobile,
  mobileTab,
  viewMode,
  toastMessage,
  handleStepTouchStart,
}) => {
  const sequencer = useSequencer();
  const editingTrackId = useSequencerStore((state) => state.editingTrackId);
  const setEditingTrackId = useSequencerStore((state) => state.setEditingTrackId);
  const tempRecording = useAudioStore((state) => state.tempRecording);

  const isVisitorAuthModalOpen = useSequencerStore((state) => state.isVisitorAuthModalOpen);
  const closeVisitorAuthModal = useSequencerStore((state) => state.closeVisitorAuthModal);
  const isSubscriptionModalOpen = useSequencerStore((state) => state.isSubscriptionModalOpen);
  const closeSubscriptionModal = useSequencerStore((state) => state.closeSubscriptionModal);

  const modalRoot = document.getElementById('modal-root') || document.body;

  const content = (
    <>
      {showExportMenu && (
        <ExportMenuModal
          onClose={() => setShowExportMenu(false)}
          selectedExportTracks={selectedExportTracks}
          setSelectedExportTracks={setSelectedExportTracks}
          selectedAnnexTracks={selectedAnnexTracks}
          setSelectedAnnexTracks={setSelectedAnnexTracks}
          executeExport={executeExport}
          printLegendOnly={printLegendOnly}
          lang={sequencer.lang}
        />
      )}

      {isVisitorAuthModalOpen && <VisitorAuthModal lang={sequencer.lang} onClose={closeVisitorAuthModal} />}
      {isSubscriptionModalOpen && <SubscriptionModal lang={sequencer.lang} onClose={closeSubscriptionModal} />}

      <CordelCustomDialogPortal customDialog={customDialog} setCustomDialog={setCustomDialog} lang={sequencer.lang} />

      <Suspense fallback={null}>
        {sectionToSave && <SaveSectionModal section={sectionToSave} onClose={() => setSectionToSave(null)} lang={sequencer.lang} />}
        {loadSectionInsertMeasure !== null && (
          <LoadSectionModal insertAtMeasure={loadSectionInsertMeasure} onClose={() => setLoadSectionInsertMeasure(null)} lang={sequencer.lang} />
        )}
      </Suspense>

      <InstrumentDetailEditorOverlay
        editingTrackId={editingTrackId}
        onClose={() => setEditingTrackId(null)}
        isMobile={isMobile}
        lang={sequencer.lang}
        handleStepTouchStart={handleStepTouchStart}
        setEditingTrackId={setEditingTrackId}
      />

      {viewMode === 'roda' && (!isMobile || mobileTab === 'roda') && (
        <ErrorBoundary fallback={null}>
          <AoVivoOverlay />
        </ErrorBoundary>
      )}

      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-[#8b2a1a] text-[#f4ecd8] font-cactus font-bold text-lg px-6 py-3 rounded-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] z-[100] animate-bounce">
          {toastMessage}
        </div>
      )}

      <ToadaQuickDeployPrompt />
      {tempRecording !== null && <VocalValidationModal />}
    </>
  );

  return createPortal(content, modalRoot);
};
