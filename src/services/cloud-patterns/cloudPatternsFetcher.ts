import { db } from '../../firebase/config';
import { collection, getDocs, query, limit, where, orderBy } from 'firebase/firestore';
import { CloudPattern, SavedPattern } from '../../types';
import LZString from 'lz-string';
import { resolveCloudGroupMestreId, isSamambaiaGroupHelper } from '../cloud-common/cloudMestreResolver';
import { buildTenantGroupQueryVariants, isTenantScopedDocAuthorized } from '../cloud-common/cloudTenantAuthGuard';

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

      const { variants, includeLegacySamambaiaOwners } = buildTenantGroupQueryVariants(groupId, isSamambaiaGroup);
      if (variants.length > 0) {
        promises.push(getDocs(query(patternsRef, where('groupId', 'in', variants), limit(100))));
        if (includeLegacySamambaiaOwners) {
          promises.push(getDocs(query(patternsRef, where('ownerId', '==', 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2'), limit(100))));
        }
      }
      if (myGroupMestreId) {
        promises.push(getDocs(query(patternsRef, where('ownerId', '==', myGroupMestreId), limit(100))));
        promises.push(getDocs(query(patternsRef, where('mestreId', '==', myGroupMestreId), limit(100))));
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
      if (isTenantScopedDocAuthorized({ data, userUid, userRole, myGroupMestreId, groupId, isSamambaiaGroup })) {
        const jsonStr = LZString.decompressFromBase64(data.data);
        if (jsonStr) {
          const parsedPattern = JSON.parse(jsonStr) as SavedPattern;
          patterns.push({
            ...parsedPattern,
            id: docSnap.id,
            ownerId: data.ownerId,
            visibility: data.visibility,
            mestreId: data.mestreId,
            audioUrl: data.audioUrl,
          });
        }
      }
    });

    patterns.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    if (!(err && ((err as any).code === 'permission-denied' || String(err).includes('permission')))) {
      console.error('Error fetching cloud patterns:', err);
    }
  }

  return patterns;
}
