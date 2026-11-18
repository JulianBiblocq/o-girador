/**
 * selectiveChokeLot1.test.ts — Validation DSP Lot 1 : Choke sélectif (Gonguê, Agbê, Mineiro, Apito, Alfaia),
 * Timbal Low-Pass Choke (< 160 Hz en 15 ms + air 150 ms), justesse tonale `Gonguê B` & isolation `Mineiro L/l` (< 135 lignes).
 */
import assert from 'node:assert/strict';
import { BarulhoLookaheadPoint, packBarulhoOriginCoord, resolveSlashFadeOutRampSec, resolveSoftBarulhoRampSpec } from '../../barulho/barulhoRampPlanner';
import { applyWebAudioTrackSkinPhysics } from '../../engine/alfaiaTrackVoicePhysics';
import { EngineVirtualStrokes } from '../../engine/engineVirtualStrokes';
import { stageMeasureStrokeEvent } from '../../worklet/horizon/workletStrokeEventStager';
import { VOICE_STATE_ACTIVE, VOICE_STATE_CHOKING, VOICE_STATE_FREE, WorkletSampleEntry } from '../../worklet/percussionWorkletTypes';
import { processWorkletDspBlock } from '../../worklet/processor/workletDspKernel';
import { WorkletEventQueue } from '../../worklet/processor/workletEventQueue';
import {
  BARULHO_OP_ATTACK_B, BARULHO_OP_NONE, GONGUE_OPEN_DUCK_GAIN,
  packWorkletEventFlags, resolveBarulhoOpForSymbol, resolveTrackPhysicsSpec,
} from '../../worklet/processor/workletSkinPhysics';
import { WorkletVoicePoolSoa } from '../../worklet/processor/workletVoicePoolSoa';
import { instrumentAudioConfigs } from '../../../universes/maracatu/instruments';
import { getNextNuanceState } from '../../../universes/maracatu/strokes';
import { normalizeStrokeKey } from '../../../workers/compiler/stepNotePacker';

const SR = 48000;

function makeSample(fn: (i: number) => number, durSec = 1.2, looped = false): WorkletSampleEntry {
  const len = Math.round(durSec * SR), ch0 = new Float32Array(len);
  for (let i = 0; i < len; i++) ch0[i] = fn(i);
  return { ch0, ch1: null, length: len, sampleRate: SR, bodyStartFrame: looped ? 9600 : 0, loopResumeFrame: looped ? 14400 : 0, loopWrapFrame: len - 1 };
}

function runDsp(nBlocks: number, startFrame: number, q: WorkletEventQueue, p: WorkletVoicePoolSoa, samples: WorkletSampleEntry[], outAcc?: number[]): number {
  const outL = new Float32Array(128), outR = new Float32Array(128), outs = [[outL, outR]];
  const muted = new Uint8Array(2), pitch = new Float32Array([1, 1]), decay = new Float32Array([1, 1]);
  let f = startFrame;
  for (let b = 0; b < nBlocks; b++) {
    outL.fill(0); outR.fill(0);
    processWorkletDspBlock(outs, f, SR, q, p, samples, muted, pitch, decay);
    if (outAcc) for (let i = 0; i < 128; i++) outAcc.push(outL[i]);
    f += 128;
  }
  return f;
}

function goertzelMag(sig: readonly number[], start: number, count: number, freqHz: number): number {
  const w = (2 * Math.PI * freqHz) / SR, coeff = 2 * Math.cos(w);
  let s1 = 0, s2 = 0;
  for (let i = 0; i < count; i++) { const s0 = sig[start + i] + coeff * s1 - s2; s2 = s1; s1 = s0; }
  return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2)) / count;
}

// 1. Verrou 1 & 2 : Accordage `Gonguê B` préservé vs `Apito L` verrouillé à 1.0 + Isolation `Mineiro L/l` vs `Apito L/l`
{
  const strokesMaps = EngineVirtualStrokes.buildStrokesMaps(instrumentAudioConfigs);
  const configMap = new Map(instrumentAudioConfigs.map((c) => [c.id, c]));
  const makeDeps = (ratio: number) => ({
    configMap, strokesMaps, isTrackRoutedToWorklet: () => true, getTrackSlot: () => 0,
    getTrackUnisonDelaySec: () => 0, getTrackBalancoAdherence: () => 1, getTrackPitchRatio: () => ratio,
    selectRoundRobinFile: (_i: string, st: any) => st.files[0], getSampleId: () => 0,
  });
  const stGongB: number[] = [], stApitoL: number[] = [], stMinL: number[] = [];
  stageMeasureStrokeEvent({ seqId: 1, measureIdx: 0, trackId: 1, instId: 'gongue', strokeSymbol: 'B', circleStepIdx: 0, isSecondStroke: false, velocity: 0.8, decayPct: 100, triggerFrame: 0, swungTimeSec: 0, sampleRate: SR, engineDeps: makeDeps(Math.pow(2, -0.9 / 12)), stagedEvents: stGongB });
  stageMeasureStrokeEvent({ seqId: 1, measureIdx: 0, trackId: 2, instId: 'apito', strokeSymbol: 'L', circleStepIdx: 0, isSecondStroke: false, velocity: 0.8, decayPct: 100, triggerFrame: 0, swungTimeSec: 0, sampleRate: SR, engineDeps: makeDeps(1.25), stagedEvents: stApitoL });
  stageMeasureStrokeEvent({ seqId: 1, measureIdx: 0, trackId: 3, instId: 'mineiro', strokeSymbol: 'l', circleStepIdx: 0, isSecondStroke: false, velocity: 0.8, decayPct: 100, triggerFrame: 0, swungTimeSec: 0, sampleRate: SR, engineDeps: makeDeps(1.0), stagedEvents: stMinL });

  assert.equal(stGongB[7], 1.0, 'Gonguê B eventPitchNuance must stay 1.0 so slotPitchRatio (-0.9 st = Sol4) applies');
  assert.ok(Math.abs(stApitoL[7] * 1.25 - 1.0) < 1e-6, 'Apito L must strictly cancel any non-unit pitch to 1.0');
  assert.equal(resolveBarulhoOpForSymbol('l', false, 'mineiro'), BARULHO_OP_NONE, 'Mineiro l must NEVER trigger a loop');
  assert.equal(stMinL[5], 0.82, 'Mineiro virtual weak l must carry baseGain 0.82');

  const minPts: BarulhoLookaheadPoint[] = [{ trackId: 3, instId: 'mineiro', timeSec: 0, symbol: '/', velocity: 0 }, { trackId: 3, instId: 'mineiro', timeSec: 0.25, symbol: 'l', velocity: 0.7 }];
  const apPts: BarulhoLookaheadPoint[] = [{ trackId: 2, instId: 'apito', timeSec: 0, symbol: 'l', velocity: 0.4 }, { trackId: 2, instId: 'apito', timeSec: 0.60, symbol: 'l', velocity: 0.9 }];
  assert.ok(Math.abs(resolveSlashFadeOutRampSec(minPts, 0) - 0.25) < 1e-6 && Math.abs(resolveSoftBarulhoRampSpec(apPts, 0).rampSec - 0.60) < 1e-6);
  assert.equal(normalizeStrokeKey({ id: 'apito' }, 'W'), 'L'); assert.equal(normalizeStrokeKey({ id: 'apito' }, 'w'), 'C');
  assert.equal(getNextNuanceState('L', 'L', 'apito', 'hands', 'fr', false), 'l');
  assert.equal(getNextNuanceState('l', 'L', 'apito', 'hands', 'fr', false), '/');
  assert.equal(getNextNuanceState('/', 'L', 'apito', 'hands', 'fr', false), '.');
}

// 2. Gonguê (`G/A` -6 dB / 25 ms, `g/a` libres, `X` 20 ms tout), Agbê (`D/E/S` 25 ms sur `V` & inversion), Alfaia `X/C`
{
  const q = new WorkletEventQueue(), p = new WorkletVoicePoolSoa(), smp = [makeSample(() => 0.5)];
  const gS = resolveTrackPhysicsSpec('gongue', 'G', false), gW = resolveTrackPhysicsSpec('gongue', 'g', false), gX = resolveTrackPhysicsSpec('gongue', 'X', false);
  q.pushPackedEvents(new Float64Array([
    0, 5, 0, 0, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, gS.chokeMode, gS.voiceClass, true, false),
    256, 5, 0, 0, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, gS.chokeMode, gS.voiceClass, true, false),
    2048, 5, 0, 0, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, gW.chokeMode, gW.voiceClass, true, false),
    2560, 5, 0, 0, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, gX.chokeMode, gX.voiceClass, true, false),
  ]), 4);
  let f = runDsp(15, 0, q, p, smp);
  assert.equal(p.voiceState[0], VOICE_STATE_ACTIVE);
  assert.ok(Math.abs(p.skinPhysics.duckGain[0] - GONGUE_OPEN_DUCK_GAIN) < 0.01);
  f = runDsp(4, f, q, p, smp);
  assert.equal(p.voiceState[1], VOICE_STATE_ACTIVE, 'Gonguê weak g must NOT choke open bell');
  runDsp(2, f, q, p, smp);
  assert.equal(p.voiceState[0], VOICE_STATE_CHOKING); assert.equal(p.voiceState[1], VOICE_STATE_CHOKING); assert.equal(p.voiceState[2], VOICE_STATE_CHOKING);

  const mkV = (sym: string, inst: string): any => ({ instrumentId: inst, strokeSymbol: sym, time: 0, holdEnd: 0.5, releaseEnd: 1, expectedEnd: 1, velocity: 0.8, isFullBuffer: true, source: { stop() {} }, gainNode: { gain: { cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} } } });
  const vAgV = mkV('V', 'agbe'), vAgE = mkV('E', 'agbe'), vAlfD = mkV('D', 'marcante');
  applyWebAudioTrackSkinPhysics([vAgV, vAgE], 'agbe', 'D', 0.10);
  assert.ok(Math.abs(vAgV.expectedEnd - 0.127) < 1e-6 && Math.abs(vAgE.expectedEnd - 0.127) < 1e-6);
  applyWebAudioTrackSkinPhysics([vAlfD], 'marcante', 'X', 0.10); applyWebAudioTrackSkinPhysics([vAlfD], 'marcante', 'C', 0.12);
  assert.equal(vAlfD.expectedEnd, 1.0, 'Alfaia X and C must NEVER choke ongoing skin resonance');
}

// 3. Verrou 3 : Monophonie Apito `L` (legato multi-mesures) <-> `C` (20 ms) & Timbal Low-Pass Choke `< 160 Hz` (15 ms / 150 ms)
{
  const qAp = new WorkletEventQueue(), pAp = new WorkletVoicePoolSoa(), smpAp = [makeSample(() => 0.4, 1.5, true)];
  const spL = resolveTrackPhysicsSpec('apito', 'L', true), spC = resolveTrackPhysicsSpec('apito', 'C', false), coord0 = packBarulhoOriginCoord(0, 0);
  qAp.pushPackedEvents(new Float64Array([
    0, 9, 0, 0, 0.9, 1.0, coord0, 1.0, packWorkletEventFlags(1, spL.chokeMode, spL.voiceClass, true, false, BARULHO_OP_ATTACK_B),
    4096, 9, 0, 0, 0.9, 1.0, coord0, 1.0, packWorkletEventFlags(2, spL.chokeMode, spL.voiceClass, true, false, BARULHO_OP_ATTACK_B),
    6144, 9, 0, 0, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(2, spC.chokeMode, spC.voiceClass, true, false),
    8192, 9, 0, 0, 0.9, 1.0, packBarulhoOriginCoord(1, 4), 1.0, packWorkletEventFlags(2, spL.chokeMode, spL.voiceClass, true, false, BARULHO_OP_ATTACK_B),
  ]), 4);
  let fAp = runDsp(40, 0, qAp, pAp, smpAp);
  assert.equal(pAp.voiceState[0], VOICE_STATE_ACTIVE, 'Multi-measure legato Apito L must stay active across M1->M2');
  fAp = runDsp(10, fAp, qAp, pAp, smpAp);
  assert.equal(pAp.voiceState[0], VOICE_STATE_CHOKING);
  assert.ok(pAp.voiceChokeFramesLeft[0] === 960 - 256 && pAp.voiceState[1] === VOICE_STATE_ACTIVE);
  runDsp(16, fAp, qAp, pAp, smpAp);
  assert.equal(pAp.voiceState[0], VOICE_STATE_FREE); assert.equal(pAp.voiceState[1], VOICE_STATE_CHOKING);

  const tbBassSmp = makeSample((i) => 0.5 * Math.sin((2 * Math.PI * 95 * i) / SR) + 0.5 * Math.sin((2 * Math.PI * 900 * i) / SR), 1.0);
  const qTb = new WorkletEventQueue(), pTb = new WorkletVoicePoolSoa(), outSig: number[] = [];
  const spG = resolveTrackPhysicsSpec('timbal', 'G', false), spP = resolveTrackPhysicsSpec('timbal', 'P', false);
  qTb.pushPackedEvents(new Float64Array([
    0, 8, 0, 0, 1.0, 1.0, 1.0, 1.0, packWorkletEventFlags(1, spG.chokeMode, spG.voiceClass, true, false),
    2048, 8, 0, 1, 1.0, 1.0, 1.0, 1.0, packWorkletEventFlags(1, spP.chokeMode, spP.voiceClass, true, false),
  ]), 2);
  runDsp(80, 0, qTb, pTb, [tbBassSmp, makeSample(() => 0, 0.2)], outSig);
  const lowPre = goertzelMag(outSig, 512, 1024, 95), highPre = goertzelMag(outSig, 512, 1024, 900);
  const lowPost = goertzelMag(outSig, 3072, 1536, 95), highPost = goertzelMag(outSig, 3072, 1536, 900);
  assert.ok(highPost / highPre < 0.08 && lowPost / lowPre > 0.45 && pTb.voiceState[0] === VOICE_STATE_FREE);
}

console.log('selectiveChokeLot1.test.ts: ALL ASSERTIONS PASSED');
