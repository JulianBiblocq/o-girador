/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { checkHasFullPlaybackAccess, UserProfile } from '../contexts/AuthContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { vocalEngineService } from '../audio/vocalEngineService';
import { useTransportStore } from '../stores/useTransportStore';

export function useAppAuthPermissions(userProfile: UserProfile | null, isAdmin: boolean) {
  useEffect(() => {
    const fullPlaybackAccess = checkHasFullPlaybackAccess(userProfile, isAdmin);
    useSequencerStore.getState().setHasFullPlaybackAccess(fullPlaybackAccess);

    const isFreeIndividual = !fullPlaybackAccess;
    useSequencerStore.getState().setMaxMeasuresAllowed(isFreeIndividual ? 30 : null);

    const urlParams = new URLSearchParams(window.location.search);
    const hasSharedPreset = Boolean(
      urlParams.get('loadPreset') ||
      urlParams.get('presetId') ||
      urlParams.get('file') ||
      urlParams.get('sectionId') ||
      urlParams.get('baque')
    );
    const isPreview = !fullPlaybackAccess && (hasSharedPreset && !userProfile);
    useSequencerStore.getState().setIsPreviewMode(isPreview);
  }, [userProfile, isAdmin]);

  useEffect(() => {
    vocalEngineService.rehydrateVocalBuffers().catch((err) => {
      console.error('🎙️ [VOCAL REHYDRATE] Erreur montage App:', err);
    });
  }, []);

  useEffect(() => {
    if (userProfile && (userProfile as any).customSwingOffsets) {
      const savedOffsets = (userProfile as any).customSwingOffsets;
      const savedIntensity = (userProfile as any).customSwingIntensity !== undefined ? (userProfile as any).customSwingIntensity : 100;
      const currentSwing = useTransportStore.getState().globalSwing;
      useTransportStore.getState().setGlobalSwing({
        ...currentSwing,
        customOffsets: savedOffsets,
        swingIntensity: savedIntensity,
      });
    }
  }, [userProfile?.uid]);
}
