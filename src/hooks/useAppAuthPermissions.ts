import { useEffect, useRef } from 'react';
import { checkHasFullPlaybackAccess, UserProfile } from '../contexts/AuthContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useDesktopWorkspaceStore } from '../stores/useDesktopWorkspaceStore';
import { vocalEngineService } from '../audio/vocalEngineService';
import { useTransportStore } from '../stores/useTransportStore';
import { syncMobileViewModeWithProfile, hasDirectModeUrlParam } from '../utils/viewModeResolver';
import { resolvePracticeModeForProfile } from '../stores/helpers/practiceModeHelpers';
import {
  getStoredDesktopStartupMode,
  getEffectiveWorkingInstrument,
  hasExplicitLocalWorkingInstrument,
  setStoredWorkingInstrument,
  WorkingInstrumentChoice,
} from '../utils/userPreferencesStorage';

export function useAppAuthPermissions(userProfile: UserProfile | null, isAdmin: boolean) {
  const initializedStudioUidRef = useRef<string | null>(null);

  useEffect(() => {
    const currentKey = userProfile?.uid || (isAdmin ? 'admin' : 'visitor');
    if (initializedStudioUidRef.current === currentKey) return;
    initializedStudioUidRef.current = currentKey;

    const desktopPref = getStoredDesktopStartupMode();
    if (desktopPref === 'studio_dual') {
      useDesktopWorkspaceStore.getState().setPreferredScreenMode('dual');
    } else if (desktopPref === 'studio_single') {
      useDesktopWorkspaceStore.getState().setPreferredScreenMode('single');
    }

    if (!hasDirectModeUrlParam()) {
      const targetPractice = resolvePracticeModeForProfile(userProfile, isAdmin);
      useSequencerStore.getState().setIsPracticeMode(targetPractice);
    }
  }, [userProfile?.uid, userProfile?.role, userProfile?.canWriteSequenciador, isAdmin]);

  useEffect(() => {
    if (!userProfile) return;
    if (!hasExplicitLocalWorkingInstrument() && userProfile.preferredInstrument) {
      setStoredWorkingInstrument(userProfile.preferredInstrument as WorkingInstrumentChoice);
    }
    const effectiveInst = getEffectiveWorkingInstrument(userProfile);
    const store = useSequencerStore.getState();
    store.setPreferredInstrumentName(effectiveInst, userProfile);
    store.syncFocusWithTracks(store.tracks, userProfile);
  }, [userProfile?.uid, userProfile?.instrument, userProfile?.preferredInstrument]);

  useEffect(() => {
    if (userProfile) {
      const { mobileViewMode, setMobileViewMode } = useSequencerStore.getState();
      syncMobileViewModeWithProfile(userProfile, mobileViewMode, setMobileViewMode);
    }
  }, [userProfile?.uid, userProfile?.lastSequenciadorMode, userProfile?.role, userProfile?.instrument]);

  useEffect(() => {
    const fullPlaybackAccess = checkHasFullPlaybackAccess(userProfile, isAdmin);
    useSequencerStore.getState().setHasFullPlaybackAccess(fullPlaybackAccess);
    useSequencerStore.getState().setMaxMeasuresAllowed(!fullPlaybackAccess ? 30 : null);

    const urlParams = new URLSearchParams(window.location.search);
    const hasSharedPreset = Boolean(
      urlParams.get('loadPreset') || urlParams.get('presetId') || urlParams.get('file') ||
      urlParams.get('sectionId') || urlParams.get('baque')
    );
    useSequencerStore.getState().setIsPreviewMode(!fullPlaybackAccess && (hasSharedPreset && !userProfile));
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
      useTransportStore.getState().setGlobalSwing({ ...currentSwing, customOffsets: savedOffsets, swingIntensity: savedIntensity });
    }
  }, [userProfile?.uid]);
}
