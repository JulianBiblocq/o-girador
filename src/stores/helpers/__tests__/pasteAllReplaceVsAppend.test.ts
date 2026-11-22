// @ts-ignore — exécuté via npx vitest
import { describe, it, expect, beforeEach } from 'vitest';
import { instrumentsConfig } from '../../../data';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { copyAllTrackPatternsData } from '../instrumentClipboardCopyHelper';
import { pasteAllTrackPatternsState, targetTrackHasNonEmptyPatterns } from '../instrumentClipboardPasteHelper';

const idxOf = (id: string) => Math.max(0, instrumentsConfig.findIndex((i) => i.id === id));

function makeTrack(id: number, instId: string, patterns: any[], extra: Record<string, any> = {}) {
  return {
    id,
    instrumentIdx: idxOf(instId),
    customName: instId.toUpperCase(),
    patterns,
    selectedPatternId: patterns[0]?.id ?? 0,
    ...extra,
  } as any;
}

function makePattern(id: number, name: string, activeSteps: any[], measureAssignments: boolean[]) {
  return {
    id,
    name,
    steps: activeSteps.length,
    activeSteps: [...activeSteps],
    volumes: Array(activeSteps.length).fill(75),
    decays: Array(activeSteps.length).fill(100),
    microtimings: Array(activeSteps.length).fill(0),
    variations: [],
    measureAssignments: [...measureAssignments],
  };
}

describe('LOT 3.1 — Choix « Remplacer » vs « Ajouter » au Collage Global de Motifs (pasteAllTrackPatterns)', () => {
  beforeEach(() => {
    useSequencerStore.setState({
      pendingPasteAllRequest: null,
      instrumentPatternsClipboard: null,
      totalMeasures: 4,
      lang: 'fr',
      tracksVersion: 1,
    });
  });

  it('remplace directement sans modale lorsque la piste cible ne contient que des motifs vides, et ouvre la modale si non vide', () => {
    const srcCaixa = makeTrack(1, 'caixa', [
      makePattern(11, 'Luanda', ['D', 'e', 'd', 'e'], [true, false, true, false]),
      makePattern(12, 'Virada', ['A', 'r', 'D', 'e'], [false, true, false, true]),
    ]);
    const emptyTarol = makeTrack(2, 'tarol', [
      makePattern(21, 'Motif 1', [0, 0, 0, 0], [true, true, false, false]),
    ]);
    const nonEmptyTarol = makeTrack(3, 'tarol', [
      makePattern(31, 'Luanda', ['D', 0, 'E', 0], [true, false, false, false]),
    ]);

    useSequencerStore.setState({ tracks: [srcCaixa, emptyTarol, nonEmptyTarol] });
    useSequencerStore.getState().copyAllTrackPatterns(1);

    // 1. Piste cible avec uniquement un motif vide -> remplacement direct sans ouvrir la modale
    expect(targetTrackHasNonEmptyPatterns(useSequencerStore.getState().tracks, 2)).toBe(false);
    useSequencerStore.getState().pasteAllTrackPatterns(2);
    expect(useSequencerStore.getState().pendingPasteAllRequest).toBeNull();
    const updatedEmpty = useSequencerStore.getState().tracks.find((t) => t.id === 2)!;
    expect(updatedEmpty.patterns.map((p) => p.name)).toEqual(['Luanda', 'Virada']);
    expect(updatedEmpty.patterns[0].measureAssignments).toEqual([true, false, true, false]);

    // 2. Piste cible contenant au moins un motif non vide -> ouvre la requête de modale Cordel
    expect(targetTrackHasNonEmptyPatterns(useSequencerStore.getState().tracks, 3)).toBe(true);
    useSequencerStore.getState().pasteAllTrackPatterns(3);
    expect(useSequencerStore.getState().pendingPasteAllRequest).toEqual({
      targetTrackId: 3,
      defaultApplyTimeline: true,
    });
  });

  it('distingue strictement replace (vrais noms sans suffixe 2, avec/sans Timeline + synchro Esclave) et append (dédoublonnage)', () => {
    const src = makeTrack(1, 'caixa', [
      makePattern(11, 'Luanda', ['D', 'e', 'd', 'e'], [true, false, true, false]),
      makePattern(12, 'Martelo', ['A', 'e', 'A', 'e'], [false, true, false, true]),
    ]);
    const clip = copyAllTrackPatternsData([src], 1, 'fr')!.clip;

    const master = makeTrack(10, 'caixa', [makePattern(101, 'Luanda', ['D', 0, 0, 0], [false, false, false, true])], { isLinkMaster: true });
    const slave = makeTrack(11, 'tarol', [makePattern(101, 'Luanda', ['D', 0, 0, 0], [false, false, false, true])], { isLinkMaster: false, linkedToTrackId: 10 });

    // Mode 'replace' AVEC report Timeline -> vrais noms 'Luanda' & 'Martelo' (zéro 'Luanda 2'), propagés à l'esclave
    const repWithTl = pasteAllTrackPatternsState([master, slave], clip, 10, { mode: 'replace', applyTimeline: true }, 4, 'fr')!;
    const m1 = repWithTl.tracks.find((t) => t.id === 10)!;
    const s1 = repWithTl.tracks.find((t) => t.id === 11)!;
    expect(m1.patterns.map((p) => p.name)).toEqual(['Luanda', 'Martelo']);
    expect(m1.patterns[0].measureAssignments).toEqual([true, false, true, false]);
    expect(s1.patterns.map((p) => p.name)).toEqual(['Luanda', 'Martelo']);
    expect(s1.patterns[0].activeSteps).toEqual(['D', 'e', 'd', 'e']);
    expect(s1.patterns[0].measureAssignments).toEqual([true, false, true, false]);

    // Mode 'replace' SANS report Timeline -> measureAssignments toutes à false
    const repNoTl = pasteAllTrackPatternsState([master, slave], clip, 10, { mode: 'replace', applyTimeline: false }, 4, 'fr')!;
    expect(repNoTl.tracks[0].patterns.map((p) => p.name)).toEqual(['Luanda', 'Martelo']);
    expect(repNoTl.tracks[0].patterns[0].measureAssignments).toEqual([false, false, false, false]);

    // Mode 'append' -> conserve le motif existant et dédoublonne 'Luanda' -> 'Luanda 2'
    const appended = pasteAllTrackPatternsState([master, slave], clip, 10, { mode: 'append', applyTimeline: false }, 4, 'fr')!;
    expect(appended.tracks[0].patterns.map((p) => p.name)).toEqual(['Luanda', 'Luanda 2', 'Martelo']);
  });
});
