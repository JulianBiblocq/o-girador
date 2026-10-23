/**
 * O Girador - Vocal Remote / Embedded Patterns Rehydration Scanner
 */

import { useAudioStore } from '../../stores/useAudioStore';
import { getVocalRecording, saveVocalRecording } from '../../db';
import { base64ToBlob } from './vocalRecordingService';
import { instrumentsConfig } from '../../data';

export class VocalRemoteScanner {
  public static async scanVocalTracks(
    allTracks: any[],
    rawCtx: AudioContext,
    entriesToBatch: Array<{ key: string | number; buffer: AudioBuffer; blob?: Blob }>
  ): Promise<void> {
    const isVocalTrack = (t: any): boolean => {
      const inst = instrumentsConfig[t.instrumentIdx];
      const instId = inst?.id || (typeof t.instrumentId === 'string' ? t.instrumentId : '');
      const instType = inst?.type || (typeof t.instrumentType === 'string' ? t.instrumentType : '');
      const hasVocalInstrument = Boolean(
        instType === 'voice' || instId === 'toada' || instId === 'puxador' || instId === 'coro' || instId === 'voice'
      );
      const hasVocalPatterns = Array.isArray(t.patterns) && t.patterns.some((p: any) =>
        p && (p.vocalMode === 'micro' || Boolean(p.vocalClip) || Boolean(p.vocalAudioData) || Boolean(p.vocalAudioUrl))
      );
      return hasVocalInstrument || hasVocalPatterns;
    };

    const vocalTracks = allTracks.filter(isVocalTrack);

    for (const track of vocalTracks) {
      if (!track.patterns || track.patterns.length === 0) continue;

      for (const pattern of track.patterns) {
        const patternId = Number(pattern.id);
        const compositeKey = `${track.id}_${patternId}`;
        const currentBuffers = useAudioStore.getState().vocalBuffers;

        if (currentBuffers[compositeKey] && currentBuffers[patternId]) continue;

        try {
          let blob: Blob | null = await getVocalRecording(patternId);
          if (!blob && pattern.id !== patternId) blob = await getVocalRecording(pattern.id);

          if (!blob && pattern.vocalAudioData) {
            try {
              blob = base64ToBlob(pattern.vocalAudioData);
              await saveVocalRecording(patternId, blob);
            } catch (_) {}
          } else if (!blob && pattern.vocalAudioUrl) {
            try {
              const res = await fetch(pattern.vocalAudioUrl);
              if (res.ok) {
                blob = await res.blob();
                await saveVocalRecording(patternId, blob);
              }
            } catch (_) {}
          }

          if (!blob) continue;

          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);

          useAudioStore.getState().setVocalBuffer(patternId, audioBuffer);
          useAudioStore.getState().setVocalBuffer(compositeKey, audioBuffer);
          entriesToBatch.push(
            { key: patternId, buffer: audioBuffer, blob },
            { key: compositeKey, buffer: audioBuffer, blob }
          );
        } catch (err) {
          console.error(`[VOCAL REHYDRATE] Erreur rehydration motif ${patternId}:`, err);
        }
      }
    }
  }
}
