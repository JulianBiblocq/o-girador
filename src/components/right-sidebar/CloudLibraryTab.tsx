/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Onglet Bibliothèque Cloud des Signes du Mestre (< 120 lignes).
 */
import React from 'react';
import { Cloud } from 'lucide-react';
import { CloudRhythmSignal, Language } from '../../types';
import { MusicalPhotoBoothModal } from '../signals/MusicalPhotoBoothModal';
import { EditSignalModal } from '../signals/EditSignalModal';
import { SignalCloudCard } from './cloud-library/SignalCloudCard';
import { SignalCloudAddForm } from './cloud-library/SignalCloudAddForm';
import { SignalCloudDeleteConfirm } from './cloud-library/SignalCloudDeleteConfirm';
import { useCloudLibrarySignals } from './cloud-library/useCloudLibrarySignals';

interface CloudLibraryTabProps {
  mestreSignals: CloudRhythmSignal[];
  refreshMestreSignals?: () => void;
  userProfile: any;
  lang: Language;
}

export const CloudLibraryTab: React.FC<CloudLibraryTabProps> = ({
  mestreSignals = [],
  refreshMestreSignals,
  userProfile,
  lang,
}) => {
  const {
    showAddSignalForm, setShowAddSignalForm, isPhotoBoothOpen, setIsPhotoBoothOpen,
    signalToEdit, setSignalToEdit, retakeTargetSignalIdRef, pendingSignalImage, setPendingSignalImage,
    pendingSignalName, setPendingSignalName, rawSignalFrames, setRawSignalFrames,
    isGlobalUpload, setIsGlobalUpload, isUploadingSignal, toast, setToast,
    signalToDelete, setSignalToDelete, isDeletingSignal, handleSignalFileChange,
    handlePhotoBoothSave, handleSaveEditSignal, handleAddCloudSignal, handleConfirmDelete,
  } = useCloudLibrarySignals({ refreshMestreSignals, userProfile, lang });

  const isMestreOrAdmin = userProfile?.role === 'mestre' || userProfile?.role === 'admin';

  return (
    <div className="xilo-feedback-container flex flex-col gap-2 mt-2">
      <span className="text-[var(--cordel-text)] font-cactus text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
        <Cloud size={16} className="text-[var(--cordel-wood)] shrink-0" />
        <span>{lang === 'fr' ? 'Signes Cloud (Mestre)' : 'Sinais Cloud (Mestre)'}</span>
      </span>
      <div className="flex flex-col gap-2">
        <span className="text-[8px] text-[var(--cordel-text)] opacity-60 leading-tight">
          {lang === 'fr'
            ? 'Ces images sont partagées sur le serveur Cloud (Offline-First, synchronisées une fois en ligne).'
            : 'Estas imagens são compartilhadas no servidor Cloud (Offline-First, sincronizadas online).'}
        </span>

        <SignalCloudDeleteConfirm
          toast={toast} onCloseToast={() => setToast(null)}
          signalToDelete={signalToDelete} onCancelDelete={() => setSignalToDelete(null)}
          onConfirmDelete={handleConfirmDelete} isDeletingSignal={isDeletingSignal} lang={lang}
        />

        {mestreSignals.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-1">
            {mestreSignals.map((sig) => (
              <SignalCloudCard
                key={sig.id} sig={sig} isMestreOrAdmin={isMestreOrAdmin} lang={lang}
                onEdit={(targetSig) => setSignalToEdit(targetSig)}
                onDelete={(targetSig) => setSignalToDelete({ id: targetSig.id, mestreId: targetSig.mestreId, name: targetSig.name })}
              />
            ))}
          </div>
        )}

        <SignalCloudAddForm
          isMestreOrAdmin={isMestreOrAdmin} userProfile={userProfile}
          showAddSignalForm={showAddSignalForm} setShowAddSignalForm={setShowAddSignalForm}
          pendingSignalImage={pendingSignalImage} setPendingSignalImage={setPendingSignalImage}
          pendingSignalName={pendingSignalName} setPendingSignalName={setPendingSignalName}
          rawSignalFrames={rawSignalFrames} setRawSignalFrames={setRawSignalFrames}
          isGlobalUpload={isGlobalUpload} setIsGlobalUpload={setIsGlobalUpload}
          isUploadingSignal={isUploadingSignal}
          onOpenPhotoBooth={() => { setShowAddSignalForm(false); setIsPhotoBoothOpen(true); }}
          onFileChange={handleSignalFileChange} onAddSignal={handleAddCloudSignal} lang={lang}
        />

        <MusicalPhotoBoothModal
          isOpen={isPhotoBoothOpen}
          onClose={() => { setIsPhotoBoothOpen(false); retakeTargetSignalIdRef.current = null; }}
          onSave={handlePhotoBoothSave}
          lang={lang}
        />

        <EditSignalModal
          isOpen={Boolean(signalToEdit)}
          onClose={() => setSignalToEdit(null)}
          signal={signalToEdit}
          onSave={handleSaveEditSignal}
          onRetakePhoto={(targetSig) => {
            retakeTargetSignalIdRef.current = targetSig.id;
            setIsPhotoBoothOpen(true);
          }}
          lang={lang}
        />
      </div>
    </div>
  );
};
