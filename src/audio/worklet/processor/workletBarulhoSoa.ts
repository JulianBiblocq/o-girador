/**
 * workletBarulhoSoa.ts — Machine à états SOA Zéro-GC pour Barulho continu (`B` / `b` / `/` / `.`) (< 135 lignes).
 * - Isolé par `(trackId, playerIdx)` avec décorrélation de phase stationnaire `~350 ms` + fondu 28 ms pour `playerIdx >= 1`.
 */
import { MAX_WORKLET_VOICES, VOICE_STATE_ACTIVE, VOICE_STATE_CHOKING, WorkletSampleEntry } from '../percussionWorkletTypes';
import { BARULHO_PARTNER_ATTACK_RAMP_SEC, computeBarulhoDecorrelatedReadFrame } from '../../spatial/sectionBarulhoPhaseHelper';
import { BARULHO_OP_ATTACK_B, BARULHO_OP_FADEOUT_SLASH, BARULHO_OP_PARTNER_B, BARULHO_OP_STOP_DOT, computeBarulhoSoftEntryFrame } from './workletEventFlags';

export const BARULHO_MODE_NONE = 0;
export const BARULHO_MODE_ROLLING = 1;
export const BARULHO_MODE_FADING_OUT = 2;

export interface BarulhoSpawnPrep {
  handledLegato: boolean; initialReadPos: number; initialGain: number;
  rampFrames: number; targetGain: number; originCoord: number;
}

export class WorkletBarulhoSoa {
  public readonly mode = new Uint8Array(MAX_WORKLET_VOICES);
  public readonly originCoord = new Int32Array(MAX_WORKLET_VOICES);
  public readonly originSeqId = new Int32Array(MAX_WORKLET_VOICES);
  public readonly loopResumeFrame = new Int32Array(MAX_WORKLET_VOICES);
  public readonly loopWrapFrame = new Int32Array(MAX_WORKLET_VOICES);
  public readonly rampStartInBlock = new Uint8Array(MAX_WORKLET_VOICES);
  public readonly rampFramesLeft = new Int32Array(MAX_WORKLET_VOICES);
  public readonly rampDelta = new Float32Array(MAX_WORKLET_VOICES);
  public readonly rampTargetGain = new Float32Array(MAX_WORKLET_VOICES);
  public readonly rampDeltaPending = new Uint8Array(MAX_WORKLET_VOICES);
  public readonly autoFreeAfterRamp = new Uint8Array(MAX_WORKLET_VOICES);

  private readonly prepScratch: BarulhoSpawnPrep = {
    handledLegato: false, initialReadPos: 0, initialGain: 0, rampFrames: 0, targetGain: 0, originCoord: 0,
  };

  public resetVoice(v: number): void {
    this.mode[v] = BARULHO_MODE_NONE; this.originCoord[v] = 0; this.originSeqId[v] = -1;
    this.loopResumeFrame[v] = 0; this.loopWrapFrame[v] = 0;
    this.rampStartInBlock[v] = 0; this.rampFramesLeft[v] = 0; this.rampDelta[v] = 0;
    this.rampTargetGain[v] = 0; this.rampDeltaPending[v] = 0; this.autoFreeAfterRamp[v] = 0;
  }

  public scheduleRamp(v: number, startInBlock: number, frames: number, targetGain: number, autoFree: number): void {
    this.rampStartInBlock[v] = startInBlock; this.rampFramesLeft[v] = Math.max(1, frames);
    this.rampTargetGain[v] = targetGain; this.rampDelta[v] = 0;
    this.rampDeltaPending[v] = 1; this.autoFreeAfterRamp[v] = autoFree;
  }

  public findActiveVoice(trackId: number, playerIdx: number, voiceState: Uint8Array, voiceTrackId: Int32Array, voicePlayerIdx?: Uint8Array): number {
    if (trackId < 0) return -1;
    for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
      if (voiceState[v] !== VOICE_STATE_ACTIVE || voiceTrackId[v] !== trackId || this.mode[v] === BARULHO_MODE_NONE) continue;
      if (voicePlayerIdx && voicePlayerIdx[v] !== playerIdx) continue;
      return v;
    }
    return -1;
  }

  public applyControlOp(
    barulhoOp: number, trackId: number, startInBlock: number, metaRampSec: number, sr: number,
    voiceState: Uint8Array, voiceTrackId: Int32Array, voiceCurrentGain: Float32Array
  ): void {
    if (trackId < 0) return;
    for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
      if (voiceState[v] !== VOICE_STATE_ACTIVE || voiceTrackId[v] !== trackId || this.mode[v] === BARULHO_MODE_NONE) continue;
      if (barulhoOp === BARULHO_OP_FADEOUT_SLASH) {
        const sec = metaRampSec > 0.005 ? metaRampSec : 0.450;
        this.mode[v] = BARULHO_MODE_FADING_OUT; this.originCoord[v] = 0;
        this.scheduleRamp(v, startInBlock, Math.round(sec * sr), 0, 1);
      } else if (barulhoOp === BARULHO_OP_STOP_DOT) {
        const alreadySilent = this.mode[v] === BARULHO_MODE_FADING_OUT && voiceCurrentGain[v] <= 0.001;
        const sec = alreadySilent ? 0.002 : (metaRampSec > 0.005 ? metaRampSec : 0.035);
        this.mode[v] = BARULHO_MODE_FADING_OUT; this.originCoord[v] = 0;
        this.scheduleRamp(v, startInBlock, Math.round(sec * sr), 0, 1);
      }
    }
  }

  public prepareSpawnOrLegato(
    barulhoOp: number, seqId: number, trackId: number, playerIdx: number, startInBlock: number, peakGain: number,
    metaVal: number, sr: number, sample: WorkletSampleEntry,
    voiceState: Uint8Array, voiceTrackId: Int32Array, voicePlayerIdx: Uint8Array,
    voiceChokeStart: Uint8Array, voiceChokeLeft: Int32Array, voiceChokeDelta: Float32Array
  ): BarulhoSpawnPrep {
    const out = this.prepScratch, vAct = this.findActiveVoice(trackId, playerIdx, voiceState, voiceTrackId, voicePlayerIdx);
    const sampleSr = sample.sampleRate > 0 ? sample.sampleRate : sr;
    const hasLoop = sample.loopWrapFrame > sample.loopResumeFrame;
    if (barulhoOp === BARULHO_OP_ATTACK_B || barulhoOp === BARULHO_OP_PARTNER_B) {
      const coord = Math.round(metaVal);
      const prevCoord = vAct >= 0 ? this.originCoord[vAct] : 0;
      if (vAct >= 0 && this.mode[vAct] === BARULHO_MODE_ROLLING && coord > 0 && prevCoord > 0 && ((prevCoord - 1) & 0x7F) === ((coord - 1) & 0x7F) && this.originSeqId[vAct] !== seqId) {
        this.originCoord[vAct] = coord; this.originSeqId[vAct] = seqId; this.autoFreeAfterRamp[vAct] = 0;
        this.scheduleRamp(vAct, startInBlock, Math.round(0.060 * sr), peakGain, 0);
        out.handledLegato = true; return out;
      }
      if (vAct >= 0) {
        this.mode[vAct] = BARULHO_MODE_NONE; voiceState[vAct] = VOICE_STATE_CHOKING;
        voiceChokeStart[vAct] = startInBlock; voiceChokeLeft[vAct] = Math.max(1, Math.ceil(0.020 * sr)); voiceChokeDelta[vAct] = 0;
      }
      out.handledLegato = false; out.originCoord = coord; out.targetGain = peakGain;
      const decorrelIdx = playerIdx > 0 ? playerIdx : (barulhoOp === BARULHO_OP_PARTNER_B ? ((Math.max(0, trackId | 0) % 4) + 1) : 0);
      if (decorrelIdx > 0 && hasLoop) {
        out.initialReadPos = computeBarulhoDecorrelatedReadFrame(decorrelIdx, sample.loopResumeFrame, sample.loopWrapFrame, sampleSr);
        out.initialGain = 0; out.rampFrames = Math.max(1, Math.round(BARULHO_PARTNER_ATTACK_RAMP_SEC * sr));
      } else {
        out.initialReadPos = 0; out.initialGain = peakGain; out.rampFrames = 0;
      }
      return out;
    }

    const rampFrames = Math.max(1, Math.round((metaVal > 0.005 ? metaVal : 0.140) * sr));
    if (vAct >= 0) {
      this.mode[vAct] = BARULHO_MODE_ROLLING; this.scheduleRamp(vAct, startInBlock, rampFrames, peakGain, 0);
      out.handledLegato = true; return out;
    }
    out.handledLegato = false;
    out.initialReadPos = playerIdx > 0 && hasLoop
      ? computeBarulhoDecorrelatedReadFrame(playerIdx, sample.loopResumeFrame, sample.loopWrapFrame, sampleSr)
      : computeBarulhoSoftEntryFrame(trackId, sample.bodyStartFrame, sample.loopResumeFrame, sample.loopWrapFrame, sample.softEntryFrame);
    out.initialGain = 0; out.rampFrames = rampFrames; out.targetGain = peakGain; out.originCoord = 0;
    return out;
  }

  public initSpawnedVoice(v: number, seqId: number, startInBlock: number, sample: WorkletSampleEntry, prep: BarulhoSpawnPrep): void {
    this.resetVoice(v);
    this.mode[v] = BARULHO_MODE_ROLLING; this.originCoord[v] = prep.originCoord; this.originSeqId[v] = seqId;
    this.loopResumeFrame[v] = sample.loopResumeFrame; this.loopWrapFrame[v] = sample.loopWrapFrame;
    if (prep.rampFrames > 0) this.scheduleRamp(v, startInBlock, prep.rampFrames, prep.targetGain, 0);
  }

  public refreshSampleLoopBounds(
    sampleId: number, loopResume: number, loopWrap: number, voiceState: Uint8Array, voiceSampleId: Uint16Array, voiceReadPos: Float64Array
  ): void {
    for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
      if (voiceState[v] !== VOICE_STATE_ACTIVE || voiceSampleId[v] !== sampleId || this.mode[v] === BARULHO_MODE_NONE) continue;
      this.loopResumeFrame[v] = loopResume; this.loopWrapFrame[v] = loopWrap;
      if (loopWrap > loopResume && voiceReadPos[v] >= loopWrap) voiceReadPos[v] = loopResume;
    }
  }
}
