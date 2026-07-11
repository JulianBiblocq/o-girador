/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useSequencer } from '../contexts/SequencerContext';
import { ErrorBoundary } from './ErrorBoundary';
import { ExportMenuModal } from './ExportMenuModal';

// Lazy loaded modals for bundle size optimization
const SaveSectionModal = lazy(() => import('./CloudSectionModals').then(m => ({ default: m.SaveSectionModal })));
const LoadSectionModal = lazy(() => import('./CloudSectionModals').then(m => ({ default: m.LoadSectionModal })));
const InstrumentDetailEditor = lazy(() => import('./InstrumentDetailEditor').then(m => ({ default: m.InstrumentDetailEditor })));
const AoVivoOverlay = lazy(() => import('./AoVivoOverlay').then(m => ({ default: m.AoVivoOverlay })));

interface GlobalModalsLayoutProps {
  showExportMenu: boolean;
  setShowExportMenu: (val: boolean) => void;
  selectedExportTracks: Set<number>;
  setSelectedExportTracks: React.Dispatch<React.SetStateAction<Set<number>>>;
  selectedAnnexTracks: Set<number>;
  setSelectedAnnexTracks: React.Dispatch<React.SetStateAction<Set<number>>>;
  executeExport: (type: string) => void;
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
    currentVal: string | number,
    onSelect: (val: string) => void,
    trackId: number
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
  const editingTrackId = useSequencerStore(state => state.editingTrackId);
  const setEditingTrackId = useSequencerStore(state => state.setEditingTrackId);

  const handleCloseDetailEditor = React.useCallback(() => {
    setEditingTrackId(null);
  }, [setEditingTrackId]);

  const modalRoot = document.getElementById('modal-root') || document.body;

  const content = (
    <>
      {/* Export Menu Modal */}
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

      {/* Custom Dialog (Alert / Confirm / Prompt) */}
      {customDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#121212]/80 backdrop-blur-sm select-text text-sm">
          <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] shadow-[4px_4px_0_var(--cordel-border)] p-5 max-w-sm w-full mx-4 flex flex-col gap-4 font-mono select-text">
            <div className="font-cactus font-bold text-base border-b-2 border-[var(--cordel-border)] pb-2 select-none">
              {customDialog.type === 'alert' ? '📢 Info' : customDialog.type === 'confirm' ? '❓' : '📝'} {customDialog.type === 'alert' ? (sequencer.lang === 'pt' ? 'Aviso' : 'Information') : customDialog.type === 'confirm' ? (sequencer.lang === 'pt' ? 'Confirmação' : 'Confirmation') : (sequencer.lang === 'pt' ? 'Entrada' : 'Saisie')}
            </div>
            <p className="text-xs leading-relaxed">{customDialog.message}</p>
            {customDialog.type === 'prompt' && (
              <input
                id="custom-prompt-input"
                type="text"
                autoComplete="off"
                className="w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] p-1.5 text-xs outline-none focus:bg-[var(--cordel-text)] focus:text-[var(--cordel-bg)]"
                defaultValue={customDialog.defaultValue}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    setCustomDialog(null);
                    customDialog.onResolve(val);
                  }
                }}
              />
            )}
            <div className="flex justify-end gap-2.5 mt-2 select-none">
              {customDialog.type !== 'alert' && (
                <button
                  onClick={() => {
                    setCustomDialog(null);
                    customDialog.onResolve(customDialog.type === 'prompt' ? null : false);
                  }}
                  className="px-3 py-1 text-xs border-2 border-[var(--cordel-border)] hover:bg-[var(--cordel-border)] hover:text-[var(--cordel-bg)] transition-colors font-bold cursor-pointer"
                >
                  {customDialog.cancelLabel || (sequencer.lang === 'pt' ? 'Cancelar' : 'Annuler')}
                </button>
              )}
              <button
                onClick={() => {
                  const input = document.getElementById('custom-prompt-input') as HTMLInputElement;
                  setCustomDialog(null);
                  if (customDialog.type === 'prompt') {
                    customDialog.onResolve(input?.value || '');
                  } else {
                    customDialog.onResolve(true);
                  }
                }}
                className="px-4 py-1 text-xs bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold hover:bg-[var(--cordel-border)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer"
              >
                {customDialog.confirmLabel || (sequencer.lang === 'pt' ? 'OK' : 'Valider')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Section Modals */}
      <Suspense fallback={null}>
        {sectionToSave && (
          <SaveSectionModal
            section={sectionToSave}
            onClose={() => setSectionToSave(null)}
          />
        )}
        {loadSectionInsertMeasure !== null && (
          <LoadSectionModal
            insertAtMeasure={loadSectionInsertMeasure}
            onClose={() => setLoadSectionInsertMeasure(null)}
          />
        )}
      </Suspense>

      {/* Instrument Detail Editor Overlay */}
      {editingTrackId !== null && (
        <Suspense fallback={null}>
          <InstrumentDetailEditor
            trackId={editingTrackId}
            onClose={handleCloseDetailEditor}
            isMobile={isMobile}
            onStepTouchStart={handleStepTouchStart}
            setEditingTrackId={setEditingTrackId}
          />
        </Suspense>
      )}

      {/* Live Overlay */}
      {viewMode === 'roda' && (!isMobile || mobileTab === 'roda') && (
        <ErrorBoundary fallback={null}>
          <AoVivoOverlay />
        </ErrorBoundary>
      )}

      {/* Offline Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-[#8b2a1a] text-[#f4ecd8] font-cactus font-bold text-lg px-6 py-3 rounded-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] z-[100] animate-bounce">
          {toastMessage}
        </div>
      )}
    </>
  );

  return createPortal(content, modalRoot);
};
