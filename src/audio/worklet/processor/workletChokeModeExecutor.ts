/**
 * workletChokeModeExecutor.ts — Exécution Zéro-GC par voix active d'un mode de Choke/Duck SOA (< 85 lignes).
 * Isolé par `trackId` : Alfaias, Caixa Studio (`20 ms` Barulho, `-5.5 dB / 28 ms` ring damp, immunité `X/C`),
 * Gonguê, Agbê, Mineiro, Apito et Timbal Low-Pass Choke `< 160 Hz`.
 */
import {
  ALFAIA_GHOST_DUCK_GAIN,
  CHOKE_ALFAIA_ABAFADO_25MS,
  CHOKE_ALFAIA_GHOST_DUCK_35MS,
  CHOKE_ALFAIA_STRONG_22MS,
  CHOKE_APITO_20MS,
  CHOKE_BARULHO_RELEASE_18MS,
  CHOKE_BARULHO_RELEASE_20MS,
  CHOKE_GONGUE_OPEN_STRONG,
  CHOKE_RESONANT_20MS,
  CHOKE_SHAKER_NEG_25MS,
  CHOKE_SHAKER_NEUTRAL_25MS,
  CHOKE_SHAKER_POS_25MS,
  CHOKE_SNARE_GHOST_TOUCH_35MS,
  CHOKE_SNARE_STRONG_DAMP_28MS,
  CHOKE_TIMBAL_BASS_22MS,
  CHOKE_TIMBAL_OPEN_20MS,
  CHOKE_TIMBAL_PRESO_SLAP_LP,
  GONGUE_OPEN_DUCK_GAIN,
  SNARE_GHOST_TOUCH_DUCK_GAIN,
  SNARE_STRONG_RING_DUCK_GAIN,
  TIMBAL_LP_AIR_DECAY_SEC,
  TIMBAL_LP_MIX_RAMP_SEC,
  VOICE_CLASS_ALFAIA_STRONG,
  VOICE_CLASS_APITO_SHORT,
  VOICE_CLASS_GENERIC,
  VOICE_CLASS_GONGUE_OPEN_WEAK,
  VOICE_CLASS_OPEN_RESONANT,
  VOICE_CLASS_SHAKER_LONG,
  VOICE_CLASS_SHAKER_NEG,
  VOICE_CLASS_SHAKER_POS,
  VOICE_CLASS_SNARE_OPEN,
  VOICE_CLASS_TIMBAL_BASS,
  VOICE_CLASS_TIMBAL_OPEN,
  VOICE_CLASS_TIMBAL_SLAP,
  WorkletSkinPhysicsTarget,
} from './workletEventFlags';

export function executeWorkletVoiceChokeMode(
  phys: WorkletSkinPhysicsTarget,
  v: number,
  mode: number,
  cls: number,
  isBar: boolean,
  isBarOp: boolean,
  startInBlock: number,
  sr: number,
  voiceState: Uint8Array,
  chokeStart: Uint8Array,
  chokeLeft: Int32Array,
  chokeDelta: Float32Array,
  barulhoMode: Uint8Array
): void {
  const f18 = Math.max(1, Math.ceil(0.018 * sr)), f20 = Math.max(1, Math.ceil(0.020 * sr));
  const f22 = Math.max(1, Math.ceil(0.022 * sr)), f25 = Math.max(1, Math.ceil(0.025 * sr));

  if (mode === CHOKE_BARULHO_RELEASE_18MS) {
    if (isBar) phys.chokeSlot(v, f18, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
  } else if (mode === CHOKE_BARULHO_RELEASE_20MS) {
    if (isBar) phys.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
  } else if (mode === CHOKE_SNARE_STRONG_DAMP_28MS) {
    if (isBar) phys.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
    else if (cls === VOICE_CLASS_SNARE_OPEN) phys.duckSlot(v, SNARE_STRONG_RING_DUCK_GAIN, Math.max(1, Math.ceil(0.028 * sr)), startInBlock, 0.0625);
  } else if (mode === CHOKE_SNARE_GHOST_TOUCH_35MS) {
    if (isBar) phys.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
    else if (cls === VOICE_CLASS_SNARE_OPEN && phys.duckTarget[v] > SNARE_GHOST_TOUCH_DUCK_GAIN + 0.001) {
      phys.duckNonCumulativeSlot(v, SNARE_GHOST_TOUCH_DUCK_GAIN, Math.max(1, Math.ceil(0.035 * sr)), startInBlock);
    }
  } else if (mode === CHOKE_RESONANT_20MS) {
    if (isBar || cls === VOICE_CLASS_OPEN_RESONANT || cls === VOICE_CLASS_GONGUE_OPEN_WEAK) {
      phys.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
    }
  } else if (mode === CHOKE_GONGUE_OPEN_STRONG) {
    if (isBar) phys.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
    else if (cls === VOICE_CLASS_OPEN_RESONANT) phys.duckSlot(v, GONGUE_OPEN_DUCK_GAIN, f25, startInBlock);
  } else if (mode === CHOKE_SHAKER_POS_25MS || mode === CHOKE_SHAKER_NEG_25MS || mode === CHOKE_SHAKER_NEUTRAL_25MS) {
    const opp = mode === CHOKE_SHAKER_POS_25MS ? VOICE_CLASS_SHAKER_NEG : (mode === CHOKE_SHAKER_NEG_25MS ? VOICE_CLASS_SHAKER_POS : -1);
    if (isBar || cls === VOICE_CLASS_SHAKER_LONG || cls === opp) phys.chokeSlot(v, f25, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
  } else if (mode === CHOKE_APITO_20MS) {
    if (cls === VOICE_CLASS_APITO_SHORT || (!isBarOp && isBar)) phys.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
  } else if (mode === CHOKE_TIMBAL_BASS_22MS) {
    if (isBar) phys.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
  } else if (mode === CHOKE_TIMBAL_OPEN_20MS) {
    if (isBar || cls === VOICE_CLASS_TIMBAL_OPEN || cls === VOICE_CLASS_TIMBAL_SLAP) phys.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
  } else if (mode === CHOKE_TIMBAL_PRESO_SLAP_LP) {
    if (cls === VOICE_CLASS_TIMBAL_BASS) {
      const lpFrames = Math.max(1, Math.ceil(TIMBAL_LP_MIX_RAMP_SEC * sr));
      phys.lpActive[v] = 1; phys.lpStartInBlock[v] = startInBlock;
      phys.lpMixFramesLeft[v] = lpFrames; phys.lpMixDelta[v] = (1.0 - phys.lpMix[v]) / lpFrames;
      phys.chokeSlot(v, Math.max(1, Math.ceil(TIMBAL_LP_AIR_DECAY_SEC * sr)), startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
    } else if (isBar || cls === VOICE_CLASS_TIMBAL_OPEN || cls === VOICE_CLASS_TIMBAL_SLAP) {
      phys.chokeSlot(v, f20, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
    }
  } else if (mode === CHOKE_ALFAIA_GHOST_DUCK_35MS) {
    if (isBar) phys.chokeSlot(v, f18, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
    else if (cls === VOICE_CLASS_ALFAIA_STRONG && phys.duckTarget[v] > ALFAIA_GHOST_DUCK_GAIN + 0.001) {
      phys.duckNonCumulativeSlot(v, ALFAIA_GHOST_DUCK_GAIN, Math.max(1, Math.ceil(0.035 * sr)), startInBlock);
    }
  } else {
    const dur = mode === CHOKE_ALFAIA_ABAFADO_25MS ? f25 : (mode === CHOKE_ALFAIA_STRONG_22MS ? f22 : Math.max(1, Math.ceil(0.008 * sr)));
    const skinOnly = mode === CHOKE_ALFAIA_ABAFADO_25MS || mode === CHOKE_ALFAIA_STRONG_22MS;
    if (!skinOnly || cls !== VOICE_CLASS_GENERIC || isBar) phys.chokeSlot(v, dur, startInBlock, voiceState, chokeStart, chokeLeft, chokeDelta, barulhoMode);
  }
}
