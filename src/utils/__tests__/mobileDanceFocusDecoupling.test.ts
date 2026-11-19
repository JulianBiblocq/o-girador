import assert from 'node:assert/strict';
import {
  applyFamilyMute,
  applyFamilySolo,
  getFamilyLeafTracks,
  isFamilyActiveInSong,
  isFamilyMuted,
  isFamilySolo,
} from '../mobileFamilyResolver';
import { isTrackMutedByPracticeMode } from '../practiceAudioMuteGuard';
import { applyFocusTracksVisibility } from '../../stores/helpers/focusVisibilityHelpers';
import { computeEffectiveMuteStatePro } from '../../stores/helpers/trackSoloProHelpers';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useMuteGroupStore } from '../../stores/useMuteGroupStore';
import { TrackGroup } from '../../types';

function makeActivePattern(id: number, stroke: string, isVocal = false) {
  return {
    id,
    name: 'Base',
    steps: 16,
    activeSteps: [stroke, ...Array(15).fill(0)],
    lyrics: isVocal ? ['Ô', ...Array(15).fill('')] : Array(16).fill(''),
    notes: isVocal ? ['C4', ...Array(15).fill('')] : Array(16).fill(''),
    measureAssignments: [true],
  } as any;
}

// Catalogue instrumentsConfig indices :
// 0: marcante, 1: meiao, 2: repique, 3: caixa, 4: tarol, 5: gongue, 6: agbe, 7: mineiro, 8: timbal, 10: puxador
const SONG_TRACKS: TrackGroup[] = [
  { id: 100, instrumentIdx: 0, customName: 'Alfaias', isLinkFolder: true, patterns: [], isMute: false, isSolo: false, isHidden: false, volumeVal: 80, selectedPatternId: 0 } as any,
  { id: 10, instrumentIdx: 0, customName: 'Marcante', linkedToTrackId: '100', isLinkMaster: true, patterns: [makeActivePattern(1, 'D')], isMute: false, isSolo: false, isHidden: false, volumeVal: 80, selectedPatternId: 1 } as any,
  { id: 20, instrumentIdx: 1, customName: 'Meião', linkedToTrackId: '100', patterns: [], isMute: false, isSolo: false, isHidden: true, volumeVal: 80, selectedPatternId: 0 } as any,
  { id: 30, instrumentIdx: 2, customName: 'Repique', linkedToTrackId: '100', patterns: [], isMute: false, isSolo: false, isHidden: true, volumeVal: 80, selectedPatternId: 0 } as any,
  { id: 40, instrumentIdx: 3, customName: 'Caixa', patterns: [makeActivePattern(2, 'E')], isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: 2 } as any,
  { id: 50, instrumentIdx: 4, customName: 'Tarol', patterns: [makeActivePattern(3, 'd')], isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: 3 } as any,
  { id: 60, instrumentIdx: 5, customName: 'Gonguê', patterns: [makeActivePattern(4, 'G')], isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: 4 } as any,
  { id: 70, instrumentIdx: 6, customName: 'Agbê', patterns: [makeActivePattern(5, 'P')], isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: 5 } as any,
  { id: 90, instrumentIdx: 8, customName: 'Timbal', patterns: [makeActivePattern(6, 'A')], isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: 6 } as any,
  { id: 999901, instrumentIdx: 10, customName: 'Toada', isBusFolder: true, patterns: [], isMute: false, isSolo: false, isHidden: false, volumeVal: 80, selectedPatternId: 0 } as any,
  { id: 110, instrumentIdx: 10, customName: 'Puxador', busId: '999901', patterns: [makeActivePattern(7, 'P', true)], isMute: false, isSolo: false, isHidden: false, volumeVal: 80, selectedPatternId: 7 } as any,
];

// 1. Même avec le Mode Focus actif sur Gonguê (60) (toutes les autres pistes ont isHidden = true),
//    les 6 familles du Mode Danse restent 100 % visibles et actives !
{
  const focusedTracks = applyFocusTracksVisibility(SONG_TRACKS, 60, null);
  assert.equal(focusedTracks.find((t) => t.id === 10)?.isHidden, true);
  assert.equal(focusedTracks.find((t) => t.id === 40)?.isHidden, true);
  assert.equal(focusedTracks.find((t) => t.id === 110)?.isHidden, true);

  for (const famId of ['alfaias', 'caixas', 'timbal', 'gongue', 'sementes', 'toada']) {
    assert.equal(isFamilyActiveInSong(focusedTracks, famId), true, `Famille ${famId} doit rester active en Mode Danse`);
    assert.ok(getFamilyLeafTracks(focusedTracks, famId).length > 0);
  }
}

// 2. Contrôle complet Mute [ M ], Solo [ S ] et Groupes 1–4 malgré isHidden = true
{
  const focusedTracks = applyFocusTracksVisibility(SONG_TRACKS, 60, null);
  const mutedAlfaias = applyFamilyMute(focusedTracks, 'alfaias', true);
  assert.equal(isFamilyMuted(mutedAlfaias, 'alfaias'), true);
  assert.equal(computeEffectiveMuteStatePro(mutedAlfaias, 10), true);
  assert.equal(computeEffectiveMuteStatePro(mutedAlfaias, 20), true);
  assert.equal(computeEffectiveMuteStatePro(mutedAlfaias, 40), false);

  const soloCaixas = applyFamilySolo(mutedAlfaias, 'caixas', true);
  assert.equal(isFamilySolo(soloCaixas, 'caixas'), true);
  assert.equal(computeEffectiveMuteStatePro(soloCaixas, 40), false);
  assert.equal(computeEffectiveMuteStatePro(soloCaixas, 50), false);
  assert.equal(computeEffectiveMuteStatePro(soloCaixas, 60), true); // Non-solo muté par Solo Caixas

  useSequencerStore.setState({ tracks: focusedTracks, isFocusActive: true, focusTrackId: 60 });
  useMuteGroupStore.setState({ muteGroupAssignments: { 1: ['sementes', 'toada'], 2: [], 3: [], 4: [] }, activeMuteGroups: { 1: false, 2: false, 3: false, 4: false } });
  useMuteGroupStore.getState().toggleMuteGroupActive(1);
  assert.equal(isFamilyMuted(useSequencerStore.getState().tracks, 'sementes'), true);
  assert.equal(isFamilyMuted(useSequencerStore.getState().tracks, 'toada'), true);
  useMuteGroupStore.getState().toggleMuteGroupActive(1);
  assert.equal(isFamilyMuted(useSequencerStore.getState().tracks, 'sementes'), false);
}

// 3. Isolation audio étanche Mode Percussion <-> Mode Danse (tous écrans)
{
  const focusedTracks = applyFocusTracksVisibility(SONG_TRACKS, 60, 40);
  const percState = {
    mobileViewMode: 'percussion',
    tocarJuntoActive: true,
    tocarJuntoIsMuted: true,
    tocarJuntoTrackId: 60,
    tocarJuntoMuteScope: 'track' as const,
    isRestOfEnsembleMuted: true,
    focusTrackId: 60,
    referenceTrackId: 40,
    isLetraActive: true,
  };

  // En Mode Percussion : Gonguê (60) muté par tocarJunto, Caixa (40) audible (2e instru), Puxador (110) audible (Letra ON), Alfaias (10) mutée par RestMuted
  assert.equal(isTrackMutedByPracticeMode(60, focusedTracks, percState), true);
  assert.equal(isTrackMutedByPracticeMode(40, focusedTracks, percState), false);
  assert.equal(isTrackMutedByPracticeMode(110, focusedTracks, percState), false);
  assert.equal(isTrackMutedByPracticeMode(10, focusedTracks, percState), true);

  // En Mode Danse (quelle que soit la largeur d'écran) : 0 sourdine résiduelle !
  const danseState = { ...percState, mobileViewMode: 'danse' };
  for (const tr of focusedTracks) {
    assert.equal(isTrackMutedByPracticeMode(tr.id, focusedTracks, danseState), false, `Track ${tr.id} ne doit jamais être coupée en Mode Danse`);
  }

  // Retour en Mode Percussion : retrouve intact l'état Focus de l'élève
  assert.equal(isTrackMutedByPracticeMode(60, focusedTracks, percState), true);
  assert.equal(isTrackMutedByPracticeMode(10, focusedTracks, percState), true);
}

console.log('mobileDanceFocusDecoupling.test.ts: ALL ASSERTIONS PASSED');
