import { useQuery } from '@tanstack/react-query';
import { CloudPreset } from '../../types';

interface UseCloudPresetsProps {
  userUid: string | null;
  userRole: 'admin' | 'mestre' | 'eleve' | 'membre' | 'visiteur' | string;
  mestreId: string | null;
  groupId?: string | null;
  canWriteSequenciador?: boolean;
}

export const normalizePresetName = (name: string) =>
  (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]/g, ' ')
    .trim()
    .toLowerCase();

export function useCloudPresets({ userUid, userRole, mestreId, groupId, canWriteSequenciador }: UseCloudPresetsProps) {
  const isSamambaia = Boolean(
    userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    (groupId && (groupId.toLowerCase().includes('samambaia') || groupId.toLowerCase().includes('sammbia'))) ||
    mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    (canWriteSequenciador && (!groupId || groupId.toLowerCase() === 'samambaia'))
  );

  const normalizedGroupId = isSamambaia ? 'Samambaia' : (groupId || null);
  const effectiveMestreId = mestreId || (isSamambaia ? 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' : null);

  return useQuery<CloudPreset[]>({
    queryKey: ['cloudPresets', userUid, normalizedGroupId, effectiveMestreId, userRole, canWriteSequenciador],
    queryFn: async () => {
      const { fetchCloudPresets, fetchStoragePresetsJSON } = await import('../../cloudLibrary');
      const firestorePresetsPromise = fetchCloudPresets(userUid, userRole, effectiveMestreId, normalizedGroupId, canWriteSequenciador);
      const storagePresetsPromise = normalizedGroupId ? fetchStoragePresetsJSON(normalizedGroupId) : Promise.resolve([]);
      
      const results = await Promise.allSettled([firestorePresetsPromise, storagePresetsPromise]);
      const firestorePresets = results[0].status === 'fulfilled' ? results[0].value : [];
      const storagePresets = results[1].status === 'fulfilled' ? results[1].value : [];

      if (results[0].status === 'rejected') {
        console.warn('[useCloudPresets] Firestore presets query failed:', results[0].reason);
      }
      if (results[1].status === 'rejected') {
        console.warn('[useCloudPresets] Storage presets query failed:', results[1].reason);
      }
      
      // Fusion avec priorité absolue à Firestore et déduplication canonique par ID et par nom normalisé
      const seenIds = new Set<string>();
      const seenNormalizedNames = new Set<string>();
      const merged: CloudPreset[] = [];

      // 1. Priorité absolue aux documents Cloud Firestore (source de vérité officielle)
      for (const p of firestorePresets) {
        const normName = normalizePresetName(p.name);
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          if (normName) seenNormalizedNames.add(normName);
          merged.push(p);
        }
      }

      // 2. Ajout des fichiers Firebase Storage uniquement si aucun équivalent Firestore n'existe
      for (const p of storagePresets) {
        const normName = normalizePresetName(p.name);
        if (!seenIds.has(p.id) && (!normName || !seenNormalizedNames.has(normName))) {
          seenIds.add(p.id);
          if (normName) seenNormalizedNames.add(normName);
          merged.push(p);
        }
      }

      return merged;
    },
    enabled: true,
  });
}
