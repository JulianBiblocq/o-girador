/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../../firebase/config';
import { collection, getDocs, query, limit, where, orderBy } from 'firebase/firestore';
import { CloudSection } from '../../types';

export const CLOUD_SECTIONS_COLLECTION = 'sections';

export async function fetchCloudSections(
  userUid: string | null,
  userRole: 'admin' | 'mestre' | 'eleve' | 'visiteur' | string,
  mestreId: string | null,
  groupId?: string | null,
  canWriteSequenciador?: boolean
): Promise<CloudSection[]> {
  const sections: CloudSection[] = [];
  if (!userUid) return sections;
  const sectionsRef = collection(db, CLOUD_SECTIONS_COLLECTION);

  try {
    const isJulian = userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
    let myGroupMestreId = (userRole === 'mestre' || userRole === 'mestri') ? userUid : mestreId;
    const normalizedUserGroupId = groupId ? groupId.trim().toLowerCase() : '';
    const isSamambaiaGroup = isJulian ||
      normalizedUserGroupId.includes('samambaia') ||
      normalizedUserGroupId.includes('sammbia') ||
      mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
      Boolean(canWriteSequenciador);

    if (isJulian || isSamambaiaGroup) {
      myGroupMestreId = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
    }

    if (!myGroupMestreId && groupId) {
      if (groupId.toLowerCase() === 'samambaia') {
        myGroupMestreId = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
      } else {
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
          console.warn("Could not resolve mestre for group in fetchCloudSections:", e);
        }
      }
    }

    const promises: Promise<any>[] = [];
    const isSysAdmin = userRole === 'admin';

    if (isSysAdmin) {
      promises.push(getDocs(query(sectionsRef, orderBy('createdAt', 'desc'), limit(200))));
    } else {
      promises.push(getDocs(query(sectionsRef, where('ownerId', '==', userUid), limit(100))));
      promises.push(getDocs(query(sectionsRef, where('visibility', 'in', ['admin_global', 'public']), limit(100))));

      const effectiveGroup = groupId || ((isSamambaiaGroup || canWriteSequenciador) ? 'samambaia' : null);
      if (effectiveGroup) {
        const norm = effectiveGroup.trim().toLowerCase();
        const isSam = norm.includes('samambaia') || norm.includes('sammbia') || canWriteSequenciador;
        const groupIdVariants = Array.from(new Set([
          effectiveGroup, norm, ...(isSam ? ['samambaia', 'Samambaia', 'SAMAMBAIA'] : [effectiveGroup, norm])
        ]));
        promises.push(getDocs(query(sectionsRef, where('groupId', 'in', groupIdVariants), limit(100))));

        if (isSam) {
          promises.push(getDocs(query(sectionsRef, where('ownerId', '==', 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2'), limit(100))));
        }
      }
      if (myGroupMestreId) {
        promises.push(getDocs(query(sectionsRef, where('ownerId', '==', myGroupMestreId), limit(100))));
        promises.push(getDocs(query(sectionsRef, where('mestreId', '==', myGroupMestreId), limit(100))));
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

      const isSamambaiaSection =
        dataGroupIdNorm.includes('samambaia') ||
        dataGroupIdNorm.includes('sammbia') ||
        data.mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
        data.ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
        data.ownerId === 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2';

      const matchesGroup = Boolean(
        (userGroupNorm && dataGroupIdNorm && dataGroupIdNorm === userGroupNorm) ||
        ((userGroupNorm.includes('samambaia') || isSamambaiaGroup || canWriteSequenciador) && isSamambaiaSection)
      );
      const matchesMestre = myGroupMestreId && (data.mestreId === myGroupMestreId || data.ownerId === myGroupMestreId);
      const isMemberOrEleve = userRole === 'eleve' || userRole === 'membre' || userRole === 'mestre' || userRole === 'admin';
      const isMestreGroup = (data.visibility === 'mestre_group' || !data.visibility) && (matchesMestre || matchesGroup || isSamambaiaSection);

      if (isSysAdmin || isOwner || isAdminGlobal || isPublic || isMestreGroup || matchesGroup || matchesMestre || ((isSamambaiaGroup || isMemberOrEleve) && isSamambaiaSection)) {
        sections.push({
          id: docSnap.id,
          name: data.name,
          ownerId: data.ownerId,
          visibility: data.visibility,
          mestreId: data.mestreId,
          createdAt: data.createdAt,
          audioUrl: data.audioUrl,
          data: data.data
        });
      }
    });

    sections.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    if (!(err && ((err as any).code === 'permission-denied' || String(err).includes('permission')))) {
      console.error("Error fetching cloud sections:", err);
    }
  }

  return sections;
}
