/**
 * O Girador - Vocal Remote / Embedded Patterns Rehydration Scanner
 * Unification du cache vocal sous la clé canonique unique `${trackId}_${patternId}` (< 75 lignes).
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
        const canonicalKey = `${track.id}_${patternId}`;
        const currentBuffers = useAudioStore.getState().vocalBuffers;

        if (currentBuffers[canonicalKey]) continue;

        try {
          let blob: Blob | null = await getVocalRecording(canonicalKey);
          if (!blob) blob = await getVocalRecording(patternId);
          if (!blob && pattern.id !== patternId) blob = await getVocalRecording(pattern.id);

          if (!blob && pattern.vocalAudioData) {
            try {
              blob = base64ToBlob(pattern.vocalAudioData);
              await saveVocalRecording(canonicalKey, blob);
            } catch (_) {}
          } else if (!blob && pattern.vocalAudioUrl) {
            try {
              const res = await fetch(pattern.vocalAudioUrl);
              if (res.ok) {
                blob = await res.blob();
                await saveVocalRecording(canonicalKey, blob);
              }
            } catch (_) {}
          }

          if (!blob) continue;

          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);

          useAudioStore.getState().setVocalBuffer(canonicalKey, audioBuffer);
          entriesToBatch.push({ key: canonicalKey, buffer: audioBuffer, blob });
        } catch (err) {
          console.error(`[VOCAL REHYDRATE] Erreur rehydration motif ${canonicalKey}:`, err);
        }
      }
    }
  }
}
