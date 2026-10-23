/**
 * toadaImportHelpers.ts
 * Utilitaires d'assistance pour l'import de packs Toada (< 60 lignes).
 */
import { instrumentsConfig } from '../../data';
import type { TrackGroup, Pattern } from '../../types/store.types';

export function isBlankPattern(p?: Pattern): boolean {
  if (!p) return true;
  const hasNotes = p.notes?.some((n) => n && n !== '' && n !== '───');
  const hasActive = p.activeSteps?.some((s) => s && s !== 0 && s !== '───');
  return !hasNotes && !hasActive && !p.vocalClip && p.vocalMode !== 'micro';
}

export function getOrCreateTrack(tracks: TrackGroup[], role: 'puxador' | 'coro'): TrackGroup {
  const found = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === role);
  if (found) return found;
  const idx = instrumentsConfig.findIndex((i) => i.id === role);
  const maxId = Math.max(100, ...tracks.map((t) => Number(t.id) || 0));
  return {
    id: maxId + (role === 'puxador' ? 1 : 2),
    instrumentIdx: idx !== -1 ? idx : (role === 'puxador' ? 10 : 11),
    patterns: [],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 80,
    selectedPatternId: 0,
    reverbVal: 0,
    panVal: 0,
    pan: 0,
    tuning: 0,
    fxSends: { reverb: 0, distortion: 0 },
  };
}
