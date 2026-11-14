/**
 * O Girador - Pool SOA 128 Voix Pré-alloué pour AudioWorklet (0 GC) (< 138 lignes)
 */

import {
  MAX_WORKLET_VOICES, VOICE_STATE_FREE, VOICE_STATE_ACTIVE, VOICE_STATE_CHOKING, WorkletSampleEntry,
} from '../percussionWorkletTypes';
import {
  WorkletVoiceEnvelopeParams, computeWorkletPeakGain, computeWorkletEffectiveDecay, fillWorkletVoiceEnvelope,
} from './workletEnvelopeMath';
import {
  BARULHO_OP_ATTACK_B, BARULHO_OP_MASK, BARULHO_OP_SHIFT, BARULHO_OP_SOFT_B,
  FLAG_ABAFADO_FALLBACK_80MS, FLAG_STUDIO_CALIBRATED, VOICE_CLASS_MASK, VOICE_CLASS_SHIFT,
  WORKLET_SEQ_MASK, WORKLET_SEQ_SHIFT, WorkletSkinPhysicsSoa,
} from './workletSkinPhysics';
import { BARULHO_MODE_NONE, WorkletBarulhoSoa } from './workletBarulhoSoa';

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
  public readonly skinPhysics = new WorkletSkinPhysicsSoa();
  public readonly barulho = new WorkletBarulhoSoa();

  private allocCursor = 0;
  private readonly envScratch: WorkletVoiceEnvelopeParams = {
    isFullBuffer: 0, safePeakGain: 0, midGain: 0, holdFrames: 0,
    midRelFrames: 0, relEndFrames: 0, endFrames: 0, linStep1: 0, expMul: 1, linStep2: 0,
  };

  public allocateVoiceSlot(): number {
    for (let i = 0; i < MAX_WORKLET_VOICES; i++) {
      const idx = (this.allocCursor + i) % MAX_WORKLET_VOICES;
      if (this.voiceState[idx] === VOICE_STATE_FREE) { this.allocCursor = (idx + 1) % MAX_WORKLET_VOICES; return idx; }
    }
    let bestRelIdx = -1, bestRelGain = Infinity, lowestIdx = 0, lowestGain = Infinity;
    for (let i = 0; i < MAX_WORKLET_VOICES; i++) {
      const isBarulho = this.barulho.mode[i] !== BARULHO_MODE_NONE;
      const g = this.voiceCurrentGain[i] * this.skinPhysics.duckGain[i] + (isBarulho ? 10 : 0);
      if (g < lowestGain) { lowestGain = g; lowestIdx = i; }
      if (!isBarulho && (this.voiceState[i] === VOICE_STATE_CHOKING || this.voiceElapsedFrames[i] >= this.voiceMidRelFrames[i]) && g < bestRelGain) {
        bestRelGain = g; bestRelIdx = i;
      }
    }
    const chosen = bestRelIdx >= 0 ? bestRelIdx : lowestIdx;
    this.allocCursor = (chosen + 1) % MAX_WORKLET_VOICES;
    return chosen;
  }

  public spawnVoice(
    triggerFrame: number, startInBlock: number, trackId: number, slot: number, sampleId: number, sample: WorkletSampleEntry,
    velocity: number, strokeBaseGain: number, stepDecayNorm: number, eventPitchNuance: number, trackPitchRatio: number,
    trackDecayNorm: number, contextSampleRate: number, flags = 0
  ): void {
    const sr = contextSampleRate > 0 ? contextSampleRate : 48000;
    const peakGain = computeWorkletPeakGain(velocity, strokeBaseGain, (flags & FLAG_STUDIO_CALIBRATED) !== 0, false);
    if (peakGain <= 0.0001 || sample.length < 2) return;

    const barulhoOp = (flags >>> BARULHO_OP_SHIFT) & BARULHO_OP_MASK;
    const seqId = (flags >>> WORKLET_SEQ_SHIFT) & WORKLET_SEQ_MASK;
    if (barulhoOp === BARULHO_OP_ATTACK_B || barulhoOp === BARULHO_OP_SOFT_B) {
      const prep = this.barulho.prepareSpawnOrLegato(
        barulhoOp, seqId, trackId, startInBlock, peakGain, stepDecayNorm, sr, sample,
        this.voiceState, this.voiceTrackId, this.voiceChokeStartInBlock, this.voiceChokeFramesLeft, this.voiceChokeDelta
      );
      if (prep.handledLegato) return;
      const v = this.allocateVoiceSlot();
      this.initCommonVoiceFields(v, triggerFrame, startInBlock, trackId, slot, sampleId, sample, eventPitchNuance, sr, flags, prep.initialReadPos, prep.initialGain, peakGain);
      this.barulho.initSpawnedVoice(v, seqId, startInBlock, sample, prep);
      return;
    }

    const v = this.allocateVoiceSlot();
    this.barulho.resetVoice(v);
    const safeSr = sample.sampleRate > 0 ? sample.sampleRate : sr;
    const effPitch = Math.max(0.1, eventPitchNuance * (trackPitchRatio > 0 ? trackPitchRatio : 1.0));
    fillWorkletVoiceEnvelope(sample.length / (safeSr * effPitch), computeWorkletEffectiveDecay(stepDecayNorm, trackDecayNorm), peakGain, sr, this.envScratch, (flags & FLAG_ABAFADO_FALLBACK_80MS) !== 0);
    this.initCommonVoiceFields(v, triggerFrame, startInBlock, trackId, slot, sampleId, sample, eventPitchNuance, sr, flags, 0, this.envScratch.safePeakGain, this.envScratch.safePeakGain);
    this.voiceMidGain[v] = this.envScratch.midGain; this.voiceHoldFrames[v] = this.envScratch.holdFrames;
    this.voiceMidRelFrames[v] = this.envScratch.midRelFrames; this.voiceRelEndFrames[v] = this.envScratch.relEndFrames;
    this.voiceEndFrames[v] = this.envScratch.endFrames; this.voiceIsFullBuffer[v] = this.envScratch.isFullBuffer;
    this.voiceLinStep1[v] = this.envScratch.linStep1; this.voiceExpMul[v] = this.envScratch.expMul; this.voiceLinStep2[v] = this.envScratch.linStep2;
  }

  private initCommonVoiceFields(
    v: number, triggerFrame: number, startInBlock: number, trackId: number, slot: number, sampleId: number,
    sample: WorkletSampleEntry, pitchNuance: number, sr: number, flags: number, readPos: number, curGain: number, peakGain: number
  ): void {
    const safeSr = sample.sampleRate > 0 ? sample.sampleRate : sr;
    this.voiceState[v] = VOICE_STATE_ACTIVE; this.voiceTrackId[v] = trackId; this.voiceSlot[v] = slot; this.voiceSampleId[v] = sampleId;
    this.voiceStartInBlock[v] = startInBlock; this.voiceStartFrame[v] = triggerFrame; this.voiceReadPos[v] = readPos;
    this.voiceSampleRateRatio[v] = safeSr / sr; this.voiceEventPitchNuance[v] = pitchNuance > 0 ? pitchNuance : 1.0;
    this.voiceCurrentGain[v] = curGain; this.voicePeakGain[v] = peakGain; this.voiceElapsedFrames[v] = 0;
    this.voiceChokeStartInBlock[v] = 0; this.voiceChokeFramesLeft[v] = 0; this.voiceChokeDelta[v] = 0;
    this.skinPhysics.initVoice(v, (flags >>> VOICE_CLASS_SHIFT) & VOICE_CLASS_MASK);
  }

  public applyEventPhysics(trackId: number, flags: number, evtFrame: number, startInBlock: number, contextSampleRate: number): void {
    this.skinPhysics.applyTrigger(
      trackId, flags, evtFrame, startInBlock, contextSampleRate, this.voiceState, this.voiceTrackId,
      this.voiceStartFrame, this.voiceChokeStartInBlock, this.voiceChokeFramesLeft, this.voiceChokeDelta, this.barulho.mode
    );
  }

  public fadeOutVoices(contextSampleRate: number, fadeSec = 0.005, filterTrackId?: number): void {
    const chokeFrames = Math.max(1, Math.ceil(fadeSec * (contextSampleRate > 0 ? contextSampleRate : 48000)));
    for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
      if (this.voiceState[v] !== VOICE_STATE_FREE && (filterTrackId === undefined || this.voiceTrackId[v] === filterTrackId)) {
        this.barulho.mode[v] = BARULHO_MODE_NONE; this.voiceState[v] = VOICE_STATE_CHOKING;
        this.voiceChokeStartInBlock[v] = 0; this.voiceChokeFramesLeft[v] = chokeFrames; this.voiceChokeDelta[v] = 0;
      }
    }
  }
}
