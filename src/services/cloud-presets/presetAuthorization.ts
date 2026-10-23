
import { CloudPreset } from '../../types';

export function isPresetAuthorized(
  data: Omit<CloudPreset, 'id'>,
  userUid: string | null,
  userRole: string,
  myGroupMestreId: string | null,
  groupId: string | null | undefined,
  isSamambaiaGroup: boolean,
  canWriteSequenciador?: boolean
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

  // 2. Normalisation des groupes
  const dataGroupIdNorm = String((data as any).groupId || (data as any).groupName || (data as any).group || '').toLowerCase().trim();
  const userGroupNorm = String(groupId || (isSamambaiaGroup || canWriteSequenciador ? 'samambaia' : '')).toLowerCase().trim();

  const isSamambaiaPreset =
    dataGroupIdNorm.includes('samambaia') ||
    dataGroupIdNorm.includes('sammbia') ||
    data.mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    data.ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    data.ownerId === 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2';

  const matchesGroup = Boolean(
    (userGroupNorm && dataGroupIdNorm && dataGroupIdNorm === userGroupNorm) ||
    ((userGroupNorm.includes('samambaia') || isSamambaiaGroup || canWriteSequenciador) && isSamambaiaPreset)
  );

  const matchesMestre = Boolean(
    myGroupMestreId && (data.mestreId === myGroupMestreId || data.ownerId === myGroupMestreId)
  );

  const isMemberOrEleve = userRole === 'eleve' || userRole === 'membre' || userRole === 'mestre' || userRole === 'admin';

  if (matchesGroup || matchesMestre) {
    return true;
  }

  if ((isSamambaiaGroup || userGroupNorm.includes('samambaia') || isMemberOrEleve) && isSamambaiaPreset) {
    return true;
  }

  if ((data.visibility as any) === 'group' || data.visibility === 'mestre_group' || !data.visibility) {
    if (matchesGroup || matchesMestre || isSamambaiaGroup || isMemberOrEleve) {
      return true;
    }
  }

  return false;
}
