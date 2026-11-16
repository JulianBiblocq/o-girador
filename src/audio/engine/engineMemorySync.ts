/**
 * O Girador - Synchronisation Mémoire 2 Passes par Instrument Actif (< 115 lignes)
 * - Passe 1 (immédiate, lots de 3 Safari/iOS) : frappes écrites dans les patterns des pistes présentes.
 * - Passe 2 (tâche de fond, lots de 3) : 100 % des autres articulations des seuls instruments présents (`0 MiB` absent).
 * - Zéro éviction par frappe sur un instrument présent ; éviction complète (`bufferPool` + Worklet) si l'instrument disparaît.
 */

import type * as ToneType from 'tone';
import { InstrumentAudioConfig } from '../../data/audioConfig';
import { buildTwoPassSamplePlan } from './activeTrackPreloadExtractor';
import { ActiveInstrumentData } from './engineTypes';

const BATCH_SIZE = 3;
const poolEvictionListeners = new WeakMap<Map<string, unknown>, Set<(paths: string[]) => void>>();

export function bindBufferPoolEviction(
  bufferPool: Map<string, unknown>,
  onEvict: (paths: string[]) => void
): () => void {
  let set = poolEvictionListeners.get(bufferPool);
  if (!set) {
    set = new Set();
    poolEvictionListeners.set(bufferPool, set);
  }
  set.add(onEvict);
  return () => set?.delete(onEvict);
}

async function loadBatchesOfThree(
  audioContext: AudioContext,
  paths: string[],
  bufferPool: Map<string, ToneType.ToneAudioBuffer>,
  loadPath: (ctx: AudioContext, path: string) => Promise<void>,
  shouldContinue?: () => boolean
): Promise<void> {
  const missing = paths.filter((p) => !bufferPool.has(p));
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    if (shouldContinue && !shouldContinue()) return;
    const batch = missing.slice(i, i + BATCH_SIZE).filter((p) => !bufferPool.has(p));
    if (batch.length > 0) {
      await Promise.all(batch.map((p) => loadPath(audioContext, p)));
    }
  }
}

export class EngineMemorySync {
  private static syncGeneration = 0;
  private static activePass2Promise: Promise<void> = Promise.resolve();

  public static waitForBackgroundPass2(): Promise<void> {
    return this.activePass2Promise;
  }

  public static async syncActiveInstrumentsMemory(
    audioContext: AudioContext,
    configMap: Map<string, InstrumentAudioConfig>,
    bufferPool: Map<string, ToneType.ToneAudioBuffer>,
    loadPath: (audioContext: AudioContext, path: string) => Promise<void>,
    activeInstruments: ActiveInstrumentData[],
    onEvictPaths?: (paths: string[]) => void
  ): Promise<void> {
    const generation = ++this.syncGeneration;
    const { pass1Paths, pass2Paths, retainedPaths } = buildTwoPassSamplePlan(configMap, activeInstruments);

    const evictedPaths: string[] = [];
    for (const [path, buffer] of bufferPool.entries()) {
      if (!retainedPaths.has(path)) {
        try { buffer.dispose(); } catch (_) {}
        evictedPaths.push(path);
      }
    }
    for (const key of evictedPaths) {
      bufferPool.delete(key);
    }

    if (evictedPaths.length > 0) {
      onEvictPaths?.(evictedPaths);
      const listeners = poolEvictionListeners.get(bufferPool as unknown as Map<string, unknown>);
      if (listeners) {
        for (const fn of listeners) fn(evictedPaths);
      }
    }

    const isCurrentGen = () => generation === this.syncGeneration;

    // Passe 1 immédiate : frappes écrites dans les pistes actives
    await loadBatchesOfThree(audioContext, pass1Paths, bufferPool, loadPath, isCurrentGen);
    if (!isCurrentGen() || pass2Paths.length === 0) return;

    // Passe 2 transparente en tâche de fond : reste des articulations des instruments présents
    this.activePass2Promise = loadBatchesOfThree(
      audioContext, pass2Paths, bufferPool, loadPath, isCurrentGen
    ).catch(() => {});
  }
}
