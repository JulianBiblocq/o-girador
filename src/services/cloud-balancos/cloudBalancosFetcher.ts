import { db } from '../../firebase/config';
import { collection, getDocs, query, limit, where, orderBy } from 'firebase/firestore';
import { BalancoPreset } from '../../types';
import { resolveCloudGroupMestreId, isSamambaiaGroupHelper } from '../cloud-common/cloudMestreResolver';
import { buildTenantGroupQueryVariants, isTenantScopedDocAuthorized } from '../cloud-common/cloudTenantAuthGuard';

export const CLOUD_BALANCOS_COLLECTION = 'balancos';

export async function fetchCloudBalancos(
  userUid: string | null,
  groupId?: string | null,
  userRole: string = 'visiteur',
  mestreId?: string | null,
  canWriteSequenciador?: boolean
): Promise<BalancoPreset[]> {
  const balancos: BalancoPreset[] = [];
  if (!userUid) return balancos;

  const balancosRef = collection(db, CLOUD_BALANCOS_COLLECTION);

  try {
    const isSamambaiaGroup = isSamambaiaGroupHelper(userUid, groupId, mestreId, canWriteSequenciador);
    const myGroupMestreId = await resolveCloudGroupMestreId(userUid, groupId, userRole, mestreId, canWriteSequenciador);
    const promises: Promise<any>[] = [];
    const isSysAdmin = userRole === 'admin';

    if (isSysAdmin) {
      promises.push(getDocs(query(balancosRef, orderBy('createdAt', 'desc'), limit(200))));
    } else {
      promises.push(getDocs(query(balancosRef, where('ownerId', '==', userUid), limit(100))));
      promises.push(getDocs(query(balancosRef, where('visibility', 'in', ['admin_global', 'public']), limit(100))));

      const { variants, includeLegacySamambaiaOwners } = buildTenantGroupQueryVariants(groupId, isSamambaiaGroup);
      if (variants.length > 0) {
        promises.push(getDocs(query(balancosRef, where('groupId', 'in', variants), limit(100))));
        if (includeLegacySamambaiaOwners) {
          promises.push(getDocs(query(balancosRef, where('ownerId', '==', 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2'), limit(100))));
        }
      }
      if (myGroupMestreId) {
        promises.push(getDocs(query(balancosRef, where('ownerId', '==', myGroupMestreId), limit(100))));
      }
    }

    const snapshots = await Promise.all(promises);
    const uniqueDocs = new Map<string, any>();

    snapshots.forEach((snapshot) => {
      snapshot.forEach((docSnap) => {
        if (!uniqueDocs.has(docSnap.id)) uniqueDocs.set(docSnap.id, docSnap);
      });
    });

    uniqueDocs.forEach((docSnap) => {
      const data = docSnap.data();
      if (isTenantScopedDocAuthorized({ data, userUid, userRole, myGroupMestreId, groupId, isSamambaiaGroup })) {
        balancos.push({
          id: docSnap.id,
          name: data.name,
          ownerId: data.ownerId,
          authorName: data.authorName,
          groupId: data.groupId,
          visibility: data.visibility,
          packId: data.packId,
          division: data.division || 16,
          offsets: data.offsets || [0, 8, -29, -58],
          isFactory: false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      }
    });

    balancos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    if (!(err && ((err as any).code === 'permission-denied' || String(err).includes('permission')))) {
      console.error('Erreur lors de la récupération des balanços cloud:', err);
    }
  }

  return balancos;
}
