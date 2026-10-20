/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackGroup, InstrumentConfig } from '../../types';
import { instrumentsConfig, isDarkText, getVisualStrokeSymbol } from '../../data';
import { getBusNoteColor } from '../../utils/colorHelpers';

export interface SatelliteItem {
  color: string;
  text: string;
  isDark: boolean;
  childInstId: string;
  childState: string | number | [string, string];
}

export function resolveSatellites(
  track: TrackGroup,
  stepIdx: number,
  measureIdx: number,
  rawTracks: TrackGroup[],
  activeVariationsRef?: React.MutableRefObject<{ [trackId: number]: any }>,
  localLeftHanded: boolean = false
): SatelliteItem[] {
  const satellites: SatelliteItem[] = [];
  if (!track.isLinkFolder) return satellites;

  const children = rawTracks.filter(
    (t: any) => String(t.linkedToTrackId) === String(track.id) && !t.isBusFolder && !t.isLinkMaster
  );

  children.forEach((c: any) => {
    const override = c.patternOverrides?.[measureIdx];
    if (override !== undefined && override !== null) {
      const childPattern = track.patterns.find((p: any) => p.id === override);
      if (childPattern) {
        const childActivePlayingSteps = activeVariationsRef?.current
          ? (activeVariationsRef.current[c.id] || childPattern.activeSteps)
          : childPattern.activeSteps;
        const childState = childActivePlayingSteps[stepIdx] || 0;
        if (childState !== 0 && childState !== '') {
          const childInst = instrumentsConfig[c.instrumentIdx];
          if (childInst) {
            const childVisualState = getVisualStrokeSymbol(childState, localLeftHanded, childInst.id);
            if (childVisualState !== 0) {
              const primaryChildVisual = Array.isArray(childVisualState) ? childVisualState[0] : childVisualState;
              const childColor = (childInst.colors && childInst.colors[primaryChildVisual as string]) || childInst.color || '#fff';
              const childText = String(primaryChildVisual);
              satellites.push({
                color: childColor,
                text: childText,
                isDark: isDarkText(childInst.id, String(Array.isArray(childState) ? childState[0] : childState)),
                childInstId: childInst.id,
                childState: childState,
              });
            }
          }
        }
      }
    }
  });

  return satellites;
}

export function formatStrokeSymbol(instId: string, stateStr: string): string {
  if (instId === 'mineiro') {
    if (stateStr.toLowerCase() === 'p') return '↑';
    if (stateStr.toLowerCase() === 't') return '↓';
  } else if (instId === 'agbe') {
    if (stateStr.toLowerCase() === 'e') return '←';
    if (stateStr.toLowerCase() === 'd') return '→';
    if (stateStr.toLowerCase() === 's') return '↑';
    if (stateStr.toLowerCase() === 'v') return '↓';
  }
  return stateStr;
}
