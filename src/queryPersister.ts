import { get, set, del } from 'idb-keyval';
import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

export const indexedDBPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set('react-query-cache', client);
  },
  restoreClient: async () => {
    return await get<PersistedClient>('react-query-cache');
  },
  removeClient: async () => {
    await del('react-query-cache');
  },
};
