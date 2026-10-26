
import { QueryClient } from '@tanstack/react-query';
import { checkHasFullPlaybackAccess } from '../../contexts/AuthContext';
import { CloudPreset, Preset } from '../../types';
import { savePresetToCloud, fetchCloudPresets } from '../../cloudLibrary';
import { normalizePresetName } from '../queries/useCloudPresets';
import { SANCTUARIZED_PRESET_IDS } from '../../cloudPresetsStorage';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { setActiveCloudPresetId } from '../../utils/cloudPresetState';
import { buildCurrentPresetData } from '../../contexts/audio/audioPresetDataBuilder';
import { savePresetToLibrary } from '../../db';
import type { ExecuteSaveParams } from './usePresetCloudSaverTypes';

export async function executeSavePresetToCloud({
  name, presetData, userProfile, isAdmin, isMestre, visibility, isDraft,
  effectiveMestreId, effectiveGroupId, matchedPreset, loadedMorceauId,
  cloudPresets, autoGenerateAudio, genererEtUploaderPresetCloudBounce,
  lang, sequencer, queryClient, onClose, options
}: ExecuteSaveParams) {
  const presetName = name.trim();
  const myGroupMestreId = effectiveMestreId;
  const myGroupId = effectiveGroupId;
  let targetDocId: string | undefined = undefined;
  let targetPreset: CloudPreset | undefined = undefined;

  if (!options?.forceNew) {
    targetPreset = matchedPreset ?? undefined;
    if (!targetPreset) {
      const fresh = await fetchCloudPresets(userProfile.uid, userProfile.role, myGroupMestreId ?? null, myGroupId, userProfile.canWriteSequenciador);
      if (loadedMorceauId) targetPreset = fresh.find((p) => p.id === loadedMorceauId);
      if (!targetPreset) targetPreset = fresh.find((p) => SANCTUARIZED_PRESET_IDS.has(p.id) && normalizePresetName(p.name) === normalizePresetName(presetName));
      if (!targetPreset) targetPreset = fresh.find((p) => p.name.trim().toLowerCase() === presetName.toLowerCase() && p.ownerId === userProfile.uid);
      if (!targetPreset && myGroupMestreId) targetPreset = fresh.find((p) => p.name.trim().toLowerCase() === presetName.toLowerCase() && (p.mestreId === myGroupMestreId || p.ownerId === myGroupMestreId));
      if (!targetPreset && (isMestre || isAdmin)) targetPreset = fresh.find((p) => p.name.trim().toLowerCase() === presetName.toLowerCase());
    }

    if (targetPreset) {
      const isOwn = targetPreset.ownerId === userProfile.uid;
      const isLocked = (targetPreset as any).isLocked === true || SANCTUARIZED_PRESET_IDS.has(targetPreset.id);

      if (isLocked && !isMestre && !isAdmin) {
        await sequencer.alertAsync(lang === 'fr'
          ? `Le morceau "${presetName}" est verrouillé par le Mestre.`
          : `A música "${presetName}" está bloqueada pelo Mestre.`);
        return;
      }
      if (!isOwn && !isMestre && !isAdmin) {
        await sequencer.alertAsync(lang === 'fr'
          ? `Le morceau "${presetName}" appartient à un autre membre.`
          : `A música "${presetName}" foi criada por outro membro.`);
        return;
      }
      targetDocId = targetPreset.id;
    }
  }


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

  const existingAudioUrl = (targetPreset as any)?.audioUrl || (presetData as any)?.audioUrl;

  const finalPresetData: Preset = {
    ...freshData,
    vocalPreset: currentVocalPreset,
    defaultDisplayMeasure: presetData?.defaultDisplayMeasure ?? freshData.defaultDisplayMeasure,
    isDraft: isDraft !== undefined ? isDraft : Boolean((presetData as any)?.isDraft),
    metadata: {
      ...freshData.metadata,
      ...presetData?.metadata,
      toada: presetName,
      vocalPreset: currentVocalPreset,
    } as any,
  };

  const finalVisibility = (isAdmin && visibility === 'public') ? 'admin_global' : visibility;

  const presetId = await savePresetToCloud(
    presetName, finalPresetData, userProfile.uid, finalVisibility,
    undefined, existingAudioUrl, targetDocId, myGroupMestreId || undefined,
    myGroupId, userProfile.canWriteSequenciador, isDraft, userProfile.role
  );

  try {
    await savePresetToLibrary(presetName, finalPresetData);
  } catch (err) {
    console.warn("[SAVE] Erreur non bloquante sauvegarde locale IndexedDB:", err);
  }

  if (autoGenerateAudio) {
    try {
      const audioUrl = await genererEtUploaderPresetCloudBounce(presetId, finalPresetData, finalPresetData.bpm || 100, {
        tenantId: myGroupId, isLoopRegionActive: storeState.isLoopRegionActive,
        loopStartMeasure: storeState.loopStartMeasure, loopEndMeasure: storeState.loopEndMeasure,
        loopMode: storeState.loopMode, lang
      });
      await savePresetToCloud(presetName, finalPresetData, userProfile.uid, finalVisibility, undefined, audioUrl ?? null, presetId, myGroupMestreId || undefined, myGroupId, userProfile.canWriteSequenciador, isDraft, userProfile.role);
    } catch (e) {
      console.warn("Audio cloud bounce non-bloquant:", e);
    }
  }

  setActiveCloudPresetId(presetId);

  const newMeta = {
    nacao: '',
    compositor: '',
    ritmo: '',
    rhythmSignals: [],
    ...finalPresetData.metadata,
    toada: presetName,
    morceauId: presetId
  };
  useSequencerStore.getState().setMetadata(newMeta);
  if (sequencer.setMetadata) sequencer.setMetadata(newMeta);
  queryClient.invalidateQueries({ queryKey: ['cloudPresets'] });
  window.dispatchEvent(new Event('refresh-cloud-presets'));
  window.dispatchEvent(new CustomEvent('force-autosave'));
  await sequencer.alertAsync(lang === 'pt' ? 'Salvo na nuvem!' : 'Sauvegardé dans le cloud !');
  onClose();
}
