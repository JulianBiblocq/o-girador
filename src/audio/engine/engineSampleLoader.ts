/**
 * O Girador - Audio Sample Loading, Decoding & IndexedDB Caching (< 125 lignes)
 */

import type * as ToneType from 'tone';
import { getTone } from '../../ToneLoader';
import { instrumentAudioConfigs, InstrumentAudioConfig, StrokeMapping } from '../../data/audioConfig';
import { getCachedSampleBuffer } from '../audioSampleCache';
import { normalizeCanonicalSampleKey } from './sampleFetchUtils';

function findBackingStroke(config: InstrumentAudioConfig, strokeSymbol: string): StrokeMapping | undefined {
  const norm = strokeSymbol.trim();
  return (
    config.strokes.find((s) =>
      s.caseSensitive === false ? s.symbol.toUpperCase() === norm.toUpperCase() : s.symbol === norm
    ) || config.strokes.find((s) => s.symbol.toUpperCase() === norm.toUpperCase())
  );
}

export class EngineSampleLoader {
  public bufferPool = new Map<string, ToneType.ToneAudioBuffer>();
  public loadingPromises = new Map<string, Promise<void>>();
  public onSampleDecoded?: (path: string, buffer: AudioBuffer) => void;
  public onSamplesEvicted?: (paths: string[]) => void;

  public async loadPath(audioContext: AudioContext, rawPath: string): Promise<void> {
    const path = normalizeCanonicalSampleKey(rawPath);
    if (this.bufferPool.has(path)) return;
    let promise = this.loadingPromises.get(path);
    if (!promise) {
      promise = (async () => {
        const Tone = getTone();
        try {
          const audioBuffer = await getCachedSampleBuffer(audioContext, path);
          if (!audioBuffer) return;

          const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);
          this.bufferPool.set(path, toneBuffer);
          this.onSampleDecoded?.(path, audioBuffer);
        } catch (err) {
          console.error(`AudioEngine: Failed to load sample: ${path}`, err);
        } finally {
          this.loadingPromises.delete(path);
        }
      })();
      this.loadingPromises.set(path, promise);
    }
    return promise;
  }

  public async loadAllSamples(audioContext: AudioContext): Promise<void> {
    const pathsArray: string[] = [];
    for (const config of instrumentAudioConfigs) {
      for (const stroke of config.strokes) {
        for (const file of stroke.files) pathsArray.push(file);
      }
    }
    for (let i = 0; i < pathsArray.length; i += 3) {
      await Promise.all(pathsArray.slice(i, i + 3).map((p) => this.loadPath(audioContext, p)));
    }
  }

  public async loadInstrumentSamples(
    audioContext: AudioContext,
    configMap: Map<string, InstrumentAudioConfig>,
    instrumentId: string
  ): Promise<void> {
    const pathsArray: string[] = [];
    const config = configMap.get(instrumentId);
    if (config) {
      for (const stroke of config.strokes) {
        for (const file of stroke.files) pathsArray.push(file);
      }
    }
    for (let i = 0; i < pathsArray.length; i += 3) {
      await Promise.all(pathsArray.slice(i, i + 3).map((p) => this.loadPath(audioContext, p)));
    }
  }

  public isStrokeLoaded(
    configMap: Map<string, InstrumentAudioConfig>,
    instrumentId: string,
    strokeSymbol: string
  ): boolean {
    const config = configMap.get(instrumentId);
    if (!config) return true;
    const stroke = findBackingStroke(config, strokeSymbol);
    if (!stroke) return true;
    const rim = stroke.compositeRimSymbol ? config.strokes.find((s) => s.symbol === stroke.compositeRimSymbol) : undefined;
    const hasFile = (p: string) => this.bufferPool.has(normalizeCanonicalSampleKey(p));
    return stroke.files.every(hasFile) && (!rim || rim.files.every(hasFile));
  }

  public async loadStrokeSamples(
    audioContext: AudioContext,
    configMap: Map<string, InstrumentAudioConfig>,
    instrumentId: string,
    strokeSymbol: string
  ): Promise<void> {
    const config = configMap.get(instrumentId);
    if (!config) return;
    const stroke = findBackingStroke(config, strokeSymbol);
    if (!stroke) return;
    const rim = stroke.compositeRimSymbol ? config.strokes.find((s) => s.symbol === stroke.compositeRimSymbol) : undefined;
    const allFiles = rim ? [...stroke.files, ...rim.files] : stroke.files;
    for (let i = 0; i < allFiles.length; i += 3) {
      await Promise.all(allFiles.slice(i, i + 3).map((p) => this.loadPath(audioContext, p)));
    }
  }
}
