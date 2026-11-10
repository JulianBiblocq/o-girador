/**
 * O Girador - Processeur AudioWorklet Multi-Sorties de Percussions (< 120 lignes)
 * Typage strict `AudioWorkletGlobalScope` sans `any`, piloté par `currentFrame` et `sampleRate`.
 */

import {
  MAX_WORKLET_OUTPUTS,
  MAX_WORKLET_SAMPLES,
  PercussionWorkletInboundMessage,
  WorkletSampleEntry,
} from '../percussionWorkletTypes';
import { WorkletEventQueue } from './workletEventQueue';
import { WorkletVoicePoolSoa } from './workletVoicePoolSoa';
import { processWorkletDspBlock } from './workletDspKernel';

interface WorkletMessageEvent<T> {
  readonly data: T;
}

interface WorkletPort {
  onmessage: ((event: WorkletMessageEvent<PercussionWorkletInboundMessage>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

declare abstract class AudioWorkletProcessor {
  readonly port: WorkletPort;
  constructor();
  abstract process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor
): void;

declare const currentFrame: number;
declare const sampleRate: number;

export class PercussionEngineProcessor extends AudioWorkletProcessor {
  private readonly queue = new WorkletEventQueue();
  private readonly pool = new WorkletVoicePoolSoa();
  private readonly samples: (WorkletSampleEntry | undefined)[] = new Array(MAX_WORKLET_SAMPLES);
  private readonly slotMuted = new Uint8Array(MAX_WORKLET_OUTPUTS);
  private readonly slotPitchRatio = new Float32Array(MAX_WORKLET_OUTPUTS);
  private readonly slotDecayNorm = new Float32Array(MAX_WORKLET_OUTPUTS);

  constructor() {
    super();
    this.slotPitchRatio.fill(1.0);
    this.slotDecayNorm.fill(1.0);

    this.port.onmessage = (event: WorkletMessageEvent<PercussionWorkletInboundMessage>) => {
      this.handleMessage(event.data);
    };
  }

  public handleMessage(msg: PercussionWorkletInboundMessage): void {
    switch (msg.type) {
      case 'LOAD_SAMPLE': {
        if (msg.sampleId >= 0 && msg.sampleId < MAX_WORKLET_SAMPLES && msg.ch0) {
          this.samples[msg.sampleId] = {
            ch0: msg.ch0,
            ch1: msg.ch1,
            sampleRate: msg.sampleRate > 0 ? msg.sampleRate : sampleRate,
            length: msg.ch0.length,
          };
        }
        break;
      }
      case 'PUSH_EVENTS': {
        if (msg.eventsData && msg.eventCount > 0) {
          this.queue.pushPackedEvents(msg.eventsData, msg.eventCount);
        }
        break;
      }
      case 'UPDATE_TRACK_SLOT': {
        const s = msg.slot;
        if (s >= 0 && s < MAX_WORKLET_OUTPUTS) {
          this.slotMuted[s] = msg.isMuted ? 1 : 0;
          this.slotPitchRatio[s] = msg.pitchRatio > 0 ? msg.pitchRatio : 1.0;
          this.slotDecayNorm[s] = msg.decayNorm > 0 ? msg.decayNorm : 1.0;
        }
        break;
      }
      case 'PURGE_ALL': {
        this.queue.clear();
        this.pool.fadeOutVoices(sampleRate, 0.005);
        break;
      }
      case 'PURGE_FROM_FRAME': {
        this.queue.purgeFromFrame(msg.fromFrame, msg.measureSeqId);
        break;
      }
      case 'PURGE_TRACK': {
        this.queue.purgeTrack(msg.trackId);
        this.pool.fadeOutVoices(sampleRate, 0.005, msg.trackId);
        break;
      }
    }
  }

  public process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    processWorkletDspBlock(
      outputs,
      currentFrame,
      sampleRate,
      this.queue,
      this.pool,
      this.samples,
      this.slotMuted,
      this.slotPitchRatio,
      this.slotDecayNorm
    );
    return true;
  }
}

if (typeof registerProcessor === 'function') {
  registerProcessor('percussion-engine-processor', PercussionEngineProcessor);
}

