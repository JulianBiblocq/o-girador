// @ts-ignore
import { describe, expect, it } from 'vitest';
import { packMeasureHorizonEvents } from '../horizon/percussionMeasureEventPacker';
import { projectHorizonMeasures } from '../horizon/percussionHorizonProjection';
import { buildMeasureTimingTable, resolveClampedHorizonTriggerFrame } from '../horizon/percussionHorizonTiming';
import { WorkletEventQueue } from '../processor/workletEventQueue';
import { attachCompiledTrackIds } from '../../../workers/compiler/compiledTrackIdResolver';
import { packNoteData } from '../../../workers/compiler/stepNotePacker';
import { resolveBounceNoteTrigger, computeBaqueCycleTiming } from '../../../utils/baqueBounceTiming';
import type { GlobalSwing } from '../../../types';

const SR = 48000;
const SWING_MARACATU: GlobalSwing = { mode: 'maracatu', swingIntensity: 100, customOffsets: [0, 8, -29, -58] };
const SWING_OFF: GlobalSwing = { mode: 'off', swingIntensity: 0, customOffsets: [0, 0, 0, 0] };

function makePackerDeps() {
  const strokesMaps = new Map([['marcante', new Map([['D', { symbol: 'D', keys: ['D'], caseSensitive: true, files: ['m_d1.ogg'], baseGain: 1.0 } as any]])]]);
  return {
    configMap: new Map(),
    strokesMaps,
    isTrackRoutedToWorklet: () => true,
    getTrackSlot: () => 1,
    getTrackUnisonDelaySec: () => 0,
    getTrackBalancoAdherence: () => 1,
    getTrackPitchRatio: () => 1,
    selectRoundRobinFile: () => 'm_d1.ogg',
    getSampleId: () => 1,
  } as any;
}

describe('Volet 2 (Verrous A, B & D-Pas0) — Frontière safeRebuildFrame +15 ms, Soudure Sample-Accurate & Pas 0 Micro-Timing Négatif', () => {
  it('Verrou A : garantit 0 doublon (note gardée < minRebuildFrame) ET 0 trou (note purgée >= minRebuildFrame reculant dans [currentFrame, minRebuildFrame[)', () => {
    const pat: any = { id: 1, name: 'P', steps: 16, activeSteps: Array(16).fill(0), measureAssignments: [true] };
    pat.activeSteps[3] = 'D';
    const track: any = { id: 55, instrumentIdx: 0, patterns: [pat], isMute: false, isSolo: false };
    const schedule = new Float64Array([18, packNoteData(0, 3, 'D'.charCodeAt(0), 100, false, false), 0.85, 0]);
    attachCompiledTrackIds(schedule as any, [55]);

    const timing = buildMeasureTimingTable({
      measureIdx: 0, startFrame: SR, sampleRate: SR, totalMeasures: 1,
      measureTimeSigs: { 0: '4/4' }, measureBpms: [100], fallbackBpm: 100,
    });
    const engineDeps = makePackerDeps();
    const queue = new WorkletEventQueue();

    // Cas 1 (Anti-trou) : Initialement en Swing OFF, la note est à rawFrame0 (>= minRebuildFrame).
    const packStraight = packMeasureHorizonEvents({
      seqId: 1, timing, measureStartTick: 0, tracks: [track], soloPatternPlayId: null, globalSwing: SWING_OFF,
      flatCompiledSchedule: schedule, variedTrackIds: new Set(), variationNotes: [], engineDeps,
      sampleRate: SR, currentFrame: SR, minRebuildFrame: 0,
    });
    expect(packStraight.eventCount).toBe(1);
    const frameStraight = packStraight.eventsData[0];
    queue.pushPackedEvents(packStraight.eventsData, packStraight.eventCount);

    // Le lecteur avance juste avant frameStraight (minRebuild = frameStraight - 50), donc la note >= minRebuild est PURGÉE du Worklet
    const minRebuild = frameStraight - 50;
    const currentNow = minRebuild - Math.round(0.015 * SR);
    queue.purgeFromFrame(minRebuild);
    expect(queue.activeCount).toBe(0);

    // L'utilisateur active le Swing Maracatu (-58% sur le 4e double-croche) : le nouveau rawFrame recule sous minRebuildFrame !
    const packSwung = packMeasureHorizonEvents({
      seqId: 1, timing, measureStartTick: 0, tracks: [track], soloPatternPlayId: null, globalSwing: SWING_MARACATU,
      flatCompiledSchedule: schedule, variedTrackIds: new Set(), variationNotes: [], engineDeps,
      sampleRate: SR, currentFrame: currentNow, minRebuildFrame: minRebuild,
      previousEmittedNoteFrames: packStraight.emittedNoteFrames,
    });
    expect(packSwung.eventCount).toBe(1);
    expect(packSwung.eventsData[0]).toBe(minRebuild);
    queue.pushPackedEvents(packSwung.eventsData, packSwung.eventCount);
    expect(queue.activeCount).toBe(1);

    // Cas 2 (Anti-doublon) : un 2e rebuild survient après minRebuild + 100 alors que la note a déjà été gardée (< newMinRebuild)
    const secondMinRebuild = minRebuild + 200;
    const packBackToStraight = packMeasureHorizonEvents({
      seqId: 1, timing, measureStartTick: 0, tracks: [track], soloPatternPlayId: null, globalSwing: SWING_OFF,
      flatCompiledSchedule: schedule, variedTrackIds: new Set(), variationNotes: [], engineDeps,
      sampleRate: SR, currentFrame: minRebuild + 10, minRebuildFrame: secondMinRebuild,
      previousEmittedNoteFrames: packSwung.emittedNoteFrames,
    });
    expect(packBackToStraight.eventCount).toBe(0);
  });

  it('Verrou B : garantit la soudure sample-accurate startFrame(seq + 1) === endFrame(seq) sur 2/4, 3/4, 4/4, 6/8, 9/8, 12/8 et immediate/ramp/bezier', () => {
    const sigs = { 0: '2/4', 1: '3/4', 2: '4/4', 3: '6/8', 4: '9/8', 5: '12/8' };
    const bpms = [84, 96, 112, 128, 104, 92];
    const transitions = { 0: 'immediate', 1: 'ramp', 2: 'bezier', 3: 'ramp', 4: 'bezier', 5: 'ramp' };

    const projected = projectHorizonMeasures({
      baseSeqId: 1, startMeasureIdx: 0, startFrame: 0, sampleRate: SR,
      totalMeasures: 6, measureTimeSigs: sigs, measureBpms: bpms, measureBpmTransitions: transitions,
      fallbackBpm: 100, soloPatternPlayId: null, queuedMeasure: null,
      isLooping: true, loopMode: 'infinite', currentLoopIteration: 1,
      isLoopRegionActive: false, loopStartMeasure: null, loopEndMeasure: null,
      isLoopExitRequested: false, isLoopBypassed: false, horizonCount: 8,
    });
    expect(projected).toHaveLength(8);
    expect(projected[6].measureIdx).toBe(0);
    for (let i = 0; i < projected.length - 1; i++) {
      expect(projected[i + 1].timing.startFrame).toBe(projected[i].timing.endFrame);
      expect(projected[i].timing.endFrame).toBeGreaterThan(projected[i].timing.startFrame);
    }
    // Vérifie que la dernière mesure (5 -> 0) en boucle a bien interpolé sa rampe vers 84 BPM (durée < mesure fixe à 92 BPM ? Non : 92 -> 84 ralentit donc durée > fixe 92 BPM)
    const fixed92 = buildMeasureTimingTable({
      measureIdx: 5, startFrame: 0, sampleRate: SR, totalMeasures: 6,
      measureTimeSigs: sigs, measureBpms: bpms, measureBpmTransitions: { 5: 'immediate' }, fallbackBpm: 92, targetNextMeasureIdx: null,
    });
    expect(projected[5].timing.endFrame).toBeGreaterThan(fixed92.endFrame);
  });

  it('Verrou D (Pas 0 négatif) : recale sans perte le pas 0 à micro-timing négatif (-80 %) au démarrage, à la frontière et en Bounce WAV', () => {
    // 1. Démarrage Worklet (minRebuildFrame = 0) : baseStepFrame = currentFrame + 45 ms, rawFrame = currentFrame - 60 ms (< currentFrame - 15 ms)
    const cur = 48000;
    const baseStepFrame = cur + Math.round(0.045 * SR);
    const rawNegativeFrame = cur - Math.round(0.060 * SR);
    expect(resolveClampedHorizonTriggerFrame(rawNegativeFrame, baseStepFrame, cur, 0, SR, undefined)).toBe(cur);

    // Un vrai vieux pas expiré (baseStepFrame < cur - 15 ms) est en revanche filtré (null)
    const expiredBase = cur - Math.round(0.040 * SR);
    expect(resolveClampedHorizonTriggerFrame(expiredBase, expiredBase, cur, 0, SR, undefined)).toBeNull();

    // 2. Frontière de mesure enchaînée (minRebuildFrame = baseStepFrame) avec micro-timing négatif
    expect(resolveClampedHorizonTriggerFrame(baseStepFrame - 1200, baseStepFrame, cur, baseStepFrame, SR, undefined)).toBe(baseStepFrame);

    // 3. Bounce WAV : pas 0 de la mesure 0 avec microPct = -80 % -> clampé à 0.000 s (>= 0)
    const pat: any = { id: 1, steps: 16, activeSteps: ['D', ...Array(15).fill(0)], measureAssignments: [true] };
    const trk: any = { id: 1, instrumentIdx: 0, patterns: [pat] };
    const bTiming = computeBaqueCycleTiming({ totalMeasures: 1, bpm: 90, timeSig: '4/4', sampleRate: SR });
    const packedStep0 = packNoteData(0, 0, 'D'.charCodeAt(0), 100, false, false);
    const trig = resolveBounceNoteTrigger(0, packedStep0, -80, trk, [trk], 'marcante', bTiming, SWING_OFF);
    expect(trig.triggerSec).toBe(0);
  });
});
