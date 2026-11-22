// @ts-ignore
import { describe, it, expect } from 'vitest';
import { instrumentsConfig } from '../../data';
import { isSlaveTrack, resolveMasterTrack } from '../trackMasterResolver';
import { reconcileSlavePatterns, syncMasterPatternsToLinkedFamily } from '../trackLinkingSync';
import { sanitizeTrackLinkingAndBuses } from '../../contexts/audio/audioPresetLinkSanitizer';
import { handleCreateCustomLinkGroupState } from '../../stores/helpers/trackBusHelpers';
import { handleLinkTrackState } from '../../stores/helpers/trackLinkingHelpers';
import { copyAllTrackPatternsData } from '../../stores/helpers/instrumentClipboardCopyHelper';
import { pasteAllTrackPatternsState } from '../../stores/helpers/instrumentClipboardPasteHelper';
import { syncPatternAcrossLinkedFamily, syncVariationAcrossLinkedFamily } from '../../stores/helpers/patternStepLinkedTracksSync';
import { handleTimelinePatternAssignState } from '../../stores/helpers/timelinePatternAssignHelper';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { resolveDawPattern } from '../../components/daw/dawStepMath';
import { resolveTimelineStepData } from '../../components/timeline/TimelineStepPatternResolver';

const idxOf = (id: string) => Math.max(0, instrumentsConfig.findIndex((i) => i.id === id));

function makePtn(id: number, name: string, activeSteps: any[], assigns = [true, false, true, false]) {
  return {
    id, name, steps: activeSteps.length, activeSteps: [...activeSteps],
    lyrics: Array(activeSteps.length).fill(''), notes: Array(activeSteps.length).fill(''),
    volumes: activeSteps.map((_, i) => (i === 0 ? [95, 80] : 82)),
    decays: Array(activeSteps.length).fill(90), microtimings: Array(activeSteps.length).fill(5),
    beatResolutions: [4, 4], timeSignature: '2/4', preRollActiveSteps: ['D', 0, 'e', 0],
    variations: [{ id: 'v1', name: 'Var 1', probability: 40, playFirstTimeOnly: false, steps: [...activeSteps] }],
    measureAssignments: [...assigns],
  } as any;
}

describe('Master -> Slaves in Audio Bus, Deep Hydration & Strict 100% Unison Rule', () => {
  it('links Master -> Slaves inside pure Audio Buses (ALFAIAS & CAIXAS) and hydrates patterns deeply without fill(0)', () => {
    const alfBus = { id: 10, instrumentIdx: idxOf('marcante'), customName: 'ALFAIAS', isBusFolder: true, isLinkFolder: false, patterns: [] } as any;
    const marc = { id: 11, instrumentIdx: idxOf('marcante'), customName: 'Marcante', busId: '10', patterns: [makePtn(101, 'Baque 1', [['D', 'e'], 0, 'A', 'E', 'D', 0, 'e', 0])], selectedPatternId: 101 } as any;
    const meiao = { id: 12, instrumentIdx: idxOf('meiao'), customName: 'Meião', busId: '10', patterns: [makePtn(201, 'Motif 1', Array(8).fill(0), [true, true, true, true])], selectedPatternId: 201 } as any;
    const repique = { id: 13, instrumentIdx: idxOf('repique'), customName: 'Repique', busId: '10', patterns: [], selectedPatternId: 0 } as any;

    const linked = handleCreateCustomLinkGroupState({ tracks: [alfBus, marc, meiao, repique], tracksVersion: 1 }, 11, [12, 13], 'ALFAIAS');
    expect(linked.tracksVersion).toBe(2);
    const lMeiao = linked.tracks.find((t: any) => t.id === 12);
    const lRep = linked.tracks.find((t: any) => t.id === 13);

    expect(isSlaveTrack(lMeiao, linked.tracks)).toBe(true);
    expect(isSlaveTrack(lRep, linked.tracks)).toBe(true);
    expect(resolveMasterTrack(12, linked.tracks)?.id).toBe(11);
    expect(lMeiao.patterns[0].activeSteps).toEqual([['D', 'e'], 0, 'A', 'E', 'D', 0, 'e', 0]);
    expect(lRep.patterns[0].activeSteps).toEqual([['D', 'e'], 0, 'A', 'E', 'D', 0, 'e', 0]);
    expect(lRep.patterns[0].volumes[0]).toEqual([95, 80]);
    expect(lRep.patterns[0].variations).toHaveLength(1);
    expect(lRep.patterns[0].preRollActiveSteps).toEqual(['D', 0, 'e', 0]);
    expect(lRep.patterns[0].measureAssignments).toEqual([true, false, true, false]);

    const cxBus = { id: 20, instrumentIdx: idxOf('caixa'), customName: 'CAIXAS', isBusFolder: true, isLinkFolder: false, patterns: [] } as any;
    const gong = { id: 29, instrumentIdx: idxOf('gongue'), busId: '20', patterns: [makePtn(290, 'G', ['G', 0, 'G', 0, 0, 0, 0, 0])] } as any;
    const caixa = { id: 21, instrumentIdx: idxOf('caixa'), busId: '20', patterns: [makePtn(301, 'Virada', ['D', 'R', 'e', 'A', 'D', 'e', 'r', 'e'])], selectedPatternId: 301 } as any;
    const tarol = { id: 22, instrumentIdx: idxOf('tarol'), busId: '20', patterns: [makePtn(302, 'Motif 1', Array(8).fill(0))], selectedPatternId: 302 } as any;

    const cxLinked = handleLinkTrackState({ tracks: [cxBus, caixa, tarol, gong], tracksVersion: 5 }, 22, '21');
    const sanitized = sanitizeTrackLinkingAndBuses(cxLinked.tracks);
    const sTarol = sanitized.find((t) => t.id === 22)!;
    expect(sTarol.busId).toBe('20');
    expect(isSlaveTrack(sTarol, sanitized)).toBe(true);
    expect(isSlaveTrack(sanitized.find((t) => t.id === 29), sanitized)).toBe(false);
    expect(sTarol.patterns[0].activeSteps).toEqual(['D', 'R', 'e', 'A', 'D', 'e', 'r', 'e']);
  });

  it('enforces 100% Master/Slave measure unison, propagates Master edits, and redirects Slave paste to family', () => {
    const cxBus = { id: 30, instrumentIdx: idxOf('caixa'), customName: 'CAIXAS', isBusFolder: true, isLinkFolder: false, patterns: [] } as any;
    const caixa = { id: 31, instrumentIdx: idxOf('caixa'), busId: '30', isLinkMaster: true, patterns: [makePtn(401, 'Base', ['D', 'e', 'd', 'E', 'D', 'e', 'd', 'e'], [true, true, false, false])], selectedPatternId: 401 } as any;
    const tarolSlave = { id: 32, instrumentIdx: idxOf('tarol'), busId: '30', linkedToTrackId: '31', isLinkMaster: false, patterns: [makePtn(401, 'Base', Array(8).fill(0), [false, false, false, false])], selectedPatternId: 401 } as any;

    const rec = reconcileSlavePatterns(tarolSlave, caixa);
    expect(rec.patterns[0].activeSteps[0]).toBe('D');
    expect(rec.patterns[0].measureAssignments).toEqual([true, true, false, false]);

    let fam: any[] = [cxBus, caixa, tarolSlave];
    fam = syncMasterPatternsToLinkedFamily(fam, 31).tracks;
    fam = syncPatternAcrossLinkedFamily(fam, 31, 401, (p) => ({ ...p, activeSteps: ['A', ...p.activeSteps.slice(1)] }));
    fam = syncVariationAcrossLinkedFamily(fam, 31, 401, 'v1', (v) => ({ ...v, steps: ['B', ...v.steps.slice(1)] }));
    expect(fam.find((t) => t.id === 32)!.patterns[0].activeSteps[0]).toBe('A');
    expect(fam.find((t) => t.id === 32)!.patterns[0].variations[0].steps[0]).toBe('B');

    // Assignation timeline déclenchée sur l'esclave redirigée vers le Maître et synchronisée à l'unisson
    const tlAssigned = handleTimelinePatternAssignState({
      tracks: fam, totalMeasures: 4, measureTimeSigs: ['2/4', '2/4', '2/4', '2/4'], measureBpms: [100, 100, 100, 100],
      measureBpmTransitions: ['immediate', 'immediate', 'immediate', 'immediate'], measureVols: [100, 100, 100, 100],
      measureVolTransitions: ['immediate', 'immediate', 'immediate', 'immediate'], measureSignals: [null, null, null, null], tracksVersion: 1,
    }, 32, 401, 2);
    expect(tlAssigned.tracks.find((t: any) => t.id === 31).patterns[0].measureAssignments[2]).toBe(true);
    expect(tlAssigned.tracks.find((t: any) => t.id === 32).patterns[0].measureAssignments[2]).toBe(true);
    expect(tlAssigned.tracks.find((t: any) => t.id === 32).patternOverrides).toBeUndefined();

    // Collage sur l'esclave redirigé vers le Maître -> propage à toute la famille liée
    const customCaixaBank = { ...caixa, patterns: [makePtn(999, 'Phrase Unisson', ['F', 'e', 'R', 'e', 'F', 'e', 'A', 'e'], [true, false, false, true])] };
    const clip = copyAllTrackPatternsData([customCaixaBank], 31, 'fr')!.clip;
    const pasted = pasteAllTrackPatternsState(tlAssigned.tracks, clip, 32, 'libraryAndTimeline', 4, 'fr')!;
    const pMaster = pasted.tracks.find((t) => t.id === 31)!;
    const pTarol = pasted.tracks.find((t) => t.id === 32)!;
    expect(pMaster.patterns).toHaveLength(2);
    expect(pTarol.patterns).toHaveLength(2);
    expect(pTarol.patterns[1].activeSteps).toEqual(['F', 'e', 'R', 'e', 'F', 'e', 'A', 'e']);
    expect(resolveActivePattern(pTarol, pasted.tracks, 3, false, null)?.activeSteps[0]).toBe('F');
    expect(resolveDawPattern({ track: pTarol, tracks: pasted.tracks, currentMeasure: 3, effectiveTrack: pTarol, isLinkedSlave: true }).activePattern?.activeSteps[0]).toBe('F');
    expect(resolveTimelineStepData(pTarol, pasted.tracks, 0, pTarol.patterns[1].id, 1, 3, pTarol.instrumentIdx, false, false, false, true, false).val).toBe('F');
  });
});
