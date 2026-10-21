import React from 'react';
import { CSS } from '@dnd-kit/utilities';
import { TrackGroup } from '../../../types';
import { TrackMeta } from '../../../stores/useSequencerStore';
import { instrumentsConfig } from '../../../data';
import { getBusColor, getContrastColor, getTopParentBusId } from '../../../utils/colorHelpers';

export function computeChannelStripStyles({
  track,
  tracksMeta,
  inst,
  busPosition,
  linkPosition,
  isDragOver,
  transform,
  transition,
  activeWagonSize,
  isWagonMember,
  isDraggingWagon,
}: {
  track: TrackGroup | TrackMeta;
  tracksMeta: TrackMeta[];
  inst: any;
  busPosition: 'first' | 'middle' | 'last' | 'none';
  linkPosition: 'first' | 'middle' | 'last' | 'none';
  isDragOver: boolean;
  transform: any;
  transition: any;
  activeWagonSize: number;
  isWagonMember: boolean;
  isDraggingWagon: boolean;
}) {
  const isInsideBusBlock = busPosition === 'first' || busPosition === 'middle';
  const isInsideLinkBlock = linkPosition === 'first' || linkPosition === 'middle';
  const groupStyle: React.CSSProperties = {
    marginRight: (isInsideBusBlock || isInsideLinkBlock) ? '0px' : '16px',
  };

  const topBusId = getTopParentBusId(track, tracksMeta);
  const borderWidth = isDragOver ? '5px' : '3px';

  if (busPosition !== 'none' && topBusId) {
    const busColor = getBusColor(topBusId, tracksMeta, instrumentsConfig);
    if (isDragOver) {
      groupStyle.backgroundColor = `color-mix(in srgb, var(--cordel-bg) 82%, ${busColor} 18%)`;
      groupStyle.boxShadow = `0 0 22px ${busColor}77, inset 0 0 15px ${busColor}22`;
    }
    groupStyle.borderTop = `${borderWidth} solid ${busColor}`;
    groupStyle.borderBottom = `${borderWidth} solid ${busColor}`;
    if (busPosition === 'first') {
      groupStyle.borderLeft = `${borderWidth} solid ${busColor}`;
      groupStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
    } else if (busPosition === 'middle') {
      groupStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
      groupStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
    } else if (busPosition === 'last') {
      groupStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
      groupStyle.borderRight = `${borderWidth} solid ${busColor}`;
    }
  }

  const linkColor = track.isLinkFolder
    ? getBusColor(String(track.id), tracksMeta, instrumentsConfig)
    : (track.linkedToTrackId
        ? getBusColor(String(track.linkedToTrackId), tracksMeta, instrumentsConfig)
        : (inst?.color || '#8b2a1a'));

  const linkBorderWidth = isDragOver ? '4px' : '2.5px';
  const linkStyle: React.CSSProperties = {
    position: 'absolute',
    top: '3px',
    bottom: '3px',
    left: '3px',
    right: '3px',
    pointerEvents: 'none',
    zIndex: 2,
    borderTop: `${linkBorderWidth} solid ${linkColor}`,
    borderBottom: `${linkBorderWidth} solid ${linkColor}`,
  };

  if (linkPosition === 'first') {
    linkStyle.borderLeft = `${linkBorderWidth} solid ${linkColor}`;
    linkStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
  } else if (linkPosition === 'middle') {
    linkStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
    linkStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
  } else if (linkPosition === 'last') {
    linkStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
    linkStyle.borderRight = `${linkBorderWidth} solid ${linkColor}`;
  } else if (linkPosition === 'none' && (!track.isBusFolder || track.isLinkFolder)) {
    linkStyle.borderLeft = `${linkBorderWidth} solid ${linkColor}`;
    linkStyle.borderRight = `${linkBorderWidth} solid ${linkColor}`;
  }

  const faderColor = track.isLinkFolder
    ? getBusColor(String(track.id), tracksMeta, instrumentsConfig)
    : (inst?.color || '#8b2a1a');

  const faderTextColor = getContrastColor(faderColor);
  const hasOuterBorder = busPosition === 'none';
  const hasGroupBorder = busPosition !== 'none' && (track.isBusFolder || track.isLinkFolder || !!track.busId);
  const borderThicknessTop = (hasOuterBorder || hasGroupBorder) ? (isDragOver ? 5 : 3) : 0;
  const borderThicknessBottom = (hasOuterBorder || hasGroupBorder) ? (isDragOver ? 5 : 3) : 0;
  const paddingTop = Math.max(0, 3 - borderThicknessTop);
  const paddingBottom = Math.max(0, 3 - borderThicknessBottom);

  const style: React.CSSProperties = {
    transform: transform ? (
      activeWagonSize > 1 && !isWagonMember
        ? CSS.Transform.toString({ ...transform, x: transform.x * activeWagonSize })
        : CSS.Transform.toString(transform)
    ) : undefined,
    transition,
    opacity: isWagonMember && isDraggingWagon ? 0.25 : undefined,
  };

  return {
    groupStyle,
    linkStyle,
    faderColor,
    faderTextColor,
    paddingTop,
    paddingBottom,
    style,
  };
}
