
import React, { useEffect, useRef } from 'react';
import { checkHasFullPlaybackAccess, UserProfile } from '../contexts/AuthContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { vocalEngineService } from '../audio/vocalEngineService';
import { useTransportStore } from '../stores/useTransportStore';
import { syncMobileViewModeWithProfile, isStudioPrivilegedProfile } from '../utils/viewModeResolver';

export function useAppAuthPermissions(userProfile: UserProfile | null, isAdmin: boolean) {
  const initializedStudioUidRef = useRef<string | null>(null);

  useEffect(() => {
    const currentKey = userProfile?.uid || (isAdmin ? 'admin' : null);
    if (!currentKey || initializedStudioUidRef.current === currentKey) return;
    initializedStudioUidRef.current = currentKey;

    if (isStudioPrivilegedProfile(userProfile, isAdmin)) {
      useSequencerStore.getState().setIsPracticeMode(false);
      const urlParams = new URLSearchParams(window.location.search);
      if (!urlParams.has('mode')) {
        useSequencerStore.getState().setMobileViewMode('complet');
      }
    }
  }, [userProfile?.uid, userProfile?.role, userProfile?.canWriteSequenciador, isAdmin]);

  useEffect(() => {
    if (userProfile) {
      const { mobileViewMode, setMobileViewMode } = useSequencerStore.getState();
      syncMobileViewModeWithProfile(userProfile, mobileViewMode, setMobileViewMode);
    }
  }, [userProfile?.uid, userProfile?.lastSequenciadorMode, userProfile?.role, userProfile?.instrument]);
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
      console.error('[VOCAL REHYDRATE] Erreur montage App:', err);
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
