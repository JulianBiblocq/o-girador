import { useQuery } from '@tanstack/react-query';
import { fetchCloudPresets } from '../../cloudLibrary';
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
      return await fetchCloudPresets(userUid, userRole, mestreId, groupId);
    },
    enabled: !!userUid,
  });
}
