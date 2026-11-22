import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCloudPresetSave, parseTimestampMs, resolveUserAccessPolicy } from '../userAccessPolicy';
import { resolveCatalogThreeTiers } from '../../components/preset-accordion/presetAccordionTiers';
import type { UserProfile } from '../../contexts/auth/authTypes';

const NOW = 1_750_000_000_000;
const mkProfile = (overrides: Partial<UserProfile>): UserProfile => ({
  uid: 'user-1', email: 'musicien@example.com', displayName: 'Musicien',
  photoURL: null, role: 'visiteur', createdAt: NOW - 10_000, ...overrides,
});

describe('userAccessPolicy — Matrice 5 profils & Mestres à l’essai', () => {
  it('1. Passant sans compte : écoute 100 % libre (0 coupure), 30 mesures locales, sauvegarde -> VisitorAuthModal', () => {
    const policy = resolveUserAccessPolicy(null, { hasAuthUser: false, nowMs: NOW });
    assert.equal(policy.tier, 'visitor');
    assert.equal(policy.isPreviewMode, false);
    assert.equal(policy.hasFullPlaybackAccess, true);
    assert.equal(policy.maxMeasuresAllowed, 30);
    assert.equal(policy.maxPrivateCloudPresets, 0);
    assert.equal(policy.canAccessCommunityCatalog, false);
    assert.equal(policy.canUsePdfPress, false);
    assert.deepEqual(
      evaluateCloudPresetSave(policy, { isUpdatingExisting: false, ownedPrivatePresetsCount: 0 }),
      { allowed: false, modal: 'visitor', visitorReason: 'save_cloud' }
    );
  });

  it('2. Inscrit Gratuit : 30 mesures, max 2 morceaux privés Cloud (mise à jour libre, 3e bloqué -> SubscriptionModal)', () => {
    const policy = resolveUserAccessPolicy(mkProfile({ uid: 'free-1', role: 'visiteur' }), { hasAuthUser: true, nowMs: NOW });
    assert.equal(policy.tier, 'free_user');
    assert.equal(policy.maxMeasuresAllowed, 30);
    assert.equal(policy.maxPrivateCloudPresets, 2);
    assert.equal(policy.canUploadVocalCloud, false);
    assert.equal(policy.canAccessCommunityCatalog, false);

    assert.deepEqual(evaluateCloudPresetSave(policy, { isUpdatingExisting: false, ownedPrivatePresetsCount: 0 }), { allowed: true });
    assert.deepEqual(evaluateCloudPresetSave(policy, { isUpdatingExisting: false, ownedPrivatePresetsCount: 1 }), { allowed: true });
    assert.deepEqual(evaluateCloudPresetSave(policy, { isUpdatingExisting: true, ownedPrivatePresetsCount: 2 }), { allowed: true });
    assert.deepEqual(evaluateCloudPresetSave(policy, { isUpdatingExisting: false, ownedPrivatePresetsCount: 2 }), {
      allowed: false, modal: 'subscription', subscriptionReason: 'free_cloud_quota',
    });
    assert.deepEqual(
      evaluateCloudPresetSave(policy, { isUpdatingExisting: false, ownedPrivatePresetsCount: 0, requestedVisibility: 'mestre_group' }),
      { allowed: false, modal: 'subscription', subscriptionReason: 'premium_feature' }
    );
  });

  it('3. Membre Groupe (étude > 30 mesures + Presse PDF + Communautaire + 2 brouillons privés) & Co-auteur Groupe', () => {
    const member = resolveUserAccessPolicy(
      mkProfile({ uid: 'eleve-1', role: 'eleve', groupId: 'maracatu-nord', canWriteSequenciador: false }),
      { hasAuthUser: true, nowMs: NOW }
    );
    assert.equal(member.tier, 'group_member');
    assert.equal(member.hasFullPlaybackAccess, true);
    assert.equal(member.canAccessCommunityCatalog, true);
    assert.equal(member.canUsePdfPress, true);
    assert.equal(member.maxMeasuresAllowed, 30);
    assert.equal(member.maxPrivateCloudPresets, 2);
    assert.equal(member.canPublishToGroup, false);
    assert.equal(evaluateCloudPresetSave(member, { isUpdatingExisting: false, ownedPrivatePresetsCount: 1, requestedVisibility: 'private' }).allowed, true);
    assert.equal(evaluateCloudPresetSave(member, { isUpdatingExisting: false, ownedPrivatePresetsCount: 0, requestedVisibility: 'mestre_group' }).allowed, false);

    const coauthor = resolveUserAccessPolicy(
      mkProfile({ uid: 'co-1', role: 'membre', groupId: 'maracatu-nord', canWriteSequenciador: true }),
      { hasAuthUser: true, nowMs: NOW }
    );
    assert.equal(coauthor.tier, 'group_coauthor');
    assert.equal(coauthor.maxMeasuresAllowed, null);
    assert.equal(coauthor.canPublishToGroup, true);
    assert.equal(coauthor.canUploadVocalCloud, true);
  });

  it('4. Mestre en essai actif (trialEndDateMs & Timestamp Firestore) : pleins droits Studio et Cloud', () => {
    const activeTrial = resolveUserAccessPolicy(
      mkProfile({ uid: 'mestre-trial', role: 'mestre', trialStartDateMs: NOW - 86_400_000, trialEndDateMs: NOW + 86_400_000 }),
      { hasAuthUser: true, nowMs: NOW }
    );
    assert.equal(activeTrial.tier, 'mestre_trial_active');
    assert.equal(activeTrial.isTrialActive, true);
    assert.equal(activeTrial.isTrialExpired, false);
    assert.equal(activeTrial.maxMeasuresAllowed, null);
    assert.equal(activeTrial.canPublishToGroup, true);
    assert.equal(activeTrial.canUploadVocalCloud, true);
    assert.equal(parseTimestampMs({ toMillis: () => NOW + 5000 }), NOW + 5000);
  });

  it('5. Mestre en essai expiré / gelé (soft-lock) : 30 mesures, sauvegarde -> trial_expired, débloqué si isPremium', () => {
    const expiredProfile = mkProfile({ uid: 'mestre-exp', role: 'mestre', groupId: 'grupo-teste', trialEndDateMs: NOW - 1000 });
    const expired = resolveUserAccessPolicy(expiredProfile, { hasAuthUser: true, nowMs: NOW });
    assert.equal(expired.tier, 'mestre_trial_expired');
    assert.equal(expired.isTrialExpired, true);
    assert.equal(expired.hasFullPlaybackAccess, true);
    assert.equal(expired.maxMeasuresAllowed, 30);
    assert.deepEqual(evaluateCloudPresetSave(expired, { isUpdatingExisting: true, ownedPrivatePresetsCount: 1 }), {
      allowed: false, modal: 'subscription', subscriptionReason: 'trial_expired',
    });

    const upgraded = resolveUserAccessPolicy({ ...expiredProfile, isPremium: true }, { hasAuthUser: true, nowMs: NOW });
    assert.equal(upgraded.tier, 'subscriber_or_mestre');
    assert.equal(upgraded.isTrialExpired, false);
    assert.equal(upgraded.maxMeasuresAllowed, null);
  });

  it('6. Catalogue 3 niveaux : séparation isShowcase vs Communautaire et repli automatique au 1er lancement', () => {
    const fallbackTiers = resolveCatalogThreeTiers({
      publicCloudPresets: [{ id: 'g1', name: 'Global 1', visibility: 'admin_global' }, { id: 'p1', name: 'Comm 1', visibility: 'public' }],
      privateCloudPresets: [{ id: 'd1', name: 'Essai Perso', visibility: 'private', ownerId: 'u1' }],
      currentUserUid: 'u1', canViewDraft: () => false,
    });
    assert.equal(fallbackTiers.usedShowcaseFallback, true);
    assert.deepEqual(fallbackTiers.showcaseItems.map((i) => i.id), ['g1']);
    assert.deepEqual(fallbackTiers.communityItems.map((i) => i.id), ['p1']);
    assert.deepEqual(fallbackTiers.personalDraftItems.map((i) => i.id), ['d1']);

    const explicitTiers = resolveCatalogThreeTiers({
      publicCloudPresets: [
        { id: 's1', name: 'Vitrine 1', visibility: 'admin_global', isShowcase: true },
        { id: 'g1', name: 'Global Non Vitrine', visibility: 'admin_global', isShowcase: false },
      ],
      privateCloudPresets: [], currentUserUid: null, canViewDraft: () => false,
    });
    assert.equal(explicitTiers.usedShowcaseFallback, false);
    assert.deepEqual(explicitTiers.showcaseItems.map((i) => i.id), ['s1']);
    assert.deepEqual(explicitTiers.communityItems.map((i) => i.id), ['g1']);
  });
});
