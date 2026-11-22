import { getDB, STORE_NAME } from './indexedDbCore';
import {
  buildVocalRecordingCandidateKeys,
  VocalLookupContext,
} from '../../audio/vocal/vocalKeyCascadeResolver';

export { buildVocalRecordingCandidateKeys };
export type { VocalLookupContext };

function normalizeStorageRecordingKey(patternId: number | string): number | string {
  if (typeof patternId === 'number') return patternId;
  const trimmed = String(patternId).trim();
  if (!trimmed || trimmed.includes('_')) return patternId;
  const numId = Number(trimmed);
  return Number.isFinite(numId) ? numId : patternId;
}

export async function saveVocalRecording(patternId: number | string, audioBlob: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const safeId = normalizeStorageRecordingKey(patternId);
    store.put({ patternId: safeId, audioBlob, updatedAt: Date.now() });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Failed to save vocal recording'));
    transaction.onabort = () => reject(new Error('Save transaction aborted'));
  });
}

export async function getVocalRecording(
  patternId: number | string,
  context?: VocalLookupContext
): Promise<Blob | null> {
  const candidates = buildVocalRecordingCandidateKeys(patternId, context);
  if (candidates.length === 0) return null;

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    let idx = 0;

    const tryNext = () => {
      if (idx >= candidates.length) {
        resolve(null);
        return;
      }
      const key = candidates[idx++];
      try {
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result && req.result.audioBlob) {
            resolve(req.result.audioBlob as Blob);
          } else {
            tryNext();
          }
        };
        req.onerror = () => tryNext();
      } catch (_) {
        tryNext();
      }
    };

    transaction.onerror = () => reject(transaction.error || new Error('Read transaction failed'));
    transaction.onabort = () => reject(new Error('Read transaction aborted'));
    tryNext();
  });
}

export async function getAllVocalRecordings(): Promise<Array<{ patternId: number | string; audioBlob: Blob }>> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Failed to get all vocal recordings'));
    transaction.onerror = () => reject(transaction.error || new Error('Read transaction failed'));
    transaction.onabort = () => reject(new Error('Read transaction aborted'));
  });
}

export async function deleteVocalRecording(patternId: number | string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const safeId = normalizeStorageRecordingKey(patternId);
    store.delete(safeId);
    if (safeId !== patternId) store.delete(patternId);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Failed to delete vocal recording'));
    transaction.onabort = () => reject(new Error('Delete transaction aborted'));
  });
}

export async function clearAllRecordings(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Failed to clear vocal recordings'));
    transaction.onabort = () => reject(new Error('Clear transaction aborted'));
  });
}
