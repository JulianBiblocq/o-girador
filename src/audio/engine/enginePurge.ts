/**
 * O Girador - Audio Engine Scheduled Hits Purge & Background Cleaner
 */

import { GainNodeMapping } from './engineTypes';
import { EngineBarulhoPlayer } from './engineBarulhoPlayer';

export class EnginePurge {
  public static purgeScheduledHits(
    audioContext: AudioContext,
    scheduledHits: Set<AudioBufferSourceNode>,
    activeGainNodes: Map<AudioBufferSourceNode, GainNodeMapping>,
    releaseGainNode: (instrumentId: string, gainNode: GainNode) => void,
    removeActiveVoice: (instrumentId: string, source: AudioBufferSourceNode) => void,
    barulho: EngineBarulhoPlayer
  ): void {
    const now = audioContext.currentTime;
    scheduledHits.forEach((source) => {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch (_) {}

      const mapping = activeGainNodes.get(source);
      if (mapping) {
        const instrumentId = mapping.instrumentId;
        const gainNode = mapping.gainNode;
        if (gainNode) {
          try {
            gainNode.gain.cancelScheduledValues(now);
          } catch (_) {}
          releaseGainNode(instrumentId, gainNode);
          mapping.gainNode = null;
        }
        mapping.instrumentId = '';
        activeGainNodes.delete(source);
        if (instrumentId) {
          removeActiveVoice(instrumentId, source);
          if (barulho.activeBarulhoNodes.get(instrumentId) === source) {
            barulho.activeBarulhoNodes.delete(instrumentId);
            barulho.activeBarulhoGains.delete(instrumentId);
          }
        }
      }
    });
    scheduledHits.clear();
  }

  public static cleanDeadNodes(
    audioContext: AudioContext,
    activeGainNodes: Map<AudioBufferSourceNode, GainNodeMapping>,
    scheduledHits: Set<AudioBufferSourceNode>,
    releaseGainNode: (instrumentId: string, gainNode: GainNode) => void,
    removeActiveVoice: (instrumentId: string, source: AudioBufferSourceNode) => void,
    barulho: EngineBarulhoPlayer
  ): void {
    const now = audioContext.currentTime;
    const deadNodes: AudioBufferSourceNode[] = [];

    for (const [source, mapping] of activeGainNodes) {
      if (now > mapping.expectedEnd + 1.0) deadNodes.push(source);
    }

    const len = deadNodes.length;
    for (let i = 0; i < len; i++) {
      const source = deadNodes[i];
      const mapping = activeGainNodes.get(source);
      if (mapping) {
        try { source.disconnect(); } catch (_) {}
        const instrumentId = mapping.instrumentId;
        const gainNode = mapping.gainNode;
        if (gainNode) {
          releaseGainNode(instrumentId, gainNode);
          mapping.gainNode = null;
        }
        mapping.instrumentId = '';
        scheduledHits.delete(source);
        activeGainNodes.delete(source);
        if (instrumentId) {
          if (barulho.activeBarulhoNodes.get(instrumentId) === source) {
            barulho.activeBarulhoNodes.delete(instrumentId);
            barulho.activeBarulhoGains.delete(instrumentId);
          }
          removeActiveVoice(instrumentId, source);
        }
      }
    }
  }
}
