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
import { isLegacySamambaiaGroup } from '../utils/tenantGroupHelpers';
import { resolveUserAccessPolicy } from '../utils/userAccessPolicy';

interface UseSavePresetOptions {
  presetData: Preset;
  defaultName: string;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export function useSavePresetToCloud({ presetData, defaultName, onClose, lang }: UseSavePresetOptions) {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const sequencer = useSequencer();
  const queryClient = useQueryClient();

  const policy = resolveUserAccessPolicy(userProfile, {
    hasAuthUser: Boolean(currentUser || userProfile?.uid),
    isAdminFlag: isAdmin,
  });
  const isMestre = (isMestreOrAdminProfile(userProfile, isAdmin) || policy.isTrialActive) && !policy.isTrialExpired;
  const canPublishToGroup = policy.canPublishToGroup;
  const isSuperAdmin = policy.isSuperAdmin;

  const [name, setName] = useState(defaultName || '');
  const [visibility, setVisibility] = useState<CatalogVisibility>(canPublishToGroup ? 'mestre_group' : 'private');
  const [isSaving, setIsSaving] = useState(false);
  const [autoGenerateAudio, setAutoGenerateAudio] = useState(false);
  const [isDraft, setIsDraft] = useState<boolean>(() => Boolean((presetData as any)?.isDraft ?? false));
  const [isShowcase, setIsShowcase] = useState<boolean>(() => Boolean((presetData as any)?.isShowcase ?? false));
  const [keepInGroup, setKeepInGroup] = useState<boolean>(false);

  useEffect(() => {
    setVisibility(canPublishToGroup ? 'mestre_group' : 'private');
  }, [canPublishToGroup]);

  const { genererEtUploaderPresetCloudBounce, isBouncingCloud, progress, stepLabel } = useCloudAudioBounce();

  const rawGroupId = (userProfile?.groupId || '').trim();
  const isSamambaiaMember = isLegacySamambaiaGroup(rawGroupId);
  const groupDisplayName = userProfile?.groupName || (isSamambaiaMember ? 'Samambaia' : rawGroupId) || 'Cloud';

  const effectiveMestreId = canPublishToGroup
    ? ((userProfile?.role === 'mestre' || (userProfile?.dbRole as any) === 'mestre')
        ? userProfile?.uid
        : (userProfile?.mestreId || (isSamambaiaMember ? OFFICIAL_MESTRE_UID : null)))
    : null;
  const effectiveGroupId = canPublishToGroup && rawGroupId
    ? (isSamambaiaMember ? 'samambaia' : rawGroupId.toLowerCase())
    : undefined;

  const effectiveUid = userProfile?.uid || currentUser?.uid || null;
  const { data: cloudPresets = [] } = useCloudPresets({
    userUid: effectiveUid,
    userRole: isSuperAdmin ? 'admin' : (userProfile?.role || 'visiteur'),
    mestreId: effectiveMestreId || null,
    groupId: rawGroupId || null,
    groupName: userProfile?.groupName || null,
    canWriteSequenciador: userProfile?.canWriteSequenciador,
  });

  const loadedMorceauId = getActiveCloudPresetId(presetData);
  const finder = useMatchedPresetFinder({
    cloudPresets, name, loadedMorceauId, userProfile, effectiveMestreId, effectiveGroupId, isAdmin,
  });

  useEffect(() => {
    if (finder.matchedPreset) {
      if (finder.matchedPreset.isDraft !== undefined) setIsDraft(Boolean(finder.matchedPreset.isDraft));
      setIsShowcase(Boolean(finder.matchedPreset.isShowcase));
      setKeepInGroup(Boolean(finder.matchedPreset.isShowcase && finder.matchedPreset.groupId));
    }
  }, [finder.matchedPreset]);

  const ownedPrivateCount = cloudPresets.filter(
    (p) => Boolean(effectiveUid) && p.ownerId === effectiveUid && p.visibility === 'private' && !p.groupId
  ).length;

  const handleSave = async (options?: { forceNew?: boolean }) => {
    if (!name.trim() || finder.hasMestreNameConflict) return;
    if (!effectiveUid || !userProfile) {
      useSequencerStore.getState().openVisitorAuthModal('save_cloud');
      return;
    }
    if (policy.isTrialExpired) {
      onClose();
      useSequencerStore.getState().openSubscriptionModal('trial_expired');
      return;
    }
    setIsSaving(true);
    try {
      const effectiveOptions = finder.isForeignActivePreset ? { ...options, forceNew: true } : options;
      await executeSavePresetToCloud({
        name, presetData, userProfile, isAdmin, isMestre, visibility, isDraft,
        isShowcase: isSuperAdmin ? isShowcase : false, keepInGroup,
        effectiveMestreId, effectiveGroupId, matchedPreset: finder.matchedPreset, loadedMorceauId,
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
    ...finder, isMestre, isDraft, setIsDraft, isSuperAdmin, isShowcase, setIsShowcase,
    keepInGroup, setKeepInGroup, canPublishToGroup, canUploadAudio: policy.canUploadVocalCloud,
    ownedPrivateCount, maxPrivateCloudPresets: policy.maxPrivateCloudPresets,
  };
}
