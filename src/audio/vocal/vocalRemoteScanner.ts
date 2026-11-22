/**
 * O Girador - Vocal Remote / Embedded Patterns Rehydration Scanner (< 80 lignes)
 * - Résolution des motifs vocaux distants (`vocalAudioData` / `vocalAudioUrl`) non encore présents en RAM/IDB.
 * - Décodage isolé `try/catch` sur `arrayBuffer.slice(0)` et injection différée vers `setVocalBuffersBatch`.
 */

import { useAudioStore } from '../../stores/useAudioStore';
import { saveVocalRecording } from '../../db';
import { base64ToBlob } from './vocalRecordingService';
import { collectEligibleVocalTargets, EligibleVocalTarget } from './vocalKeyCascadeResolver';
import type { BatchedVocalEntry } from './vocalIdbScanner';

export class VocalRemoteScanner {
  public static async scanVocalTracks(
    allTracks: any[],
    rawCtx: AudioContext,
    entriesToBatch: BatchedVocalEntry[],
    precomputedTargets?: EligibleVocalTarget[]
  ): Promise<void> {
    const targets = precomputedTargets ?? collectEligibleVocalTargets(allTracks);
    if (targets.length === 0) return;

    const currentBuffers = useAudioStore.getState().vocalBuffers;
    const queuedKeys = new Set<string | number>(entriesToBatch.map((e) => e.key));

    const patternIdCounts = new Map<string, number>();
    for (const { pattern } of targets) {
      const k = String(pattern.id);
      patternIdCounts.set(k, (patternIdCounts.get(k) || 0) + 1);
    }

    for (const { pattern, canonicalKey } of targets) {
      if (currentBuffers[canonicalKey] || queuedKeys.has(canonicalKey)) continue;
      if (!pattern.vocalAudioData && !pattern.vocalAudioUrl) continue;

      try {
        let blob: Blob | null = null;
        if (pattern.vocalAudioData) {
          blob = base64ToBlob(pattern.vocalAudioData);
          await saveVocalRecording(canonicalKey, blob);
        } else if (pattern.vocalAudioUrl) {
          const res = await fetch(pattern.vocalAudioUrl);
          if (res.ok) {
            blob = await res.blob();
            await saveVocalRecording(canonicalKey, blob);
          }
        }
        if (!blob) continue;

        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer.slice(0));
        const isUniquePatId = patternIdCounts.get(String(pattern.id)) === 1;

        queuedKeys.add(canonicalKey);
        entriesToBatch.push({
          key: canonicalKey,
          buffer: audioBuffer,
          blob,
          legacyAliasKey: isUniquePatId ? pattern.id : undefined,
        });
      } catch (err) {
        console.error(`[VOCAL REHYDRATE] Erreur rehydration distante motif ${canonicalKey}:`, err);
      }
    }
  }
}
