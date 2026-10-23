/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../../firebase/config';
import { collection, getDocs, query, limit, where, orderBy } from 'firebase/firestore';
import { CloudPattern, SavedPattern } from '../../types';
import LZString from 'lz-string';
import { resolveCloudGroupMestreId, isSamambaiaGroupHelper } from '../cloud-common/cloudMestreResolver';

export const CLOUD_PATTERNS_COLLECTION = 'patterns';

export async function fetchCloudPatterns(
  userUid: string | null,
  userRole: 'admin' | 'mestre' | 'eleve' | 'visiteur' | string,
  mestreId: string | null,
  groupId?: string | null,
  canWriteSequenciador?: boolean
): Promise<CloudPattern[]> {
  const patterns: CloudPattern[] = [];
  if (!userUid) return patterns;
  const patternsRef = collection(db, CLOUD_PATTERNS_COLLECTION);

  try {
    const isSamambaiaGroup = isSamambaiaGroupHelper(userUid, groupId, mestreId, canWriteSequenciador);
    const myGroupMestreId = await resolveCloudGroupMestreId(userUid, groupId, userRole, mestreId, canWriteSequenciador);
    const promises: Promise<any>[] = [];
    const isSysAdmin = userRole === 'admin';

    if (isSysAdmin) {
      promises.push(getDocs(query(patternsRef, orderBy('createdAt', 'desc'), limit(200))));
    } else {
      promises.push(getDocs(query(patternsRef, where('ownerId', '==', userUid), limit(100))));
      promises.push(getDocs(query(patternsRef, where('visibility', 'in', ['admin_global', 'public']), limit(100))));

      const effectiveGroup = groupId || ((isSamambaiaGroup || canWriteSequenciador) ? 'samambaia' : null);
      if (effectiveGroup) {
        const norm = effectiveGroup.trim().toLowerCase();
        const isSam = norm.includes('samambaia') || norm.includes('sammbia') || canWriteSequenciador;
        const groupIdVariants = Array.from(new Set([
          effectiveGroup, norm, ...(isSam ? ['samambaia', 'Samambaia', 'SAMAMBAIA'] : [effectiveGroup, norm])
        ]));
        promises.push(getDocs(query(patternsRef, where('groupId', 'in', groupIdVariants), limit(100))));

        if (isSam) {
          promises.push(getDocs(query(patternsRef, where('ownerId', '==', 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2'), limit(100))));
        }
      }
      if (myGroupMestreId) {
        promises.push(getDocs(query(patternsRef, where('ownerId', '==', myGroupMestreId), limit(100))));
        promises.push(getDocs(query(patternsRef, where('mestreId', '==', myGroupMestreId), limit(100))));
      }
    }

    const snapshots = await Promise.all(promises);
    const uniqueDocs = new Map();

    snapshots.forEach((snapshot) => {
      snapshot.forEach((docSnap: any) => {
        if (!uniqueDocs.has(docSnap.id)) uniqueDocs.set(docSnap.id, docSnap);
      });
    });

    uniqueDocs.forEach((docSnap) => {
      const data = docSnap.data();
      const isOwner = data.ownerId === userUid;
      const isAdminGlobal = data.visibility === 'admin_global';
      const isPublic = data.visibility === 'public';
      const dataGroupIdNorm = String((data as any).groupId || '').toLowerCase().trim();
      const userGroupNorm = String(groupId || (isSamambaiaGroup || canWriteSequenciador ? 'samambaia' : '')).toLowerCase().trim();

      const isSamambaiaPattern =
        dataGroupIdNorm.includes('samambaia') ||
        dataGroupIdNorm.includes('sammbia') ||
        data.mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
        data.ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
        data.ownerId === 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2';

      const matchesGroup = Boolean(
        (userGroupNorm && dataGroupIdNorm && dataGroupIdNorm === userGroupNorm) ||
        ((userGroupNorm.includes('samambaia') || isSamambaiaGroup || canWriteSequenciador) && isSamambaiaPattern)
      );
      const matchesMestre = myGroupMestreId && (data.mestreId === myGroupMestreId || data.ownerId === myGroupMestreId);
      const isMemberOrEleve = userRole === 'eleve' || userRole === 'membre' || userRole === 'mestre' || userRole === 'admin';
      const isMestreGroup = (data.visibility === 'mestre_group' || !data.visibility) && (matchesMestre || matchesGroup || isSamambaiaPattern);

      if (isSysAdmin || isOwner || isAdminGlobal || isPublic || isMestreGroup || matchesGroup || matchesMestre || ((isSamambaiaGroup || isMemberOrEleve) && isSamambaiaPattern)) {
        const jsonStr = LZString.decompressFromBase64(data.data);
        if (jsonStr) {
          const parsedPattern = JSON.parse(jsonStr) as SavedPattern;
          patterns.push({
            ...parsedPattern,
            id: docSnap.id,
            ownerId: data.ownerId,
            visibility: data.visibility,
            mestreId: data.mestreId,
            audioUrl: data.audioUrl
          });
        }
      }
    });

    patterns.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    if (!(err && ((err as any).code === 'permission-denied' || String(err).includes('permission')))) {
      console.error("Error fetching cloud patterns:", err);
    }
  }

  return patterns;
}
