import { useEffect, useRef } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { usePerformanceStore } from '../../stores/usePerformanceStore';
import { audioEngine } from '../../hooks/useAudioSync';
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
import { createMetronomeHaloState, drawMetronomeHalo } from './drawMetronomeHalo';
import { isDetailEditorOpen } from '../controls/vuMeterTicker';

export function useCirclePlayheadRaf(
  canvasRef: React.RefObject<HTMLCanvasElement | null>, isActive: boolean, stateRef: React.MutableRefObject<any>,
  livePlaybackRef: React.MutableRefObject<LivePlaybackState>, frozenStickAngleRef: React.MutableRefObject<number>,
  pendingTargetMeasureRef: React.MutableRefObject<number | null>, getLiveActivePatternId: (t: any) => number | null,
  activeVariationsRef?: React.MutableRefObject<{ [trackId: number]: any }>
) {
  const visibleRef = useRef(isActive), loopRunningRef = useRef(false);
  const drawLoopRef = useRef<() => void>(() => {}), themeRef = useThemeColors();

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
    bgCanvas.width = 1200; bgCanvas.height = 1200;
    const bgCtx = bgCanvas.getContext('2d');

    let isBgCached = false, lastTimeSig = '', lastTicks = -1, lastThemeDark: boolean | undefined = undefined;
    let animId: number, ripples: Ripple[] = [];
    const haloState = createMetronomeHaloState();
    let lastDrawTime = performance.now();

    const drawLoop = () => {
      if (isDetailEditorOpen()) { animId = requestAnimationFrame(drawLoop); return; }
      if (!visibleRef.current) { loopRunningRef.current = false; return; }

      const time = performance.now();
      const seqState = useSequencerStore.getState();
      const isEco = seqState.ecoConfig?.disableAnimations ?? seqState.isEcoMode;
      const isMobileDevice = Boolean(stateRef.current.isMobile || (typeof window !== 'undefined' && window.innerWidth <= 768));
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      const effectiveDpr = isMobileDevice ? 1 : Math.min(dpr, 2);
      const targetPx = Math.round(1200 * effectiveDpr);

      if (canvas.width !== targetPx || canvas.height !== targetPx) {
        canvas.width = targetPx; canvas.height = targetPx;
        bgCanvas.width = targetPx; bgCanvas.height = targetPx;
        isBgCached = false;
      }

      if (isEco && time - lastDrawTime < 33) { animId = requestAnimationFrame(drawLoop); return; }
      lastDrawTime = time;

      const scaleFactor = canvas.width / 1200;
      const { tracks, rawTracks: localRawTracks, rodaTrackOrder: localRodaOrder, isPlaying: localPlaying, timeSig: localTimeSig, hitTriggersRef } = stateRef.current;
      const live = livePlaybackRef.current, localTicks = live.maxTicks || 96, theme = themeRef.current;
      const sortedTracks = sortTracksByRodaOrder(tracks, localRodaOrder);
      const activeVisibleTracks = sortedTracks.filter(t => !t.isHidden && t.instrumentIdx !== undefined);
      const isHeavyDisabled = isEco || isMobileDevice;

      if (hitTriggersRef?.current && !isHeavyDisabled) {
        processHitTriggers(hitTriggersRef.current, localRawTracks, activeVisibleTracks, getLiveActivePatternId, theme.skinInk, ripples);
      }

      if (lastTimeSig !== localTimeSig || lastTicks !== localTicks || lastThemeDark !== theme.isDark) {
        isBgCached = false; lastTimeSig = localTimeSig; lastTicks = localTicks; lastThemeDark = theme.isDark;
      }

      if (!isBgCached && bgCtx) {
        bgCtx.setTransform(1, 0, 0, 1, 0, 0);
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        bgCtx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
        drawAlfaiaBackground(bgCtx, 1200, localTimeSig, localTicks, 600, 600, theme);
        isBgCached = true;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bgCanvas, 0, 0, canvas.width, canvas.height);

      ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
      const isCurrentlyPlaying = localPlaying || (audioEngine ? audioEngine.getIsPlaying() : false);
      const stickAngle = computeStickAngle(live, isCurrentlyPlaying, getAudioTime(), isEco, usePerformanceStore.getState().disablePlayheadRAF, frozenStickAngleRef);
      const dynamicScale = activeVisibleTracks.length <= 2 ? 1.95 : (activeVisibleTracks.length > 0 ? 1 + ((10 - Math.min(activeVisibleTracks.length, 10)) * 0.08) : 1);

      drawAndUpdateRipples(ctx, ripples);
      renderTrackStepLayer(ctx, activeVisibleTracks, localRawTracks, theme.skinBorder, theme.skinWood, theme.skinInk, getLiveActivePatternId, livePlaybackRef, stateRef.current, pendingTargetMeasureRef, activeVariationsRef, dynamicScale, isEco, 600, 600);
      drawDrumstickNeedle(ctx, 600, 600, stickAngle, activeVisibleTracks, theme.skinWood, theme.skinBorder, isHeavyDisabled);
      drawMetronomeHalo(ctx, 600, 600, live, isCurrentlyPlaying, localTimeSig, getAudioTime(), Boolean(theme.isDark), isEco, haloState);

      if (stateRef.current.isLetraActive) {
        drawCenterKaraoke(ctx, 600, 600, live, stateRef.current.tracks, stateRef.current.rawTracks, stateRef.current.totalMeasures, stateRef.current.isLoopRegionActive, stateRef.current.loopStartMeasure, stateRef.current.loopEndMeasure, stateRef.current.soloPatternPlayId, dynamicScale, stateRef.current.timeSig, stateRef.current.measureTimeSigs);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      animId = requestAnimationFrame(drawLoop);
    };

    drawLoopRef.current = drawLoop;
    if (visibleRef.current) { loopRunningRef.current = true; drawLoop(); }
    return () => { cancelAnimationFrame(animId); loopRunningRef.current = false; };
  }, []);
}
