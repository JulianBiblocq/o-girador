import { auth } from '../firebase/config';
import type { UserProfile } from '../contexts/auth/authTypes';
import { useSequencerStore } from '../stores/useSequencerStore';
import {
  resolveUserAccessPolicy,
  type GateDecision,
  type SubscriptionModalReason,
  type UserAccessPolicy,
  type VisitorModalReason,
} from './userAccessPolicy';

export type GuardedFeature =
  | 'cloud_library'
  | 'vocal_cloud'
  | 'speed_trainer_create'
  | 'pdf_press'
  | 'community_catalog'
  | 'mobile_draft';

export function evaluateFeatureGate(policy: UserAccessPolicy, feature: GuardedFeature): GateDecision {
  if (feature === 'community_catalog') {
    if (policy.canAccessCommunityCatalog) return { allowed: true };
    if (!policy.isAuthenticated) return { allowed: false, modal: 'visitor', visitorReason: 'community_catalog' };
    return {
      allowed: false,
      modal: 'subscription',
      subscriptionReason: policy.isTrialExpired ? 'trial_expired' : 'community_catalog',
    };
  }
  if (!policy.isAuthenticated) {
    const visitorReason: VisitorModalReason =
      feature === 'cloud_library' || feature === 'mobile_draft' ? 'save_cloud' : 'premium_feature';
    return { allowed: false, modal: 'visitor', visitorReason };
  }
  if (policy.isTrialExpired) {
    return { allowed: false, modal: 'subscription', subscriptionReason: 'trial_expired' };
  }
  if (feature === 'mobile_draft') return { allowed: true };
  if (feature === 'pdf_press' && policy.canUsePdfPress) return { allowed: true };
  if (feature === 'cloud_library' && policy.canWriteCloudLibraries) return { allowed: true };
  if (feature === 'vocal_cloud' && policy.canUploadVocalCloud) return { allowed: true };
  if (feature === 'speed_trainer_create' && policy.canCreateSpeedTrainerChallenges) return { allowed: true };
  return { allowed: false, modal: 'subscription', subscriptionReason: 'premium_feature' };
}

export function applyGateDecisionToModals(decision: GateDecision): boolean {
  if (decision.allowed) return true;
  const store = useSequencerStore.getState();
  if (decision.modal === 'visitor') {
    store.openVisitorAuthModal(decision.visitorReason || 'default');
  } else {
    store.openSubscriptionModal(decision.subscriptionReason || 'premium_feature');
  }
  return false;
}

export function guardFeatureWithModal(
  feature: GuardedFeature,
  userProfile?: UserProfile | null,
  hasAuthUser?: boolean
): boolean {
  const authed = hasAuthUser ?? Boolean(auth.currentUser || userProfile?.uid);
  const policy = resolveUserAccessPolicy(userProfile, { hasAuthUser: authed });
  return applyGateDecisionToModals(evaluateFeatureGate(policy, feature));
}

export function openMeasureLimitModal(): void {
  const store = useSequencerStore.getState();
  const reason: SubscriptionModalReason = store.isUserTrialExpired ? 'trial_expired' : 'measures_limit';
  store.openSubscriptionModal(reason);
}
