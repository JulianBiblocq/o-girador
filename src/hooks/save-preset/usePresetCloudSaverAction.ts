import { checkHasFullPlaybackAccess } from '../../contexts/AuthContext';
import { Preset } from '../../types';
import { savePresetToCloud } from '../../cloudLibrary';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { setActiveCloudPresetId } from '../../utils/cloudPresetState';
import { buildCurrentPresetData } from '../../contexts/audio/audioPresetDataBuilder';
import { savePresetToLibrary } from '../../db';
import { isMestreOrAdminProfile } from '../../utils/presetPermissions';
import { resolveSavePresetTarget } from './resolveSavePresetTarget';
import type { ExecuteSaveParams } from './usePresetCloudSaverTypes';

export async function executeSavePresetToCloud({
  name, presetData, userProfile, isAdmin, visibility, isDraft,
  effectiveMestreId, effectiveGroupId, matchedPreset, loadedMorceauId,
  cloudPresets, autoGenerateAudio, genererEtUploaderPresetCloudBounce,
  lang, sequencer, queryClient, onClose, options,
}: ExecuteSaveParams) {
  const presetName = name.trim();
  const isMestreOrAdmin = isMestreOrAdminProfile(userProfile, isAdmin);

  const resolved = await resolveSavePresetTarget({
    presetName,
    userProfile,
    effectiveMestreId,
    effectiveGroupId,
    matchedPreset,
    loadedMorceauId,
    cloudPresets,
    forceNew: options?.forceNew,
    lang,
    alertAsync: sequencer.alertAsync,
  });
  if (resolved.aborted) return;

  const { targetDocId, targetPreset } = resolved;

  const isFree = !checkHasFullPlaybackAccess(userProfile, isAdmin);
  if (isFree && !targetDocId) {
    const ownedCount = cloudPresets.filter((p) => p.ownerId === userProfile.uid).length;
    if (ownedCount >= 3 && !userProfile.email?.includes('@ogirador.com')) {
      await sequencer.alertAsync(lang === 'fr' ? 'Limite de 3 morceaux atteinte.' : 'Limite de 3 músicas atingido.');
      return;
    }
  }

  const storeState = useSequencerStore.getState();
  const currentVocalPreset = useAudioStore.getState().vocalPreset || presetData?.vocalPreset || 'guide';
  const effectiveMasterVol = typeof presetData?.masterVol === 'number' && !isNaN(presetData.masterVol) && presetData.masterVol <= 12
    ? presetData.masterVol
    : 0;

  const freshData = buildCurrentPresetData(
    sequencer,
    presetData?.masterEQ || (sequencer as any)?.masterEQ || { low: 0, mid: 0, high: 0 },
    presetData?.masterCompressor || (sequencer as any)?.masterCompressor || { threshold: -24, ratio: 4 },
    effectiveMasterVol,
    (sequencer as any)?.audioSync || {}
  );

  const existingAudioUrl = targetDocId ? ((targetPreset as any)?.audioUrl || (presetData as any)?.audioUrl) : undefined;

  const finalPresetData: Preset = {
    ...freshData,
    vocalPreset: currentVocalPreset,
    defaultDisplayMeasure: presetData?.defaultDisplayMeasure ?? freshData.defaultDisplayMeasure,
    isDraft: isDraft !== undefined ? isDraft : Boolean((presetData as any)?.isDraft),
    metadata: {
      ...freshData.metadata,
      ...presetData?.metadata,
      toada: presetName,
      morceauId: targetDocId,
      vocalPreset: currentVocalPreset,
    } as any,
  };

  const finalVisibility = (isMestreOrAdmin && visibility === 'public') ? 'admin_global' : visibility;
  const effectiveRoleForSave = isMestreOrAdmin
    ? (userProfile.role === 'admin' || userProfile.dbRole === 'admin' ? 'admin' : 'mestre')
    : userProfile.role;

  const presetId = await savePresetToCloud(
    presetName, finalPresetData, userProfile.uid, finalVisibility,
    undefined, existingAudioUrl, targetDocId, effectiveMestreId || undefined,
    effectiveGroupId, userProfile.canWriteSequenciador, isDraft, effectiveRoleForSave
  );

  try {
    await savePresetToLibrary(presetName, finalPresetData);
  } catch (err) {
    console.warn('[SAVE] Erreur non bloquante sauvegarde locale IndexedDB:', err);
  }

  if (autoGenerateAudio) {
    try {
      const audioUrl = await genererEtUploaderPresetCloudBounce(presetId, finalPresetData, finalPresetData.bpm || 100, {
        tenantId: effectiveGroupId, isLoopRegionActive: storeState.isLoopRegionActive,
        loopStartMeasure: storeState.loopStartMeasure, loopEndMeasure: storeState.loopEndMeasure,
        loopMode: storeState.loopMode, lang,
      });
      await savePresetToCloud(
        presetName, finalPresetData, userProfile.uid, finalVisibility, undefined, audioUrl ?? null,
        presetId, effectiveMestreId || undefined, effectiveGroupId, userProfile.canWriteSequenciador, isDraft, effectiveRoleForSave
      );
    } catch (e) {
      console.warn('Audio cloud bounce non-bloquant:', e);
    }
  }

  setActiveCloudPresetId(presetId);

  const newMeta = {
    nacao: '', compositor: '', ritmo: '', rhythmSignals: [],
    ...finalPresetData.metadata,
    toada: presetName,
    morceauId: presetId,
  };
  useSequencerStore.getState().setMetadata(newMeta);
  if (sequencer.setMetadata) sequencer.setMetadata(newMeta);
  queryClient.invalidateQueries({ queryKey: ['cloudPresets'] });
  window.dispatchEvent(new Event('refresh-cloud-presets'));
  window.dispatchEvent(new CustomEvent('force-autosave'));
  await sequencer.alertAsync(lang === 'pt' ? 'Salvo na nuvem!' : 'Sauvegardé dans le cloud !');
  onClose();
}
