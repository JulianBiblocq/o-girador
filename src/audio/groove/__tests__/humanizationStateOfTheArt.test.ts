// @ts-ignore
import { describe, expect, it } from 'vitest';
import { EngineRoundRobin } from '../../engine/engineRoundRobin';
import { computeTrackSkinChorusCents } from '../../engine/skinChorusCalculator';
import { computeDeterministicStrokeJitterSec, resolveTrackSectionSpatialProfile } from '../../spatial/sectionSpatialAcoustics';
import { stageWorkletSnareSympathyIfEligible } from '../../worklet/horizon/workletSympathyHelper';
import { processWorkletDspBlock } from '../../worklet/processor/workletDspKernel';
import { BARULHO_OP_PARTNER_B, CHOKE_NONE, packWorkletEventFlags, VOICE_CLASS_GENERIC } from '../../worklet/processor/workletEventFlags';
import { WorkletEventQueue } from '../../worklet/processor/workletEventQueue';
import { WorkletVoicePoolSoa } from '../../worklet/processor/workletVoicePoolSoa';
import { WORKLET_EVENT_STRIDE, WorkletSampleEntry } from '../../worklet/percussionWorkletTypes';
import { computePercussionNoteSwing } from '../../../hooks/audio-sync/percussionSwingHelper';
import { isInterMeasureSustainedBarulhoCoord } from '../../../utils/baqueBounceBarulhoHelpers';
import { packBarulhoOriginCoord } from '../../barulho/barulhoRampPlanner';
import { resolveAudibleSympathySnareTrack } from '../snareSympathyPlanner';
import {
  computeAlfaiaHighBpmDecayNorm,
  computeBeatProtectedStepVolume,
  computeLivePlayerVelocityBreathing,
  computeVelocityToneCutoffHz,
} from '../strokeHumanizationDsp';

describe('Lot 1 — Humanisation Acoustique État de l’Art & Parité des 3 Moteurs', () => {
  it('interdit à tout joueur k d’une escouade x3/x4 de répéter le même sample sur 50 pas consécutifs et élargit Agbê/Mineiro à +-1.2 ms', () => {
    const rr = new EngineRoundRobin();
    const stroke6 = { symbol: 'D', keys: ['D'], caseSensitive: true, files: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'] };
    const stroke4 = { symbol: 'X', keys: ['X'], caseSensitive: false, files: ['x1', 'x2', 'x3', 'x4'] };

    let prev3: number[] | null = null;
    let prev4: number[] | null = null;
    for (let step = 0; step < 50; step++) {
      const cur3 = rr.selectSquadFileIndices('caixa', stroke6, step * 0.15, 3, 10);
      const cur4 = rr.selectSquadFileIndices('caixa', stroke4, step * 0.15, 4, 20);
      expect(new Set(cur3).size).toBe(3);
      expect(new Set(cur4).size).toBe(4);
      if (prev3) for (let k = 0; k < 3; k++) expect(cur3[k]).not.toBe(prev3[k]);
      if (prev4) for (let k = 0; k < 4; k++) expect(cur4[k]).not.toBe(prev4[k]);
      prev3 = cur3;
      prev4 = cur4;
    }

    let maxAgbeJitter = 0;
    for (let s = 0; s < 32; s++) {
      maxAgbeJitter = Math.max(maxAgbeJitter, Math.abs(computeDeterministicStrokeJitterSec(4, 2, s, 4, 'agbe')));
    }
    expect(maxAgbeJitter).toBeGreaterThan(0.0005);
    expect(maxAgbeJitter).toBeLessThanOrEqual(0.0012);
  });

  it('verrouille Gonguê à 0.0 cent quel que soit N et applique un accordage asymétrique sans battement (~[-11, +8.5] c sur 2 Caixas)', () => {
    const threeGongues: any[] = [1, 2, 3].map((id) => ({ id, instrumentIdx: 5, instrumentId: 'gongue', tuning: -0.9 }));
    for (const g of threeGongues) {
      expect(computeTrackSkinChorusCents('gongue', g, threeGongues, -0.9, 1.0)).toBe(0);
    }

    const twoCaixas: any[] = [{ id: 1, instrumentIdx: 3, instrumentId: 'caixa', tuning: 0 }, { id: 2, instrumentIdx: 3, instrumentId: 'caixa', tuning: 0 }];
    const c0 = computeTrackSkinChorusCents('caixa', twoCaixas[0], twoCaixas, 0, 0.75);
    const c1 = computeTrackSkinChorusCents('caixa', twoCaixas[1], twoCaixas, 0, 0.75);
    expect(c0).toBeCloseTo(-11.04, 1);
    expect(c1).toBeCloseTo(8.52, 1);
    expect(Math.abs(c0 + c1)).toBeGreaterThan(2.0);

    const squad4 = resolveTrackSectionSpatialProfile(
      { sectionPlayers: [20, 40, 60, 80].map((x, i) => ({ id: `p${i}`, x, y: 70 })) }, 'marcante'
    );
    expect(squad4.players.map((p) => p.detuneCents)).toEqual([-2.3, -0.6, 0.9, 2.1]);
  });

  it('protège les temps forts [0..+3%], filtre 1-pôle vel < 0.68, amortit Alfaia > 105 BPM, coupe swingJitter en straight et décorrèle B rang >= 1', () => {
    expect(computeBeatProtectedStepVolume(70, 0, () => 0, 0, true)).toBeCloseTo(0.70, 5);
    expect(computeBeatProtectedStepVolume(70, 0, () => 1, 0, true)).toBeCloseTo(0.721, 5);
    expect(computeLivePlayerVelocityBreathing(0.70, 3, 1, 0, 0, true)).toBeGreaterThanOrEqual(0.70);
    expect(computeLivePlayerVelocityBreathing(0.70, 1, 1, 0, 5, false)).not.toBe(computeLivePlayerVelocityBreathing(0.70, 2, 1, 1, 5, false));

    expect(computeVelocityToneCutoffHz(0.70)).toBe(0);
    expect(computeVelocityToneCutoffHz(0.50)).toBeGreaterThan(4500);
    expect(computeVelocityToneCutoffHz(0.50)).toBeLessThan(12000);

    expect(computeAlfaiaHighBpmDecayNorm('marcante', 100, 96)).toBe(1.0);
    expect(computeAlfaiaHighBpmDecayNorm('marcante', 100, 132)).toBeLessThan(0.90);
    expect(computeAlfaiaHighBpmDecayNorm('caixa', 100, 140)).toBe(1.0);

    expect(computePercussionNoteSwing({
      activePattern: { id: 1, name: 'P', steps: 16, activeSteps: [], lyrics: [], notes: [], balancoPresetId: 'straight' } as any,
      liveTrack: { id: 1, instrumentIdx: 0, patterns: [], isMute: false, isSolo: false, volumeVal: 75 } as any,
      circleStepIdx: 2, isTuplet: false, swingJitter: 0.008, globalMode: 'maracatu',
      globalSwing: { mode: 'maracatu', swingIntensity: 100, customOffsets: [0, 0, 0, 0] } as any, stepDurationSec: 0.15,
    })).toBe(0);

    expect(isInterMeasureSustainedBarulhoCoord(packBarulhoOriginCoord(0, 0, false), packBarulhoOriginCoord(1, 0, false))).toBe(true);
    expect(isInterMeasureSustainedBarulhoCoord(packBarulhoOriginCoord(0, 0, false), packBarulhoOriginCoord(0, 4, false))).toBe(false);

    const sr = 48000, queue = new WorkletEventQueue(), pool = new WorkletVoicePoolSoa();
    const ch = new Float32Array(sr * 2);
    for (let i = 0; i < ch.length; i++) ch[i] = (i & 1) ? 0.5 : -0.5;
    const sample: WorkletSampleEntry = { ch0: ch, ch1: null, sampleRate: sr, length: ch.length, bodyStartFrame: 2400, loopResumeFrame: 12000, loopWrapFrame: 72000 };
    queue.pushPackedEvents(new Float64Array([
      0, 2, 0, 0, 0.35, 1.0, 1.0, 1.0, packWorkletEventFlags(1, CHOKE_NONE, VOICE_CLASS_GENERIC, true, false, 0, 0),
      0, 3, 1, 0, 0.80, 1.0, packBarulhoOriginCoord(0, 0), 1.0, packWorkletEventFlags(1, CHOKE_NONE, VOICE_CLASS_GENERIC, true, false, BARULHO_OP_PARTNER_B, 0),
    ]), 2);
    const out0 = [new Float32Array(128), new Float32Array(128)], out1 = [new Float32Array(128), new Float32Array(128)];
    processWorkletDspBlock([out0, out1], 0, sr, queue, pool, [sample], new Uint8Array(2), new Float32Array([1, 1]), new Float32Array([1, 1]));
    expect(pool.skinPhysics.velLpAlpha[0]).toBeGreaterThan(0);
    expect(pool.voiceReadPos[1]).toBeGreaterThanOrEqual(12000);
  });

  it('verrouille strictement le Snare Buzz sympathique (0 en Solo Alfaia, 0 à breathing=0, max 1 voix à -31 dB hors collision +-20 ms)', () => {
    const soloAlfaiaTracks: any[] = [
      { id: 1, instrumentIdx: 0, isSolo: true, isMute: false, patterns: [] },
      { id: 2, instrumentIdx: 3, isSolo: false, isMute: false, patterns: [] },
    ];
    expect(resolveAudibleSympathySnareTrack(soloAlfaiaTracks, 0.75, null)).toBeNull();

    const activeTracks: any[] = [
      { id: 1, instrumentIdx: 0, isSolo: false, isMute: false, patterns: [] },
      { id: 2, instrumentIdx: 3, isSolo: false, isMute: false, patterns: [] },
    ];
    expect(resolveAudibleSympathySnareTrack(activeTracks, 0.0, null)).toBeNull();
    const cand = resolveAudibleSympathySnareTrack(activeTracks, 0.75, null);
    expect(cand?.instId).toBe('caixa');

    const staged: number[] = [];
    const lastRef = { value: -10 };
    const deps: any = {
      configMap: new Map([['caixa', { id: 'caixa', calibratedStudioBank: true }]]),
      strokesMaps: new Map([['caixa', new Map([['e', { symbol: 'e', keys: ['e'], caseSensitive: true, files: ['cx_e.ogg'], baseGain: 1.0 }]])]]),
      getTrackSlot: () => 2, selectRoundRobinFile: () => 'cx_e.ogg', getSampleId: () => 5,
    };
    // Marcante + Meião au même pas -> 1 seule voix émise ; collision Caixa à t=1.005 -> 0 voix
    stageWorkletSnareSympathyIfEligible({ seqId: 1, alfaiaTrackId: 1, alfaiaInstId: 'marcante', strokeSymbol: 'D', velocity: 0.75, stepSeed: 0, swungTimeSec: 0.5, triggerFrame: 24000, sampleRate: 48000, breathingAmount: 0.75, snareCandidate: cand, lastBuzzTimeSecRef: lastRef, lookaheadPoints: [], engineDeps: deps, stagedEvents: staged });
    stageWorkletSnareSympathyIfEligible({ seqId: 1, alfaiaTrackId: 9, alfaiaInstId: 'meiao', strokeSymbol: 'D', velocity: 0.75, stepSeed: 0, swungTimeSec: 0.5004, triggerFrame: 24020, sampleRate: 48000, breathingAmount: 0.75, snareCandidate: cand, lastBuzzTimeSecRef: lastRef, lookaheadPoints: [], engineDeps: deps, stagedEvents: staged });
    stageWorkletSnareSympathyIfEligible({ seqId: 1, alfaiaTrackId: 1, alfaiaInstId: 'marcante', strokeSymbol: 'D', velocity: 0.75, stepSeed: 4, swungTimeSec: 1.0, triggerFrame: 48000, sampleRate: 48000, breathingAmount: 0.75, snareCandidate: cand, lastBuzzTimeSecRef: lastRef, lookaheadPoints: [{ trackId: 2, timeSec: 1.010, symbol: 'D', velocity: 0.7 }], engineDeps: deps, stagedEvents: staged });

    expect(staged.length / WORKLET_EVENT_STRIDE).toBe(1);
    expect(staged[5]).toBeGreaterThan(0.027);
    expect(staged[5]).toBeLessThan(0.033);
  });
});
