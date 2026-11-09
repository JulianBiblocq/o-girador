import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { getBusStripeGradient } from '../../utils/colorHelpers';

export interface TrackGroupVisualInfo {
  isGroupMember: boolean;
  isMaster: boolean;
  isSlave: boolean;
  groupColor: string;
  groupBackground: string;
}

export function getTrackGroupVisual(
  track: TrackGroup,
  allTracks: TrackGroup[]
): TrackGroupVisualInfo | null {
  const activeTracks = allTracks.filter(
    (t) => !t.isLinkFolder && (!t.isBusFolder || t.customName === 'Toada' || String(t.id) === 'toada')
  );

  const parentLinkId = track.linkedToTrackId ? String(track.linkedToTrackId) : null;
  const busId = track.busId ? String(track.busId) : null;

  const groupMembers = activeTracks.filter((other) => {
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

  const hasLinkRelationship = groupMembers.some((m) =>
    Boolean(m.isLinkMaster || m.linkedToTrackId || m.isLinkFolder)
  );

  let isMaster = false;
  let masterTrack: TrackGroup | undefined;

  if (hasLinkRelationship) {
    const isDirectLinkMaster = Boolean(track.isLinkMaster);
    const isTargetedAsMasterBySlaves = groupMembers.some(
      (other) => other.id !== track.id && other.linkedToTrackId && String(other.linkedToTrackId) === String(track.id)
    );
    const isPrimaryMasterOfLinkFolder = Boolean(
      track.isLinkFolder ||
        (groupMembers.some((m) => m.isLinkFolder) &&
          !groupMembers.some((m) => m.id !== track.id && m.isLinkMaster) &&
          groupMembers[0]?.id === track.id)
    );

    isMaster = isDirectLinkMaster || isTargetedAsMasterBySlaves || isPrimaryMasterOfLinkFolder;
    masterTrack =
      groupMembers.find((m) => Boolean(m.isLinkMaster)) ||
      groupMembers.find((m) =>
        groupMembers.some((o) => o.id !== m.id && o.linkedToTrackId && String(o.linkedToTrackId) === String(m.id))
      ) ||
      groupMembers[0];
  }

  if (hasLinkRelationship && masterTrack) {
    const masterColor = instrumentsConfig[masterTrack.instrumentIdx]?.color || '#8b2a1a';
    return {
      isGroupMember: true,
      isMaster,
      isSlave: !isMaster,
      groupColor: masterColor,
      groupBackground: masterColor,
    };
  }

  const distinctColors: string[] = [];
  groupMembers.forEach((m) => {
    const c = instrumentsConfig[m.instrumentIdx]?.color || '#8b2a1a';
    if (!distinctColors.includes(c)) distinctColors.push(c);
  });
  const primaryColor = distinctColors[0] || '#8b2a1a';

  return {
    isGroupMember: true,
    isMaster: false,
    isSlave: false,
    groupColor: primaryColor,
    groupBackground: getBusStripeGradient(distinctColors, 'to bottom'),
  };
}
