import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { UserProfile } from '../../contexts/auth/authTypes';
import { isSuperAdminProfile } from '../../utils/userPreferencesStorage';
import { CLOUD_PRESETS_COLLECTION } from './presetCache';
import { isTestEnvironment } from './sanctuarization';

export async function togglePresetShowcaseStatus(
  presetId: string,
  currentShowcase: boolean,
  userProfile?: UserProfile | null
): Promise<boolean> {
  if (!isSuperAdminProfile(userProfile)) {
    throw new Error('Action refusée : seul le Super-Admin peut modifier la Vitrine Découverte.');
  }
  if (isTestEnvironment() && !presetId.startsWith('test_e2e_')) {
    throw new Error(`[Sanctuarisation E2E] Modification interdite d'un preset non-E2E ("${presetId}").`);
  }

  const nextShowcase = !currentShowcase;
  const patch: Record<string, unknown> = {
    isShowcase: nextShowcase,
    updatedAt: Date.now(),
  };
  if (nextShowcase) {
    patch.visibility = 'admin_global';
    patch.isDraft = false;
  }

  await updateDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId), patch);
  return nextShowcase;
}
