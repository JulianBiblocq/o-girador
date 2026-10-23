/**
 * Fonctions utilitaires d'extraction pour le Speed Trainer (< 45 lignes).
 */

import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';

export function resolveFamilyLabel(selectedTrackId: number | null, storeTracks: TrackGroup[]): string {
  if (selectedTrackId === null) return '';
  const target = storeTracks.find((t) => t.id === selectedTrackId);
  if (!target) return '';
  if (target.busId) {
    const busFolder = storeTracks.find((t) => String(t.id) === String(target.busId) && t.isBusFolder);
    if (busFolder?.customName) return busFolder.customName;
    const busName = String(target.busId).replace(/^(bus[-_]|group[-_])/, '');
    return busName.charAt(0).toUpperCase() + busName.slice(1);
  }
  if (target.linkedToTrackId) {
    const master = storeTracks.find((t) => String(t.id) === String(target.linkedToTrackId));
    return master?.customName || instrumentsConfig[master?.instrumentIdx || 0]?.name || '';
  }
  return '';
}

export function filterPlayableTrainerTracks(storeTracks: TrackGroup[]): TrackGroup[] {
  return storeTracks.filter((t) => {
    if (t.isBusFolder && !t.isLinkFolder) return false;
    const inst = instrumentsConfig[t.instrumentIdx];
    return !(inst?.type === 'voice' || inst?.id === 'puxador' || inst?.id === 'coro' || (t as any).isToadaBus);
  });
}
