
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

  const [name, setName] = useState(defaultName || '');
  const [visibility, setVisibility] = useState<CatalogVisibility>('mestre_group');
  const [isSaving, setIsSaving] = useState(false);
  const [autoGenerateAudio, setAutoGenerateAudio] = useState(false);
  const [isDraft, setIsDraft] = useState<boolean>(() => Boolean((presetData as any)?.isDraft ?? false));

  const { genererEtUploaderPresetCloudBounce, isBouncingCloud, progress, stepLabel } = useCloudAudioBounce();

  const isSamambaiaMember = Boolean(
    (userProfile?.groupId && userProfile.groupId.toLowerCase().includes('samambaia')) ||
    userProfile?.canWriteSequenciador ||
    userProfile?.mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1'
  );

  const groupDisplayName = userProfile?.groupName || (isSamambaiaMember ? 'Samambaia' : userProfile?.groupId) || 'Cloud';
  const effectiveMestreId = (userProfile?.role === 'mestre' || (userProfile?.dbRole as any) === 'mestre')
    ? userProfile?.uid
    : (userProfile?.mestreId || (isSamambaiaMember ? 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' : null));
  const effectiveGroupId = userProfile?.groupId ? userProfile.groupId.trim().toLowerCase() : (isSamambaiaMember ? 'samambaia' : undefined);

  const isMestre = Boolean(
    userProfile?.role === 'mestre' ||
    (userProfile?.dbRole as any) === 'mestre' ||
    userProfile?.role === 'admin' ||
    (userProfile?.role as string) === 'super-admin' ||
    isAdmin ||
    userProfile?.canWriteSequenciador ||
    userProfile?.uid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    (effectiveMestreId && userProfile?.uid === effectiveMestreId)
  );

  const { data: cloudPresets = [] } = useCloudPresets({
    userUid: userProfile?.uid || null,
    userRole: userProfile?.role || 'visiteur',
    mestreId: effectiveMestreId || null,
    groupId: effectiveGroupId || null,
    groupName: userProfile?.groupName || null,
    canWriteSequenciador: userProfile?.canWriteSequenciador
  });

  const loadedMorceauId = getActiveCloudPresetId(presetData);

  const { matchedPreset, isExistingPreset, isLocked, canUpdate, isSavedOnCloud } = useMatchedPresetFinder({
    cloudPresets, name, loadedMorceauId, userUid: userProfile?.uid, effectiveMestreId, isMestre, isAdmin
  });

  useEffect(() => {
    if (matchedPreset && matchedPreset.isDraft !== undefined) {
      setIsDraft(Boolean(matchedPreset.isDraft));
    }
  }, [matchedPreset]);

  const handleSave = async (options?: { forceNew?: boolean }) => {
    if (!name.trim()) return;
    if (!userProfile) {
      useSequencerStore.getState().openVisitorAuthModal();
      return;
    }
    setIsSaving(true);
    try {
      await executeSavePresetToCloud({
        name, presetData, userProfile, isAdmin, isMestre, visibility, isDraft,
        effectiveMestreId, effectiveGroupId, matchedPreset, loadedMorceauId,
        cloudPresets, autoGenerateAudio, genererEtUploaderPresetCloudBounce,
        lang, sequencer, queryClient, onClose, options
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
    matchedPreset, isExistingPreset, isLocked, isMestre, canUpdate, isDraft, setIsDraft, isSavedOnCloud
  };
}
