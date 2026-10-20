/**
 * O Girador - Vocal Audio Buffer Rehydration Orchestrator
 */

import * as Tone from 'tone';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getAllVocalRecordings } from '../../db';
import { VocalIdbScanner } from './vocalIdbScanner';
import { VocalRemoteScanner } from './vocalRemoteScanner';

let rehydratingPromise: Promise<void> | null = null;

function flattenTracks(trackList: any[]): any[] {
  const result: any[] = [];
  const visitedIds = new Set<string | number>();
  const collect = (list: any[]) => {
    if (!Array.isArray(list)) return;
    for (const t of list) {
      if (!t) continue;
      if (!visitedIds.has(t.id)) {
        visitedIds.add(t.id);
        result.push(t);
      }
      if (t.subTracks && Array.isArray(t.subTracks)) collect(t.subTracks);
      if (t.tracks && Array.isArray(t.tracks)) collect(t.tracks);
    }
  };
  collect(trackList);
  return result;
}

export class VocalRehydration {
  public static getRehydratingPromise(): Promise<void> | null {
    return rehydratingPromise;
  }

  public static async rehydrateVocalBuffers(tracksToScan?: any[]): Promise<void> {
    if (rehydratingPromise) {
      try { await rehydratingPromise; } catch (_) {}
    }

    let currentPromise: Promise<void> | null = null;
    currentPromise = (async () => {
      try {
        const records = await getAllVocalRecordings();
        let rawCtx: AudioContext | null = null;
        try { rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext; } catch (_) {}
        if (!rawCtx || typeof rawCtx.decodeAudioData !== 'function') {
          const AudioCtxClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
          if (AudioCtxClass) rawCtx = new AudioCtxClass();
        }
        if (!rawCtx) return;

        const rawTracks = tracksToScan && tracksToScan.length > 0 ? tracksToScan : useSequencerStore.getState().tracks;
        const allTracks = flattenTracks(rawTracks || []);
        const entriesToBatch: Array<{ key: string | number; buffer: AudioBuffer; blob?: Blob }> = [];

        if (records.length > 0) {
          await VocalIdbScanner.scanRecords(records, allTracks, rawCtx, entriesToBatch);
        }
        await VocalRemoteScanner.scanVocalTracks(allTracks, rawCtx, entriesToBatch);

        if (entriesToBatch.length > 0) {
          useAudioStore.getState().setVocalBuffersBatch(entriesToBatch);
        }
      } catch (err) {
        console.error('🎙️ [VOCAL REHYDRATE] Global error during rehydration:', err);
      } finally {
        if (rehydratingPromise === currentPromise) rehydratingPromise = null;
      }
    })();

    rehydratingPromise = currentPromise;
    return currentPromise;
  }
}
