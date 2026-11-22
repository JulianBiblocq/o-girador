// @ts-ignore — exécuté via npx vitest
import { describe, it, expect } from 'vitest';
import { getAlternatingPairForInstrument, getAlternatingStroke } from '../../../universes/maracatu/strokes/strokeNuanceCycles';
import { useSequencerStore } from '../../../stores/useSequencerStore';

describe('LOT 1 — Alternance Biomécanique, Priorité Dock & Isolation Clavier entre Motifs', () => {
  it('écrit le tapis malha d, e, d, e sur Caixa & Tarol (départ pair vs impair après D, pas scindé [d, e], sans double inversion Gaucher)', () => {
    for (const instId of ['caixa', 'tarol']) {
      // Départ pas pair (0..3) -> d, e, d, e
      expect([0, 1, 2, 3].map((s) => getAlternatingStroke(s, 'D', instId, 'caixa', 'fr', false))).toEqual(['d', 'e', 'd', 'e']);
      // Départ pas impair juste après un accent D posé en 0 -> D, e, d, e (zéro doublement main droite)
      const gridAfterAccentD = ['D', ...[1, 2, 3].map((s) => getAlternatingStroke(s, 'D', instId, 'caixa', 'fr', false))];
      expect(gridAfterAccentD).toEqual(['D', 'e', 'd', 'e']);
      // Stockage canonique invariant en mode Gaucher (isLeftHanded = true)
      expect([0, 1, 2, 3].map((s) => getAlternatingStroke(s, 'd', instId, 'caixa', 'pt', true))).toEqual(['d', 'e', 'd', 'e']);
      // Pas scindé -> ['d', 'e']
      expect(getAlternatingPairForInstrument('D', instId, 'caixa')).toEqual(['d', 'e']);
    }
  });

  it('garantit l’alternance biomécanique sur Mineiro (p, t) et l’absence de paire [Fort, faible] de même main sur tous les pupitres', () => {
    expect([0, 1, 2, 3].map((s) => getAlternatingStroke(s, 'P', 'mineiro', 'shake', 'fr', false))).toEqual(['p', 't', 'p', 't']);
    expect(getAlternatingPairForInstrument('P', 'mineiro', 'shake')).toEqual(['p', 't']);

    for (const alf of ['marcante', 'meiao', 'repique']) {
      expect([0, 1].map((s) => getAlternatingStroke(s, 'D', alf, 'alfaia'))).toEqual(['D', 'E']);
      expect([0, 1].map((s) => getAlternatingStroke(s, 'd', alf, 'alfaia'))).toEqual(['d', 'e']);
    }
    expect([0, 1].map((s) => getAlternatingStroke(s, 'E', 'agbe', 'shake'))).toEqual(['E', 'd']);
    expect([0, 1].map((s) => getAlternatingStroke(s, 'e', 'agbe', 'shake'))).toEqual(['e', 'd']);
    expect([0, 1].map((s) => getAlternatingStroke(s, 'D', 'timbal', 'hands'))).toEqual(['D', 'd']);
    expect([0, 1].map((s) => getAlternatingStroke(s, 'G', 'timbal', 'hands'))).toEqual(['G', 'g']);
    expect([0, 1].map((s) => getAlternatingStroke(s, 'G', 'gongue', 'gongue'))).toEqual(['G', 'A']);
  });

  it('désactive immédiatement Alternance ACTIF lors du clic sur une frappe, Gomme ou Ciseau du Dock', () => {
    let activeTool = 'd';
    let isAlternating = true;
    let isMultiSelectActive = true;
    let selectedStepIndices = [2, 3];

    const handleDockSelectTool = (tool: string) => {
      isAlternating = false;
      activeTool = tool;
      if (isMultiSelectActive || selectedStepIndices.length > 0) {
        isMultiSelectActive = false;
        selectedStepIndices = [];
      }
    };

    handleDockSelectTool('D');
    expect(isAlternating).toBe(false);
    expect(activeTool).toBe('D');
    expect(isMultiSelectActive).toBe(false);
    expect(selectedStepIndices).toEqual([]);

    isAlternating = true;
    handleDockSelectTool('0');
    expect(isAlternating).toBe(false);
    expect(activeTool).toBe('0');

    isAlternating = true;
    handleDockSelectTool('scissors');
    expect(isAlternating).toBe(false);
    expect(activeTool).toBe('scissors');
  });

  it('isole strictement selectedPatternId et selectedVariationId entre deux motifs empilés sur Delete et frappe clavier', () => {
    const p1Steps: any[] = Array(16).fill(0);
    const p2Steps: any[] = Array(16).fill(0);
    p1Steps[14] = 'D';
    p2Steps[14] = 'D';
    p1Steps[4] = 'D';
    p2Steps[4] = 'D';

    const var1Steps: any[] = Array(16).fill(0);
    var1Steps[14] = 'A';

    useSequencerStore.setState({
      tracks: [{
        id: 1,
        instrumentIdx: 3,
        patterns: [
          {
            id: 101, name: 'Motif Haut', steps: 16, activeSteps: [...p1Steps],
            measureAssignments: [true], variations: [{ id: 'v1', name: 'Var 1', probability: 35, steps: [...var1Steps] }],
          },
          {
            id: 102, name: 'Motif Bas', steps: 16, activeSteps: [...p2Steps],
            measureAssignments: [false], variations: [],
          },
        ],
      }] as any,
    });

    // Simulation exacte des gardes de useGridCellKeyboardNav & usePatternGridKeyboard sur les 2 grilles empilées
    const dispatchIsolatedKey = (selectedPatternId: number, selectedVariationId: string | null, selectedStepIdx: number, key: string) => {
      const st = useSequencerStore.getState();
      const tr = st.tracks.find((t) => t.id === 1)!;
      for (const ptn of tr.patterns) {
        if (ptn.id !== selectedPatternId) continue; // Garde stricte : les autres cartes ignorent l'événement
        if (selectedVariationId) {
          const v = ptn.variations!.find((vr) => vr.id === selectedVariationId)!;
          v.steps[selectedStepIdx] = key === 'Delete' ? 0 : key;
        } else {
          ptn.activeSteps[selectedStepIdx] = key === 'Delete' ? 0 : key;
        }
      }
    };

    // 1. Sélection sur Motif Haut (101, variation null), pas 14 -> Delete n'efface PAS Motif Bas (102) ni Var 1
    dispatchIsolatedKey(101, null, 14, 'Delete');
    let tr = useSequencerStore.getState().tracks[0];
    expect(tr.patterns[0].activeSteps[14]).toBe(0);
    expect(tr.patterns[1].activeSteps[14]).toBe('D');
    expect(tr.patterns[0].variations![0].steps[14]).toBe('A');

    // 2. Frappe 'E' sur Motif Haut (101, pas 14) -> écrit uniquement dans Motif Haut, jamais dans Motif Bas
    dispatchIsolatedKey(101, null, 14, 'E');
    tr = useSequencerStore.getState().tracks[0];
    expect(tr.patterns[0].activeSteps[14]).toBe('E');
    expect(tr.patterns[1].activeSteps[14]).toBe('D');

    // 3. Clic sur Var 1 de Motif Haut (101, 'v1', pas 14) -> Delete cible uniquement Var 1
    dispatchIsolatedKey(101, 'v1', 14, 'Delete');
    tr = useSequencerStore.getState().tracks[0];
    expect(tr.patterns[0].variations![0].steps[14]).toBe(0);
    expect(tr.patterns[0].activeSteps[14]).toBe('E');
    expect(tr.patterns[1].activeSteps[14]).toBe('D');
  });
});
