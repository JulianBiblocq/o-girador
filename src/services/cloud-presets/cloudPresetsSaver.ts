import { auth, db } from '../../firebase/config';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { Preset, CatalogVisibility } from '../../types';
import LZString from 'lz-string';
import { CLOUD_PRESETS_COLLECTION, presetCache } from './presetCache';
import { isTestEnvironment } from './sanctuarization';
import { resolveDefensiveTargetPresetId } from './defensiveTargetGuard';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { uploadPendingVocalRecordings } from './vocalRecordingsUploader';
import { findExistingPresetId } from './existingPresetMatcher';
import { setActiveCloudPresetId } from '../../utils/cloudPresetState';
import { VOCAL_GRAMMAR_VERSION } from '../../utils/vocalGrammarV2';
import { resolvePresetAlfaiaEquipment } from '../../utils/alfaiaEquipmentResolver';
import { sanitizeVocalTransposeSteps } from '../../contexts/audio/presetSerializationHelpers';
import { markAutosaveBaselineClean } from '../../hooks/app-audio/autosavePayloadBuilder';
import { isMestreOrAdminProfile, OFFICIAL_MESTRE_UID } from '../../utils/presetPermissions';
import { isLegacySamambaiaGroup } from '../../utils/tenantGroupHelpers';

export interface SavePresetCloudOptions { isShowcase?: boolean; keepInGroup?: boolean; skipVocalUpload?: boolean; }

export async function savePresetToCloud(
  name: string, presetData: Preset, ownerId: string, visibility: CatalogVisibility,
  targetUserId?: string, audioUrl?: string | null, targetPresetId?: string, mestreId?: string,
  groupId?: string, canWriteSequenciador?: boolean, isDraft?: boolean, userRole?: string, options?: SavePresetCloudOptions
): Promise<string> {
  const isRestoration = typeof window !== 'undefined' && (window as any).__ALLOW_SANCTUARIZED_RESTORE__ === true;
  const isPlaywrightTest = isTestEnvironment();
  const currentAuthUid = auth.currentUser?.uid || ownerId;
  const isMestre = isMestreOrAdminProfile({ uid: currentAuthUid, role: userRole });
  const { resolvedTargetId, wasForeignTargetReset } = await resolveDefensiveTargetPresetId(
    targetPresetId, currentAuthUid, userRole, isRestoration, isPlaywrightTest
  );
  const effectiveOwnerId = (!isMestre && currentAuthUid) ? currentAuthUid : (ownerId || currentAuthUid || '');

  const presetToSave = JSON.parse(JSON.stringify(presetData));
  const alfaiaEquipment = resolvePresetAlfaiaEquipment(presetToSave) ?? null;
  if (wasForeignTargetReset && presetToSave.metadata) delete presetToSave.metadata.morceauId;
  const safeTranspose = sanitizeVocalTransposeSteps(
    presetToSave.vocalTransposeSteps ?? presetToSave.metadata?.vocalTransposeSteps ?? presetToSave.metadata?.transpositionSemitones, 0
  );
  presetToSave.vocalTransposeSteps = safeTranspose;
  presetToSave.metadata = {
    ...(presetToSave.metadata || {}), vocalGrammarVersion: VOCAL_GRAMMAR_VERSION, alfaiaEquipment,
    vocalTransposeSteps: safeTranspose, transpositionSemitones: safeTranspose,
  };
  markAutosaveBaselineClean();
  const updatedMap = options?.skipVocalUpload ? new Map() : await uploadPendingVocalRecordings(presetToSave);

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
  const isShowcase = options?.isShowcase === true;
  const rawGroup = groupId ? groupId.trim() : '';
  const isPrivatePersonal = visibility === 'private' && !isShowcase;
  const detachGroupForShowcase = isShowcase && !options?.keepInGroup;

  let effectiveGroupId = '';
  let effectiveMestreId: string | null = null;
  if (!isPrivatePersonal && !detachGroupForShowcase) {
    if (isLegacySamambaiaGroup(rawGroup)) {
      effectiveGroupId = 'samambaia';
      effectiveMestreId = mestreId || OFFICIAL_MESTRE_UID;
    } else if (rawGroup) {
      effectiveGroupId = rawGroup.toLowerCase();
      effectiveMestreId = mestreId || null;
    } else if (mestreId) {
      effectiveMestreId = mestreId;
    }
  }

  const defaultVis = effectiveGroupId && (isMestre || canWriteSequenciador) ? 'mestre_group' : 'private';
  const effectiveVisibility = isShowcase ? 'admin_global' : (visibility || defaultVis);
  const docData: any = {
    name: name || 'Preset Sans Nom',
    data: dataString,
    ownerId: effectiveOwnerId,
    visibility: effectiveVisibility,
    targetUserId: targetUserId || null,
    mestreId: effectiveMestreId,
    groupId: effectiveGroupId || null,
    alfaiaEquipment,
    updatedAt: Date.now(),
  };
  if (audioUrl !== undefined) docData.audioUrl = audioUrl;
  if (isShowcase) {
    docData.isShowcase = true;
    docData.isDraft = false;
  } else {
    if (options?.isShowcase === false) docData.isShowcase = false;
    if (isDraft !== undefined) docData.isDraft = isDraft;
  }

  const finalPresetId = wasForeignTargetReset
    ? null
    : (resolvedTargetId || (effectiveOwnerId ? await findExistingPresetId(name, effectiveOwnerId, effectiveGroupId) : null));

  if (finalPresetId) {
    await setDoc(doc(db, CLOUD_PRESETS_COLLECTION, finalPresetId), docData, { merge: true });
    presetCache.set(finalPresetId, presetToSave);
    setActiveCloudPresetId(finalPresetId);
    return finalPresetId;
  }

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
