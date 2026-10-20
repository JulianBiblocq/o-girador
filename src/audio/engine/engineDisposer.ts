/**
 * O Girador - Audio Engine Teardown & Resource Disposal
 */

import { GainNodeMapping } from './engineTypes';
import { EngineChannels } from './engineChannels';
import { EngineVoiceSynthManager } from './engineVoiceSynth';
import { EngineSampleLoader } from './engineSampleLoader';
import { EngineBarulhoPlayer } from './engineBarulhoPlayer';
import { EngineSchedulerClock } from './engineSchedulerClock';

export interface DisposerState {
  barulho: EngineBarulhoPlayer;
  unsubscribeTracks: (() => void) | null;
  cleanupVisibility: (() => void) | null;
  clock: EngineSchedulerClock;
  sampleLoader: EngineSampleLoader;
  scheduledHits: Set<AudioBufferSourceNode>;
  activeGainNodes: Map<AudioBufferSourceNode, GainNodeMapping>;
  channels: EngineChannels;
  voiceSynthManager: EngineVoiceSynthManager;
}

export class EngineDisposer {
  public static dispose(s: DisposerState): void {
    s.barulho.stopAllBarulho();
    if (s.unsubscribeTracks) s.unsubscribeTracks();
    if (s.cleanupVisibility) s.cleanupVisibility();
    s.clock.dispose();
    s.sampleLoader.bufferPool.clear();
    s.sampleLoader.loadingPromises.clear();
    s.barulho.clear();
    s.scheduledHits.clear();
    s.activeGainNodes.clear();
    s.channels.dispose();
    s.voiceSynthManager.releaseAllVoices();
  }
}
