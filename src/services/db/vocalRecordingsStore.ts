
import { getDB, STORE_NAME } from './indexedDbCore';

export async function saveVocalRecording(patternId: number | string, audioBlob: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const numId = Number(patternId);
    const safeId = !isNaN(numId) ? numId : patternId;
    store.put({ patternId: safeId, audioBlob, updatedAt: Date.now() });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Failed to save vocal recording'));
    transaction.onabort = () => reject(new Error('Save transaction aborted'));
  });
}

export async function getVocalRecording(patternId: number | string): Promise<Blob | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(patternId);

    request.onsuccess = () => {
      if (request.result && request.result.audioBlob) {
        resolve(request.result.audioBlob);
        return;
      }
      let fallbackKey: number | string | null = null;
      if (typeof patternId === 'number') {
        fallbackKey = String(patternId);
      } else if (typeof patternId === 'string' && !isNaN(Number(patternId))) {
        fallbackKey = Number(patternId);
      }

      if (fallbackKey !== null && fallbackKey !== patternId) {
        const retryRequest = store.get(fallbackKey);
        retryRequest.onsuccess = () => {
          resolve(retryRequest.result && retryRequest.result.audioBlob ? retryRequest.result.audioBlob : null);
        };
        retryRequest.onerror = () => resolve(null);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error || new Error('Failed to get vocal recording'));
    transaction.onerror = () => reject(transaction.error || new Error('Read transaction failed'));
    transaction.onabort = () => reject(new Error('Read transaction aborted'));
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
    const numId = Number(patternId);
    const safeId = !isNaN(numId) ? numId : patternId;
    store.delete(safeId);

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
