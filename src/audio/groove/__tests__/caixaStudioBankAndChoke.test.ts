/**
 * caixaStudioBankAndChoke.test.ts — Validation Banques Studio `Caixa` (52 WAV) & `Tarol` (53 WAV), Non-Destruction Legacy,
 * Nominal `1.0` sur `d`/`e`/`r` (`r_min`), Boucles `640..2600 ms` / `1145..3665 ms`, Cycle `B->b->/->.` & Choke DSP (< 136 lignes).
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

// 1. Préservation Legacy `Caixa` + `Tarol` + Cache v9 + Boucles Studio + `r_min` nominal 1.0 sur Caixa & Tarol
{
  assert.equal(SAMPLE_CACHE_VERSION, 14);
  const mixDir = path.resolve(process.cwd(), 'public/Mixdown');
  const legacyFiles = [
    'Caixa B.ogg', 'Caixa C 1.ogg', 'Caixa C 2.ogg', 'Caixa F 1.ogg', 'Caixa F 2.ogg', 'Caixa F 3.ogg', 'Caixa F 4.ogg',
    'Caixa Fla 1.ogg', 'Caixa Fla 2.ogg', 'Caixa R 1.ogg', 'Caixa R 2.ogg', 'Caixa X.ogg',
    'Caixa faible 1.ogg', 'Caixa faible 2.ogg', 'Caixa faible 3.ogg', 'Caixa faible 4.ogg',
    'Tarol B.ogg', 'Tarol C 1.ogg', 'Tarol C 2.ogg', 'Tarol F1.ogg', 'Tarol F 2.ogg', 'Tarol F 3.ogg', 'Tarol F 4.ogg',
    'Tarol Fla 1.ogg', 'Tarol Fla 2.ogg', 'Tarol R 1.ogg', 'Tarol R 2.ogg', 'Tarol X.ogg',
    'Tarol faible 1.ogg', 'Tarol faible 2.ogg', 'Tarol faible 3.ogg', 'Tarol faible 4.ogg',
  ];
  for (const lf of legacyFiles) assert.equal(fs.existsSync(path.join(mixDir, lf)), true, `Legacy snare file must remain intact: ${lf}`);

  assert.equal(resolveLoopSampleFilePath('caixa'), 'Mixdown/Caixa studio B.ogg');
  assert.equal(resolveLoopSampleFilePath('caixa', { caixa: false }), 'Mixdown/Caixa B.ogg');
  assert.equal(resolveLoopSampleFilePath('tarol'), 'Mixdown/Tarol studio B 1.ogg');
  assert.equal(resolveLoopSampleFilePath('tarol', { tarol: false }), 'Mixdown/Tarol B.ogg');
  assert.equal(resolveLoopInstrumentFromPath('Mixdown/Caixa studio B.ogg'), 'caixa');
  assert.equal(resolveLoopInstrumentFromPath('Mixdown/Tarol studio B 1.ogg'), 'tarol');
  assert.deepEqual(getEffectiveBarulhoLoopPoints('caixa', 3326, 'studio'), { loopStartMs: 640, loopEndMs: 2600, crossfadeMs: 110, softEntryMs: 820 });
  assert.deepEqual(getEffectiveBarulhoLoopPoints('tarol', 4677, 'studio'), { loopStartMs: 1145, loopEndMs: 3665, crossfadeMs: 110, softEntryMs: 1325 });
  assert.deepEqual(getEffectiveBarulhoLoopPoints('tarol', 5000, 'legacy'), { loopStartMs: 240, loopEndMs: 4665, crossfadeMs: 110, softEntryMs: 420 });

  for (const inst of ['caixa', 'tarol'] as const) {
    assert.equal(getNextNuanceState('B', 'B', inst, 'caixa', 'fr', false), 'b');
    assert.equal(getNextNuanceState('b', 'B', inst, 'caixa', 'fr', false), '/');
    assert.equal(getNextNuanceState('/', 'B', inst, 'caixa', 'fr', false), '.');
  }

  const strokesMaps = EngineVirtualStrokes.buildStrokesMaps(instrumentAudioConfigs);
  const configMap = new Map(instrumentAudioConfigs.map((c) => [c.id, c]));
  assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, 'tarol', 'C')!.files.length, 4);
  assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, 'tarol', 'R')!.files.length, 5);
  assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, 'tarol', 'r')!.files.length, 5);
  assert.deepEqual(EngineVirtualStrokes.resolveStroke(strokesMaps, 'tarol', 'b')!.files, ['Mixdown/Tarol studio B 1.ogg']);

  const deps = { configMap, strokesMaps, isTrackRoutedToWorklet: () => true, getTrackSlot: () => 0, getTrackUnisonDelaySec: () => 0, getTrackBalancoAdherence: () => 1, getTrackPitchRatio: () => 1, selectRoundRobinFile: (_i: string, st: any) => st.files[0], getSampleId: () => 0 };
  const stCxR: number[] = [], stTrR: number[] = [], stTrd: number[] = [], stTrB: number[] = [];
  stageMeasureStrokeEvent({ seqId: 1, measureIdx: 0, trackId: 1, instId: 'caixa', strokeSymbol: 'r', circleStepIdx: 0, isSecondStroke: false, velocity: 1.0, decayPct: 100, triggerFrame: 0, swungTimeSec: 0, sampleRate: SR, engineDeps: deps, stagedEvents: stCxR });
  stageMeasureStrokeEvent({ seqId: 1, measureIdx: 0, trackId: 2, instId: 'tarol', strokeSymbol: 'r', circleStepIdx: 0, isSecondStroke: false, velocity: 1.0, decayPct: 100, triggerFrame: 0, swungTimeSec: 0, sampleRate: SR, engineDeps: deps, stagedEvents: stTrR });
  stageMeasureStrokeEvent({ seqId: 1, measureIdx: 0, trackId: 2, instId: 'tarol', strokeSymbol: 'd', circleStepIdx: 0, isSecondStroke: false, velocity: 1.0, decayPct: 100, triggerFrame: 0, swungTimeSec: 0, sampleRate: SR, engineDeps: deps, stagedEvents: stTrd });
  stageMeasureStrokeEvent({ seqId: 1, measureIdx: 0, trackId: 2, instId: 'tarol', strokeSymbol: 'B', circleStepIdx: 0, isSecondStroke: false, velocity: 1.0, decayPct: 100, triggerFrame: 0, swungTimeSec: 0, sampleRate: SR, engineDeps: { ...deps, getTrackPitchRatio: () => Math.pow(2, -1.6 / 12) }, stagedEvents: stTrB });
  assert.ok(stCxR[4] >= 0.975 && stCxR[4] <= 1.025); assert.equal(stCxR[7], 1.0);
  assert.ok(stTrR[4] >= 0.975 && stTrR[4] <= 1.025, 'Tarol Studio r_min must preserve nominal 1.0 ± 2.5% live breathing (no 0.88 penalty)');
  assert.equal(stTrR[7], 1.0, 'Tarol Studio r_min must preserve 1.0 pitchNuance');
  assert.ok(stTrd[4] >= 0.975 && stTrd[4] <= 1.025); assert.equal(stTrd[5], 1.0); assert.equal(stTrd[7], 1.0);
  assert.equal(stTrB[7], 1.0, 'Tarol B must keep eventPitchNuance 1.0 so slotPitchRatio applies');
  assert.equal(EngineTuning.calculatePitch('tarol', configMap.get('tarol')!, { tuning: 0 } as any), 1.0);
  assert.ok(Math.abs(computeRoleChorusSpreadSummary('tarol', 0, 2, 1.0).maxCents - 16) < 1e-6);
  const plan = solveRodaSpectralBreathing([{ id: 1, instrumentIdx: 3, instrumentId: 'caixa', tuning: 0 }, { id: 2, instrumentIdx: 4, instrumentId: 'tarol', tuning: 0 }] as any, 0.75);
  assert.ok(Math.abs(plan.tarol[0].frequencyHz - Math.min(165.41 * 1.08, 0.85 * 214.84)) < 0.01);
}

// 2. Physique Choke DSP `Caixa` & `Tarol` (20 ms sur `B/b`, amortissement `-5.5 dB` ring sur forts/Rufadas, `d/e` doux, immunité `X` et `C`)
{
  for (const inst of ['caixa', 'tarol'] as const) {
    for (const sym of ['D', 'd', 'E', 'e', 'A', 'a', 'R', 'r', 'F', 'f', 'X', 'C']) {
      assert.equal(resolveFrankStrokeBarulhoChokeSec(inst, sym), 0.020, `${inst} ${sym} must choke Barulho in 20 ms`);
    }
  }
  const q = new WorkletEventQueue(), p = new WorkletVoicePoolSoa(), smp = [makeSample(2.0, true), makeSample(0.9, false)];
  const spB = resolveTrackPhysicsSpec('tarol', 'B', true), spD = resolveTrackPhysicsSpec('tarol', 'D', false);
  const spX = resolveTrackPhysicsSpec('tarol', 'X', false), spC = resolveTrackPhysicsSpec('tarol', 'C', false), spd = resolveTrackPhysicsSpec('tarol', 'd', false);
  q.pushPackedEvents(new Float64Array([
    0, 4, 0, 0, 0.9, 1.0, 1, 1.0, packWorkletEventFlags(1, spB.chokeMode, spB.voiceClass, true, false, BARULHO_OP_ATTACK_B),
    512, 4, 0, 1, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, spX.chokeMode, spX.voiceClass, true, false, BARULHO_OP_NONE),
    2048, 4, 0, 1, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, spD.chokeMode, spD.voiceClass, true, false, BARULHO_OP_NONE),
    2560, 4, 0, 1, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, spX.chokeMode, spX.voiceClass, true, false, BARULHO_OP_NONE),
    3072, 4, 0, 1, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, spC.chokeMode, spC.voiceClass, true, false, BARULHO_OP_NONE),
    3584, 4, 0, 1, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, spd.chokeMode, spd.voiceClass, true, false, BARULHO_OP_NONE),
    5632, 4, 0, 1, 0.9, 1.0, 1.0, 1.0, packWorkletEventFlags(1, spD.chokeMode, spD.voiceClass, true, false, BARULHO_OP_NONE),
  ]), 7);

  let f = runDsp(5, 0, q, p, smp);
  assert.equal(p.voiceState[0], VOICE_STATE_CHOKING, 'Tarol X must choke active Barulho B in 20 ms');
  assert.equal(p.voiceChokeFramesLeft[0], 960 - 128);
  f = runDsp(11, f, q, p, smp);
  assert.equal(p.voiceState[0], VOICE_STATE_FREE);
  f = runDsp(12, f, q, p, smp);
  assert.equal(p.voiceState[2], VOICE_STATE_ACTIVE, 'Tarol X and C must NEVER choke open D ring');
  assert.equal(p.skinPhysics.duckGain[2], 1.0, 'Tarol X and C must NEVER duck open D ring');
  f = runDsp(16, f, q, p, smp);
  assert.ok(Math.abs(p.skinPhysics.duckGain[2] - SNARE_GHOST_TOUCH_DUCK_GAIN) < 0.01);
  runDsp(14, f, q, p, smp);
  assert.equal(p.voiceState[2], VOICE_STATE_ACTIVE, 'Previous Tarol D is damped smoothly, not chopped to FREE');
  assert.ok(Math.abs(p.skinPhysics.duckGain[2] - SNARE_GHOST_TOUCH_DUCK_GAIN * SNARE_STRONG_RING_DUCK_GAIN) < 0.02);

  const mkWebV = (sym: string): any => ({ instrumentId: 'tarol', strokeSymbol: sym, time: 0, holdEnd: 0.5, releaseEnd: 0.9, expectedEnd: 0.9, velocity: 0.9, isFullBuffer: true, source: { stop() {} }, gainNode: { gain: { cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} } } });
  const vTrD = mkWebV('D');
  applyWebAudioTrackSkinPhysics([vTrD], 'tarol', 'X', 0.10);
  applyWebAudioTrackSkinPhysics([vTrD], 'tarol', 'C', 0.15);
  assert.equal(vTrD.expectedEnd, 0.9); assert.equal(vTrD.velocity, 0.9);
  applyWebAudioTrackSkinPhysics([vTrD], 'tarol', 'A', 0.20);
  assert.ok(Math.abs(vTrD.velocity - 0.9 * SNARE_STRONG_RING_DUCK_GAIN) < 1e-5 && vTrD.expectedEnd === 0.9);
}

console.log('caixaStudioBankAndChoke.test.ts: ALL ASSERTIONS PASSED');
