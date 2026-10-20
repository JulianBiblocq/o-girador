import React, { useState } from 'react';
import { GlobalSwing, Language } from '../../types';
import { BalancoCaptureModal } from './BalancoCaptureModal';
import { BalancoModeSelector } from './BalancoModeSelector';
import { BalancoCustomSection } from './BalancoCustomSection';
import { BalancoStepSliders } from './BalancoStepSliders';
import { BalancoIntensitySlider } from './BalancoIntensitySlider';
import { BalancoLibraryModal } from './BalancoLibraryModal';
import { BalancoDeleteConfirmModal } from './BalancoDeleteConfirmModal';
import { BalancoFeedbackModal } from './BalancoFeedbackModal';
import { useBalancoPreview } from './useBalancoPreview';
import { useBalancoManager } from './useBalancoManager';
import { canManagePreset } from './balancoHelpers';

interface BalancoEditorPanelProps {
  globalSwing: GlobalSwing;
  setGlobalSwing: (gs: GlobalSwing) => void;
  lang: Language;
  compact?: boolean;
}

export const BalancoEditorPanel: React.FC<BalancoEditorPanelProps> = ({
  globalSwing,
  setGlobalSwing,
  lang,
  compact = false,
}) => {
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  const activeMode: 'maracatu' | 'custom' = globalSwing.mode === 'custom' ? 'custom' : 'maracatu';
  const mgr = useBalancoManager(globalSwing, setGlobalSwing, lang);
  const { isPreviewPlaying, togglePreview } = useBalancoPreview(
    globalSwing.customOffsets,
    globalSwing.swingIntensity ?? 100,
    activeMode,
    isCaptureModalOpen
  );

  const handleNudgeGroup = (delta: number) => {
    const newOffsets = globalSwing.customOffsets.map((v) =>
      Math.max(-100, Math.min(100, v + delta))
    ) as [number, number, number, number];
    setGlobalSwing({ ...globalSwing, mode: 'custom', customOffsets: newOffsets });
  };

  const handleOffsetChange = (index: number, val: number) => {
    const newOffsets = [...globalSwing.customOffsets] as [number, number, number, number];
    newOffsets[index] = val;
    setGlobalSwing({ ...globalSwing, mode: 'custom', customOffsets: newOffsets });
  };

  const triggerCloudSync = () => {
    if (mgr.userProfile?.uid) {
      mgr.syncCloudPresets(mgr.userProfile.uid, mgr.userProfile.groupId, mgr.userProfile.role, mgr.userProfile.mestreId, mgr.userProfile.canWriteSequenciador);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-left select-none">
      <BalancoModeSelector
        activeMode={activeMode}
        selectedPresetId={mgr.selectedPresetId}
        selectedPreset={mgr.selectedPreset}
        presets={mgr.presets}
        userProfile={mgr.userProfile}
        compact={compact}
        isLoadingCloud={mgr.isLoadingCloud}
        canManageSelectedPreset={canManagePreset(mgr.selectedPreset, mgr.userProfile)}
        lang={lang}
        onModeChange={(mode) => setGlobalSwing({ ...globalSwing, mode })}
        onRefreshCloud={triggerCloudSync}
        onOpenLibrary={() => setIsLibraryModalOpen(true)}
        onPresetSelect={mgr.handlePresetSelect}
        onLoadToCustom={mgr.handleLoadToCustom}
        onRequestDelete={(p) => mgr.setPresetToDelete(p)}
      />

      {activeMode === 'custom' && (
        <BalancoCustomSection
          editingPresetId={mgr.editingPresetId}
          editingPreset={mgr.editingPreset}
          customName={mgr.customName}
          isSaving={mgr.isSaving}
          canManageEditingPreset={canManagePreset(mgr.editingPreset, mgr.userProfile)}
          isPreviewPlaying={isPreviewPlaying}
          lang={lang}
          setEditingPresetId={mgr.setEditingPresetId}
          setCustomName={mgr.setCustomName}
          onOpenCaptureModal={() => setIsCaptureModalOpen(true)}
          onSaveCustomPreset={mgr.handleSaveCustomPreset}
          onNudgeGroup={handleNudgeGroup}
          onTogglePreview={togglePreview}
        />
      )}

      <BalancoStepSliders
        customOffsets={globalSwing.customOffsets}
        activeMode={activeMode}
        lang={lang}
        onOffsetChange={handleOffsetChange}
        onResetCustom={mgr.handleResetCustom}
      />

      <BalancoIntensitySlider
        swingIntensity={globalSwing.swingIntensity}
        lang={lang}
        onChange={(val) => setGlobalSwing({ ...globalSwing, swingIntensity: val })}
      />

      <BalancoCaptureModal
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
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
        onClose={() => setIsLibraryModalOpen(false)}
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
    </div>
  );
};
