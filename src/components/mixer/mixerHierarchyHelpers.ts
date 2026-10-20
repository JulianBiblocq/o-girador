import { TrackGroup } from '../../types';
import { TrackMeta } from '../../stores/useSequencerStore';
import { getTopParentBusId } from '../../utils/colorHelpers';

export const getTrackGroupKey = (
  t: TrackGroup | TrackMeta | null | undefined,
  allTracks: (TrackGroup | TrackMeta)[]
): string | null => {
  if (!t) return null;
  const topBus = getTopParentBusId(t, allTracks as any);
  if (topBus) return topBus;
  if (t.isLinkFolder) return String(t.id);
  if (t.linkedToTrackId) return String(t.linkedToTrackId);
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

  const linkGroupId = track.isLinkFolder
    ? String(track.id)
    : (track.linkedToTrackId ? String(track.linkedToTrackId) : null);

  const prevLinkGroupId = prevTrack
    ? (prevTrack.isLinkFolder
        ? String(prevTrack.id)
        : (prevTrack.linkedToTrackId ? String(prevTrack.linkedToTrackId) : null))
    : null;

  const nextLinkGroupId = nextTrack
    ? (nextTrack.isLinkFolder
        ? String(nextTrack.id)
        : (nextTrack.linkedToTrackId ? String(nextTrack.linkedToTrackId) : null))
    : null;

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
