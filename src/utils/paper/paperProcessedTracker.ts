/**
 * Suivi et persistance des imports papier traites / archives (< 110 lignes).
 */
import { auth, db } from '../../firebase/config';
import { doc, setDoc } from 'firebase/firestore';

const STORAGE_KEY = 'girador_processed_paper_imports';
const EVENT_NAME = 'girador-processed-imports-changed';

export function getProcessedPaperImportIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (_) {
    return new Set();
  }
}

function saveProcessedIds(set: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (_) {}
}

export function isPaperImportProcessed(id: string | undefined | null): boolean {
  if (!id) return false;
  const set = getProcessedPaperImportIds();
  const cleanId = id.startsWith('draft:') ? id.replace('draft:', '') : id;
  return set.has(id) || set.has(cleanId) || set.has(`draft:${cleanId}`);
}

export function setPaperImportProcessed(id: string | undefined | null, processed: boolean): void {
  if (!id) return;
  const set = getProcessedPaperImportIds();
  const cleanId = id.startsWith('draft:') ? id.replace('draft:', '') : id;

  if (processed) {
    set.add(id);
    set.add(cleanId);
    if (id.startsWith('draft:')) set.add(`draft:${cleanId}`);
  } else {
    set.delete(id);
    set.delete(cleanId);
    set.delete(`draft:${cleanId}`);
  }

  saveProcessedIds(set);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { id, processed } }));

  // Synchronisation Cloud differee pour les brouillons d'import
  if (id.startsWith('draft:') || cleanId !== id) {
    syncCloudDraftProcessedStatus(cleanId, processed);
  }
}

export function togglePaperImportProcessed(id: string | undefined | null): boolean {
  if (!id) return false;
  const current = isPaperImportProcessed(id);
  const next = !current;
  setPaperImportProcessed(id, next);
  return next;
}

async function syncCloudDraftProcessedStatus(draftId: string, isProcessed: boolean): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !draftId) return;

  try {
    await setDoc(doc(db, 'paperScanDrafts', draftId), { isProcessed, updatedAt: Date.now() }, { merge: true });
  } catch (_) {
    try {
      await setDoc(doc(db, 'sections', draftId), { isProcessed, updatedAt: Date.now() }, { merge: true });
    } catch (_) {}
  }
}
