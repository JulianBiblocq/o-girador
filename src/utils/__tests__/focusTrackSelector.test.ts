import assert from 'node:assert/strict';
import { resolveDefaultFocusTrackId } from '../focusTrackSelector';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { setPendingUrlRoleOverride } from '../../stores/slices/trainingSlice';
import { TrackGroup } from '../../types';
import { UserProfile } from '../../contexts/auth/authTypes';

function makeTrack(id: number, instrumentIdx: number, customName?: string): TrackGroup {
  return {
    id,
    instrumentIdx,
    customName,
    patterns: [],
    volumeVal: 80,
    isMute: false,
    isSolo: false,
    isHidden: false,
  } as any;
}

// Catalogue instrumentsConfig indices:
// 0: marcante, 1: meiao, 2: repique, 3: caixa, 4: tarol, 5: gongue, 6: agbe, 7: mineiro, 8: timbal, 9: apito, 10: puxador
const FULL_RODA: TrackGroup[] = [
  makeTrack(10, 0, 'Marcante'),
  makeTrack(20, 1, 'Meião'),
  makeTrack(30, 2, 'Repique'),
  makeTrack(40, 3, 'Caixa'),
  makeTrack(50, 4, 'Tarol'),
  makeTrack(60, 5, 'Gonguê'),
  makeTrack(70, 6, 'Agbê'),
  makeTrack(80, 7, 'Mineiro'),
  makeTrack(90, 8, 'Timbal'),
];

const REDUCED_RODA: TrackGroup[] = [
  makeTrack(101, 0, 'Alfaia 1'), // Marcante uniquement (pas de Meião ni Repique)
  makeTrack(102, 3, 'Caixa 1'),  // Caixa uniquement (pas de Tarol)
  makeTrack(103, 5, 'Gonguê'),
];

const makeProfile = (role: UserProfile['role'], instrument?: string): UserProfile => ({
  uid: `uid-${role}`,
  email: `${role}@ogirador.com`,
  displayName: role,
  photoURL: null,
  role,
  createdAt: 1,
  instrument,
});

// 1. Priorité 1 : Paramètre d'URL (?role=...) l'emporte sur le profil Organizador et le dernier choix
{
  const eleveCaixa = makeProfile('eleve', 'Caixa');
  const resolved = resolveDefaultFocusTrackId(FULL_RODA, eleveCaixa, 'marcante', 'gongue');
  assert.equal(resolved, 60);
}

// 2. Priorité 2 : Correspondance exacte des 9 rôles du profil Organizador
{
  assert.equal(resolveDefaultFocusTrackId(FULL_RODA, makeProfile('eleve', 'Marcante')), 10);
  assert.equal(resolveDefaultFocusTrackId(FULL_RODA, makeProfile('eleve', 'Alfaia Meião')), 20);
  assert.equal(resolveDefaultFocusTrackId(FULL_RODA, makeProfile('eleve', 'repique')), 30);
  assert.equal(resolveDefaultFocusTrackId(FULL_RODA, makeProfile('eleve', 'Caixa de Guerra')), 40);
  assert.equal(resolveDefaultFocusTrackId(FULL_RODA, makeProfile('eleve', 'tarol')), 50);
  assert.equal(resolveDefaultFocusTrackId(FULL_RODA, makeProfile('eleve', 'Gonguê')), 60);
  assert.equal(resolveDefaultFocusTrackId(FULL_RODA, makeProfile('eleve', 'Agbê (Xequerê)')), 70);
  assert.equal(resolveDefaultFocusTrackId(FULL_RODA, makeProfile('eleve', 'Mineiro (Ganzá)')), 80);
  assert.equal(resolveDefaultFocusTrackId(FULL_RODA, makeProfile('eleve', 'Timbal')), 90);
}

// 3. Priorité 2 : Repli intelligent sur la 1re Alfaia ou la 1re Caixa si le rôle exact est absent
{
  assert.equal(resolveDefaultFocusTrackId(REDUCED_RODA, makeProfile('eleve', 'Repique')), 101);
  assert.equal(resolveDefaultFocusTrackId(REDUCED_RODA, makeProfile('eleve', 'Meião')), 101);
  assert.equal(resolveDefaultFocusTrackId(REDUCED_RODA, makeProfile('eleve', 'Tarol')), 102);
}

// 4. Priorité 3 : Dernier pupitre choisi par l'élève sans instrument Organizador vs Marcante pour Mestre / visiteur
{
  assert.equal(resolveDefaultFocusTrackId(FULL_RODA, makeProfile('eleve', ''), 'agbe'), 70);
  assert.equal(resolveDefaultFocusTrackId(FULL_RODA, makeProfile('mestre', ''), 'agbe'), 10);
  assert.equal(resolveDefaultFocusTrackId(FULL_RODA, null, 'agbe'), 10);
}

// 5. Stabilité en session (syncFocusWithTracks) & États par défaut sans sourdine/variation fantôme
{
  setPendingUrlRoleOverride(null);
  const st0 = useSequencerStore.getState();
  assert.equal(st0.isolateBaseOnly, false);
  assert.equal(st0.tocarJuntoIsMuted, false);

  const eleveMeiao = makeProfile('eleve', 'Meião');
  useSequencerStore.setState({ tracks: FULL_RODA, metadata: { toada: 'Morceau A' } as any, isFocusActive: false, hasManualFocusSelection: false });
  useSequencerStore.getState().syncFocusWithTracks(FULL_RODA, eleveMeiao);
  assert.equal(useSequencerStore.getState().focusTrackId, 20);

  // Sélection manuelle 1-clic de Gonguê (60) sur Morceau A
  useSequencerStore.getState().activateFocusOnTrack(60);
  assert.equal(useSequencerStore.getState().isFocusActive, true);
  assert.equal(useSequencerStore.getState().focusTrackId, 60);
  assert.equal(useSequencerStore.getState().activeAoVivoTrackId, 60);

  // Édition de piste sur le même Morceau A (!songChanged) -> conserve Gonguê (60)
  const editedTracks = FULL_RODA.map((t) => (t.id === 60 ? { ...t, volumeVal: 95 } : t));
  useSequencerStore.setState({ tracks: editedTracks });
  useSequencerStore.getState().syncFocusWithTracks(editedTracks, eleveMeiao);
  assert.equal(useSequencerStore.getState().focusTrackId, 60);

  // Chargement d'un nouveau Morceau B (songChanged) -> réapplique Priorité 2 (Meião = 20)
  useSequencerStore.setState({ tracks: FULL_RODA, metadata: { toada: 'Morceau B' } as any });
  useSequencerStore.getState().syncFocusWithTracks(FULL_RODA, eleveMeiao);
  assert.equal(useSequencerStore.getState().focusTrackId, 20);
}

console.log('focusTrackSelector.test.ts: ALL ASSERTIONS PASSED');
