/**
 * O Girador - Noyau DSP Temps-Réel AudioWorklet (Bloc de 128 frames, 0 GC) (< 142 lignes)
 * - Enveloppe progressive Hold+Decay + Physique de peau SOA + Boucle Barulho sans couture (cos/sin 110 ms pré-calculé).
 */

import {
  MAX_WORKLET_VOICES, VOICE_STATE_FREE, VOICE_STATE_ACTIVE, VOICE_STATE_CHOKING, WorkletSampleEntry,
} from '../percussionWorkletTypes';
import { BARULHO_MODE_NONE } from './workletBarulhoSoa';
import {
  BARULHO_OP_FADEOUT_SLASH, BARULHO_OP_MASK, BARULHO_OP_SHIFT, BARULHO_OP_STOP_DOT,
} from './workletEventFlags';
import { WorkletEventQueue } from './workletEventQueue';
import { WorkletVoicePoolSoa } from './workletVoicePoolSoa';

export function processWorkletDspBlock(
  outputs: Float32Array[][],
  currentFrame: number,
  contextSampleRate: number,
  queue: WorkletEventQueue,
  pool: WorkletVoicePoolSoa,
  samples: (WorkletSampleEntry | undefined)[],
  slotMuted: Uint8Array,
  slotPitchRatio: Float32Array,
  slotDecayNorm: Float32Array
): void {
  const sr = contextSampleRate > 0 ? contextSampleRate : 48000;
  const firstOut = outputs[0];
  const blockFrames = (firstOut && firstOut[0]) ? firstOut[0].length : 128;
  const blockEndFrame = currentFrame + blockFrames;
  const lateThresholdFrame = currentFrame - sr * 0.120;
  const phys = pool.skinPhysics, bar = pool.barulho;

  while (queue.activeCount > 0) {
    const sIdx = queue.peekEarliestStorageIdx();
    const evtFrame = queue.triggerFrame[sIdx];
    if (evtFrame >= blockEndFrame) break;
    queue.popEarliest();
    if (evtFrame < lateThresholdFrame) continue;

    const slot = queue.slot[sIdx];
    if (slot < slotMuted.length && slotMuted[slot] === 1) continue;

    const startInBlock = evtFrame <= currentFrame ? 0 : Math.min(blockFrames - 1, Math.floor(evtFrame - currentFrame));
    const trackId = queue.trackId[sIdx], flags = queue.flags[sIdx];
    const barulhoOp = (flags >>> BARULHO_OP_SHIFT) & BARULHO_OP_MASK;

    if (barulhoOp === BARULHO_OP_FADEOUT_SLASH || barulhoOp === BARULHO_OP_STOP_DOT) {
      bar.applyControlOp(barulhoOp, trackId, startInBlock, queue.stepDecayNorm[sIdx], sr, pool.voiceState, pool.voiceTrackId, pool.voiceCurrentGain);
      continue;
    }

    pool.applyEventPhysics(trackId, flags, evtFrame, startInBlock, sr);
    const sampleId = queue.sampleId[sIdx], sample = samples[sampleId];
    if (sample) {
      pool.spawnVoice(
        evtFrame, startInBlock, trackId, slot, sampleId, sample,
        queue.velocity[sIdx], queue.strokeBaseGain[sIdx], queue.stepDecayNorm[sIdx],
        queue.eventPitchNuance[sIdx], slotPitchRatio[slot] || 1.0, slotDecayNorm[slot] || 1.0, sr, flags
      );
    }
  }

  for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
    let state = pool.voiceState[v];
    if (state === VOICE_STATE_FREE) continue;

    const slot = pool.voiceSlot[v], outChannels = outputs[slot], sample = samples[pool.voiceSampleId[v]];
    if (!outChannels || !outChannels[0] || !sample || sample.length < 2) {
      pool.voiceState[v] = VOICE_STATE_FREE; bar.mode[v] = BARULHO_MODE_NONE; continue;
    }

    let bMode = bar.mode[v];
    if (slot < slotMuted.length && slotMuted[slot] === 1 && state === VOICE_STATE_ACTIVE) {
      state = VOICE_STATE_CHOKING; bMode = BARULHO_MODE_NONE;
      pool.voiceChokeStartInBlock[v] = 0; pool.voiceChokeFramesLeft[v] = Math.max(1, Math.ceil(0.005 * sr)); pool.voiceChokeDelta[v] = 0;
    }

    const outL = outChannels[0], outR = outChannels[1] || outL;
    const ch0 = sample.ch0, ch1 = sample.ch1, maxSampleIdx = sample.length - 1;
    const pitchStep = pool.voiceSampleRateRatio[v] * pool.voiceEventPitchNuance[v] * (slotPitchRatio[slot] > 0 ? slotPitchRatio[slot] : 1.0);
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
        if (duckLeft > 0 && i >= duckStart) { duck += duckDelta; duckLeft--; }
      }

      const effGain = gain * duck, idx = readPos | 0, frac = readPos - idx;
      const s0 = ch0[idx] + frac * (ch0[idx + 1] - ch0[idx]);
      outL[i] += s0 * effGain;
      if (ch1 !== null) outR[i] += (ch1[idx] + frac * (ch1[idx + 1] - ch1[idx])) * effGain;
      else if (outR !== outL) outR[i] += s0 * effGain;

      readPos += pitchStep; elapsed++;
    }

    pool.voiceState[v] = state; pool.voiceReadPos[v] = readPos; pool.voiceCurrentGain[v] = gain; pool.voiceElapsedFrames[v] = elapsed;
    pool.voiceChokeStartInBlock[v] = 0; pool.voiceChokeFramesLeft[v] = chokeLeft; pool.voiceChokeDelta[v] = chokeDelta;
    phys.duckGain[v] = duck; phys.duckStartInBlock[v] = 0; phys.duckFramesLeft[v] = duckLeft;
    bar.mode[v] = bMode; bar.rampStartInBlock[v] = 0; bar.rampFramesLeft[v] = rampLeft; bar.rampDelta[v] = rampDelta; bar.rampDeltaPending[v] = rampPending;
  }
}
