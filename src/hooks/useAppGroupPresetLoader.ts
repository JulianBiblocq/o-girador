/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { getDefaultGroupPresetId } from '../cloudGroups';

interface UseAppGroupPresetLoaderParams {
  groupId?: string | null;
  cloudPresets: any[];
  audio: any;
}

export function useAppGroupPresetLoader({ groupId, cloudPresets, audio }: UseAppGroupPresetLoaderParams) {
  const hasAutoLoadedDefaultRef = React.useRef(false);
  const audioRef = React.useRef(audio);
  React.useEffect(() => { audioRef.current = audio; }, [audio]);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (hasAutoLoadedDefaultRef.current) return;
    if (
      urlParams.has('loadPreset') ||
      urlParams.has('loadPattern') ||
      urlParams.has('baque') ||
      urlParams.has('presetId') ||
      urlParams.has('trainingId') ||
      (window.location.hash && window.location.hash.length > 1)
    ) {
      return;
    }

    const effectiveGroupId = groupId || 'Samambaia';
    if (!effectiveGroupId || !cloudPresets || cloudPresets.length === 0) return;

    let isMounted = true;
    getDefaultGroupPresetId(effectiveGroupId).then((defaultPresetId) => {
      if (!isMounted || !defaultPresetId || hasAutoLoadedDefaultRef.current) return;

      try {
        localStorage.setItem('girador_last_loaded_preset_id', defaultPresetId);
      } catch (_) {}

      const found = cloudPresets.find(p => p.id === defaultPresetId);
      if (found && isMounted && !hasAutoLoadedDefaultRef.current) {
        hasAutoLoadedDefaultRef.current = true;
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
