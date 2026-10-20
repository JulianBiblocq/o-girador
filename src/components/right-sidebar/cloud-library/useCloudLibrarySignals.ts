/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent } from 'react';
import { CloudRhythmSignal, Language } from '../../../types';
import { uploadMestreSignal, updateMestreSignal } from '../../../cloudSignals';
import { processSignalImageFile } from '../../../utils/signalImageProcessor';
import { useCloudLibraryDelete } from './useCloudLibraryDelete';

interface UseCloudLibrarySignalsParams {
  refreshMestreSignals?: () => void;
  userProfile: any;
  lang: Language;
}

export function useCloudLibrarySignals({
  refreshMestreSignals,
  userProfile,
  lang,
}: UseCloudLibrarySignalsParams) {
  const [showAddSignalForm, setShowAddSignalForm] = useState(false);
  const [isPhotoBoothOpen, setIsPhotoBoothOpen] = useState(false);
  const [signalToEdit, setSignalToEdit] = useState<CloudRhythmSignal | null>(null);
  const retakeTargetSignalIdRef = useRef<string | null>(null);
  const [pendingSignalImage, setPendingSignalImage] = useState<string | null>(null);
  const [pendingSignalName, setPendingSignalName] = useState('');
  const [rawSignalFrames, setRawSignalFrames] = useState<string[]>([]);
  const [isGlobalUpload, setIsGlobalUpload] = useState(false);
  const [isUploadingSignal, setIsUploadingSignal] = useState(false);

  const deleteState = useCloudLibraryDelete(refreshMestreSignals, lang);

  const handleSignalFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { base64, defaultName } = await processSignalImageFile(file);
        if (!pendingSignalName) setPendingSignalName(defaultName);
        setRawSignalFrames([base64]);
      } catch (err) {
        console.error(err);
      }
    }
    e.target.value = '';
  };

  const handlePhotoBoothSave = async (signalData: any) => {
    setIsUploadingSignal(true);
    if (retakeTargetSignalIdRef.current) {
      const targetId = retakeTargetSignalIdRef.current;
      retakeTargetSignalIdRef.current = null;
      const result = await updateMestreSignal(targetId, { ...signalData, imageUrl: signalData.image });
      if (result.success) {
        if (refreshMestreSignals) refreshMestreSignals();
        deleteState.showToast('success', lang === 'fr' ? 'Signal renouvelé avec succès !' : 'Sinal renovado com sucesso!');
      } else {
        deleteState.showToast('error', (lang === 'fr' ? 'Erreur renouvellement : ' : 'Erro ao renovar: ') + (result.error || ''));
      }
      setIsUploadingSignal(false);
      setIsPhotoBoothOpen(false);
      return;
    }

    const mestreIdToUse = isGlobalUpload ? 'global' : (userProfile?.mestreId || userProfile?.uid);
    if (mestreIdToUse) {
      const result = await uploadMestreSignal(
        mestreIdToUse, signalData.name, signalData.image, signalData.frames,
        signalData.beatsCount, signalData.mirrorHorizontal, signalData.rawFrames,
        signalData.cordelOptions, signalData.frameOverrides
      );
      if (result.success && result.signal) {
        if (refreshMestreSignals) refreshMestreSignals();
        deleteState.showToast('success', lang === 'fr' ? 'Signal Cloud enregistré avec succès !' : 'Sinal Cloud salvo com sucesso!');
      } else {
        deleteState.showToast('error', (lang === 'fr' ? 'Erreur upload : ' : 'Erro upload: ') + (result.error || ''));
      }
    }
    setIsUploadingSignal(false);
    setIsPhotoBoothOpen(false);
  };

  const handleSaveEditSignal = async (updated: any) => {
    const res = await updateMestreSignal(updated.id, updated);
    if (res.success) {
      if (refreshMestreSignals) refreshMestreSignals();
      deleteState.showToast('success', lang === 'fr' ? 'Signal mis à jour !' : 'Sinal atualizado!');
    } else {
      deleteState.showToast('error', res.error || (lang === 'fr' ? 'Erreur mise à jour.' : 'Erro ao atualizar.'));
    }
  };

  const handleAddCloudSignal = async () => {
    if (!pendingSignalImage) return;
    setIsUploadingSignal(true);
    const finalName = pendingSignalName.trim() || (lang === 'fr' ? 'Signal sans nom' : 'Sinal sem nome');
    const mestreIdToUse = isGlobalUpload ? 'global' : (userProfile?.mestreId || userProfile?.uid);
    if (mestreIdToUse) {
      const result = await uploadMestreSignal(mestreIdToUse, finalName, pendingSignalImage);
      if (result.success && result.signal) {
        if (refreshMestreSignals) refreshMestreSignals();
        setPendingSignalImage(null);
        setPendingSignalName('');
        setShowAddSignalForm(false);
        deleteState.showToast('success', lang === 'fr' ? 'Signal Cloud enregistré avec succès !' : 'Sinal Cloud salvo com sucesso!');
      } else {
        deleteState.showToast('error', (lang === 'fr' ? 'Erreur upload : ' : 'Erro no upload: ') + (result.error || ''));
      }
    }
    setIsUploadingSignal(false);
  };

  return {
    showAddSignalForm,
    setShowAddSignalForm,
    isPhotoBoothOpen,
    setIsPhotoBoothOpen,
    signalToEdit,
    setSignalToEdit,
    retakeTargetSignalIdRef,
    pendingSignalImage,
    setPendingSignalImage,
    pendingSignalName,
    setPendingSignalName,
    rawSignalFrames,
    setRawSignalFrames,
    isGlobalUpload,
    setIsGlobalUpload,
    isUploadingSignal,
    ...deleteState,
    handleSignalFileChange,
    handlePhotoBoothSave,
    handleSaveEditSignal,
    handleAddCloudSignal,
  };
}
