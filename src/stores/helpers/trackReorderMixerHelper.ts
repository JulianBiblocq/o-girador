import { arrayMove } from '@dnd-kit/sortable';
import { TrackGroup } from '../../types';
import { applyRadii } from './trackRodaGeometryHelpers';

export const sortTracksHierarchically = (tracksList: TrackGroup[]): TrackGroup[] => {
  const visited = new Set<number>();
  const ordered: TrackGroup[] = [];

  const isRoot = (t: TrackGroup) => {
    if (t.linkedToTrackId && !t.isLinkMaster && !t.isLinkFolder) return false;
    const busIdStr = t.busId;
    if (!busIdStr) return true;
    return !tracksList.some(p => p.id !== t.id && String(p.id) === String(busIdStr));
  };

  const visit = (track: TrackGroup) => {
    if (visited.has(track.id)) return;
    visited.add(track.id);
    ordered.push(track);

    const children = tracksList.filter(t => {
      if (visited.has(t.id)) return false;
      const isChildByBus = t.busId && String(t.busId) === String(track.id);
      const isChildByLink = t.linkedToTrackId && String(t.linkedToTrackId) === String(track.id);
      return isChildByBus || isChildByLink;
    });

    children.sort((a, b) => (b.isBusFolder ? 1 : 0) - (a.isBusFolder ? 1 : 0));
    children.forEach(visit);
  };

  tracksList.filter(isRoot).forEach(visit);
  tracksList.forEach(t => { if (!visited.has(t.id)) ordered.push(t); });
  return ordered;
};

const getLinkGroupId = (t: TrackGroup, list: TrackGroup[]): string | null => {
  if (t.isLinkFolder) return String(t.id);
  if (t.linkedToTrackId) return String(t.linkedToTrackId);
  if (t.isLinkMaster) return String(t.id);
  return list.some(o => o.linkedToTrackId && String(o.linkedToTrackId) === String(t.id)) ? String(t.id) : null;
};

const isMemberOfSolidBlock = (cand: TrackGroup, ref: TrackGroup, list: TrackGroup[]): boolean => {
  const refLinkId = getLinkGroupId(ref, list);
  if (refLinkId) return getLinkGroupId(cand, list) === refLinkId;
  if (ref.isBusFolder && !ref.isLinkFolder) return cand.id === ref.id || String(cand.busId) === String(ref.id);
  return cand.id === ref.id;
};

export const handleReorderMixerTracksState = (
  state: { tracks: TrackGroup[]; rodaTrackOrder: number[]; tracksVersion: number; [key: string]: any },
  activeId: number,
  overId: number
): Record<string, any> => {
  if (activeId === overId) return {};

  const currentTracks = sortTracksHierarchically([...state.tracks]);
  const oldIndex = currentTracks.findIndex(t => t.id === activeId);
  const newIndex = currentTracks.findIndex(t => t.id === overId);
  if (oldIndex === -1 || newIndex === -1) return {};

  const dragged = currentTracks[oldIndex];
  const overTrack = currentTracks[newIndex];

  // Cas 1 : Routage vers bus audio cible
  const targetBusIdStr = overTrack.isBusFolder 
    ? String(overTrack.id) 
    : (overTrack.busId ? String(overTrack.busId) : (overTrack.linkedToTrackId ? String(overTrack.linkedToTrackId) : null));
  const targetBus = targetBusIdStr ? currentTracks.find(t => String(t.id) === targetBusIdStr && t.isBusFolder) : null;

  if (targetBus && !dragged.isBusFolder) {
    const isMember = String(dragged.busId) === String(targetBus.id) || String(dragged.linkedToTrackId) === String(targetBus.id);
    if (!isMember) {
      const isLink = !!targetBus.isLinkFolder;
      const updated: TrackGroup = { ...dragged, busId: String(targetBus.id), linkedToTrackId: isLink ? String(targetBus.id) : undefined, isLinkMaster: isLink ? false : undefined };
      const remaining = currentTracks.filter(t => t.id !== activeId);
      const targetIdx = remaining.findIndex(t => t.id === overTrack.id);
      const insertIdx = targetIdx !== -1 ? targetIdx + 1 : remaining.length;
      const next = [...remaining.slice(0, insertIdx), updated, ...remaining.slice(insertIdx)];
      return { tracks: applyRadii(sortTracksHierarchically(next), state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
    }
  }

  // Cas 2 : Piste sortie de son bus vers piste autonome
  if (dragged.busId && !targetBus && !dragged.isBusFolder) {
    const updated: TrackGroup = { ...dragged, busId: undefined, linkedToTrackId: undefined, isLinkMaster: undefined };
    const remaining = currentTracks.filter(t => t.id !== activeId);
    const targetIdx = remaining.findIndex(t => t.id === overTrack.id);
    const insertIdx = targetIdx !== -1 ? (oldIndex < newIndex ? targetIdx + 1 : targetIdx) : remaining.length;
    const next = [...remaining.slice(0, insertIdx), updated, ...remaining.slice(insertIdx)];
    return { tracks: applyRadii(sortTracksHierarchically(next), state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
  }

  // Cas 3 : Réarrangement interne au même groupe
  const isSameBus = !!(dragged.busId && overTrack.busId && String(dragged.busId) === String(overTrack.busId));
  const blockTracks = currentTracks.filter(t => isMemberOfSolidBlock(t, dragged, currentTracks));
  if ((blockTracks.length > 1 && blockTracks.some(t => t.id === overTrack.id)) || isSameBus) {
    const linkId = getLinkGroupId(dragged, currentTracks);
    if (linkId) {
      const folders = blockTracks.filter(t => t.isLinkFolder);
      const masters = blockTracks.filter(t => t.isLinkMaster && !t.isLinkFolder);
      let slaves = blockTracks.filter(t => !t.isLinkMaster && !t.isLinkFolder);
      const sOld = slaves.findIndex(t => t.id === dragged.id);
      const sNew = slaves.findIndex(t => t.id === overTrack.id);
      if (sOld !== -1 && sNew !== -1) slaves = arrayMove(slaves, sOld, sNew);
      const reordered = [...folders, ...masters, ...slaves];
      let bIdx = 0;
      const next = currentTracks.map(t => isMemberOfSolidBlock(t, dragged, currentTracks) ? reordered[bIdx++] : t);
      return { tracks: applyRadii(sortTracksHierarchically(next), state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
    }
    const next = arrayMove(currentTracks, oldIndex, newIndex) as TrackGroup[];
    return { tracks: applyRadii(sortTracksHierarchically(next), state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
  }

  // Cas 4 : Déplacement solidaire par bloc
  const remaining = currentTracks.filter(t => !isMemberOfSolidBlock(t, dragged, currentTracks));
  const firstBlockIdx = currentTracks.findIndex(t => isMemberOfSolidBlock(t, dragged, currentTracks));
  const targetIdx = remaining.findIndex(t => t.id === overTrack.id);
  const isDropAfter = firstBlockIdx < newIndex;
  let insertIdx = targetIdx === -1 ? (isDropAfter ? remaining.length : 0) : (isDropAfter ? targetIdx + 1 : targetIdx);
  insertIdx = Math.max(0, Math.min(remaining.length, insertIdx));
  const next = [...remaining.slice(0, insertIdx), ...blockTracks, ...remaining.slice(insertIdx)];
  return { tracks: applyRadii(sortTracksHierarchically(next), state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
};
