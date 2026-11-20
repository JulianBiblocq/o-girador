/**
 * Résolution sécurisée de la cible de sauvegarde Cloud et blocage des doublons homonymes (< 85 lignes).
 */
import { CloudPreset } from '../../types';
import { fetchCloudPresets } from '../../cloudLibrary';
import { normalizePresetName } from '../queries/useCloudPresets';
import {
  SANCTUARIZED_PRESET_IDS,
  PresetPermissionProfile,
  isMestreOrAdminProfile,
  canMutatePreset,
  findMestrePresetNameConflict,
} from '../../utils/presetPermissions';

interface ResolveTargetParams {
  presetName: string;
  userProfile: PresetPermissionProfile & { uid: string; role: string };
  effectiveMestreId?: string | null;
  effectiveGroupId?: string;
  matchedPreset: CloudPreset | null;
  loadedMorceauId: string | null;
  cloudPresets: CloudPreset[];
  forceNew?: boolean;
  lang: 'fr' | 'pt';
  alertAsync: (msg: string) => Promise<void>;
}

export interface ResolvedSaveTargetResult {
  aborted: boolean;
  targetDocId?: string;
  targetPreset?: CloudPreset;
}

export async function resolveSavePresetTarget({
  presetName,
  userProfile,
  effectiveMestreId,
  effectiveGroupId,
  matchedPreset,
  loadedMorceauId,
  cloudPresets,
  forceNew,
  lang,
  alertAsync,
}: ResolveTargetParams): Promise<ResolvedSaveTargetResult> {
  const isMestre = isMestreOrAdminProfile(userProfile);

  let catalog = cloudPresets;
  if (catalog.length === 0 || (!matchedPreset && !forceNew)) {
    const fresh = await fetchCloudPresets(
      userProfile.uid, userProfile.role, effectiveMestreId ?? null, effectiveGroupId, userProfile.canWriteSequenciador
    );
    if (fresh.length > 0) catalog = fresh;
  }

  if (!isMestre) {
    const conflict = findMestrePresetNameConflict(catalog, presetName, userProfile, effectiveMestreId, effectiveGroupId);
    if (conflict) {
      await alertAsync(
        lang === 'fr'
          ? `Le titre "${presetName}" est déjà utilisé par un morceau du Mestre dans ce groupe. Veuillez saisir un titre distinct.`
          : `O título "${presetName}" já é usado por uma música do Mestre neste grupo. Digite um título distinto.`
      );
      return { aborted: true };
    }
  }

  const activeLoaded = loadedMorceauId ? catalog.find((p) => p.id === loadedMorceauId) : undefined;
  const isForeignLoaded = Boolean(
    !isMestre && (
      (activeLoaded && !canMutatePreset(activeLoaded, userProfile)) ||
      (!activeLoaded && loadedMorceauId && SANCTUARIZED_PRESET_IDS.has(loadedMorceauId))
    )
  );

  if (forceNew || isForeignLoaded) {
    return { aborted: false, targetDocId: undefined, targetPreset: undefined };
  }

  let targetPreset = matchedPreset ?? undefined;
  if (!targetPreset) {
    const norm = normalizePresetName(presetName);
    if (activeLoaded && canMutatePreset(activeLoaded, userProfile)) {
      targetPreset = activeLoaded;
    } else if (isMestre) {
      targetPreset =
        catalog.find((p) => SANCTUARIZED_PRESET_IDS.has(p.id) && normalizePresetName(p.name) === norm) ||
        catalog.find((p) => p.name.trim().toLowerCase() === presetName.toLowerCase() && p.ownerId === userProfile.uid) ||
        (effectiveMestreId
          ? catalog.find((p) => p.name.trim().toLowerCase() === presetName.toLowerCase() && (p.mestreId === effectiveMestreId || p.ownerId === effectiveMestreId))
          : undefined) ||
        catalog.find((p) => p.name.trim().toLowerCase() === presetName.toLowerCase());
    } else {
      targetPreset = catalog.find((p) => normalizePresetName(p.name) === norm && canMutatePreset(p, userProfile));
    }
  }

  if (targetPreset && !canMutatePreset(targetPreset, userProfile)) {
    return { aborted: false, targetDocId: undefined, targetPreset: undefined };
  }

  return { aborted: false, targetDocId: targetPreset?.id, targetPreset };
}
