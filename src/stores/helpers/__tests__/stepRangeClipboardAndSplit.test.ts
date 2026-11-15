// @ts-ignore
import { describe, it, expect } from 'vitest';
import { instrumentsConfig } from '../../../data';
import {
  extractStepRangeSlice,
  applyClearStepIndicesState,
  applyPasteStepRangeState,
  applyDuplicateStepRangeState,
} from '../stepRangeClipboardHelper';
import { applyVocalRangeDuplicateState } from '../vocalRangeDuplicateHelper';
import { computeErasedStepResult, computePaintedStepResult } from '../../../hooks/instrument-editor/gridStepMutationHelpers';

const caixaIdx = Math.max(0, instrumentsConfig.findIndex((i) => i.id === 'caixa'));
const tarolIdx = Math.max(0, instrumentsConfig.findIndex((i) => i.id === 'tarol'));
const marcanteIdx = Math.max(0, instrumentsConfig.findIndex((i) => i.id === 'marcante'));
const repiqueIdx = Math.max(0, instrumentsConfig.findIndex((i) => i.id === 'repique'));
const coroIdx = Math.max(0, instrumentsConfig.findIndex((i) => i.id === 'coro'));

function makePercTrack(id: number, instrumentIdx: number, stepsCount: number) {
  return {
    id,
    instrumentIdx,
    patterns: [
      {
        id: 101,
        steps: stepsCount,
        activeSteps: Array(stepsCount).fill(0),
        volumes: Array(stepsCount).fill(70),
        decays: Array(stepsCount).fill(100),
        microtimings: Array(stepsCount).fill(0),
        variations: [
          {
            id: 'var-1',
            name: 'Var A',
            steps: Array(stepsCount).fill(0),
            volumes: Array(stepsCount).fill(70),
            decays: Array(stepsCount).fill(100),
            microtimings: Array(stepsCount).fill(0),
          },
        ],
      },
    ],
  } as any;
}

describe('Step Range Clipboard, Chained Duplicate & Split-Step Gestures', () => {
  it('copies, cuts and pastes simple strokes, split steps [a, b] and Escultor tuples across 16 -> 32 -> 64 and variations', () => {
    const t16 = makePercTrack(1, caixaIdx, 16);
    const t32 = makePercTrack(2, caixaIdx, 32);
    const t64Tarol = makePercTrack(3, tarolIdx, 64);
    const tRepique = makePercTrack(4, repiqueIdx, 16);
    const tMarcante = makePercTrack(5, marcanteIdx, 64);

    t16.patterns[0].activeSteps[0] = 'D';
    t16.patterns[0].activeSteps[1] = ['r', 'a'];
    t16.patterns[0].activeSteps[2] = 0;
    t16.patterns[0].activeSteps[3] = 'g';
    t16.patterns[0].volumes[1] = [92, 48];
    t16.patterns[0].decays[1] = [85, 60];
    t16.patterns[0].microtimings[1] = [-6, 8];
    tRepique.patterns[0].activeSteps[0] = ['d', 'a'];

    const tracks = [t16, t32, t64Tarol, tRepique, tMarcante];
    const clip = extractStepRangeSlice(tracks, 1, 101, null, 0, 3);
    expect(clip).not.toBeNull();
    expect(clip!.steps).toHaveLength(4);
    expect(clip!.steps[1].activeStep).toEqual(['r', 'a']);
    expect(clip!.steps[1].volume).toEqual([92, 48]);

    // Paste into 32-step variation at index 4
    const intoVar = applyPasteStepRangeState(tracks, clip!, 2, 101, 'var-1', 4)!;
    expect(intoVar.pastedIndices).toEqual([4, 5, 6, 7]);
    const varA = intoVar.tracks.find((t) => t.id === 2)!.patterns[0].variations![0];
    expect(varA.steps.slice(4, 8)).toEqual(['D', ['r', 'a'], 0, 'g']);
    expect(varA.volumes![5]).toEqual([92, 48]);
    expect(varA.microtimings![5]).toEqual([-6, 8]);

    // Paste Caixa clip into 64-step Tarol near end (clamped at 64) & block incompatible Marcante
    const into64 = applyPasteStepRangeState(intoVar.tracks, clip!, 3, 101, null, 62)!;
    expect(into64.pastedIndices).toEqual([62, 63]);
    const p64 = into64.tracks.find((t) => t.id === 3)!.patterns[0];
    expect(p64.activeSteps[62]).toBe('D');
    expect(p64.activeSteps[63]).toEqual(['r', 'a']);
    expect(applyPasteStepRangeState(tracks, clip!, 5, 101, null, 0)).toBeNull();

    // Repique -> Marcante normalizes 'a' -> 'A' inside split steps
    const alfaiaClip = extractStepRangeSlice(tracks, 4, 101, null, 0, 0)!;
    const intoMarcante = applyPasteStepRangeState(tracks, alfaiaClip, 5, 101, null, 0)!;
    expect(intoMarcante.tracks.find((t) => t.id === 5)!.patterns[0].activeSteps[0]).toEqual(['d', 'A']);

    // Cut / Clear resets steps and Escultor tuples
    const cleared = applyClearStepIndicesState(tracks, 1, 101, null, [0, 1, 3])!;
    expect(cleared[0].patterns[0].activeSteps.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(cleared[0].patterns[0].volumes![1]).toBe(70);
  });

  it('chains Ctrl+D advancing selection i -> i + L and clamps cleanly at pattern end', () => {
    const t16 = makePercTrack(1, caixaIdx, 16);
    t16.patterns[0].activeSteps[0] = 'D';
    t16.patterns[0].activeSteps[1] = ['g', 'd'];
    t16.patterns[0].activeSteps[3] = 'r';

    const dup1 = applyDuplicateStepRangeState([t16], 1, 101, null, 0, 3)!;
    expect(dup1.duplicatedIndices).toEqual([4, 5, 6, 7]);
    expect(dup1.tracks[0].patterns[0].activeSteps.slice(4, 8)).toEqual(['D', ['g', 'd'], 0, 'r']);

    const dup2 = applyDuplicateStepRangeState(dup1.tracks, 1, 101, null, 4, 7)!;
    expect(dup2.duplicatedIndices).toEqual([8, 9, 10, 11]);
    const dup3 = applyDuplicateStepRangeState(dup2.tracks, 1, 101, null, 8, 11)!;
    expect(dup3.duplicatedIndices).toEqual([12, 13, 14, 15]);
    expect(applyDuplicateStepRangeState(dup3.tracks, 1, 101, null, 12, 15)).toBeNull();
  });

  it('duplicates Toada vocal range across Anacrouse -> Measure 1 while converting P -> C on Coro', () => {
    const coroTrack: any = {
      id: 20, instrumentIdx: coroIdx, customName: 'Coro',
      patterns: [{
        id: 501, steps: 16,
        preRollActiveSteps: [...Array(14).fill(0), 'P', 'P'],
        preRollNotes: [...Array(14).fill(''), 'C4', 'D4'],
        preRollLyrics: [...Array(14).fill(''), 'Ô', 'ba'],
        activeSteps: Array(16).fill(0), notes: Array(16).fill(''), lyrics: Array(16).fill(''),
      }],
    };
    const range = { start: { isPreRoll: true, step: 14 }, end: { isPreRoll: true, step: 15 }, patternId: 501, trackId: 20 };
    const res = applyVocalRangeDuplicateState([coroTrack], 20, 501, range, 14, true)!;
    expect(res.nextRange).toEqual({ start: { isPreRoll: false, step: 0 }, end: { isPreRoll: false, step: 1 }, patternId: 501, trackId: 20 });
    expect(res.tracks[0].patterns[0].activeSteps.slice(0, 2)).toEqual(['C', 'C']);
    expect(res.tracks[0].patterns[0].lyrics.slice(0, 2)).toEqual(['Ô', 'ba']);
  });

  it('edits and erases split-step halves [a, b] surgically and collapses ["0", "0"] -> 0', () => {
    expect(computePaintedStepResult(['D', 'g'], 'r', 1)).toEqual({ changed: true, finalVal: ['D', 'r'], nextSub: 1, normTarget: 'r' });
    expect(computePaintedStepResult(['D', 'r'], 'r', 1).changed).toBe(false);
    expect(computeErasedStepResult(0).changed).toBe(false);
    expect(computeErasedStepResult(['D', 'r'], 0)).toEqual({ changed: true, finalVal: ['0', 'r'], nextSub: 0 });
    expect(computeErasedStepResult(['0', 'r'], 0).changed).toBe(false);
    expect(computeErasedStepResult(['0', 'r'], 1)).toEqual({ changed: true, finalVal: 0, nextSub: null });
  });
});
