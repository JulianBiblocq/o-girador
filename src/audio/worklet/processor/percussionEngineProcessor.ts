/**
 * O Girador - Processeur AudioWorklet Multi-Sorties de Percussions (< 140 lignes)
 * Typage strict `AudioWorkletGlobalScope` sans `any`, 256 voix SOA Zéro-GC et escouade spatiale par slot.
 */

import {
  MAX_WORKLET_OUTPUTS,
  MAX_WORKLET_PLAYERS_PER_SLOT,
  MAX_WORKLET_SAMPLES,
  PercussionWorkletInboundMessage,
  WorkletMessageEvent,
  WorkletPort,
  WorkletSampleEntry,
} from '../percussionWorkletTypes';
import { WorkletEventQueue } from './workletEventQueue';
import { WorkletVoicePoolSoa } from './workletVoicePoolSoa';
import { processWorkletDspBlock } from './workletDspKernel';

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
  private readonly slotPlayerGainL = new Float32Array(MAX_WORKLET_OUTPUTS * MAX_WORKLET_PLAYERS_PER_SLOT);
  private readonly slotPlayerGainR = new Float32Array(MAX_WORKLET_OUTPUTS * MAX_WORKLET_PLAYERS_PER_SLOT);
  private readonly slotPlayerPitchMul = new Float32Array(MAX_WORKLET_OUTPUTS * MAX_WORKLET_PLAYERS_PER_SLOT);

  constructor() {
    super();
    this.slotPitchRatio.fill(1.0);
    this.slotDecayNorm.fill(1.0);
    this.slotPlayerGainL.fill(1.0);
    this.slotPlayerGainR.fill(1.0);
    this.slotPlayerPitchMul.fill(1.0);
    this.port.onmessage = (event: WorkletMessageEvent<PercussionWorkletInboundMessage>) => {
      this.handleMessage(event.data);
    };
  }

  public handleMessage(msg: PercussionWorkletInboundMessage): void {
    switch (msg.type) {
      case 'LOAD_SAMPLE': {
        if (msg.sampleId >= 0 && msg.sampleId < MAX_WORKLET_SAMPLES && msg.ch0) {
          const bodyStart = msg.bodyStartFrame ?? 0;
          const loopResume = msg.loopResumeFrame ?? 0;
          const loopWrap = msg.loopWrapFrame ?? 0;
          this.samples[msg.sampleId] = {
            ch0: msg.ch0, ch1: msg.ch1, sampleRate: msg.sampleRate > 0 ? msg.sampleRate : sampleRate,
            length: msg.ch0.length, bodyStartFrame: bodyStart, loopResumeFrame: loopResume,
            loopWrapFrame: loopWrap, softEntryFrame: msg.softEntryFrame ?? bodyStart,
          };
          this.pool.barulho.refreshSampleLoopBounds(
            msg.sampleId, loopResume, loopWrap, this.pool.voiceState, this.pool.voiceSampleId, this.pool.voiceReadPos
          );
        }
        break;
      }
      case 'UNLOAD_SAMPLES': {
        if (Array.isArray(msg.sampleIds)) {
          for (let i = 0; i < msg.sampleIds.length; i++) {
            const id = msg.sampleIds[i];
            if (id >= 0 && id < MAX_WORKLET_SAMPLES) this.samples[id] = undefined;
          }
        }
        break;
      }
      case 'PUSH_EVENTS': {
        if (msg.eventsData && msg.eventCount > 0) this.queue.pushPackedEvents(msg.eventsData, msg.eventCount);
        break;
      }
      case 'UPDATE_TRACK_SLOT': {
        const s = msg.slot;
        if (s >= 0 && s < MAX_WORKLET_OUTPUTS) {
          this.slotMuted[s] = msg.isMuted ? 1 : 0;
          this.slotPitchRatio[s] = msg.pitchRatio > 0 ? msg.pitchRatio : 1.0;
          this.slotDecayNorm[s] = msg.decayNorm > 0 ? msg.decayNorm : 1.0;
          const base = s * MAX_WORKLET_PLAYERS_PER_SLOT;
          for (let k = 0; k < MAX_WORKLET_PLAYERS_PER_SLOT; k++) {
            this.slotPlayerGainL[base + k] = msg.playerGainL && k < msg.playerGainL.length ? msg.playerGainL[k] : 1.0;
            this.slotPlayerGainR[base + k] = msg.playerGainR && k < msg.playerGainR.length ? msg.playerGainR[k] : 1.0;
            this.slotPlayerPitchMul[base + k] = msg.playerPitchMul && k < msg.playerPitchMul.length && msg.playerPitchMul[k] > 0 ? msg.playerPitchMul[k] : 1.0;
          }
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
      outputs, currentFrame, sampleRate, this.queue, this.pool,
      this.samples, this.slotMuted, this.slotPitchRatio, this.slotDecayNorm,
      this.slotPlayerGainL, this.slotPlayerGainR, this.slotPlayerPitchMul
    );
    return true;
  }
}

if (typeof registerProcessor === 'function') {
  registerProcessor('percussion-engine-processor', PercussionEngineProcessor);
}
