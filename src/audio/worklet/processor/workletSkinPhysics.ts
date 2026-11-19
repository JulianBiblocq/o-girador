/**
 * workletSkinPhysics.ts — Physique acoustique SOA Zéro-GC pour AudioWorklet (< 115 lignes).
 * Isolé strictement par `trackId` : Alfaias, Caixa (`20 ms` Barulho, `-5.5 dB / 28 ms` ring damp, immunité `X/C`),
 * Gonguê, Agbê, Mineiro, Apito et Timbal Low-Pass Choke `< 160 Hz`.
 */
import { MAX_WORKLET_VOICES, VOICE_STATE_ACTIVE, VOICE_STATE_CHOKING } from '../percussionWorkletTypes';
import { executeWorkletVoiceChokeMode } from './workletChokeModeExecutor';
import {
  BARULHO_OP_MASK,
  BARULHO_OP_NONE,
  BARULHO_OP_SHIFT,
  CHOKE_MODE_MASK,
  CHOKE_NONE,
  CHOKE_TIMBAL_BASS_22MS,
  VOICE_CLASS_MASK,
  VOICE_CLASS_TIMBAL_BASS,
} from './workletEventFlags';

export * from './workletEventFlags';

export class WorkletSkinPhysicsSoa {
  public readonly voiceClass = new Uint8Array(MAX_WORKLET_VOICES);
  public readonly duckGain = new Float32Array(MAX_WORKLET_VOICES);
  public readonly duckTarget = new Float32Array(MAX_WORKLET_VOICES);
  public readonly duckStartInBlock = new Uint8Array(MAX_WORKLET_VOICES);
  public readonly duckFramesLeft = new Int32Array(MAX_WORKLET_VOICES);
  public readonly duckDelta = new Float32Array(MAX_WORKLET_VOICES);
  public readonly lpActive = new Uint8Array(MAX_WORKLET_VOICES);
  public readonly lpStartInBlock = new Uint8Array(MAX_WORKLET_VOICES);
  public readonly lpMixFramesLeft = new Int32Array(MAX_WORKLET_VOICES);
  public readonly lpMix = new Float32Array(MAX_WORKLET_VOICES);
  public readonly lpMixDelta = new Float32Array(MAX_WORKLET_VOICES);
  public readonly lpStateL1 = new Float32Array(MAX_WORKLET_VOICES);
  public readonly lpStateL2 = new Float32Array(MAX_WORKLET_VOICES);
  public readonly lpStateR1 = new Float32Array(MAX_WORKLET_VOICES);
  public readonly lpStateR2 = new Float32Array(MAX_WORKLET_VOICES);

  constructor() {
    this.duckGain.fill(1.0);
    this.duckTarget.fill(1.0);
  }

  public initVoice(v: number, vClass: number): void {
    this.voiceClass[v] = vClass & VOICE_CLASS_MASK;
    this.duckGain[v] = 1.0; this.duckTarget[v] = 1.0;
    this.duckStartInBlock[v] = 0; this.duckFramesLeft[v] = 0; this.duckDelta[v] = 0;
    this.lpActive[v] = 0; this.lpStartInBlock[v] = 0; this.lpMixFramesLeft[v] = 0;
    this.lpMix[v] = 0; this.lpMixDelta[v] = 0;
    this.lpStateL1[v] = 0; this.lpStateL2[v] = 0; this.lpStateR1[v] = 0; this.lpStateR2[v] = 0;
  }

  public chokeSlot(
    v: number, frames: number, startInBlock: number, voiceState: Uint8Array,
    chokeStart: Uint8Array, chokeLeft: Int32Array, chokeDelta: Float32Array, barulhoMode: Uint8Array
  ): void {
    barulhoMode[v] = 0; voiceState[v] = VOICE_STATE_CHOKING;
    chokeStart[v] = startInBlock; chokeLeft[v] = frames; chokeDelta[v] = 0;
  }

  public duckSlot(v: number, targetMul: number, frames: number, startInBlock: number, minFloor = 0.125): void {
    const nextTarget = Math.max(minFloor, this.duckTarget[v] * targetMul);
    this.duckTarget[v] = nextTarget;
    this.duckStartInBlock[v] = startInBlock;
    this.duckFramesLeft[v] = frames;
    this.duckDelta[v] = (nextTarget - this.duckGain[v]) / frames;
  }

  public duckNonCumulativeSlot(v: number, absTarget: number, frames: number, startInBlock: number): void {
    this.duckTarget[v] = absTarget;
    this.duckStartInBlock[v] = startInBlock;
    this.duckFramesLeft[v] = frames;
    this.duckDelta[v] = (absTarget - this.duckGain[v]) / frames;
  }

  public applyTrigger(
    trackId: number, flags: number, evtFrame: number, startInBlock: number, contextSampleRate: number,
    voiceState: Uint8Array, voiceTrackId: Int32Array, voiceStartFrame: Float64Array,
    chokeStart: Uint8Array, chokeLeft: Int32Array, chokeDelta: Float32Array, barulhoMode: Uint8Array
  ): void {
    const mode = flags & CHOKE_MODE_MASK;
    if (mode === CHOKE_NONE || trackId < 0) return;
    const sr = contextSampleRate > 0 ? contextSampleRate : 48000;
    const isBarOp = ((flags >>> BARULHO_OP_SHIFT) & BARULHO_OP_MASK) !== BARULHO_OP_NONE;
    const f22 = Math.max(1, Math.ceil(0.022 * sr));

    for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
      const st = voiceState[v];
      if (st === 0 || voiceTrackId[v] !== trackId || voiceStartFrame[v] >= evtFrame) continue;
      const cls = this.voiceClass[v], isBar = barulhoMode[v] !== 0;

      if (mode === CHOKE_TIMBAL_BASS_22MS && cls === VOICE_CLASS_TIMBAL_BASS) {
        if (st === VOICE_STATE_ACTIVE || chokeLeft[v] > f22) {
          this.chokeSlot(v, f22, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
        }
        continue;
      }
      if (st !== VOICE_STATE_ACTIVE) continue;

      executeWorkletVoiceChokeMode(
        this, v, mode, cls, isBar, isBarOp, startInBlock, sr,
        voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode
      );
    }
  }
}
