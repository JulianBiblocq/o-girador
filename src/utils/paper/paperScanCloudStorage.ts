/**
 * Service Cloud & Hors-ligne pour les Brouillons d'Import Papier (< 135 lignes).
 */
import { auth, db } from '../../firebase/config';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { PaperInjectOptions } from './paperTrackBuilder';
import { savePresetToCloud } from '../../cloudLibrary';

const LOCAL_DRAFTS_KEY = 'girador_paper_scan_drafts_v1';
const CLOUD_PRIMARY_COLL = 'paperScanDrafts';
const CLOUD_FALLBACK_COLL = 'sections';

export interface PaperScanDraftPayload {
  preset: PaperPreset;
  orderedSectionNames: string[];
  vigilancePoints?: any[];
  injectOptions?: PaperInjectOptions;
}

export interface PaperScanDraftDocument {
  id: string;
  title: string;
  authorUid?: string;
  updatedAt: number;
  deviceType: 'mobile' | 'desktop';
  isDraft: true;
  docType: 'paper_scan_draft';
  payloadJson: string;
}

export function parseDraftPayload(draft: PaperScanDraftDocument): PaperScanDraftPayload {
  try {
    if (draft.payloadJson) return JSON.parse(draft.payloadJson);
  } catch (_) {}
  return { preset: (draft as any).preset || ({} as any), orderedSectionNames: [] };
}

function getLocalDrafts(): PaperScanDraftDocument[] {
  try {
    const raw = localStorage.getItem(LOCAL_DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function saveLocalDrafts(drafts: PaperScanDraftDocument[]): void {
  try {
    localStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(drafts.slice(0, 20)));
  } catch (_) {}
}

export async function savePaperScanDraft(draft: PaperScanDraftDocument): Promise<PaperScanDraftDocument> {
  const local = getLocalDrafts().filter((d) => d.id !== draft.id);
  local.unshift(draft);
  saveLocalDrafts(local);

  const uid = auth.currentUser?.uid || draft.authorUid || '';
  const docData = { ...draft, authorUid: uid, ownerId: uid, uid, updatedAt: Date.now() };

  if (uid) {
    try {
      await setDoc(doc(db, CLOUD_PRIMARY_COLL, draft.id), docData, { merge: true });
    } catch (primaryErr) {
      try {
        await setDoc(doc(db, CLOUD_FALLBACK_COLL, draft.id), docData, { merge: true });
      } catch (fallbackErr) {
        console.warn('[PaperCloudDraft] Sauvegarde distante différée (hors-ligne ou droits):', fallbackErr);
      }
    }
  }
  return docData;
}

export async function listPaperScanDrafts(): Promise<PaperScanDraftDocument[]> {
  const localList = getLocalDrafts();
  const uid = auth.currentUser?.uid;
  if (!uid) return localList.sort((a, b) => b.updatedAt - a.updatedAt);

  const merged = new Map<string, PaperScanDraftDocument>();
  localList.forEach((d) => merged.set(d.id, d));

  const fetchCollection = async (collName: string) => {
    try {
      const q = query(collection(db, collName), where('docType', '==', 'paper_scan_draft'), where('ownerId', '==', uid), limit(30));
      const snap = await getDocs(q);
      snap.forEach((dSnap) => {
        const d = dSnap.data() as PaperScanDraftDocument;
        if (!d.id) d.id = dSnap.id;
        const prev = merged.get(d.id);
        if (!prev || (d.updatedAt || 0) >= (prev.updatedAt || 0)) merged.set(d.id, d);
      });
    } catch (_) {}
  };

  await Promise.allSettled([fetchCollection(CLOUD_PRIMARY_COLL), fetchCollection(CLOUD_FALLBACK_COLL)]);
  const result = Array.from(merged.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  saveLocalDrafts(result);
  return result;
}

export async function deletePaperScanDraft(id: string): Promise<void> {
  const filtered = getLocalDrafts().filter((d) => d.id !== id);
  saveLocalDrafts(filtered);
  if (auth.currentUser) {
    await Promise.allSettled([
      deleteDoc(doc(db, CLOUD_PRIMARY_COLL, id)),
      deleteDoc(doc(db, CLOUD_FALLBACK_COLL, id)),
    ]);
  }
}

export function autoSaveDraftOnInject(title: string, fullPresetData: any, authorUid?: string): void {
  const user = auth.currentUser;
  const uid = user?.uid || authorUid || '';
  if (!uid) return;
  savePresetToCloud(title || 'Chantier Papier', fullPresetData, uid, 'private', undefined, null, undefined, undefined, undefined, true, true)
    .catch((err) => console.warn('[PaperCloudDraft] Auto-sauvegarde Chantier Roda différée:', err));
}
