/**
 * O Girador - Pool SOA 128 Voix Pré-alloué pour AudioWorklet (0 GC) (< 140 lignes)
 */

import {
  MAX_WORKLET_VOICES, VOICE_STATE_FREE, VOICE_STATE_ACTIVE, VOICE_STATE_CHOKING, WorkletSampleEntry,
} from '../percussionWorkletTypes';
import {
  WorkletVoiceEnvelopeParams, computeWorkletPeakGain, computeWorkletEffectiveDecay, fillWorkletVoiceEnvelope,
} from './workletEnvelopeMath';

export class WorkletVoicePoolSoa {
  public readonly voiceState = new Uint8Array(MAX_WORKLET_VOICES);
  public readonly voiceTrackId = new Int32Array(MAX_WORKLET_VOICES);
  public readonly voiceSlot = new Uint8Array(MAX_WORKLET_VOICES);
  public readonly voiceSampleId = new Uint16Array(MAX_WORKLET_VOICES);
  public readonly voiceStartInBlock = new Uint8Array(MAX_WORKLET_VOICES);
  public readonly voiceStartFrame = new Float64Array(MAX_WORKLET_VOICES);
  public readonly voiceReadPos = new Float64Array(MAX_WORKLET_VOICES);
  public readonly voiceSampleRateRatio = new Float32Array(MAX_WORKLET_VOICES);
  public readonly voiceEventPitchNuance = new Float32Array(MAX_WORKLET_VOICES);
  public readonly voiceCurrentGain = new Float32Array(MAX_WORKLET_VOICES);
  public readonly voicePeakGain = new Float32Array(MAX_WORKLET_VOICES);
  public readonly voiceMidGain = new Float32Array(MAX_WORKLET_VOICES);
  public readonly voiceElapsedFrames = new Int32Array(MAX_WORKLET_VOICES);
  public readonly voiceHoldFrames = new Int32Array(MAX_WORKLET_VOICES);
  public readonly voiceMidRelFrames = new Int32Array(MAX_WORKLET_VOICES);
  public readonly voiceRelEndFrames = new Int32Array(MAX_WORKLET_VOICES);
  public readonly voiceEndFrames = new Int32Array(MAX_WORKLET_VOICES);
  public readonly voiceIsFullBuffer = new Uint8Array(MAX_WORKLET_VOICES);
  public readonly voiceLinStep1 = new Float32Array(MAX_WORKLET_VOICES);
  public readonly voiceExpMul = new Float32Array(MAX_WORKLET_VOICES);
  public readonly voiceLinStep2 = new Float32Array(MAX_WORKLET_VOICES);
  public readonly voiceChokeStartInBlock = new Uint8Array(MAX_WORKLET_VOICES);
  public readonly voiceChokeFramesLeft = new Int32Array(MAX_WORKLET_VOICES);
  public readonly voiceChokeDelta = new Float32Array(MAX_WORKLET_VOICES);

  private allocCursor = 0;
  private readonly envScratch: WorkletVoiceEnvelopeParams = {
    isFullBuffer: 0, safePeakGain: 0, midGain: 0, holdFrames: 0,
    midRelFrames: 0, relEndFrames: 0, endFrames: 0, linStep1: 0, expMul: 1, linStep2: 0,
  };

  public allocateVoiceSlot(): number {
    for (let i = 0; i < MAX_WORKLET_VOICES; i++) {
      const idx = (this.allocCursor + i) % MAX_WORKLET_VOICES;
      if (this.voiceState[idx] === VOICE_STATE_FREE) {
        this.allocCursor = (idx + 1) % MAX_WORKLET_VOICES;
        return idx;
      }
    }
    let bestReleaseIdx = -1, bestReleaseGain = Infinity, lowestGainIdx = 0, lowestGain = Infinity;
    for (let i = 0; i < MAX_WORKLET_VOICES; i++) {
      const g = this.voiceCurrentGain[i];
      if (g < lowestGain) { lowestGain = g; lowestGainIdx = i; }
      if ((this.voiceState[i] === VOICE_STATE_CHOKING || this.voiceElapsedFrames[i] >= this.voiceMidRelFrames[i]) && g < bestReleaseGain) {
        bestReleaseGain = g; bestReleaseIdx = i;
      }
    }
    const chosen = bestReleaseIdx >= 0 ? bestReleaseIdx : lowestGainIdx;
    this.allocCursor = (chosen + 1) % MAX_WORKLET_VOICES;
    return chosen;
  }

  public spawnVoice(
    triggerFrame: number, startInBlock: number, trackId: number, slot: number,
    sampleId: number, sample: WorkletSampleEntry, velocity: number, strokeBaseGain: number,
    stepDecayNorm: number, eventPitchNuance: number, trackPitchRatio: number,
    trackDecayNorm: number, contextSampleRate: number
  ): void {
    const peakGain = computeWorkletPeakGain(velocity, strokeBaseGain);
    if (peakGain <= 0.0001 || sample.length < 2) return;

    const v = this.allocateVoiceSlot();
    const safeSampleRate = sample.sampleRate > 0 ? sample.sampleRate : contextSampleRate;
    const effectivePitch = Math.max(0.1, eventPitchNuance * (trackPitchRatio > 0 ? trackPitchRatio : 1.0));
    const realWorldDurationSec = sample.length / (safeSampleRate * effectivePitch);
    const effectiveDecay = computeWorkletEffectiveDecay(stepDecayNorm, trackDecayNorm);
    fillWorkletVoiceEnvelope(realWorldDurationSec, effectiveDecay, peakGain, contextSampleRate, this.envScratch);

    this.voiceState[v] = VOICE_STATE_ACTIVE;
    this.voiceTrackId[v] = trackId;
    this.voiceSlot[v] = slot;
    this.voiceSampleId[v] = sampleId;
    this.voiceStartInBlock[v] = startInBlock;
    this.voiceStartFrame[v] = triggerFrame;
    this.voiceReadPos[v] = 0;
    this.voiceSampleRateRatio[v] = safeSampleRate / (contextSampleRate > 0 ? contextSampleRate : 48000);
    this.voiceEventPitchNuance[v] = eventPitchNuance > 0 ? eventPitchNuance : 1.0;
    this.voiceCurrentGain[v] = this.envScratch.safePeakGain;
    this.voicePeakGain[v] = this.envScratch.safePeakGain;
    this.voiceMidGain[v] = this.envScratch.midGain;
    this.voiceElapsedFrames[v] = 0;
    this.voiceHoldFrames[v] = this.envScratch.holdFrames;
    this.voiceMidRelFrames[v] = this.envScratch.midRelFrames;
    this.voiceRelEndFrames[v] = this.envScratch.relEndFrames;
    this.voiceEndFrames[v] = this.envScratch.endFrames;
    this.voiceIsFullBuffer[v] = this.envScratch.isFullBuffer;
    this.voiceLinStep1[v] = this.envScratch.linStep1;
    this.voiceExpMul[v] = this.envScratch.expMul;
    this.voiceLinStep2[v] = this.envScratch.linStep2;
    this.voiceChokeStartInBlock[v] = 0;
    this.voiceChokeFramesLeft[v] = 0;
    this.voiceChokeDelta[v] = 0;
  }

  public triggerChokeForTrack(trackId: number, chokeTriggerFrame: number, chokeStartInBlock: number, contextSampleRate: number): void {
    if (trackId < 0) return;
    const chokeFrames = Math.max(1, Math.ceil(0.008 * (contextSampleRate > 0 ? contextSampleRate : 48000)));
    for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
      if (this.voiceState[v] === VOICE_STATE_ACTIVE && this.voiceTrackId[v] === trackId && this.voiceStartFrame[v] < chokeTriggerFrame) {
        this.voiceState[v] = VOICE_STATE_CHOKING;
        this.voiceChokeStartInBlock[v] = chokeStartInBlock;
        this.voiceChokeFramesLeft[v] = chokeFrames;
        this.voiceChokeDelta[v] = 0;
      }
    }
  }

  public fadeOutVoices(contextSampleRate: number, fadeSec = 0.005, filterTrackId?: number): void {
    const chokeFrames = Math.max(1, Math.ceil(fadeSec * (contextSampleRate > 0 ? contextSampleRate : 48000)));
    for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
      if (this.voiceState[v] !== VOICE_STATE_FREE && (filterTrackId === undefined || this.voiceTrackId[v] === filterTrackId)) {
        this.voiceState[v] = VOICE_STATE_CHOKING;
        this.voiceChokeStartInBlock[v] = 0;
        this.voiceChokeFramesLeft[v] = chokeFrames;
        this.voiceChokeDelta[v] = 0;
      }
    }
  }
}
