
import { useMemo } from 'react';
import { CloudPreset } from '../../types';
import { normalizePresetName } from '../queries/useCloudPresets';
import { SANCTUARIZED_PRESET_IDS } from '../../cloudPresetsStorage';

interface MatchedPresetFinderParams {
  cloudPresets: CloudPreset[];
  name: string;
  loadedMorceauId: string | null;
  userUid?: string;
  effectiveMestreId?: string | null;
  isMestre: boolean;
  isAdmin: boolean;
}

export function useMatchedPresetFinder({
  cloudPresets,
  name,
  loadedMorceauId,
  userUid,
  effectiveMestreId,
  isMestre,
  isAdmin,
}: MatchedPresetFinderParams) {
  const matchedPreset = useMemo(() => {
    const trimmedName = name.trim();
    if (!trimmedName && !loadedMorceauId) return null;

    if (loadedMorceauId) {
      const byId = cloudPresets.find((p) => p.id === loadedMorceauId);
      if (byId) return byId;
    }

    if (trimmedName) {
      const sanctuarized = cloudPresets.find((p) =>
        SANCTUARIZED_PRESET_IDS.has(p.id) &&
        normalizePresetName(p.name) === normalizePresetName(trimmedName)
      );
      if (sanctuarized) return sanctuarized;

      const own = cloudPresets.find((p) =>
        p.name.trim().toLowerCase() === trimmedName.toLowerCase() && p.ownerId === userUid
      );
      if (own) return own;

      if (effectiveMestreId) {
        const groupPreset = cloudPresets.find((p) =>
          p.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
          (p.mestreId === effectiveMestreId || p.ownerId === effectiveMestreId)
        );
        if (groupPreset) return groupPreset;
      }

      if (isMestre || isAdmin) {
        const anyPreset = cloudPresets.find((p) =>
          p.name.trim().toLowerCase() === trimmedName.toLowerCase()
        );
        if (anyPreset) return anyPreset;
      }
    }

    return null;
  }, [cloudPresets, name, loadedMorceauId, userUid, effectiveMestreId, isMestre, isAdmin]);

  const isExistingPreset = Boolean(matchedPreset);
  const isLocked = matchedPreset
    ? ((matchedPreset as any).isLocked === true || SANCTUARIZED_PRESET_IDS.has(matchedPreset.id))
    : false;
  const isOwnPreset = matchedPreset ? matchedPreset.ownerId === userUid : false;
  const canUpdate = isMestre || isAdmin || (!isLocked && isOwnPreset);

  return { matchedPreset, isExistingPreset, isLocked, canUpdate };
}
