
import { db } from './firebase/config';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { WorkspaceTemplate } from './types';
import { cleanPayload } from './utils/cleanPayload';

export const CLOUD_WORKSPACE_TEMPLATES_COLLECTION = 'workspace_templates';

export async function saveWorkspaceTemplateToCloud(
  template: WorkspaceTemplate,
  userRole?: string
): Promise<string> {
  const { id, ownerId, name, authorName, options, tracks, rodaTrackOrder, masterSettings } = template;

  if (!ownerId || ownerId === 'local') {
    throw new Error('Utilisateur non connecté');
  }

  const isNew = !id || id.startsWith('tpl_local_');
  if (isNew && (!userRole || userRole === 'visiteur')) {
    try {
      const collRef = collection(db, CLOUD_WORKSPACE_TEMPLATES_COLLECTION);
      const q = query(collRef, where('ownerId', '==', ownerId));
      const snapshot = await getCountFromServer(q);
      if (snapshot.data().count >= 10) {
        throw new Error('Limite de 10 gabarits atteinte pour ce compte.');
      }
    } catch (e: any) {
      if (e?.message?.includes('Limite')) throw e;
    }
  }

  const payload = cleanPayload({
    name: name?.trim() || 'Gabarit sans nom',
    ownerId: ownerId,
    authorId: ownerId,
    uid: ownerId,
    authorName: authorName || '',
    options: options,
    tracks: tracks,
    rodaTrackOrder: rodaTrackOrder || [],
    masterSettings: masterSettings || null,
    updatedAt: Date.now(),
  });

  const isExistingCloudDoc = id && !id.startsWith('tpl_local_');

  if (isExistingCloudDoc) {
    const docRef = doc(db, CLOUD_WORKSPACE_TEMPLATES_COLLECTION, id);
    await updateDoc(docRef, payload);
    return id;
  } else {
    const docRef = await addDoc(collection(db, CLOUD_WORKSPACE_TEMPLATES_COLLECTION), {
      ...payload,
      createdAt: template.createdAt || Date.now(),
    });
    return docRef.id;
  }
}

export async function updateWorkspaceTemplateNameInCloud(
  templateId: string,
  name: string
): Promise<void> {
  if (!templateId || templateId.startsWith('tpl_local_')) return;
  const docRef = doc(db, CLOUD_WORKSPACE_TEMPLATES_COLLECTION, templateId);
  await updateDoc(docRef, {
    name: name.trim(),
    updatedAt: Date.now(),
  });
}

export async function deleteWorkspaceTemplateFromCloud(templateId: string): Promise<void> {
  if (!templateId || templateId.startsWith('tpl_local_')) return;
  await deleteDoc(doc(db, CLOUD_WORKSPACE_TEMPLATES_COLLECTION, templateId));
}

export async function fetchCloudWorkspaceTemplates(
  userUid: string | null
): Promise<WorkspaceTemplate[]> {
  if (!userUid || userUid === 'local') return [];

  const collRef = collection(db, CLOUD_WORKSPACE_TEMPLATES_COLLECTION);
  const q = query(collRef, where('ownerId', '==', userUid));
  const snapshot = await getDocs(q);

  const templates: WorkspaceTemplate[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    templates.push({
      id: docSnap.id,
      name: data.name || 'Gabarit',
      ownerId: data.ownerId || userUid,
      authorName: data.authorName || '',
      createdAt: data.createdAt || 0,
      updatedAt: data.updatedAt || 0,
      options: data.options || {
        includeStructure: true,
        includeDisplayOrder: true,
        includeVolumePan: true,
        includeEQ: true,
        includeFX: true,
      },
      tracks: data.tracks || [],
      rodaTrackOrder: data.rodaTrackOrder || [],
      masterSettings: data.masterSettings || undefined,
    });
  });

  templates.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  return templates;
}
