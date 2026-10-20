/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Preset } from '../../types';
import { getDB, LIB_STORE_NAME } from './indexedDbCore';

export interface LocalLibrary {
  [name: string]: Preset;
}

export async function getLocalLibrary(): Promise<LocalLibrary> {
  const db = await getDB();

  const dbLibrary = await new Promise<LocalLibrary>((resolve, reject) => {
    const transaction = db.transaction(LIB_STORE_NAME, 'readonly');
    const store = transaction.objectStore(LIB_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result || [];
      const library: LocalLibrary = {};
      for (let i = 0; i < results.length; i++) {
        const item = results[i];
        library[item.name] = item;
      }
      resolve(library);
    };
    request.onerror = () => reject(request.error || new Error('Failed to get local library'));
    transaction.onerror = () => reject(transaction.error || new Error('Library read transaction failed'));
    transaction.onabort = () => reject(new Error('Library read transaction aborted'));
  });

  if (Object.keys(dbLibrary).length === 0) {
    try {
      const raw = localStorage.getItem('oGirador_personal_library');
      if (raw) {
        const localLib = JSON.parse(raw);
        const keys = Object.keys(localLib);
        if (keys.length > 0) {
          await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(LIB_STORE_NAME, 'readwrite');
            const store = transaction.objectStore(LIB_STORE_NAME);
            for (let i = 0; i < keys.length; i++) {
              const name = keys[i];
              const preset = localLib[name];
              const data = { ...preset, name };
              store.put(data);
              dbLibrary[name] = data;
            }
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error('Migration transaction failed'));
            transaction.onabort = () => reject(new Error('Migration transaction aborted'));
          });
          localStorage.removeItem('oGirador_personal_library');
        }
      }
    } catch (_) {}
  }

  return dbLibrary;
}

export async function savePresetToLibrary(name: string, preset: Preset): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LIB_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(LIB_STORE_NAME);
    store.put({ ...preset, name });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Failed to save preset to library'));
    transaction.onabort = () => reject(new Error('Save preset transaction aborted'));
  });
}

export async function deletePresetFromLibrary(name: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LIB_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(LIB_STORE_NAME);
    store.delete(name);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Failed to delete preset'));
    transaction.onabort = () => reject(new Error('Delete preset transaction aborted'));
  });
}
