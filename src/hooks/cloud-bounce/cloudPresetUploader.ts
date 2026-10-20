import * as Tone from 'tone';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../../firebase/config';
import { telemetryService } from '../../services/telemetryService';
import { normalizeAudioBuffer, audioBufferToWav } from '../../utils/audioBufferUtils';
import { PresetTimingCalculation } from './cloudPresetTimingCalculator';

export async function normalizeAndUploadPresetAudio(
  audioBlob: Blob,
  presetId: string,
  timing: PresetTimingCalculation,
  presetData: any,
  baseBpm: number,
  onProgress: (pct: number) => void
): Promise<string | null> {
  let finalAudioBlob: Blob = audioBlob;
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
    if (rawCtx && typeof rawCtx.decodeAudioData === 'function') {
      const decoded = await rawCtx.decodeAudioData(arrayBuffer.slice(0));
      normalizeAudioBuffer(decoded, -0.5);
      finalAudioBlob = audioBufferToWav(decoded);
    }
  } catch (normErr) {
    console.warn("[Cloud Bounce] Normalisation non bloquante ignorée sur erreur :", normErr);
  }

  let audioUrl: string | null = null;
  try {
    const isWav = finalAudioBlob.type.includes('wav');
    const ext = isWav ? 'wav' : 'webm';
    const storageRef = ref(storage, `bounces/presets/${presetId}.${ext}`);
    const blobType = finalAudioBlob.type || (isWav ? 'audio/wav' : 'audio/webm;codecs=opus');
    const uploadTask = uploadBytesResumable(storageRef, finalAudioBlob, { contentType: blobType });

    uploadTask.on('state_changed', (snapshot) => {
      if (snapshot.totalBytes > 0) {
        const uploadPct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 8);
        onProgress(Math.min(96, 88 + uploadPct));
      }
    });

    await uploadTask;
    audioUrl = await getDownloadURL(storageRef);
  } catch (uploadErr: any) {
    telemetryService.logError(uploadErr, 'useCloudAudioBounce_Preset_StorageUpload');
    audioUrl = null;
  }

  try {
    const documentRef = doc(db, 'presets', presetId);
    await setDoc(documentRef, { audioUrl, updatedAt: serverTimestamp() }, { merge: true });
  } catch (docErr) {
    console.warn("[Cloud Bounce] Échec mise à jour document Firestore presets :", docErr);
  }

  const cleanPresetId = (presetId || '').trim();
  if (audioUrl && cleanPresetId && cleanPresetId !== 'undefined') {
    try {
      const documentId = `${timing.safeTenantId}_${cleanPresetId}`;
      const audioMasterRef = doc(db, 'audio_masters', documentId);
      const titre = presetData.metadata?.toada || presetData.name || 'Morceau sans titre';
      const bpmPrincipal = timing.measureBpmsAbsolus.length > 0 ? timing.measureBpmsAbsolus[0] : (presetData.bpm || baseBpm || 120);

      const payloadDanse: any = {
        id: presetId,
        tenantId: timing.safeTenantId,
        nom: titre,
        titre: titre,
        audioUrl,
        bpm: bpmPrincipal,
        totalMesures: timing.expandedMeasures.length,
        sinaisDoMestre: timing.sinaisDoMestreAbsolus,
        expandedMeasures: timing.expandedMeasuresData,
        measureBpms: timing.measureBpmsAbsolus,
        measureBpmTransitions: timing.measureBpmTransitionsAbsolus,
        measureTimeSigs: timing.measureTimeSigsAbsolus,
        toada: presetData.metadata?.toada || null,
        nacao: presetData.metadata?.nacao || null,
        compositor: presetData.metadata?.compositor || null,
        ritmo: presetData.metadata?.ritmo || null,
        videoUrl: presetData.metadata?.youtubeUrl || presetData.metadata?.link || null,
        timeSig: presetData.timeSig || '4/4',
        mestreId: presetData.metadata?.mestreId || null,
        updatedAt: serverTimestamp()
      };
      const cleanPayload = Object.fromEntries(Object.entries(payloadDanse).filter(([_, v]) => v !== undefined));
      await setDoc(audioMasterRef, cleanPayload, { merge: true });
    } catch (dancaErr) {
      console.warn("[Cloud Bounce] Échec mise à jour audio_masters :", dancaErr);
    }
  }

  return audioUrl;
}
