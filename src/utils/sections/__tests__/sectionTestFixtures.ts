import { Pattern, SongSection, TrackGroup } from '../../../types';

function make16Steps(hitA: string, hitB: string): any[] {
  return [hitA, 0, 0, 0, hitB, 0, 0, 0, hitA, 0, 0, 0, hitB, 0, 0, 0];
}

function makePat(partial: Partial<Pattern> & Pick<Pattern, 'id' | 'name' | 'steps' | 'measureAssignments' | 'activeSteps'>): Pattern {
  return { lyrics: [], notes: [], ...partial };
}

export function createTenInstrumentTimelineState(): Record<string, any> {
  const marcante32 = [...make16Steps('D', 'E'), ...make16Steps('D', 'A')];
  const marcanteVar32 = [...make16Steps('D', 'd'), ...make16Steps('E', 'D')];

  const tracks: TrackGroup[] = [
    { id: 100, instrumentIdx: 0, customName: 'Alfaias', isBusFolder: true, patterns: [], isMute: false, isSolo: false, isHidden: false, volumeVal: 80, selectedPatternId: -1 },
    {
      id: 1, instrumentIdx: 0, busId: '100', isLinkMaster: true, linkedToTrackId: '1', isMute: false, isSolo: false, isHidden: false, volumeVal: 80, selectedPatternId: 101,
      patterns: [makePat({
        id: 101, name: 'Baque Virado 32', steps: 32, timeSignature: '4/4',
        measureAssignments: [false, true, true, false],
        measureAllowVariations: [true, true, false, true],
        activeSteps: marcante32,
        volumes: Array(32).fill(85), decays: Array(32).fill(95), microtimings: Array(32).fill(2),
        beatResolutions: [4, 4, 4, 4],
        variations: [
          { id: 'v-first', name: 'Entrée', steps: Array(32).fill('D'), probability: 100, playFirstTimeOnly: true },
          { id: 'v-virada', name: 'Virada', steps: marcanteVar32, probability: 50, playFirstTimeOnly: false },
        ],
      })],
    },
    {
      id: 2, instrumentIdx: 1, busId: '100', isLinkMaster: false, linkedToTrackId: '1', isMute: false, isSolo: false, isHidden: false, volumeVal: 78, selectedPatternId: 202,
      patternOverrides: { 2: 202 },
      patterns: [makePat({
        id: 202, name: 'Contretemps Meião', steps: 16, timeSignature: '4/4',
        measureAssignments: [false, false, false, false],
        activeSteps: make16Steps('A', 'D'),
      })],
    },
    {
      id: 3, instrumentIdx: 2, busId: '100', isLinkMaster: false, linkedToTrackId: '1', isMute: false, isSolo: false, isHidden: false, volumeVal: 76, selectedPatternId: -1,
      patternOverrides: { 2: null },
      patterns: [],
    },
    { id: 200, instrumentIdx: 3, customName: 'Caixas', isBusFolder: true, patterns: [], isMute: false, isSolo: false, isHidden: false, volumeVal: 80, selectedPatternId: -1 },
    {
      id: 4, instrumentIdx: 3, busId: '200', isLinkMaster: true, linkedToTrackId: '4', isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: 401,
      patterns: [makePat({
        id: 401, name: 'Malacacheta Base', steps: 16, timeSignature: '4/4',
        measureAssignments: [true, true, true, true],
        activeSteps: make16Steps('D', 'R'),
        variations: [{ id: 'cx-v1', name: 'Rufada', steps: make16Steps('R', 'A'), probability: 40 }],
      })],
    },
    { id: 5, instrumentIdx: 4, busId: '200', isLinkMaster: false, linkedToTrackId: '4', isMute: false, isSolo: false, isHidden: false, volumeVal: 72, selectedPatternId: -1, patterns: [] },
    { id: 6, instrumentIdx: 5, isMute: false, isSolo: false, isHidden: false, volumeVal: 70, selectedPatternId: 601, patterns: [makePat({ id: 601, name: 'Gonguê Base', steps: 16, measureAssignments: [false, true, true, false], activeSteps: make16Steps('G', 'g') })] },
    { id: 300, instrumentIdx: 6, customName: 'Sementes', isBusFolder: true, patterns: [], isMute: false, isSolo: false, isHidden: false, volumeVal: 80, selectedPatternId: -1 },
    { id: 7, instrumentIdx: 6, busId: '300', isMute: false, isSolo: false, isHidden: false, volumeVal: 74, selectedPatternId: 701, patterns: [makePat({ id: 701, name: 'Agbê Toque', steps: 16, measureAssignments: [false, true, true, false], activeSteps: make16Steps('D', 'B') })] },
    { id: 8, instrumentIdx: 7, busId: '300', isMute: false, isSolo: false, isHidden: false, volumeVal: 68, selectedPatternId: 801, patterns: [makePat({ id: 801, name: 'Mineiro Continu', steps: 16, measureAssignments: [false, true, true, false], activeSteps: make16Steps('D', 'E') })] },
    { id: 9, instrumentIdx: 8, isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: 901, patterns: [makePat({ id: 901, name: 'Timbal Phrase', steps: 16, measureAssignments: [false, true, true, false], activeSteps: make16Steps('T', 'S') })] },
    { id: 400, instrumentIdx: 12, customName: 'Toada', isBusFolder: true, patterns: [], isMute: false, isSolo: false, isHidden: false, volumeVal: 85, selectedPatternId: -1 },
    {
      id: 10, instrumentIdx: 10, busId: '400', isMute: false, isSolo: false, isHidden: false, volumeVal: 85, selectedPatternId: 1001,
      patterns: [{
        id: 1001, name: 'Loa Nagô', steps: 32, timeSignature: '4/4',
        measureAssignments: [false, true, true, false],
        activeSteps: ['1', 0, '_', 0, '1', 0, 0, 0, ...Array(24).fill(0)],
        lyrics: ['Ô', '', '_', '', 'NA-', '', '', '', ...Array(24).fill('')],
        notes: ['G4', '', 'G4', '', 'A4', '', '', '', ...Array(24).fill('')],
        audioUrl: 'https://cdn.ogirador.test/loa.webm',
        vocalAudioUrl: 'https://cdn.ogirador.test/loa.webm',
        recordedBpm: 98, sungKey: 'G', troupeKey: 'A', transpositionSemitones: 2,
        t1OffsetSec: 0.42, trimStartSec: 0.1, trimEndSec: 5.2,
        hasAnacrusis: true, preRollActiveSteps: [0, 0, '1', 0], preRollNotes: ['', '', 'D4', ''], preRollLyrics: ['', '', 'Ê', ''],
        vocalClip: { storagePath: 'vocals/loa.webm', recordedBpm: 98, t1OffsetSec: 0.42, trimStartSec: 0.1, trimEndSec: 5.2 } as any,
      } as any],
    },
  ];

  const section: SongSection = { id: 'sec-10', name: 'Pont Complet', startMeasure: 1, endMeasure: 2, repeatCount: 2, level: 0 };
  return {
    totalMeasures: 4, timeSig: '4/4', bpm: 100, hasFullPlaybackAccess: true, maxMeasuresAllowed: null,
    measureTimeSigs: ['4/4', '4/4', '6/8', '4/4'],
    measureBpms: [100, 104, 108, 100],
    measureBpmTransitions: ['immediate', 'ramp', 'immediate', 'immediate'],
    measureVols: [100, 95, 90, 100],
    measureVolTransitions: ['immediate', 'immediate', 'immediate', 'immediate'],
    measureSignals: [null, 'virada', null, null],
    songSections: [section], songMarkers: [],
    loopStartMeasure: 0, loopEndMeasure: 3, tracksVersion: 1, tracks,
  };
}

export function createSixInstrumentTimelineState(): Record<string, any> {
  const full = createTenInstrumentTimelineState();
  const allowedIds = new Set([100, 1, 2, 3, 200, 4, 6, 300, 7]);
  return {
    ...full,
    songSections: [],
    tracks: full.tracks.filter((t: TrackGroup) => allowedIds.has(t.id)).map((t: TrackGroup) => ({
      ...t,
      patternOverrides: undefined,
      patterns: (t.patterns || []).map((p) => ({ ...p, measureAssignments: [true, false, false, false] })),
    })),
  };
}
