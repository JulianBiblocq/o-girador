/**
 * caixaStudioBankAndChoke.test.ts — Validation complète Banque Studio `Caixa` (52 WAV), Non-Destruction Legacy (16 `.ogg`),
 * Isolation `Caixa` (`r_min` pur) vs `Tarol` (`0.88`/`0.985`), Boucle `640..2600 ms`, Cycle `B->b->/->.` & Choke DSP (< 130 lignes).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SAMPLE_CACHE_VERSION } from '../../audioSampleCache';
import { solveRodaSpectralBreathing } from '../../effects/rodaSpectralBreathingSolver';
import { applyWebAudioTrackSkinPhysics } from '../../engine/alfaiaTrackVoicePhysics';
import { getEffectiveBarulhoLoopPoints, resolveLoopInstrumentFromPath, resolveLoopSampleFilePath } from '../../engine/barulhoLoopRegistry';
import { EngineTuning } from '../../engine/engineTuning';
import { EngineVirtualStrokes } from '../../engine/engineVirtualStrokes';
import { resolveFrankStrokeBarulhoChokeSec } from '../../engine/selectiveTrackChokePhysics';
import { computeRoleChorusSpreadSummary } from '../../engine/skinChorusCalculator';
import { stageMeasureStrokeEvent } from '../../worklet/horizon/workletStrokeEventStager';
import { VOICE_STATE_ACTIVE, VOICE_STATE_CHOKING, VOICE_STATE_FREE, WorkletSampleEntry } from '../../worklet/percussionWorkletTypes';
import { processWorkletDspBlock } from '../../worklet/processor/workletDspKernel';
import { WorkletEventQueue } from '../../worklet/processor/workletEventQueue';
import {
  BARULHO_OP_ATTACK_B, BARULHO_OP_NONE, SNARE_GHOST_TOUCH_DUCK_GAIN, SNARE_STRONG_RING_DUCK_GAIN,
  packWorkletEventFlags, resolveTrackPhysicsSpec,
} from '../../worklet/processor/workletSkinPhysics';
import { WorkletVoicePoolSoa } from '../../worklet/processor/workletVoicePoolSoa';
import { instrumentAudioConfigs } from '../../../universes/maracatu/instruments';
import { getNextNuanceState } from '../../../universes/maracatu/strokes';

const SR = 48000;

function makeSample(durSec = 1.0, looped = false): WorkletSampleEntry {
  const len = Math.round(durSec * SR), ch0 = new Float32Array(len).fill(0.5);
  return { ch0, ch1: null, length: len, sampleRate: SR, bodyStartFrame: looped ? 30720 : 0, loopResumeFrame: looped ? 36000 : 0, loopWrapFrame: len - 1 };
}

function runDsp(nBlocks: number, startFrame: number, q: WorkletEventQueue, p: WorkletVoicePoolSoa, samples: WorkletSampleEntry[]): number {
  const outL = new Float32Array(128), outR = new Float32Array(128), outs = [[outL, outR]];
  const muted = new Uint8Array(2), pitch = new Float32Array([1, 1]), decay = new Float32Array([1, 1]);
  let f = startFrame;
  for (let b = 0; b < nBlocks; b++) { outL.fill(0); outR.fill(0); processWorkletDspBlock(outs, f, SR, q, p, samples, muted, pitch, decay); f += 128; }
  return f;
}

// 1. Préservation des 16 fichiers Legacy `Caixa *.ogg` + Cache v6 + Boucle `Caixa studio B.ogg` + Isolation `r` Caixa vs Tarol
{
  assert.equal(SAMPLE_CACHE_VERSION, 6);
  const mixDir = path.resolve(process.cwd(), 'public/Mixdown');
  const legacy16 = [
    'Caixa B.ogg', 'Caixa C 1.ogg', 'Caixa C 2.ogg', 'Caixa F 1.ogg', 'Caixa F 2.ogg', 'Caixa F 3.ogg', 'Caixa F 4.ogg',
    'Caixa Fla 1.ogg', 'Caixa Fla 2.ogg', 'Caixa R 1.ogg', 'Caixa R 2.ogg', 'Caixa X.ogg',
    'Caixa faible 1.ogg', 'Caixa faible 2.ogg', 'Caixa faible 3.ogg', 'Caixa faible 4.ogg',
  ];
  for (const lf of legacy16) assert.equal(fs.existsSync(path.join(mixDir, lf)), true, `Legacy Caixa file must remain intact: ${lf}`);

  assert.equal(resolveLoopSampleFilePath('caixa'), 'Mixdown/Caixa studio B.ogg');
  assert.equal(resolveLoopSampleFilePath('caixa', { caixa: false }), 'Mixdown/Caixa B.ogg');
  assert.equal(resolveLoopInstrumentFromPath('Mixdown/Caixa studio B.ogg'), 'caixa');
  assert.deepEqual(getEffectiveBarulhoLoopPoints('caixa', 3326, 'studio'), { loopStartMs: 640, loopEndMs: 2600, crossfadeMs: 110, softEntryMs: 820 });
  assert.deepEqual(getEffectiveBarulhoLoopPoints('tarol', 5000, 'legacy'), { loopStartMs: 240, loopEndMs: 4665, crossfadeMs: 110, softEntryMs: 420 });

  for (const inst of ['caixa', 'tarol'] as const) {
    assert.equal(getNextNuanceState('B', 'B', inst, 'caixa', 'fr', false), 'b');
    assert.equal(getNextNuanceState('b', 'B', inst, 'caixa', 'fr', false), '/');
    assert.equal(getNextNuanceState('/', 'B', inst, 'caixa', 'fr', false), '.');
  }

  const strokesMaps = EngineVirtualStrokes.buildStrokesMaps(instrumentAudioConfigs);
  const configMap = new Map(instrumentAudioConfigs.map((c) => [c.id, c]));
  assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, 'caixa', 'C')!.files.length, 4);
  assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, 'caixa', 'R')!.files.length, 5);
  assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, 'caixa', 'r')!.files.length, 5);
  assert.deepEqual(EngineVirtualStrokes.resolveStroke(strokesMaps, 'tarol', 'b')!.files, ['Mixdown/Tarol B.ogg']);

  const deps = { configMap, strokesMaps, isTrackRoutedToWorklet: () => true, getTrackSlot: () => 0, getTrackUnisonDelaySec: () => 0, getTrackBalancoAdherence: () => 1, getTrackPitchRatio: () => 1, selectRoundRobinFile: (_i: string, st: any) => st.files[0], getSampleId: () => 0 };
  const stCxR: number[] = [], stTrR: number[] = [], stCxB: number[] = [];
  stageMeasureStrokeEvent({ seqId: 1, measureIdx: 0, trackId: 1, instId: 'caixa', strokeSymbol: 'r', circleStepIdx: 0, isSecondStroke: false, velocity: 1.0, decayPct: 100, triggerFrame: 0, swungTimeSec: 0, sampleRate: SR, engineDeps: deps, stagedEvents: stCxR });
  stageMeasureStrokeEvent({ seqId: 1, measureIdx: 0, trackId: 2, instId: 'tarol', strokeSymbol: 'r', circleStepIdx: 0, isSecondStroke: false, velocity: 1.0, decayPct: 100, triggerFrame: 0, swungTimeSec: 0, sampleRate: SR, engineDeps: deps, stagedEvents: stTrR });
  stageMeasureStrokeEvent({ seqId: 1, measureIdx: 0, trackId: 1, instId: 'caixa', strokeSymbol: 'B', circleStepIdx: 0, isSecondStroke: false, velocity: 1.0, decayPct: 100, triggerFrame: 0, swungTimeSec: 0, sampleRate: SR, engineDeps: { ...deps, getTrackPitchRatio: () => Math.pow(2, -2 / 12) }, stagedEvents: stCxB });
  assert.equal(stCxR[4], 1.0, 'Caixa Studio r_min must preserve 1.0 velocity');
  assert.equal(stCxR[7], 1.0, 'Caixa Studio r_min must preserve 1.0 pitchNuance');
  assert.ok(Math.abs(stTrR[4] - 0.88) < 1e-6 && Math.abs(stTrR[7] - 0.985) < 1e-6, 'Tarol Legacy r must retain 0.88 vel & 0.985 pitch');
  assert.equal(stCxB[7], 1.0, 'Caixa B must keep eventPitchNuance 1.0 so slotPitchRatio applies');
  assert.equal(EngineTuning.calculatePitch('caixa', configMap.get('caixa')!, { tuning: 0 } as any), 1.0);
  assert.ok(Math.abs(computeRoleChorusSpreadSummary('caixa', 0, 2, 1.0).maxCents - 22) < 1e-6);
  const plan = solveRodaSpectralBreathing([{ id: 1, instrumentIdx: 3, instrumentId: 'caixa', tuning: 0 }, { id: 2, instrumentIdx: 4, instrumentId: 'tarol', tuning: 0 }] as any, 0.75);
  assert.ok(Math.abs(plan.tarol[0].frequencyHz - Math.min(165.41 * 1.08, 0.85 * 203.03)) < 0.01);
}

// 2. Physique Choke DSP `Caixa` (20 ms sur `B/b`, amortissement `-5.5 dB` ring sur forts/Rufadas, `d/e` doux, immunité `X` et `C`)
{
  for (const sym of ['D', 'd', 'E', 'e', 'A', 'a', 'R', 'r', 'F', 'f', 'X', 'C']) {
    assert.equal(resolveFrankStrokeBarulhoChokeSec('caixa', sym), 0.020, `Caixa ${sym} must choke Barulho in 20 ms`);
  }
  const q = new WorkletEventQueue(), p = new WorkletVoicePoolSoa(), smp = [makeSample(2.0, true), makeSample(0.9, false)];
  const spB = resolveTrackPhysicsSpec('caixa', 'B', true), spD = resolveTrackPhysicsSpec('caixa', 'D', false);
  const spX = resolveTrackPhysicsSpec('caixa', 'X', false), spC = resolveTrackPhysicsSpec('caixa', 'C', false), spd = resolveTrackPhysicsSpec('caixa', 'd', false);
  q.pushPackedEvents(new Float64Array([
    0, 4, 0, 0, 0.9, 1.0, 1, 1.0, packWorkletEventFlags(1, spB.chokeMode, spB.voiceClass, true, false, BARULHO_OP_ATTACK_B),
    512, 4, 0, 1, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, spX.chokeMode, spX.voiceClass, true, false, BARULHO_OP_NONE),
    2048, 4, 0, 1, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, spD.chokeMode, spD.voiceClass, true, false, BARULHO_OP_NONE),
    2560, 4, 0, 1, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, spX.chokeMode, spX.voiceClass, true, false, BARULHO_OP_NONE),
    3072, 4, 0, 1, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, spC.chokeMode, spC.voiceClass, true, false, BARULHO_OP_NONE),
    3584, 4, 0, 1, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, spd.chokeMode, spd.voiceClass, true, false, BARULHO_OP_NONE),
    5632, 4, 0, 1, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, spD.chokeMode, spD.voiceClass, true, false, BARULHO_OP_NONE),
  ]), 7);

  let f = runDsp(5, 0, q, p, smp); // frame 640 (128 frames after X at 512)
  assert.equal(p.voiceState[0], VOICE_STATE_CHOKING, 'Caixa X must choke active Barulho B in 20 ms');
  assert.equal(p.voiceChokeFramesLeft[0], 960 - 128);
  f = runDsp(11, f, q, p, smp); // frame 2048 -> B freed, D spawns in slot 2
  assert.equal(p.voiceState[0], VOICE_STATE_FREE);
  f = runDsp(12, f, q, p, smp); // frame 3584 -> X (2560) and C (3072) fired
  assert.equal(p.voiceState[2], VOICE_STATE_ACTIVE, 'Caixa X and C must NEVER choke open D ring');
  assert.equal(p.skinPhysics.duckGain[2], 1.0, 'Caixa X and C must NEVER duck open D ring');
  f = runDsp(16, f, q, p, smp); // frame 5632 -> ghost d (3584) completed 35 ms touch
  assert.ok(Math.abs(p.skinPhysics.duckGain[2] - SNARE_GHOST_TOUCH_DUCK_GAIN) < 0.01);
  runDsp(14, f, q, p, smp); // second strong D (5632) completed 28 ms ring damp
  assert.equal(p.voiceState[2], VOICE_STATE_ACTIVE, 'Previous Caixa D is damped smoothly, not chopped to FREE');
  assert.ok(Math.abs(p.skinPhysics.duckGain[2] - SNARE_GHOST_TOUCH_DUCK_GAIN * SNARE_STRONG_RING_DUCK_GAIN) < 0.02);

  const mkWebV = (sym: string): any => ({ instrumentId: 'caixa', strokeSymbol: sym, time: 0, holdEnd: 0.5, releaseEnd: 0.9, expectedEnd: 0.9, velocity: 0.9, isFullBuffer: true, source: { stop() {} }, gainNode: { gain: { cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} } } });
  const vCxD = mkWebV('D');
  applyWebAudioTrackSkinPhysics([vCxD], 'caixa', 'X', 0.10);
  applyWebAudioTrackSkinPhysics([vCxD], 'caixa', 'C', 0.15);
  assert.equal(vCxD.expectedEnd, 0.9); assert.equal(vCxD.velocity, 0.9);
  applyWebAudioTrackSkinPhysics([vCxD], 'caixa', 'A', 0.20);
  assert.ok(Math.abs(vCxD.velocity - 0.9 * SNARE_STRONG_RING_DUCK_GAIN) < 1e-5 && vCxD.expectedEnd === 0.9);
}

console.log('caixaStudioBankAndChoke.test.ts: ALL ASSERTIONS PASSED');
