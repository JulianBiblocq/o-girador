/**
 * workletSkinPhysics.ts — Physique acoustique SOA Zéro-GC pour AudioWorklet (< 130 lignes).
 * Isolé strictement par `trackId` :
 * - Alfaia : `A/a` (25 ms), `D/E` (22 ms), `d/e` (ducking -3.5 dB / 35 ms sur `D/E` + choke 18 ms Barulho).
 * - Gonguê (`X`, `G/g/A/a`) & Timbal (`P/p`, `S/s`, `V/v`, `G/g/A/a/F/f`) : choke 20 ms sur `VOICE_CLASS_OPEN_RESONANT` + Barulho.
 * - Toute autre frappe (dont Mineiro `P/p`, Timbal `D/d`/`C/c`) : choke 18 ms uniquement sur Barulho actif.
 */
import { MAX_WORKLET_VOICES, VOICE_STATE_ACTIVE, VOICE_STATE_CHOKING } from '../percussionWorkletTypes';
import {
  ALFAIA_GHOST_DUCK_GAIN,
  CHOKE_ALFAIA_ABAFADO_25MS,
  CHOKE_ALFAIA_GHOST_DUCK_35MS,
  CHOKE_ALFAIA_STRONG_22MS,
  CHOKE_BARULHO_RELEASE_18MS,
  CHOKE_MODE_MASK,
  CHOKE_NONE,
  CHOKE_RESONANT_20MS,
  VOICE_CLASS_ALFAIA_STRONG,
  VOICE_CLASS_GENERIC,
  VOICE_CLASS_MASK,
  VOICE_CLASS_OPEN_RESONANT,
} from './workletEventFlags';

export * from './workletEventFlags';

export class WorkletSkinPhysicsSoa {
  public readonly voiceClass = new Uint8Array(MAX_WORKLET_VOICES);
  public readonly duckGain = new Float32Array(MAX_WORKLET_VOICES);
  public readonly duckTarget = new Float32Array(MAX_WORKLET_VOICES);
  public readonly duckStartInBlock = new Uint8Array(MAX_WORKLET_VOICES);
  public readonly duckFramesLeft = new Int32Array(MAX_WORKLET_VOICES);
  public readonly duckDelta = new Float32Array(MAX_WORKLET_VOICES);

  constructor() {
    this.duckGain.fill(1.0);
    this.duckTarget.fill(1.0);
  }

  public initVoice(v: number, vClass: number): void {
    this.voiceClass[v] = vClass & VOICE_CLASS_MASK;
    this.duckGain[v] = 1.0;
    this.duckTarget[v] = 1.0;
    this.duckStartInBlock[v] = 0;
    this.duckFramesLeft[v] = 0;
    this.duckDelta[v] = 0;
  }

  public applyTrigger(
    trackId: number,
    flags: number,
    evtFrame: number,
    startInBlock: number,
    contextSampleRate: number,
    voiceState: Uint8Array,
    voiceTrackId: Int32Array,
    voiceStartFrame: Float64Array,
    voiceChokeStartInBlock: Uint8Array,
    voiceChokeFramesLeft: Int32Array,
    voiceChokeDelta: Float32Array,
    barulhoMode: Uint8Array
  ): void {
    const mode = flags & CHOKE_MODE_MASK;
    if (mode === CHOKE_NONE || trackId < 0) return;
    const sr = contextSampleRate > 0 ? contextSampleRate : 48000;
    const barulhoChokeFrames = Math.max(1, Math.ceil(0.018 * sr));

    if (mode === CHOKE_BARULHO_RELEASE_18MS) {
      for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
        if (voiceState[v] === VOICE_STATE_ACTIVE && voiceTrackId[v] === trackId && voiceStartFrame[v] < evtFrame && barulhoMode[v] !== 0) {
          barulhoMode[v] = 0;
          voiceState[v] = VOICE_STATE_CHOKING;
          voiceChokeStartInBlock[v] = startInBlock;
          voiceChokeFramesLeft[v] = barulhoChokeFrames;
          voiceChokeDelta[v] = 0;
        }
      }
      return;
    }

    if (mode === CHOKE_RESONANT_20MS) {
      const choke20Frames = Math.max(1, Math.ceil(0.020 * sr));
      for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
        if (
          voiceState[v] === VOICE_STATE_ACTIVE && voiceTrackId[v] === trackId &&
          voiceStartFrame[v] < evtFrame && (this.voiceClass[v] === VOICE_CLASS_OPEN_RESONANT || barulhoMode[v] !== 0)
        ) {
          barulhoMode[v] = 0;
          voiceState[v] = VOICE_STATE_CHOKING;
          voiceChokeStartInBlock[v] = startInBlock;
          voiceChokeFramesLeft[v] = choke20Frames;
          voiceChokeDelta[v] = 0;
        }
      }
      return;
    }

    if (mode === CHOKE_ALFAIA_GHOST_DUCK_35MS) {
      const duckFrames = Math.max(1, Math.ceil(0.035 * sr));
      for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
        if (voiceState[v] !== VOICE_STATE_ACTIVE || voiceTrackId[v] !== trackId || voiceStartFrame[v] >= evtFrame) continue;
        if (barulhoMode[v] !== 0) {
          barulhoMode[v] = 0;
          voiceState[v] = VOICE_STATE_CHOKING;
          voiceChokeStartInBlock[v] = startInBlock;
          voiceChokeFramesLeft[v] = barulhoChokeFrames;
          voiceChokeDelta[v] = 0;
        } else if (this.voiceClass[v] === VOICE_CLASS_ALFAIA_STRONG && this.duckTarget[v] > ALFAIA_GHOST_DUCK_GAIN + 0.001) {
          this.duckTarget[v] = ALFAIA_GHOST_DUCK_GAIN;
          this.duckStartInBlock[v] = startInBlock;
          this.duckFramesLeft[v] = duckFrames;
          this.duckDelta[v] = (ALFAIA_GHOST_DUCK_GAIN - this.duckGain[v]) / duckFrames;
        }
      }
      return;
    }

    const durSec = mode === CHOKE_ALFAIA_ABAFADO_25MS ? 0.025 : (mode === CHOKE_ALFAIA_STRONG_22MS ? 0.022 : 0.008);
    const alfaiaSkinOnly = mode === CHOKE_ALFAIA_ABAFADO_25MS || mode === CHOKE_ALFAIA_STRONG_22MS;
    const chokeFrames = Math.max(1, Math.ceil(durSec * sr));

    for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
      if (
        voiceState[v] === VOICE_STATE_ACTIVE && voiceTrackId[v] === trackId &&
        voiceStartFrame[v] < evtFrame && (!alfaiaSkinOnly || this.voiceClass[v] !== VOICE_CLASS_GENERIC || barulhoMode[v] !== 0)
      ) {
        barulhoMode[v] = 0;
        voiceState[v] = VOICE_STATE_CHOKING;
        voiceChokeStartInBlock[v] = startInBlock;
        voiceChokeFramesLeft[v] = chokeFrames;
        voiceChokeDelta[v] = 0;
      }
    }
  }
}
