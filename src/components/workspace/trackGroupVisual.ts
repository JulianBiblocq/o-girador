import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';

export interface TrackGroupVisualInfo {
  isGroupMember: boolean;
  isMaster: boolean;
  isSlave: boolean;
  groupColor: string;
}

function computeAverageColor(members: TrackGroup[]): string {
  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  for (const m of members) {
    const inst = instrumentsConfig[m.instrumentIdx];
    const colorHex = inst?.color || (m as any).color;
    if (!colorHex) continue;
    const hex = colorHex.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        rSum += r; gSum += g; bSum += b; count++;
      }
    }
  }

  if (count === 0) return '#bdc3c7';

  const rAvg = Math.round(rSum / count).toString(16).padStart(2, '0');
  const gAvg = Math.round(gSum / count).toString(16).padStart(2, '0');
  const bAvg = Math.round(bSum / count).toString(16).padStart(2, '0');

  return `#${rAvg}${gAvg}${bAvg}`;
}

export function getTrackGroupVisual(
  track: TrackGroup,
  allTracks: TrackGroup[]
): TrackGroupVisualInfo | null {
  const activeTracks = allTracks.filter(
    t => !t.isLinkFolder && (!t.isBusFolder || t.customName === 'Toada' || String(t.id) === 'toada')
  );

  const parentLinkId = track.linkedToTrackId ? String(track.linkedToTrackId) : null;
  const busId = track.busId ? String(track.busId) : null;

  const groupMembers = activeTracks.filter(other => {
    if (other.id === track.id) return true;
    const oParent = other.linkedToTrackId ? String(other.linkedToTrackId) : null;
    const oBus = other.busId ? String(other.busId) : null;

    if (parentLinkId && oParent && parentLinkId === oParent) return true;
    if (parentLinkId && String(other.id) === parentLinkId) return true;
    if (oParent && String(track.id) === oParent) return true;
    if (busId && oBus && busId === oBus) return true;
    if (busId && String(other.id) === busId) return true;
    if (oBus && String(track.id) === oBus) return true;
    return false;
  });

  if (groupMembers.length < 2) return null;

  const hasLinkRelationship = groupMembers.some(
    m => Boolean(m.isLinkMaster || m.linkedToTrackId || m.isLinkFolder)
  );

  let isMaster = false;
  if (hasLinkRelationship) {
    const isDirectLinkMaster = Boolean(track.isLinkMaster);
    const isTargetedAsMasterBySlaves = groupMembers.some(
      other => other.id !== track.id && other.linkedToTrackId && String(other.linkedToTrackId) === String(track.id)
    );
    const isPrimaryMasterOfLinkFolder = Boolean(
      track.isLinkFolder ||
      (groupMembers.some(m => m.isLinkFolder) && !groupMembers.some(m => m.id !== track.id && m.isLinkMaster) && groupMembers[0]?.id === track.id)
    );

    isMaster = isDirectLinkMaster || isTargetedAsMasterBySlaves || isPrimaryMasterOfLinkFolder;
  }

  return {
    isGroupMember: true,
    isMaster,
    isSlave: !isMaster,
    groupColor: computeAverageColor(groupMembers)
  };
}
