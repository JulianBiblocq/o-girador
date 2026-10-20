/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentConfig, TrackGroup } from '../../types';
import { getVisualStrokeSymbol, isDarkText } from '../../data';
import { getBusNoteColor } from '../../utils/colorHelpers';
import { SatelliteItem, formatStrokeSymbol } from './percussionSatelliteHelpers';

export interface StepPastilleData {
  hasEvent: boolean;
  isSplit: boolean;
  isRightHalfOnly: boolean;
  leftFillColor: string;
  rightFillColor: string;
  leftText: string;
  rightText: string;
  leftTxtColor: string;
  rightTxtColor: string;
  radiusSize: number;
}

export function resolveStepPastilleData(
  masterState: any,
  satellites: SatelliteItem[],
  currentInst: InstrumentConfig,
  track: TrackGroup,
  localRawTracks: TrackGroup[],
  instrumentsConfig: any,
  localLeftHanded: boolean,
  dynamicScale: number
): StepPastilleData {
  const hasMasterEvent = masterState !== 0 && masterState !== '0' && masterState !== '' && masterState !== undefined && masterState !== null;
  const hasVariationEvent = satellites.length > 0;

  if (!hasMasterEvent && !hasVariationEvent) {
    return {
      hasEvent: false,
      isSplit: false,
      isRightHalfOnly: false,
      leftFillColor: '',
      rightFillColor: '',
      leftText: '',
      rightText: '',
      leftTxtColor: '',
      rightTxtColor: '',
      radiusSize: 6 * dynamicScale,
    };
  }

  let masterText = '';
  let masterFillColor = 'rgba(255,255,255,0.2)';
  let masterTxtColor = '#f4ecd8';
  let masterRadiusSize = 12 * dynamicScale;

  if (hasMasterEvent) {
    const visualState = getVisualStrokeSymbol(masterState, localLeftHanded, currentInst.id);
    const visualStateStr = String(visualState);
    if (visualState !== 0 && visualState !== '0') {
      const isAccent = visualStateStr === visualStateStr.toUpperCase();
      masterRadiusSize = (isAccent ? 15 : 12) * dynamicScale;
      const primaryVisual = Array.isArray(visualState) ? visualState[0] : visualState;
      masterFillColor = track.isLinkFolder
        ? getBusNoteColor(String(track.id), String(primaryVisual), localRawTracks, instrumentsConfig)
        : ((currentInst.colors && currentInst.colors[primaryVisual as string]) ? currentInst.colors[primaryVisual as string] : '#fff');
      masterText = formatStrokeSymbol(currentInst.id, visualStateStr);
      masterTxtColor = isDarkText(currentInst.id, String(masterState)) ? '#1a1a1a' : '#f4ecd8';
    } else if (visualStateStr === '0' || visualStateStr === '-') {
      masterRadiusSize = 12 * dynamicScale;
      masterFillColor = '#ab5318';
      masterText = '-';
      masterTxtColor = '#1a1a1a';
    }
  }

  if (hasMasterEvent && hasVariationEvent) {
    const sat = satellites[0];
    return {
      hasEvent: true,
      isSplit: true,
      isRightHalfOnly: false,
      leftFillColor: masterFillColor,
      rightFillColor: sat.color,
      leftText: masterText,
      rightText: sat.text,
      leftTxtColor: masterTxtColor,
      rightTxtColor: sat.isDark ? '#1a1a1a' : '#f4ecd8',
      radiusSize: masterRadiusSize,
    };
  }

  if (!hasMasterEvent && hasVariationEvent) {
    if (satellites.length >= 2) {
      return {
        hasEvent: true,
        isSplit: true,
        isRightHalfOnly: false,
        leftFillColor: satellites[0].color,
        rightFillColor: satellites[1].color,
        leftText: satellites[0].text,
        rightText: satellites[1].text,
        leftTxtColor: satellites[0].isDark ? '#1a1a1a' : '#f4ecd8',
        rightTxtColor: satellites[1].isDark ? '#1a1a1a' : '#f4ecd8',
        radiusSize: 12 * dynamicScale,
      };
    }
    const singleSat = satellites[0];
    return {
      hasEvent: true,
      isSplit: false,
      isRightHalfOnly: true,
      leftFillColor: '',
      rightFillColor: singleSat.color,
      leftText: '',
      rightText: singleSat.text,
      leftTxtColor: '',
      rightTxtColor: singleSat.isDark ? '#1a1a1a' : '#f4ecd8',
      radiusSize: 12 * dynamicScale,
    };
  }

  return {
    hasEvent: true,
    isSplit: false,
    isRightHalfOnly: false,
    leftFillColor: masterFillColor,
    rightFillColor: '',
    leftText: masterText,
    rightText: '',
    leftTxtColor: masterTxtColor,
    rightTxtColor: '',
    radiusSize: masterRadiusSize,
  };
}
