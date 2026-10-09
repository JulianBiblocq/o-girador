import { auth, db, storage } from './firebase/config';
import { collection, addDoc, getDocs, getDoc, doc, updateDoc, setDoc, query, limit, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getVocalRecording } from './db';
import { CloudPreset, Preset, CatalogVisibility } from './types';
import LZString from 'lz-string';
import { CLOUD_PRESETS_COLLECTION, isPresetAuthorized, presetCache, SANCTUARIZED_PRESET_IDS, isTestPresetName, isTestEnvironment } from './cloudPresetsStorage';
import { useAudioStore } from './stores/useAudioStore';
import { useSequencerStore } from './stores/useSequencerStore';

export {
  CLOUD_PRESETS_COLLECTION, presetCache, getCloudPreset,
  deleteCloudPreset, renameCloudPreset, togglePresetDraftStatus, fetchStoragePresetsJSON, isPresetAuthorized,
  SANCTUARIZED_PRESET_IDS, isTestPresetName, isTestEnvironment
} from './cloudPresetsStorage';

/**
 * Enregistre un preset dans Firestore Cloud.
 */
export async function savePresetToCloud(
  name: string,
  presetData: Preset,
  ownerId: string,
  visibility: CatalogVisibility,
  targetUserId?: string,
  audioUrl?: string | null,
  targetPresetId?: string,
  mestreId?: string,
  groupId?: string,
  canWriteSequenciador?: boolean,
  isDraft?: boolean,
  userRole?: string
): Promise<string> {
  const isRestoration = typeof window !== 'undefined' && (window as any).__ALLOW_SANCTUARIZED_RESTORE__ === true;
  const isPlaywrightTest = typeof window !== 'undefined' && Boolean(
    (window as any).__PLAYWRIGHT_TEST__ ||
    (window as any).__PLAYWRIGHT__ ||
    (window as any).__TEST_ENV__
  );

  const currentAuthUid = auth.currentUser?.uid || ownerId;
  const isMestre = (
    userRole === 'mestre' ||
    userRole === 'admin' ||
    userRole === 'super-admin' ||
    canWriteSequenciador === true ||
    currentAuthUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    (mestreId && currentAuthUid === mestreId)
  );

  // 🛡️ Garde-fou Sanctuarisation : Seul le Mestre ou le propriétaire légitime peut modifier un document sanctuarisé
  if (targetPresetId && SANCTUARIZED_PRESET_IDS.has(targetPresetId)) {
    // 1. Bloquer impérativement si l'appel provient d'un script de test Playwright / E2E
    if (isPlaywrightTest && !isRestoration) {
      throw new Error(`[Sanctuarisation E2E] Écrasement formellement interdit du preset officiel sanctuarisé "${targetPresetId}" en environnement de test.`);
    }

    // 2. Vérifier si l'utilisateur est le propriétaire initial du document
    let isInitialOwner = currentAuthUid === ownerId;
    if (!isInitialOwner && !isMestre) {
      try {
        const existingSnap = await getDoc(doc(db, CLOUD_PRESETS_COLLECTION, targetPresetId));
        if (existingSnap.exists() && existingSnap.data()?.ownerId === currentAuthUid) {
          isInitialOwner = true;
        }
      } catch (_) {}
    }

    // 3. Bloquer si un compte sans droits Mestre ni propriétaire tente d'écraser
    if (!isMestre && !isInitialOwner && !isRestoration) {
      throw new Error(`[Sanctuarisation] Écrasement interdit du preset officiel sanctuarisé "${targetPresetId}". Seul le Mestre ou le propriétaire initial est autorisé.`);
    }
  }

  // 🛡️ Garde-fou E2E : En environnement de test Playwright, interdiction de cibler des documents de production
  if (isPlaywrightTest && !isRestoration && targetPresetId && !targetPresetId.startsWith('test_e2e_')) {
    throw new Error(`[Sanctuarisation E2E] Écrasement interdit en contexte de test : targetPresetId doit impérativement être préfixé par "test_e2e_". Reçu: "${targetPresetId}".`);
  }

  const presetToSave = JSON.parse(JSON.stringify(presetData));

  // Téléversement garanti des enregistrements vocaux locaux vers Firebase Storage
  const updatedPatternsUrlMap = new Map<string | number, string>();
  for (const track of presetToSave.tracks || []) {
    for (const pattern of track.patterns || []) {
      try {
        const storeBlobs = useAudioStore.getState().vocalBlobs;
        const blob = (await getVocalRecording(pattern.id)) ||
          (pattern.vocalClip?.id ? await getVocalRecording(pattern.vocalClip.id) : null) ||
          storeBlobs[pattern.id] ||
          storeBlobs[String(pattern.id)] ||
          (pattern.vocalClip?.id ? storeBlobs[pattern.vocalClip.id] || storeBlobs[String(pattern.vocalClip.id)] : null);

        const needsUpload = Boolean(
          blob && (
            !pattern.vocalAudioUrl ||
            !pattern.vocalAudioUrl.startsWith('https://firebasestorage.googleapis.com/')
          )
        );

        if (needsUpload && blob) {
          const timestamp = Date.now();
          const storageRef = ref(storage, `vocalRecordings/${pattern.id}_${timestamp}.wav`);
          await uploadBytes(storageRef, blob, { contentType: 'audio/wav' });
          const downloadUrl = await getDownloadURL(storageRef);
          pattern.vocalAudioUrl = downloadUrl;
          updatedPatternsUrlMap.set(pattern.id, downloadUrl);
          if (pattern.vocalClip?.id) {
            updatedPatternsUrlMap.set(pattern.vocalClip.id, downloadUrl);
          }
        }
      } catch (e) {
        console.error(`savePresetToCloud - Échec upload vocal pour motif ${pattern.id}:`, e);
      }
    }
  }

  // Synchroniser les URLs générées dans useSequencerStore en session
  if (updatedPatternsUrlMap.size > 0) {
    try {
      const currentTracks = useSequencerStore.getState().tracks;
      useSequencerStore.getState().setTracks(
        currentTracks.map(t => ({
          ...t,
          patterns: t.patterns.map(p => {
            const newUrl = updatedPatternsUrlMap.get(p.id) || (p.vocalClip?.id ? updatedPatternsUrlMap.get(p.vocalClip.id) : undefined);
            return newUrl ? { ...p, vocalAudioUrl: newUrl } : p;
          })
        }))
      );
    } catch (_) {}
  }

  const dataString = LZString.compressToBase64(JSON.stringify(presetToSave));
  let effectiveGroupId = groupId ? groupId.trim() : '';
  let effectiveMestreId = mestreId || null;
  const isSamambaiaGroup =
    ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    effectiveGroupId.toLowerCase().includes('samambaia') ||
    effectiveGroupId.toLowerCase().includes('sammbia') ||
    Boolean(canWriteSequenciador);

  if (isSamambaiaGroup) {
    // Normalisation canonique en minuscules pour Samambaia
    effectiveGroupId = 'samambaia';
    effectiveMestreId = effectiveMestreId || 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
  } else if (effectiveGroupId) {
    effectiveGroupId = effectiveGroupId.toLowerCase();
  }

  const defaultVis = (isSamambaiaGroup || canWriteSequenciador) ? 'mestre_group' : 'private';
  const docData: any = {
    name: name || "Preset Sans Nom",
    data: dataString,
    ownerId: ownerId || "",
    visibility: visibility || defaultVis,
    targetUserId: targetUserId || null,
    mestreId: effectiveMestreId,
    updatedAt: Date.now()
  };
  if (effectiveGroupId) docData.groupId = effectiveGroupId;
  if (audioUrl !== undefined) docData.audioUrl = audioUrl;
  if (isDraft !== undefined) docData.isDraft = isDraft;
  
  if (targetPresetId) {
    await setDoc(doc(db, CLOUD_PRESETS_COLLECTION, targetPresetId), docData, { merge: true });
    presetCache.set(targetPresetId, presetToSave);
    return targetPresetId;
  } else {
    docData.createdAt = Date.now();
    if (isTestEnvironment()) {
      const testId = `test_e2e_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await setDoc(doc(db, CLOUD_PRESETS_COLLECTION, testId), docData);
      presetCache.set(testId, presetToSave);
      return testId;
    } else {
      const docRef = await addDoc(collection(db, CLOUD_PRESETS_COLLECTION), docData);
      presetCache.set(docRef.id, presetToSave);
      return docRef.id;
    }
  }
}

/**
 * Récupère tous les presets Cloud autorisés pour l'utilisateur courant.
 */
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
      snapshot.forEach(docSnap => {
        presets.push({ id: docSnap.id, ...(docSnap.data() as Omit<CloudPreset, 'id'>) });
      });
      presets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else {
      const isJulian = userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
      const normalizedUserGroupId = groupId ? groupId.trim().toLowerCase() : '';
      const isOtherGroup = Boolean(
        normalizedUserGroupId &&
        !normalizedUserGroupId.includes('samambaia') &&
        !normalizedUserGroupId.includes('sammbia')
      );
      const isSamambaiaGroup = !isOtherGroup;
      let myGroupMestreId = isSamambaiaGroup ? 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' : (mestreId || null);

      const queries = [
        getDocs(query(presetsRef, where('visibility', '==', 'admin_global'), limit(100))),
        getDocs(query(presetsRef, where('visibility', '==', 'public'), limit(100)))
      ];

      if (userUid) {
        queries.push(getDocs(query(presetsRef, where('ownerId', '==', userUid), limit(100))));
        queries.push(getDocs(query(presetsRef, where('targetUserId', '==', userUid), limit(100))));
      }

      if (isSamambaiaGroup) {
        // Récupération systématique des presets Samambaia (mestre_group)
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
      
      settled.forEach(res => {
        if (res.status === 'fulfilled') {
          res.value.forEach(docSnap => {
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
    console.warn("fetchCloudPresets - Avertissement requête globale :", err);
  }
  
  return presets;
}
