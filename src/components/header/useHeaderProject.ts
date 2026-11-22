import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencer } from '../../contexts/SequencerContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { subscribeToGroupDefaultPreset, setDefaultGroupPreset } from '../../cloudGroups';
import { resolveGroupLogoFromCloud } from '../../services/cloud-groups/cloudGroupVariants';
import { togglePresetDraftStatus } from '../../cloudPresetsStorage';
import { isLegacySamambaiaGroup } from '../../utils/tenantGroupHelpers';
import { isMestreOrAdminProfile, canMutatePreset } from '../../utils/presetPermissions';

export function useHeaderProject(cloudPresets: any[] = [], activePresetName: string) {
  const sequencer = useSequencer();
  const { userProfile, isAdmin, currentUser } = useAuth();
  const metadata = useSequencerStore((state) => state.metadata);
  const queryClient = useQueryClient();

  const effectiveProfile = userProfile
    ? { ...userProfile, uid: userProfile.uid || currentUser?.uid || '' }
    : (currentUser ? { uid: currentUser.uid } : null);

  const rawGroupId = (userProfile?.groupId || '').trim();
  const isSamambaia = isLegacySamambaiaGroup(rawGroupId);
  const isOtherDistinctGroup = Boolean(rawGroupId && !isSamambaia);

  const groupLabel = userProfile?.groupName || (isSamambaia ? 'Samambaia' : rawGroupId) || '';
  const [cloudGroupLogo, setCloudGroupLogo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!rawGroupId || userProfile?.groupLogoUrl) { setCloudGroupLogo(null); return; }
    resolveGroupLogoFromCloud(rawGroupId).then((url) => { if (!cancelled) setCloudGroupLogo(url); });
    return () => { cancelled = true; };
  }, [rawGroupId, userProfile?.groupLogoUrl]);

  const groupLogo = userProfile?.groupLogoUrl || cloudGroupLogo || (isSamambaia ? '/Pictures/logo-samambaia.png' : '/o-girador-logo.webp');

  const isPublicPreset = (p: { visibility?: string; isShowcase?: boolean }) =>
    p.visibility === 'admin_global' || p.visibility === 'public' || p.isShowcase === true;
  const belongsToCurrentGroup = (p: any) => {
    if (p.visibility === 'private' && !p.groupId) return Boolean(effectiveProfile?.uid && p.ownerId === effectiveProfile.uid);
    const pGrp = String(p.groupId || p.groupName || '').trim().toLowerCase();
    if (isSamambaia) {
      return isLegacySamambaiaGroup(pGrp) || p.mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' || p.ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
    }
    return Boolean(rawGroupId && pGrp && pGrp === rawGroupId.toLowerCase());
  };
  const publicCloudPresets = (cloudPresets || []).filter(isPublicPreset);
  const privateCloudPresets = (cloudPresets || []).filter((p) => belongsToCurrentGroup(p) || (!isPublicPreset(p) && !rawGroupId));
  const showGroupCatalogue = Boolean(groupLabel && (isSamambaia || isOtherDistinctGroup));

  const [groupDefaultPresetId, setGroupDefaultPresetId] = useState<string | null>(null);

  useEffect(() => {
    const targetGroupId = isOtherDistinctGroup ? rawGroupId : (userProfile?.groupId || (isSamambaia ? 'Samambaia' : null));
    if (!targetGroupId) {
      setGroupDefaultPresetId(null);
      return;
    }
    const unsub = subscribeToGroupDefaultPreset(targetGroupId, (id) => setGroupDefaultPresetId(id));
    return () => unsub();
  }, [rawGroupId, userProfile?.groupId, isSamambaia, isOtherDistinctGroup]);

  const isMestreOrAdmin = isMestreOrAdminProfile(effectiveProfile, isAdmin);
  const canSetDefaultPreset = isMestreOrAdmin;
  const isEditor = Boolean(isMestreOrAdmin || userProfile?.canWriteSequenciador);
  const canTogglePresetDraft = (preset: { id: string; ownerId?: string }) => canMutatePreset(preset, effectiveProfile);

  const activePresetId = activePresetName?.startsWith('cloud:') ? activePresetName.replace('cloud:', '') : activePresetName;
  const loadedGroupPreset = privateCloudPresets.find((p) =>
    p.id === activePresetId || (metadata?.toada && p.name.trim().toLowerCase() === metadata.toada.trim().toLowerCase())
  );
  const loadedPublicPreset = publicCloudPresets.find((p) =>
    p.id === activePresetId || (metadata?.toada && p.name.trim().toLowerCase() === metadata.toada.trim().toLowerCase())
  );
  const currentLoadedPreset = loadedGroupPreset || loadedPublicPreset;

  const handleToggleDraft = async (presetId: string, currentDraft: boolean) => {
    const target = (cloudPresets || []).find((p: any) => p.id === presetId);
    if (target && !canMutatePreset(target, effectiveProfile)) return;
    if (!target && !isMestreOrAdmin) return;

    const nextDraft = !currentDraft;
    queryClient.setQueriesData({ queryKey: ['cloudPresets'] }, (oldData: any) => {
      if (!Array.isArray(oldData)) return oldData;
      return oldData.map((p: any) => (p.id === presetId ? { ...p, isDraft: nextDraft } : p));
    });

    const roleForDraft = isMestreOrAdmin
      ? (userProfile?.role === 'admin' || userProfile?.dbRole === 'admin' ? 'admin' : 'mestre')
      : (userProfile?.role || undefined);

    try {
      await togglePresetDraftStatus(
        presetId,
        currentDraft,
        roleForDraft,
        effectiveProfile?.uid || undefined,
        Boolean(userProfile?.canWriteSequenciador)
      );
    } catch (err: any) {
      console.error('Failed to toggle preset draft status:', err);
      await sequencer.alertAsync(
        err?.message || (sequencer.lang === 'pt' ? 'Erro ao alterar visibilidade' : 'Erreur lors de la modification de la visibilité')
      );
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['cloudPresets'] });
    }
  };

  const handleSetDefaultPreset = async (presetId: string | null) => {
    if (!userProfile?.groupId || !isMestreOrAdmin) return;
    const roleForGroup = userProfile.role === 'admin' || userProfile.dbRole === 'admin' ? 'admin' : 'mestre';
    try {
      await setDefaultGroupPreset(userProfile.groupId, presetId, roleForGroup);
    } catch (err: any) {
      console.error('Failed to set default group preset:', err);
      await sequencer.alertAsync(err.message || 'Erreur lors de la mise à jour du morceau de travail');
    }
  };

  return {
    groupLabel, groupLogo, publicCloudPresets, privateCloudPresets, showGroupCatalogue,
    groupDefaultPresetId, canSetDefaultPreset, isEditor, canTogglePresetDraft,
    currentLoadedPreset, handleToggleDraft, handleSetDefaultPreset,
  };
}
