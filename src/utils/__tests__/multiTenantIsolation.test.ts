/**
 * multiTenantIsolation.test.ts — Non-régression de l'étanchéité SaaS hors `'samambaia'` (< 120 lignes).
 * Vérifie : zéro repli `'Samambaia'` au démarrage visiteur, sélection Vitrine (`isShowcase` / `admin_global` hors `isDraft`),
 * et isolation stricte des Mestres / Co-auteurs (`canWriteSequenciador`) d'autres groupes (`nacao-estrela`, `samba`, `sambareggae`).
 */
import assert from 'node:assert/strict';
import { isSamambaiaGroupHelper } from '../../services/cloud-common/cloudMestreResolver';
import {
  buildTenantGroupQueryVariants,
  isTenantScopedDocAuthorized,
  pickVisitorShowcaseCloudPreset,
  resolveEffectiveStartupGroupId,
} from '../../services/cloud-common/cloudTenantAuthGuard';
import { isPresetAuthorized } from '../../services/cloud-presets/presetAuthorization';
import { OFFICIAL_MESTRE_UID } from '../presetPermissions';
import { isLegacySamambaiaGroup } from '../tenantGroupHelpers';

// 1. Démarrage visiteur / utilisateur sans groupe : zéro repli vers 'Samambaia' + sélection Vitrine hors brouillons
{
  assert.equal(resolveEffectiveStartupGroupId(null), null);
  assert.equal(resolveEffectiveStartupGroupId(undefined), null);
  assert.equal(resolveEffectiveStartupGroupId('   '), null);
  assert.equal(resolveEffectiveStartupGroupId('NacaoEstrela'), 'NacaoEstrela');

  const catalog = [
    { id: 'draft-showcase', isShowcase: true, isDraft: true, visibility: 'admin_global' },
    { id: 'group-private', isShowcase: false, isDraft: false, visibility: 'mestre_group' },
    { id: 'real-showcase', isShowcase: true, isDraft: false, visibility: 'public' },
    { id: 'admin-fallback', isShowcase: false, isDraft: false, visibility: 'admin_global' },
  ];
  assert.equal(pickVisitorShowcaseCloudPreset(catalog)?.id, 'real-showcase');
  assert.equal(
    pickVisitorShowcaseCloudPreset(catalog.filter((p) => p.id !== 'real-showcase'))?.id,
    'admin-fallback'
  );
  assert.equal(pickVisitorShowcaseCloudPreset([{ id: 'only-draft', isShowcase: true, isDraft: true }]), null);
}

// 2. Aucun groupe contenant "sam" (samba, sambareggae) ni co-auteur d'autre groupe ne déclenche Samambaia
{
  for (const otherGroup of ['nacao-estrela', 'samba', 'sambareggae', 'maracatu-porto']) {
    assert.equal(isLegacySamambaiaGroup(otherGroup), false);
    const isSam = isSamambaiaGroupHelper('uid-coauthor-other', otherGroup, 'uid-mestre-other', true);
    assert.equal(isSam, false, `Group "${otherGroup}" with canWriteSequenciador must NOT be treated as Samambaia`);

    const q = buildTenantGroupQueryVariants(otherGroup, isSam);
    assert.equal(q.includeLegacySamambaiaOwners, false);
    assert.equal(q.variants.some((v) => v.toLowerCase() === 'samambaia'), false);

    const samambaiaPrivateDoc = {
      ownerId: OFFICIAL_MESTRE_UID,
      mestreId: OFFICIAL_MESTRE_UID,
      groupId: 'samambaia',
      visibility: 'mestre_group',
    };
    assert.equal(
      isTenantScopedDocAuthorized({
        data: samambaiaPrivateDoc,
        userUid: 'uid-coauthor-other',
        userRole: 'mestre',
        myGroupMestreId: 'uid-mestre-other',
        groupId: otherGroup,
        isSamambaiaGroup: isSam,
      }),
      false,
      `Private Samambaia doc must NEVER leak to "${otherGroup}"`
    );
    assert.equal(
      isPresetAuthorized(samambaiaPrivateDoc as any, 'uid-coauthor-other', 'mestre', 'uid-mestre-other', otherGroup, isSam, true),
      false
    );
  }
}

// 3. Utilisateur sans groupId mais avec canWriteSequenciador (ex. Mestre à l'essai hors groupe) : zéro fuite Samambaia
{
  const isSamTrial = isSamambaiaGroupHelper('uid-trial-mestre', null, null, true);
  assert.equal(isSamTrial, false);
  const qTrial = buildTenantGroupQueryVariants(null, isSamTrial);
  assert.deepEqual(qTrial.variants, []);
  assert.equal(
    isTenantScopedDocAuthorized({
      data: { ownerId: OFFICIAL_MESTRE_UID, groupId: 'Samambaia', visibility: 'mestre_group' },
      userUid: 'uid-trial-mestre',
      userRole: 'mestre',
      myGroupMestreId: 'uid-trial-mestre',
      groupId: null,
      isSamambaiaGroup: isSamTrial,
    }),
    false
  );
}

// 4. Rétrocompatibilité intacte pour les vrais membres de Samambaia
{
  assert.equal(isLegacySamambaiaGroup('Samambaia'), true);
  const isSamReal = isSamambaiaGroupHelper('uid-eleve-sam', 'Samambaia', OFFICIAL_MESTRE_UID, false);
  assert.equal(isSamReal, true);
  const qSam = buildTenantGroupQueryVariants('Samambaia', isSamReal);
  assert.equal(qSam.includeLegacySamambaiaOwners, true);
  assert.ok(qSam.variants.includes('samambaia') && qSam.variants.includes('Samambaia'));
  assert.equal(
    isTenantScopedDocAuthorized({
      data: { ownerId: OFFICIAL_MESTRE_UID, groupId: 'Samambaia', visibility: 'mestre_group' },
      userUid: 'uid-eleve-sam',
      userRole: 'eleve',
      myGroupMestreId: OFFICIAL_MESTRE_UID,
      groupId: 'Samambaia',
      isSamambaiaGroup: isSamReal,
    }),
    true
  );
}

console.log('multiTenantIsolation.test.ts: ALL ASSERTIONS PASSED');
