/**
 * O Girador - Audio Engine Sample Loader Actions & Facade
 */

import { InstrumentAudioConfig } from '../../data/audioConfig';
import { ActiveInstrumentData } from './engineTypes';
import { EngineSampleLoader } from './engineSampleLoader';
import { EngineMemorySync } from './engineMemorySync';

export class EngineSampleActions {
  public static async loadPath(audioContext: AudioContext, loader: EngineSampleLoader, path: string): Promise<void> {
    return loader.loadPath(audioContext, path);
  }

  public static async loadAllSamples(audioContext: AudioContext, loader: EngineSampleLoader): Promise<void> {
    return loader.loadAllSamples(audioContext);
  }

  public static async loadInstrumentSamples(
    audioContext: AudioContext,
    loader: EngineSampleLoader,
    configMap: Map<string, InstrumentAudioConfig>,
    instId: string
  ): Promise<void> {
    return loader.loadInstrumentSamples(audioContext, configMap, instId);
  }

  public static async loadStrokeSamples(
    audioContext: AudioContext,
    loader: EngineSampleLoader,
    configMap: Map<string, InstrumentAudioConfig>,
    instId: string,
    stroke: string
  ): Promise<void> {
    return loader.loadStrokeSamples(audioContext, configMap, instId, stroke);
  }

  public static isStrokeLoaded(
    loader: EngineSampleLoader,
    configMap: Map<string, InstrumentAudioConfig>,
    instId: string,
    stroke: string
  ): boolean {
    return loader.isStrokeLoaded(configMap, instId, stroke);
  }

  public static async syncActiveInstrumentsMemory(
    audioContext: AudioContext,
    loader: EngineSampleLoader,
    configMap: Map<string, InstrumentAudioConfig>,
    activeInstruments: ActiveInstrumentData[]
  ): Promise<void> {
    return EngineMemorySync.syncActiveInstrumentsMemory(
      audioContext, configMap, loader.bufferPool,
      (ctx, p) => loader.loadPath(ctx, p), activeInstruments
    );
  }
}
