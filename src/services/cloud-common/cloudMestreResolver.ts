/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Résolution commune du mestre de groupe pour les requêtes cloud (< 50 lignes).
 */

import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';

export function isSamambaiaGroupHelper(
  userUid: string,
  groupId?: string | null,
  mestreId?: string | null,
  canWriteSequenciador?: boolean
): boolean {
  const isJulian = userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
  const normalizedUserGroupId = groupId ? groupId.trim().toLowerCase() : '';
  return isJulian ||
    normalizedUserGroupId.includes('samambaia') ||
    normalizedUserGroupId.includes('sammbia') ||
    mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    Boolean(canWriteSequenciador);
}

export async function resolveCloudGroupMestreId(
  userUid: string,
  groupId?: string | null,
  userRole: string = 'visiteur',
  mestreId?: string | null,
  canWriteSequenciador?: boolean
): Promise<string | null | undefined> {
  const isJulian = userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
  let myGroupMestreId = (userRole === 'mestre' || userRole === 'mestri') ? userUid : mestreId;
  const isSamambaiaGroup = isSamambaiaGroupHelper(userUid, groupId, mestreId, canWriteSequenciador);

  if (isJulian || isSamambaiaGroup) {
    return 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
  }


  if (!myGroupMestreId && groupId) {
    if (groupId.toLowerCase() === 'samambaia') {
      return 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
    }
    try {
      const mestreQ = query(
        collection(db, 'users'),
        where('groupId', 'in', Array.from(new Set([groupId, groupId.toLowerCase()]))),
        where('role', '==', 'mestre')
      );
      const mestreSnap = await getDocs(mestreQ);
      if (!mestreSnap.empty) {
        myGroupMestreId = mestreSnap.docs[0].id;
      }
    } catch (e) {
      console.warn("Impossible de résoudre le mestre pour le groupe:", e);
    }
  }

  return myGroupMestreId;
}
