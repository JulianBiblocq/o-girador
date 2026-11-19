/**
 * liveBalancoMorph.test.ts — Tests unitaires : Morphing Balanço Zéro-GC, Verrou Anti-Doublon Horizon & Briques Focus (< 130 lignes).
 */
import assert from 'node:assert/strict';
import { GlobalSwing } from '../../../types';
import {
  getLiveBalancoMorphScaleAtTime,
  resetLiveBalancoMorphToUnity,
  resolveBalancoMorphPhaseAtTime,
  setFocusBalancoDrawerOpen,
  setManualBalancoMorphScale,
  startBalancoMorphCycle,
} from '../liveBalancoMorph';
import { computePercussionNoteSwing } from '../../../hooks/audio-sync/percussionSwingHelper';
import { getBalancoOffsetSec } from '../../../utils/balancoUtils';
import { packMeasureHorizonEvents } from '../../worklet/horizon/percussionMeasureEventPacker';
import { packNoteData } from '../../../workers/compiler/stepNotePacker';
import { attachCompiledTrackIds } from '../../../workers/compiler/compiledTrackIdResolver';
import { resolveFocusMeasureSteps } from '../../../components/focus-balanco/resolveFocusMeasureSteps';

const MOCK_SWING: GlobalSwing = { mode: 'maracatu', swingIntensity: 100, customOffsets: [0, 8, -29, -58] };

// 1. Cycle continu 7 mesures (1 -> 2 -> 2 -> 2) évalué sur baseStepAudioSec
{
  resetLiveBalancoMorphToUnity();
  startBalancoMorphCycle(10.0, 2.0, false);
  assert.ok(Math.abs(getLiveBalancoMorphScaleAtTime(11.0) - 1.0) < 1e-5);
  assert.equal(resolveBalancoMorphPhaseAtTime(11.0), 'anchor');

  assert.ok(Math.abs(getLiveBalancoMorphScaleAtTime(14.0) - 0.5) < 1e-3);
  assert.equal(resolveBalancoMorphPhaseAtTime(14.0), 'ramp-down');

  assert.equal(getLiveBalancoMorphScaleAtTime(16.5), 0);
  assert.equal(resolveBalancoMorphPhaseAtTime(16.5), 'hold-zero');

  assert.ok(Math.abs(getLiveBalancoMorphScaleAtTime(22.0) - 0.5) < 1e-3);
  assert.equal(resolveBalancoMorphPhaseAtTime(22.0), 'ramp-up');

  assert.equal(resolveBalancoMorphPhaseAtTime(24.5), 'idle');
  assert.equal(getLiveBalancoMorphScaleAtTime(24.5), 1.0);
}

// 2. Scaling audio global non-destructif (Percussion + Chant) & immunité A Oficina (ignoreLiveMorph)
{
  resetLiveBalancoMorphToUnity();
  const track: any = { id: 1, instrumentIdx: 0, balancoAmount: 80, patterns: [] };
  const pattern: any = { id: 10, steps: 16, activeSteps: Array(16).fill('D'), balancoAmount: 100 };

  const swingNominal = computePercussionNoteSwing({
    activePattern: pattern, liveTrack: track, circleStepIdx: 3, isTuplet: false,
    swingJitter: 0.002, globalMode: 'maracatu', globalSwing: MOCK_SWING, stepDurationSec: 0.15,
    baseStepAudioSec: 5.0,
  });
  assert.ok(swingNominal < -0.01);

  setManualBalancoMorphScale(0, true);
  const swingZero = computePercussionNoteSwing({
    activePattern: pattern, liveTrack: track, circleStepIdx: 3, isTuplet: false,
    swingJitter: 0.002, globalMode: 'maracatu', globalSwing: MOCK_SWING, stepDurationSec: 0.15,
    baseStepAudioSec: 5.0,
  });
  assert.equal(swingZero, 0);

  const vocalZero = getBalancoOffsetSec({ stepIdx: 3, steps: 16, track, pattern, globalSwing: MOCK_SWING, bpm: 100 });
  const oficinaRef = getBalancoOffsetSec({ stepIdx: 3, steps: 16, track, pattern, globalSwing: MOCK_SWING, bpm: 100, ignoreLiveMorph: true });
  assert.equal(vocalZero, 0);
  assert.ok(oficinaRef < -0.01);
  assert.equal(track.balancoAmount, 80);

  setFocusBalancoDrawerOpen(true);
  setManualBalancoMorphScale(0.25, true);
  setFocusBalancoDrawerOpen(false);
  assert.equal(getLiveBalancoMorphScaleAtTime(5.0), 1.0);
}

// 3. Verrou anti-doublon Horizon (glissement 100% -> 0% après émission d'un pas anticipé)
{
  resetLiveBalancoMorphToUnity();
  const SR = 48000;
  const pat: any = { id: 1, name: 'Base', steps: 16, activeSteps: Array(16).fill(0), measureAssignments: [true] };
  pat.activeSteps[3] = 'D';
  const track: any = { id: 77, instrumentIdx: 0, patterns: [pat], isMute: false, isSolo: false };
  const packedNote = packNoteData(0, 3, 'D'.charCodeAt(0), 100, false, false);
  const schedule = new Float64Array([18, packedNote, 0.9, 0]);
  attachCompiledTrackIds(schedule as any, [77]);

  const tickOffsetsSec = new Float64Array(96);
  const instantTickDurSec = new Float64Array(96).fill(0.025);
  for (let t = 0; t < 96; t++) tickOffsetsSec[t] = t * 0.025;
  const timing = { measureIdx: 0, maxTicks: 96, startTimeSec: 1.0, durationSec: 2.4, startFrame: SR, endFrame: Math.round(3.4 * SR), tickOffsetsSec, instantTickDurSec };
  const strokesMap = new Map([['marcante', new Map([['D', { files: ['Mixdown/Marcante D 1.ogg'], baseGain: 1.0 } as any]])]]);
  const engineDeps: any = {
    configMap: new Map(), strokesMaps: strokesMap,
    isTrackRoutedToWorklet: () => true, getTrackSlot: () => 1,
    getTrackUnisonDelaySec: () => 0, getTrackBalancoAdherence: () => 1, getTrackPitchRatio: () => 1,
    selectRoundRobinFile: () => 'Mixdown/Marcante D 1.ogg', getSampleId: () => 1,
  };

  const firstPack = packMeasureHorizonEvents({
    seqId: 1, timing, measureStartTick: 0, tracks: [track], soloPatternPlayId: null, globalSwing: MOCK_SWING,
    flatCompiledSchedule: schedule, variedTrackIds: new Set(), variationNotes: [], engineDeps, sampleRate: SR,
    currentFrame: SR, minRebuildFrame: 0,
  });
  assert.equal(firstPack.eventCount, 1);
  const anticipatedFrame = firstPack.eventsData[0];

  const nowAfterAnticipated = anticipatedFrame + 100;
  const minRebuild = nowAfterAnticipated + Math.round(0.015 * SR);
  setManualBalancoMorphScale(0, false);

  const rebuiltAtZero = packMeasureHorizonEvents({
    seqId: 1, timing, measureStartTick: 0, tracks: [track], soloPatternPlayId: null, globalSwing: MOCK_SWING,
    flatCompiledSchedule: schedule, variedTrackIds: new Set(), variationNotes: [], engineDeps, sampleRate: SR,
    currentFrame: nowAfterAnticipated, minRebuildFrame: minRebuild,
    previousEmittedNoteFrames: firstPack.emittedNoteFrames,
  });
  assert.equal(rebuiltAtZero.eventCount, 0);
  resetLiveBalancoMorphToUnity();
}

// 4. Adaptation dynamique N pas (3/4 -> 12), héritage piste Esclave liée & miroir gaucher + ras
{
  const masterPat: any = { id: 5, name: 'Baque', steps: 12, beatResolutions: [4, 4, 4], activeSteps: ['D', 0, 'd', 'E', 'D', 0, ['r', 'd'], 0, 'D', 0, 'E', 0], measureAssignments: [true] };
  const master: any = { id: 1, instrumentIdx: 0, isLinkMaster: true, balancoAmount: 75, patterns: [masterPat] };
  const slave: any = { id: 2, instrumentIdx: 1, linkedToTrackId: '1', patterns: [{ id: 5, name: 'Baque', steps: 12, activeSteps: Array(12).fill(0), measureAssignments: [true] }] };
  const res = resolveFocusMeasureSteps({
    focusTrack: slave, tracks: [master, slave], measureIdx: 0, timeSig: '3/4',
    soloPatternPlayId: null, globalSwing: MOCK_SWING, isLeftHanded: true, isPlaying: false, lang: 'fr',
  });
  assert.equal(res.stepCount, 12);
  assert.equal(res.nominalIntensityPct, 75);
  assert.equal(res.steps[0].displaySymbol, 'E');
  assert.equal(res.steps[6].isSplit, true);
  assert.equal(res.steps[6].displaySymbol, 'R');
  assert.equal(res.steps[6].rightSymbol, 'e');
}

console.log('liveBalancoMorph.test.ts: ALL ASSERTIONS PASSED');
