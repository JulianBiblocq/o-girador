
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { presetCache, CLOUD_PRESETS_COLLECTION } from './presetCache';

// SANCTUARISATION : Morceaux officiels du répertoire sanctuarisés
export const SANCTUARIZED_PRESET_IDS = new Set<string>([
  '29dIDjgc2vPuDnwjiy9V', // Opanijé
  'hJFMrFdzwLezPmeTgVpE', // Vovó Falou
  'nawSahyNqRJK09bwmbHu', // Convenção 2
  'EcUcFC6Vd9hiKq8UR0dD', // Tem macaiba
  'HV63gho48hxMmAXM95TN', // Breque de caixa
  'tqsSWxMG8UbzK9FMUE1Q', // Vou vadiar carnaval
  'Vou vadiar carnaval',
  '_convencao_2'
]);

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
  isEditorOrMestre?: boolean
): Promise<void> {
  const isRestoration = typeof window !== 'undefined' && (window as any).__ALLOW_SANCTUARIZED_RESTORE__ === true;
  if (SANCTUARIZED_PRESET_IDS.has(presetId) && !isRestoration && !isEditorOrMestre) {
    throw new Error(`[Sanctuarisation] Suppression formellement interdite du preset officiel sanctuarisé "${presetId}".`);
  }
  if (isTestEnvironment() && !isRestoration && !presetId.startsWith('test_e2e_') && !isEditorOrMestre) {
    throw new Error(`[Sanctuarisation E2E] Suppression interdite d'un preset non-E2E en contexte de test ("${presetId}").`);
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
  userUid?: string
): Promise<void> {
  const isRestoration = typeof window !== 'undefined' && (window as any).__ALLOW_SANCTUARIZED_RESTORE__ === true;
  const isMestre = userRole === 'mestre' || userRole === 'admin' || userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';

  if (SANCTUARIZED_PRESET_IDS.has(presetId) && !isRestoration && !isMestre) {
    throw new Error(`[Sanctuarisation] Seul le Mestre est autorisé à modifier la visibilité du preset officiel sanctuarisé "${presetId}".`);
  }
  if (isTestEnvironment() && !isRestoration && !presetId.startsWith('test_e2e_') && !isMestre) {
    throw new Error(`[Sanctuarisation E2E] Modification interdite d'un preset non-E2E en contexte de test ("${presetId}").`);
  }
  await updateDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId), {
    isDraft: !currentDraft,
    updatedAt: Date.now()
  });
}
