import { useQuery } from '@tanstack/react-query';
import { CloudPreset } from '../../types';

interface UseCloudPresetsProps {
  userUid: string | null;
  userRole: 'admin' | 'mestre' | 'eleve' | 'visiteur' | string;
  mestreId: string | null;
  groupId?: string | null;
  canWriteSequenciador?: boolean;
}

export function useCloudPresets({ userUid, userRole, mestreId, groupId, canWriteSequenciador }: UseCloudPresetsProps) {
  const isSamambaia = Boolean(
    (groupId && (groupId.toLowerCase().includes('samambaia') || groupId.toLowerCase().includes('sammbia'))) ||
    (canWriteSequenciador && (!groupId || groupId.toLowerCase() === 'samambaia'))
  );

  const normalizedGroupId = isSamambaia ? 'Samambaia' : groupId;
  const effectiveMestreId = mestreId || (isSamambaia ? 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' : null);

  return useQuery<CloudPreset[]>({
    queryKey: ['cloudPresets', userUid, userRole, effectiveMestreId, normalizedGroupId, canWriteSequenciador],
    queryFn: async () => {
      if (!userUid) return [];
      
      const { fetchCloudPresets, fetchStoragePresetsJSON } = await import('../../cloudLibrary');
      const firestorePresetsPromise = fetchCloudPresets(userUid, userRole, effectiveMestreId, normalizedGroupId, canWriteSequenciador);
      const storagePresetsPromise = normalizedGroupId ? fetchStoragePresetsJSON(normalizedGroupId) : Promise.resolve([]);
      
      const results = await Promise.allSettled([firestorePresetsPromise, storagePresetsPromise]);
      const firestorePresets = results[0].status === 'fulfilled' ? results[0].value : [];
      const storagePresets = results[1].status === 'fulfilled' ? results[1].value : [];

      if (results[0].status === 'rejected') {
        console.warn("[useCloudPresets] Firestore presets query failed:", results[0].reason);
      }
      if (results[1].status === 'rejected') {
        console.warn("[useCloudPresets] Storage presets query failed:", results[1].reason);
      }
      
      // Merge results with unique ID deduplication
      const seenIds = new Set<string>();
      const merged: CloudPreset[] = [];
      for (const p of [...storagePresets, ...firestorePresets]) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          merged.push(p);
        }
      }
      return merged;
    },
    enabled: !!userUid,
  });
}

