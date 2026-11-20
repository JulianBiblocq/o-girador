import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSequencer } from '../contexts/SequencerContext';
import { CatalogVisibility, Preset } from '../types';
import { useCloudAudioBounce } from './useCloudAudioBounce';
import { useQueryClient } from '@tanstack/react-query';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useCloudPresets } from './queries/useCloudPresets';
import { useMatchedPresetFinder } from './save-preset/useMatchedPresetFinder';
import { executeSavePresetToCloud } from './save-preset/usePresetCloudSaverAction';
import { getActiveCloudPresetId } from '../utils/cloudPresetState';
import { isMestreOrAdminProfile, OFFICIAL_MESTRE_UID } from '../utils/presetPermissions';

interface UseSavePresetOptions {
  presetData: Preset;
  defaultName: string;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export function useSavePresetToCloud({ presetData, defaultName, onClose, lang }: UseSavePresetOptions) {
  const { userProfile, isAdmin } = useAuth();
  const sequencer = useSequencer();
  const queryClient = useQueryClient();

  const isMestre = isMestreOrAdminProfile(userProfile, isAdmin);
  const canPublishToGroup = Boolean(isMestre || userProfile?.canWriteSequenciador);

  const [name, setName] = useState(defaultName || '');
  const [visibility, setVisibility] = useState<CatalogVisibility>(canPublishToGroup ? 'mestre_group' : 'private');
  const [isSaving, setIsSaving] = useState(false);
  const [autoGenerateAudio, setAutoGenerateAudio] = useState(false);
  const [isDraft, setIsDraft] = useState<boolean>(() => Boolean((presetData as any)?.isDraft ?? false));

  useEffect(() => {
    setVisibility(canPublishToGroup ? 'mestre_group' : 'private');
  }, [canPublishToGroup]);

  const { genererEtUploaderPresetCloudBounce, isBouncingCloud, progress, stepLabel } = useCloudAudioBounce();

  const isSamambaiaMember = Boolean(
    (userProfile?.groupId && userProfile.groupId.toLowerCase().includes('samambaia')) ||
    userProfile?.canWriteSequenciador ||
    userProfile?.mestreId === OFFICIAL_MESTRE_UID
  );

  const groupDisplayName = userProfile?.groupName || (isSamambaiaMember ? 'Samambaia' : userProfile?.groupId) || 'Cloud';
  const effectiveMestreId = (userProfile?.role === 'mestre' || (userProfile?.dbRole as any) === 'mestre')
    ? userProfile?.uid
    : (userProfile?.mestreId || (isSamambaiaMember ? OFFICIAL_MESTRE_UID : null));
  const effectiveGroupId = userProfile?.groupId ? userProfile.groupId.trim().toLowerCase() : (isSamambaiaMember ? 'samambaia' : undefined);

  const { data: cloudPresets = [] } = useCloudPresets({
    userUid: userProfile?.uid || null,
    userRole: userProfile?.role || 'visiteur',
    mestreId: effectiveMestreId || null,
    groupId: effectiveGroupId || null,
    groupName: userProfile?.groupName || null,
    canWriteSequenciador: userProfile?.canWriteSequenciador,
  });

  const loadedMorceauId = getActiveCloudPresetId(presetData);

  const {
    isForeignActivePreset,
    hasMestreNameConflict,
    matchedPreset,
    isExistingPreset,
    isLocked,
    canUpdate,
    isSavedOnCloud,
  } = useMatchedPresetFinder({
    cloudPresets,
    name,
    loadedMorceauId,
    userProfile,
    effectiveMestreId,
    effectiveGroupId,
    isAdmin,
  });

  useEffect(() => {
    if (matchedPreset && matchedPreset.isDraft !== undefined) {
      setIsDraft(Boolean(matchedPreset.isDraft));
    }
  }, [matchedPreset]);

  const handleSave = async (options?: { forceNew?: boolean }) => {
    if (!name.trim() || hasMestreNameConflict) return;
    if (!userProfile) {
      useSequencerStore.getState().openVisitorAuthModal();
      return;
    }
    setIsSaving(true);
    try {
      const effectiveOptions = isForeignActivePreset ? { ...options, forceNew: true } : options;
      await executeSavePresetToCloud({
        name, presetData, userProfile, isAdmin, isMestre, visibility, isDraft,
        effectiveMestreId, effectiveGroupId, matchedPreset, loadedMorceauId,
        cloudPresets, autoGenerateAudio, genererEtUploaderPresetCloudBounce,
        lang, sequencer, queryClient, onClose, options: effectiveOptions,
      });
    } catch (err: any) {
      console.error(err);
      await sequencer.alertAsync((lang === 'fr' ? 'Erreur lors de la sauvegarde : ' : 'Erro ao salvar : ') + (err.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return {
    name, setName, visibility, setVisibility, isSaving, autoGenerateAudio, setAutoGenerateAudio,
    isBouncingCloud, handleSave, userProfile, groupDisplayName, progress, stepLabel,
    matchedPreset, isExistingPreset, isLocked, isMestre, canUpdate,
    isForeignActivePreset, hasMestreNameConflict, isDraft, setIsDraft, isSavedOnCloud,
  };
}
