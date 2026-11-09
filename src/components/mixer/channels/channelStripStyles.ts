import React from 'react';
import { CSS } from '@dnd-kit/utilities';
import { TrackGroup } from '../../../types';
import { TrackMeta } from '../../../stores/useSequencerStore';
import { instrumentsConfig } from '../../../data';
import {
  getBusColor,
  getBusMemberColors,
  getContrastColor,
  getInstrumentPrimaryStrongColor,
  getRootLinkGroupId,
  getTopParentBusId,
} from '../../../utils/colorHelpers';

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
    marginRight: isInsideBusBlock || isInsideLinkBlock ? '0px' : '16px',
  };

  const topBusId = getTopParentBusId(track, tracksMeta);
  const rootLinkId = getRootLinkGroupId(track, tracksMeta);
  const effectiveGroupPos = busPosition !== 'none' ? busPosition : linkPosition;
  const effectiveGroupId = topBusId || rootLinkId;
  const borderWidth = isDragOver ? '5px' : '3px';

  if (effectiveGroupPos !== 'none' && effectiveGroupId) {
    const memberColors = getBusMemberColors(effectiveGroupId, tracksMeta, instrumentsConfig);
    const busColor = memberColors[0] || '#8b2a1a';
    const lastBusColor = memberColors[memberColors.length - 1] || busColor;
    if (isDragOver) {
      groupStyle.backgroundColor = `color-mix(in srgb, var(--cordel-bg) 82%, ${busColor} 18%)`;
      groupStyle.boxShadow = `0 0 22px ${busColor}77, inset 0 0 15px ${busColor}22`;
    }
    groupStyle.borderTop = `${borderWidth} solid ${busColor}`;
    groupStyle.borderBottom = `${borderWidth} solid ${lastBusColor}`;
    if (effectiveGroupPos === 'first') {
      groupStyle.borderLeft = `${borderWidth} solid ${busColor}`;
      groupStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
    } else if (effectiveGroupPos === 'middle') {
      groupStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
      groupStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
    } else if (effectiveGroupPos === 'last') {
      groupStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
      groupStyle.borderRight = `${borderWidth} solid ${lastBusColor}`;
    }
  }

  const ownInstrumentColor = getInstrumentPrimaryStrongColor(inst, track);
  const linkBorderWidth = isDragOver ? '4px' : '2.5px';
  const linkStyle: React.CSSProperties = {
    position: 'absolute',
    top: '3px',
    bottom: '3px',
    left: '3px',
    right: '3px',
    pointerEvents: 'none',
    zIndex: 2,
    border: `${linkBorderWidth} solid ${ownInstrumentColor}`,
  };

  const faderColor = (effectiveGroupId && (track.isBusFolder || track.isLinkFolder))
    ? getBusColor(effectiveGroupId, tracksMeta, instrumentsConfig)
    : ownInstrumentColor;

  const faderTextColor = getContrastColor(faderColor);
  const hasOuterBorder = effectiveGroupPos === 'none';
  const hasGroupBorder = effectiveGroupPos !== 'none';
  const borderThicknessTop = hasOuterBorder || hasGroupBorder ? (isDragOver ? 5 : 3) : 0;
  const borderThicknessBottom = hasOuterBorder || hasGroupBorder ? (isDragOver ? 5 : 3) : 0;
  const paddingTop = Math.max(0, 3 - borderThicknessTop);
  const paddingBottom = Math.max(0, 3 - borderThicknessBottom);

  const style: React.CSSProperties = {
    transform: transform
      ? activeWagonSize > 1 && !isWagonMember
        ? CSS.Transform.toString({ ...transform, x: transform.x * activeWagonSize })
        : CSS.Transform.toString(transform)
      : undefined,
    transition,
    opacity: isWagonMember && isDraggingWagon ? 0.25 : undefined,
  };

  return { groupStyle, linkStyle, faderColor, faderTextColor, paddingTop, paddingBottom, style };
}
