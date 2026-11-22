import { useEffect, useRef } from 'react';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useDesktopWorkspaceStore } from '../stores/useDesktopWorkspaceStore';
import { vocalEngineService } from '../audio/vocalEngineService';
import { useTransportStore } from '../stores/useTransportStore';
import { syncMobileViewModeWithProfile, hasDirectModeUrlParam } from '../utils/viewModeResolver';
import { resolvePracticeModeForProfile } from '../stores/helpers/practiceModeHelpers';
import { getStoredDesktopStartupMode } from '../utils/userPreferencesStorage';
import { resolveUserAccessPolicy } from '../utils/userAccessPolicy';

export function useAppAuthPermissions(userProfile: UserProfile | null, isAdmin: boolean) {
  const { currentUser } = useAuth();
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
    const store = useSequencerStore.getState();
    store.syncFocusWithTracks(store.tracks, userProfile);
  }, [userProfile?.uid, userProfile?.instrument, userProfile?.preferredInstrument]);

  useEffect(() => {
    if (userProfile) {
      const { mobileViewMode, setMobileViewMode } = useSequencerStore.getState();
      syncMobileViewModeWithProfile(userProfile, mobileViewMode, setMobileViewMode);
    }
  }, [userProfile?.uid, userProfile?.lastSequenciadorMode, userProfile?.role, userProfile?.instrument]);

  useEffect(() => {
    const applyPolicy = () => {
      const policy = resolveUserAccessPolicy(userProfile, {
        hasAuthUser: Boolean(currentUser || userProfile?.uid),
        isAdminFlag: isAdmin,
      });
      const s = useSequencerStore.getState();
      s.setHasFullPlaybackAccess(policy.hasFullPlaybackAccess);
      s.setMaxMeasuresAllowed(policy.maxMeasuresAllowed);
      s.setIsUserTrialExpired(policy.isTrialExpired);
      s.setIsPreviewMode(false);
      return policy;
    };

    const policy = applyPolicy();
    if (policy.isTrialActive && policy.trialEndMs) {
      const delayMs = Math.max(500, Math.min(2_147_483_647, policy.trialEndMs - Date.now() + 250));
      const timer = window.setTimeout(applyPolicy, delayMs);
      return () => window.clearTimeout(timer);
    }
  }, [currentUser?.uid, userProfile, isAdmin]);

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
