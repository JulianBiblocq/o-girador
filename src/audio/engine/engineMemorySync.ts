/**
 * O Girador - Dynamic Memory Synchronization for Active Instruments
 */

import type * as ToneType from 'tone';
import { InstrumentAudioConfig } from '../../data/audioConfig';
import { ActiveInstrumentData } from './engineTypes';

export class EngineMemorySync {
  public static async syncActiveInstrumentsMemory(
    audioContext: AudioContext,
    configMap: Map<string, InstrumentAudioConfig>,
    bufferPool: Map<string, ToneType.ToneAudioBuffer>,
    loadPath: (audioContext: AudioContext, path: string) => Promise<void>,
    activeInstruments: ActiveInstrumentData[]
  ): Promise<void> {
    const requiredPaths = new Set<string>();

    for (const activeInst of activeInstruments) {
      const config = configMap.get(activeInst.id);
      if (config) {
        const activeStrokes = activeInst.activeStrokes;
        for (const stroke of config.strokes) {
          const isStrokeActive = activeStrokes.length === 0
            ? config.strokes[0] === stroke
            : activeStrokes.some(as =>
                stroke.caseSensitive === false
                  ? as.toUpperCase() === stroke.symbol.toUpperCase()
                  : as === stroke.symbol
              );

          if (isStrokeActive) {
            for (const file of stroke.files) requiredPaths.add(file);
          }
        }
      }
    }

    const keysToDelete: string[] = [];
    for (const [path, buffer] of bufferPool.entries()) {
      if (!requiredPaths.has(path)) {
        try {
          buffer.dispose();
        } catch (_) {}
        keysToDelete.push(path);
      }
    }
    keysToDelete.forEach(k => bufferPool.delete(k));

    const pathsToLoad = Array.from(requiredPaths).filter(p => !bufferPool.has(p));
    for (let i = 0; i < pathsToLoad.length; i += 3) {
      const batch = pathsToLoad.slice(i, i + 3);
      await Promise.all(batch.map(p => loadPath(audioContext, p)));
    }
  }
}
