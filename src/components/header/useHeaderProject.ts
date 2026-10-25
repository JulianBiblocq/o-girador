import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencer } from '../../contexts/SequencerContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { subscribeToGroupDefaultPreset, setDefaultGroupPreset } from '../../cloudGroups';
import { togglePresetDraftStatus } from '../../cloudPresetsStorage';

export function useHeaderProject(cloudPresets: any[] = [], activePresetName: string) {
  const sequencer = useSequencer();
  const { userProfile, isAdmin, currentUser } = useAuth();
  const metadata = useSequencerStore((state) => state.metadata);
  const queryClient = useQueryClient();

  const rawGroupId = (userProfile?.groupId || '').trim();
  const isSamambaia = Boolean(
    rawGroupId.toLowerCase().includes('samambaia') ||
    rawGroupId.toLowerCase().includes('sammbia')
  );
  const isOtherDistinctGroup = Boolean(rawGroupId && !isSamambaia);

  const groupLabel = userProfile?.groupName || (isSamambaia ? 'Samambaia' : userProfile?.groupId) || (rawGroupId || 'Samambaia');

  // Résolution dynamique du logo de groupe :
  // - Pour Samambaia : son logo dédié ou logo configuré
  // - Pour un autre groupe : son logo configuré ou le blason neutre vectoriel O Girador
  // - Visiteur sans groupe : logo Samambaia par défaut (rétrocompatibilité)
  const groupLogo = isOtherDistinctGroup
    ? (userProfile?.groupLogoUrl || '/o-girador-logo.svg')
    : (userProfile?.groupLogoUrl || '/Pictures/logo-samambaia.png');

  const isPublicPreset = (p: { visibility?: string }) =>
    p.visibility === 'admin_global' || p.visibility === 'public';
  const publicCloudPresets = (cloudPresets || []).filter(isPublicPreset);
  const privateCloudPresets = (cloudPresets || []).filter((p) => !isPublicPreset(p));
  const showGroupCatalogue = Boolean(groupLabel && (privateCloudPresets.length > 0 || isSamambaia || isOtherDistinctGroup));

  const [groupDefaultPresetId, setGroupDefaultPresetId] = useState<string | null>(null);

  useEffect(() => {
    const targetGroupId = isOtherDistinctGroup ? rawGroupId : (userProfile?.groupId || (isSamambaia ? 'Samambaia' : null));
    if (!targetGroupId) {
      setGroupDefaultPresetId(null);
      return;
    }
    const unsub = subscribeToGroupDefaultPreset(targetGroupId, (id) => {
      setGroupDefaultPresetId(id);
    });
    return () => unsub();
  }, [rawGroupId, userProfile?.groupId, isSamambaia, isOtherDistinctGroup]);

  const canSetDefaultPreset = Boolean(
    userProfile && (
      userProfile.role === 'mestre' ||
      userProfile.role === 'admin' ||
      userProfile.dbRole === 'mestre' ||
      userProfile.dbRole === 'admin' ||
      isAdmin
    )
  );

  const isMestre = Boolean(
    userProfile?.role === 'mestre' ||
    (userProfile as any)?.dbRole === 'mestre' ||
    userProfile?.uid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    currentUser?.uid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1'
  );
  const isEditor = Boolean(isAdmin || isMestre || userProfile?.canWriteSequenciador);

  const activePresetId = activePresetName?.startsWith('cloud:')
    ? activePresetName.replace('cloud:', '')
    : activePresetName;

  const loadedGroupPreset = privateCloudPresets.find(p =>
    p.id === activePresetId ||
    (metadata?.toada && p.name.trim().toLowerCase() === metadata.toada.trim().toLowerCase())
  );
  const loadedPublicPreset = publicCloudPresets.find(p =>
    p.id === activePresetId ||
    (metadata?.toada && p.name.trim().toLowerCase() === metadata.toada.trim().toLowerCase())
  );
  const currentLoadedPreset = loadedGroupPreset || loadedPublicPreset;

  const handleToggleDraft = async (presetId: string, currentDraft: boolean) => {
    const nextDraft = !currentDraft;
    queryClient.setQueriesData({ queryKey: ['cloudPresets'] }, (oldData: any) => {
      if (!Array.isArray(oldData)) return oldData;
      return oldData.map((p: any) => (p.id === presetId ? { ...p, isDraft: nextDraft } : p));
    });

    try {
      await togglePresetDraftStatus(
        presetId,
        currentDraft,
        userProfile?.role || (userProfile as any)?.dbRole || (isAdmin ? 'admin' : undefined),
        userProfile?.uid || currentUser?.uid
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
    if (!userProfile?.groupId) return;
    try {
      await setDefaultGroupPreset(
        userProfile.groupId,
        presetId,
        userProfile.role || userProfile.dbRole || (isAdmin ? 'admin' : undefined)
      );
    } catch (err: any) {
      console.error('Failed to set default group preset:', err);
      await sequencer.alertAsync(err.message || 'Erreur lors de la mise à jour du morceau de travail');
    }
  };

  return {
    groupLabel,
    groupLogo,
    publicCloudPresets,
    privateCloudPresets,
    showGroupCatalogue,
    groupDefaultPresetId,
    canSetDefaultPreset,
    isEditor,
    currentLoadedPreset,
    handleToggleDraft,
    handleSetDefaultPreset,
  };
}
