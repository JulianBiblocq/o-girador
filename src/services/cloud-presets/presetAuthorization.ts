
import { CloudPreset } from '../../types';
import { isLegacySamambaiaGroup } from '../../utils/tenantGroupHelpers';

export function isPresetAuthorized(
  data: Omit<CloudPreset, 'id'>,
  userUid: string | null,
  _userRole: string,
  myGroupMestreId: string | null,
  groupId: string | null | undefined,
  isSamambaiaGroup: boolean,
  _canWriteSequenciador?: boolean
): boolean {
  if (!data) return false;

  // 1. Presets publics, globaux ou appartenant directement à l'utilisateur
  if (
    data.visibility === 'admin_global' ||
    data.visibility === 'public' ||
    (userUid && data.ownerId === userUid) ||
    (userUid && data.targetUserId === userUid)
  ) {
    return true;
  }

  // 2. Normalisation stricte des groupes (zéro fuite inter-tenants)
  const dataGroupIdNorm = String((data as any).groupId || (data as any).groupName || (data as any).group || '').toLowerCase().trim();
  const userGroupNorm = String(groupId || (isSamambaiaGroup ? 'samambaia' : '')).toLowerCase().trim();

  const isSamambaiaPreset =
    isLegacySamambaiaGroup(dataGroupIdNorm) ||
    data.mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    data.ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    data.ownerId === 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2';

  const matchesGroup = Boolean(
    (userGroupNorm && dataGroupIdNorm && dataGroupIdNorm === userGroupNorm) ||
    ((isSamambaiaGroup || isLegacySamambaiaGroup(userGroupNorm)) && isSamambaiaPreset)
  );

  const matchesMestre = Boolean(
    myGroupMestreId && (data.mestreId === myGroupMestreId || data.ownerId === myGroupMestreId) && (!dataGroupIdNorm || matchesGroup)
  );

  return matchesGroup || matchesMestre;
}
