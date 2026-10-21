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
import { VocalValidationModal } from './VocalValidationModal';
import { ToadaQuickDeployPrompt } from './ToadaQuickDeployPrompt';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { CordelCustomDialogPortal } from './modals/CordelCustomDialogPortal';
import { InstrumentDetailEditorOverlay } from './modals/InstrumentDetailEditorOverlay';

const ExportMenuModal = lazyWithRetry(() => import('./ExportMenuModal').then((m) => ({ default: m.ExportMenuModal })), 'ExportMenuModal');
const VisitorAuthModal = lazyWithRetry(() => import('./VisitorAuthModal').then((m) => ({ default: m.VisitorAuthModal })), 'VisitorAuthModal');
const SubscriptionModal = lazyWithRetry(() => import('./SubscriptionModal').then((m) => ({ default: m.SubscriptionModal })), 'SubscriptionModal');
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

export const GlobalModalsLayout: React.FC<GlobalModalsLayoutProps> = (props) => {
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
      <Suspense fallback={null}>
        {props.showExportMenu && (
          <ExportMenuModal
            onClose={() => props.setShowExportMenu(false)}
            selectedExportTracks={props.selectedExportTracks}
            setSelectedExportTracks={props.setSelectedExportTracks}
            selectedAnnexTracks={props.selectedAnnexTracks}
            setSelectedAnnexTracks={props.setSelectedAnnexTracks}
            executeExport={props.executeExport}
            printLegendOnly={props.printLegendOnly}
            lang={sequencer.lang}
          />
        )}
        {isVisitorAuthModalOpen && <VisitorAuthModal lang={sequencer.lang} onClose={closeVisitorAuthModal} />}
        {isSubscriptionModalOpen && <SubscriptionModal lang={sequencer.lang} onClose={closeSubscriptionModal} />}
        {props.sectionToSave && <SaveSectionModal section={props.sectionToSave} onClose={() => props.setSectionToSave(null)} lang={sequencer.lang} />}
        {props.loadSectionInsertMeasure !== null && (
          <LoadSectionModal insertAtMeasure={props.loadSectionInsertMeasure} onClose={() => props.setLoadSectionInsertMeasure(null)} lang={sequencer.lang} />
        )}
      </Suspense>

      <CordelCustomDialogPortal customDialog={props.customDialog} setCustomDialog={props.setCustomDialog} lang={sequencer.lang} />

      <InstrumentDetailEditorOverlay
        editingTrackId={editingTrackId}
        onClose={() => setEditingTrackId(null)}
        isMobile={props.isMobile}
        lang={sequencer.lang}
        handleStepTouchStart={props.handleStepTouchStart}
        setEditingTrackId={setEditingTrackId}
      />

      {!props.isMobile || useSequencerStore.getState().mobileViewMode === 'complet' ? (
        props.viewMode === 'roda' && (!props.isMobile || props.mobileTab === 'roda') && (
          <ErrorBoundary fallback={null}>
            <AoVivoOverlay />
          </ErrorBoundary>
        )
      ) : null}

      {props.toastMessage && (
        <div className="fixed bottom-8 right-8 bg-[#8b2a1a] text-[#f4ecd8] font-cactus font-bold text-lg px-6 py-3 rounded-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] z-[100] animate-bounce">
          {props.toastMessage}
        </div>
      )}

      <ToadaQuickDeployPrompt />
      {tempRecording !== null && <VocalValidationModal />}
    </>
  );

  return createPortal(content, modalRoot);
};
