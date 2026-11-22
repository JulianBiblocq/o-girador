import { Preset } from '../../types';
import { savePresetToCloud } from '../../cloudLibrary';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { setActiveCloudPresetId } from '../../utils/cloudPresetState';
import { buildCurrentPresetData } from '../../contexts/audio/audioPresetDataBuilder';
import { savePresetToLibrary } from '../../db';
import { isMestreOrAdminProfile } from '../../utils/presetPermissions';
import { evaluateCloudPresetSave, resolveUserAccessPolicy } from '../../utils/userAccessPolicy';
import { applyGateDecisionToModals } from '../../utils/cloudWriteGuard';
import { resolveSavePresetTarget } from './resolveSavePresetTarget';
import type { ExecuteSaveParams } from './usePresetCloudSaverTypes';

export async function executeSavePresetToCloud({
  name, presetData, userProfile, isAdmin, visibility, isDraft, isShowcase, keepInGroup,
  effectiveMestreId, effectiveGroupId, matchedPreset, loadedMorceauId,
  cloudPresets, autoGenerateAudio, genererEtUploaderPresetCloudBounce,
  lang, sequencer, queryClient, onClose, options,
}: ExecuteSaveParams) {
  const presetName = name.trim();
  const policy = resolveUserAccessPolicy(userProfile, { hasAuthUser: Boolean(userProfile?.uid), isAdminFlag: isAdmin });
  const isMestreOrAdmin = isMestreOrAdminProfile(userProfile, isAdmin) || policy.isTrialActive;

  const resolved = await resolveSavePresetTarget({
    presetName, userProfile, effectiveMestreId, effectiveGroupId,
    matchedPreset, loadedMorceauId, cloudPresets,
    forceNew: options?.forceNew, lang, alertAsync: sequencer.alertAsync,
  });
  if (resolved.aborted) return;

  const { targetDocId, targetPreset } = resolved;
  const effectiveShowcase = Boolean(policy.isSuperAdmin && isShowcase);
  const requestedVisibility = effectiveShowcase
    ? 'admin_global'
    : (!policy.canPublishToGroup ? 'private' : ((isMestreOrAdmin && visibility === 'public') ? 'admin_global' : visibility));

  const ownedPrivateCount = cloudPresets.filter(
    (p) => p.ownerId === userProfile.uid && p.visibility === 'private' && !p.groupId
  ).length;
  const gate = evaluateCloudPresetSave(policy, {
    isUpdatingExisting: Boolean(targetDocId),
    ownedPrivatePresetsCount: ownedPrivateCount,
    requestedVisibility,
  });
  if (!gate.allowed) {
    onClose();
    applyGateDecisionToModals(gate);
    return;
  }

  const storeState = useSequencerStore.getState();
  const currentVocalPreset = useAudioStore.getState().vocalPreset || presetData?.vocalPreset || 'guide';
  const effectiveMasterVol =
    typeof presetData?.masterVol === 'number' && !isNaN(presetData.masterVol) && presetData.masterVol <= 12
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
  const finalDraft = effectiveShowcase ? false : (isDraft !== undefined ? isDraft : Boolean((presetData as any)?.isDraft));

  const finalPresetData: Preset = {
    ...freshData,
    vocalPreset: currentVocalPreset,
    vocalTransposeSteps: freshData.vocalTransposeSteps,
    defaultDisplayMeasure: presetData?.defaultDisplayMeasure ?? freshData.defaultDisplayMeasure,
    isDraft: finalDraft,
    isShowcase: effectiveShowcase,
    metadata: {
      ...freshData.metadata,
      ...presetData?.metadata,
      toada: presetName,
      morceauId: targetDocId,
      vocalPreset: currentVocalPreset,
      vocalTransposeSteps: freshData.vocalTransposeSteps,
      transpositionSemitones: freshData.vocalTransposeSteps,
    } as any,
  };

  const effectiveRoleForSave = policy.isSuperAdmin
    ? 'admin'
    : (isMestreOrAdmin ? 'mestre' : userProfile.role);
  const targetGroupIdForSave = requestedVisibility === 'private' || (effectiveShowcase && !keepInGroup)
    ? undefined
    : effectiveGroupId;
  const saveOpts = {
    isShowcase: policy.isSuperAdmin ? effectiveShowcase : undefined,
    keepInGroup,
    skipVocalUpload: !policy.canUploadVocalCloud,
  };

  const presetId = await savePresetToCloud(
    presetName, finalPresetData, userProfile.uid, requestedVisibility,
    undefined, existingAudioUrl, targetDocId, targetGroupIdForSave ? (effectiveMestreId || undefined) : undefined,
    targetGroupIdForSave, policy.canPublishToGroup && Boolean(userProfile.canWriteSequenciador), finalDraft, effectiveRoleForSave, saveOpts
  );

  try { await savePresetToLibrary(presetName, finalPresetData); } catch (_) {}

  if (autoGenerateAudio && policy.canUploadVocalCloud) {
    try {
      const audioUrl = await genererEtUploaderPresetCloudBounce(presetId, finalPresetData, finalPresetData.bpm || 100, {
        tenantId: targetGroupIdForSave, isLoopRegionActive: storeState.isLoopRegionActive,
        loopStartMeasure: storeState.loopStartMeasure, loopEndMeasure: storeState.loopEndMeasure,
        loopMode: storeState.loopMode, lang,
      });
      await savePresetToCloud(
        presetName, finalPresetData, userProfile.uid, requestedVisibility, undefined, audioUrl ?? null,
        presetId, targetGroupIdForSave ? (effectiveMestreId || undefined) : undefined, targetGroupIdForSave,
        policy.canPublishToGroup && Boolean(userProfile.canWriteSequenciador), finalDraft, effectiveRoleForSave, saveOpts
      );
    } catch (e) { console.warn('Audio cloud bounce non-bloquant:', e); }
  }

  setActiveCloudPresetId(presetId);
  const newMeta = { nacao: '', compositor: '', ritmo: '', rhythmSignals: [], ...finalPresetData.metadata, toada: presetName, morceauId: presetId };
  useSequencerStore.getState().setMetadata(newMeta);
  if (sequencer.setMetadata) sequencer.setMetadata(newMeta);
  queryClient.invalidateQueries({ queryKey: ['cloudPresets'] });
  window.dispatchEvent(new Event('refresh-cloud-presets'));
  window.dispatchEvent(new CustomEvent('force-autosave'));
  await sequencer.alertAsync(lang === 'pt' ? 'Salvo na nuvem!' : 'Sauvegardé dans le cloud !');
  onClose();
}
