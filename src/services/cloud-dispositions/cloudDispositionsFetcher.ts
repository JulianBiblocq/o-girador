
import { db } from '../../firebase/config';
import { collection, getDocs, query, limit, where, orderBy } from 'firebase/firestore';
import { DispositionPreset } from '../../types';

export const CLOUD_DISPOSITIONS_COLLECTION = 'dispositions';

export async function fetchCloudDispositions(
  userUid: string | null,
  groupId?: string | null,
  mestreId?: string | null,
  userRole: string = 'visiteur',
  canWriteSequenciador?: boolean
): Promise<DispositionPreset[]> {
  const dispositions: DispositionPreset[] = [];
  if (!userUid || userUid === 'local') return dispositions;

  const dispositionsRef = collection(db, CLOUD_DISPOSITIONS_COLLECTION);

  try {
    const isJulian = userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
    let myGroupMestreId = (userRole === 'mestre' || userRole === 'mestri') ? userUid : mestreId;
    const normalizedUserGroupId = groupId ? groupId.trim().toLowerCase() : '';
    const isSamambaiaGroup = isJulian ||
      userUid === 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2' ||
      normalizedUserGroupId.includes('samambaia') ||
      normalizedUserGroupId.includes('sammbia') ||
      Boolean(canWriteSequenciador);

    if (isSamambaiaGroup && !myGroupMestreId) {
      myGroupMestreId = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
    } else if (!myGroupMestreId && normalizedUserGroupId) {
      try {
        const mestreQ = query(
          collection(db, 'users'),
          where('groupId', 'in', Array.from(new Set([groupId?.trim() || '', normalizedUserGroupId]))),
          where('role', '==', 'mestre')
        );
        const mestreSnap = await getDocs(mestreQ);
        if (!mestreSnap.empty) myGroupMestreId = mestreSnap.docs[0].id;
      } catch (e) {
        console.warn("Impossible de résoudre le mestre pour le groupe dans fetchCloudDispositions:", e);
      }
    }

    const groupIdVariants = isSamambaiaGroup
      ? ['samambaia', 'Samambaia']
      : (groupId && groupId.trim() !== '' ? Array.from(new Set([groupId.trim(), groupId.trim().toLowerCase()])) : []);

    const promises: Promise<any>[] = [];
    const isSysAdmin = userRole === 'admin';

    if (isSysAdmin) {
      promises.push(getDocs(query(dispositionsRef, orderBy('createdAt', 'desc'), limit(200))));
    } else {
      promises.push(getDocs(query(dispositionsRef, where('ownerId', '==', userUid), limit(100))));
      promises.push(getDocs(query(dispositionsRef, where('visibility', 'in', ['admin_global', 'public']), limit(100))));

      if (groupIdVariants.length > 0) {
        promises.push(getDocs(query(dispositionsRef, where('groupId', 'in', groupIdVariants), limit(100))));
      }
      if (myGroupMestreId && myGroupMestreId !== userUid) {
        promises.push(getDocs(query(dispositionsRef, where('ownerId', '==', myGroupMestreId), limit(100))));
      }
      if (isSamambaiaGroup && userUid !== 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2' && myGroupMestreId !== 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2') {
        promises.push(getDocs(query(dispositionsRef, where('ownerId', '==', 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2'), limit(100))));
      }
    }

    const snapshots = await Promise.all(promises);
    const uniqueDocs = new Map<string, any>();

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
      const matchesMestre = myGroupMestreId && data.ownerId === myGroupMestreId;
      const docGroupId = (data.groupId || '').toString().toLowerCase();
      const matchesGroup = Boolean(normalizedUserGroupId && docGroupId && docGroupId === normalizedUserGroupId);
      const isSamambaiaDisp = isSamambaiaGroup && (
        docGroupId.includes('samambaia') ||
        data.ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
        data.ownerId === 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2'
      );
      const isMestreGroup = (data.visibility === 'mestre_group' || !data.visibility) && (matchesMestre || matchesGroup || isSamambaiaDisp);

      if (isSysAdmin || isOwner || isAdminGlobal || isPublic || isMestreGroup || matchesGroup || matchesMestre || isSamambaiaDisp) {
        dispositions.push({
          id: docSnap.id,
          name: data.name || "Disposition",
          ownerId: data.ownerId,
          authorId: data.authorId || data.ownerId,
          authorName: data.authorName,
          groupId: data.groupId,
          mestreId: data.mestreId,
          visibility: data.visibility || 'private',
          instruments: Array.isArray(data.instruments) ? data.instruments : [],
          hasToada: Boolean(data.hasToada),
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now()
        });
      }
    });

    dispositions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    if (!(err && ((err as any).code === 'permission-denied' || String(err).includes('permission')))) {
      console.warn("Erreur lors de la récupération des dispositions cloud:", err);
    }
  }

  return dispositions;
}
