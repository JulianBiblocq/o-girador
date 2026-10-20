import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { saveVocalRecording } from '../../db';
import { useAudioStore } from '../../stores/useAudioStore';
import { base64ToBlob } from './audioVocalBase64';

export async function restorePresetVocalRecordings(loadedTracks: TrackGroup[]): Promise<void> {
  const promises: Promise<void>[] = [];

  loadedTracks.forEach(t => {
    const inst = instrumentsConfig[t.instrumentIdx];
    const isVocalTrack = Boolean(
      inst?.type === 'voice' ||
      inst?.id === 'toada' ||
      inst?.id === 'puxador' ||
      inst?.id === 'coro' ||
      t.instrumentIdx >= 10 ||
      (t.patterns && t.patterns.some((p: any) => p && (p.vocalClip || p.vocalAudioData || p.vocalAudioUrl || p.vocalMode === 'micro' || p.vocalMode === 'audio' || p.vocalMode === 'recorded')))
    );
    if (!isVocalTrack) return;

    t.patterns?.forEach(ptn => {
      const patternId = ptn.id;
      const clipId = ptn.vocalClip?.id;

      if (ptn.vocalAudioData) {
        const b64 = ptn.vocalAudioData;
        delete ptn.vocalAudioData;
        promises.push(
          (async () => {
            try {
              const blob = base64ToBlob(b64);
              await saveVocalRecording(patternId, blob);
              if (clipId && String(clipId) !== String(patternId)) {
                await saveVocalRecording(clipId, blob);
              }
            } catch (err) {
              console.error(`Failed to save vocal recording for pattern ${patternId}:`, err);
            }
          })()
        );
      } else if (ptn.vocalAudioUrl) {
        const url = ptn.vocalAudioUrl;
        promises.push(
          (async () => {
            try {
              const fetchUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
              const response = await fetch(fetchUrl);
              if (!response.ok) throw new Error(`HTTP error ${response.status}`);
              const blob = await response.blob();
              await saveVocalRecording(patternId, blob);
              useAudioStore.getState().addVocalBlob(patternId, blob);
              useAudioStore.getState().addVocalBlob(String(patternId), blob);
              if (clipId && String(clipId) !== String(patternId)) {
                await saveVocalRecording(clipId, blob);
                useAudioStore.getState().addVocalBlob(clipId, blob);
                useAudioStore.getState().addVocalBlob(String(clipId), blob);
              }
            } catch (err) {
              console.error(`Failed to download and save vocal recording from ${url}:`, err);
            }
          })()
        );
      }
    });
  });

  if (promises.length > 0) {
    try {
      await Promise.all(promises);
    } catch (err) {
      console.error("Error restoring vocal recordings from preset:", err);
    }
  }
}
