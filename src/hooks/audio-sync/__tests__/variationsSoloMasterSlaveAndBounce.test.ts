// @ts-ignore — exécuté via npx vitest
import { describe, it, expect } from 'vitest';
import { instrumentsConfig } from '../../../data';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { rollMeasureVariations } from '../rollMeasureVariations';
import { createTrackVariationSculptHandlers } from '../../sequencer-state/trackVariationSculptHandlers';
import { handleTimelinePatternVariationToggleState } from '../../../stores/helpers/timelinePatternVariationHelper';
import { unrollTracksForFullSong } from '../../../utils/bounce/fullSongBounceTiming';

const idxOf = (id: string) => Math.max(0, instrumentsConfig.findIndex((i) => i.id === id));

function buildLuandaCaixaTarolPair() {
  const base = ['D', 'e', 'd', 'e', 'D', 'e', 'd', 'e'];
  const varCaixa = ['A', 'r', 'D', 'e', 'A', 'r', 'D', 'e'];
  const varTarol = ['F', 'r', 'D', 'e', 'F', 'r', 'D', 'e'];

  const linkFolder: any = {
    id: 50, instrumentIdx: idxOf('caixa'), customName: 'CAIXAS', isLinkFolder: true,
    patterns: [{ id: 700, name: 'Luanda', steps: 8, activeSteps: base, variations: [] }],
  };
  const caixaMaster: any = {
    id: 51, instrumentIdx: idxOf('caixa'), isLinkMaster: true, linkedToTrackId: 50,
    patterns: [{
      id: 700, name: 'Luanda', steps: 8, activeSteps: base,
      measureAssignments: [false, true],
      measureAllowVariations: [false, false],
      volumes: Array(8).fill(75), decays: Array(8).fill(100), microtimings: Array(8).fill(0),
      variations: [{
        id: 'var-1', name: 'Var 1', probability: 35, playFirstTimeOnly: false, steps: varCaixa,
        volumes: Array(8).fill(92), decays: Array(8).fill(85), microtimings: Array(8).fill(6),
      }],
    }],
  };
  const tarolSlave: any = {
    id: 52, instrumentIdx: idxOf('tarol'), isLinkMaster: false, linkedToTrackId: 51,
    patterns: [{
      id: 701, name: 'Luanda', steps: 8, activeSteps: base,
      measureAssignments: [false, true],
      measureAllowVariations: [false, false],
      variations: [{ id: 'tarol-v1', name: 'Var 1', probability: 35, playFirstTimeOnly: false, steps: varTarol }],
    }],
  };
  return { tracks: [linkFolder, caixaMaster, tarolSlave], base, varCaixa, varTarol };
}

describe('LOT 2 — Lecture des Variations (Solo Forcé, Tirage Probabiliste par Tour, Synchro Maître/Esclave & Bounce)', () => {
  it('force Var 1 à 100 % en soloVariationId (même avec LinkFolder CAIXAS en amont ou solo lancé depuis Tarol esclave)', () => {
    useSequencerStore.setState({ isolateBaseOnly: true });
    const { tracks, varCaixa, varTarol } = buildLuandaCaixaTarolPair();

    // Solo lancé depuis Tarol esclave (701, 'tarol-v1') sur mesure 1 (measureStartTick = 96)
    const snapSlave = rollMeasureVariations(1, 1, 96, '4/4', tracks as any, 701, 'tarol-v1', {}, () => 0.99);
    expect(snapSlave.stepsByTrackId[52]).toEqual(varTarol);
    expect(snapSlave.stepsByTrackId[51]).toEqual(varCaixa);
    expect(snapSlave.variationNotes.length).toBeGreaterThan(0);
    expect(snapSlave.variationNotes[0]).toBeGreaterThanOrEqual(96);
  });

  it('tire probabilistement Base 65% vs Var 1 35% à chaque tour en soloPatternPlayId (sans blocage par measureAllowVariations=false ni isolateBaseOnly)', () => {
    useSequencerStore.setState({ isolateBaseOnly: true });
    const { tracks, base, varCaixa, varTarol } = buildLuandaCaixaTarolPair();
    const rands = [0.10, 0.80, 0.34, 0.66]; // 10% -> Var 1, 80% -> Base, 34% -> Var 1, 66% -> Base
    let idx = 0;

    const results = [1, 2, 3, 4].map((seqId) =>
      rollMeasureVariations(seqId, 1, 96, '4/4', tracks as any, 700, 'ensemble', { 51: 700, 52: 701 }, () => rands[idx++])
    );

    expect(results[0].stepsByTrackId[51]).toEqual(varCaixa);
    expect(results[0].stepsByTrackId[52]).toEqual(varTarol);
    expect(results[1].stepsByTrackId[51]).toEqual(base);
    expect(results[1].stepsByTrackId[52]).toEqual(base);
    expect(results[2].stepsByTrackId[51]).toEqual(varCaixa);
    expect(results[2].stepsByTrackId[52]).toEqual(varTarol);
    expect(results[3].stepsByTrackId[51]).toEqual(base);
    expect(results[3].stepsByTrackId[52]).toEqual(base);
  });

  it('synchronise Maître & Esclave dans le Bounce complet et active measureAllowVariations à la création de la 1re variation', () => {
    const { tracks, base, varCaixa, varTarol } = buildLuandaCaixaTarolPair();
    tracks[1].patterns[0].measureAllowVariations = [true, true];
    tracks[2].patterns[0].measureAllowVariations = [true, true];

    const expanded = [{ baseMeasure: 1, iteration: 1 }, { baseMeasure: 1, iteration: 2 }, { baseMeasure: 1, iteration: 3 }];
    const seq = [0.20, 0.85, 0.15];
    let k = 0;
    const unrolled = unrollTracksForFullSong(tracks, expanded, () => seq[k++]);
    const uCaixa = unrolled.find((t) => t.id === 51)!;
    const uTarol = unrolled.find((t) => t.id === 52)!;

    const stepAtPass = (tr: any, passIdx: number) => tr.patterns.find((p: any) => p.measureAssignments[passIdx])?.activeSteps;
    expect(stepAtPass(uCaixa, 0)).toEqual(varCaixa);
    expect(stepAtPass(uTarol, 0)).toEqual(varTarol);
    expect(stepAtPass(uCaixa, 1)).toEqual(base);
    expect(stepAtPass(uTarol, 1)).toEqual(base);
    expect(stepAtPass(uCaixa, 2)).toEqual(varCaixa);
    expect(stepAtPass(uTarol, 2)).toEqual(varTarol);

    // Création de la 1re variation : active auto measureAllowVariations sur les mesures assignées non verrouillées manuellement
    let stateTracks: any[] = [{
      id: 1, instrumentIdx: idxOf('caixa'), isLinkMaster: false,
      patterns: [{ id: 90, name: 'Baque', steps: 8, activeSteps: base, measureAssignments: [true, true, false], measureAllowVariations: [false, false, false], variations: [] }],
    }];
    stateTracks = handleTimelinePatternVariationToggleState(stateTracks as any, 3, 1, 90, 0, false); // Mesure 0 verrouillée manuellement
    const handlers = createTrackVariationSculptHandlers({ pushUndoState: () => {}, setTracks: (fn) => { stateTracks = fn(stateTracks as any); } });
    handlers.handleAddPatternVariation(1, 90);
    expect(stateTracks[0].patterns[0].variations[0].playFirstTimeOnly).toBe(false);
    expect(stateTracks[0].patterns[0].measureAllowVariations).toEqual([false, true, false]);
  });
});
