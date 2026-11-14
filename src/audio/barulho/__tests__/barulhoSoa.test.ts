/**
 * barulhoSoa.test.ts — Tests unitaires rapides de validation DSP & musicale du Barulho SOA (< 138 lignes).
 * Couvre : (a) boucle [bodyStart, bodyEnd] sans retour à 0.00 s + immunité trackDecay + offset b déterministe,
 *          (b) non-empilement legato sur rebouclage de mesure B 0 0 0...,
 *          (c) choke 20 ms + ré-impact 0.00 s sur 2e B distinct (B 0 0 0 B),
 *          (d) rampes multi-pas b -> b et / -> . (+ préservation '/' dans paperScoreEngine).
 */
import assert from 'node:assert/strict';
import { analyzeBarulhoLoopRegion, bakeBarulhoChannelPcm } from '../barulhoLoopRegionAnalyzer';
import {
  BarulhoLookaheadPoint, DEFAULT_BARULHO_FADEIN_SEC, DEFAULT_BARULHO_FADEOUT_SEC,
  packBarulhoOriginCoord, resolveSlashFadeOutRampSec, resolveSoftBarulhoRampSpec,
} from '../barulhoRampPlanner';
import { VOICE_STATE_ACTIVE, VOICE_STATE_CHOKING, VOICE_STATE_FREE, WorkletSampleEntry } from '../../worklet/percussionWorkletTypes';
import { processWorkletDspBlock } from '../../worklet/processor/workletDspKernel';
import { WorkletEventQueue } from '../../worklet/processor/workletEventQueue';
import {
  BARULHO_OP_ATTACK_B, BARULHO_OP_FADEOUT_SLASH, BARULHO_OP_SOFT_B, BARULHO_OP_STOP_DOT,
  CHOKE_NONE, VOICE_CLASS_ALFAIA_SKIN, computeBarulhoSoftEntryFrame, packWorkletEventFlags,
} from '../../worklet/processor/workletEventFlags';
import { WorkletVoicePoolSoa } from '../../worklet/processor/workletVoicePoolSoa';
import { parseStepValue } from '../../../utils/paper/paperScoreEngine';

const SR = 48000;

function makeSyntheticBarulhoSample(): WorkletSampleEntry {
  const len = Math.round(2.4 * SR), raw = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR, env = t < 0.18 ? 0.95 : (t < 2.0 ? 0.32 : Math.max(0.005, 0.32 * (1 - (t - 2.0) / 0.4)));
    raw[i] = Math.sin(2 * Math.PI * 110 * t) * env;
  }
  const region = analyzeBarulhoLoopRegion(raw, SR), baked = bakeBarulhoChannelPcm(raw, region);
  assert.equal(baked[region.loopWrapFrame], raw[region.loopResumeFrame], 'C1 guard point must match loopResumeFrame');
  return {
    ch0: baked, ch1: null, length: baked.length, sampleRate: SR,
    bodyStartFrame: region.bodyStartFrame, loopResumeFrame: region.loopResumeFrame, loopWrapFrame: region.loopWrapFrame,
  };
}

function runBlocks(nBlocks: number, startFrame: number, queue: WorkletEventQueue, pool: WorkletVoicePoolSoa, samples: (WorkletSampleEntry | undefined)[], slotDecayVal = 0.20): number {
  const outL = new Float32Array(128), outR = new Float32Array(128), outputs = [[outL, outR]];
  const slotMuted = new Uint8Array(4), slotPitch = new Float32Array([1, 1, 1, 1]), slotDecay = new Float32Array([slotDecayVal, slotDecayVal, slotDecayVal, slotDecayVal]);
  let frame = startFrame;
  for (let b = 0; b < nBlocks; b++) {
    outL.fill(0); outR.fill(0);
    processWorkletDspBlock(outputs, frame, SR, queue, pool, samples, slotMuted, slotPitch, slotDecay);
    frame += 128;
  }
  return frame;
}

function countStates(pool: WorkletVoicePoolSoa) {
  let active = 0, choking = 0, activeIdx = -1;
  for (let v = 0; v < pool.voiceState.length; v++) {
    if (pool.voiceState[v] === VOICE_STATE_ACTIVE) { active++; activeIdx = v; }
    else if (pool.voiceState[v] === VOICE_STATE_CHOKING) choking++;
  }
  return { active, choking, activeIdx };
}

// (a) Boucle [bodyStart, bodyEnd] sans retour à 0.00 s, immunité trackDecay=20%, et décorrélation b par trackId
{
  const sample = makeSyntheticBarulhoSample();
  assert.ok(sample.bodyStartFrame >= Math.round(0.18 * SR) && sample.loopWrapFrame > sample.loopResumeFrame);
  const e1 = computeBarulhoSoftEntryFrame(1, sample.bodyStartFrame, sample.loopResumeFrame, sample.loopWrapFrame);
  const e2 = computeBarulhoSoftEntryFrame(2, sample.bodyStartFrame, sample.loopResumeFrame, sample.loopWrapFrame);
  assert.notEqual(e1, e2, '2 tracks on cold b must have distinct phase offsets');
  assert.ok(e1 >= sample.bodyStartFrame && e2 >= sample.bodyStartFrame, 'cold b must never enter in initial impact');

  const queue = new WorkletEventQueue(), pool = new WorkletVoicePoolSoa(), samples = [sample];
  const flagsB = packWorkletEventFlags(1, CHOKE_NONE, VOICE_CLASS_ALFAIA_SKIN, true, false, BARULHO_OP_ATTACK_B);
  queue.pushPackedEvents(new Float64Array([0, 1, 0, 0, 0.8, 1.0, packBarulhoOriginCoord(0, 0), 1.0, flagsB]), 1);

  let curFrame = 0, minReadAfterBody = Infinity;
  for (let step = 0; step < 30; step++) {
    curFrame = runBlocks(40, curFrame, queue, pool, samples, 0.20); // ~6.4 s (> 2.5 cycles)
    const { active, activeIdx } = countStates(pool);
    assert.equal(active, 1, 'Barulho voice must never expire even with trackDecay=20%');
    if (curFrame > sample.loopResumeFrame + 2048) minReadAfterBody = Math.min(minReadAfterBody, pool.voiceReadPos[activeIdx]);
  }
  assert.ok(minReadAfterBody >= sample.loopResumeFrame, `Loop wrapped below loopResumeFrame: ${minReadAfterBody}`);
}

// (b) Non-empilement legato sur rebouclage de mesure B 0 0 0... vs (c) Choke 20 ms + ré-impact 0.00 s sur 2e B distinct
{
  const sample = makeSyntheticBarulhoSample(), queue = new WorkletEventQueue(), pool = new WorkletVoicePoolSoa(), samples = [sample];
  const coordStep0 = packBarulhoOriginCoord(0, 0), coordStep4 = packBarulhoOriginCoord(0, 4);
  queue.pushPackedEvents(new Float64Array([0, 7, 0, 0, 0.8, 1.0, coordStep0, 1.0, packWorkletEventFlags(1, CHOKE_NONE, VOICE_CLASS_ALFAIA_SKIN, true, false, BARULHO_OP_ATTACK_B)]), 1);
  let frame = runBlocks(200, 0, queue, pool, samples);

  queue.pushPackedEvents(new Float64Array([frame, 7, 0, 0, 0.85, 1.0, coordStep0, 1.0, packWorkletEventFlags(2, CHOKE_NONE, VOICE_CLASS_ALFAIA_SKIN, true, false, BARULHO_OP_ATTACK_B)]), 1);
  frame = runBlocks(2, frame, queue, pool, samples);
  const afterLoop = countStates(pool);
  assert.equal(afterLoop.active, 1);
  assert.equal(afterLoop.choking, 0, 'Loop-around on same B must NOT choke or stack');
  assert.ok(pool.voiceReadPos[afterLoop.activeIdx] > sample.bodyStartFrame, 'Loop-around on same B must NOT revisit 0.00 s');

  queue.pushPackedEvents(new Float64Array([frame, 7, 0, 0, 0.9, 1.0, coordStep4, 1.0, packWorkletEventFlags(2, CHOKE_NONE, VOICE_CLASS_ALFAIA_SKIN, true, false, BARULHO_OP_ATTACK_B)]), 1);
  frame = runBlocks(1, frame, queue, pool, samples);
  const onRetrig = countStates(pool);
  assert.equal(onRetrig.active, 1);
  assert.equal(onRetrig.choking, 1, 'Distinct 2nd B must choke old Barulho in 20 ms');
  assert.ok(pool.voiceReadPos[onRetrig.activeIdx] <= 128, 'Distinct 2nd B must re-trigger call impact from 0.00 s');
  frame = runBlocks(12, frame, queue, pool, samples);
  assert.equal(countStates(pool).choking, 0, 'Choked Barulho voice must free cleanly after 20 ms');
}

// (d) Rampes multi-pas b -> b et / -> . + repli solo + paperScoreEngine '/'
{
  const pts: BarulhoLookaheadPoint[] = [
    { trackId: 3, timeSec: 0.0, symbol: 'b', velocity: 0.4 }, { trackId: 3, timeSec: 0.75, symbol: 'b', velocity: 0.9 },
    { trackId: 3, timeSec: 1.50, symbol: '/', velocity: 0 }, { trackId: 3, timeSec: 2.30, symbol: '.', velocity: 0 },
    { trackId: 3, timeSec: 3.00, symbol: 'b', velocity: 0.6 }, { trackId: 3, timeSec: 3.50, symbol: '/', velocity: 0 },
  ];
  const fadeIn = resolveSoftBarulhoRampSpec(pts, 0);
  assert.ok(Math.abs(fadeIn.rampSec - 0.75) < 1e-6 && Math.abs(fadeIn.targetVelocity - 0.9) < 1e-6);
  assert.ok(Math.abs(resolveSoftBarulhoRampSpec(pts, 4).rampSec - DEFAULT_BARULHO_FADEIN_SEC) < 1e-6);
  assert.ok(Math.abs(resolveSlashFadeOutRampSec(pts, 2) - 0.80) < 1e-6);
  assert.ok(Math.abs(resolveSlashFadeOutRampSec(pts, 5) - DEFAULT_BARULHO_FADEOUT_SEC) < 1e-6);

  const sample = makeSyntheticBarulhoSample(), queue = new WorkletEventQueue(), pool = new WorkletVoicePoolSoa(), samples = [sample];
  queue.pushPackedEvents(new Float64Array([
    0, 3, 0, 0, 0.9, 1.0, 0.50, 1.0, packWorkletEventFlags(1, CHOKE_NONE, VOICE_CLASS_ALFAIA_SKIN, true, false, BARULHO_OP_SOFT_B),
    Math.round(0.50 * SR), 3, 0, 0, 0, 1.0, 0.40, 1.0, packWorkletEventFlags(1, CHOKE_NONE, VOICE_CLASS_ALFAIA_SKIN, true, false, BARULHO_OP_FADEOUT_SLASH),
    Math.round(0.90 * SR), 3, 0, 0, 0, 1.0, 0.035, 1.0, packWorkletEventFlags(1, CHOKE_NONE, VOICE_CLASS_ALFAIA_SKIN, true, false, BARULHO_OP_STOP_DOT),
  ]), 3);
  let frame = runBlocks(94, 0, queue, pool, samples);
  const vIdx = countStates(pool).activeIdx, peak = pool.voicePeakGain[vIdx];
  assert.ok(Math.abs(pool.voiceCurrentGain[vIdx] - 0.5 * peak) < 0.05, 'Midpoint of b Fade-In must be ~50% of peakGain');
  frame = runBlocks(168, frame, queue, pool, samples);
  assert.ok(Math.abs(pool.voiceCurrentGain[vIdx] - 0.5 * peak) < 0.05, 'Midpoint of / -> . Fade-Out must be ~50% of peakGain');
  runBlocks(110, frame, queue, pool, samples);
  assert.equal(pool.voiceState.every((s) => s === VOICE_STATE_FREE), true, 'Voice must reach 0 and free after / -> .');

  assert.equal(parseStepValue('/'), '/');
  assert.deepEqual(parseStepValue('D/E'), ['D', 'E']);
}

console.log('barulhoSoa.test.ts: ALL ASSERTIONS PASSED');
