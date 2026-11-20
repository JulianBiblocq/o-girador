import { useMemo } from 'react';
import { CloudPreset } from '../../types';
import { normalizePresetName } from '../queries/useCloudPresets';
import {
  SANCTUARIZED_PRESET_IDS,
  PresetPermissionProfile,
  isMestreOrAdminProfile,
  canMutatePreset,
  findMestrePresetNameConflict,
} from '../../utils/presetPermissions';

interface MatchedPresetFinderParams {
  cloudPresets: CloudPreset[];
  name: string;
  loadedMorceauId: string | null;
  userProfile?: PresetPermissionProfile | null;
  effectiveMestreId?: string | null;
  effectiveGroupId?: string | null;
  isAdmin?: boolean;
}

export function useMatchedPresetFinder({
  cloudPresets,
  name,
  loadedMorceauId,
  userProfile,
  effectiveMestreId,
  effectiveGroupId,
  isAdmin,
}: MatchedPresetFinderParams) {
  const isMestre = isMestreOrAdminProfile(userProfile, isAdmin);
  const userUid = userProfile?.uid || undefined;

  const activePreset = useMemo(
    () => (loadedMorceauId ? cloudPresets.find((p) => p.id === loadedMorceauId) ?? null : null),
    [cloudPresets, loadedMorceauId]
  );

  const isForeignActivePreset = Boolean(
    !isMestre && (
      (activePreset && !canMutatePreset(activePreset, userProfile)) ||
      (!activePreset && loadedMorceauId && SANCTUARIZED_PRESET_IDS.has(loadedMorceauId))
    )
  );

  const conflictingMestrePreset = useMemo(
    () => findMestrePresetNameConflict(cloudPresets, name, userProfile, effectiveMestreId, effectiveGroupId),
    [cloudPresets, name, userProfile, effectiveMestreId, effectiveGroupId]
  );

  const matchedPreset = useMemo(() => {
    if (isForeignActivePreset) return null;
    const trimmedName = name.trim();
    if (!trimmedName && !loadedMorceauId) return null;

    if (activePreset && canMutatePreset(activePreset, userProfile)) {
      return activePreset;
    }

    if (!trimmedName) return null;
    const normTarget = normalizePresetName(trimmedName);

    if (isMestre) {
      const sanctuarized = cloudPresets.find((p) => SANCTUARIZED_PRESET_IDS.has(p.id) && normalizePresetName(p.name) === normTarget);
      if (sanctuarized) return sanctuarized;
      const own = cloudPresets.find((p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase() && p.ownerId === userUid);
      if (own) return own;
      if (effectiveMestreId) {
        const grp = cloudPresets.find((p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase() && (p.mestreId === effectiveMestreId || p.ownerId === effectiveMestreId));
        if (grp) return grp;
      }
      return cloudPresets.find((p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()) ?? null;
    }

    return cloudPresets.find((p) => normalizePresetName(p.name) === normTarget && canMutatePreset(p, userProfile)) ?? null;
  }, [cloudPresets, name, loadedMorceauId, activePreset, isForeignActivePreset, isMestre, userProfile, userUid, effectiveMestreId]);

  const isExistingPreset = Boolean(matchedPreset && !isForeignActivePreset);
  const isLocked = matchedPreset ? ((matchedPreset as any).isLocked === true || SANCTUARIZED_PRESET_IDS.has(matchedPreset.id)) : false;
  const canUpdate = Boolean(matchedPreset && !isForeignActivePreset && canMutatePreset(matchedPreset, userProfile));
  const isSavedOnCloud = Boolean(activePreset && canMutatePreset(activePreset, userProfile));
  const hasMestreNameConflict = Boolean(conflictingMestrePreset);

  return {
    activePreset,
    isForeignActivePreset,
    conflictingMestrePreset,
    hasMestreNameConflict,
    matchedPreset,
    isExistingPreset,
    isLocked,
    canUpdate,
    isSavedOnCloud,
  };
}
