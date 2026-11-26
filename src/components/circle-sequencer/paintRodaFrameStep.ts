/**
 * paintRodaFrameStep.ts — Exécution d'une trame unifiée de la Roda (< 115 lignes) :
 * - `bgCanvas` statique (peau Alfaia + anneaux pointillés + noms à 12h hors fondu).
 * - `RodaMeasureLayerPool` (`[prev, curr, next]` + `toada`) composé sans baisse d'opacité Porter-Duff.
 * - Surbrillance légère (`drawActiveStepHitOverlay`) uniquement sur les 1–2 pas sous l'aiguille.
 */
import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { audioEngine } from '../../hooks/useAudioSync';
import { frozenPlaybackState } from '../../hooks/audio-sync/frozenPlaybackState';
import { getLiveVariationRodaSnapshots, syncLiveVariationRodaVisualFrame } from '../../hooks/audio-sync/liveVariationLookaheadEngine';
import { getRodaMeasureGeometry } from '../../utils/rodaTimeSigGeometry';
import { buildVisibleRodaSignature, resolveOrderedVisibleRodaTracks } from './resolveVisibleRodaTracks';
import { drawAlfaiaBackground } from './drawAlfaiaBackground';
import { buildRodaRingsLayerSignature, drawRodaRingsAndLabels } from './drawRodaRingsAndLabels';
import { computeMonotonicMeasureProgress, MonotonicProgressTracker } from './computeStickAngle';
import { invalidateRodaMeasureLayerPool, RodaMeasureLayerPool, syncRodaMeasureLayerPool } from './rodaMeasureLayerCache';
import { composeRodaMeasureLayers } from './composeRodaMeasureLayers';
import { drawActiveStepHitOverlay } from './drawActiveStepHitOverlay';
import { scheduleIdleRodaSpritePrewarm } from './rodaSpritePrewarmer';
import { LivePlaybackState } from './circleSequencerTypes';
import { drawMetronomeHalo, isMetronomeHaloAnimating, MetronomeHaloState } from './drawMetronomeHalo';
import { invalidateKaraokeLayerCache, KaraokeLayerCache, syncKaraokeOverlayLayer } from './rodaKaraokeLayer';

export interface RodaFrameRuntime {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D;
  bgCanvas: HTMLCanvasElement; bgCtx: CanvasRenderingContext2D | null;
  karaokeCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  measurePool: RodaMeasureLayerPool; haloState: MetronomeHaloState;
  karaokeCache: KaraokeLayerCache; progressTracker: MonotonicProgressTracker;
  isBgCached: boolean; lastBgSig: string; lastVisSig: string;
  stateRef: React.MutableRefObject<any>; livePlaybackRef: React.MutableRefObject<LivePlaybackState>;
  pendingTargetMeasureRef: React.MutableRefObject<number | null>;
  themeRef: React.MutableRefObject<any>; getLiveActivePatternId: (t: any) => number | null;
  activeVariationsRef?: React.MutableRefObject<{ [trackId: number]: any }>;
  clearStepCaches: () => void; scheduleIdleRedraw: () => void;
}

export function resolveCanvasTargetPx(isMobileFlag: boolean): number {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  return isMobileFlag || w <= 768 ? 600 : (w <= 1024 ? 960 : 1200);
}

export function executePaintRodaFrame(rt: RodaFrameRuntime, ctxTime: number): void {
  const { canvas, ctx, bgCanvas, bgCtx, measurePool, haloState, karaokeCache, progressTracker } = rt;
  const storeSt = useSequencerStore.getState(), isEco = Boolean(storeSt.isEcoMode), stCur = rt.stateRef.current;
  const isMobileDevice = Boolean(stCur.isMobile || (typeof window !== 'undefined' && window.innerWidth <= 768));
  const targetPx = resolveCanvasTargetPx(isMobileDevice);

  if (canvas.width !== targetPx || canvas.height !== targetPx || bgCanvas.width !== targetPx || bgCanvas.height !== targetPx) {
    canvas.width = targetPx; canvas.height = targetPx; bgCanvas.width = targetPx; bgCanvas.height = targetPx;
    rt.isBgCached = false; rt.lastBgSig = ''; invalidateKaraokeLayerCache(karaokeCache); invalidateRodaMeasureLayerPool(measurePool);
  }

  const scaleFactor = canvas.width / 1200, live = rt.livePlaybackRef.current, theme = rt.themeRef.current;
  const liveRawTracks = stCur.explicitTracks ?? storeSt.tracks;
  const liveRodaOrder = stCur.explicitRodaTrackOrder ?? storeSt.rodaTrackOrder;
  const isCurrentlyPlaying = Boolean(stCur.isPlaying || audioEngine?.getIsPlaying());
  const isPlayingGrid = Boolean(isCurrentlyPlaying && (live as any)?.isPlaying !== false && !live?.isPreRoll && live.step >= 0);
  const isFrozen = !isPlayingGrid && frozenPlaybackState.active, isPlayheadActive = isPlayingGrid || isFrozen;

  const measureIdx = isFrozen ? frozenPlaybackState.measure : isPlayingGrid ? live.measure : (rt.pendingTargetMeasureRef.current ?? stCur.currentMeasure);
  const localTimeSig = stCur.measureTimeSigs?.[measureIdx] || stCur.timeSig || '4/4';
  const localTicks = getRodaMeasureGeometry(localTimeSig).maxTicks;
  const interpRatio = computeMonotonicMeasureProgress(live, isCurrentlyPlaying, ctxTime, progressTracker);
  const playheadRatio = isFrozen ? frozenPlaybackState.progress : (isPlayingGrid ? interpRatio : -1);

  syncLiveVariationRodaVisualFrame(isPlayheadActive, measureIdx, Math.max(0, playheadRatio), rt.activeVariationsRef, isPlayingGrid ? (live?.measureSeqId ?? 0) : 0);

  const totalM = storeSt.totalMeasures || 1;
  const atEnd = storeSt.isLoopRegionActive && storeSt.loopEndMeasure !== null && measureIdx === storeSt.loopEndMeasure && !storeSt.isLoopExitRequested;
  const nextMeasureIdx = storeSt.queuedMeasure ?? (atEnd ? (storeSt.loopStartMeasure ?? 0) : (measureIdx + 1) % totalM);
  const snaps = getLiveVariationRodaSnapshots(nextMeasureIdx);

  const activeVisibleTracks = resolveOrderedVisibleRodaTracks(liveRawTracks, {
    ...(stCur.rodaFilterProps || {}), isMobile: isMobileDevice,
    showLinkedTracksOnRoda: stCur.explicitShowLinkedTracksOnRoda ?? storeSt.showLinkedTracksOnRoda,
  }, liveRodaOrder);
  const visSig = buildVisibleRodaSignature(activeVisibleTracks), isHeavyDisabled = isEco || isMobileDevice;
  if (rt.lastVisSig !== visSig) {
    rt.lastVisSig = visSig; rt.clearStepCaches();
    scheduleIdleRodaSpritePrewarm(activeVisibleTracks, liveRawTracks, Boolean(stCur.isLeftHanded), stCur.timeSig, stCur.measureTimeSigs);
  }

  const soloId = stCur.soloPatternPlayId ?? null, soloVarId = stCur.soloPatternVariationId ?? null;
  const currVarMap = snaps.currentStepsByTrackId || rt.activeVariationsRef?.current;
  const ringsSig = buildRodaRingsLayerSignature(activeVisibleTracks, liveRawTracks, measureIdx, localTimeSig, soloId, soloVarId, currVarMap, isPlayheadActive, isEco, rt.getLiveActivePatternId);
  const nextBgSig = `${localTimeSig}_${localTicks}_${Boolean(theme.isDark)}_${isHeavyDisabled}_${ringsSig}`;
  if (rt.lastBgSig !== nextBgSig) { rt.isBgCached = false; rt.lastBgSig = nextBgSig; }

  if (!rt.isBgCached && bgCtx) {
    bgCtx.setTransform(1, 0, 0, 1, 0, 0); bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    bgCtx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    drawAlfaiaBackground(bgCtx, 1200, localTimeSig, localTicks, 600, 600, theme, isHeavyDisabled);
    drawRodaRingsAndLabels(bgCtx, activeVisibleTracks, liveRawTracks, measureIdx, localTimeSig, soloId, soloVarId, currVarMap, isPlayheadActive, isEco, 600, 600, theme.skinBorder, theme.skinInk, rt.getLiveActivePatternId);
    rt.isBgCached = true;
  }

  const nVis = activeVisibleTracks.length, dynamicScale = nVis === 0 ? 1 : (nVis <= 2 ? 1.95 : 1 + ((10 - Math.min(nVis, 10)) * 0.08));
  syncRodaMeasureLayerPool({
    pool: measurePool, targetPx, measureIdx, nextMeasureIdx, prevMeasureIdx: snaps.prevMeasureIdx, hasPrevMeasure: snaps.hasPrevMeasure,
    isPlayheadActive, playheadRatio, visibleTracks: activeVisibleTracks, rawTracks: liveRawTracks, visSig, dynamicScale, isEco,
    themeBorder: theme.skinBorder, themeWood: theme.skinWood, themeText: theme.skinInk, isDark: Boolean(theme.isDark),
    getLiveActivePatternId: rt.getLiveActivePatternId, livePlaybackRef: rt.livePlaybackRef, stateVal: stCur, pendingTargetMeasureRef: rt.pendingTargetMeasureRef, activeVariationsRef: rt.activeVariationsRef,
  });

  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1.0; ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgCanvas, 0, 0, canvas.width, canvas.height);

  const nextSig = stCur.measureTimeSigs?.[nextMeasureIdx] || stCur.timeSig || '4/4';
  const prevSig = snaps.prevMeasureIdx !== null ? (stCur.measureTimeSigs?.[snaps.prevMeasureIdx] || stCur.timeSig || '4/4') : localTimeSig;
  composeRodaMeasureLayers({
    ctx, canvasPx: canvas.width, scaleFactor, pool: measurePool, isPlayheadActive, playheadRatio,
    rodaSweepMode: storeSt.rodaSweepMode || 'sweep6h', measureIdx, nextMeasureIdx, prevMeasureIdx: snaps.prevMeasureIdx, hasPrevMeasure: snaps.hasPrevMeasure,
    currTimeSig: localTimeSig, nextTimeSig: nextSig, prevTimeSig: prevSig, visibleTracks: activeVisibleTracks, rawTracks: liveRawTracks,
    dynamicScale, isEco, isLeftHanded: Boolean(stCur.isLeftHanded), soloId, themeWood: theme.skinWood, themeBorder: theme.skinBorder, themeText: theme.skinInk, activeVariationsRef: rt.activeVariationsRef,
  });

  ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
  if (isPlayheadActive) {
    drawActiveStepHitOverlay({
      ctx, visibleTracks: activeVisibleTracks, rawTracks: liveRawTracks, measureIdx, nextMeasureIdx,
      activeTimeSig: localTimeSig, playheadRatio, dynamicScale, isEco, isLeftHanded: Boolean(stCur.isLeftHanded),
      soloId, themeWood: theme.skinWood, themeBorder: theme.skinBorder, themeText: theme.skinInk, activeVariationsRef: rt.activeVariationsRef,
    });
  }
  drawMetronomeHalo(ctx, 600, 600, live, isCurrentlyPlaying, localTimeSig, ctxTime, Boolean(theme.isDark), isEco, haloState);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  syncKaraokeOverlayLayer(rt.karaokeCanvasRef.current, targetPx, isCurrentlyPlaying, localTicks, live, { ...stCur, tracks: activeVisibleTracks, rawTracks: liveRawTracks }, dynamicScale, isHeavyDisabled, karaokeCache);
  if (!isCurrentlyPlaying && isMetronomeHaloAnimating(haloState)) rt.scheduleIdleRedraw();
}
