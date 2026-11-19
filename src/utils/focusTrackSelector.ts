import { TrackGroup } from '../types';
import { instrumentsConfig } from '../data';
import { UserProfile } from '../contexts/auth/authTypes';
import { getStoredLastFocusInstrument, getStoredWorkingInstrument } from './userPreferencesStorage';

const ALFAIA_IDS = new Set(['marcante', 'meiao', 'repique']);
const CAIXA_IDS = new Set(['caixa', 'tarol']);

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function getTrackCanonicalId(track: TrackGroup): string {
  const inst = instrumentsConfig[track.instrumentIdx];
  return stripAccents(inst?.id || (track as any).instrumentId || '');
}

function resolveCanonicalRole(rawQuery: string): string | null {
  const q = stripAccents(rawQuery);
  if (!q || q === 'auto') return null;
  if (q.includes('marcante') || q.includes('bombarda')) return 'marcante';
  if (q.includes('meiao') || q === 'meio') return 'meiao';
  if (q.includes('repique')) return 'repique';
  if (q.includes('tarol')) return 'tarol';
  if (q.includes('caixa') || q.includes('caisse') || q.includes('snare')) return 'caixa';
  if (q.includes('timbal') || q.includes('timbau')) return 'timbal';
  if (q.includes('gongue') || q.includes('agogo')) return 'gongue';
  if (q.includes('agbe') || q.includes('xequere') || q.includes('shekere') || /\babe\b/.test(q)) return 'agbe';
  if (q.includes('mineiro') || q.includes('ganza') || q.includes('chocalho')) return 'mineiro';
  if (q.includes('alfaia')) return 'alfaia';
  return null;
}

export function getEligibleReferenceTracks(tracks: TrackGroup[], primaryTrackId: number | null): TrackGroup[] {
  return getPlayableFocusTracks(tracks).filter((t) => primaryTrackId === null || t.id !== primaryTrackId);
}

export function getPlayableFocusTracks(tracks: TrackGroup[]): TrackGroup[] {
  return tracks.filter((t) => {
    if (t.isBusFolder || t.isLinkFolder) return false;
    const inst = instrumentsConfig[t.instrumentIdx];
    if (!inst) return false;
    const name = (t.customName || inst.name || inst.id || '').trim().toUpperCase();
    if (name === 'ALFAIAS' || String(t.id).toLowerCase() === 'alfaias') return false;
    if (inst.id === 'apito' || inst.id === 'puxador' || inst.id === 'coro' || inst.type === 'voice') return false;
    return true;
  });
}

export function matchPlayableTrackByInstrumentQuery(playable: TrackGroup[], rawQuery?: string | null): TrackGroup | null {
  if (!rawQuery || playable.length === 0) return null;
  const clean = stripAccents(rawQuery);
  if (!clean || clean === 'auto') return null;

  const numId = Number(clean);
  if (Number.isFinite(numId) && String(numId) === clean) {
    const byId = playable.find((t) => t.id === numId);
    if (byId) return byId;
  }

  const canonical = resolveCanonicalRole(clean);
  if (canonical && canonical !== 'alfaia') {
    const exact = playable.find((t) => {
      const id = getTrackCanonicalId(t);
      const custom = stripAccents(t.customName || '');
      return id === canonical || custom.includes(canonical);
    });
    if (exact) return exact;
  }

  if (canonical === 'alfaia' || (canonical && ALFAIA_IDS.has(canonical))) {
    const firstAlfaia = playable.find((t) => ALFAIA_IDS.has(getTrackCanonicalId(t)));
    if (firstAlfaia) return firstAlfaia;
  }
  if (canonical && CAIXA_IDS.has(canonical)) {
    const firstCaixa = playable.find((t) => CAIXA_IDS.has(getTrackCanonicalId(t)));
    if (firstCaixa) return firstCaixa;
  }

  return playable.find((t) => {
    const inst = instrumentsConfig[t.instrumentIdx];
    const label = stripAccents(t.customName || inst?.name || inst?.id || '');
    return label.includes(clean);
  }) ?? null;
}

function readUrlRoleParam(): string | null {
  if (typeof window === 'undefined' || !window.location?.search) return null;
  const p = new URLSearchParams(window.location.search);
  return p.get('role') || p.get('targetTrack') || null;
}

export function resolveDefaultFocusTrackId(
  tracks: TrackGroup[],
  userProfile?: UserProfile | null,
  preferredInstrumentName?: string | null,
  urlRoleOverride?: string | null
): number | null {
  const playable = getPlayableFocusTracks(tracks);
  if (playable.length === 0) return tracks[0]?.id ?? null;

  // Priorité 1 : Paramètre d'URL (?role=... ou ?targetTrack=...)
  const urlRole = urlRoleOverride || readUrlRoleParam();
  const urlMatch = matchPlayableTrackByInstrumentQuery(playable, urlRole);
  if (urlMatch) return urlMatch.id;

  // Priorité 2 : Instrument principal du profil utilisateur (Organizador / Firestore)
  const localWorking = getStoredWorkingInstrument();
  const profileQuery =
    (userProfile?.instrument || '').trim() ||
    (userProfile?.preferredInstrument && userProfile.preferredInstrument !== 'auto' ? userProfile.preferredInstrument.trim() : '') ||
    (localWorking !== 'auto' ? localWorking : '');
  const profileMatch = matchPlayableTrackByInstrumentQuery(playable, profileQuery);
  if (profileMatch) return profileMatch.id;

  // Priorité 3 : Dernier pupitre choisi par l'élève, ou Marcante (1re piste percussive) pour Mestre / visiteur
  const rawRole = stripAccents(String(userProfile?.dbRole || userProfile?.role || ''));
  const isMestreOrVisitor = !userProfile || rawRole === 'mestre' || rawRole === 'mestri' || rawRole === 'visiteur';
  if (!isMestreOrVisitor) {
    const lastChoice = preferredInstrumentName || getStoredLastFocusInstrument();
    const lastMatch = matchPlayableTrackByInstrumentQuery(playable, lastChoice);
    if (lastMatch) return lastMatch.id;
  }

  const marcante = matchPlayableTrackByInstrumentQuery(playable, 'marcante');
  return marcante?.id ?? playable[0]?.id ?? tracks[0]?.id ?? null;
}
