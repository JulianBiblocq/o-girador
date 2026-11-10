import { TrackGroup } from '../../types';
import { TrackMeta } from '../../stores/useSequencerStore';
import { getTopParentBusId, getRootLinkGroupId } from '../../utils/colorHelpers';

export const getTrackGroupKey = (
  t: TrackGroup | TrackMeta | null | undefined,
  allTracks: (TrackGroup | TrackMeta)[]
): string | null => {
  if (!t) return null;
  const topBus = getTopParentBusId(t, allTracks as any);
  if (topBus) return topBus;
  const rootLink = getRootLinkGroupId(t, allTracks as any);
  if (rootLink) return rootLink;
  if (t.busId) return String(t.busId);
  return null;
};

export function computeBusAndLinkPositions(
  track: TrackMeta,
  prevTrack: TrackMeta | null,
  nextTrack: TrackMeta | null,
  tracksMeta: TrackMeta[]
) {
  const parentBusId = getTopParentBusId(track, tracksMeta as any);
  const prevParentBusId = prevTrack ? getTopParentBusId(prevTrack, tracksMeta as any) : null;
  const nextParentBusId = nextTrack ? getTopParentBusId(nextTrack, tracksMeta as any) : null;

  let busPosition: 'first' | 'middle' | 'last' | 'none' = 'none';
  if (parentBusId) {
    const hasPrev = parentBusId === prevParentBusId;
    const hasNext = parentBusId === nextParentBusId;
    if (!hasPrev && hasNext) busPosition = 'first';
    else if (hasPrev && hasNext) busPosition = 'middle';
    else if (hasPrev && !hasNext) busPosition = 'last';
  }

  const linkGroupId = getRootLinkGroupId(track, tracksMeta as any);
  const prevLinkGroupId = prevTrack ? getRootLinkGroupId(prevTrack, tracksMeta as any) : null;
  const nextLinkGroupId = nextTrack ? getRootLinkGroupId(nextTrack, tracksMeta as any) : null;

  let linkPosition: 'first' | 'middle' | 'last' | 'none' = 'none';
  if (linkGroupId) {
    const hasPrev = linkGroupId === prevLinkGroupId;
    const hasNext = linkGroupId === nextLinkGroupId;
    if (!hasPrev && hasNext) linkPosition = 'first';
    else if (hasPrev && hasNext) linkPosition = 'middle';
    else if (hasPrev && !hasNext) linkPosition = 'last';
  }

  return { busPosition, linkPosition };
}

export function computeMidiAndOrdinal(
  track: TrackMeta,
  index: number,
  allOrderedTracks: TrackMeta[],
  mixerBankOffset: number
) {
  const absIndex = allOrderedTracks.findIndex(t => t.id === track.id);
  const numStr = String(absIndex >= 0 ? absIndex + 1 : index + 1).padStart(2, '0');
  const channelOrdinal = track.isBusFolder ? `BUS ${numStr}` : numStr;
  const isUnderMidiControl = index >= mixerBankOffset && index < mixerBankOffset + 8;
  const midiFaderIndex = isUnderMidiControl ? index - mixerBankOffset + 1 : null;

  return { channelOrdinal, isUnderMidiControl, midiFaderIndex };
}

export function resolveMixerDragWagon(
  activeTrackId: number,
  tracksMeta: TrackMeta[],
  displayedTracks: TrackMeta[],
  currentFullTracks: TrackGroup[]
): { blockTrackIds: number[]; wagonTracks: TrackGroup[] | null } {
  const activeTrack = tracksMeta.find(t => t.id === activeTrackId);
  const activeFullTrack = currentFullTracks.find(t => t.id === activeTrackId);

  const isLinkedChild = Boolean(activeTrack?.linkedToTrackId && !activeTrack?.isLinkFolder && !activeTrack?.isLinkMaster);
  const isBusChild = Boolean(activeTrack?.busId && !activeTrack?.isBusFolder);
  const isInternalChild = isLinkedChild || isBusChild;

  const isGroupHeader = Boolean(
    activeTrack &&
      !isInternalChild &&
      (activeTrack.isBusFolder ||
        activeTrack.isLinkFolder ||
        activeTrack.isLinkMaster ||
        tracksMeta.some(
          t => String(t.busId) === String(activeTrack.id) || String(t.linkedToTrackId) === String(activeTrack.id)
        ))
  );

  if (isGroupHeader) {
    const blockTrackIds = displayedTracks
      .filter(
        t =>
          t.id === activeTrackId ||
          String(t.busId) === String(activeTrackId) ||
          String(t.linkedToTrackId) === String(activeTrackId) ||
          (activeTrack?.linkedToTrackId && String(t.linkedToTrackId) === String(activeTrack.linkedToTrackId))
      )
      .map(c => c.id);
    return {
      blockTrackIds,
      wagonTracks: currentFullTracks.filter(t => blockTrackIds.includes(t.id)),
    };
  }

  return {
    blockTrackIds: [activeTrackId],
    wagonTracks: activeFullTrack ? [activeFullTrack] : null,
  };
}
