import { useQuery } from '@tanstack/react-query';
import { fetchCloudPresets } from '../../cloudLibrary';
import { CloudPreset } from '../../types';

interface UseCloudPresetsProps {
  userUid: string | null;
  userRole: 'admin' | 'mestre' | 'eleve' | 'visiteur';
  mestreId: string | null;
}

export function useCloudPresets({ userUid, userRole, mestreId }: UseCloudPresetsProps) {
  return useQuery<CloudPreset[]>({
    queryKey: ['cloudPresets', userUid, userRole, mestreId],
    queryFn: async () => {
      if (!userUid) return [];
      return await fetchCloudPresets(userUid, userRole, mestreId);
    },
    enabled: !!userUid,
  });
}
