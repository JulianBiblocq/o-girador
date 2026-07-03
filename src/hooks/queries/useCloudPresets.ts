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
      try {
        return await fetchCloudPresets(userUid, userRole, mestreId);
      } catch (err) {
        console.warn("Failed to fetch cloud presets, falling back to offline mode", err);
        return [];
      }
    },
    enabled: !!userUid,
    initialData: [],
  });
}
