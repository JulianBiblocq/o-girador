// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { describe, it, expect, beforeEach } from 'vitest';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useTransportStore } from '../../../stores/useTransportStore';
import { resolveCurrentPattern } from '../../../utils/variationResolver';
import { buildFlatSongSchedule } from '../../../workers/compiler/flatScheduleBuilder';
import { rollMeasureVariations } from '../rollMeasureVariations';
import { advanceLiveVariationLookahead, resetLiveVariationLookahead } from '../liveVariationLookaheadEngine';
import { isTracksStructureEqual } from '../../../components/circle-sequencer/measurePatternHelpers';
import { resolveTrackStepsForMeasure } from '../../../components/circle-sequencer/rodaSweepMath';
import { resolveAoVivoPatternAndSteps } from '../../../components/AoVivo/aoVivoReset';
import { resolveDawPattern } from '../../../components/daw/dawStepMath';
import { instrumentsConfig } from '../../../data';

function createMasterAndSlaveTracks() {
  const baseSteps: any[] = ['D', 0, 0, 0, 'E', 0, 0, 0, 'D', 0, 0, 0, 'E', 0, 0, 0];
  const varSteps: any[] = [0, ['e', 'D'], 0, 'D', 0, 0, 'E', 0, 0, ['d', 'E'], 0, 0, 'D', 'e', 'D', 0];
  const slaveVarSteps: any[] = [0, ['e', 'D'], 0, 'A', 0, 0, 'E', 0, 0, ['d', 'E'], 0, 0, 'A', 'e', 'D', 0];

  const masterTrack: any = {
    id: 10, instrumentIdx: 0, isMute: false, isSolo: false, isLinkMaster: true, linkedToTrackId: 10,
    patterns: [{
      id: 501, name: 'Baque Non Assigné', steps: 16,
      measureAssignments: [false, false, false, false],
      measureAllowVariations: [false, false, false, false],
      activeSteps: baseSteps,
      volumes: Array(16).fill(75), decays: Array(16).fill(100), microtimings: Array(16).fill(0),
      variations: [
        { id: 'var-amorce', name: 'Var 1', steps: Array(16).fill('D'), probability: 100, playFirstTimeOnly: true },
        {
          id: 'var-target', name: 'Var 2', steps: varSteps, probability: 0, playFirstTimeOnly: false,
          volumes: [70, [55, 95], 70, 88, ...Array(12).fill(70)],
          decays: [100, [60, 100], 100, 90, ...Array(12).fill(100)],
          microtimings: [0, [-10, 12], 0, 5, ...Array(12).fill(0)],
        },
      ],
    }],
  };

  const slaveTrack: any = {
    id: 11, instrumentIdx: 1, isMute: false, isSolo: false, isLinkMaster: false, linkedToTrackId: 10,
    patterns: [{
      id: 601, name: 'Baque Non Assigné', steps: 16,
      measureAssignments: [false, false, false, false],
      activeSteps: baseSteps,
      variations: [
        { id: 'slave-v1', name: 'Var 1', steps: Array(16).fill('D'), probability: 100, playFirstTimeOnly: true },
        { id: 'slave-v2', name: 'Var 2', steps: slaveVarSteps, probability: 0, playFirstTimeOnly: false },
      ],
    }],
  };

  return { masterTrack, slaveTrack, baseSteps, varSteps, slaveVarSteps };
}

describe('Mission 2 — Lecture Audio & Illumination Roda / Ao Vivo / Pistes d’une Variation ciblée', () => {
  beforeEach(() => {
    resetLiveVariationLookahead();
    useTransportStore.getState().setSoloPatternPlayback(null, null);
    useSequencerStore.setState({ isolateBaseOnly: true, currentMeasure: 0, totalMeasures: 4 });
  });

  it('résout en priorité absolue la variation ciblée (même probability=0, isolateBaseOnly=true, non assignée et sur piste esclave)', () => {
    const { masterTrack, slaveTrack, varSteps, slaveVarSteps } = createMasterAndSlaveTracks();
    const tracks = [masterTrack, slaveTrack];

    const masterRes = resolveCurrentPattern({
      pattern: masterTrack.patterns[0], trackId: 10, measureIdx: 0, tracks,
      currentPlayCount: 0, isFirstPassConsumed: false, isolateBaseOnly: true,
      isSoloPlayActive: true, soloPatternPlayId: 501, soloPatternVariationId: 'var-target',
    });
    expect(masterRes.isVariation).toBe(true);
    expect(masterRes.matchedVariation?.id).toBe('var-target');
    expect(masterRes.steps).toEqual(varSteps);
    expect(masterRes.volumes?.[1]).toEqual([55, 95]);

    const snap = rollMeasureVariations(1, 0, 0, '4/4', tracks, 501, 'var-target', {});
    expect(snap.stepsByTrackId[10]).toEqual(varSteps);
    expect(snap.stepsByTrackId[11]).toEqual(slaveVarSteps);
    expect(snap.variedTrackIds.has(10)).toBe(true);
    expect(snap.variedTrackIds.has(11)).toBe(true);
    expect(snap.variationNotes.length).toBeGreaterThan(0);

    const flat = buildFlatSongSchedule(tracks, 2, ['4/4', '4/4'], instrumentsConfig, 501, 'var-target', true);
    expect(flat.length).toBeGreaterThan(0);
    // Le pas 0 est muet dans varSteps (alors qu'il vaut 'D' dans baseSteps) -> aucun événement à tick=0
    expect(flat[0]).toBeGreaterThan(0);
  });

  it('invalide isTracksStructureEqual dès la création/édition d’une variation et synchronise 1:1 Roda, Ao Vivo et Pistes', () => {
    const { masterTrack, slaveTrack, baseSteps, varSteps, slaveVarSteps } = createMasterAndSlaveTracks();
    const withoutVar = [{ ...masterTrack, patterns: [{ ...masterTrack.patterns[0], variations: [] }] }];
    const withVar = [masterTrack];
    expect(isTracksStructureEqual(withoutVar as any, withVar as any)).toBe(false);

    const activeVariationsRef = { current: {} as Record<number, any> };
    useTransportStore.getState().setSoloPatternPlayback(501, 'var-target');
    advanceLiveVariationLookahead({
      currentMeasureIdx: 0, nextMeasureIdx: 1, currentMeasureStartTick: 0,
      tracks: [masterTrack, slaveTrack], measureTimeSigs: ['4/4', '4/4'],
      soloPatternPlayId: 501, soloPatternVariationId: 'var-target', activeVariationsRef, currentMeasureSeqId: 1,
    });

    const rodaMaster = resolveTrackStepsForMeasure(masterTrack, [masterTrack, slaveTrack], 0, 501, activeVariationsRef.current);
    const rodaSlave = resolveTrackStepsForMeasure(slaveTrack, [masterTrack, slaveTrack], 0, 501, activeVariationsRef.current);
    expect(rodaMaster.activeSteps).toEqual(varSteps);
    expect(rodaMaster.baseSteps).toEqual(baseSteps);
    expect(rodaSlave.activeSteps).toEqual(slaveVarSteps);

    const aoVivo = resolveAoVivoPatternAndSteps(masterTrack, [masterTrack, slaveTrack], 0, 501, activeVariationsRef.current, false);
    expect(aoVivo.activePlayingSteps).toEqual(varSteps);

    const daw = resolveDawPattern({ track: masterTrack, tracks: [masterTrack, slaveTrack], currentMeasure: 0, effectiveTrack: masterTrack, isLinkedSlave: false });
    expect(daw.activePattern?.id).toBe(501);

    // Retour propre à la phrase de base dès l'arrêt de l'écoute solo
    useTransportStore.getState().setSoloPatternPlayback(null, null);
    resetLiveVariationLookahead(activeVariationsRef);
    expect(activeVariationsRef.current).toEqual({});
    const rodaAfterStop = resolveTrackStepsForMeasure(masterTrack, [masterTrack, slaveTrack], 0, null, activeVariationsRef.current);
    expect(rodaAfterStop.activeSteps).toEqual([]);
  });
});
