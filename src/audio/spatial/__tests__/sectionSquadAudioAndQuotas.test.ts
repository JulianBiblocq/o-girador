// @ts-ignore
import { describe, expect, it } from 'vitest';
import {
  getMaxSectionPlayers,
  isNeutralDefaultSectionPlayers,
  sanitizeSectionPlayers,
} from '../../../constants/sectionEnsembleLimits';
import { resolveTrackSectionSpatialProfile } from '../sectionSpatialAcoustics';
import { stageMeasureStrokeEvent } from '../../worklet/horizon/workletStrokeEventStager';
import {
  MAX_WORKLET_OUTPUTS,
  MAX_WORKLET_PLAYERS_PER_SLOT,
  MAX_WORKLET_VOICES,
  VOICE_STATE_ACTIVE,
  WORKLET_EVENT_STRIDE,
  WorkletSampleEntry,
} from '../../worklet/percussionWorkletTypes';
import { WorkletEventQueue } from '../../worklet/processor/workletEventQueue';
import { WorkletVoicePoolSoa } from '../../worklet/processor/workletVoicePoolSoa';
import { processWorkletDspBlock } from '../../worklet/processor/workletDspKernel';
import { consolidateWizardPlacedTracks } from '../../../components/wizard/wizardTrackConsolidator';
import type { HorizonPackerEngineDeps } from '../../worklet/horizon/percussionHorizonTypes';

describe('Escouades Spatiales par Piste — Quotas, Round-Robin & Barulho Décorrélé', () => {
  it('applique les quotas officiels (5 marcante, 4 percussions, 1 apito/voix) et le plafond EcoMode <= 2', () => {
    expect(getMaxSectionPlayers('marcante')).toBe(5);
    for (const id of ['meiao', 'repique', 'caixa', 'tarol', 'timbal', 'gongue', 'agbe', 'mineiro']) {
      expect(getMaxSectionPlayers(id)).toBe(4);
    }
    expect(getMaxSectionPlayers('apito')).toBe(1);
    expect(getMaxSectionPlayers('puxador', 'voice')).toBe(1);
    expect(sanitizeSectionPlayers([{ id: 'p1', x: 40, y: 80 }], 'apito')).toBeUndefined();
    expect(isNeutralDefaultSectionPlayers([{ id: 'p1', x: 50, y: 90 }])).toBe(true);

    const fiveMarcantes = [15, 32, 50, 68, 85].map((x, i) => ({ id: `p${i + 1}`, x, y: 85 - i * 10 }));
    const track = { sectionPlayers: sanitizeSectionPlayers([...fiveMarcantes, { id: 'p6', x: 90, y: 20 }], 'marcante'), panVal: 20 };
    expect(track.sectionPlayers).toHaveLength(5);

    const full = resolveTrackSectionSpatialProfile(track, 'marcante', false);
    const eco = resolveTrackSectionSpatialProfile(track, 'marcante', true);
    expect(full.synthesizedCount).toBe(5);
    expect(eco.synthesizedCount).toBe(2);
    expect(track.sectionPlayers).toHaveLength(5);
    expect(full.energyComp).toBeGreaterThan(0.45);
    expect(full.energyComp).toBeLessThan(0.85);
    expect(new Set(full.players.map((p) => p.detuneCents)).size).toBe(5);

    const agbe = resolveTrackSectionSpatialProfile(
      { sectionPlayers: [0, 1, 2, 3].map((k) => ({ id: `a${k}`, x: 25 + k * 15, y: 98 })) },
      'agbe'
    );
    expect(agbe.players.map((p) => Math.round(p.baseDelaySec * 1000))).toEqual([0, 11, 19, 27]);
    expect(agbe.players.every((p) => p.detuneCents === 0)).toBe(true);
  });

  it('consolide les pions du Wizard en 1 piste Maître par instrument sans double panoramique', () => {
    const placed = [
      ...Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, instrumentType: 'marcante', x: 20 + i * 12, y: 80 })),
      { id: 'g1', instrumentType: 'gongue', x: 82, y: 72 },
    ];
    const tracks = consolidateWizardPlacedTracks({
      placedInstruments: placed,
      resolveLabel: (id) => id,
      resolveSwing: () => 50,
      buildPatterns: () => [{ id: 1, name: 'Base', steps: 16, activeSteps: Array(16).fill(''), lyrics: [], notes: [], measureAssignments: [true] }],
      selectedBalancoId: 'baque_virado',
      instrumentTunings: {},
      instrumentDecays: {},
    });
    expect(tracks).toHaveLength(2);
    expect(tracks[0].volumeVal).toBe(75);
    expect(tracks[0].panVal).toBe(0);
    expect(tracks[0].sectionPlayers).toHaveLength(5);
    expect(tracks[1].panVal).toBe(0);
    expect(tracks[1].sectionPlayers).toEqual([{ id: 'g1', x: 82, y: 72, detuneCents: 0 }]);
  });

  it('pioche N samples distincts (baseIdx + k) % M et décorrèle la phase du Barulho B sur 256 voix Worklet', () => {
    expect(MAX_WORKLET_VOICES).toBe(256);
    const rrFiles = ['m0.wav', 'm1.wav', 'm2.wav', 'm3.wav', 'm4.wav', 'm5.wav'];
    const sampleMap = new Map<string, number>([...rrFiles.map((f, i) => [f, i] as const), ['bar.wav', 10]]);
    const marcProfile = resolveTrackSectionSpatialProfile(
      { sectionPlayers: [15, 32, 50, 68, 85].map((x, i) => ({ id: `p${i}`, x, y: 90 })) }, 'marcante'
    );
    const caixaProfile = resolveTrackSectionSpatialProfile(
      { sectionPlayers: [20, 40, 60, 80].map((x, i) => ({ id: `c${i}`, x, y: 95 })) }, 'caixa'
    );

    const makeDeps = (instId: string, profile: ReturnType<typeof resolveTrackSectionSpatialProfile>): HorizonPackerEngineDeps => ({
      configMap: new Map([[instId, { id: instId, calibratedStudioBank: true } as any]]),
      strokesMaps: new Map([[instId, new Map([
        ['X', { symbol: 'X', keys: ['x'], caseSensitive: false, files: rrFiles, baseGain: 1 }],
        ['B', { symbol: 'B', keys: ['b'], caseSensitive: false, files: ['bar.wav'], baseGain: 1, isBarulho: true }],
      ])]]),
      getTrackSlot: () => 0, isTrackRoutedToWorklet: () => true, getTrackUnisonDelaySec: () => 0,
      getTrackBalancoAdherence: () => 1, getTrackPitchRatio: () => 1, getTrackSpatialProfile: () => profile,
      selectRoundRobinFile: () => rrFiles[3], selectRoundRobinFileIndex: () => 3,
      getSampleId: (path) => sampleMap.get(path) ?? -1,
    });

    const rrEvents: number[] = [];
    expect(stageMeasureStrokeEvent({
      seqId: 1, measureIdx: 0, trackId: 7, instId: 'marcante', strokeSymbol: 'X', circleStepIdx: 0,
      isSecondStroke: false, velocity: 100, decayPct: 100, triggerFrame: 0, swungTimeSec: 0,
      sampleRate: 48000, engineDeps: makeDeps('marcante', marcProfile), stagedEvents: rrEvents,
    })).toBe('ok');
    const drawnIds = [0, 1, 2, 3, 4].map((k) => rrEvents[k * WORKLET_EVENT_STRIDE + 3]);
    expect(drawnIds).toEqual([3, 4, 5, 0, 1]);

    const barEvents: number[] = [];
    expect(stageMeasureStrokeEvent({
      seqId: 2, measureIdx: 0, trackId: 9, instId: 'caixa', strokeSymbol: 'B', circleStepIdx: 0,
      isSecondStroke: false, velocity: 100, decayPct: 100, triggerFrame: 0, swungTimeSec: 0,
      sampleRate: 48000, engineDeps: makeDeps('caixa', caixaProfile), stagedEvents: barEvents,
    })).toBe('ok');
    expect(barEvents.length / WORKLET_EVENT_STRIDE).toBe(4);

    const sr = 48000, queue = new WorkletEventQueue(), pool = new WorkletVoicePoolSoa();
    queue.pushPackedEvents(Float64Array.from(barEvents), 4);
    const samples: (WorkletSampleEntry | undefined)[] = [];
    samples[10] = {
      ch0: new Float32Array(sr * 3).fill(0.25), ch1: null, sampleRate: sr, length: sr * 3,
      bodyStartFrame: 2400, loopResumeFrame: 24000, loopWrapFrame: 132000, softEntryFrame: 2400,
    };
    const outs = Array.from({ length: MAX_WORKLET_OUTPUTS }, () => [new Float32Array(128), new Float32Array(128)]);
    const muted = new Uint8Array(MAX_WORKLET_OUTPUTS), ones = new Float32Array(MAX_WORKLET_OUTPUTS).fill(1);
    const pOnes = new Float32Array(MAX_WORKLET_OUTPUTS * MAX_WORKLET_PLAYERS_PER_SLOT).fill(1);
    for (let f = 0; f < 2400; f += 128) {
      processWorkletDspBlock(outs, f, sr, queue, pool, samples, muted, ones, ones, pOnes, pOnes, pOnes);
    }

    const activeIdx = [0, 1, 2, 3].filter((v) => pool.voiceState[v] === VOICE_STATE_ACTIVE);
    expect(activeIdx).toHaveLength(4);
    const positions = activeIdx.map((v) => pool.voiceReadPos[v]);
    expect(positions[0]).toBeLessThan(5000);
    for (let k = 1; k < 4; k++) {
      expect(positions[k]).toBeGreaterThanOrEqual(24000);
      expect(Math.abs(positions[k] - positions[k - 1])).toBeGreaterThan(10000);
    }
  });
});
