/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DB_NAME = 'O GiradorDB';
const DB_VERSION = 1;
const STORE_NAME = 'vocalRecordings';

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
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'patternId' });
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
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to save vocal recording'));
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
  });
}

export async function deleteVocalRecording(patternId: number): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(patternId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to delete vocal recording'));
  });
}

export async function clearAllRecordings(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to clear vocal recordings'));
  });
}
