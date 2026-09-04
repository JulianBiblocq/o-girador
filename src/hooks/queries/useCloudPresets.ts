import { useQuery } from '@tanstack/react-query';
import { fetchCloudPresets, fetchStoragePresetsJSON } from '../../cloudLibrary';
import { CloudPreset } from '../../types';

interface UseCloudPresetsProps {
  userUid: string | null;
  userRole: 'admin' | 'mestre' | 'eleve' | 'visiteur' | string;
  mestreId: string | null;
  groupId?: string | null;
}

export function useCloudPresets({ userUid, userRole, mestreId, groupId }: UseCloudPresetsProps) {
  return useQuery<CloudPreset[]>({
    queryKey: ['cloudPresets', userUid, userRole, mestreId, groupId],
    queryFn: async () => {
      if (!userUid) return [];
      
      const firestorePresetsPromise = fetchCloudPresets(userUid, userRole, mestreId, groupId);
      const storagePresetsPromise = groupId ? fetchStoragePresetsJSON(groupId) : Promise.resolve([]);
      
      const [firestorePresets, storagePresets] = await Promise.all([firestorePresetsPromise, storagePresetsPromise]);
      
      // Merge results
      return [...storagePresets, ...firestorePresets];
    },
    enabled: !!userUid,
  });
}
