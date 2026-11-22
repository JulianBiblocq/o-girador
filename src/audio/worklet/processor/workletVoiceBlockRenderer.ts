/**
 * workletVoiceBlockRenderer.ts — Rendu SOA Zéro-GC d'une voix sur un bloc AudioWorklet (< 130 lignes).
 * - Interpolation linéaire, panoramique stéréo/distance par joueur (`slotPlayerGainL/R`), micro-detune, Barulho sans couture & LP Choke Timbal.
 */
import {
  MAX_WORKLET_PLAYERS_PER_SLOT, VOICE_STATE_ACTIVE, VOICE_STATE_CHOKING, VOICE_STATE_FREE, WorkletSampleEntry,
} from '../percussionWorkletTypes';
import { BARULHO_MODE_NONE } from './workletBarulhoSoa';
import { TIMBAL_LP_STAGE_HZ } from './workletEventFlags';
import { WorkletVoicePoolSoa } from './workletVoicePoolSoa';

export function renderWorkletVoiceInBlock(
  v: number,
  blockFrames: number,
  sr: number,
  lpAlpha: number,
  pool: WorkletVoicePoolSoa,
  sample: WorkletSampleEntry,
  outChannels: Float32Array[],
  slotMuted: Uint8Array,
  slotPitchRatio: Float32Array,
  slotPlayerGainL?: Float32Array,
  slotPlayerGainR?: Float32Array,
  slotPlayerPitchMul?: Float32Array
): void {
  const phys = pool.skinPhysics, bar = pool.barulho;
  const slot = pool.voiceSlot[v];
  let state = pool.voiceState[v], bMode = bar.mode[v];

  if (slot < slotMuted.length && slotMuted[slot] === 1 && state === VOICE_STATE_ACTIVE) {
    state = VOICE_STATE_CHOKING; bMode = BARULHO_MODE_NONE;
    pool.voiceChokeStartInBlock[v] = 0; pool.voiceChokeFramesLeft[v] = Math.max(1, Math.ceil(0.005 * sr)); pool.voiceChokeDelta[v] = 0;
  }

  const outL = outChannels[0], outR = outChannels[1] || outL;
  const ch0 = sample.ch0, ch1 = sample.ch1, maxSampleIdx = sample.length - 1;
  const pBase = slot * MAX_WORKLET_PLAYERS_PER_SLOT + pool.voicePlayerIdx[v];
  const pGainL = slotPlayerGainL && pBase < slotPlayerGainL.length ? slotPlayerGainL[pBase] : 1.0;
  const pGainR = slotPlayerGainR && pBase < slotPlayerGainR.length ? slotPlayerGainR[pBase] : 1.0;
  const pPitch = slotPlayerPitchMul && pBase < slotPlayerPitchMul.length && slotPlayerPitchMul[pBase] > 0 ? slotPlayerPitchMul[pBase] : 1.0;
  const pitchStep = pool.voiceSampleRateRatio[v] * pool.voiceEventPitchNuance[v] * (slotPitchRatio[slot] > 0 ? slotPitchRatio[slot] : 1.0) * pPitch;
  const startFrame = pool.voiceStartInBlock[v]; pool.voiceStartInBlock[v] = 0;

  let readPos = pool.voiceReadPos[v], gain = pool.voiceCurrentGain[v], elapsed = pool.voiceElapsedFrames[v];
  const holdFrames = pool.voiceHoldFrames[v], midRelFrames = pool.voiceMidRelFrames[v];
  const relEndFrames = pool.voiceRelEndFrames[v], endFrames = pool.voiceEndFrames[v];
  const isFull = pool.voiceIsFullBuffer[v], peakGain = pool.voicePeakGain[v];
  const linStep1 = pool.voiceLinStep1[v], expMul = pool.voiceExpMul[v], linStep2 = pool.voiceLinStep2[v];
  const chokeStart = pool.voiceChokeStartInBlock[v], duckStart = phys.duckStartInBlock[v];
  let chokeLeft = pool.voiceChokeFramesLeft[v], chokeDelta = pool.voiceChokeDelta[v];
  let duck = phys.duckGain[v], duckLeft = phys.duckFramesLeft[v];
  const duckDelta = phys.duckDelta[v];
  const loopWrap = bar.loopWrapFrame[v], loopSpan = loopWrap - bar.loopResumeFrame[v], rampStart = bar.rampStartInBlock[v];
  let rampLeft = bar.rampFramesLeft[v], rampDelta = bar.rampDelta[v], rampPending = bar.rampDeltaPending[v];
  const rampTarget = bar.rampTargetGain[v], autoFree = bar.autoFreeAfterRamp[v];

  const isLp = phys.lpActive[v] === 1, lpStart = phys.lpStartInBlock[v], vAlpha = phys.velLpAlpha[v];
  let lpMixLeft = phys.lpMixFramesLeft[v], lpMix = phys.lpMix[v];
  const lpMixDelta = phys.lpMixDelta[v];
  let lpL1 = phys.lpStateL1[v], lpL2 = phys.lpStateL2[v], lpR1 = phys.lpStateR1[v], lpR2 = phys.lpStateR2[v];
  let vLpL = phys.velLpL[v], vLpR = phys.velLpR[v];

  for (let i = startFrame; i < blockFrames; i++) {
    if (bMode !== BARULHO_MODE_NONE || (state === VOICE_STATE_CHOKING && loopWrap > 0 && loopSpan > 0)) {
      if (loopWrap > 0 && loopSpan > 0 && readPos >= loopWrap) readPos -= loopSpan;
      else if (readPos >= maxSampleIdx) { state = VOICE_STATE_FREE; gain = 0; break; }
    } else if (readPos >= maxSampleIdx || elapsed >= endFrames) {
      state = VOICE_STATE_FREE; gain = 0; break;
    }

    if (state === VOICE_STATE_CHOKING && i >= chokeStart) {
      if (chokeDelta === 0) chokeDelta = -gain / Math.max(1, chokeLeft);
      gain += chokeDelta; chokeLeft--;
      if (chokeLeft <= 0 || gain <= 0.00001) { state = VOICE_STATE_FREE; bMode = BARULHO_MODE_NONE; bar.loopWrapFrame[v] = 0; gain = 0; break; }
    } else if (bMode !== BARULHO_MODE_NONE) {
      if (rampLeft > 0 && i >= rampStart) {
        if (rampPending === 1) { rampDelta = (rampTarget - gain) / rampLeft; rampPending = 0; }
        gain += rampDelta; rampLeft--;
        if (rampLeft <= 0) {
          gain = rampTarget;
          if (autoFree === 1 && gain <= 0.00001) { state = VOICE_STATE_FREE; bMode = BARULHO_MODE_NONE; gain = 0; break; }
        }
        if (gain < 0) gain = 0;
      }
    } else {
      if (elapsed < holdFrames) gain = peakGain;
      else if (isFull === 1) gain += linStep2;
      else if (elapsed < midRelFrames) gain += linStep1;
      else if (elapsed < relEndFrames) gain *= expMul;
      else gain += linStep2;
      if (gain < 0) gain = 0;
    }
    if (duckLeft > 0 && i >= duckStart) { duck += duckDelta; duckLeft--; }

    const effGain = gain * duck, idx = readPos | 0, frac = readPos - idx;
    let s0 = ch0[idx] + frac * (ch0[idx + 1] - ch0[idx]);
    if (vAlpha > 0) { vLpL += vAlpha * (s0 - vLpL); s0 = vLpL; }
    if (isLp) {
      lpL1 += lpAlpha * (s0 - lpL1); lpL2 += lpAlpha * (lpL1 - lpL2);
      if (i >= lpStart) {
        if (lpMixLeft > 0) { lpMix += lpMixDelta; lpMixLeft--; if (lpMixLeft <= 0) lpMix = 1.0; }
        s0 += lpMix * (lpL2 - s0);
      }
    }
    outL[i] += s0 * effGain * pGainL;

    if (ch1 !== null) {
      let s1 = ch1[idx] + frac * (ch1[idx + 1] - ch1[idx]);
      if (vAlpha > 0) { vLpR += vAlpha * (s1 - vLpR); s1 = vLpR; }
      if (isLp) {
        lpR1 += lpAlpha * (s1 - lpR1); lpR2 += lpAlpha * (lpR1 - lpR2);
        if (i >= lpStart) s1 += lpMix * (lpR2 - s1);
      }
      outR[i] += s1 * effGain * pGainR;
    } else if (outR !== outL) {
      outR[i] += s0 * effGain * pGainR;
    }

    readPos += pitchStep; elapsed++;
  }

  pool.voiceState[v] = state; pool.voiceReadPos[v] = readPos; pool.voiceCurrentGain[v] = gain; pool.voiceElapsedFrames[v] = elapsed;
  pool.voiceChokeStartInBlock[v] = 0; pool.voiceChokeFramesLeft[v] = chokeLeft; pool.voiceChokeDelta[v] = chokeDelta;
  phys.duckGain[v] = duck; phys.duckStartInBlock[v] = 0; phys.duckFramesLeft[v] = duckLeft;
  if (vAlpha > 0) { phys.velLpL[v] = vLpL; phys.velLpR[v] = vLpR; }
  if (isLp) {
    phys.lpStartInBlock[v] = 0; phys.lpMixFramesLeft[v] = lpMixLeft; phys.lpMix[v] = lpMix;
    phys.lpStateL1[v] = lpL1; phys.lpStateL2[v] = lpL2; phys.lpStateR1[v] = lpR1; phys.lpStateR2[v] = lpR2;
  }
  bar.mode[v] = bMode; bar.rampStartInBlock[v] = 0; bar.rampFramesLeft[v] = rampLeft; bar.rampDelta[v] = rampDelta; bar.rampDeltaPending[v] = rampPending;
}

export function computeTimbalLpStageAlpha(sr: number): number {
  return 1 - Math.exp((-2 * Math.PI * TIMBAL_LP_STAGE_HZ) / (sr > 0 ? sr : 48000));
}
