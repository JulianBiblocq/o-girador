/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, DocumentReference } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { UserProfile, checkIsAdmin } from './authTypes';

export async function resolveUserProfileAndGroup(
  user: User,
  rawData: any,
  userRef: DocumentReference
): Promise<UserProfile> {
  const profile = { ...rawData } as UserProfile;

  // Gestion de l'invitation en attente
  const pendingInvite = sessionStorage.getItem('o-girador-invite');
  if (pendingInvite && profile.role === 'visiteur') {
    const mestreSnap = await getDoc(doc(db, 'users', pendingInvite));
    if (mestreSnap.exists()) {
      const mData = mestreSnap.data() as UserProfile;
      const canJoin = !mData.maxEleves || (await getDocs(query(collection(db, 'users'), where('mestreId', '==', pendingInvite)))).size < mData.maxEleves;
      if (canJoin) {
        profile.role = 'eleve';
        profile.mestreId = pendingInvite;
        await updateDoc(userRef, { role: 'eleve', mestreId: pendingInvite });
      }
    }
    sessionStorage.removeItem('o-girador-invite');
  }

  const isLeftHanded = rawData.lateralite === 'gaucher' || rawData.isLeftHanded === true;
  useSequencerStore.getState().setIsLeftHanded(isLeftHanded);
  profile.lateralite = rawData.lateralite || (isLeftHanded ? 'gaucher' : 'droitier');
  profile.isLeftHanded = isLeftHanded;

  const extractedGroupId = (profile.groupId || rawData.group || rawData.associationId || rawData.groupName || '').trim().toLowerCase();
  const isOtherDistinctGroup = extractedGroupId && !extractedGroupId.includes('samambaia') && !extractedGroupId.includes('sammbia');
  const isSamambaiaOrEditor = !isOtherDistinctGroup || profile.uid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' || extractedGroupId.includes('samambaia') || Boolean(profile.canWriteSequenciador);

  if (isSamambaiaOrEditor) {
    profile.mestreId = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
    profile.groupName = 'Samambaia';
    profile.groupId = rawData.groupId || 'Samambaia';
    if (profile.role === 'visiteur' || !profile.role) profile.role = 'membre';

    if (rawData.mestreId !== profile.mestreId || rawData.groupName !== profile.groupName || !rawData.groupId) {
      updateDoc(userRef, { mestreId: profile.mestreId, groupName: profile.groupName, groupId: profile.groupId }).catch(() => {});
    }
  } else if (extractedGroupId) {
    profile.groupId = extractedGroupId;
    if (rawData.groupId !== extractedGroupId && checkIsAdmin(profile)) {
      updateDoc(userRef, { groupId: extractedGroupId }).catch(() => {});
    }
    if (rawData.mestreId) profile.mestreId = rawData.mestreId;
  }

  if ((profile.role === 'mestre' || (profile.dbRole as any) === 'mestre') && !profile.mestreId) {
    profile.mestreId = user.uid;
  }

  return { ...profile, dbRole: profile.dbRole || profile.role };
}
