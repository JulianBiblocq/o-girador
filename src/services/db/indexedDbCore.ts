
export const DB_NAME = 'O GiradorDB';
export const DB_VERSION = 2;
export const STORE_NAME = 'vocalRecordings';
export const LIB_STORE_NAME = 'personalLibrary';
export const AUTOSAVE_STORE_NAME = 'autosave';

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        dbPromise = null;
        reject(request.error || new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onclose = () => {
          dbPromise = null;
        };
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onupgradeneeded = () => {
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
