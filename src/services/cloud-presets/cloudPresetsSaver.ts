
import { auth, db } from '../../firebase/config';
import { collection, addDoc, getDoc, doc, setDoc } from 'firebase/firestore';
import { Preset, CatalogVisibility } from '../../types';
import LZString from 'lz-string';
import { CLOUD_PRESETS_COLLECTION, presetCache } from './presetCache';
import { SANCTUARIZED_PRESET_IDS, isTestEnvironment } from './sanctuarization';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { uploadPendingVocalRecordings } from './vocalRecordingsUploader';
import { findExistingPresetId } from './existingPresetMatcher';
import { setActiveCloudPresetId } from '../../utils/cloudPresetState';

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
    (window as any).__PLAYWRIGHT_TEST__ || (window as any).__PLAYWRIGHT__ || (window as any).__TEST_ENV__
  );

  const currentAuthUid = auth.currentUser?.uid || ownerId;
  const isMestre = (
    userRole === 'mestre' || userRole === 'admin' || userRole === 'super-admin' ||
    canWriteSequenciador === true || currentAuthUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    Boolean(mestreId && currentAuthUid === mestreId)
  );

  if (targetPresetId && SANCTUARIZED_PRESET_IDS.has(targetPresetId)) {
    if (isPlaywrightTest && !isRestoration) {
      throw new Error(`[Sanctuarisation E2E] Écrasement formellement interdit du preset officiel sanctuarisé "${targetPresetId}" en test.`);
    }
    let isInitialOwner = currentAuthUid === ownerId;
    if (!isInitialOwner && !isMestre) {
      try {
        const snap = await getDoc(doc(db, CLOUD_PRESETS_COLLECTION, targetPresetId));
        if (snap.exists() && snap.data()?.ownerId === currentAuthUid) isInitialOwner = true;
      } catch (_) {}
    }
    if (!isMestre && !isInitialOwner && !isRestoration) {
      throw new Error(`[Sanctuarisation] Écrasement interdit du preset officiel sanctuarisé "${targetPresetId}".`);
    }
  }

  if (isPlaywrightTest && !isRestoration && targetPresetId && !targetPresetId.startsWith('test_e2e_')) {
    throw new Error(`[Sanctuarisation E2E] Écrasement interdit : targetPresetId doit être préfixé par "test_e2e_". Reçu: "${targetPresetId}".`);
  }

  const presetToSave = JSON.parse(JSON.stringify(presetData));
  const updatedMap = await uploadPendingVocalRecordings(presetToSave);

  if (updatedMap.size > 0) {
    try {
      const currentTracks = useSequencerStore.getState().tracks;
      useSequencerStore.getState().setTracks(
        currentTracks.map((t) => ({
          ...t,
          patterns: t.patterns.map((p) => {
            const newUrl = updatedMap.get(p.id) || (p.vocalClip?.id ? updatedMap.get(p.vocalClip.id) : undefined);
            return newUrl ? { ...p, vocalAudioUrl: newUrl } : p;
          }),
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
    effectiveGroupId = 'samambaia';
    effectiveMestreId = effectiveMestreId || 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
  } else if (effectiveGroupId) {
    effectiveGroupId = effectiveGroupId.toLowerCase();
  }

  const defaultVis = (isSamambaiaGroup || canWriteSequenciador) ? 'mestre_group' : 'private';
  const docData: any = {
    name: name || 'Preset Sans Nom',
    data: dataString,
    ownerId: ownerId || '',
    visibility: visibility || defaultVis,
    targetUserId: targetUserId || null,
    mestreId: effectiveMestreId,
    updatedAt: Date.now(),
  };
  if (effectiveGroupId) docData.groupId = effectiveGroupId;
  if (audioUrl !== undefined) docData.audioUrl = audioUrl;
  if (isDraft !== undefined) docData.isDraft = isDraft;

  const finalPresetId = targetPresetId || (ownerId ? await findExistingPresetId(name, ownerId, effectiveGroupId) : null);

  if (finalPresetId) {
    await setDoc(doc(db, CLOUD_PRESETS_COLLECTION, finalPresetId), docData, { merge: true });
    presetCache.set(finalPresetId, presetToSave);
    setActiveCloudPresetId(finalPresetId);
    return finalPresetId;
  } else {
    docData.createdAt = Date.now();
    if (isTestEnvironment()) {
      const testId = `test_e2e_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await setDoc(doc(db, CLOUD_PRESETS_COLLECTION, testId), docData);
      presetCache.set(testId, presetToSave);
      setActiveCloudPresetId(testId);
      return testId;
    }
    const docRef = await addDoc(collection(db, CLOUD_PRESETS_COLLECTION), docData);
    presetCache.set(docRef.id, presetToSave);
    setActiveCloudPresetId(docRef.id);
    return docRef.id;
  }
}
