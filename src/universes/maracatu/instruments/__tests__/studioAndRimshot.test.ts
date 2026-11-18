/**
 * studioAndRimshot.test.ts — Tests unitaires : Caixa/Tarol A/a composite, Registre Studio 7 instruments, Scanner Papier & Mineiro (< 138 lignes).
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
  buildStudioAgbeStrokes, buildStudioApitoStrokes, buildStudioGongueStrokes,
  buildStudioMineiroStrokes, buildStudioSnareStrokes, buildStudioTimbalStrokes, STUDIO_BANK_ENABLED,
} from '../studioBankRegistry';

// 1. Zéro 404 sur les 10 instruments (Lot 1 Studio actif sur gongue/agbe/mineiro/apito ; caixa/tarol/timbal à false) + nuances 0.82
{
  const expectedStudioFlags: Record<string, boolean> = {
    caixa: false, tarol: false, timbal: false, gongue: true, agbe: true, mineiro: true, apito: true,
  };
  assert.deepEqual(STUDIO_BANK_ENABLED, expectedStudioFlags);
  const publicDir = path.resolve(process.cwd(), 'public');
  for (const cfg of instrumentAudioConfigs) {
    for (const st of cfg.strokes) {
      assert.ok(st.files.length > 0, `${cfg.id}:${st.symbol} must have sample files`);
      for (const rel of st.files) {
        const full = path.join(publicDir, rel);
        assert.equal(fs.existsSync(full), true, `Missing sample file on disk (would 404): ${rel} for ${cfg.id}:${st.symbol}`);
        if (STUDIO_BANK_ENABLED[cfg.id as keyof typeof STUDIO_BANK_ENABLED]) {
          assert.equal(fs.existsSync(full.replace(/\.ogg$/i, '.m4a')), true, `Missing .m4a fallback for ${rel}`);
        }
      }
    }
  }

  const strokesMaps = EngineVirtualStrokes.buildStrokesMaps(instrumentAudioConfigs);
  for (const snareId of ['caixa', 'tarol']) {
    const sA = EngineVirtualStrokes.resolveStroke(strokesMaps, snareId, 'A')!;
    const sa = EngineVirtualStrokes.resolveStroke(strokesMaps, snareId, 'a')!;
    const sf = EngineVirtualStrokes.resolveStroke(strokesMaps, snareId, 'f')!;
    assert.equal(sA.baseGain, 1.0); assert.equal(sa.baseGain, 1.0);
    assert.equal(sA.compositeRimSymbol, 'X'); assert.equal(sa.compositeRimSymbol, 'X');
    assert.equal(sf.baseGain, 0.82);
  }
  for (const [id, sym] of [['timbal', 'f'], ['timbal', 'v'], ['agbe', 's'], ['agbe', 'v'], ['mineiro', 'l']] as const) {
    assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, id, sym)?.baseGain, 0.82);
  }
  assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, 'mineiro', 'l')?.isBarulho, undefined);
  assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, 'apito', 'l')?.isBarulho, true);
  assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, 'apito', 'l')?.baseGain, 1.0);
}

// 2. Nomenclature Studio *_min sans collision Windows/Linux & baseGain 1.0 (f/v/s/l one-shot uniquement à 0.82)
{
  const studioBanks = [
    buildStudioSnareStrokes('Caixa'), buildStudioSnareStrokes('Tarol'), buildStudioTimbalStrokes(),
    buildStudioGongueStrokes(), buildStudioAgbeStrokes(), buildStudioMineiroStrokes(), buildStudioApitoStrokes(),
  ];
  for (const strokes of studioBanks) {
    const lowerSet = new Map<string, string>();
    for (const s of strokes) {
      const isVirtualWeak = !s.isBarulho && !s.files[0]?.includes('_min') && ['f', 'v', 's', 'l'].includes(s.symbol);
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

// 3. Émission SOA composite Caixa A / a (F + X simultanés) sans auto-choke
{
  const strokesMaps = EngineVirtualStrokes.buildStrokesMaps(instrumentAudioConfigs);
  const configMap = new Map(instrumentAudioConfigs.map((c) => [c.id, c]));
  const staged: number[] = [];
  const res = stageMeasureStrokeEvent({
    seqId: 1, measureIdx: 0, trackId: 5, instId: 'caixa', strokeSymbol: 'a',
    circleStepIdx: 1, isSecondStroke: false, velocity: 0.9, decayPct: 100,
    triggerFrame: 256, swungTimeSec: 256 / 48000, sampleRate: 48000, stagedEvents: staged,
    engineDeps: {
      configMap, strokesMaps, isTrackRoutedToWorklet: () => true, getTrackSlot: () => 0,
      getTrackUnisonDelaySec: () => 0, getTrackBalancoAdherence: () => 1, getTrackPitchRatio: () => 1,
      selectRoundRobinFile: (_i, st) => st.files[0], getSampleId: (p) => (p.includes('X.ogg') ? 1 : 0),
    },
  });
  assert.equal(res, 'ok');
  assert.equal(staged.length, WORKLET_EVENT_STRIDE * 2, 'Composite Rimshot must stage 2 simultaneous SOA tuples');
  assert.equal(staged[0], 256);
  assert.equal(staged[WORKLET_EVENT_STRIDE], 256);

  const smp: WorkletSampleEntry = { ch0: new Float32Array(4800).fill(0.4), ch1: null, length: 4800, sampleRate: 48000, bodyStartFrame: 0, loopResumeFrame: 0, loopWrapFrame: 4799 };
  const q = new WorkletEventQueue(), pool = new WorkletVoicePoolSoa();
  q.pushPackedEvents(new Float64Array(staged), 2);
  const outL = new Float32Array(128), outR = new Float32Array(128);
  for (let f = 0; f < 512; f += 128) {
    processWorkletDspBlock([[outL, outR]], f, 48000, q, pool, [smp, smp], new Uint8Array(2), new Float32Array([1, 1]), new Float32Array([1, 1]));
  }
  assert.equal(pool.voiceState[0], VOICE_STATE_ACTIVE, 'Head layer must remain ACTIVE (zero self-choke)');
  assert.equal(pool.voiceState[1], VOICE_STATE_ACTIVE, 'Rim X layer must remain ACTIVE (zero self-choke)');
}

// 4. Alternance frisée A/a, Gaucher borné à Caixa/Tarol, Scanner Photo cx "A a C ." & Mineiro sans Puxar/Tirar
{
  assert.equal(getAlternatingStroke(0, 'A', 'caixa', 'caixa', 'fr', false), 'A');
  assert.equal(getAlternatingStroke(1, 'A', 'caixa', 'caixa', 'fr', false), 'a');
  assert.equal(getVisualStrokeSymbol('A', true, 'caixa'), 'a');
  assert.equal(getVisualStrokeSymbol('a', true, 'tarol'), 'A');
  assert.equal(getVisualStrokeSymbol('A', true, 'marcante'), 'A', 'Alfaia A must NOT flip to a');
  assert.equal(getVisualStrokeSymbol('A', true, 'timbal'), 'A', 'Timbal A must NOT flip in visualStrokeSymbol');
  const cxCfg = instrumentAudioConfigs.find((c) => c.id === 'caixa')!;
  const mcCfg = instrumentAudioConfigs.find((c) => c.id === 'marcante')!;
  assert.equal(applyHandedness('A', cxCfg, true), 'a');
  assert.equal(applyHandedness('A', mcCfg, true), 'A');

  const scanCx = disambiguateRoleAndSteps('cx', ['A', 'a', 'C', '.']);
  assert.equal(scanCx.role, 'cx', 'cx line with A a C . must NEVER be reclassified to gg');
  assert.equal(scanCx.wasReclassified, false);
  assert.deepEqual(scanCx.steps, ['A', 'a', 'C', '.'], 'C and lowercase a must be preserved intact on cx');

  const minFr = getMineiroStrokeDefs(true).map((d) => d.label).join(' | ');
  const minPt = getMineiroStrokeDefs(false).map((d) => d.label).join(' | ');
  assert.ok(minFr.includes('P ↑ — Pousser (Avant)') && minFr.includes('T ↓ — Tirer (Vers soi)'));
  assert.ok(minPt.includes('P ↑ — Projetar (Para frente)') && minPt.includes('T ↓ — Trazer (Para trás)'));
  assert.ok(!/puxar|tirar/i.test(minPt) && !/puxar|tirar/i.test(getStrokeDescription('mineiro', 'shaker', 'T', 'pt')));
}

console.log('studioAndRimshot.test.ts: ALL ASSERTIONS PASSED');
