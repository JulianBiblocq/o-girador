/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QueryClient } from '@tanstack/react-query';
import { checkHasFullPlaybackAccess } from '../../contexts/AuthContext';
import { CloudPreset } from '../../types';
import { savePresetToCloud, fetchCloudPresets } from '../../cloudLibrary';
import { normalizePresetName } from '../queries/useCloudPresets';
import { SANCTUARIZED_PRESET_IDS } from '../../cloudPresetsStorage';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
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

  if (!options?.forceNew) {
    let targetPreset: CloudPreset | undefined = matchedPreset ?? undefined;
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
  const currentMarkers = Array.isArray(storeState.songMarkers) ? JSON.parse(JSON.stringify(storeState.songMarkers)) : [];
  const currentSections = Array.isArray(storeState.songSections) ? JSON.parse(JSON.stringify(storeState.songSections)) : [];
  const currentSignals = Array.isArray(storeState.measureSignals) ? JSON.parse(JSON.stringify(storeState.measureSignals)) : [];
  const currentVocalPreset = useAudioStore.getState().vocalPreset || presetData.vocalPreset || 'guide';

  const finalPresetData = {
    ...presetData,
    vocalPreset: currentVocalPreset,
    songMarkers: currentMarkers.length > 0 ? currentMarkers : (presetData.songMarkers || []),
    songSections: currentSections.length > 0 ? currentSections : (presetData.songSections || []),
    measureSignals: currentSignals.length > 0 ? currentSignals : (presetData.measureSignals || []),
  };
  finalPresetData.metadata = { ...finalPresetData.metadata, toada: presetName, vocalPreset: currentVocalPreset } as any;

  const finalVisibility = (isAdmin && visibility === 'public') ? 'admin_global' : visibility;

  const presetId = await savePresetToCloud(
    presetName, finalPresetData, userProfile.uid, finalVisibility,
    undefined, undefined, targetDocId, myGroupMestreId || undefined,
    myGroupId, userProfile.canWriteSequenciador, isDraft, userProfile.role
  );

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

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('loadPreset', presetId);
    window.history.replaceState(null, '', url.toString());
    localStorage.setItem('girador_last_loaded_preset_id', presetId);
  } catch (_) {}

  const newMeta = {
    toada: finalPresetData.metadata?.toada || presetName,
    nacao: finalPresetData.metadata?.nacao || '',
    compositor: finalPresetData.metadata?.compositor || '',
    ritmo: finalPresetData.metadata?.ritmo || '',
    ...finalPresetData.metadata,
    morceauId: presetId
  };
  useSequencerStore.getState().setMetadata(newMeta);
  if (sequencer.setMetadata) sequencer.setMetadata(newMeta);

  window.dispatchEvent(new Event('force-autosave'));
  queryClient.invalidateQueries({ queryKey: ['cloudPresets'] });
  window.dispatchEvent(new Event('refresh-cloud-presets'));
  await sequencer.alertAsync(lang === 'pt' ? 'Salvo na nuvem!' : 'Sauvegardé dans le cloud !');
  onClose();
}
