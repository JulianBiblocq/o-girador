
import { getDB, AUTOSAVE_STORE_NAME } from './indexedDbCore';

export async function saveAutosave(data: any): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUTOSAVE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(AUTOSAVE_STORE_NAME);
    store.put({ id: 'current', data, updatedAt: Date.now() });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Failed to save autosave'));
    transaction.onabort = () => reject(new Error('Autosave transaction aborted'));
  });
}

export async function getAutosave(): Promise<any | null> {
  const db = await getDB();

  // 1. Get from IndexedDB
  const dbAutosave = await new Promise<any | null>((resolve, reject) => {
    const transaction = db.transaction(AUTOSAVE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(AUTOSAVE_STORE_NAME);
    const request = store.get('current');
    request.onsuccess = () => {
      if (request.result) resolve(request.result.data);
      else resolve(null);
    };
    request.onerror = () => reject(request.error || new Error('Failed to get autosave'));
    transaction.onerror = () => reject(transaction.error || new Error('Autosave read transaction failed'));
    transaction.onabort = () => reject(new Error('Autosave read transaction aborted'));
  });

  // 2. If empty, check localStorage for migration
  if (!dbAutosave) {
    try {
      const raw = localStorage.getItem('o_girador_autosave') || localStorage.getItem('o-girador-autosave');
      if (raw) {
        const data = JSON.parse(raw);
        await saveAutosave(data);
        localStorage.removeItem('o_girador_autosave');
        localStorage.removeItem('o-girador-autosave');
        return data;
      }
    } catch (_) {}
  }

  return dbAutosave;
}

export async function clearAutosave(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUTOSAVE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(AUTOSAVE_STORE_NAME);
    store.delete('current');

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Failed to clear autosave'));
    transaction.onabort = () => reject(new Error('Clear autosave transaction aborted'));
  });
}
