// @ts-ignore
import { describe, it, expect } from 'vitest';
import { instrumentsConfig } from '../../data';
import {
  COMPATIBLE_FAMILIES,
  SOLITARY_INSTRUMENTS,
  canTransferPatterns,
  getInstrumentFamily,
  normalizeInstrumentId,
} from '../instrumentCompatibility';
import { normalizePatternStepsForTarget } from '../patternPasteNormalizer';
import { extractStepRangeSlice, applyPasteStepRangeState } from '../../stores/helpers/stepRangeClipboardHelper';
import { copyAllTrackPatternsData } from '../../stores/helpers/instrumentClipboardCopyHelper';
import { pasteAllTrackPatternsState } from '../../stores/helpers/instrumentClipboardPasteHelper';
import { copyTimelineSelectionState } from '../../stores/helpers/timelineClipboardCopyCutHelper';
import { pasteTimelineClipboardState, canPasteTimelineClipboard } from '../../stores/helpers/timelineClipboardPasteHelper';
import { pasteVoiceStepsState } from '../../stores/helpers/vocalClipboardPasteHelper';
import { buildCopiedPatternPayload, applySinglePatternPasteState } from '../../hooks/sequencer-state/patternClipboardHelper';

const idxOf = (id: string) => Math.max(0, instrumentsConfig.findIndex((i) => i.id === id));

function makeTrack(id: number, instId: string, steps: any[] = ['D', 0, 'E', 0], extra: Record<string, any> = {}) {
  return {
    id,
    instrumentIdx: idxOf(instId),
    patterns: [{
      id: id * 100 + 1,
      name: `Motif ${instId}`,
      steps: steps.length,
      activeSteps: [...steps],
      lyrics: Array(steps.length).fill(''),
      notes: Array(steps.length).fill(''),
      measureAssignments: [true, false, false, false],
      volumes: Array(steps.length).fill(70),
      decays: Array(steps.length).fill(100),
      microtimings: Array(steps.length).fill(0),
      variations: [{ id: 'v1', name: 'Var 1', probability: 30, steps: [...steps] }],
    }],
    selectedPatternId: id * 100 + 1,
    ...extra,
  } as any;
}

describe('Strict Copy/Paste Lock by Stroke Family & Non-Regression', () => {
  it('enforces exact instrument, 9 Alfaia aliases, Caixa/Tarol, Puxador/Coro, NFD accents, and blocks all 5 solitary instruments', () => {
    expect(normalizeInstrumentId('Gonguê')).toBe('gongue');
    expect(normalizeInstrumentId('Agbê')).toBe('agbe');
    expect(normalizeInstrumentId('Meião')).toBe('meiao');
    expect(getInstrumentFamily('')).toBe('');
    expect(canTransferPatterns('', 'marcante')).toBe(false);
    expect(canTransferPatterns('a', 'marcante')).toBe(false);

    for (const sol of SOLITARY_INSTRUMENTS) {
      expect(canTransferPatterns(sol, sol)).toBe(true);
      for (const other of [...SOLITARY_INSTRUMENTS, ...COMPATIBLE_FAMILIES.alfaias, ...COMPATIBLE_FAMILIES.caixas, ...COMPATIBLE_FAMILIES.voices]) {
        if (other !== sol) {
          expect(canTransferPatterns(sol, other)).toBe(false);
          expect(canTransferPatterns(other, sol)).toBe(false);
        }
      }
    }
    expect(canTransferPatterns('Gonguê', 'gongue')).toBe(true);
    expect(canTransferPatterns('Agbê', 'agbe')).toBe(true);

    for (const a1 of COMPATIBLE_FAMILIES.alfaias) {
      for (const a2 of COMPATIBLE_FAMILIES.alfaias) expect(canTransferPatterns(a1, a2)).toBe(true);
      expect(canTransferPatterns(a1, 'caixa')).toBe(false);
    }
    expect(canTransferPatterns('caixa', 'tarol')).toBe(true);
    expect(canTransferPatterns('tarol', 'caixa')).toBe(true);
    expect(canTransferPatterns('puxador', 'coro')).toBe(true);
    expect(canTransferPatterns('coro', 'puxador')).toBe(true);
    expect(canTransferPatterns({ id: 'firestore_doc_99', instrumentId: 'gongue' }, 'caixa')).toBe(false);
    expect(canTransferPatterns({ id: 'firestore_doc_99', instrumentId: 'caixa' }, 'tarol')).toBe(true);
  });

  it('preserves all new strokes on authorized paste (Caixa A/a, Timbal T/t, Apito L/l/./C/, Barulho b/./, Alfaia a->A)', () => {
    const cxPtn = normalizePatternStepsForTarget({ activeSteps: ['D', 'A', 'a', ['R', 'a'], 'B', 'b', '/', '.'], variations: [{ id: 'v', name: 'V', probability: 50, steps: ['A', 'a', 'b', '/'] }] }, 'tarol');
    expect(cxPtn.activeSteps).toEqual(['D', 'A', 'a', ['R', 'a'], 'B', 'b', '/', '.']);
    expect(cxPtn.variations![0].steps).toEqual(['A', 'a', 'b', '/']);

    const timPtn = normalizePatternStepsForTarget({ activeSteps: ['G', 'g', 'A', 'a', 'S', 's', 'T', 't', 'B', 'b', '/', '.'] }, 'timbal');
    expect(timPtn.activeSteps).toEqual(['G', 'g', 'A', 'a', 'S', 's', 'T', 't', 'B', 'b', '/', '.']);

    const apiPtn = normalizePatternStepsForTarget({ activeSteps: ['L', 'l', '/', '.', 'C', 0] }, 'apito');
    expect(apiPtn.activeSteps).toEqual(['L', 'l', '/', '.', 'C', 0]);

    const alfPtn = normalizePatternStepsForTarget({ activeSteps: ['D', 'a', ['d', 'a'], 'I', 'C', 'X', 'B', 'b', '/', '.'] }, 'alfaia_grave');
    expect(alfPtn.activeSteps).toEqual(['D', 'A', ['d', 'A'], 'I', 'C', 'X', 'B', 'b', '/', '.']);
  });

  it('targets concrete slave tracks (Meião/Repique/Tarol) directly without redirecting to master, while resolving isLinkFolder', () => {
    const folder = { id: 90, instrumentIdx: idxOf('marcante'), isBusFolder: true, isLinkFolder: true, patterns: [] } as any;
    const master = makeTrack(1, 'marcante', ['D', 'E', 'D', 'E'], { isLinkMaster: true, linkedToTrackId: '90', busId: '90' });
    const slaveMeiao = makeTrack(2, 'meiao', [0, 0, 0, 0], { isLinkMaster: false, linkedToTrackId: '90', busId: '90' });
    const gongue = makeTrack(3, 'gongue', ['G', 'a', 'X', '.']);
    const tracks = [folder, master, slaveMeiao, gongue];

    expect(canTransferPatterns(folder, slaveMeiao, tracks)).toBe(true);
    expect(canTransferPatterns(gongue, slaveMeiao, tracks)).toBe(false);

    const copiedAlfaia = buildCopiedPatternPayload(master.patterns[0], tracks, master.id);
    expect(applySinglePatternPasteState(tracks, copiedAlfaia, gongue.id, gongue.patterns[0].id, 4, 'fr')).toBeNull();

    const pastedOnSlave = applySinglePatternPasteState(tracks, copiedAlfaia, slaveMeiao.id, slaveMeiao.patterns[0].id, 4, 'fr')!;
    expect(pastedOnSlave.find((t) => t.id === slaveMeiao.id)!.patterns[0].activeSteps).toEqual(['D', 'E', 'D', 'E']);

    const bankClip = copyAllTrackPatternsData(tracks, master.id, 'fr')!.clip;
    expect(pasteAllTrackPatternsState(tracks, bankClip, gongue.id, 'libraryOnly', 4, 'fr')).toBeNull();
    const bankOnSlave = pasteAllTrackPatternsState(tracks, bankClip, slaveMeiao.id, 'libraryOnly', 4, 'fr')!;
    expect(bankOnSlave.tracks.find((t) => t.id === slaveMeiao.id)!.patterns.length).toBe(2);
    expect(bankOnSlave.tracks.find((t) => t.id === master.id)!.patterns.length).toBe(1);
  });

  it('locks Timeline single-track vs multi-track paste, preserves Puxador+Coro tiling, and blocks cross-family step/vocal paste', () => {
    const marc = makeTrack(1, 'marcante', ['D', 'a', 'E', 0]);
    const gong = makeTrack(2, 'gongue', ['G', 'g', 'A', 'X']);
    const pux = makeTrack(10, 'puxador', ['P', 'P', 0, 0]);
    const coro = makeTrack(11, 'coro', [0, 'C', 'C', 0]);
    coro.patterns[0].measureAssignments = [true, false, false, false];
    const tracks = [marc, gong, pux, coro];

    const gongStepClip = extractStepRangeSlice(tracks, gong.id, gong.patterns[0].id, null, 0, 2)!;
    expect(applyPasteStepRangeState(tracks, gongStepClip, marc.id, marc.patterns[0].id, null, 0)).toBeNull();
    expect(pasteVoiceStepsState(tracks, [{ note: 'C4', syllable: 'la', role: 'P' }], marc.id, marc.patterns[0].id, false, 0, false, null, 'puxador')).toBeNull();

    const singleTl = copyTimelineSelectionState({ selectedTimelineCells: [{ trackId: gong.id, mIdx: 0 }], activeTimelineCell: null, tracks })!.timelineClipboard;
    expect(canPasteTimelineClipboard(tracks, singleTl, marc.id)).toBe(false);
    expect(pasteTimelineClipboardState({ tracks, activeTimelineCell: { trackId: marc.id, measureIdx: 1 }, selectedTimelineCells: [], tracksVersion: 1 }, singleTl, 1)).toEqual({});

    const multiVocalTl = copyTimelineSelectionState({
      selectedTimelineCells: [{ trackId: pux.id, mIdx: 0 }, { trackId: coro.id, mIdx: 0 }],
      activeTimelineCell: null,
      tracks,
    })!.timelineClipboard;
    expect(canPasteTimelineClipboard(tracks, multiVocalTl, marc.id)).toBe(true);
    const pastedMulti = pasteTimelineClipboardState({ tracks, activeTimelineCell: { trackId: pux.id, measureIdx: 2 }, selectedTimelineCells: [], tracksVersion: 1 }, multiVocalTl, 2);
    expect(pastedMulti.tracks.find((t: any) => t.id === pux.id).patterns[0].measureAssignments[2]).toBe(true);
    expect(pastedMulti.tracks.find((t: any) => t.id === coro.id).patterns[0].measureAssignments[2]).toBe(true);
  });
});
