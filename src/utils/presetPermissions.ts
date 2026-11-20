/**
 * Droits centralisés du Catalogue Cloud : séparation stricte Mestre/Admin vs co-auteur (< 125 lignes).
 */
import { isLegacySamambaiaGroup } from './tenantGroupHelpers';

export const OFFICIAL_MESTRE_UID = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
const LEGACY_MESTRE_ALT_UID = 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2';

export const SANCTUARIZED_PRESET_IDS = new Set<string>([
  '29dIDjgc2vPuDnwjiy9V', // Opanijé
  'hJFMrFdzwLezPmeTgVpE', // Vovó Falou
  'nawSahyNqRJK09bwmbHu', // Convenção 2
  'EcUcFC6Vd9hiKq8UR0dD', // Tem macaiba
  'HV63gho48hxMmAXM95TN', // Breque de caixa
  'tqsSWxMG8UbzK9FMUE1Q', // Vou vadiar carnaval
  'Vou vadiar carnaval',
  '_convencao_2',
]);

export interface PresetPermissionProfile {
  uid?: string | null;
  role?: string | null;
  dbRole?: string | null;
  canWriteSequenciador?: boolean;
  mestreId?: string | null;
  groupId?: string | null;
}

export interface PresetPermissionTarget {
  id: string;
  name?: string;
  ownerId?: string | null;
  mestreId?: string | null;
  groupId?: string | null;
  visibility?: string;
  isLocked?: boolean;
}

const normalizeKey = (name?: string): string =>
  (name || '')
    .replace(/\.json$/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

export function isMestreOrAdminProfile(
  userProfile?: PresetPermissionProfile | null,
  _isAdminFlag?: boolean
): boolean {
  if (!userProfile) return false;
  const role = String(userProfile.role || '').trim().toLowerCase();
  const dbRole = String(userProfile.dbRole || '').trim().toLowerCase();
  return (
    role === 'mestre' ||
    role === 'mestri' ||
    role === 'admin' ||
    dbRole === 'mestre' ||
    dbRole === 'mestri' ||
    dbRole === 'admin' ||
    userProfile.uid === OFFICIAL_MESTRE_UID
  );
}

export function canMutatePreset(
  preset: PresetPermissionTarget | null | undefined,
  userProfile: PresetPermissionProfile | null | undefined
): boolean {
  if (!preset || !userProfile) return false;
  if (isMestreOrAdminProfile(userProfile)) return true;
  if (Boolean(userProfile.canWriteSequenciador)) {
    return (
      Boolean(preset.ownerId) &&
      preset.ownerId === userProfile.uid &&
      !SANCTUARIZED_PRESET_IDS.has(preset.id)
    );
  }
  return false;
}

export function canDeleteCatalogPreset(
  preset: PresetPermissionTarget | null | undefined,
  userProfile: PresetPermissionProfile | null | undefined
): boolean {
  if (!preset || SANCTUARIZED_PRESET_IDS.has(preset.id)) return false;
  return canMutatePreset(preset, userProfile);
}

export function findMestrePresetNameConflict<T extends PresetPermissionTarget>(
  cloudPresets: T[],
  candidateName: string,
  userProfile: PresetPermissionProfile | null | undefined,
  effectiveMestreId?: string | null,
  effectiveGroupId?: string | null
): T | null {
  if (isMestreOrAdminProfile(userProfile)) return null;
  const normCandidate = normalizeKey(candidateName);
  if (!normCandidate) return null;

  const userUid = userProfile?.uid || null;
  const effGrp = String(effectiveGroupId || userProfile?.groupId || '').trim().toLowerCase();
  const effMestre = effectiveMestreId || userProfile?.mestreId || null;
  const isSamambaiaGrp = isLegacySamambaiaGroup(effGrp) || effMestre === OFFICIAL_MESTRE_UID;

  return (
    cloudPresets.find((p) => {
      if (normalizeKey(p.name) !== normCandidate) return false;
      if (userUid && p.ownerId === userUid && !SANCTUARIZED_PRESET_IDS.has(p.id)) return false;

      const pGrp = String(p.groupId || (p as any).groupName || '').trim().toLowerCase();
      const sameGroup = Boolean(
        (effGrp && pGrp && pGrp === effGrp) ||
        (isSamambaiaGrp && (
          isLegacySamambaiaGroup(pGrp) || SANCTUARIZED_PRESET_IDS.has(p.id) ||
          p.mestreId === OFFICIAL_MESTRE_UID || p.ownerId === OFFICIAL_MESTRE_UID || p.ownerId === LEGACY_MESTRE_ALT_UID
        )) ||
        (!pGrp && effMestre && (p.mestreId === effMestre || p.ownerId === effMestre))
      );
      if (!sameGroup) return false;

      return Boolean(
        SANCTUARIZED_PRESET_IDS.has(p.id) || p.isLocked === true || (effMestre && p.ownerId === effMestre) ||
        (p.ownerId && p.mestreId && p.ownerId === p.mestreId) || p.ownerId === OFFICIAL_MESTRE_UID ||
        p.ownerId === LEGACY_MESTRE_ALT_UID || !p.ownerId
      );
    }) ?? null
  );
}
