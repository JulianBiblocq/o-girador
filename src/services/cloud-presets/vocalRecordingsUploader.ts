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
        const canonicalKey = `${track.id}_${pattern.id}`;
        const clipId = pattern.vocalClip?.id;
        const storeBlobs = useAudioStore.getState().vocalBlobs;
        const blob =
          (await getVocalRecording(canonicalKey, { trackId: track.id, patternId: pattern.id, vocalClipId: clipId })) ||
          storeBlobs[canonicalKey] ||
          storeBlobs[pattern.id] ||
          storeBlobs[String(pattern.id)] ||
          (clipId !== undefined ? storeBlobs[`${track.id}_${clipId}`] || storeBlobs[clipId] || storeBlobs[String(clipId)] : null);

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
          if (clipId !== undefined) updatedMap.set(clipId, downloadUrl);
        }
      } catch (e) {
        console.error(`savePresetToCloud - Échec upload vocal pour motif ${pattern.id}:`, e);
      }
    }
  }
  return updatedMap;
}
