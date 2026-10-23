/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackGroup } from '../types';
import { instrumentsConfig } from '../data';
import { UserProfile } from '../contexts/auth/authTypes';

export function getEligibleReferenceTracks(
  tracks: TrackGroup[],
  primaryTrackId: number | null
): TrackGroup[] {
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

export function resolveDefaultFocusTrackId(
  tracks: TrackGroup[],
  userProfile?: UserProfile | null,
  preferredInstrumentName?: string | null
): number | null {
  const playable = getPlayableFocusTracks(tracks);
  if (playable.length === 0) return tracks[0]?.id ?? null;

  const rawInstrument = (preferredInstrumentName || userProfile?.instrument || '').trim().toLowerCase();
  const rawRole = (userProfile?.role || '').trim().toLowerCase();

  const findByName = (keyword: string) =>
    playable.find((t) => {
      const inst = instrumentsConfig[t.instrumentIdx];
      const name = (t.customName || inst?.name || inst?.id || '').toLowerCase();
      return name.includes(keyword);
    });

  const knownKeywords = [
    'marcante', 'meião', 'meiao', 'repique', 'caixa', 'tarol',
    'gonguê', 'gongue', 'agbê', 'agbe', 'mineiro', 'timbal'
  ];

  for (const kw of knownKeywords) {
    if (rawInstrument.includes(kw)) {
      const normalized = kw.replace('meiao', 'meião').replace('gongue', 'gonguê').replace('agbe', 'agbê');
      const match = findByName(normalized) || findByName(kw);
      if (match) return match.id;
    }
  }

  if (rawInstrument.includes('caisse') || rawInstrument.includes('snare') || rawInstrument.includes('caixa')) {
    const match = findByName('caixa') || findByName('tarol');
    if (match) return match.id;
  }

  if (rawInstrument.includes('alfaia') || rawInstrument.includes('bombarda') || rawRole === 'mestre' || !userProfile) {
    const marcante = findByName('marcante');
    if (marcante) return marcante.id;
  }

  return playable[0]?.id ?? tracks[0]?.id ?? null;
}
