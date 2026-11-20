/**
 * studioAndRimshot.test.ts — Tests unitaires : Caixa Studio (52 WAV) vs Tarol Legacy composite, Registre 7 instruments, Scanner & Mineiro (< 136 lignes).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EngineVirtualStrokes } from '../../../../audio/engine/engineVirtualStrokes';
import { stageMeasureStrokeEvent } from '../../../../audio/worklet/horizon/workletStrokeEventStager';
import { VOICE_STATE_ACTIVE, WORKLET_EVENT_STRIDE, WorkletSampleEntry } from '../../../../audio/worklet/percussionWorkletTypes';
import { processWorkletDspBlock } from '../../../../audio/worklet/processor/workletDspKernel';
import { WorkletEventQueue } from '../../../../audio/worklet/processor/workletEventQueue';
import { WorkletVoicePoolSoa } from '../../../../audio/worklet/processor/workletVoicePoolSoa';
import { getStrokeDescription } from '../../../../components/touch-stroke/getStrokeDescription';
import { applyHandedness } from '../../../../input/inputStrokeMatcher';
import { disambiguateRoleAndSteps } from '../../../../utils/paper/paperRoleDisambiguator';
import { getAlternatingStroke } from '../../strokes/strokeNuanceCycles';
import { getMineiroStrokeDefs } from '../../strokes/mineiroStrokes';
import { getVisualStrokeSymbol } from '../../strokes/visualStrokeSymbol';
import { instrumentAudioConfigs } from '../index';
import {
  buildStudioAgbeStrokes, buildStudioApitoStrokes, buildStudioCaixaStrokes, buildStudioGongueStrokes,
  buildStudioMineiroStrokes, buildStudioSnareStrokes, buildStudioTimbalStrokes, STUDIO_BANK_ENABLED,
} from '../studioBankRegistry';

// 1. Zéro 404 (.ogg + .m4a miroir) sur les 10 instruments (Timbal Studio 89 WAV actif ; seul tarol reste Legacy)
{
  const expectedStudioFlags: Record<string, boolean> = {
    caixa: true, tarol: false, timbal: true, gongue: true, agbe: true, mineiro: true, apito: true,
  };
  assert.deepEqual(STUDIO_BANK_ENABLED, expectedStudioFlags);
  const publicDir = path.resolve(process.cwd(), 'public');
  for (const cfg of instrumentAudioConfigs) {
    for (const st of cfg.strokes) {
      assert.ok(st.files.length > 0, `${cfg.id}:${st.symbol} must have sample files`);
      for (const rel of st.files) {
        const full = path.join(publicDir, rel);
        assert.equal(fs.existsSync(full), true, `Missing sample file on disk (would 404): ${rel} for ${cfg.id}:${st.symbol}`);
        assert.equal(fs.existsSync(full.replace(/\.ogg$/i, '.m4a')), true, `Missing .m4a fallback for ${rel}`);
      }
    }
  }

  const strokesMaps = EngineVirtualStrokes.buildStrokesMaps(instrumentAudioConfigs);
  for (const sym of ['G', 'g', 'A', 'a', 'S', 's', 'T', 't', 'D', 'd', 'P', 'p'] as const) {
    const tbSt = EngineVirtualStrokes.resolveStroke(strokesMaps, 'timbal', sym)!;
    assert.equal(tbSt.files.length, 6, `Timbal ${sym} must have 6 dedicated takes`);
    assert.equal(tbSt.baseGain, 1.0, `Timbal ${sym} must have nominal 1.0 velocity`);
    assert.ok(tbSt.files[0].startsWith('Mixdown/Timbal studio '), `Timbal ${sym} must point to Timbal studio`);
  }
  const cxA = EngineVirtualStrokes.resolveStroke(strokesMaps, 'caixa', 'A')!;
  const cxa = EngineVirtualStrokes.resolveStroke(strokesMaps, 'caixa', 'a')!;
  assert.equal(cxA.baseGain, 1.0); assert.equal(cxa.baseGain, 0.82);
  assert.equal(cxA.compositeRimSymbol, undefined); assert.equal(cxa.compositeRimSymbol, undefined);

  const trA = EngineVirtualStrokes.resolveStroke(strokesMaps, 'tarol', 'A')!;
  const tra = EngineVirtualStrokes.resolveStroke(strokesMaps, 'tarol', 'a')!;
  assert.equal(trA.baseGain, 1.0); assert.equal(tra.baseGain, 1.0);
  assert.equal(trA.compositeRimSymbol, 'X'); assert.equal(tra.compositeRimSymbol, 'X');

  for (const [id, sym] of [['caixa', 'f'], ['tarol', 'f'], ['timbal', 'f'], ['timbal', 'v'], ['agbe', 's'], ['agbe', 'v'], ['mineiro', 'l']] as const) {
    assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, id, sym)?.baseGain, 0.82);
  }
  assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, 'mineiro', 'l')?.isBarulho, undefined);
  assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, 'apito', 'l')?.isBarulho, true);
}

// 2. Nomenclature Studio *_min sans collision Windows/Linux & baseGain 1.0 (a/f/v/s/l virtuels à 0.82)
{
  const studioBanks = [
    buildStudioCaixaStrokes(), buildStudioSnareStrokes('Tarol'), buildStudioTimbalStrokes(),
    buildStudioGongueStrokes(), buildStudioAgbeStrokes(), buildStudioMineiroStrokes(), buildStudioApitoStrokes(),
  ];
  for (const strokes of studioBanks) {
    const lowerSet = new Map<string, string>();
    for (const s of strokes) {
      const isTimbalDedicatedLeft = Boolean(s.files[0]?.startsWith('Mixdown/Timbal studio ') && / E \d+\.ogg$/u.test(s.files[0]));
      const isVirtualWeak = !s.isBarulho && !s.files[0]?.includes('_min') && !isTimbalDedicatedLeft && (['f', 'v', 's', 'l'].includes(s.symbol) || (s.symbol === 'a' && s.files[0]?.includes('Caixa studio A')));
      const expectedGain = isVirtualWeak ? 0.82 : 1.0;
      assert.equal(s.baseGain, expectedGain, `Studio stroke ${s.symbol} expected gain ${expectedGain}`);
      for (const f of s.files) {
        const key = f.toLowerCase();
        const prev = lowerSet.get(key);
        if (prev && prev !== f) assert.fail(`Case-collision detected between "${prev}" and "${f}"`);
        lowerSet.set(key, f);
      }
    }
  }
}

// 3. Émission SOA composite Tarol Legacy A / a (F + X simultanés) sans auto-choke
{
  const strokesMaps = EngineVirtualStrokes.buildStrokesMaps(instrumentAudioConfigs);
  const configMap = new Map(instrumentAudioConfigs.map((c) => [c.id, c]));
  const staged: number[] = [];
  const res = stageMeasureStrokeEvent({
    seqId: 1, measureIdx: 0, trackId: 5, instId: 'tarol', strokeSymbol: 'a',
    circleStepIdx: 1, isSecondStroke: false, velocity: 0.9, decayPct: 100,
    triggerFrame: 256, swungTimeSec: 256 / 48000, sampleRate: 48000, stagedEvents: staged,
    engineDeps: {
      configMap, strokesMaps, isTrackRoutedToWorklet: () => true, getTrackSlot: () => 0,
      getTrackUnisonDelaySec: () => 0, getTrackBalancoAdherence: () => 1, getTrackPitchRatio: () => 1,
      selectRoundRobinFile: (_i, st) => st.files[0], getSampleId: (p) => (p.includes('X.ogg') ? 1 : 0),
    },
  });
  assert.equal(res, 'ok');
  assert.equal(staged.length, WORKLET_EVENT_STRIDE * 2, 'Composite Rimshot on Tarol Legacy must stage 2 simultaneous SOA tuples');
  const smp: WorkletSampleEntry = { ch0: new Float32Array(4800).fill(0.4), ch1: null, length: 4800, sampleRate: 48000, bodyStartFrame: 0, loopResumeFrame: 0, loopWrapFrame: 4799 };
  const q = new WorkletEventQueue(), pool = new WorkletVoicePoolSoa();
  q.pushPackedEvents(new Float64Array(staged), 2);
  const outL = new Float32Array(128), outR = new Float32Array(128);
  for (let f = 0; f < 512; f += 128) processWorkletDspBlock([[outL, outR]], f, 48000, q, pool, [smp, smp], new Uint8Array(2), new Float32Array([1, 1]), new Float32Array([1, 1]));
  assert.equal(pool.voiceState[0], VOICE_STATE_ACTIVE); assert.equal(pool.voiceState[1], VOICE_STATE_ACTIVE);
}

// 4. Alternance frisée A/a, Gaucher borné à Caixa/Tarol, Scanner Photo cx "A a C ." & Mineiro sans Puxar/Tirar
{
  assert.equal(getAlternatingStroke(0, 'A', 'caixa', 'caixa', 'fr', false), 'A');
  assert.equal(getAlternatingStroke(1, 'A', 'caixa', 'caixa', 'fr', false), 'a');
  assert.equal(getVisualStrokeSymbol('A', true, 'caixa'), 'a');
  assert.equal(getVisualStrokeSymbol('a', true, 'tarol'), 'A');
  assert.equal(getVisualStrokeSymbol('A', true, 'marcante'), 'A');
  assert.equal(getVisualStrokeSymbol('A', true, 'timbal'), 'A');
  const cxCfg = instrumentAudioConfigs.find((c) => c.id === 'caixa')!;
  const mcCfg = instrumentAudioConfigs.find((c) => c.id === 'marcante')!;
  assert.equal(applyHandedness('A', cxCfg, true), 'a');
  assert.equal(applyHandedness('A', mcCfg, true), 'A');

  const scanCx = disambiguateRoleAndSteps('cx', ['A', 'a', 'C', '.']);
  assert.equal(scanCx.role, 'cx'); assert.equal(scanCx.wasReclassified, false);
  assert.deepEqual(scanCx.steps, ['A', 'a', 'C', '.']);

  const minFr = getMineiroStrokeDefs(true).map((d) => d.label).join(' | ');
  const minPt = getMineiroStrokeDefs(false).map((d) => d.label).join(' | ');
  assert.ok(minFr.includes('P ↑ — Pousser (Avant)') && minFr.includes('T ↓ — Tirer (Vers soi)'));
  assert.ok(minPt.includes('P ↑ — Projetar (Para frente)') && minPt.includes('T ↓ — Trazer (Para trás)'));
  assert.ok(!/puxar|tirar/i.test(minPt) && !/puxar|tirar/i.test(getStrokeDescription('mineiro', 'shaker', 'T', 'pt')));
}

console.log('studioAndRimshot.test.ts: ALL ASSERTIONS PASSED');
