/**
 * Verrou défensif avant écriture Cloud : empêche tout non-Mestre d'écraser le preset d'autrui (< 75 lignes).
 */
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { CLOUD_PRESETS_COLLECTION, presetCache } from './presetCache';
import { resetActiveCloudPresetId } from '../../utils/cloudPresetState';
import { SANCTUARIZED_PRESET_IDS, isMestreOrAdminProfile } from '../../utils/presetPermissions';

export interface DefensiveTargetResolution {
  resolvedTargetId?: string;
  wasForeignTargetReset: boolean;
}

export async function resolveDefensiveTargetPresetId(
  targetPresetId: string | undefined,
  currentAuthUid: string,
  userRole?: string,
  isRestoration = false,
  isPlaywrightTest = false
): Promise<DefensiveTargetResolution> {
  if (!targetPresetId) {
    return { resolvedTargetId: undefined, wasForeignTargetReset: false };
  }

  const isMestreOrAdmin = isMestreOrAdminProfile({ uid: currentAuthUid, role: userRole });

  if (isMestreOrAdmin || isRestoration) {
    if (isPlaywrightTest && !isRestoration) {
      if (SANCTUARIZED_PRESET_IDS.has(targetPresetId)) {
        throw new Error(`[Sanctuarisation E2E] Écrasement formellement interdit du preset officiel sanctuarisé "${targetPresetId}" en test.`);
      }
      if (!targetPresetId.startsWith('test_e2e_')) {
        throw new Error(`[Sanctuarisation E2E] Écrasement interdit : targetPresetId doit être préfixé par "test_e2e_". Reçu: "${targetPresetId}".`);
      }
    }
    return { resolvedTargetId: targetPresetId, wasForeignTargetReset: false };
  }

  if (SANCTUARIZED_PRESET_IDS.has(targetPresetId)) {
    resetActiveCloudPresetId();
    return { resolvedTargetId: undefined, wasForeignTargetReset: true };
  }

  const cached = presetCache.get(targetPresetId) as { ownerId?: string } | undefined;
  if (cached?.ownerId && cached.ownerId !== currentAuthUid) {
    resetActiveCloudPresetId();
    return { resolvedTargetId: undefined, wasForeignTargetReset: true };
  }

  try {
    const snap = await getDoc(doc(db, CLOUD_PRESETS_COLLECTION, targetPresetId));
    if (!snap.exists()) {
      if (isPlaywrightTest && !targetPresetId.startsWith('test_e2e_')) {
        resetActiveCloudPresetId();
        return { resolvedTargetId: undefined, wasForeignTargetReset: true };
      }
      return { resolvedTargetId: targetPresetId, wasForeignTargetReset: false };
    }
    const docOwnerId = snap.data()?.ownerId;
    if (!docOwnerId || docOwnerId !== currentAuthUid) {
      resetActiveCloudPresetId();
      return { resolvedTargetId: undefined, wasForeignTargetReset: true };
    }
    if (isPlaywrightTest && !targetPresetId.startsWith('test_e2e_')) {
      throw new Error(`[Sanctuarisation E2E] Écrasement interdit : targetPresetId doit être préfixé par "test_e2e_". Reçu: "${targetPresetId}".`);
    }
    return { resolvedTargetId: targetPresetId, wasForeignTargetReset: false };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('[Sanctuarisation E2E]')) throw err;
    resetActiveCloudPresetId();
    return { resolvedTargetId: undefined, wasForeignTargetReset: true };
  }
}
