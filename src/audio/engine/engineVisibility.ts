/**
 * O Girador - Audio Engine Document Visibility Lifecycle Listener
 */

import { GainNodeMapping } from './engineTypes';
import { EngineChannels } from './engineChannels';
import { EngineVoiceGuard } from './engineVoiceGuard';
import { EngineBarulhoPlayer } from './engineBarulhoPlayer';
import { EngineSchedulerClock } from './engineSchedulerClock';
import { EnginePurge } from './enginePurge';

export class EngineVisibility {
  public static setup(
    audioContext: AudioContext,
    clock: EngineSchedulerClock,
    activeGainNodes: Map<AudioBufferSourceNode, GainNodeMapping>,
    scheduledHits: Set<AudioBufferSourceNode>,
    channels: EngineChannels,
    voiceGuard: EngineVoiceGuard,
    barulho: EngineBarulhoPlayer,
    purgeScheduledHits: () => void
  ): () => void {
    if (typeof document === 'undefined') return () => {};

    const handler = () => {
      clock.updateSchedulingParameters();
      if (!document.hidden) {
        if (clock.isPlaying) {
          purgeScheduledHits();
          clock.forceReanchor();
        }
        EnginePurge.cleanDeadNodes(
          audioContext,
          activeGainNodes,
          scheduledHits,
          (inst, g) => channels.releaseGainNode(audioContext, inst, g),
          (inst, s) => voiceGuard.removeActiveVoice(inst, s),
          barulho
        );
      }
    };

    document.addEventListener('visibilitychange', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
    };
  }
}
