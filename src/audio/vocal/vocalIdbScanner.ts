/**
 * O Girador - Vocal IndexedDB Records Rehydration Scanner (< 95 lignes)
 * - Résolution stricte par motif éligible : `${track.id}_${pattern.id}` -> `Number(id)` -> `String(id)` -> `vocalClip.id`.
 * - Décodage isolé `try/catch` sur `arrayBuffer.slice(0)` et zéro mutation Zustand intermédiaire (batch atomique).
 */

import { useAudioStore } from '../../stores/useAudioStore';
import {
  buildVocalRecordingCandidateKeys,
  collectEligibleVocalTargets,
  EligibleVocalTarget,
} from './vocalKeyCascadeResolver';

export interface BatchedVocalEntry {
  key: string | number;
  buffer: AudioBuffer;
  blob?: Blob;
  legacyAliasKey?: string | number;
}

export class VocalIdbScanner {
  public static async scanRecords(
    records: Array<{ patternId: number | string; audioBlob: Blob }>,
    allTracks: any[],
    rawCtx: AudioContext,
    entriesToBatch: BatchedVocalEntry[],
    precomputedTargets?: EligibleVocalTarget[]
  ): Promise<void> {
    const targets = precomputedTargets ?? collectEligibleVocalTargets(allTracks);
    if (targets.length === 0) return;

    const idbByExactKey = new Map<number | string, Blob>();
    for (const rec of records) {
      if (!rec || rec.patternId === undefined || rec.patternId === null || !rec.audioBlob) continue;
      idbByExactKey.set(rec.patternId, rec.audioBlob);
      const trimmed = String(rec.patternId).trim();
      if (trimmed && !idbByExactKey.has(trimmed)) idbByExactKey.set(trimmed, rec.audioBlob);
      if (trimmed && !trimmed.includes('_')) {
        const num = Number(trimmed);
        if (Number.isFinite(num) && !idbByExactKey.has(num)) idbByExactKey.set(num, rec.audioBlob);
      }
    }

    const patternIdCounts = new Map<string, number>();
    for (const { pattern } of targets) {
      const k = String(pattern.id);
      patternIdCounts.set(k, (patternIdCounts.get(k) || 0) + 1);
    }

    const storeState = useAudioStore.getState();
    const currentBuffers = storeState.vocalBuffers;
    const currentBlobs = storeState.vocalBlobs;

    for (const { track, pattern, canonicalKey } of targets) {
      if (currentBuffers[canonicalKey]) continue;

      try {
        const candidates = buildVocalRecordingCandidateKeys(canonicalKey, {
          trackId: track.id,
          patternId: pattern.id,
          vocalClipId: pattern.vocalClip?.id,
        });

        let matchedBlob: Blob | undefined;
        for (const candidate of candidates) {
          matchedBlob = idbByExactKey.get(candidate) ?? currentBlobs[candidate];
          if (matchedBlob) break;
        }
        if (!matchedBlob) continue;

        const arrayBuffer = await matchedBlob.arrayBuffer();
        const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer.slice(0));
        const isUniquePatId = patternIdCounts.get(String(pattern.id)) === 1;

        entriesToBatch.push({
          key: canonicalKey,
          buffer: audioBuffer,
          blob: matchedBlob,
          legacyAliasKey: isUniquePatId ? pattern.id : undefined,
        });
      } catch (err) {
        console.error(`[VOCAL REHYDRATE] Erreur décodage IDB motif ${canonicalKey}:`, err);
      }
    }
  }
}
