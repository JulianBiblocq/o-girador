/**
 * Garde d'isolation multi-tenant stricte pour les collections Cloud partagées (< 70 lignes).
 * Seul un membre réel du groupe historique `samambaia` (ou l'UID Mestre historique sans autre `groupId`)
 * accède aux variantes et documents `samambaia`. Aucun repli via `canWriteSequenciador`.
 */

import { isLegacySamambaiaGroup } from '../../utils/tenantGroupHelpers';
import { OFFICIAL_MESTRE_UID } from '../../utils/presetPermissions';

const LEGACY_COAUTHOR_SAMAMBAIA_UID = 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2';

export function resolveEffectiveStartupGroupId(groupId?: string | null): string | null {
  const clean = typeof groupId === 'string' ? groupId.trim() : '';
  return clean.length > 0 ? clean : null;
}

export function pickVisitorShowcaseCloudPreset<T extends { id: string; isDraft?: boolean; isShowcase?: boolean; visibility?: string }>(
  presets?: readonly T[] | null
): T | null {
  if (!Array.isArray(presets) || presets.length === 0) return null;
  const nonDraft = presets.filter((p) => p && p.isDraft !== true);
  return (
    nonDraft.find((p) => p.isShowcase === true) ||
    nonDraft.find((p) => p.visibility === 'admin_global') ||
    null
  );
}

export function buildTenantGroupQueryVariants(
  groupId: string | null | undefined,
  isSamambaiaGroup: boolean
): { effectiveGroup: string | null; variants: string[]; includeLegacySamambaiaOwners: boolean } {
  const clean = resolveEffectiveStartupGroupId(groupId);
  const effectiveGroup = clean || (isSamambaiaGroup ? 'samambaia' : null);
  if (!effectiveGroup) {
    return { effectiveGroup: null, variants: [], includeLegacySamambaiaOwners: false };
  }
  const norm = effectiveGroup.toLowerCase();
  const isSam = isSamambaiaGroup && isLegacySamambaiaGroup(norm);
  const variants = Array.from(
    new Set(isSam ? [effectiveGroup, norm, 'samambaia', 'Samambaia', 'SAMAMBAIA'] : [effectiveGroup, norm])
  );
  return { effectiveGroup, variants, includeLegacySamambaiaOwners: isSam };
}

export function isTenantScopedDocAuthorized(params: {
  data: Record<string, any> | null | undefined;
  userUid: string | null;
  userRole?: string;
  myGroupMestreId?: string | null;
  groupId?: string | null;
  isSamambaiaGroup: boolean;
}): boolean {
  const { data, userUid, userRole, myGroupMestreId, groupId, isSamambaiaGroup } = params;
  if (!data) return false;
  if (userRole === 'admin') return true;
  if (userUid && data.ownerId === userUid) return true;
  if (data.visibility === 'admin_global' || data.visibility === 'public') return true;

  const dataGroupNorm = String(data.groupId || '').toLowerCase().trim();
  const userGroupNorm = String(groupId || (isSamambaiaGroup ? 'samambaia' : '')).toLowerCase().trim();

  const isSamambaiaDoc =
    isLegacySamambaiaGroup(dataGroupNorm) ||
    data.mestreId === OFFICIAL_MESTRE_UID ||
    data.ownerId === OFFICIAL_MESTRE_UID ||
    data.ownerId === LEGACY_COAUTHOR_SAMAMBAIA_UID;

  const matchesGroup = Boolean(
    (userGroupNorm && dataGroupNorm && dataGroupNorm === userGroupNorm) ||
    (isSamambaiaGroup && isLegacySamambaiaGroup(userGroupNorm) && isSamambaiaDoc)
  );
  const matchesMestre = Boolean(
    myGroupMestreId &&
    (data.mestreId === myGroupMestreId || data.ownerId === myGroupMestreId) &&
    (!dataGroupNorm || matchesGroup)
  );
  const isMestreGroup = (data.visibility === 'mestre_group' || !data.visibility) && (matchesMestre || matchesGroup);

  return isMestreGroup || matchesGroup || matchesMestre;
}
