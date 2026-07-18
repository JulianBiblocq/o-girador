/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Preset } from './types';

const DB_NAME = 'O GiradorDB';
const DB_VERSION = 2;
const STORE_NAME = 'vocalRecordings';
const LIB_STORE_NAME = 'personalLibrary';
const AUTOSAVE_STORE_NAME = 'autosave';

export interface LocalLibrary {
  [name: string]: Preset;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        dbPromise = null; // Reset so next calls can attempt a new connection
        reject(request.error || new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        const db = request.result;

        // If OS forcefully closes the database connection (e.g. backgrounding on iOS), reset the promise
        db.onclose = () => {
          dbPromise = null;
        };
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };

        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'patternId' });
        }
        if (!db.objectStoreNames.contains(LIB_STORE_NAME)) {
          db.createObjectStore(LIB_STORE_NAME, { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains(AUTOSAVE_STORE_NAME)) {
          db.createObjectStore(AUTOSAVE_STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }
  return dbPromise;
}

export async function saveVocalRecording(patternId: number, audioBlob: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const data = {
      patternId,
      audioBlob,
      updatedAt: Date.now(),
    };
    store.put(data);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Failed to save vocal recording'));
    transaction.onabort = () => reject(new Error('Save transaction aborted'));
  });
}

export async function getVocalRecording(patternId: number): Promise<Blob | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(patternId);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.audioBlob);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error || new Error('Failed to get vocal recording'));
    transaction.onerror = () => reject(transaction.error || new Error('Read transaction failed'));
    transaction.onabort = () => reject(new Error('Read transaction aborted'));
  });
}

export async function deleteVocalRecording(patternId: number): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(patternId);

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

export async function saveAutosave(data: any): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUTOSAVE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(AUTOSAVE_STORE_NAME);
    const record = {
      id: 'current',
      data,
      updatedAt: Date.now()
    };
    store.put(record);

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
    } catch (e) {
      // console.warn('Failed to migrate autosave from localStorage:', e);
    }
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

export async function getLocalLibrary(): Promise<LocalLibrary> {
  const db = await getDB();

  // 1. Get from IndexedDB
  const dbLibrary = await new Promise<LocalLibrary>((resolve, reject) => {
    const transaction = db.transaction(LIB_STORE_NAME, 'readonly');
    const store = transaction.objectStore(LIB_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result || [];
      const library: LocalLibrary = {};
      const len = results.length;
      for (let i = 0; i < len; i++) {
        const item = results[i];
        library[item.name] = item;
      }
      resolve(library);
    };
    request.onerror = () => reject(request.error || new Error('Failed to get local library'));
    transaction.onerror = () => reject(transaction.error || new Error('Library read transaction failed'));
    transaction.onabort = () => reject(new Error('Library read transaction aborted'));
  });

  // 2. If empty, check localStorage for migration
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
              const data = {
                ...preset,
                name,
              };
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
    } catch (e) {
      // console.warn('Failed to migrate library from localStorage:', e);
    }
  }

  return dbLibrary;
}

export async function savePresetToLibrary(name: string, preset: Preset): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LIB_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(LIB_STORE_NAME);
    const data = {
      ...preset,
      name,
    };
    store.put(data);

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
