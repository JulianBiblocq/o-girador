
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/config';
import { getVocalRecording } from '../../db';
import { Preset } from '../../types';
import { useAudioStore } from '../../stores/useAudioStore';

export async function uploadPendingVocalRecordings(preset: Preset): Promise<Map<string | number, string>> {
  const updatedMap = new Map<string | number, string>();
  for (const track of preset.tracks || []) {
    for (const pattern of track.patterns || []) {
      try {
        const storeBlobs = useAudioStore.getState().vocalBlobs;
        const blob = (await getVocalRecording(pattern.id)) ||
          (pattern.vocalClip?.id ? await getVocalRecording(pattern.vocalClip.id) : null) ||
          storeBlobs[pattern.id] ||
          storeBlobs[String(pattern.id)] ||
          (pattern.vocalClip?.id ? storeBlobs[pattern.vocalClip.id] || storeBlobs[String(pattern.vocalClip.id)] : null);

        const needsUpload = Boolean(
          blob && (!pattern.vocalAudioUrl || !pattern.vocalAudioUrl.startsWith('https://firebasestorage.googleapis.com/'))
        );

        if (needsUpload && blob) {
          const timestamp = Date.now();
          const storageRef = ref(storage, `vocalRecordings/${pattern.id}_${timestamp}.wav`);
          await uploadBytes(storageRef, blob, { contentType: 'audio/wav' });
          const downloadUrl = await getDownloadURL(storageRef);
          pattern.vocalAudioUrl = downloadUrl;
          updatedMap.set(pattern.id, downloadUrl);
          if (pattern.vocalClip?.id) updatedMap.set(pattern.vocalClip.id, downloadUrl);
        }
      } catch (e) {
        console.error(`savePresetToCloud - Échec upload vocal pour motif ${pattern.id}:`, e);
      }
    }
  }
  return updatedMap;
}
