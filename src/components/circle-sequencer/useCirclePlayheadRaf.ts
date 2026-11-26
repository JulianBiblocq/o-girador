import React, { useEffect, useRef } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { audioEngine } from '../../hooks/useAudioSync';
import { getRodaMeasureGeometry } from '../../utils/rodaTimeSigGeometry';
import { buildVisibleRodaSignature, resolveOrderedVisibleRodaTracks } from './resolveVisibleRodaTracks';
import { drawAlfaiaBackground } from './drawAlfaiaBackground';
import { computeMonotonicMeasureProgress, createMonotonicProgressTracker } from './computeStickAngle';
import { renderTrackStepLayer } from './renderTrackStepLayer';
import { useThemeColors } from './useThemeColors';
import { getAudioTime } from './circleAudioTime';
import { LivePlaybackState } from './circleSequencerTypes';
import { createMetronomeHaloState, drawMetronomeHalo, isMetronomeHaloAnimating } from './drawMetronomeHalo';
import { createKaraokeLayerCache, invalidateKaraokeLayerCache, syncKaraokeOverlayLayer } from './rodaKaraokeLayer';
import { clearRodaTrackFrameCache } from './rodaTrackFrameCache';
import { clearRodaToadaTrackCache } from './rodaToadaTrackCache';
import { attachRodaIdleDirtyListeners } from './attachRodaIdleDirtyListeners';
import { isDetailEditorOpen } from '../controls/vuMeterTicker';

function resolveCanvasTargetPx(isMobileFlag: boolean): number {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  if (isMobileFlag || w <= 768) return 600;
  if (w <= 1024) return 960;
  return 1200;
}

export function useCirclePlayheadRaf(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  karaokeCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  isActive: boolean,
  stateRef: React.MutableRefObject<any>,
  livePlaybackRef: React.MutableRefObject<LivePlaybackState>,
  _frozenStickAngleRef: React.MutableRefObject<number>,
  pendingTargetMeasureRef: React.MutableRefObject<number | null>,
  getLiveActivePatternId: (t: any) => number | null,
  activeVariationsRef?: React.MutableRefObject<{ [trackId: number]: any }>
): () => void {
  const visibleRef = useRef(isActive);
  const requestRedrawRef = useRef<() => void>(() => {});
  const themeRef = useThemeColors(() => requestRedrawRef.current());

  useEffect(() => {
    visibleRef.current = isActive;
    if (isActive) requestRedrawRef.current();
  }, [isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgCanvas = document.createElement('canvas');
    const initPx = resolveCanvasTargetPx(Boolean(stateRef.current.isMobile));
    bgCanvas.width = initPx; bgCanvas.height = initPx;
    const bgCtx = bgCanvas.getContext('2d');

    let isBgCached = false, lastBgSig = '', lastVisSig = '', idleRafId: number | null = null;
    const haloState = createMetronomeHaloState(), karaokeCache = createKaraokeLayerCache();
    const progressTracker = createMonotonicProgressTracker();
    const clearStepCaches = () => { clearRodaTrackFrameCache(); clearRodaToadaTrackCache(); };

    const scheduleIdleRedraw = () => {
      if (!visibleRef.current || idleRafId !== null || typeof requestAnimationFrame !== 'function') return;
      idleRafId = requestAnimationFrame(() => { idleRafId = null; paintRodaFrame(getAudioTime()); });
    };

    const paintRodaFrame = (ctxTime: number) => {
      if (!visibleRef.current || isDetailEditorOpen()) return;
      const storeSt = useSequencerStore.getState(), isEco = Boolean(storeSt.isEcoMode);
      const isMobileDevice = Boolean(stateRef.current.isMobile || (typeof window !== 'undefined' && window.innerWidth <= 768));
      const targetPx = resolveCanvasTargetPx(isMobileDevice);

      if (canvas.width !== targetPx || canvas.height !== targetPx || bgCanvas.width !== targetPx || bgCanvas.height !== targetPx) {
        canvas.width = targetPx; canvas.height = targetPx; bgCanvas.width = targetPx; bgCanvas.height = targetPx;
        isBgCached = false; lastBgSig = ''; invalidateKaraokeLayerCache(karaokeCache);
      }

      const scaleFactor = canvas.width / 1200, stCur = stateRef.current;
      const liveRawTracks = stCur.explicitTracks ?? storeSt.tracks;
      const liveRodaOrder = stCur.explicitRodaTrackOrder ?? storeSt.rodaTrackOrder;
      const live = livePlaybackRef.current, theme = themeRef.current;
      const liveMeasureIdx = live && live.step >= 0 ? live.measure : (pendingTargetMeasureRef.current ?? stCur.currentMeasure);
      const localTimeSig = stCur.measureTimeSigs?.[liveMeasureIdx] || stCur.timeSig || '4/4';
      const localTicks = getRodaMeasureGeometry(localTimeSig).maxTicks;

      const activeVisibleTracks = resolveOrderedVisibleRodaTracks(liveRawTracks, {
        ...(stCur.rodaFilterProps || {}), isMobile: isMobileDevice,
        showLinkedTracksOnRoda: stCur.explicitShowLinkedTracksOnRoda ?? storeSt.showLinkedTracksOnRoda,
      }, liveRodaOrder);
      const visSig = buildVisibleRodaSignature(activeVisibleTracks), isHeavyDisabled = isEco || isMobileDevice;
      const nextBgSig = `${localTimeSig}_${localTicks}_${Boolean(theme.isDark)}_${isHeavyDisabled}_${visSig}`;

      if (lastBgSig !== nextBgSig) {
        isBgCached = false; lastBgSig = nextBgSig;
        if (lastVisSig !== visSig) { lastVisSig = visSig; clearStepCaches(); }
      }

      if (!isBgCached && bgCtx) {
        bgCtx.setTransform(1, 0, 0, 1, 0, 0); bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        bgCtx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
        drawAlfaiaBackground(bgCtx, 1200, localTimeSig, localTicks, 600, 600, theme, isHeavyDisabled);
        isBgCached = true;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1.0; ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bgCanvas, 0, 0, canvas.width, canvas.height);

      ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
      const isCurrentlyPlaying = Boolean(stCur.isPlaying || audioEngine?.getIsPlaying());
      const interpRatio = computeMonotonicMeasureProgress(live, isCurrentlyPlaying, ctxTime, progressTracker);
      const nVis = activeVisibleTracks.length;
      const dynamicScale = nVis === 0 ? 1 : (nVis <= 2 ? 1.95 : 1 + ((10 - Math.min(nVis, 10)) * 0.08));

      renderTrackStepLayer(ctx, activeVisibleTracks, liveRawTracks, theme.skinBorder, theme.skinWood, theme.skinInk, getLiveActivePatternId, livePlaybackRef, stCur, pendingTargetMeasureRef, activeVariationsRef, dynamicScale, isEco, 600, 600, interpRatio);
      drawMetronomeHalo(ctx, 600, 600, live, isCurrentlyPlaying, localTimeSig, ctxTime, Boolean(theme.isDark), isEco, haloState);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      syncKaraokeOverlayLayer(karaokeCanvasRef.current, targetPx, isCurrentlyPlaying, localTicks, live, { ...stCur, tracks: activeVisibleTracks, rawTracks: liveRawTracks }, dynamicScale, isHeavyDisabled, karaokeCache);
      if (!isCurrentlyPlaying && isMetronomeHaloAnimating(haloState)) scheduleIdleRedraw();
    };

    const invalidateAndRedraw = () => {
      isBgCached = false; lastBgSig = ''; clearStepCaches();
      invalidateKaraokeLayerCache(karaokeCache); scheduleIdleRedraw();
    };
    requestRedrawRef.current = invalidateAndRedraw;
    const detach = attachRodaIdleDirtyListeners(canvas, { paintRodaFrame, scheduleIdleRedraw, invalidateAndRedraw });
    if (visibleRef.current) paintRodaFrame(getAudioTime());

    return () => { if (idleRafId !== null) cancelAnimationFrame(idleRafId); detach(); };
  }, []);

  return () => requestRedrawRef.current();
}
