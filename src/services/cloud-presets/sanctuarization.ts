import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '../../firebase/config';
import { presetCache, CLOUD_PRESETS_COLLECTION } from './presetCache';
import {
  SANCTUARIZED_PRESET_IDS,
  isMestreOrAdminProfile,
  canMutatePreset,
} from '../../utils/presetPermissions';

export { SANCTUARIZED_PRESET_IDS };

export function isTestPresetName(name?: string, metadata?: any): boolean {
  const combined = `${name || ''} ${metadata?.toada || ''}`.toLowerCase();
  return /(\btest\b|\bmock\b|\be2e\b|test perso|dummy)/i.test(combined);
}

export function isTestEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).__PLAYWRIGHT_TEST__ ||
    (window as any).__PLAYWRIGHT__ ||
    (window as any).__TEST_ENV__
  );
}

export async function deleteCloudPreset(
  presetId: string,
  audioUrl?: string | null,
  isMestreOrAdminFlag?: boolean
): Promise<void> {
  const isRestoration = typeof window !== 'undefined' && (window as any).__ALLOW_SANCTUARIZED_RESTORE__ === true;
  const currentUid = auth.currentUser?.uid || null;
  const isMestre = Boolean(isMestreOrAdminFlag) || isMestreOrAdminProfile({ uid: currentUid });

  if (SANCTUARIZED_PRESET_IDS.has(presetId) && !isRestoration && !isMestre) {
    throw new Error(`[Sanctuarisation] Suppression formellement interdite du preset officiel sanctuarisé "${presetId}".`);
  }
  if (isTestEnvironment() && !isRestoration && !presetId.startsWith('test_e2e_') && !isMestre) {
    throw new Error(`[Sanctuarisation E2E] Suppression interdite d'un preset non-E2E en contexte de test ("${presetId}").`);
  }

  if (!isMestre && !isRestoration) {
    const snap = await getDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId));
    if (snap.exists()) {
      const docOwnerId = snap.data()?.ownerId;
      if (!currentUid || !docOwnerId || docOwnerId !== currentUid) {
        throw new Error('Suppression refusée : seul le Mestre ou le créateur du morceau peut le supprimer.');
      }
    }
  }

  presetCache.delete(presetId);
  if (audioUrl) {
    try {
      await deleteObject(ref(storage, audioUrl));
    } catch (_) {}
  }
  await deleteDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId));
}

export async function renameCloudPreset(presetId: string, newName: string): Promise<void> {
  const isRestoration = typeof window !== 'undefined' && (window as any).__ALLOW_SANCTUARIZED_RESTORE__ === true;
  if (SANCTUARIZED_PRESET_IDS.has(presetId) && !isRestoration) {
    throw new Error(`[Sanctuarisation] Renommage formellement interdit du preset officiel sanctuarisé "${presetId}".`);
  }
  if (isTestEnvironment() && !isRestoration && !presetId.startsWith('test_e2e_')) {
    throw new Error(`[Sanctuarisation E2E] Renommage interdit d'un preset non-E2E en contexte de test ("${presetId}").`);
  }
  const cached = presetCache.get(presetId);
  if (cached && cached.metadata) {
    cached.metadata.toada = newName;
  }
  await updateDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId), { name: newName });
}

export async function togglePresetDraftStatus(
  presetId: string,
  currentDraft: boolean,
  userRole?: string,
  userUid?: string,
  canWriteSequenciador?: boolean
): Promise<void> {
  const isRestoration = typeof window !== 'undefined' && (window as any).__ALLOW_SANCTUARIZED_RESTORE__ === true;
  const effectiveUid = auth.currentUser?.uid || userUid || null;
  const isMestre = isMestreOrAdminProfile({ uid: effectiveUid, role: userRole });

  if (SANCTUARIZED_PRESET_IDS.has(presetId) && !isRestoration && !isMestre) {
    throw new Error(`[Sanctuarisation] Seul le Mestre est autorisé à modifier la visibilité du preset officiel sanctuarisé "${presetId}".`);
  }
  if (isTestEnvironment() && !isRestoration && !presetId.startsWith('test_e2e_') && !isMestre) {
    throw new Error(`[Sanctuarisation E2E] Modification interdite d'un preset non-E2E en contexte de test ("${presetId}").`);
  }

  if (!isMestre && !isRestoration) {
    const snap = await getDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId));
    const docOwnerId = snap.exists() ? snap.data()?.ownerId : undefined;
    const allowed = canMutatePreset(
      { id: presetId, ownerId: docOwnerId },
      { uid: effectiveUid, role: userRole, canWriteSequenciador: canWriteSequenciador ?? true }
    );
    if (!allowed) {
      throw new Error('Action refusée : seul le Mestre ou le créateur du morceau peut modifier son statut Brouillon.');
    }
  }

  await updateDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId), {
    isDraft: !currentDraft,
    updatedAt: Date.now(),
  });
}
