import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { getBusStripeGradient, getInstrumentPrimaryStrongColor } from '../../utils/colorHelpers';

export interface TrackGroupVisualInfo {
  isGroupMember: boolean;
  isMaster: boolean;
  isSlave: boolean;
  groupColor: string;
  groupBackground: string;
  horizontalBackground: string;
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
  let isSlave = false;
  let masterTrack: TrackGroup | undefined;

  if (hasLinkRelationship) {
    const isDirectLinkMaster = Boolean(track.isLinkMaster);
    const isTargetedAsMasterBySlaves = groupMembers.some(
      (other) => other.id !== track.id && other.linkedToTrackId && String(other.linkedToTrackId) === String(track.id)
    );
    const isPrimaryMasterOfLinkFolder = Boolean(
      track.isLinkFolder ||
        (!groupMembers.some((m) => m.id !== track.id && m.isLinkMaster) && groupMembers[0]?.id === track.id)
    );

    isMaster = isDirectLinkMaster || isTargetedAsMasterBySlaves || isPrimaryMasterOfLinkFolder;
    isSlave = !isMaster;
    masterTrack =
      groupMembers.find((m) => Boolean(m.isLinkMaster)) ||
      groupMembers.find((m) =>
        groupMembers.some((o) => o.id !== m.id && o.linkedToTrackId && String(o.linkedToTrackId) === String(m.id))
      ) ||
      groupMembers[0];
  } else {
    isMaster = groupMembers[0]?.id === track.id;
    isSlave = false;
    masterTrack = groupMembers[0];
  }

  const distinctColors: string[] = [];
  groupMembers.forEach((m) => {
    const inst = instrumentsConfig[m.instrumentIdx];
    const c = getInstrumentPrimaryStrongColor(inst, m);
    if (!distinctColors.includes(c)) distinctColors.push(c);
  });

  const masterColor = masterTrack
    ? getInstrumentPrimaryStrongColor(instrumentsConfig[masterTrack.instrumentIdx], masterTrack)
    : distinctColors[0] || '#8b2a1a';

  return {
    isGroupMember: true,
    isMaster,
    isSlave,
    groupColor: masterColor,
    groupBackground: getBusStripeGradient(distinctColors, 'to bottom'),
    horizontalBackground: getBusStripeGradient(distinctColors, 'to right'),
  };
}
