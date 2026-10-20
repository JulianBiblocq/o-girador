/**
 * O Girador - Audio Sample Loading, Decoding & IndexedDB Caching
 */

import type * as ToneType from 'tone';
import { getTone } from '../../ToneLoader';
import { instrumentAudioConfigs, InstrumentAudioConfig } from '../../data/audioConfig';
import { getCachedPcmSample, saveCachedPcmSample, reconstructAudioBuffer } from '../audioSampleCache';

export class EngineSampleLoader {
  public bufferPool = new Map<string, ToneType.ToneAudioBuffer>();
  public loadingPromises = new Map<string, Promise<void>>();

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
            return;
          }

          let fetchPath = path;
          if (path.includes('Mixdown/') || path.includes('mixdown/')) {
            const filename = path.substring(path.lastIndexOf('/') + 1);
            // @ts-ignore
            fetchPath = `${import.meta.env.BASE_URL || '/'}Mixdown/${filename}`;
          } else {
            const cleanPath = path.startsWith('/') ? path : '/' + path;
            // @ts-ignore
            const baseUrl = import.meta.env.BASE_URL || '/';
            fetchPath = baseUrl.endsWith('/') ? baseUrl + cleanPath.slice(1) : baseUrl + cleanPath;
          }
          const encodedFetchPath = fetchPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
          let response: Response | null = null;
          let delayMs = 300;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              response = await fetch(encodedFetchPath);
              if (response.ok) break;
              throw new Error(`HTTP status ${response.status}`);
            } catch (fetchErr) {
              if (attempt === 3) throw fetchErr;
              await new Promise(resolve => setTimeout(resolve, delayMs));
              delayMs *= 2;
            }
          }
          if (!response || !response.ok) throw new Error(`HTTP error: ${response ? response.status : 'unknown'}`);
          let arrayBuffer = await response.arrayBuffer();

          try {
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);
            this.bufferPool.set(path, toneBuffer);
            saveCachedPcmSample(path, audioBuffer).catch(() => {});
          } catch (decodeErr) {
            const fallbackPath = encodedFetchPath.replace(/\.ogg$/, '.m4a');
            try {
              response = await fetch(fallbackPath);
              if (!response.ok) return;
              arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
              const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);
              this.bufferPool.set(path, toneBuffer);
              saveCachedPcmSample(path, audioBuffer).catch(() => {});
            } catch (_) {}
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
    await Promise.all(pathsArray.map(p => this.loadPath(audioContext, p)));
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
    await Promise.all(pathsArray.map(p => this.loadPath(audioContext, p)));
  }

  public isStrokeLoaded(
    configMap: Map<string, InstrumentAudioConfig>,
    instrumentId: string,
    strokeSymbol: string
  ): boolean {
    const config = configMap.get(instrumentId);
    if (!config) return true;
    const norm = strokeSymbol.trim();
    const stroke = config.strokes.find(s =>
      s.caseSensitive === false ? s.symbol.toUpperCase() === norm.toUpperCase() : s.symbol === norm
    );
    if (!stroke) return true;
    return stroke.files.every(p => this.bufferPool.has(p));
  }

  public async loadStrokeSamples(
    audioContext: AudioContext,
    configMap: Map<string, InstrumentAudioConfig>,
    instrumentId: string,
    strokeSymbol: string
  ): Promise<void> {
    const config = configMap.get(instrumentId);
    if (!config) return;
    const norm = strokeSymbol.trim();
    const stroke = config.strokes.find(s =>
      s.caseSensitive === false ? s.symbol.toUpperCase() === norm.toUpperCase() : s.symbol === norm
    );
    if (!stroke) return;
    await Promise.all(stroke.files.map(p => this.loadPath(audioContext, p)));
  }
}
