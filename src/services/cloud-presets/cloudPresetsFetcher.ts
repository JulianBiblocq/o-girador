/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../../firebase/config';
import { collection, getDocs, query, limit, where } from 'firebase/firestore';
import { CloudPreset } from '../../types';
import { CLOUD_PRESETS_COLLECTION } from './presetCache';
import { isPresetAuthorized } from './presetAuthorization';

export async function fetchCloudPresets(
  userUid: string | null,
  userRole: 'admin' | 'mestre' | 'eleve' | 'membre' | 'visiteur' | string,
  mestreId: string | null,
  groupId?: string | null,
  canWriteSequenciador?: boolean
): Promise<CloudPreset[]> {
  const presets: CloudPreset[] = [];
  const presetsRef = collection(db, CLOUD_PRESETS_COLLECTION);

  try {
    if (userRole === 'admin') {
      const snapshot = await getDocs(query(presetsRef, limit(1000)));
      snapshot.forEach((docSnap) => {
        presets.push({ id: docSnap.id, ...(docSnap.data() as Omit<CloudPreset, 'id'>) });
      });
      presets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else {
      const normalizedUserGroupId = groupId ? groupId.trim().toLowerCase() : '';
      const isOtherGroup = Boolean(
        normalizedUserGroupId &&
        !normalizedUserGroupId.includes('samambaia') &&
        !normalizedUserGroupId.includes('sammbia')
      );
      const isSamambaiaGroup = !isOtherGroup;
      const myGroupMestreId = isSamambaiaGroup ? 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' : (mestreId || null);

      const queries = [
        getDocs(query(presetsRef, where('visibility', '==', 'admin_global'), limit(100))),
        getDocs(query(presetsRef, where('visibility', '==', 'public'), limit(100))),
      ];

      if (userUid) {
        queries.push(getDocs(query(presetsRef, where('ownerId', '==', userUid), limit(100))));
        queries.push(getDocs(query(presetsRef, where('targetUserId', '==', userUid), limit(100))));
      }

      if (isSamambaiaGroup) {
        queries.push(getDocs(query(presetsRef, where('groupId', 'in', ['samambaia', 'Samambaia', 'SAMAMBAIA']), limit(100))));
        queries.push(getDocs(query(presetsRef, where('mestreId', '==', 'iA0SweEHyOPzAPGIDVZdeKAV2mk1'), limit(100))));
        queries.push(getDocs(query(presetsRef, where('ownerId', '==', 'iA0SweEHyOPzAPGIDVZdeKAV2mk1'), limit(100))));
        queries.push(getDocs(query(presetsRef, where('ownerId', '==', 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2'), limit(100))));
      } else if (groupId) {
        queries.push(getDocs(query(presetsRef, where('groupId', '==', groupId), limit(100))));
        if (myGroupMestreId) {
          queries.push(getDocs(query(presetsRef, where('mestreId', '==', myGroupMestreId), limit(100))));
          queries.push(getDocs(query(presetsRef, where('ownerId', '==', myGroupMestreId), limit(100))));
        }
      }

      const settled = await Promise.allSettled(queries);
      const uniqueIds = new Set<string>();

      settled.forEach((res) => {
        if (res.status === 'fulfilled') {
          res.value.forEach((docSnap) => {
            if (!uniqueIds.has(docSnap.id)) {
              const data = docSnap.data() as Omit<CloudPreset, 'id'>;
              if (isPresetAuthorized(data, userUid, userRole, myGroupMestreId, groupId, isSamambaiaGroup, canWriteSequenciador)) {
                uniqueIds.add(docSnap.id);
                presets.push({ id: docSnap.id, ...data });
              }
            }
          });
        }
      });

      presets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  } catch (err) {
    console.warn('fetchCloudPresets - Avertissement requête globale :', err);
  }

  return presets;
}
