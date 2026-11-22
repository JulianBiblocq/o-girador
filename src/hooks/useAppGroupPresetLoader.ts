import React from 'react';
import { getDefaultGroupPresetId } from '../cloudGroups';
import {
  pickVisitorShowcaseCloudPreset,
  resolveEffectiveStartupGroupId,
} from '../services/cloud-common/cloudTenantAuthGuard';
import {
  clearColdVisitorFallbackFlag,
  wasColdVisitorFallbackLoaded,
} from './app-audio/initialPresetLoader';
import { wasUnsavedSessionRestored } from './app-audio/autosavePayloadBuilder';

interface UseAppGroupPresetLoaderParams {
  groupId?: string | null;
  cloudPresets: any[];
  audio: any;
}

export function useAppGroupPresetLoader({ groupId, cloudPresets, audio }: UseAppGroupPresetLoaderParams) {
  const hasAutoLoadedGroupRef = React.useRef<string | null>(null);
  const hasAutoLoadedShowcaseRef = React.useRef(false);
  const audioRef = React.useRef(audio);
  React.useEffect(() => { audioRef.current = audio; }, [audio]);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (
      urlParams.has('loadPreset') ||
      urlParams.has('loadPattern') ||
      urlParams.has('baque') ||
      urlParams.has('presetId') ||
      urlParams.has('trainingId') ||
      urlParams.has('loadSection') ||
      urlParams.has('editPatternId') ||
      (window.location.hash && window.location.hash.length > 1 && window.location.hash !== '#legal')
    ) {
      return;
    }

    if (!cloudPresets || cloudPresets.length === 0) return;

    const effectiveGroupId = resolveEffectiveStartupGroupId(groupId);

    if (!effectiveGroupId) {
      if (hasAutoLoadedShowcaseRef.current || !wasColdVisitorFallbackLoaded()) return;
      const showcase = pickVisitorShowcaseCloudPreset(cloudPresets);
      if (!showcase) return;
      hasAutoLoadedShowcaseRef.current = true;
      clearColdVisitorFallbackFlag();
      audioRef.current.loadFallbackPreset(`cloud:${showcase.id}`).then(() => {
        audioRef.current.setActivePresetName(`cloud:${showcase.id}`);
      }).catch((e: any) => console.warn('loadFallbackPreset error on showcase preset:', e));
      return;
    }

    if (hasAutoLoadedGroupRef.current === effectiveGroupId || wasUnsavedSessionRestored()) return;

    let isMounted = true;
    getDefaultGroupPresetId(effectiveGroupId).then((defaultPresetId) => {
      if (!isMounted || !defaultPresetId || hasAutoLoadedGroupRef.current === effectiveGroupId) return;
      const found = cloudPresets.find((p) => p.id === defaultPresetId && p.isDraft !== true);
      if (found && isMounted) {
        hasAutoLoadedGroupRef.current = effectiveGroupId;
        clearColdVisitorFallbackFlag();
        try {
          localStorage.setItem('girador_last_loaded_preset_id', defaultPresetId);
        } catch (_) {}
        audioRef.current.loadFallbackPreset(`cloud:${found.id}`).then(() => {
          audioRef.current.setActivePresetName(`cloud:${found.id}`);
        }).catch((e: any) => console.warn('loadFallbackPreset error on default group preset:', e));
      }
    }).catch((err) => {
      console.warn('[AutoLoadDefaultPreset] Erreur lors du chargement auto du morceau vedette:', err);
    });

    return () => { isMounted = false; };
  }, [groupId, cloudPresets]);
}
