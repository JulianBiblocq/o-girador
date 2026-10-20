/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PresetMetadata, Language } from '../../types';
import { MusicalPhotoBoothModal } from '../signals/MusicalPhotoBoothModal';
import { EditSignalModal } from '../signals/EditSignalModal';
import { SignalLocalCard } from './preset-manager/SignalLocalCard';
import { SignalAddForm } from './preset-manager/SignalAddForm';
import { usePresetManagerSignals } from './preset-manager/usePresetManagerSignals';

interface PresetManagerSectionProps {
  metadata: PresetMetadata;
  onMetadataChange: (newMeta: PresetMetadata) => void;
  lang: Language;
  userProfile: any;
}

export const PresetManagerSection: React.FC<PresetManagerSectionProps> = ({
  metadata,
  onMetadataChange,
  lang,
}) => {
  const {
    showAddSignalForm,
    setShowAddSignalForm,
    isPhotoBoothOpen,
    setIsPhotoBoothOpen,
    localSignalToEdit,
    setLocalSignalToEdit,
    retakeTargetLocalIdRef,
    pendingSignalImage,
    setPendingSignalImage,
    pendingSignalName,
    setPendingSignalName,
    rawSignalFrames,
    setRawSignalFrames,
    handleSignalFileChange,
    handlePhotoBoothSave,
    handleSaveEditSignal,
    handleAddLocalSignal,
  } = usePresetManagerSignals({ metadata, onMetadataChange, lang });

  return (
    <div className="xilo-feedback-container flex flex-col gap-2 mt-2">
      <span className="text-[var(--cordel-text)] font-cactus text-sm font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
        📂 {lang === 'fr' ? 'Signes Locaux' : 'Sinais Locais'}
      </span>
      <div className="flex flex-col gap-2">
        <span className="text-[8px] text-[var(--cordel-text)] opacity-60 leading-tight">
          {lang === 'fr' ? 'Ces images sont stockées localement dans votre projet.' : 'Estas imagens são armazenadas localmente no seu projeto.'}
        </span>

        {(metadata?.rhythmSignals || []).length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(metadata.rhythmSignals || []).map((sig) => (
              <SignalLocalCard
                key={sig.id}
                sig={sig}
                lang={lang}
                onEdit={(s) => setLocalSignalToEdit(s)}
                onDelete={(id) => onMetadataChange({ ...metadata, rhythmSignals: (metadata.rhythmSignals || []).filter((s) => s.id !== id) })}
              />
            ))}
          </div>
        )}

        <SignalAddForm
          showAddSignalForm={showAddSignalForm}
          setShowAddSignalForm={setShowAddSignalForm}
          pendingSignalImage={pendingSignalImage}
          setPendingSignalImage={setPendingSignalImage}
          pendingSignalName={pendingSignalName}
          setPendingSignalName={setPendingSignalName}
          rawSignalFrames={rawSignalFrames}
          setRawSignalFrames={setRawSignalFrames}
          onOpenPhotoBooth={() => {
            setShowAddSignalForm(false);
            setIsPhotoBoothOpen(true);
          }}
          onFileChange={handleSignalFileChange}
          onAddSignal={handleAddLocalSignal}
          lang={lang}
        />

        <MusicalPhotoBoothModal
          isOpen={isPhotoBoothOpen}
          onClose={() => {
            setIsPhotoBoothOpen(false);
            retakeTargetLocalIdRef.current = null;
          }}
          onSave={handlePhotoBoothSave}
          lang={lang}
        />

        <EditSignalModal
          isOpen={Boolean(localSignalToEdit)}
          onClose={() => setLocalSignalToEdit(null)}
          signal={localSignalToEdit}
          onSave={handleSaveEditSignal}
          onRetakePhoto={(targetSig) => {
            retakeTargetLocalIdRef.current = targetSig.id;
            setIsPhotoBoothOpen(true);
          }}
          lang={lang}
        />
      </div>
    </div>
  );
};
