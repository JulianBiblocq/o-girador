import { instrumentsConfig } from '../../../data';
import { getEffectiveMuteState, isToadaBus, isToadaChild } from '../../../stores/useSequencerStore';
import { getInstrumentPrimaryStrongColor } from '../../../utils/colorHelpers';
import { isSlaveTrack } from '../../../utils/trackMasterResolver';
import {
  AUTO_LANE_COLLAPSED_HEIGHT,
  AUTO_LANE_EXPANDED_HEIGHT,
  TRACK_ROW_HEIGHT,
  TimelineRowLayout,
} from './timelineCanvasTypes';

export function buildTimelineRowLayouts(params: {
  trackIds: number[];
  tracksMeta: any[];
  expandedAutoIds: Set<number>;
  collapsedAutoLaneIds?: Set<number>;
}): { rowLayouts: TimelineRowLayout[]; totalTracksHeight: number } {
  const { trackIds, tracksMeta, expandedAutoIds, collapsedAutoLaneIds } = params;
  const rowLayouts: TimelineRowLayout[] = [];
  let currentTop = 0;

  for (let i = 0; i < trackIds.length; i++) {
    const trackId = trackIds[i];
    const trackIndex = tracksMeta.findIndex((t) => t.id === trackId);
    const trackMeta = trackIndex >= 0 ? tracksMeta[trackIndex] : null;
    if (!trackMeta) continue;

    const trackInst = instrumentsConfig[trackMeta.instrumentIdx] || instrumentsConfig[0];
    const isToada = Boolean(isToadaBus(trackMeta));
    const isToadaChildTrack = Boolean(isToadaChild(trackMeta, tracksMeta));
    const isLinkedSlave = Boolean(isSlaveTrack(trackMeta, tracksMeta) && !isToadaChildTrack);
    const isLinkFolder = Boolean(trackMeta.isLinkFolder && !trackMeta.isBusFolder);
    const isLinkMaster = Boolean(trackMeta.isLinkMaster && !trackMeta.isBusFolder && !isToadaChildTrack);

    const parentBusTrackId =
      isLinkedSlave || isLinkMaster
        ? tracksMeta.find((p) => String(p.id) === String(trackMeta.linkedToTrackId) && p.isLinkFolder)?.id
        : undefined;
    const masterTrackId = isLinkedSlave
      ? tracksMeta.find((t) => String(t.linkedToTrackId) === String(trackMeta.linkedToTrackId) && t.isLinkMaster)?.id
      : undefined;
    const slaveTrackIds = isLinkFolder
      ? tracksMeta
          .filter((t) => String(t.linkedToTrackId) === String(trackMeta.id) && !t.isBusFolder && !t.isLinkMaster)
          .map((t) => t.id)
      : undefined;

    const isAutomationOpen = expandedAutoIds.has(trackId);
    const isAutoCollapsed = Boolean(collapsedAutoLaneIds?.has(trackId));
    const autoHeight = isAutomationOpen
      ? isAutoCollapsed
        ? AUTO_LANE_COLLAPSED_HEIGHT
        : AUTO_LANE_EXPANDED_HEIGHT
      : 0;
    const height = TRACK_ROW_HEIGHT;
    const totalRowHeight = height + autoHeight;

    rowLayouts.push({
      trackId,
      trackIndex,
      top: currentTop,
      height,
      autoHeight,
      totalRowHeight,
      isAutomationOpen,
      isMuted: Boolean(getEffectiveMuteState(tracksMeta, trackId)),
      isToada,
      isLinkedSlave,
      isLinkFolder,
      isLinkMaster,
      parentBusTrackId,
      masterTrackId,
      slaveTrackIds,
      instMixerBg: getInstrumentPrimaryStrongColor(trackInst, trackMeta),
      instColors: (trackInst?.colors as Record<string, string>) || {},
    });

    currentTop += totalRowHeight;
  }

  return { rowLayouts, totalTracksHeight: currentTop };
}

