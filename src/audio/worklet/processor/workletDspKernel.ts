/**
 * O Girador - Noyau DSP Temps-Réel AudioWorklet (Bloc de 128 frames, 0 GC) (< 135 lignes)
 * - Interpolation linéaire de phase avec compensation `(sampleBufferRate / contextSampleRate)`.
 * - Enveloppe progressive Hold+Decay par récurrence multiplicative (`expMul`).
 * - Choke intra-bloc au sample près (`0..127`) et support natif Mono (`ch1 === null`) / Stéréo.
 */

import {
  MAX_WORKLET_VOICES, VOICE_STATE_FREE, VOICE_STATE_ACTIVE, VOICE_STATE_CHOKING, WorkletSampleEntry,
} from '../percussionWorkletTypes';
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
  const firstOut = outputs[0];
  const blockFrames = (firstOut && firstOut[0]) ? firstOut[0].length : 128;
  const blockEndFrame = currentFrame + blockFrames;
  const lateThresholdFrame = currentFrame - (contextSampleRate > 0 ? contextSampleRate : 48000) * 0.120;

  while (queue.activeCount > 0) {
    const sIdx = queue.peekEarliestStorageIdx();
    const evtFrame = queue.triggerFrame[sIdx];
    if (evtFrame >= blockEndFrame) break;
    queue.popEarliest();
    if (evtFrame < lateThresholdFrame) continue;

    const slot = queue.slot[sIdx];
    if (slot < slotMuted.length && slotMuted[slot] === 1) continue;

    const startInBlock = evtFrame <= currentFrame ? 0 : Math.min(blockFrames - 1, Math.floor(evtFrame - currentFrame));
    const trackId = queue.trackId[sIdx];
    if ((queue.flags[sIdx] & 1) === 1) {
      pool.triggerChokeForTrack(trackId, evtFrame, startInBlock, contextSampleRate);
    }

    const sampleId = queue.sampleId[sIdx];
    const sample = samples[sampleId];
    if (sample) {
      pool.spawnVoice(
        evtFrame, startInBlock, trackId, slot, sampleId, sample,
        queue.velocity[sIdx], queue.strokeBaseGain[sIdx], queue.stepDecayNorm[sIdx],
        queue.eventPitchNuance[sIdx], slotPitchRatio[slot] || 1.0,
        slotDecayNorm[slot] || 1.0, contextSampleRate
      );
    }
  }

  for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
    let state = pool.voiceState[v];
    if (state === VOICE_STATE_FREE) continue;

    const slot = pool.voiceSlot[v];
    const outChannels = outputs[slot];
    const sample = samples[pool.voiceSampleId[v]];
    if (!outChannels || !outChannels[0] || !sample || sample.length < 2) {
      pool.voiceState[v] = VOICE_STATE_FREE;
      continue;
    }

    if (slot < slotMuted.length && slotMuted[slot] === 1 && state === VOICE_STATE_ACTIVE) {
      state = VOICE_STATE_CHOKING;
      pool.voiceChokeStartInBlock[v] = 0;
      pool.voiceChokeFramesLeft[v] = Math.max(1, Math.ceil(0.005 * contextSampleRate));
      pool.voiceChokeDelta[v] = 0;
    }

    const outL = outChannels[0], outR = outChannels[1] || outL;
    const ch0 = sample.ch0, ch1 = sample.ch1, maxSampleIdx = sample.length - 1;
    const trackPitch = slotPitchRatio[slot] > 0 ? slotPitchRatio[slot] : 1.0;
    const pitchStep = pool.voiceSampleRateRatio[v] * pool.voiceEventPitchNuance[v] * trackPitch;
    const startFrame = pool.voiceStartInBlock[v];
    pool.voiceStartInBlock[v] = 0;

    let readPos = pool.voiceReadPos[v], gain = pool.voiceCurrentGain[v], elapsed = pool.voiceElapsedFrames[v];
    const holdFrames = pool.voiceHoldFrames[v], midRelFrames = pool.voiceMidRelFrames[v];
    const relEndFrames = pool.voiceRelEndFrames[v], endFrames = pool.voiceEndFrames[v];
    const isFull = pool.voiceIsFullBuffer[v], peakGain = pool.voicePeakGain[v];
    const linStep1 = pool.voiceLinStep1[v], expMul = pool.voiceExpMul[v], linStep2 = pool.voiceLinStep2[v];
    const chokeStart = pool.voiceChokeStartInBlock[v];
    let chokeLeft = pool.voiceChokeFramesLeft[v], chokeDelta = pool.voiceChokeDelta[v];

    for (let i = startFrame; i < blockFrames; i++) {
      if (readPos >= maxSampleIdx || elapsed >= endFrames) {
        state = VOICE_STATE_FREE; gain = 0; break;
      }
      if (state === VOICE_STATE_CHOKING && i >= chokeStart) {
        if (chokeDelta === 0) chokeDelta = -gain / Math.max(1, chokeLeft);
        gain += chokeDelta;
        chokeLeft--;
        if (chokeLeft <= 0 || gain <= 0.00001) {
          state = VOICE_STATE_FREE; gain = 0; break;
        }
      } else {
        if (elapsed < holdFrames) gain = peakGain;
        else if (isFull === 1) gain += linStep2;
        else if (elapsed < midRelFrames) gain += linStep1;
        else if (elapsed < relEndFrames) gain *= expMul;
        else gain += linStep2;
        if (gain < 0) gain = 0;
      }

      const idx = readPos | 0;
      const frac = readPos - idx;
      const s0 = ch0[idx] + frac * (ch0[idx + 1] - ch0[idx]);
      outL[i] += s0 * gain;

      if (ch1 !== null) {
        outR[i] += (ch1[idx] + frac * (ch1[idx + 1] - ch1[idx])) * gain;
      } else if (outR !== outL) {
        outR[i] += s0 * gain;
      }
      readPos += pitchStep;
      elapsed++;
    }

    pool.voiceState[v] = state;
    pool.voiceReadPos[v] = readPos;
    pool.voiceCurrentGain[v] = gain;
    pool.voiceElapsedFrames[v] = elapsed;
    pool.voiceChokeStartInBlock[v] = 0;
    pool.voiceChokeFramesLeft[v] = chokeLeft;
    pool.voiceChokeDelta[v] = chokeDelta;
  }
}
