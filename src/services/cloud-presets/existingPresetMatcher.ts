/**
 * Recherche anti-doublon d'un preset existant par Nom normalisé + Créateur + Groupe (< 60 lignes).
 */
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { CLOUD_PRESETS_COLLECTION } from './presetCache';
import { SANCTUARIZED_PRESET_IDS } from './sanctuarization';
import { normalizePresetName } from '../../hooks/queries/useCloudPresets';

export async function findExistingPresetId(
  name: string,
  ownerId: string,
  effectiveGroupId?: string | null
): Promise<string | null> {
  if (!name || !ownerId) return null;
  try {
    const normTarget = normalizePresetName(name);
    if (!normTarget) return null;

    const q = query(
      collection(db, CLOUD_PRESETS_COLLECTION),
      where('ownerId', '==', ownerId),
      limit(50)
    );
    const snap = await getDocs(q);
    const effGrp = (effectiveGroupId || '').trim().toLowerCase();

    const matched = snap.docs.find((d) => {
      if (SANCTUARIZED_PRESET_IDS.has(d.id)) return false;
      const dData = d.data();
      const dNorm = normalizePresetName(dData.name || '');
      const dGrp = (dData.groupId || '').trim().toLowerCase();
      const isGrpMatch =
        (!effGrp && !dGrp) ||
        (effGrp === 'samambaia' && (!dGrp || dGrp === 'samambaia')) ||
        dGrp === effGrp;
      return dNorm === normTarget && isGrpMatch;
    });

    return matched ? matched.id : null;
  } catch (err) {
    console.warn('[existingPresetMatcher] Erreur recherche anti-doublon :', err);
    return null;
  }
}
