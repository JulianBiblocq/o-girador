import { TrackGroup } from '../../types';
import { isToadaBus, isToadaChild, getTrackSolidBlockId } from './trackVisibilityHelpers';
import { sanitizeRodaTrackOrder, applyRadii } from './trackRodaGeometryHelpers';

export const handleReorderRodaTracksState = (
  state: { tracks: TrackGroup[]; rodaTrackOrder: number[]; tracksVersion: number; [key: string]: any },
  activeId: number,
  overId: number
): Record<string, any> => {
  if (activeId === overId) return {};

  const currentOrder = sanitizeRodaTrackOrder(state.rodaTrackOrder, state.tracks);
  const activeTrack = state.tracks.find(t => t.id === activeId);
  if (!activeTrack) return {};

  const isToada = isToadaBus(activeTrack);
  const linkedSlaves = state.tracks.filter(t => {
    if (t.id === activeId) return false;
    if (isToada && isToadaChild(t, state.tracks)) return true;
    if (t.linkedToTrackId && String(t.linkedToTrackId) === String(activeTrack.id)) return true;
    if (activeTrack.linkedToTrackId && activeTrack.isLinkMaster && String(t.linkedToTrackId) === String(activeTrack.linkedToTrackId)) return true;
    return false;
  });

  const overTrack = state.tracks.find(t => t.id === overId);
  let effectiveOverId = overId;
  if (overTrack) {
    const overParentMaster = state.tracks.find(t => 
      t.id !== overTrack.id && (
        (overTrack.linkedToTrackId && String(t.id) === String(overTrack.linkedToTrackId)) ||
        (overTrack.linkedToTrackId && t.isLinkMaster && String(t.linkedToTrackId) === String(overTrack.linkedToTrackId)) ||
        (isToadaBus(t) && isToadaChild(overTrack, state.tracks))
      )
    );
    if (overParentMaster && !linkedSlaves.some(s => s.id === overParentMaster.id)) {
      const isToadaOver = isToadaBus(overParentMaster);
      const overSlaves = state.tracks.filter(t => 
        t.id !== overParentMaster.id && (
          (isToadaOver && isToadaChild(t, state.tracks)) ||
          (t.linkedToTrackId && String(t.linkedToTrackId) === String(overParentMaster.id)) ||
          (overParentMaster.linkedToTrackId && overParentMaster.isLinkMaster && String(t.linkedToTrackId) === String(overParentMaster.linkedToTrackId))
        )
      );
      const overBlockIds = [overParentMaster.id, ...overSlaves.map(s => s.id)];
      const oldIdx = currentOrder.indexOf(activeId);
      const overIdx = currentOrder.indexOf(overId);
      if (oldIdx < overIdx) {
        let maxIdx = -1;
        let lastId = overParentMaster.id;
        overBlockIds.forEach(id => {
          const idx = currentOrder.indexOf(id);
          if (idx > maxIdx) { maxIdx = idx; lastId = id; }
        });
        effectiveOverId = lastId;
      } else {
        effectiveOverId = overParentMaster.id;
      }
    }
  }

  const slaveIds = linkedSlaves.map(s => s.id);
  slaveIds.sort((a, b) => currentOrder.indexOf(a) - currentOrder.indexOf(b));

  const blockIds = [activeId, ...slaveIds];
  const remainingOrder = currentOrder.filter(id => !blockIds.includes(id));
  const oldIndex = currentOrder.indexOf(activeId);
  const targetIdx = remainingOrder.indexOf(effectiveOverId);
  if (oldIndex === -1 || targetIdx === -1) return {};

  const overIndex = currentOrder.indexOf(effectiveOverId);
  const isDropAfter = oldIndex < overIndex;
  let insertIdx = isDropAfter ? targetIdx + 1 : targetIdx;
  insertIdx = Math.max(0, Math.min(remainingOrder.length, insertIdx));

  const nextOrder = [
    ...remainingOrder.slice(0, insertIdx),
    ...blockIds,
    ...remainingOrder.slice(insertIdx)
  ];

  return {
    rodaTrackOrder: nextOrder,
    tracks: applyRadii(state.tracks, nextOrder),
    tracksVersion: state.tracksVersion + 1
  };
};

export const handleReorderWagonState = (
  state: { tracks: TrackGroup[]; rodaTrackOrder: number[]; tracksVersion: number; [key: string]: any },
  wagonTrackIds: number[],
  overTrackId: number
): Record<string, any> => {
  if (!wagonTrackIds || wagonTrackIds.length === 0 || wagonTrackIds.includes(overTrackId)) return {};

  const currentTracks = [...state.tracks];
  const wagonSet = new Set(wagonTrackIds);
  const wagonTracks = wagonTrackIds.map(id => currentTracks.find(t => t.id === id)).filter(Boolean) as TrackGroup[];
  if (wagonTracks.length === 0) return {};

  const remainingTracks = currentTracks.filter(t => !wagonSet.has(t.id));
  const overTrack = currentTracks.find(t => t.id === overTrackId);
  if (!overTrack) return {};

  const originalWagonHeadIdx = currentTracks.findIndex(t => t.id === wagonTrackIds[0]);
  const originalOverIdx = currentTracks.findIndex(t => t.id === overTrackId);
  const isMovingRight = originalWagonHeadIdx < originalOverIdx;

  const overBlockId = getTrackSolidBlockId(overTrack, currentTracks);
  let targetIndex = -1;

  if (overBlockId) {
    const targetGroupMembers = remainingTracks.filter(t => getTrackSolidBlockId(t, currentTracks) === overBlockId);
    if (targetGroupMembers.length > 0) {
      if (isMovingRight) {
        const lastMember = targetGroupMembers[targetGroupMembers.length - 1];
        targetIndex = remainingTracks.findIndex(t => t.id === lastMember.id) + 1;
      } else {
        const firstMember = targetGroupMembers[0];
        targetIndex = remainingTracks.findIndex(t => t.id === firstMember.id);
      }
    }
  }

  if (targetIndex === -1) {
    const idxInRemaining = remainingTracks.findIndex(t => t.id === overTrackId);
    targetIndex = idxInRemaining !== -1 ? (isMovingRight ? idxInRemaining + 1 : idxInRemaining) : (isMovingRight ? remainingTracks.length : 0);
  }

  targetIndex = Math.max(0, Math.min(remainingTracks.length, targetIndex));
  const newTracks = [
    ...remainingTracks.slice(0, targetIndex),
    ...wagonTracks,
    ...remainingTracks.slice(targetIndex)
  ];

  return {
    tracks: applyRadii(newTracks, state.rodaTrackOrder),
    tracksVersion: state.tracksVersion + 1
  };
};
