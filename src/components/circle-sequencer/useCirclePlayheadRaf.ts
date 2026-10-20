/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { usePerformanceStore } from '../../stores/usePerformanceStore';
import { audioEngine } from '../../hooks/useAudioSync';
import { getTone } from '../../ToneLoader';
import { sortTracksByRodaOrder } from './sortTracksByRodaOrder';
import { drawAlfaiaBackground } from './drawAlfaiaBackground';
import { computeStickAngle } from './computeStickAngle';
import { processHitTriggers, drawAndUpdateRipples } from './drawRipples';
import { renderTrackStepLayer } from './renderTrackStepLayer';
import { drawDrumstickNeedle } from './drawDrumstickNeedle';
import { drawCenterKaraoke } from './drawCenterKaraoke';
import { useThemeColors } from './useThemeColors';
import { getAudioTime } from './circleAudioTime';
import { Ripple, LivePlaybackState } from './circleSequencerTypes';


export function useCirclePlayheadRaf(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  isActive: boolean,
  stateRef: React.MutableRefObject<any>,
  livePlaybackRef: React.MutableRefObject<LivePlaybackState>,
  frozenStickAngleRef: React.MutableRefObject<number>,
  pendingTargetMeasureRef: React.MutableRefObject<number | null>,
  getLiveActivePatternId: (t: any) => number | null,
  activeVariationsRef?: React.MutableRefObject<{ [trackId: number]: any }>
) {
  const visibleRef = useRef(isActive);
  const loopRunningRef = useRef(false);
  const drawLoopRef = useRef<() => void>(() => {});
  const themeRef = useThemeColors();

  useEffect(() => {
    visibleRef.current = isActive;
    if (isActive && !loopRunningRef.current) {
      loopRunningRef.current = true;
      drawLoopRef.current();
    } else if (!isActive) {
      loopRunningRef.current = false;
    }
  }, [isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 1200;
    bgCanvas.height = 1200;
    const bgCtx = bgCanvas.getContext('2d');

    let currentCanvasSize = 1200;
    let isBgCached = false;
    let lastTimeSig = '';
    let lastTicks = -1;
    let animId: number;
    let ripples: Ripple[] = [];
    let lastDrawTime = performance.now();

    const drawLoop = () => {
      if ((window as any).oGiradorDetailEditorOpen) { animId = requestAnimationFrame(drawLoop); return; }
      if (!visibleRef.current) { loopRunningRef.current = false; return; }

      const time = performance.now();
      const seqState = useSequencerStore.getState();
      const isEco = seqState.ecoConfig?.disableAnimations ?? seqState.isEcoMode;
      const targetSize = isEco ? 600 : 1200;

      if (currentCanvasSize !== targetSize) {
        canvas.width = targetSize; canvas.height = targetSize;
        bgCanvas.width = targetSize; bgCanvas.height = targetSize;
        currentCanvasSize = targetSize; isBgCached = false;
      }
      if (isEco && time - lastDrawTime < 33) { animId = requestAnimationFrame(drawLoop); return; }
      lastDrawTime = time;

      const { tracks, rawTracks: localRawTracks, rodaTrackOrder: localRodaOrder, isPlaying: localPlaying, timeSig: localTimeSig, hitTriggersRef } = stateRef.current;
      const live = livePlaybackRef.current;
      const localTicks = live.maxTicks || 96;
      const theme = themeRef.current;

      const sortedTracks = sortTracksByRodaOrder(tracks, localRodaOrder);
      const activeVisibleTracks = sortedTracks.filter(t => !t.isHidden && t.instrumentIdx !== undefined);
      const isHeavyDisabled = isEco || stateRef.current.isMobile || (typeof window !== 'undefined' && window.innerWidth <= 768);

      if (hitTriggersRef?.current && !isHeavyDisabled) {
        processHitTriggers(hitTriggersRef.current, localRawTracks, activeVisibleTracks, getLiveActivePatternId, theme.themeText, ripples);
      }

      ctx.clearRect(0, 0, currentCanvasSize, currentCanvasSize);
      ctx.save();
      if (isEco) ctx.scale(0.5, 0.5);

      if (lastTimeSig !== localTimeSig || lastTicks !== localTicks) {
        isBgCached = false; lastTimeSig = localTimeSig; lastTicks = localTicks;
      }
      if (!isBgCached && bgCtx) {
        drawAlfaiaBackground(bgCtx, currentCanvasSize, isEco, localTimeSig, localTicks, 600, 600, theme);
        isBgCached = true;
      }

      ctx.restore();
      ctx.drawImage(bgCanvas, 0, 0);
      ctx.save();
      if (isEco) ctx.scale(0.5, 0.5);

      const isCurrentlyPlaying = localPlaying || (audioEngine ? audioEngine.getIsPlaying() : false);
      const stickAngle = computeStickAngle(live, isCurrentlyPlaying, getAudioTime(), isEco, usePerformanceStore.getState().disablePlayheadRAF, frozenStickAngleRef);
      const dynamicScale = activeVisibleTracks.length > 0 ? 1 + ((10 - Math.min(activeVisibleTracks.length, 10)) * 0.08) : 1;

      drawAndUpdateRipples(ctx, ripples);
      renderTrackStepLayer(ctx, activeVisibleTracks, localRawTracks, theme.themeBorder, theme.themeWood, theme.themeText, getLiveActivePatternId, livePlaybackRef, stateRef.current, pendingTargetMeasureRef, activeVariationsRef, dynamicScale, isEco, 600, 600);
      drawDrumstickNeedle(ctx, 600, 600, stickAngle, activeVisibleTracks, theme.themeWood, theme.themeBorder, isHeavyDisabled);

      if (stateRef.current.isLetraActive) {
        drawCenterKaraoke(ctx, 600, 600, live, stateRef.current.tracks, stateRef.current.rawTracks, stateRef.current.totalMeasures, stateRef.current.isLoopRegionActive, stateRef.current.loopStartMeasure, stateRef.current.loopEndMeasure, stateRef.current.soloPatternPlayId, dynamicScale, stateRef.current.timeSig, stateRef.current.measureTimeSigs);
      }

      ctx.restore();
      animId = requestAnimationFrame(drawLoop);
    };

    drawLoopRef.current = drawLoop;
    if (visibleRef.current) { loopRunningRef.current = true; drawLoop(); }
    return () => { cancelAnimationFrame(animId); loopRunningRef.current = false; };
  }, []);
}
