/**
 * Overlay regroupant les modales associées au panneau Balanço (< 55 lignes).
 */

import React from 'react';
import { BalancoCaptureModal } from './BalancoCaptureModal';
import { BalancoLibraryModal } from './BalancoLibraryModal';
import { BalancoDeleteConfirmModal } from './BalancoDeleteConfirmModal';
import { BalancoFeedbackModal } from './BalancoFeedbackModal';
import { Language, GlobalSwing } from '../../types';

interface Props {
  isCaptureModalOpen: boolean;
  onCloseCaptureModal: () => void;
  isLibraryModalOpen: boolean;
  onCloseLibraryModal: () => void;
  lang: Language;
  globalSwing: GlobalSwing;
  setGlobalSwing: (gs: GlobalSwing) => void;
  mgr: any;
  triggerCloudSync: () => void;
}

export const BalancoModalsOverlay: React.FC<Props> = ({
  isCaptureModalOpen, onCloseCaptureModal, isLibraryModalOpen, onCloseLibraryModal,
  lang, globalSwing, setGlobalSwing, mgr, triggerCloudSync,
}) => {
  return (
    <>
      <BalancoCaptureModal
        isOpen={isCaptureModalOpen}
        onClose={onCloseCaptureModal}
        lang={lang}
        onCaptureComplete={(newOffsets) => setGlobalSwing({ ...globalSwing, mode: 'custom', customOffsets: newOffsets })}
      />

      <BalancoLibraryModal
        isOpen={isLibraryModalOpen}
        presets={mgr.presets}
        selectedPresetId={mgr.selectedPresetId}
        userProfile={mgr.userProfile}
        isLoadingCloud={mgr.isLoadingCloud}
        lang={lang}
        onClose={onCloseLibraryModal}
        onSelectPreset={mgr.handlePresetSelect}
        onLoadToCustom={mgr.handleLoadToCustom}
        onRequestDelete={(p) => mgr.setPresetToDelete(p)}
        onRefreshCloud={triggerCloudSync}
      />

      <BalancoDeleteConfirmModal
        preset={mgr.presetToDelete}
        lang={lang}
        onCancel={() => mgr.setPresetToDelete(null)}
        onConfirm={mgr.handleConfirmDelete}
      />

      <BalancoFeedbackModal feedback={mgr.statusFeedback} lang={lang} onClose={() => mgr.setStatusFeedback(null)} />
    </>
  );
};
