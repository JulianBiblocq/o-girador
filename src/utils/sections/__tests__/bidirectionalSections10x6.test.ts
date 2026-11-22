// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { describe, expect, it } from 'vitest';
import { extractSectionData } from '../../../components/sections/sectionDataExtractor';
import { resolveActivePattern } from '../../../workers/compiler/patternResolver';
import { applySectionImportToState } from '../sectionImportEngine';
import { indexTimelineLeafTracks, inspectSectionTrackMatch } from '../sectionImportTrackMatcher';
import { createSixInstrumentTimelineState, createTenInstrumentTimelineState } from './sectionTestFixtures';

describe('Volet 1 — Sections Bidirectionnelles 10 instruments <-> 6 instruments', () => {
  it('extrait fidèlement les 10 instruments feuilles, les esclaves liés, les 32 pas et les métadonnées vocales', () => {
    const state10 = createTenInstrumentTimelineState();
    const saved = extractSectionData(state10.songSections[0], state10);

    expect(saved.schemaVersion).toBe(2);
    expect(saved.numMeasures).toBe(2);
    expect(saved.timeSigs).toEqual(['4/4', '6/8']);
    expect(saved.bpms).toEqual([104, 108]);
    expect(saved.tracks).toHaveLength(10);
    expect(saved.tracks.every((t) => !(t as any).isBusFolder && !(t as any).isLinkFolder)).toBe(true);

    const marcante = saved.tracks.find((t) => t.instrumentId === 'marcante' && t.occurrenceIndex === 0)!;
    expect(marcante.patterns[0].steps).toBe(32);
    expect(marcante.patterns[0].measureAllowVariations).toEqual([true, false]);
    expect(marcante.patterns[0].variations).toHaveLength(2);

    const meiao = saved.tracks.find((t) => t.instrumentId === 'meiao')!;
    expect(meiao.patterns).toHaveLength(2);

    const repique = saved.tracks.find((t) => t.instrumentId === 'repique')!;
    expect(repique.explicitSilenceMeasures).toEqual([false, true]);

    const puxador = saved.tracks.find((t) => t.instrumentId === 'puxador')!;
    const vPat = puxador.patterns[0] as any;
    expect(vPat.audioUrl).toBe('https://cdn.ogirador.test/loa.webm');
    expect(vPat.recordedBpm).toBe(98);
    expect(vPat.sungKey).toBe('G');
    expect(vPat.troupeKey).toBe('A');
    expect(vPat.transpositionSemitones).toBe(2);
    expect(vPat.t1OffsetSec).toBe(0.42);
    expect(vPat.trimStartSec).toBe(0.1);
    expect(vPat.trimEndSec).toBe(5.2);
    expect(vPat.hasAnacrusis).toBe(true);
    expect(vPat.preRollLyrics).toEqual(['', '', 'Ê', '']);
  });

  it('importe 10 -> 6 en mode adaptation (sans doublon) ou avec création rattachée aux Bus (+4 pistes)', () => {
    const state10 = createTenInstrumentTimelineState();
    const saved10 = extractSectionData(state10.songSections[0], state10);
    const state6 = createSixInstrumentTimelineState();

    const match = inspectSectionTrackMatch(saved10, state6.tracks);
    expect(match.matchedCount).toBe(6);
    expect(match.missingTracks.map((m) => m.instrumentId)).toEqual(['tarol', 'mineiro', 'timbal', 'puxador']);

    const adapted = applySectionImportToState(state6, saved10, 2, { mode: 'overwrite', createMissingTracks: false });
    expect(adapted.blockedByLimit).toBe(false);
    const adaptedLeaves = indexTimelineLeafTracks(adapted.patch!.tracks);
    expect(adaptedLeaves).toHaveLength(6);

    const meiaoTrack = adaptedLeaves.find((l) => l.instrumentId === 'meiao')!.track;
    const repiqueTrack = adaptedLeaves.find((l) => l.instrumentId === 'repique')!.track;
    expect(typeof meiaoTrack.patternOverrides?.[3]).toBe('number');
    expect(repiqueTrack.patternOverrides?.[3]).toBeNull();

    // Ré-import identique en overwrite : zéro doublon de motif dans la banque de chaque piste
    const nextState6 = { ...state6, ...adapted.patch };
    const countBefore = nextState6.tracks.find((t: any) => t.id === 4).patterns.length;
    const reimported = applySectionImportToState(nextState6, saved10, 2, { mode: 'overwrite', createMissingTracks: false });
    const countAfter = reimported.patch!.tracks.find((t: any) => t.id === 4).patterns.length;
    expect(countAfter).toBe(countBefore);

    // Avec createMissingTracks = true : rattachement aux Bus existants + création du Bus Toada
    const expanded = applySectionImportToState(state6, saved10, 1, { mode: 'insert', createMissingTracks: true });
    const expTracks = expanded.patch!.tracks;
    const expLeaves = indexTimelineLeafTracks(expTracks);
    expect(expLeaves).toHaveLength(10);
    expect(expanded.patch!.tracksVersion).toBe(state6.tracksVersion + 1);

    const tarol = expLeaves.find((l) => l.instrumentId === 'tarol')!.track;
    const mineiro = expLeaves.find((l) => l.instrumentId === 'mineiro')!.track;
    const puxador = expLeaves.find((l) => l.instrumentId === 'puxador')!.track;
    const toadaBus = expTracks.find((t: any) => t.isBusFolder && String(t.customName).toLowerCase().includes('toada'));
    expect(tarol.busId).toBe('200');
    expect(mineiro.busId).toBe('300');
    expect(toadaBus).toBeDefined();
    expect(puxador.busId).toBe(String(toadaBus.id));
    // Les pistes créées sont muettes hors de la plage insérée [1..2]
    expect(resolveActivePattern(mineiro, expTracks, 0, false, null)).toBeNull();
    expect(resolveActivePattern(mineiro, expTracks, 3, false, null)).toBeNull();
    expect(resolveActivePattern(mineiro, expTracks, 1, false, null)).not.toBeNull();
  });

  it('importe 6 -> 10 (silence strict des 4 absents dont esclave Tarol), nettoie les overrides obsolètes et respecte maxMeasuresAllowed', () => {
    const state6 = createSixInstrumentTimelineState();
    state6.tracks.forEach((t: any) => t.patterns?.forEach((p: any) => { p.measureAssignments = [true, true, false, false]; }));
    const saved6 = extractSectionData({ id: 's6', name: 'Baque 6', startMeasure: 0, endMeasure: 1 }, state6);

    const state10 = createTenInstrumentTimelineState();
    const resInsert = applySectionImportToState(state10, saved6, 2, { mode: 'insert', createMissingTracks: false });
    expect(resInsert.patch!.totalMeasures).toBe(6);
    expect(resInsert.patch!.measureTimeSigs).toHaveLength(6);
    expect(resInsert.patch!.measureBpms).toHaveLength(6);

    const insTracks = resInsert.patch!.tracks;
    const insLeaves = indexTimelineLeafTracks(insTracks);
    for (const absentId of ['tarol', 'mineiro', 'timbal', 'puxador']) {
      const trk = insLeaves.find((l) => l.instrumentId === absentId)!.track;
      expect(resolveActivePattern(trk, insTracks, 2, false, null)).toBeNull();
      expect(resolveActivePattern(trk, insTracks, 3, false, null)).toBeNull();
    }
    const tarolAfter6 = insLeaves.find((l) => l.instrumentId === 'tarol')!.track;
    expect(tarolAfter6.patternOverrides?.[2]).toBeNull();

    // Écrasement par une section 10 instruments : nettoyage de l'ancien patternOverrides[m] = null sur Tarol
    const saved10 = extractSectionData(state10.songSections[0], state10);
    const stateWithSilentTarol = { ...state10, ...resInsert.patch };
    const resOverwrite10 = applySectionImportToState(stateWithSilentTarol, saved10, 2, { mode: 'overwrite', createMissingTracks: false });
    const ovTracks = resOverwrite10.patch!.tracks;
    const tarolRestored = indexTimelineLeafTracks(ovTracks).find((l) => l.instrumentId === 'tarol')!.track;
    expect(tarolRestored.patternOverrides?.[2]).toBeUndefined();
    expect(resolveActivePattern(tarolRestored, ovTracks, 2, false, null)).not.toBeNull();

    // Garde-fou maxMeasuresAllowed = 30
    const freeTierState = { ...state10, totalMeasures: 29, hasFullPlaybackAccess: false, maxMeasuresAllowed: 30 };
    const blocked = applySectionImportToState(freeTierState, saved6, 29, { mode: 'insert', createMissingTracks: false });
    expect(blocked.blockedByLimit).toBe(true);
    expect(blocked.maxMeasuresAllowed).toBe(30);
    expect(blocked.patch).toBeNull();
  });
});
