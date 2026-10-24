import { TrackGroup } from '../../types';
import { sanitizeRodaTrackOrder, applyRadii } from './trackRodaGeometryHelpers';
import { getTrackFamilyIds } from './trackMixerSelectors';

export const handleReorderRodaTracksState = (
  state: { tracks: TrackGroup[]; rodaTrackOrder: number[]; tracksVersion: number; [key: string]: any },
  activeId: number,
  overId: number
): Record<string, any> => {
  if (activeId === overId) return {};

  const currentOrder = sanitizeRodaTrackOrder(state.rodaTrackOrder, state.tracks);
  const activeTrack = state.tracks.find(t => t.id === activeId);
  const overTrack = state.tracks.find(t => t.id === overId);
  if (!activeTrack || !overTrack) return {};

  const activeFamilyIds = getTrackFamilyIds(activeId, state.tracks).map(Number);
  const overFamilyIds = getTrackFamilyIds(overId, state.tracks).map(Number);

  // Vérifier si activeId et overId appartiennent au même groupe soudé (>= 2 membres)
  const sameGroup = activeFamilyIds.length > 1 &&
    overFamilyIds.length > 1 &&
    activeFamilyIds.includes(overId);

  let nextOrder: number[];

  if (sameGroup) {
    // 1. Geste INTERNE : déplacement individuel au sein du même groupe
    const oldIndex = currentOrder.indexOf(activeId);
    const targetIndex = currentOrder.indexOf(overId);
    if (oldIndex === -1 || targetIndex === -1) return {};

    const filtered = currentOrder.filter(id => id !== activeId);
    const insertIdx = oldIndex < targetIndex
      ? filtered.indexOf(overId) + 1
      : filtered.indexOf(overId);

    nextOrder = [
      ...filtered.slice(0, insertIdx),
      activeId,
      ...filtered.slice(insertIdx)
    ];
  } else {
    // 2. Geste EXTERNE : déplacer tout le bloc soudé activeFamilyIds
    const activeBlockTracks = state.tracks.filter(t => activeFamilyIds.includes(t.id) && !t.isLinkFolder);
    const activeBlockIds = (activeBlockTracks.length > 1 ? activeBlockTracks.map(t => t.id) : [activeId])
      .sort((a, b) => currentOrder.indexOf(a) - currentOrder.indexOf(b));

    const remainingOrder = currentOrder.filter(id => !activeBlockIds.includes(id));
    const oldFirstIdx = currentOrder.indexOf(activeBlockIds[0]);

    // Ancrage cible pour ne jamais scinder overFamily
    const overBlockTracks = state.tracks.filter(t => overFamilyIds.includes(t.id) && !t.isLinkFolder);
    const overBlockIds = (overBlockTracks.length > 1 ? overBlockTracks.map(t => t.id) : [overId])
      .sort((a, b) => currentOrder.indexOf(a) - currentOrder.indexOf(b));

    const isDraggingDown = oldFirstIdx < currentOrder.indexOf(overId);
    const effectiveAnchorId = isDraggingDown
      ? overBlockIds[overBlockIds.length - 1]
      : overBlockIds[0];

    const anchorIdxInRemaining = remainingOrder.indexOf(effectiveAnchorId);
    if (anchorIdxInRemaining === -1) return {};

    const insertIdx = isDraggingDown ? anchorIdxInRemaining + 1 : anchorIdxInRemaining;

    nextOrder = [
      ...remainingOrder.slice(0, insertIdx),
      ...activeBlockIds,
      ...remainingOrder.slice(insertIdx)
    ];
  }

  return {
    rodaTrackOrder: nextOrder,
    tracks: applyRadii(state.tracks, nextOrder),
    tracksVersion: state.tracksVersion + 1
  };
};

export { handleReorderWagonState } from './trackReorderWagonHelper';
