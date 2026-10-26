/**
 * Gestionnaire Cloud hybride résilient pour les gabarits de batuque (< 120 lignes).
 */
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db, auth } from './firebase/config';
import { WorkspaceTemplate } from './types';
import { cleanPayload } from './utils/cleanPayload';
import {
  fetchUserDocWorkspaceTemplates,
  saveUserDocWorkspaceTemplates,
  upsertUserDocWorkspaceTemplate,
  removeUserDocWorkspaceTemplate,
} from './cloudWorkspaceUserSync';

export const CLOUD_WORKSPACE_TEMPLATES_COLLECTION = 'workspace_templates';

export async function saveWorkspaceTemplateToCloud(
  template: WorkspaceTemplate,
  _userRole?: string
): Promise<string> {
  const { id, ownerId, name, authorName, options, tracks, rodaTrackOrder, masterSettings } = template;
  if (!ownerId || ownerId === 'local') throw new Error('Utilisateur non connecté');

  const now = Date.now();
  const templateId = id && !id.startsWith('tpl_local_') ? id : `tpl_cloud_${now}_${Math.random().toString(36).substring(2, 7)}`;

  const cleanTpl: WorkspaceTemplate = cleanPayload({
    ...template,
    id: templateId,
    ownerId,
    authorName: authorName || '',
    updatedAt: now,
  });

  // 1. Sauvegarde résiliente prioritaire sur /users/{uid}
  await upsertUserDocWorkspaceTemplate(ownerId, cleanTpl);

  // 2. Tentative complémentaire non-bloquante sur la collection globale
  try {
    const payload = cleanPayload({
      name: name?.trim() || 'Gabarit',
      ownerId, authorId: ownerId, uid: ownerId,
      authorName: authorName || '', options, tracks,
      rodaTrackOrder: rodaTrackOrder || [], masterSettings: masterSettings || null,
      updatedAt: now,
    });
    if (id && !id.startsWith('tpl_local_')) {
      await updateDoc(doc(db, CLOUD_WORKSPACE_TEMPLATES_COLLECTION, id), payload);
    } else {
      await addDoc(collection(db, CLOUD_WORKSPACE_TEMPLATES_COLLECTION), { ...payload, createdAt: template.createdAt || now });
    }
  } catch (err) {
    console.warn('[WorkspaceTemplates] Collection globale inaccessible (sauvegardé sur profil utilisateur):', err);
  }

  return templateId;
}

export async function updateWorkspaceTemplateNameInCloud(
  templateId: string,
  name: string,
  userUid?: string
): Promise<void> {
  const uid = userUid || auth.currentUser?.uid;
  if (uid && uid !== 'local') {
    const userTpls = await fetchUserDocWorkspaceTemplates(uid);
    const updated = userTpls.map((t) => (t.id === templateId ? { ...t, name: name.trim(), updatedAt: Date.now() } : t));
    await saveUserDocWorkspaceTemplates(uid, updated);
  }

  try {
    if (templateId && !templateId.startsWith('tpl_local_')) {
      await updateDoc(doc(db, CLOUD_WORKSPACE_TEMPLATES_COLLECTION, templateId), { name: name.trim(), updatedAt: Date.now() });
    }
  } catch (_) {}
}

export async function deleteWorkspaceTemplateFromCloud(
  templateId: string,
  userUid?: string
): Promise<void> {
  const uid = userUid || auth.currentUser?.uid;
  if (uid && uid !== 'local') {
    await removeUserDocWorkspaceTemplate(uid, templateId);
  }

  try {
    if (templateId && !templateId.startsWith('tpl_local_')) {
      await deleteDoc(doc(db, CLOUD_WORKSPACE_TEMPLATES_COLLECTION, templateId));
    }
  } catch (_) {}
}

export async function fetchCloudWorkspaceTemplates(
  userUid: string | null
): Promise<WorkspaceTemplate[]> {
  if (!userUid || userUid === 'local') return [];

  // 1. Lecture directe depuis /users/{uid}
  const userTemplates = await fetchUserDocWorkspaceTemplates(userUid);

  // 2. Lecture complémentaire sur la collection globale (tolérante aux erreurs)
  const collectionTemplates: WorkspaceTemplate[] = [];
  try {
    const collRef = collection(db, CLOUD_WORKSPACE_TEMPLATES_COLLECTION);
    const q = query(collRef, where('ownerId', '==', userUid));
    const snapshot = await getDocs(q);
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      collectionTemplates.push({
        id: docSnap.id, name: d.name || 'Gabarit', ownerId: d.ownerId || userUid,
        authorName: d.authorName || '', createdAt: d.createdAt || 0, updatedAt: d.updatedAt || 0,
        options: d.options || { includeStructure: true, includeDisplayOrder: true, includeVolumePan: true, includeEQ: true, includeFX: true },
        tracks: d.tracks || [], rodaTrackOrder: d.rodaTrackOrder || [], masterSettings: d.masterSettings || undefined,
      });
    });
  } catch (err) {
    console.warn('[WorkspaceTemplates] Collection globale restreinte, lecture depuis profil utilisateur:', err);
  }

  // 3. Fusion par id conservant la version la plus récente
  const map = new Map<string, WorkspaceTemplate>();
  collectionTemplates.forEach((t) => map.set(t.id, t));
  userTemplates.forEach((t) => {
    const existing = map.get(t.id);
    if (!existing || (t.updatedAt || 0) >= (existing.updatedAt || 0)) {
      map.set(t.id, t);
    }
  });

  const merged = Array.from(map.values());
  merged.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  return merged;
}
