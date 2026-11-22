import type { UserProfile } from '../contexts/auth/authTypes';
import { isSuperAdminProfile } from './userPreferencesStorage';
import { OFFICIAL_MESTRE_UID } from './presetPermissions';

export type VisitorModalReason = 'default' | 'save_cloud' | 'community_catalog' | 'premium_feature';
export type SubscriptionModalReason =
  | 'measures_limit'
  | 'free_cloud_quota'
  | 'trial_expired'
  | 'community_catalog'
  | 'premium_feature';

export type UserAccessTier =
  | 'visitor'
  | 'free_user'
  | 'group_member'
  | 'group_coauthor'
  | 'mestre_trial_active'
  | 'mestre_trial_expired'
  | 'subscriber_or_mestre'
  | 'super_admin';

export interface UserAccessPolicy {
  tier: UserAccessTier;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  trialStartMs: number | null;
  trialEndMs: number | null;
  hasFullPlaybackAccess: boolean;
  isPreviewMode: false;
  maxMeasuresAllowed: number | null;
  maxPrivateCloudPresets: number | null;
  canPublishToGroup: boolean;
  canPublishPublic: boolean;
  canWriteCloudLibraries: boolean;
  canUploadVocalCloud: boolean;
  canCreateSpeedTrainerChallenges: boolean;
  canUsePdfPress: boolean;
  canAccessCommunityCatalog: boolean;
}

export type GateDecision =
  | { allowed: true }
  | {
      allowed: false;
      modal: 'visitor' | 'subscription';
      visitorReason?: VisitorModalReason;
      subscriptionReason?: SubscriptionModalReason;
    };

export function parseTimestampMs(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) return val;
  if (val && typeof (val as { toMillis?: unknown }).toMillis === 'function') {
    const ms = (val as { toMillis: () => number }).toMillis();
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  }
  if (val && typeof (val as { seconds?: unknown }).seconds === 'number') {
    const sec = (val as { seconds: number }).seconds;
    return Number.isFinite(sec) && sec > 0 ? sec * 1000 : null;
  }
  if (typeof val === 'string' && val.trim()) {
    const parsed = Date.parse(val);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export function resolveUserAccessPolicy(
  profile?: UserProfile | null,
  opts?: { hasAuthUser?: boolean; isAdminFlag?: boolean; nowMs?: number }
): UserAccessPolicy {
  const nowMs = opts?.nowMs ?? Date.now();
  const isAuthenticated = Boolean(opts?.hasAuthUser ?? profile?.uid);
  const baseFree = (tier: UserAccessTier, authed: boolean, expired = false, tStart: number | null = null, tEnd: number | null = null): UserAccessPolicy => ({
    tier, isAuthenticated: authed, isSuperAdmin: false, isTrialActive: false, isTrialExpired: expired,
    trialStartMs: tStart, trialEndMs: tEnd, hasFullPlaybackAccess: true, isPreviewMode: false,
    maxMeasuresAllowed: 30, maxPrivateCloudPresets: authed && !expired ? 2 : 0,
    canPublishToGroup: false, canPublishPublic: false, canWriteCloudLibraries: false,
    canUploadVocalCloud: false, canCreateSpeedTrainerChallenges: false, canUsePdfPress: false, canAccessCommunityCatalog: false,
  });

  if (!isAuthenticated && !profile) return baseFree('visitor', false);
  const superAdmin = isSuperAdminProfile(profile);
  const trialStartMs = parseTimestampMs(profile?.trialStartDateMs) ?? parseTimestampMs(profile?.trialStartDate);
  const trialEndMs = parseTimestampMs(profile?.trialEndDateMs) ?? parseTimestampMs(profile?.trialEndDate);
  const hasPaidSub = Boolean(profile?.isPremium || profile?.subscriptionStatus === 'active' || profile?.uid === OFFICIAL_MESTRE_UID);

  const fullAccess = (tier: UserAccessTier, trialAct = false): UserAccessPolicy => ({
    tier, isAuthenticated: true, isSuperAdmin: superAdmin, isTrialActive: trialAct, isTrialExpired: false,
    trialStartMs, trialEndMs, hasFullPlaybackAccess: true, isPreviewMode: false, maxMeasuresAllowed: null,
    maxPrivateCloudPresets: null, canPublishToGroup: true, canPublishPublic: superAdmin || tier !== 'group_coauthor',
    canWriteCloudLibraries: true, canUploadVocalCloud: true, canCreateSpeedTrainerChallenges: true,
    canUsePdfPress: true, canAccessCommunityCatalog: true,
  });

  if (superAdmin) return fullAccess('super_admin');
  if (hasPaidSub) return fullAccess('subscriber_or_mestre');
  if (trialEndMs !== null) {
    return nowMs <= trialEndMs ? fullAccess('mestre_trial_active', true) : baseFree('mestre_trial_expired', true, true, trialStartMs, trialEndMs);
  }

  const role = String(profile?.dbRole || profile?.role || '').trim().toLowerCase();
  if (role === 'mestre' || role === 'mestri') return fullAccess('subscriber_or_mestre');

  const hasGroup = Boolean((profile?.groupId || '').trim());
  if (hasGroup && profile?.canWriteSequenciador === true) return fullAccess('group_coauthor');
  if (hasGroup) {
    return { ...baseFree('group_member', true), canUsePdfPress: true, canAccessCommunityCatalog: true };
  }
  return baseFree('free_user', true);
}

export function evaluateCloudPresetSave(
  policy: UserAccessPolicy,
  params: { isUpdatingExisting: boolean; ownedPrivatePresetsCount: number; requestedVisibility?: string }
): GateDecision {
  if (!policy.isAuthenticated) return { allowed: false, modal: 'visitor', visitorReason: 'save_cloud' };
  if (policy.isTrialExpired) return { allowed: false, modal: 'subscription', subscriptionReason: 'trial_expired' };
  if (policy.maxPrivateCloudPresets === null) return { allowed: true };
  if (params.requestedVisibility && params.requestedVisibility !== 'private') {
    return { allowed: false, modal: 'subscription', subscriptionReason: 'premium_feature' };
  }
  if (!params.isUpdatingExisting && params.ownedPrivatePresetsCount >= policy.maxPrivateCloudPresets) {
    return { allowed: false, modal: 'subscription', subscriptionReason: 'free_cloud_quota' };
  }
  return { allowed: true };
}
