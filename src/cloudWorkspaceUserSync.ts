/**
 * Synchronisation directe et sécurisée des gabarits sur /users/{uid} (< 80 lignes).
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase/config';
import { WorkspaceTemplate } from './types';
import { cleanPayload } from './utils/cleanPayload';

export async function fetchUserDocWorkspaceTemplates(uid: string): Promise<WorkspaceTemplate[]> {
  if (!uid || uid === 'local') return [];
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (Array.isArray(data?.workspaceTemplates)) {
        return data.workspaceTemplates;
      }
    }
  } catch (err) {
    console.warn('[WorkspaceTemplates] Erreur lecture /users/{uid}:', err);
  }
  return [];
}

export async function saveUserDocWorkspaceTemplates(
  uid: string,
  templates: WorkspaceTemplate[]
): Promise<void> {
  if (!uid || uid === 'local') return;
  try {
    const cleanList = cleanPayload(templates);
    await setDoc(doc(db, 'users', uid), { workspaceTemplates: cleanList }, { merge: true });
  } catch (err) {
    console.warn('[WorkspaceTemplates] Erreur écriture /users/{uid}:', err);
  }
}

export async function upsertUserDocWorkspaceTemplate(
  uid: string,
  template: WorkspaceTemplate
): Promise<WorkspaceTemplate[]> {
  const current = await fetchUserDocWorkspaceTemplates(uid);
  const exists = current.some((t) => t.id === template.id);
  const updated = exists
    ? current.map((t) => (t.id === template.id ? template : t))
    : [template, ...current];

  await saveUserDocWorkspaceTemplates(uid, updated);
  return updated;
}

export async function removeUserDocWorkspaceTemplate(
  uid: string,
  templateId: string
): Promise<WorkspaceTemplate[]> {
  const current = await fetchUserDocWorkspaceTemplates(uid);
  const remaining = current.filter((t) => t.id !== templateId);
  await saveUserDocWorkspaceTemplates(uid, remaining);
  return remaining;
}
