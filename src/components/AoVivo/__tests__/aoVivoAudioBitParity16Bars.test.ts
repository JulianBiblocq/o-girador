// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { beforeEach, describe, expect, it } from 'vitest';
import { getAgbeImpactPoseTransform } from '../../../audio/animations/agbeKeyframes';
import { projectHorizonMeasures } from '../../../audio/worklet/horizon/percussionHorizonProjection';
import { instrumentsConfig } from '../../../data';
import {
  getOrRollMeasureVariationForHorizon, resetLiveVariationLookahead,
  syncCurrentVariationOverrideFromSeq, syncStepExploreVariationSnapshots,
} from '../../../hooks/audio-sync/liveVariationLookaheadEngine';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useTransportStore } from '../../../stores/useTransportStore';
import { setVariationSessionSeed } from '../../../utils/deterministicVariationRng';
import { buildFlatSongSchedule } from '../../../workers/compiler/flatScheduleBuilder';
import { resolveTrackStepsForMeasure } from '../../circle-sequencer/rodaSweepMath';
import { findSameHandLookahead } from '../alfaiaLookaheadHelper';
import { resolveAoVivoMeasureAndLookahead } from '../aoVivoMeasureLookahead';
import { findCaixaSameHandLookahead } from '../caixaSameHandLookahead';
import { createAoVivo10BarEnsemble, extractAoVivoSliceStrokes, extractAudioMeasureStrokes } from './aoVivoParityTestHelpers';

describe('Volet 2 — Parité Bit-à-Bit 16 Mesures AudioWorklet <-> Roda <-> Ao Vivo', () => {
  beforeEach(() => {
    resetLiveVariationLookahead();
    setVariationSessionSeed(0x51a7e1);
    useTransportStore.getState().setSoloPatternPlayback(null, null);
    useSequencerStore.setState({ isolateBaseOnly: false, currentMeasure: 0, totalMeasures: 10 });
  });

  it('garantit 100% de parité bit-à-bit sur 16 mesures séquentielles (1ª VEZ, % en boucle 2 mesures, 32 pas, esclaves, silence)', () => {
    const { tracks, measureTimeSigs, measureBpms } = createAoVivo10BarEnsemble();
    const flat = buildFlatSongSchedule(tracks, 10, measureTimeSigs, instrumentsConfig, null, null, false);

    // 16 mesures réelles : 0..6, boucle [7..8] x4 (8 mesures), puis sortie sur 9
    const playedSequence = [
      ...[0, 1, 2, 3, 4, 5, 6].map((measureIdx) => ({ measureIdx, loopIter: 1, loopBypassed: false })),
      ...[1, 2, 3, 4].flatMap((loopIter) => [
        { measureIdx: 7, loopIter, loopBypassed: false },
        { measureIdx: 8, loopIter, loopBypassed: false },
      ]),
      { measureIdx: 9, loopIter: 4, loopBypassed: true },
    ];
    expect(playedSequence).toHaveLength(16);

    const stateBase = {
      totalMeasures: 10, timeSig: '4/4', bpm: 108, measureTimeSigs, measureBpms,
      isLooping: true, loopMode: 4 as const, isLoopRegionActive: true, loopStartMeasure: 7, loopEndMeasure: 8,
      isLoopExitRequested: false, queuedMeasure: null,
    };
    const bar4and5VarIds: string[] = [];

    playedSequence.forEach((stepState, idx) => {
      const seqId = idx + 1;
      const projected = projectHorizonMeasures({
        baseSeqId: seqId, startMeasureIdx: stepState.measureIdx, startFrame: idx * 48000, sampleRate: 48000,
        totalMeasures: 10, measureTimeSigs, measureBpms, fallbackBpm: 108, soloPatternPlayId: null,
        queuedMeasure: null, isLooping: true, loopMode: 4, currentLoopIteration: stepState.loopIter,
        isLoopRegionActive: true, loopStartMeasure: 7, loopEndMeasure: 8,
        isLoopExitRequested: false, isLoopBypassed: stepState.loopBypassed,
      });
      const snaps = projected.map((pm) =>
        getOrRollMeasureVariationForHorizon({
          seqId: pm.seqId, measureIdx: pm.measureIdx, measureStartTick: pm.measureStartTick,
          timeSig: '4/4', tracks, soloPatternPlayId: null, soloPatternVariationId: null,
        })
      );
      syncCurrentVariationOverrideFromSeq(seqId);
      const audibleSnap = snaps[0];
      if (stepState.measureIdx === 4 || stepState.measureIdx === 5) {
        bar4and5VarIds.push(audibleSnap.variedPatternsByTrackId.get(10)?.variation.id ?? 'base');
      }

      const simState = { ...stateBase, currentLoopIteration: stepState.loopIter, isLoopBypassed: stepState.loopBypassed };
      for (const trk of tracks) {
        const audioStrokes = extractAudioMeasureStrokes(trk, tracks, stepState.measureIdx * 96, 96, flat, audibleSnap);
        const aoVivo = resolveAoVivoMeasureAndLookahead({
          activeTrack: trk, allTracks: tracks, measure: stepState.measureIdx, ratio: 0,
          soloPlayId: null, measureSeqId: seqId, state: simState,
        });
        expect(extractAoVivoSliceStrokes(trk, aoVivo.currSlice)).toEqual(audioStrokes);

        if (stepState.measureIdx === 6) {
          expect(aoVivo.pattern).toBeNull();
          expect(aoVivo.currSlice).toEqual([]);
        } else {
          const roda = resolveTrackStepsForMeasure(trk as any, tracks as any, stepState.measureIdx, null, audibleSnap.stepsByTrackId);
          expect(roda.activeSteps.slice(0, roda.stepCount)).toEqual(aoVivo.currSlice);
        }
      }
    });

    expect(bar4and5VarIds).toHaveLength(2);
    expect(bar4and5VarIds[0]).toBe(bar4and5VarIds[1]);
  });

  it('anticipe linéairement M -> M+1 sans repli modulo, retombe sur Pause <- / -> et inverse proprement Agbê gaucher', () => {
    const { tracks, measureTimeSigs, measureBpms } = createAoVivo10BarEnsemble();
    tracks[0].patterns[0].variations = [];
    tracks[0].patterns[0].activeSteps = ['D', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'D', 0];
    tracks[2].patterns[0].variations = [];
    tracks[2].patterns[0].activeSteps = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'D', 0];

    const endState = { totalMeasures: 10, timeSig: '4/4', bpm: 108, measureTimeSigs, measureBpms, isLooping: false, loopMode: 1 };
    const atEnd = resolveAoVivoMeasureAndLookahead({
      activeTrack: tracks[0], allTracks: tracks, measure: 9, ratio: 14 / 16, soloPlayId: null, measureSeqId: 10, state: endState,
    });
    expect(atEnd.nextMeasureIdx).toBeNull();
    expect(findSameHandLookahead(atEnd.lookaheadSteps, 14, 150, true, false).nextKind).toBe('idle');
    expect(findCaixaSameHandLookahead(atEnd.lookaheadSteps, 14, 150, true, false).nextKind).toBe('idle');

    const loopState = { ...endState, isLooping: true, loopMode: 'infinite' };
    const atM0 = resolveAoVivoMeasureAndLookahead({
      activeTrack: tracks[0], allTracks: tracks, measure: 0, ratio: 14 / 16, soloPlayId: null, measureSeqId: 1, state: loopState,
    });
    expect(atM0.nextMeasureIdx).toBe(1);
    const domM0ToM1 = findSameHandLookahead(atM0.lookaheadSteps, 14, 150, true, false);
    expect(domM0ToM1.nextKind).toBe('strong');
    expect(domM0ToM1.msUntilNext).toBe(300);

    const stepSnap = syncStepExploreVariationSnapshots({
      prevMeasureIdx: 0, currentMeasureIdx: 1, nextMeasureIdx: 2, playheadRatio: 0.25,
      tracks, measureTimeSigs, soloPatternPlayId: null, soloPatternVariationId: null,
    });
    const aoVivoPaused = resolveAoVivoMeasureAndLookahead({
      activeTrack: tracks[1], allTracks: tracks, measure: 1, ratio: 0.25, soloPlayId: null, measureSeqId: 0, state: loopState,
    });
    expect(aoVivoPaused.currSlice).toEqual(stepSnap.stepsByTrackId[11]);

    const rightPose = getAgbeImpactPoseTransform('D', false);
    const leftPose = getAgbeImpactPoseTransform('D', true);
    expect(rightPose).not.toBe(leftPose);
    expect(getAgbeImpactPoseTransform('E', false)).toBe(leftPose);
  });
});
