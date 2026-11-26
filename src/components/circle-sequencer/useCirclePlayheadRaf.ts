import React, { useEffect, useRef } from 'react';
import { createMonotonicProgressTracker } from './computeStickAngle';
import { createRodaMeasureLayerPool, disposeRodaMeasureLayerPool, invalidateRodaMeasureLayerPool } from './rodaMeasureLayerCache';
import { cancelPendingRodaSpritePrewarm } from './rodaSpritePrewarmer';
import { executePaintRodaFrame, resolveCanvasTargetPx, RodaFrameRuntime } from './paintRodaFrameStep';
import { useThemeColors } from './useThemeColors';
import { getAudioTime } from './circleAudioTime';
import { LivePlaybackState } from './circleSequencerTypes';
import { createMetronomeHaloState } from './drawMetronomeHalo';
import { createKaraokeLayerCache, invalidateKaraokeLayerCache } from './rodaKaraokeLayer';
import { clearRodaTrackFrameCache } from './rodaTrackFrameCache';
import { clearRodaToadaTrackCache } from './rodaToadaTrackCache';
import { attachRodaIdleDirtyListeners } from './attachRodaIdleDirtyListeners';
import { isDetailEditorOpen } from '../controls/vuMeterTicker';

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
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const initPx = resolveCanvasTargetPx(Boolean(stateRef.current.isMobile));
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = initPx; bgCanvas.height = initPx;
    const bgCtx = bgCanvas.getContext('2d');
    const measurePool = createRodaMeasureLayerPool(initPx);
    let idleRafId: number | null = null;

    const clearStepCaches = () => {
      clearRodaTrackFrameCache();
      clearRodaToadaTrackCache();
      invalidateRodaMeasureLayerPool(measurePool);
    };

    const scheduleIdleRedraw = () => {
      if (!visibleRef.current || idleRafId !== null || typeof requestAnimationFrame !== 'function') return;
      idleRafId = requestAnimationFrame(() => { idleRafId = null; paintRodaFrame(getAudioTime()); });
    };

    const rt: RodaFrameRuntime = {
      canvas, ctx, bgCanvas, bgCtx, karaokeCanvasRef, measurePool,
      haloState: createMetronomeHaloState(), karaokeCache: createKaraokeLayerCache(),
      progressTracker: createMonotonicProgressTracker(),
      isBgCached: false, lastBgSig: '', lastVisSig: '',
      stateRef, livePlaybackRef, pendingTargetMeasureRef, themeRef,
      getLiveActivePatternId, activeVariationsRef, clearStepCaches, scheduleIdleRedraw,
    };

    const paintRodaFrame = (ctxTime: number) => {
      if (!visibleRef.current || isDetailEditorOpen()) return;
      executePaintRodaFrame(rt, ctxTime);
    };

    const invalidateAndRedraw = () => {
      rt.isBgCached = false; rt.lastBgSig = ''; clearStepCaches();
      invalidateKaraokeLayerCache(rt.karaokeCache); scheduleIdleRedraw();
    };
    requestRedrawRef.current = invalidateAndRedraw;
    const detach = attachRodaIdleDirtyListeners(canvas, { paintRodaFrame, scheduleIdleRedraw, invalidateAndRedraw });
    if (visibleRef.current) paintRodaFrame(getAudioTime());

    return () => {
      if (idleRafId !== null) cancelAnimationFrame(idleRafId);
      detach(); cancelPendingRodaSpritePrewarm();
      disposeRodaMeasureLayerPool(measurePool);
      bgCanvas.width = 0; bgCanvas.height = 0;
    };
  }, []);

  return () => requestRedrawRef.current();
}
