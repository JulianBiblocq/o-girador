
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/config';
import { CloudPreset, Preset } from '../../types';
import LZString from 'lz-string';
import { presetCache } from './presetCache';

export async function listStoragePath(folderPath: string): Promise<string[]> {
  try {
    const res = await listAll(ref(storage, folderPath));
    return res.items.map((i) => i.fullPath);
  } catch (e: any) {
    return [`error: ${e.message}`];
  }
}

interface StoragePresetsCacheEntry {
  timestamp: number;
  presets: CloudPreset[];
}
const storagePresetsGroupCache = new Map<string, StoragePresetsCacheEntry>();

export async function fetchStoragePresetsJSON(groupId: string, forceRefresh = false): Promise<CloudPreset[]> {
  if (!groupId) return [];

  const cacheKey = groupId.toLowerCase().trim();
  const cachedGroup = storagePresetsGroupCache.get(cacheKey);
  const now = Date.now();
  const STORAGE_CACHE_TTL = 15 * 60 * 1000;

  if (!forceRefresh && cachedGroup && now - cachedGroup.timestamp < STORAGE_CACHE_TTL) {
    return cachedGroup.presets;
  }

  const presets: CloudPreset[] = [];
  const seenIds = new Set<string>();
  const isSamambaia = groupId.toLowerCase().includes('samambaia') || groupId.toLowerCase().includes('sammbia');
  const candidateFolders = Array.from(
    new Set([
      `documents/${groupId}/sequencer`,
      `documents/${groupId.toLowerCase()}/sequencer`,
      ...(isSamambaia ? ['documents/Samambaia/sequencer', 'documents/samambaia/sequencer'] : []),
    ])
  );

  for (const folderPath of candidateFolders) {
    try {
      const folderRef = ref(storage, folderPath);
      const res = await listAll(folderRef);
      for (const itemRef of res.items) {
        if (itemRef.name.endsWith('.json') && !seenIds.has(itemRef.name)) {
          seenIds.add(itemRef.name);
          if (presetCache.has(itemRef.name)) {
            const data = presetCache.get(itemRef.name)!;
            presets.push({
              id: itemRef.name,
              name: data.metadata?.toada || (data as any).name || itemRef.name.replace('.json', ''),
              data: LZString.compressToBase64(JSON.stringify(data)),
              ownerId: 'storage',
              visibility: 'mestre_group',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              groupId: groupId.toLowerCase(),
              isFromStorage: true,
            } as any);
            continue;
          }
          try {
            const url = await getDownloadURL(itemRef);
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json();
              presetCache.set(itemRef.name, data as Preset);
              presets.push({
                id: itemRef.name,
                name: data.metadata?.toada || data.name || itemRef.name.replace('.json', ''),
                data: LZString.compressToBase64(JSON.stringify(data)),
                ownerId: 'storage',
                visibility: 'mestre_group',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                groupId: groupId.toLowerCase(),
                isFromStorage: true,
              } as any);
            }
          } catch (e) {
            console.warn(`fetchStoragePresetsJSON - Échec du chargement de ${itemRef.fullPath}:`, e);
          }
        }
      }
    } catch (err) {
      console.warn(`fetchStoragePresetsJSON - Échec du listage pour ${folderPath}:`, err);
      if (cachedGroup && cachedGroup.presets.length > 0) {
        return cachedGroup.presets;
      }
    }
  }

  storagePresetsGroupCache.set(cacheKey, { timestamp: now, presets });
  return presets;
}
