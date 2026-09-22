import { useQuery } from '@tanstack/react-query';
import { CloudPreset } from '../../types';

interface UseCloudPresetsProps {
  userUid: string | null;
  userRole: 'admin' | 'mestre' | 'eleve' | 'membre' | 'visiteur' | string;
  mestreId: string | null;
  groupId?: string | null;
  groupName?: string | null;
  canWriteSequenciador?: boolean;
}

export const normalizePresetName = (name: string) =>
  (name || '')
    .replace(/\.json$/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

export function useCloudPresets({ userUid, userRole, mestreId, groupId, groupName, canWriteSequenciador }: UseCloudPresetsProps) {
  const isSamambaia = Boolean(
    userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    (groupId && (groupId.toLowerCase().includes('samambaia') || groupId.toLowerCase().includes('sammbia'))) ||
    (groupName && (groupName.toLowerCase().includes('samambaia') || groupName.toLowerCase().includes('sammbia'))) ||
    mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    (canWriteSequenciador && (!groupId || groupId.toLowerCase() === 'samambaia'))
  );

  const normalizedGroupId = isSamambaia ? 'Samambaia' : (groupId || null);
  const effectiveMestreId = isSamambaia ? 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' : (mestreId || null);
  const effectiveRole = isSamambaia && (userRole === 'visiteur' || !userRole) ? 'membre' : userRole;

  return useQuery<CloudPreset[]>({
    queryKey: ['cloudPresets', userUid, normalizedGroupId, effectiveMestreId, effectiveRole, canWriteSequenciador],
    queryFn: async () => {
      const { fetchCloudPresets, fetchStoragePresetsJSON } = await import('../../cloudLibrary');
      const firestorePresetsPromise = fetchCloudPresets(userUid, effectiveRole, effectiveMestreId, normalizedGroupId, canWriteSequenciador);
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
        const normId = normalizePresetName(p.id);
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          if (normId) seenIds.add(normId);
          if (normName) seenNormalizedNames.add(normName);
          merged.push(p);
        }
      }

      // 2. Ajout des fichiers Firebase Storage uniquement si aucun équivalent Firestore n'existe
      for (const p of storagePresets) {
        const normName = normalizePresetName(p.name);
        const normId = normalizePresetName(p.id);
        const alreadySeen =
          seenIds.has(p.id) ||
          (Boolean(normId) && seenIds.has(normId)) ||
          (Boolean(normName) && seenNormalizedNames.has(normName));

        if (!alreadySeen) {
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
