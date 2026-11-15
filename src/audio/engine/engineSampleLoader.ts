/**
 * O Girador - Audio Sample Loading, Decoding & IndexedDB Caching (< 132 lignes)
 */

import type * as ToneType from 'tone';
import { getTone } from '../../ToneLoader';
import { instrumentAudioConfigs, InstrumentAudioConfig, StrokeMapping } from '../../data/audioConfig';
import { getCachedPcmSample, saveCachedPcmSample, reconstructAudioBuffer } from '../audioSampleCache';
import { resolveSampleFetchPath, fetchSampleWithRetry } from './sampleFetchUtils';

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

  public async loadPath(audioContext: AudioContext, path: string): Promise<void> {
    if (this.bufferPool.has(path)) return;
    let promise = this.loadingPromises.get(path);
    if (!promise) {
      promise = (async () => {
        const Tone = getTone();
        try {
          const cachedPcm = await getCachedPcmSample(path, audioContext.sampleRate);
          if (cachedPcm) {
            const audioBuffer = reconstructAudioBuffer(audioContext, cachedPcm);
            const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);
            this.bufferPool.set(path, toneBuffer);
            this.onSampleDecoded?.(path, audioBuffer);
            return;
          }

          const encodedFetchPath = resolveSampleFetchPath(path);
          let response = await fetchSampleWithRetry(encodedFetchPath);
          let arrayBuffer = await response.arrayBuffer();

          try {
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);
            this.bufferPool.set(path, toneBuffer);
            this.onSampleDecoded?.(path, audioBuffer);
            saveCachedPcmSample(path, audioBuffer).catch(() => {});
          } catch (_) {
            const fallbackPath = encodedFetchPath.replace(/\.ogg$/, '.m4a');
            try {
              response = await fetch(fallbackPath);
              if (!response.ok) return;
              arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
              const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);
              this.bufferPool.set(path, toneBuffer);
              this.onSampleDecoded?.(path, audioBuffer);
              saveCachedPcmSample(path, audioBuffer).catch(() => {});
            } catch (__) {}
          }
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
    return stroke.files.every((p) => this.bufferPool.has(p)) && (!rim || rim.files.every((p) => this.bufferPool.has(p)));
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
