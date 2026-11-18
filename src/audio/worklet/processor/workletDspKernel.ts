/**
 * O Girador - Noyau DSP Temps-Réel AudioWorklet (Bloc de 128 frames, 0 GC) (< 85 lignes)
 * - Dépile les événements de l'horizon et délègue le rendu SOA par voix à `workletVoiceBlockRenderer`.
 */

import {
  MAX_WORKLET_VOICES, VOICE_STATE_FREE, WorkletSampleEntry,
} from '../percussionWorkletTypes';
import { BARULHO_MODE_NONE } from './workletBarulhoSoa';
import {
  BARULHO_OP_FADEOUT_SLASH, BARULHO_OP_MASK, BARULHO_OP_SHIFT, BARULHO_OP_STOP_DOT,
} from './workletEventFlags';
import { WorkletEventQueue } from './workletEventQueue';
import { computeTimbalLpStageAlpha, renderWorkletVoiceInBlock } from './workletVoiceBlockRenderer';
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
  const bar = pool.barulho;

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

  const lpAlpha = computeTimbalLpStageAlpha(sr);
  for (let v = 0; v < MAX_WORKLET_VOICES; v++) {
    if (pool.voiceState[v] === VOICE_STATE_FREE) continue;
    const slot = pool.voiceSlot[v], outChannels = outputs[slot], sample = samples[pool.voiceSampleId[v]];
    if (!outChannels || !outChannels[0] || !sample || sample.length < 2) {
      pool.voiceState[v] = VOICE_STATE_FREE; bar.mode[v] = BARULHO_MODE_NONE; continue;
    }
    renderWorkletVoiceInBlock(v, blockFrames, sr, lpAlpha, pool, sample, outChannels, slotMuted, slotPitchRatio);
  }
}
