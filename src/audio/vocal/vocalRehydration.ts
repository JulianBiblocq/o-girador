/**
 * O Girador - Vocal Audio Buffer Rehydration Orchestrator (< 125 lignes)
 * - Verrou singleton strict `rehydratingPromise` (zéro tempête IndexedDB ni double decodeAudioData sous appels concurrents).
 * - Court-circuit immédiat en RAM si tous les motifs vocaux actifs possèdent déjà leur `AudioBuffer`.
 * - Injection atomique unique `setVocalBuffersBatch` (zéro re-render intermédiaire).
 */

import * as Tone from 'tone';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getAllVocalRecordings } from '../../db';
import { BatchedVocalEntry, VocalIdbScanner } from './vocalIdbScanner';
import { VocalRemoteScanner } from './vocalRemoteScanner';
import {
  collectEligibleVocalTargets,
  computeVocalTargetsSignature,
  EligibleVocalTarget,
} from './vocalKeyCascadeResolver';
import { prewarmProjectVocalDspBuffers } from '../vocalDsp/vocalDspPrewarmer';

let rehydratingPromise: Promise<void> | null = null;
let rehydratingSignature: string | null = null;
let testDecodeContextOverride: AudioContext | null = null;

export function setVocalDecodeContextForTests(ctx: AudioContext | null): void {
  testDecodeContextOverride = ctx;
}

export function resolveResilientDecodeContext(): AudioContext | null {
  if (testDecodeContextOverride) return testDecodeContextOverride;
  try {
    const raw = (Tone.getContext?.()?.rawContext || (Tone as any).context?.rawContext || Tone.context) as any;
    if (raw && typeof raw.decodeAudioData === 'function') return raw as AudioContext;
    if (raw?._nativeAudioContext && typeof raw._nativeAudioContext.decodeAudioData === 'function') {
      return raw._nativeAudioContext as AudioContext;
    }
  } catch (_) {}
  try {
    const g = globalThis as any;
    if (typeof g.OfflineAudioContext === 'function') {
      return new g.OfflineAudioContext(1, 1, 44100) as AudioContext;
    }
  } catch (_) {}
  return null;
}

function getMissingTargets(targets: EligibleVocalTarget[]): EligibleVocalTarget[] {
  const currentBuffers = useAudioStore.getState().vocalBuffers;
  return targets.filter(({ pattern, canonicalKey }) => !currentBuffers[canonicalKey] || Boolean(pattern.vocalAudioData));
}

export class VocalRehydration {
  public static getRehydratingPromise(): Promise<void> | null {
    return rehydratingPromise;
  }

  public static needsRehydration(tracksToScan?: any[]): boolean {
    const rawTracks = tracksToScan && tracksToScan.length > 0 ? tracksToScan : useSequencerStore.getState().tracks;
    const targets = collectEligibleVocalTargets(rawTracks || []);
    return getMissingTargets(targets).length > 0;
  }

  public static async rehydrateVocalBuffers(tracksToScan?: any[]): Promise<void> {
    const resolveTracks = () =>
      tracksToScan && tracksToScan.length > 0 ? tracksToScan : useSequencerStore.getState().tracks;

    let targets = collectEligibleVocalTargets(resolveTracks() || []);
    let targetSig = computeVocalTargetsSignature(targets);

    if (rehydratingPromise) {
      if (rehydratingSignature === targetSig && targetSig.length > 0) {
        return rehydratingPromise;
      }
      try { await rehydratingPromise; } catch (_) {}
      targets = collectEligibleVocalTargets(resolveTracks() || []);
      targetSig = computeVocalTargetsSignature(targets);
    }

    if (targets.length === 0 || getMissingTargets(targets).length === 0) {
      return;
    }

    const rawCtx = resolveResilientDecodeContext();
    if (!rawCtx || typeof rawCtx.decodeAudioData !== 'function') return;

    let currentPromise: Promise<void> | null = null;
    rehydratingSignature = targetSig;
    currentPromise = (async () => {
      try {
        const activeTracks = resolveTracks() || [];
        const entriesToBatch: BatchedVocalEntry[] = [];
        const records = await getAllVocalRecordings();

        if (records.length > 0 || Object.keys(useAudioStore.getState().vocalBlobs).length > 0) {
          await VocalIdbScanner.scanRecords(records, activeTracks, rawCtx, entriesToBatch, targets);
        }
        await VocalRemoteScanner.scanVocalTracks(activeTracks, rawCtx, entriesToBatch, targets);

        if (entriesToBatch.length > 0) {
          useAudioStore.getState().setVocalBuffersBatch(entriesToBatch);
          prewarmProjectVocalDspBuffers(undefined, undefined, true);
        }
      } catch (err) {
        console.error('[VOCAL REHYDRATE] Global error during rehydration:', err);
      } finally {
        if (rehydratingPromise === currentPromise) {
          rehydratingPromise = null;
          rehydratingSignature = null;
        }
      }
    })();

    rehydratingPromise = currentPromise;
    return currentPromise;
  }
}
