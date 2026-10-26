/**
 * Logique pure de fusion non-destructive et détection d'auto-migration (< 80 lignes).
 */
import { WorkspaceTemplate } from '../../types';

export function areTemplateListsIdentical(
  a: WorkspaceTemplate[],
  b: WorkspaceTemplate[]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || (a[i].updatedAt || 0) !== (b[i].updatedAt || 0)) {
      return false;
    }
  }
  return true;
}

export function mergeTemplatesLists(
  localTemplates: WorkspaceTemplate[],
  cloudTemplates: WorkspaceTemplate[],
  userUid?: string
): {
  merged: WorkspaceTemplate[];
  templatesToUpload: WorkspaceTemplate[];
  hasChanges: boolean;
} {
  const map = new Map<string, WorkspaceTemplate>();

  // 1. Enregistrer d'abord les gabarits locaux
  localTemplates.forEach((t) => map.set(t.id, t));

  // 2. Fusionner avec le Cloud en conservant la version la plus récente
  cloudTemplates.forEach((cloudT) => {
    const localT = map.get(cloudT.id);
    if (!localT || (cloudT.updatedAt || 0) >= (localT.updatedAt || 0)) {
      map.set(cloudT.id, cloudT);
    }
  });

  const merged = Array.from(map.values());
  merged.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

  // 3. Détecter les gabarits locaux devant être auto-migrés vers le Cloud
  const templatesToUpload: WorkspaceTemplate[] = [];
  if (userUid && userUid !== 'local') {
    merged.forEach((t) => {
      const isCloudKnown = cloudTemplates.some((ct) => ct.id === t.id);
      const isLocalOwner = !t.ownerId || t.ownerId === 'local';
      if (!isCloudKnown || isLocalOwner) {
        templatesToUpload.push({
          ...t,
          ownerId: userUid,
        });
      }
    });
  }

  const hasChanges = !areTemplateListsIdentical(localTemplates, merged);

  return { merged, templatesToUpload, hasChanges };
}
