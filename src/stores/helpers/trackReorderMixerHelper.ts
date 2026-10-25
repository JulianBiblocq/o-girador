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
  overId: number,
  dropSide: 'left' | 'right' = 'right'
): Record<string, any> => {
  if (activeId === overId) return {};

  const currentTracks = sortTracksHierarchically([...state.tracks]);
  const oldIndex = currentTracks.findIndex(t => t.id === activeId);
  const newIndex = currentTracks.findIndex(t => t.id === overId);
  if (oldIndex === -1 || newIndex === -1) return {};

  const dragged = currentTracks[oldIndex];
  const overTrack = currentTracks[newIndex];

  // 1. Détection des groupes / bus
  const draggedLinkId = getLinkGroupId(dragged, currentTracks);
  const overLinkId = getLinkGroupId(overTrack, currentTracks);
  const isSameLinkGroup = Boolean(draggedLinkId && overLinkId && draggedLinkId === overLinkId);
  const isSameBus = Boolean(dragged.busId && overTrack.busId && String(dragged.busId) === String(overTrack.busId));
  const isInternalGroupMove = isSameLinkGroup || isSameBus;

  // Cas 3 (prioritaire si même groupe) : Réarrangement interne au même groupe
  const blockTracks = currentTracks.filter(t => isMemberOfSolidBlock(t, dragged, currentTracks));
  if ((blockTracks.length > 1 && blockTracks.some(t => t.id === overTrack.id)) || isInternalGroupMove) {
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

  // Détermination du bus cible et règles d'exclusion
  const targetBusIdStr = overTrack.isBusFolder ? String(overTrack.id) : (overTrack.busId ? String(overTrack.busId) : null);
  const targetBus = targetBusIdStr ? currentTracks.find(t => String(t.id) === targetBusIdStr && t.isBusFolder) : null;
  const isTargetLinkGroup = Boolean(targetBus?.isLinkFolder);
  const isDroppingLeftOfBusHeader = Boolean(overTrack.isBusFolder && dropSide === 'left');
  const isOverBusOrChild = Boolean(
    targetBus && (overTrack.id === targetBus.id || (overTrack.busId && String(overTrack.busId) === String(targetBus.id)))
  );

  const shouldJoinBus = Boolean(
    targetBus && !isTargetLinkGroup && !dragged.isBusFolder && isOverBusOrChild && !isDroppingLeftOfBusHeader
  );

  // Cas 1 : Intégration autorisée dans un Bus Audio (à droite de la tranche BUS ou entre ses enfants)
  if (shouldJoinBus && targetBus) {
    const updated: TrackGroup = { ...dragged, busId: String(targetBus.id), linkedToTrackId: undefined, isLinkMaster: undefined };
    const remaining = currentTracks.filter(t => t.id !== activeId);
    const targetIdx = remaining.findIndex(t => t.id === overTrack.id);
    const insertIdx = targetIdx !== -1 ? (dropSide === 'left' && !overTrack.isBusFolder ? targetIdx : targetIdx + 1) : remaining.length;
    const next = [...remaining.slice(0, insertIdx), updated, ...remaining.slice(insertIdx)];
    return { tracks: applyRadii(sortTracksHierarchically(next), state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
  }

  // Cas 2 : Piste autonome ou sortie de son bus (lâchée hors bus, à gauche d'une tranche BUS ou après dernier enfant)
  if (dragged.busId && !dragged.isBusFolder) {
    const updated: TrackGroup = { ...dragged, busId: undefined, linkedToTrackId: undefined, isLinkMaster: undefined };
    const remaining = currentTracks.filter(t => t.id !== activeId);
    const targetIdx = remaining.findIndex(t => t.id === overTrack.id);
    const insertIdx = targetIdx !== -1 ? (dropSide === 'left' ? targetIdx : targetIdx + 1) : remaining.length;
    const next = [...remaining.slice(0, insertIdx), updated, ...remaining.slice(insertIdx)];
    return { tracks: applyRadii(sortTracksHierarchically(next), state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
  }

  // Cas 4 : Déplacement solidaire par bloc ou insertion libre
  const remaining = currentTracks.filter(t => !isMemberOfSolidBlock(t, dragged, currentTracks));
  const targetIdx = remaining.findIndex(t => t.id === overTrack.id);
  const isDropAfter = dropSide === 'right';
  let insertIdx = targetIdx === -1 ? (isDropAfter ? remaining.length : 0) : (isDropAfter ? targetIdx + 1 : targetIdx);
  insertIdx = Math.max(0, Math.min(remaining.length, insertIdx));
  const next = [...remaining.slice(0, insertIdx), ...blockTracks, ...remaining.slice(insertIdx)];
  return { tracks: applyRadii(sortTracksHierarchically(next), state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
};
