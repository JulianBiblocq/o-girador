/**
 * ensembleAcousticsAndLoopLab.test.ts — Suite unitaire complète : Chœur de Peaux (N=1..4, invariance Mute/Solo),
 * Respiration Spectrale (lowshelf Q=0.707, auto-protection <= 0.85*f_lowest) & Labo Boucles (studio vs legacy, Apito L) (< 140 lignes).
 */
import assert from 'node:assert/strict';
import { clampProtectedLowShelfHz, computeFormationSignature, solveRodaSpectralBreathing } from '../../effects/rodaSpectralBreathingSolver';
import { PercussionWorkletSampleBridge } from '../../worklet/percussionWorkletSampleBridge';
import { VOICE_STATE_ACTIVE } from '../../worklet/percussionWorkletTypes';
import { BARULHO_OP_ATTACK_B, BARULHO_OP_SOFT_B, CHOKE_NONE, VOICE_CLASS_GENERIC, packWorkletEventFlags, resolveBarulhoOpForSymbol } from '../../worklet/processor/workletEventFlags';
import {
  buildLoopOverrideKey, getEffectiveBarulhoLoopPoints, resetBarulhoLoopOverride,
  resolveLoopSampleFilePath, setBarulhoLoopOverride,
} from '../barulhoLoopRegistry';
import { EngineTuning } from '../engineTuning';
import { computeRoleChorusSpreadSummary, computeTrackSkinChorusCents } from '../skinChorusCalculator';

// Mock localStorage minimaliste pour Node
const memStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => memStore.get(k) ?? null,
  setItem: (k: string, v: string) => { memStore.set(k, String(v)); },
  removeItem: (k: string) => { memStore.delete(k); },
};
{
  const mcCfg: any = { id: 'marcante', name: 'Marcante', strokes: [], macroPitch: 1.0, calibratedStudioBank: true };
  const singleGongue: any[] = [{ id: 10, instrumentIdx: 5, tuning: -1.0 }];
  assert.equal(computeTrackSkinChorusCents('gongue', singleGongue[0], singleGongue as any, -1.0, 0.75), 0);

  const fourMarcantes: any[] = [
    { id: 40, instrumentIdx: 0, tuning: -1.5 },
    { id: 10, instrumentIdx: 0, tuning: -1.5 },
    { id: 30, instrumentIdx: 0, tuning: -1.5 },
    { id: 20, instrumentIdx: 0, tuning: -1.5 },
  ];
  const cents4 = [10, 20, 30, 40].map((id) =>
    computeTrackSkinChorusCents('marcante', fourMarcantes.find((t) => t.id === id)!, fourMarcantes as any, -1.5, 0.75)
  );
  assert.ok(Math.abs(cents4[0] - -15) < 0.05 && Math.abs(cents4[3] - 15) < 0.05, 'Outer pair must be ±15 cents at 75%');
  assert.ok(Math.abs(cents4[1] - -5.25) < 0.05 && Math.abs(cents4[2] - 5.25) < 0.05, 'Inner pair must be ±0.35 * 15 cents');
  assert.ok(Math.abs(cents4.reduce((a, b) => a + b, 0)) < 1e-9, 'Algebraic center must be strictly 0.0 cents');

  const mutedVariant = fourMarcantes.map((t, i) => ({ ...t, isMute: i < 2, isSolo: i === 2, isHidden: i === 3 }));
  for (const id of [10, 20, 30, 40]) {
    const pClean = EngineTuning.calculatePitch('marcante', mcCfg, fourMarcantes.find((t) => t.id === id), undefined, fourMarcantes as any, 0.75);
    const pMuted = EngineTuning.calculatePitch('marcante', mcCfg, mutedVariant.find((t) => t.id === id), undefined, mutedVariant as any, 0.75);
    assert.equal(pClean, pMuted, 'Mute / Solo / Hidden must NEVER shift track pitch');
  }

  const spBase = computeRoleChorusSpreadSummary('marcante', -1.5, 2, 0.75);
  const spLow = computeRoleChorusSpreadSummary('marcante', -5.5, 2, 0.75);
  const spHigh = computeRoleChorusSpreadSummary('marcante', 2.5, 2, 0.75);
  assert.ok(spBase.maxHz > 0.52 && spBase.maxHz < 0.62, `Marcante Do2 spread ~0.57 Hz, got ${spBase.maxHz}`);
  assert.ok(spLow.maxHz > 0.38 && spLow.maxHz < 0.47, `Marcante -4st spread ~0.42 Hz, got ${spLow.maxHz}`);
  assert.ok(spHigh.maxHz > 0.70 && spHigh.maxHz < 0.81, `Marcante +4st spread ~0.75 Hz, got ${spHigh.maxHz}`);

  const nonTuned: any[] = [{ id: 1, instrumentIdx: 9, instrumentId: 'apito' }, { id: 2, instrumentIdx: 9, instrumentId: 'apito' }];
  assert.equal(EngineTuning.calculatePitch('apito', { id: 'apito', strokes: [] } as any, nonTuned[0], undefined, nonTuned as any, 1.0), 1.0);
  assert.equal(computeTrackSkinChorusCents('agbe', { id: 1 } as any, [{ id: 1, instrumentId: 'agbe' } as any, { id: 2, instrumentId: 'agbe' } as any], 0, 1.0), 0);
  assert.equal(computeTrackSkinChorusCents('mineiro', { id: 1 } as any, [{ id: 1, instrumentId: 'mineiro' } as any, { id: 2, instrumentId: 'mineiro' } as any], 0, 1.0), 0);
}

// 2. Volet 2 + Garde-fou 1 : Respiration Spectrale fixe, lowshelf Q=0.707 sans déphasage & plafond <= 0.85 * f_lowest
{
  const formation: any[] = [
    { id: 1, instrumentIdx: 0, instrumentId: 'marcante', tuning: 5.0 },
    { id: 2, instrumentIdx: 1, instrumentId: 'meiao', tuning: 0.3 },
    { id: 3, instrumentIdx: 2, instrumentId: 'repique', tuning: 0.3 },
    { id: 4, instrumentIdx: 8, instrumentId: 'timbal', tuning: 0.0 },
    { id: 5, instrumentIdx: 3, instrumentId: 'caixa', tuning: 0.0 },
    { id: 6, instrumentIdx: 4, instrumentId: 'tarol', tuning: 0.0 },
    { id: 7, instrumentIdx: 5, instrumentId: 'gongue', tuning: -1.0 },
  ];
  const mutedFormation = formation.map((t, idx) => ({ ...t, isMute: idx % 2 === 0, isSolo: idx === 1 }));
  assert.equal(computeFormationSignature(formation as any, 0.75), computeFormationSignature(mutedFormation as any, 0.75));
  assert.deepEqual(solveRodaSpectralBreathing(formation as any, 0.75), solveRodaSpectralBreathing(mutedFormation as any, 0.75));

  const plan0 = solveRodaSpectralBreathing(formation as any, 0.0);
  for (const specs of Object.values(plan0)) {
    for (const s of specs) assert.equal(s.gainDb, 0, 'At 0% / [Avant], every biquad must be strictly 0 dB (H(z) = 1)');
  }

  const plan75 = solveRodaSpectralBreathing(formation as any, 0.75);
  const plan100 = solveRodaSpectralBreathing(formation as any, 1.0);
  const tbShelf = plan75.timbal[0];
  assert.equal(tbShelf.type, 'lowshelf');
  assert.ok(Math.abs(tbShelf.q - Math.SQRT1_2) < 1e-6);
  assert.equal(tbShelf.gainDb, -3.5);
  assert.ok(Math.abs(plan100.timbal[0].gainDb - -4.6667) < 0.01);
  assert.ok(tbShelf.frequencyHz <= 0.85 * 95.39 + 1e-6, `Timbal shelf ${tbShelf.frequencyHz} Hz must never exceed 0.85 * 95.39 Hz (81.08 Hz)`);
  assert.equal(clampProtectedLowShelfHz(150, 100), 85);
  assert.equal(plan75.marcante[2].frequencyHz, 360);
  assert.equal(plan75.marcante[2].gainDb, -2.2);
  assert.equal(plan75.caixa[0].gainDb, -2.5);
}

// 3. Volet 3 + Garde-fou 2 : Isolation studio vs legacy & slot bouclé dédié Apito L sans tronquer W
{
  assert.equal(buildLoopOverrideKey('apito', 'legacy'), 'apito::legacy');
  assert.equal(buildLoopOverrideKey('apito', 'studio'), 'apito::studio');
  assert.equal(resolveLoopSampleFilePath('apito', { apito: false }), 'Mixdown/Apito W long.ogg');
  assert.equal(resolveLoopSampleFilePath('apito', { apito: true }), 'Mixdown/Apito L.ogg');

  setBarulhoLoopOverride('apito', { loopStartMs: 200, loopEndMs: 740, crossfadeMs: 90, softEntryMs: 310 }, 960, 'legacy');
  assert.equal(getEffectiveBarulhoLoopPoints('apito', 960, 'legacy').loopEndMs, 740);
  assert.ok(getEffectiveBarulhoLoopPoints('apito', 3500, 'studio').loopEndMs >= 2400, 'Legacy override must NEVER truncate future Studio Apito L');

  const sr = 32000, len = Math.round(0.96 * sr), pcm = new Float32Array(len).fill(0.25);
  const mockAudioBuf: any = { sampleRate: sr, length: len, duration: len / sr, numberOfChannels: 1, getChannelData: () => pcm };
  const posted: any[] = [];
  const bridge = new PercussionWorkletSampleBridge();
  bridge.attachPort({ postMessage: (m) => posted.push(m) });
  bridge.registerSampleBuffer('Mixdown/Apito W long.ogg', mockAudioBuf);

  const idW = bridge.getSampleId('Mixdown/Apito W long.ogg', false);
  const idL = bridge.getSampleId('Mixdown/Apito W long.ogg', true);
  assert.notEqual(idW, idL, 'Apito L loop must use a dedicated sampleId distinct from one-shot W');
  assert.equal(posted.find((m) => m.sampleId === idW).ch0.length, len, 'One-shot W must retain full unbaked length');
  assert.equal(posted.find((m) => m.sampleId === idL).loopWrapFrame, Math.round(0.740 * sr));

  (globalThis as any).AudioWorkletProcessor = class { port = { onmessage: null, postMessage() {} }; };
  (globalThis as any).currentFrame = 0; (globalThis as any).sampleRate = sr;
  const { PercussionEngineProcessor } = await import('../../worklet/processor/percussionEngineProcessor');
  const proc = new PercussionEngineProcessor();
  for (const m of posted) proc.handleMessage(m);
  assert.equal(resolveBarulhoOpForSymbol('L', true), BARULHO_OP_ATTACK_B);
  assert.equal(resolveBarulhoOpForSymbol('l', true), BARULHO_OP_SOFT_B);
  const flagsL = packWorkletEventFlags(1, CHOKE_NONE, VOICE_CLASS_GENERIC, false, false, BARULHO_OP_ATTACK_B);
  proc.handleMessage({ type: 'PUSH_EVENTS', eventsData: new Float64Array([0, 9, 0, idL, 0.8, 1.0, 1, 1.0, flagsL]), eventCount: 1 });
  proc.process([], [[new Float32Array(128), new Float32Array(128)]], {});
  assert.equal((proc as any).pool.voiceState[0], VOICE_STATE_ACTIVE);

  posted.length = 0;
  setBarulhoLoopOverride('apito', { loopStartMs: 210, loopEndMs: 800, crossfadeMs: 100, softEntryMs: 340 }, 960, 'legacy');
  assert.equal(posted.length, 1, 'Live Loop Lab slider edit must re-bake and post updated LOAD_SAMPLE');
  proc.handleMessage(posted[0]);
  assert.equal((proc as any).pool.barulho.loopWrapFrame[0], Math.round(0.800 * sr), 'Active rolling voice must update loopWrapFrame live');
  resetBarulhoLoopOverride('apito', 'legacy');
  bridge.dispose();
}

console.log('ensembleAcousticsAndLoopLab.test.ts: ALL ASSERTIONS PASSED');
