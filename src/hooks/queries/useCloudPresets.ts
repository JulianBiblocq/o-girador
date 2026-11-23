import { useQuery } from '@tanstack/react-query';
import { CloudPreset } from '../../types';
import { normalizePresetName } from '../../services/cloud-presets/presetCache';
import { isLegacySamambaiaGroup } from '../../utils/tenantGroupHelpers';

export { normalizePresetName };

interface UseCloudPresetsProps {
  userUid: string | null;
  userRole: 'admin' | 'mestre' | 'eleve' | 'membre' | 'visiteur' | string;
  mestreId: string | null;
  groupId?: string | null;
  groupName?: string | null;
  canWriteSequenciador?: boolean;
}

export function useCloudPresets({ userUid, userRole, mestreId, groupId, canWriteSequenciador }: UseCloudPresetsProps) {
  const safeGroupId = userUid ? groupId : null;
  const isSamambaia = Boolean(userUid && (isLegacySamambaiaGroup(safeGroupId) || userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1'));

  const normalizedGroupId = isSamambaia ? 'Samambaia' : (safeGroupId?.trim() || null);
  const effectiveMestreId = userUid ? (isSamambaia ? 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' : (mestreId || null)) : null;
  const effectiveRole = userUid ? (isSamambaia && (userRole === 'visiteur' || !userRole) ? 'membre' : userRole) : 'visiteur';

  return useQuery<CloudPreset[]>({
    queryKey: ['cloudPresets', 'v4', userUid, normalizedGroupId, effectiveMestreId, effectiveRole, canWriteSequenciador],
    queryFn: async () => {
      const { fetchCloudPresets } = await import('../../cloudLibrary');
      let firestorePresets: CloudPreset[] = [];
      try {
        firestorePresets = await fetchCloudPresets(userUid, effectiveRole, effectiveMestreId, normalizedGroupId, canWriteSequenciador);
      } catch (reason) {
        console.warn('[useCloudPresets] Firestore presets query failed:', reason);
      }

      const seenIds = new Set<string>();
      const seenNormalizedNames = new Set<string>();
      const merged: CloudPreset[] = [];

      for (const p of firestorePresets) {
        const normName = normalizePresetName(p.name);
        const normId = normalizePresetName(p.id);
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          if (normId) seenIds.add(normId);
          if (normName) seenNormalizedNames.add(normName);
          merged.push(p);
        }
      }

      return merged;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes : évite les requêtes intempestives
    gcTime: 30 * 60 * 1000,   // 30 minutes de conservation en cache mémoire
    refetchOnWindowFocus: false, // Évite de re-télécharger à chaque changement d'onglet
    enabled: true,
  });
}
