/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OverlayCacheState } from './circleSequencerTypes';
import { resolveOverlaySignalAndMarker } from './resolveOverlaySignal';
import { applyOverlayDom } from './applyOverlayDom';

export function createOverlayUpdater(
  centerOverlayRef: React.RefObject<HTMLDivElement | null>,
  centerAfficheurRef: React.RefObject<HTMLDivElement | null>,
  centerOverlayImgRef: React.RefObject<HTMLImageElement | null>,
  centerOverlayTintRef: React.RefObject<HTMLDivElement | null>,
  centerOverlayTextRef: React.RefObject<HTMLSpanElement | null>,
  lastOverlayStateRef: React.MutableRefObject<OverlayCacheState>,
  lastOverlayTextRef: React.MutableRefObject<string>,
  stateRef: React.MutableRefObject<any>
) {
  return function updateOverlay(
    expandedMeasureIdx: number,
    baseMeasureIdx: number,
    currentBeat: number = 0,
    isPreRoll: boolean = false,
    preRollMeasureIndex: number = 0,
    preRollTotalMeasures: number = 1
  ): void {
    const container = centerOverlayRef.current;
    if (!container) return;

    if (stateRef.current.isLetraActive) {
      if (lastOverlayStateRef.current.opacity !== '0') {
        container.style.opacity = '0';
        lastOverlayStateRef.current.opacity = '0';
      }
      return;
    }

    const {
      measureSignals: currentMeasureSignals,
      rhythmSignals: currentRhythmSignals,
      mestreSignals: currentMestreSignals,
      songMarkers: currentSongMarkers,
      measureTimeSigs: currentMeasureTimeSigs,
      timeSig: defaultTimeSig,
    } = stateRef.current;

    const { activeSig, activeMarker } = resolveOverlaySignalAndMarker(
      expandedMeasureIdx,
      baseMeasureIdx,
      isPreRoll,
      preRollMeasureIndex,
      preRollTotalMeasures,
      currentMeasureSignals,
      currentRhythmSignals,
      currentMestreSignals,
      currentSongMarkers
    );

    const afficheurEl = centerAfficheurRef.current;
    const imgEl = centerOverlayImgRef.current;
    const tintEl = centerOverlayTintRef.current;
    const textEl = centerOverlayTextRef.current;

    if (!afficheurEl || !imgEl || !tintEl || !textEl) return;

    applyOverlayDom(
      container,
      afficheurEl,
      imgEl,
      tintEl,
      textEl,
      lastOverlayStateRef.current,
      lastOverlayTextRef,
      activeSig,
      activeMarker,
      isPreRoll,
      currentBeat,
      baseMeasureIdx,
      currentMeasureTimeSigs,
      defaultTimeSig
    );
  };
}
