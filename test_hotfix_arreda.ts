import { TrackGroup, Pattern } from './src/types/store.types';
import { syncPatternAcrossLinkedFamily } from './src/stores/helpers/patternStepLinkedTracksSync';
import { sanitizeTrackLinkingAndBuses } from './src/contexts/audio/audioPresetLinkSanitizer';

function mockPattern(partial: Partial<Pattern> & { id: number; name: string }): Pattern {
  return {
    steps: 16,
    activeSteps: Array(16).fill(''),
    lyrics: [],
    notes: [],
    measureAssignments: [true],
    ...partial
  };
}

function mockTrack(partial: Partial<TrackGroup> & { id: number }): TrackGroup {
  return {
    instrumentIdx: 0,
    patterns: [],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 80,
    selectedPatternId: 1,
    ...partial
  };
}

// 1. Scenario Arreda do Caminho : 3 Alfaias indépendantes dans un Bus Audio
const busAlfaias = mockTrack({
  id: 100,
  customName: 'ALFAIAS',
  isBusFolder: true,
  isLinkFolder: false,
  patterns: []
});

const marcante = mockTrack({
  id: 1,
  customName: 'Marcante',
  busId: '100',
  isLinkMaster: false,
  isLinkFolder: false,
  patterns: [mockPattern({ id: 1, name: 'MARCANTE 1', activeSteps: ['x', 0, 0, 0] })]
});

const meiao = mockTrack({
  id: 2,
  customName: 'Meião',
  busId: '100',
  isLinkMaster: false,
  isLinkFolder: false,
  patterns: [mockPattern({ id: 1, name: 'MEIAO 1', activeSteps: [0, 'x', 0, 0] })]
});

const repique = mockTrack({
  id: 3,
  customName: 'Repique',
  busId: '100',
  isLinkMaster: false,
  isLinkFolder: false,
  patterns: [mockPattern({ id: 1, name: 'REPIQUE 1', activeSteps: ['x', 'x', 'x', 0] })]
});

const arredaTracks: TrackGroup[] = [busAlfaias, marcante, meiao, repique];

// Mutation d'un pas sur la Marcante
const updatedArreda = syncPatternAcrossLinkedFamily(
  arredaTracks,
  1, // marcante
  1, // pattern 1
  (pattern) => ({
    ...pattern,
    activeSteps: pattern.activeSteps.map((step, idx) => (idx === 3 ? 'x' : step))
  })
);

const resMarcante = updatedArreda.find(t => t.id === 1)?.patterns[0].activeSteps[3];
const resMeiao = updatedArreda.find(t => t.id === 2)?.patterns[0].activeSteps[3];
const resRepique = updatedArreda.find(t => t.id === 3)?.patterns[0].activeSteps[3];

console.log('Arreda Bus Test:');
console.log('Marcante step 3:', resMarcante === 'x' ? 'OK (muté)' : 'FAIL');
console.log('Meiao step 3:', resMeiao === 0 ? 'OK (intact)' : 'FAIL (muté à tort)');
console.log('Repique step 3:', resRepique === 0 ? 'OK (intact)' : 'FAIL (muté à tort)');

if (resMeiao !== 0 || resRepique !== 0) {
  throw new Error('TEST FAILED: Stroke propagation detected between independent bus tracks!');
}

// 2. Scenario Track Linking Réel : Caixa Maître -> Tarol Esclave
const caixaMaster = mockTrack({
  id: 7,
  customName: 'Caixa',
  isLinkMaster: true,
  isBusFolder: false,
  isLinkFolder: false,
  patterns: [mockPattern({ id: 10, name: 'BAQUE 1', activeSteps: [0, 0, 0, 0] })]
});

const tarolSlave = mockTrack({
  id: 8,
  customName: 'Tarol',
  linkedToTrackId: '7',
  isLinkMaster: false,
  isBusFolder: false,
  isLinkFolder: false,
  patterns: [mockPattern({ id: 10, name: 'BAQUE 1', activeSteps: [0, 0, 0, 0] })]
});

const linkedTracks: TrackGroup[] = [caixaMaster, tarolSlave];

const updatedLinked = syncPatternAcrossLinkedFamily(
  linkedTracks,
  7, // caixa
  10, // pattern 10
  (pattern) => ({
    ...pattern,
    activeSteps: pattern.activeSteps.map((step, idx) => (idx === 2 ? 'x' : step))
  })
);

const resCaixa = updatedLinked.find(t => t.id === 7)?.patterns[0].activeSteps[2];
const resTarol = updatedLinked.find(t => t.id === 8)?.patterns[0].activeSteps[2];

console.log('\nTrack Linking Test:');
console.log('Caixa step 2:', resCaixa === 'x' ? 'OK (muté)' : 'FAIL');
console.log('Tarol step 2 (esclave):', resTarol === 'x' ? 'OK (synchronisé)' : 'FAIL');

// 3. Test Sanitizer
const sanitized = sanitizeTrackLinkingAndBuses([
  mockTrack({ id: 100, customName: 'ALFAIAS', isBusFolder: true, isLinkFolder: true }),
  mockTrack({ id: 1, customName: 'Alfaia 1', linkedToTrackId: '100', patterns: [mockPattern({ id: 1, name: 'P1' })] }),
  mockTrack({ id: 2, customName: 'Alfaia 2', linkedToTrackId: '100', patterns: [mockPattern({ id: 2, name: 'P2' })] })
]);

console.log('\nSanitizer Test:');
console.log('Bus isLinkFolder:', sanitized[0].isLinkFolder === false ? 'OK (désactivé)' : 'FAIL');
console.log('Alfaia 1 link cleared:', sanitized[1].linkedToTrackId === undefined ? 'OK' : 'FAIL');

console.log('\nALL TESTS PASSED SUCCESSFULLY!');
