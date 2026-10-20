import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBalancoStore } from '../../stores/useBalancoStore';
import { saveBalancoToCloud, deleteCloudBalanco } from '../../cloudBalancos';
import { BalancoPreset } from '../../types/balanco.types';
import { GlobalSwing, Language } from '../../types';
import { canManagePreset } from './balancoHelpers';

export function useBalancoManager(
  globalSwing: GlobalSwing,
  setGlobalSwing: (gs: GlobalSwing) => void,
  lang: Language
) {
  const { userProfile } = useAuth();
  const presets = useBalancoStore((state) => state.presets);
  const addLocalPreset = useBalancoStore((state) => state.addLocalPreset);
  const updateLocalPreset = useBalancoStore((state) => state.updateLocalPreset);
  const deleteLocalPreset = useBalancoStore((state) => state.deleteLocalPreset);
  const syncCloudPresets = useBalancoStore((state) => state.syncCloudPresets);
  const isLoadingCloud = useBalancoStore((state) => state.isLoadingCloud);

  const [customName, setCustomName] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('maracatu-trad');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [presetToDelete, setPresetToDelete] = useState<BalancoPreset | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (userProfile?.uid) {
      syncCloudPresets(userProfile.uid, userProfile.groupId, userProfile.role, userProfile.mestreId, userProfile.canWriteSequenciador);
    }
  }, [userProfile?.uid, userProfile?.groupId, userProfile?.role, userProfile?.mestreId, userProfile?.canWriteSequenciador, syncCloudPresets]);

  const selectedPreset = useMemo(() => presets.find((p) => p.id === selectedPresetId) || presets[0], [presets, selectedPresetId]);
  const editingPreset = useMemo(() => editingPresetId ? presets.find((p) => p.id === editingPresetId) || null : null, [presets, editingPresetId]);

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    const target = presets.find((p) => p.id === presetId);
    if (target && target.offsets.length >= 4) {
      const offsets = [target.offsets[0] ?? 0, target.offsets[1] ?? 0, target.offsets[2] ?? 0, target.offsets[3] ?? 0] as [number, number, number, number];
      setGlobalSwing({ ...globalSwing, mode: 'maracatu', customOffsets: offsets });
    }
  };

  const handleLoadToCustom = (presetToLoad: BalancoPreset) => {
    const offsets = [presetToLoad.offsets[0] ?? 0, presetToLoad.offsets[1] ?? 0, presetToLoad.offsets[2] ?? 0, presetToLoad.offsets[3] ?? 0] as [number, number, number, number];
    setGlobalSwing({ ...globalSwing, mode: 'custom', customOffsets: offsets });
    setCustomName(presetToLoad.name);
    setEditingPresetId(canManagePreset(presetToLoad, userProfile) ? presetToLoad.id : null);
  };

  const handleResetCustom = () => {
    setGlobalSwing({ ...globalSwing, customOffsets: [0, 8, -29, -58] });
  };

  const handleSaveCustomPreset = async (saveAsNew: boolean = false) => {
    const isEditingExisting = !saveAsNew && Boolean(editingPresetId) && canManagePreset(presets.find((p) => p.id === editingPresetId), userProfile);
    const targetId = isEditingExisting && editingPresetId ? editingPresetId : `custom-${Date.now()}`;
    const existingPreset = isEditingExisting ? presets.find((p) => p.id === targetId) : null;
    const finalName = customName.trim() || existingPreset?.name || (lang === 'fr' ? 'Balanço Personnalisé' : 'Balanço Personalizado');

    const presetData: BalancoPreset = {
      id: targetId,
      name: finalName,
      ownerId: existingPreset?.ownerId || userProfile?.uid || 'local',
      authorName: existingPreset?.authorName || userProfile?.displayName || (lang === 'fr' ? 'Utilisateur' : 'Usuário'),
      groupId: existingPreset?.groupId !== undefined ? existingPreset.groupId : userProfile?.groupId || null,
      visibility: existingPreset?.visibility || 'private',
      division: 16,
      offsets: [...globalSwing.customOffsets],
      isFactory: false,
      createdAt: existingPreset?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    if (isEditingExisting) updateLocalPreset(targetId, { name: finalName, offsets: [...globalSwing.customOffsets] });
    else { addLocalPreset(presetData); setSelectedPresetId(targetId); }

    if (userProfile?.uid) {
      setIsSaving(true);
      try {
        const docIdToUpdate = isEditingExisting && !targetId.startsWith('custom-') ? targetId : undefined;
        const cloudId = await saveBalancoToCloud(presetData, docIdToUpdate, userProfile.role, userProfile.canWriteSequenciador);
        if (cloudId && cloudId !== targetId) {
          deleteLocalPreset(targetId);
          addLocalPreset({ ...presetData, id: cloudId });
          setSelectedPresetId(cloudId);
          if (isEditingExisting) setEditingPresetId(cloudId);
        }
        setStatusFeedback({
          type: 'success',
          title: isEditingExisting ? (lang === 'fr' ? 'Balanço Mis à Jour !' : 'Balanço Atualizado!') : (lang === 'fr' ? 'Balanço Enregistré !' : 'Balanço Salvo!'),
          message: lang === 'fr' ? `Le preset « ${finalName} » est synchronisé dans votre collection Cloud.` : `O preset « ${finalName} » foi sincronizado na Nuvem.`
        });
      } catch (err: any) {
        setStatusFeedback({ type: 'error', title: 'Erreur', message: err?.message || 'Erreur inconnue' });
      } finally { setIsSaving(false); }
    }
  };

  const handleConfirmDelete = async () => {
    if (!presetToDelete) return;
    const target = presetToDelete;
    deleteLocalPreset(target.id);
    if (selectedPresetId === target.id) setSelectedPresetId('maracatu-trad');
    if (editingPresetId === target.id) { setEditingPresetId(null); setCustomName(''); }
    if (userProfile?.uid && !target.id.startsWith('custom-') && target.ownerId !== 'local') {
      try { await deleteCloudBalanco(target.id); } catch (e) { console.error(e); }
    }
    setPresetToDelete(null);
  };

  return {
    presets, userProfile, isLoadingCloud, customName, setCustomName, selectedPresetId, editingPresetId,
    setEditingPresetId, isSaving, selectedPreset, editingPreset, presetToDelete, setPresetToDelete,
    statusFeedback, setStatusFeedback, handlePresetSelect, handleLoadToCustom, handleResetCustom,
    handleSaveCustomPreset, handleConfirmDelete, syncCloudPresets
  };
}
