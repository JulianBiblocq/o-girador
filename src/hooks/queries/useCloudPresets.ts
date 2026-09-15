import { useQuery } from '@tanstack/react-query';
import { CloudPreset } from '../../types';

interface UseCloudPresetsProps {
  userUid: string | null;
  userRole: 'admin' | 'mestre' | 'eleve' | 'visiteur' | string;
  mestreId: string | null;
  groupId?: string | null;
}

export function useCloudPresets({ userUid, userRole, mestreId, groupId }: UseCloudPresetsProps) {
  const normalizedGroupId = (groupId && (groupId.toLowerCase().includes('samambaia') || groupId.toLowerCase().includes('sammbia')))
    ? 'Samambaia'
    : groupId;

  return useQuery<CloudPreset[]>({
    queryKey: ['cloudPresets', userUid, userRole, mestreId, normalizedGroupId],
    queryFn: async () => {
      if (!userUid) return [];
      
      const { fetchCloudPresets, fetchStoragePresetsJSON } = await import('../../cloudLibrary');
      const firestorePresetsPromise = fetchCloudPresets(userUid, userRole, mestreId, normalizedGroupId);
      const storagePresetsPromise = normalizedGroupId ? fetchStoragePresetsJSON(normalizedGroupId) : Promise.resolve([]);
      
      const [firestorePresets, storagePresets] = await Promise.all([firestorePresetsPromise, storagePresetsPromise]);
      
      // Merge results
      return [...storagePresets, ...firestorePresets];
    },
    enabled: !!userUid,
  });
}
