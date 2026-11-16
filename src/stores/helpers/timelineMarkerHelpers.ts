/**
 * timelineMarkerHelpers.ts — Fonctions pures de création, édition et suppression de repères (< 75 lignes).
 * Supporte les repères dotés d'un `id` ainsi que les repères importés/anciens sans `id` (repli index/objet).
 */
import { SongMarker } from '../../types';

export const createSongMarkerState = (
  markers: SongMarker[],
  name: string,
  measure: number,
  color?: string
): SongMarker[] => {
  const newMarker: SongMarker = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    measure,
    color,
  };
  return [...markers, newMarker].sort((a, b) => a.measure - b.measure);
};

export const updateSongMarkerState = (
  markers: SongMarker[],
  id: string,
  name: string,
  measure: number,
  color?: string,
  fallbackIdx?: number
): SongMarker[] => {
  const hasId = id !== undefined && id !== null && String(id) !== '';
  let matched = false;
  const updated = markers.map((m, idx) => {
    const idMatch = hasId && m.id !== undefined && (m.id === id || String(m.id) === String(id));
    const idxMatch = !idMatch && !hasId && fallbackIdx === idx;
    if (idMatch || idxMatch) {
      matched = true;
      return { ...m, id: m.id || `mk-${Date.now()}-${idx}`, name, measure, color: color || m.color };
    }
    return m;
  });
  if (!matched && fallbackIdx !== undefined && markers[fallbackIdx]) {
    const cur = markers[fallbackIdx];
    updated[fallbackIdx] = { ...cur, id: cur.id || `mk-${Date.now()}-${fallbackIdx}`, name, measure, color: color || cur.color };
  }
  return updated.sort((a, b) => a.measure - b.measure);
};

export const deleteSongMarkerState = (
  markers: SongMarker[],
  idOrMarker: string | SongMarker,
  fallbackIdx?: number
): SongMarker[] => {
  const targetId = typeof idOrMarker === 'string' ? idOrMarker : idOrMarker?.id;
  const hasTargetId = targetId !== undefined && targetId !== null && String(targetId) !== '';

  if (hasTargetId) {
    const byId = markers.filter((m) => !(m.id !== undefined && (m.id === targetId || String(m.id) === String(targetId))));
    if (byId.length !== markers.length) return byId;
  }

  if (typeof idOrMarker === 'object' && idOrMarker !== null && markers.includes(idOrMarker)) {
    return markers.filter((m) => m !== idOrMarker);
  }

  if (typeof fallbackIdx === 'number' && fallbackIdx >= 0 && fallbackIdx < markers.length) {
    return markers.filter((_, idx) => idx !== fallbackIdx);
  }

  if (typeof idOrMarker === 'object' && idOrMarker !== null) {
    const matchIdx = markers.findIndex((m) => m.measure === idOrMarker.measure && m.name === idOrMarker.name);
    if (matchIdx !== -1) return markers.filter((_, idx) => idx !== matchIdx);
  }

  return markers;
};
