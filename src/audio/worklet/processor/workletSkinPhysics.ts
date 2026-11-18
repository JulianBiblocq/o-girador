/**
 * workletSkinPhysics.ts — Physique acoustique SOA Zéro-GC pour AudioWorklet (< 140 lignes).
 * Isolé strictement par `trackId` :
 * - Gonguê : `X` (20 ms tout), `G/A` (20 ms B/b + duck -6 dB / 25 ms sur G/A), `g/a` libres.
 * - Agbê (`D/E/S`) & Mineiro (`P/T`) : 25 ms sur `V/L` + `B/b` + inversion forte opposée ; `d/e`/`p/t` libres.
 * - Apito : monophonie 20 ms (`C` <-> `L/l/C`).
 * - Timbal : `P/p` & `S/s` déclenchent le Low-Pass Choke `< 160 Hz` (15 ms) + extinction 150 ms sur `G/g`.
 */
import { MAX_WORKLET_VOICES, VOICE_STATE_ACTIVE, VOICE_STATE_CHOKING } from '../percussionWorkletTypes';
import {
  ALFAIA_GHOST_DUCK_GAIN, BARULHO_OP_MASK, BARULHO_OP_NONE, BARULHO_OP_SHIFT,
  CHOKE_ALFAIA_ABAFADO_25MS, CHOKE_ALFAIA_GHOST_DUCK_35MS, CHOKE_ALFAIA_STRONG_22MS,
  CHOKE_APITO_20MS, CHOKE_BARULHO_RELEASE_18MS, CHOKE_GONGUE_OPEN_STRONG, CHOKE_MODE_MASK,
  CHOKE_NONE, CHOKE_RESONANT_20MS, CHOKE_SHAKER_NEG_25MS, CHOKE_SHAKER_NEUTRAL_25MS,
  CHOKE_SHAKER_POS_25MS, CHOKE_TIMBAL_BASS_22MS, CHOKE_TIMBAL_OPEN_20MS, CHOKE_TIMBAL_PRESO_SLAP_LP,
  GONGUE_OPEN_DUCK_GAIN, TIMBAL_LP_AIR_DECAY_SEC, TIMBAL_LP_MIX_RAMP_SEC,
  VOICE_CLASS_ALFAIA_STRONG, VOICE_CLASS_APITO_SHORT, VOICE_CLASS_GENERIC, VOICE_CLASS_GONGUE_OPEN_WEAK,
  VOICE_CLASS_MASK, VOICE_CLASS_OPEN_RESONANT, VOICE_CLASS_SHAKER_LONG, VOICE_CLASS_SHAKER_NEG,
  VOICE_CLASS_SHAKER_POS, VOICE_CLASS_TIMBAL_BASS, VOICE_CLASS_TIMBAL_OPEN, VOICE_CLASS_TIMBAL_SLAP,
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

  private chokeSlot(
    v: number, frames: number, startInBlock: number, voiceState: Uint8Array,
    chokeStart: Uint8Array, chokeLeft: Int32Array, chokeDelta: Float32Array, barulhoMode: Uint8Array
  ): void {
    barulhoMode[v] = 0; voiceState[v] = VOICE_STATE_CHOKING;
    chokeStart[v] = startInBlock; chokeLeft[v] = frames; chokeDelta[v] = 0;
  }

  private duckSlot(v: number, targetMul: number, frames: number, startInBlock: number): void {
    const nextTarget = Math.max(0.125, this.duckTarget[v] * targetMul);
    this.duckTarget[v] = nextTarget;
    this.duckStartInBlock[v] = startInBlock;
    this.duckFramesLeft[v] = frames;
    this.duckDelta[v] = (nextTarget - this.duckGain[v]) / frames;
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
    const f18 = Math.max(1, Math.ceil(0.018 * sr)), f20 = Math.max(1, Math.ceil(0.020 * sr));
    const f22 = Math.max(1, Math.ceil(0.022 * sr)), f25 = Math.max(1, Math.ceil(0.025 * sr));

    for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
      const st = voiceState[v];
      if (st === 0 || voiceTrackId[v] !== trackId || voiceStartFrame[v] >= evtFrame) continue;
      const cls = this.voiceClass[v], isBar = barulhoMode[v] !== 0;

      if (mode === CHOKE_TIMBAL_BASS_22MS && cls === VOICE_CLASS_TIMBAL_BASS) {
        if (st === VOICE_STATE_ACTIVE || chokeLeft[v] > f22) this.chokeSlot(v, f22, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
        continue;
      }
      if (st !== VOICE_STATE_ACTIVE) continue;

      if (mode === CHOKE_BARULHO_RELEASE_18MS) {
        if (isBar) this.chokeSlot(v, f18, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
      } else if (mode === CHOKE_RESONANT_20MS) {
        if (isBar || cls === VOICE_CLASS_OPEN_RESONANT || cls === VOICE_CLASS_GONGUE_OPEN_WEAK) this.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
      } else if (mode === CHOKE_GONGUE_OPEN_STRONG) {
        if (isBar) this.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
        else if (cls === VOICE_CLASS_OPEN_RESONANT) this.duckSlot(v, GONGUE_OPEN_DUCK_GAIN, f25, startInBlock);
      } else if (mode === CHOKE_SHAKER_POS_25MS || mode === CHOKE_SHAKER_NEG_25MS || mode === CHOKE_SHAKER_NEUTRAL_25MS) {
        const opp = mode === CHOKE_SHAKER_POS_25MS ? VOICE_CLASS_SHAKER_NEG : (mode === CHOKE_SHAKER_NEG_25MS ? VOICE_CLASS_SHAKER_POS : -1);
        if (isBar || cls === VOICE_CLASS_SHAKER_LONG || cls === opp) this.chokeSlot(v, f25, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
      } else if (mode === CHOKE_APITO_20MS) {
        if (cls === VOICE_CLASS_APITO_SHORT || (!isBarOp && isBar)) this.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
      } else if (mode === CHOKE_TIMBAL_BASS_22MS) {
        if (isBar) this.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
      } else if (mode === CHOKE_TIMBAL_OPEN_20MS) {
        if (isBar || cls === VOICE_CLASS_TIMBAL_OPEN || cls === VOICE_CLASS_TIMBAL_SLAP) this.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
      } else if (mode === CHOKE_TIMBAL_PRESO_SLAP_LP) {
        if (cls === VOICE_CLASS_TIMBAL_BASS) {
          const lpFrames = Math.max(1, Math.ceil(TIMBAL_LP_MIX_RAMP_SEC * sr));
          this.lpActive[v] = 1; this.lpStartInBlock[v] = startInBlock;
          this.lpMixFramesLeft[v] = lpFrames; this.lpMixDelta[v] = (1.0 - this.lpMix[v]) / lpFrames;
          this.chokeSlot(v, Math.max(1, Math.ceil(TIMBAL_LP_AIR_DECAY_SEC * sr)), startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
        } else if (isBar || cls === VOICE_CLASS_TIMBAL_OPEN || cls === VOICE_CLASS_TIMBAL_SLAP) {
          this.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
        }
      } else if (mode === CHOKE_ALFAIA_GHOST_DUCK_35MS) {
        if (isBar) this.chokeSlot(v, f18, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
        else if (cls === VOICE_CLASS_ALFAIA_STRONG && this.duckTarget[v] > ALFAIA_GHOST_DUCK_GAIN + 0.001) {
          const df = Math.max(1, Math.ceil(0.035 * sr));
          this.duckTarget[v] = ALFAIA_GHOST_DUCK_GAIN; this.duckStartInBlock[v] = startInBlock;
          this.duckFramesLeft[v] = df; this.duckDelta[v] = (ALFAIA_GHOST_DUCK_GAIN - this.duckGain[v]) / df;
        }
      } else {
        const dur = mode === CHOKE_ALFAIA_ABAFADO_25MS ? f25 : (mode === CHOKE_ALFAIA_STRONG_22MS ? f22 : Math.max(1, Math.ceil(0.008 * sr)));
        const skinOnly = mode === CHOKE_ALFAIA_ABAFADO_25MS || mode === CHOKE_ALFAIA_STRONG_22MS;
        if (!skinOnly || cls !== VOICE_CLASS_GENERIC || isBar) this.chokeSlot(v, dur, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
      }
    }
  }
}
