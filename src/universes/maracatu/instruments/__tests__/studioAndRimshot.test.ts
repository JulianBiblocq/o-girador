/**
 * studioAndRimshot.test.ts — Tests unitaires : 10/10 Banques Studio (dont Tarol 53 WAV & Caixa 52 WAV), Fallback composite SOA & Scanner (< 138 lignes).
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
import { ALFAIA_WEAK_RIGHT_BASE_GAIN } from '../alfaiaBankBuilder';
import { instrumentAudioConfigs } from '../index';
import {
  buildStudioAgbeStrokes, buildStudioApitoStrokes, buildStudioCaixaStrokes, buildStudioGongueStrokes,
  buildStudioMineiroStrokes, buildStudioTarolStrokes, buildStudioTimbalStrokes, STUDIO_BANK_ENABLED,
} from '../studioBankRegistry';
import { legacyTarolStrokes, tarolConfig } from '../tarolOnlyConfig';

// 1. Zéro 404 (.ogg + .m4a miroir) sur 100 % des 10 instruments Studio (dont Tarol 53 WAV & Timbal 89 WAV)
{
  assert.deepEqual(STUDIO_BANK_ENABLED, {
    caixa: true, tarol: true, timbal: true, gongue: true, agbe: true, mineiro: true, apito: true,
  });
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
    assert.equal(tbSt.files.length, 6); assert.equal(tbSt.baseGain, 1.0);
    assert.ok(tbSt.files[0].startsWith('Mixdown/Timbal studio '));
  }
  for (const sn of ['caixa', 'tarol'] as const) {
    const snA = EngineVirtualStrokes.resolveStroke(strokesMaps, sn, 'A')!, sna = EngineVirtualStrokes.resolveStroke(strokesMaps, sn, 'a')!;
    assert.equal(snA.files.length, 5); assert.equal(sna.files.length, 5);
    assert.equal(snA.baseGain, 1.0); assert.equal(sna.baseGain, 0.82);
    assert.equal(snA.compositeRimSymbol, undefined); assert.equal(sna.compositeRimSymbol, undefined);
  }
  for (const sym of ['F', 'R', 'r'] as const) assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, 'tarol', sym)!.files.length, 5);
  for (const [id, sym] of [['caixa', 'f'], ['tarol', 'f'], ['timbal', 'f'], ['timbal', 'v'], ['agbe', 's'], ['agbe', 'v'], ['mineiro', 'l']] as const) {
    assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, id, sym)?.baseGain, 0.82);
  }
  assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, 'mineiro', 'l')?.isBarulho, undefined);
  assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, 'apito', 'l')?.isBarulho, true);
  for (const role of ['marcante', 'meiao', 'repique'] as const) {
    assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, role, 'D')?.baseGain, 1.0);
    assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, role, 'e')?.baseGain, 1.0);
    assert.equal(EngineVirtualStrokes.resolveStroke(strokesMaps, role, 'd')?.baseGain, ALFAIA_WEAK_RIGHT_BASE_GAIN[role]);
  }
}

// 2. Nomenclature Studio *_min sans collision Windows/Linux & baseGain 1.0 (a/f/v/s/l virtuels à 0.82)
{
  const studioBanks = [
    buildStudioCaixaStrokes(), buildStudioTarolStrokes(), buildStudioTimbalStrokes(),
    buildStudioGongueStrokes(), buildStudioAgbeStrokes(), buildStudioMineiroStrokes(), buildStudioApitoStrokes(),
  ];
  for (const strokes of studioBanks) {
    const lowerSet = new Map<string, string>();
    for (const s of strokes) {
      const isTimbalLeft = Boolean(s.files[0]?.startsWith('Mixdown/Timbal studio ') && / E \d+\.ogg$/u.test(s.files[0]));
      const isSnareRimA = s.symbol === 'a' && /(?:Caixa|Tarol) studio A /u.test(s.files[0] ?? '');
      const isVirtualWeak = !s.isBarulho && !s.files[0]?.includes('_min') && !isTimbalLeft && (['f', 'v', 's', 'l'].includes(s.symbol) || isSnareRimA);
      assert.equal(s.baseGain, isVirtualWeak ? 0.82 : 1.0, `Studio stroke ${s.symbol} gain mismatch`);
      for (const f of s.files) {
        const key = f.toLowerCase(), prev = lowerSet.get(key);
        if (prev && prev !== f) assert.fail(`Case-collision detected between "${prev}" and "${f}"`);
        lowerSet.set(key, f);
      }
    }
  }
}

// 3. Émission SOA composite de repli Legacy A / a (F + X simultanés) sans auto-choke
{
  const legacyCfg = { ...tarolConfig, calibratedStudioBank: false, strokes: legacyTarolStrokes };
  const strokesMaps = EngineVirtualStrokes.buildStrokesMaps([legacyCfg]), configMap = new Map([[legacyCfg.id, legacyCfg]]);
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
  assert.equal(staged.length, WORKLET_EVENT_STRIDE * 2, 'Composite Rimshot fallback must stage 2 simultaneous SOA tuples');
  const smp: WorkletSampleEntry = { ch0: new Float32Array(4800).fill(0.4), ch1: null, length: 4800, sampleRate: 48000, bodyStartFrame: 0, loopResumeFrame: 0, loopWrapFrame: 4799 };
  const q = new WorkletEventQueue(), pool = new WorkletVoicePoolSoa();
  q.pushPackedEvents(new Float64Array(staged), 2);
  const outL = new Float32Array(128), outR = new Float32Array(128);
  for (let f = 0; f < 512; f += 128) processWorkletDspBlock([[outL, outR]], f, 48000, q, pool, [smp, smp], new Uint8Array(2), new Float32Array([1, 1]), new Float32Array([1, 1]));
  assert.equal(pool.voiceState[0], VOICE_STATE_ACTIVE); assert.equal(pool.voiceState[1], VOICE_STATE_ACTIVE);
}

// 4. Alternance frisée A/a, Gaucher borné à Caixa/Tarol, Scanner Photo cx/tr "A a C ." & Mineiro sans Puxar/Tirar
{
  assert.equal(getAlternatingStroke(0, 'A', 'tarol', 'caixa', 'fr', false), 'A');
  assert.equal(getAlternatingStroke(1, 'A', 'tarol', 'caixa', 'fr', false), 'a');
  assert.equal(getVisualStrokeSymbol('A', true, 'caixa'), 'a');
  assert.equal(getVisualStrokeSymbol('a', true, 'tarol'), 'A');
  assert.equal(getVisualStrokeSymbol('A', true, 'marcante'), 'A');
  assert.equal(getVisualStrokeSymbol('A', true, 'timbal'), 'A');
  assert.equal(applyHandedness('A', instrumentAudioConfigs.find((c) => c.id === 'tarol')!, true), 'a');
  assert.equal(applyHandedness('A', instrumentAudioConfigs.find((c) => c.id === 'marcante')!, true), 'A');

  for (const role of ['cx', 'tr'] as const) {
    const scan = disambiguateRoleAndSteps(role, ['A', 'a', 'C', '.']);
    assert.equal(scan.role, role); assert.equal(scan.wasReclassified, false); assert.deepEqual(scan.steps, ['A', 'a', 'C', '.']);
  }

  const minFr = getMineiroStrokeDefs(true).map((d) => d.label).join(' | '), minPt = getMineiroStrokeDefs(false).map((d) => d.label).join(' | ');
  assert.ok(minFr.includes('P ↑ — Pousser (Avant)') && minFr.includes('T ↓ — Tirer (Vers soi)'));
  assert.ok(minPt.includes('P ↑ — Projetar (Para frente)') && minPt.includes('T ↓ — Trazer (Para trás)'));
  assert.ok(!/puxar|tirar/i.test(minPt) && !/puxar|tirar/i.test(getStrokeDescription('mineiro', 'shaker', 'T', 'pt')));
}

console.log('studioAndRimshot.test.ts: ALL ASSERTIONS PASSED');
