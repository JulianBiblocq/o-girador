/**
 * grooveAndChoke.test.ts — Tests unitaires DSP : Chokes 20 ms Gonguê/Timbal, Immunité Mineiro & Tempérament de Section (< 138 lignes).
 */
import assert from 'node:assert/strict';
import { applyWebAudioTrackSkinPhysics } from '../../engine/alfaiaTrackVoicePhysics';
import { EngineTuning } from '../../engine/engineTuning';
import { ActiveVoice } from '../../engine/engineTypes';
import { computeSectionTemperamentMap } from '../sectionTemperament';
import { computePercussionNoteSwing, resolveActivePatternForMeasure } from '../../../hooks/audio-sync/percussionSwingHelper';
import { VOICE_STATE_ACTIVE, VOICE_STATE_CHOKING, VOICE_STATE_FREE, WorkletSampleEntry } from '../../worklet/percussionWorkletTypes';
import { processWorkletDspBlock } from '../../worklet/processor/workletDspKernel';
import { WorkletEventQueue } from '../../worklet/processor/workletEventQueue';
import {
  BARULHO_OP_NONE, CHOKE_BARULHO_RELEASE_18MS, CHOKE_GONGUE_OPEN_STRONG, CHOKE_RESONANT_20MS,
  CHOKE_SHAKER_POS_25MS, CHOKE_TIMBAL_PRESO_SLAP_LP, VOICE_CLASS_GENERIC, VOICE_CLASS_OPEN_RESONANT,
  VOICE_CLASS_TIMBAL_BASS, packWorkletEventFlags, resolveTrackPhysicsSpec,
} from '../../worklet/processor/workletSkinPhysics';
import { WorkletVoicePoolSoa } from '../../worklet/processor/workletVoicePoolSoa';

const SR = 48000;

function makeToneSample(): WorkletSampleEntry {
  const len = SR, ch0 = new Float32Array(len).fill(0.5);
  return { ch0, ch1: null, length: len, sampleRate: SR, bodyStartFrame: 0, loopResumeFrame: 0, loopWrapFrame: len - 1 };
}

function makeMockWebVoice(strokeSymbol: string, instrumentId = 'gongue'): ActiveVoice {
  return {
    instrumentId, strokeSymbol, time: 0.0, holdEnd: 0.5, releaseEnd: 1.0, expectedEnd: 1.0, velocity: 0.9, isFullBuffer: true,
    source: { stop: () => {} } as any,
    gainNode: {
      gain: { cancelScheduledValues: () => {}, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
    } as any,
  };
}

function stepDsp(nBlocks: number, startFrame: number, q: WorkletEventQueue, p: WorkletVoicePoolSoa, samples: WorkletSampleEntry[]): number {
  const outL0 = new Float32Array(128), outR0 = new Float32Array(128);
  const outL1 = new Float32Array(128), outR1 = new Float32Array(128);
  const outs = [[outL0, outR0], [outL1, outR1]];
  const muted = new Uint8Array(4), pitch = new Float32Array([1, 1, 1, 1]), decay = new Float32Array([1, 1, 1, 1]);
  let f = startFrame;
  for (let i = 0; i < nBlocks; i++) {
    outL0.fill(0); outR0.fill(0); outL1.fill(0); outR1.fill(0);
    processWorkletDspBlock(outs, f, SR, q, p, samples, muted, pitch, decay);
    f += 128;
  }
  return f;
}

// 1. Gonguê 20 ms choke (X sur G/g/A/a), duck -6 dB / 25 ms sur G/A & isolation stricte par trackId
{
  const gOpen = resolveTrackPhysicsSpec('gongue', 'G', false);
  const gRim = resolveTrackPhysicsSpec('gongue', 'X', false);
  assert.equal(gOpen.voiceClass, VOICE_CLASS_OPEN_RESONANT);
  assert.equal(gOpen.chokeMode, CHOKE_GONGUE_OPEN_STRONG);
  assert.equal(gRim.chokeMode, CHOKE_RESONANT_20MS);

  const vGongG = makeMockWebVoice('G');
  applyWebAudioTrackSkinPhysics([vGongG], 'gongue', 'X', 0.10);
  assert.ok(Math.abs(vGongG.expectedEnd - 0.122) < 1e-6, 'Web Audio Gonguê G must choke in 20 ms (+2 ms stop guard)');

  const q = new WorkletEventQueue(), p = new WorkletVoicePoolSoa(), samples = [makeToneSample()];
  q.pushPackedEvents(new Float64Array([
    0, 10, 0, 0, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, gOpen.chokeMode, gOpen.voiceClass, false, false, BARULHO_OP_NONE),
    0, 11, 1, 0, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, gOpen.chokeMode, gOpen.voiceClass, false, false, BARULHO_OP_NONE),
    512, 10, 0, 0, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, gRim.chokeMode, gRim.voiceClass, false, false, BARULHO_OP_NONE),
  ]), 3);
  let frame = stepDsp(5, 0, q, p, samples); // frame = 640 (128 frames into 960-frame 20 ms choke)
  assert.equal(p.voiceState[0], VOICE_STATE_CHOKING, 'Gonguê Track 10 G must enter 20 ms choke on X');
  assert.equal(p.voiceState[1], VOICE_STATE_ACTIVE, 'Gonguê Track 11 G must NEVER be choked by Track 10 X');
  assert.equal(p.voiceChokeFramesLeft[0], 960 - 128, 'Exact 960 frames (20 ms @ 48kHz) choke countdown');
  frame = stepDsp(8, frame, q, p, samples); // +1024 frames > 832 frames remaining
  assert.equal(p.voiceState[0], VOICE_STATE_FREE, 'Gonguê Track 10 G must free cleanly after 20 ms');
  assert.equal(p.voiceState[1], VOICE_STATE_ACTIVE, 'Gonguê Track 11 G still ringing cleanly');
}

// 2. Timbal Low-Pass Choke (P/p sur G -> 150 ms air decay, 20 ms sur A/S, épargne C & D/d) & Mineiro P <-> T 25 ms vs p/t libre
{
  assert.equal(resolveTrackPhysicsSpec('timbal', 'G', false).voiceClass, VOICE_CLASS_TIMBAL_BASS);
  assert.equal(resolveTrackPhysicsSpec('timbal', 'C', false).voiceClass, VOICE_CLASS_GENERIC);
  assert.equal(resolveTrackPhysicsSpec('timbal', 'P', false).chokeMode, CHOKE_TIMBAL_PRESO_SLAP_LP);
  assert.equal(resolveTrackPhysicsSpec('timbal', 'D', false).chokeMode, CHOKE_BARULHO_RELEASE_18MS);
  assert.equal(resolveTrackPhysicsSpec('mineiro', 'P', false).chokeMode, CHOKE_SHAKER_POS_25MS);
  assert.equal(resolveTrackPhysicsSpec('mineiro', 'p', false).chokeMode, CHOKE_BARULHO_RELEASE_18MS);

  const vTbG = makeMockWebVoice('G', 'timbal'), vTbA = makeMockWebVoice('A', 'timbal'), vTbC = makeMockWebVoice('C', 'timbal');
  applyWebAudioTrackSkinPhysics([vTbG, vTbA, vTbC], 'timbal', 'P', 0.10);
  assert.equal(vTbG.isLowPassChoked, true, 'Timbal P must trigger Low-Pass Choke on Timbal G');
  assert.ok(Math.abs(vTbG.expectedEnd - 0.252) < 1e-6, 'Timbal G air-column hum must decay over 150 ms (+2 ms stop guard)');
  assert.ok(Math.abs(vTbA.expectedEnd - 0.122) < 1e-6, 'Timbal P must frankly choke Timbal A in 20 ms');
  assert.equal(vTbC.expectedEnd, 1.0, 'Timbal P must spare Timbal C');
  const vTbG2 = makeMockWebVoice('G', 'timbal');
  applyWebAudioTrackSkinPhysics([vTbG2], 'timbal', 'D', 0.10);
  assert.equal(vTbG2.expectedEnd, 1.0, 'Timbal D must spare Timbal G');
  const vMiT = makeMockWebVoice('T', 'mineiro'), vMiT2 = makeMockWebVoice('T', 'mineiro');
  applyWebAudioTrackSkinPhysics([vMiT], 'mineiro', 'P', 0.10);
  assert.ok(Math.abs(vMiT.expectedEnd - 0.127) < 1e-6, 'Mineiro strong P must damp opposite T in 25 ms');
  applyWebAudioTrackSkinPhysics([vMiT2], 'mineiro', 'p', 0.10);
  assert.equal(vMiT2.expectedEnd, 1.0, 'Mineiro weak p must let T ring naturally');
}

// 3. Section Temperament (Rank 0 vs Ranks 1..3), Slave Balanço Inheritance & 0 Pitch Jitter
{
  const tracks: any[] = [
    { id: 99, instrumentIdx: 0, isLinkFolder: true, patterns: [{ id: 'f', steps: 16, measureAssignments: [false, true] }] },
    { id: 1, instrumentIdx: 1, isLinkMaster: true, patterns: [{ id: 'm0', name: 'Base', steps: 16, beatResolutions: [3, 4, 4, 4], measureAssignments: [true, false] }, { id: 'm1', name: 'Virada', steps: 16, beatResolutions: [3, 4, 4, 4], measureAssignments: [false, true] }] },
    { id: 2, instrumentIdx: 1, linkedToTrackId: 1, patterns: [{ id: 'p0', name: 'Base', steps: 16 }, { id: 'p1', name: 'Virada', steps: 16 }] },
    { id: 3, instrumentIdx: 1, patterns: [{ id: 'p0', steps: 16 }] },
    { id: 4, instrumentIdx: 1, patterns: [{ id: 'p0', steps: 16 }] },
  ];
  const map = computeSectionTemperamentMap(tracks);
  const r0 = map.get(1)!, r1 = map.get(2)!, r2 = map.get(3)!, r3 = map.get(4)!;
  assert.equal(r0.rank, 0);
  assert.equal(r0.attackSpreadSec, 0.0);
  assert.equal(r0.balancoAdherence, 1.0);
  const partnerDelays: number[] = [];
  for (const r of [r1, r2, r3]) {
    assert.ok(r.attackSpreadSec >= 0.00018 && r.attackSpreadSec <= 0.00080, 'Alfaia partner spread must stay inside <= 0.80 ms constructive phase cone');
    assert.ok(r.balancoAdherence >= 0.95 && r.balancoAdherence <= 1.05);
    for (const prev of partnerDelays) assert.ok(Math.abs(r.attackSpreadSec - prev) >= 0.00005);
    partnerDelays.push(r.attackSpreadSec);
  }
  assert.equal(resolveActivePatternForMeasure(tracks[2], tracks as any, 1, null)?.id, 'p1');
  assert.equal(computePercussionNoteSwing({
    activePattern: tracks[1].patterns[0], liveTrack: tracks[1], circleStepIdx: 0, isTuplet: false,
    swingJitter: 0.012, globalMode: 'baque_virado', globalSwing: { mode: 'baque_virado' } as any, stepDurationSec: 0.15, balancoAdherence: 1.0,
  }), 0);
  assert.equal(EngineTuning.calculatePitch('marcante', { id: 'marcante', calibratedStudioBank: true } as any, { tuning: 0 } as any), 1.0);
}

console.log('grooveAndChoke.test.ts: ALL ASSERTIONS PASSED');
