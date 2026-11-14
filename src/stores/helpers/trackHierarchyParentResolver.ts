import { instrumentsConfig } from '../../data';
import { isToadaBus } from './trackVisibilityHelpers';

export function isToadaBusContainer(track: any): boolean {
  if (!track || !track.isBusFolder) return false;
  if (isToadaBus(track)) return true;
  const inst = track.instrumentIdx !== undefined ? instrumentsConfig[track.instrumentIdx] : undefined;
  if (inst?.id === 'toada') return true;
  return String(track.customName || '').trim().toLowerCase() === 'toada';
}

export function isBusOrLinkContainer(track: any): boolean {
  return Boolean(track && (track.isBusFolder || track.isLinkFolder));
}

export function getImmediateParentId(track: any, tracks: readonly any[]): number | string | null {
  if (!track || !Array.isArray(tracks)) return null;

  const rawParent = track.busId ?? track.linkedToTrackId;
  if (rawParent !== undefined && rawParent !== null && String(rawParent) !== '' && String(rawParent) !== String(track.id)) {
    const explicitParent = tracks.find((p) => p && String(p.id) === String(rawParent));
    if (explicitParent) return explicitParent.id;
  }

  if (!isBusOrLinkContainer(track)) {
    const inst = track.instrumentIdx !== undefined ? instrumentsConfig[track.instrumentIdx] : undefined;
    const isVocalLeaf = Boolean(track.isVocal || inst?.type === 'voice' || inst?.id === 'puxador' || inst?.id === 'coro');
    if (isVocalLeaf) {
      const toadaBus = tracks.find((b) => isToadaBusContainer(b) && String(b.id) !== String(track.id));
      if (toadaBus) return toadaBus.id;
    }
  }

  return null;
}

export function getDirectChildren<T extends { id: number | string }>(
  tracks: readonly T[],
  parentId: number | string
): T[] {
  const parentStr = String(parentId);
  return tracks.filter((t) => t && String(t.id) !== parentStr && String(getImmediateParentId(t, tracks)) === parentStr);
}

export function getAllDescendantIds(tracks: readonly any[], rootId: number | string): Set<string> {
  const result = new Set<string>();
  const visited = new Set<string>([String(rootId)]);
  const stack: (number | string)[] = [rootId];

  while (stack.length > 0) {
    const curId = stack.pop()!;
    const kids = getDirectChildren(tracks, curId);
    for (let i = 0; i < kids.length; i++) {
      const kid = kids[i];
      const kidStr = String(kid.id);
      if (visited.has(kidStr)) continue;
      visited.add(kidStr);
      result.add(kidStr);
      if (isBusOrLinkContainer(kid)) stack.push(kid.id);
    }
  }
  return result;
}

export function getAncestorChainBottomUp<T extends { id: number | string }>(
  tracks: readonly T[],
  startTrackId: number | string
): T[] {
  const start = tracks.find((t) => t && String(t.id) === String(startTrackId));
  if (!start) return [];
  const chain: T[] = [];
  const visited = new Set<string>([String(start.id)]);
  let current: T | undefined = start;

  while (current) {
    const parentId = getImmediateParentId(current, tracks);
    if (parentId === null || visited.has(String(parentId))) break;
    const parent = tracks.find((t) => t && String(t.id) === String(parentId));
    if (!parent) break;
    visited.add(String(parent.id));
    chain.push(parent);
    current = parent;
  }
  return chain;
}
