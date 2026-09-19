import { useQuery } from '@tanstack/react-query';
import { CloudPreset } from '../../types';

interface UseCloudPresetsProps {
  userUid: string | null;
  userRole: 'admin' | 'mestre' | 'eleve' | 'membre' | 'visiteur' | string;
  mestreId: string | null;
  groupId?: string | null;
  canWriteSequenciador?: boolean;
}

export function useCloudPresets({ userUid, userRole, mestreId, groupId, canWriteSequenciador }: UseCloudPresetsProps) {
  const isSamambaia = Boolean(
    (groupId && (groupId.toLowerCase().includes('samambaia') || groupId.toLowerCase().includes('sammbia'))) ||
    mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    (canWriteSequenciador && (!groupId || groupId.toLowerCase() === 'samambaia'))
  );

  const normalizedGroupId = isSamambaia ? 'Samambaia' : (groupId || null);
  const effectiveMestreId = mestreId || (isSamambaia ? 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' : null);

  // Condition enabled : si l'utilisateur est authentifié, attendre que groupId ou userRole soit stabilisé
  // (empêche une exécution prématurée avec un profil non encore résolu depuis Firestore qui mettrait en cache une liste vide)
  const isProfileStabilized = Boolean(
    userUid && (
      userRole === 'admin' ||
      userRole === 'mestre' ||
      userRole === 'mestri' ||
      userRole === 'eleve' ||
      userRole === 'membre' ||
      Boolean(groupId) ||
      Boolean(mestreId)
    )
  );

  return useQuery<CloudPreset[]>({
    queryKey: ['cloudPresets', userUid, userRole, groupId, mestreId, effectiveMestreId, normalizedGroupId, canWriteSequenciador],
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
    enabled: isProfileStabilized,
  });
}
