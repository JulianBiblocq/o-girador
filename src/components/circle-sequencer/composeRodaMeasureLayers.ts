/**
 * composeRodaMeasureLayers.ts — Composition sectorielle `ctx.clip()` sans perte d'opacité Porter-Duff (< 105 lignes).
 * - Mode `fullMeasure` ou frontière multi-signatures : 1 seul `drawImage(curr)`.
 * - Mode `sweep6h` iso-signature : `S_lead ⊔ S_wedge ⊔ S_trail` ; pas invariants peints 1 fois à `100 %` d'opacité.
 */
import { instrumentsConfig } from '../../data';
import { getLiveVariationRodaSnapshots } from '../../hooks/audio-sync/liveVariationLookaheadEngine';
import { getEffectiveMuteState, isToadaBus, useSequencerStore } from '../../stores/useSequencerStore';
import { TrackGroup } from '../../types';
import { getTrackRadius } from './circleGeometry';
import { drawPercussionTrack } from './drawPercussionTrack';
import { drawRodaSweepWave } from './drawRodaSweepWave';
import { RodaMeasureLayerPool } from './rodaMeasureLayerCache';
import { computeSweepSectorPlan } from './rodaSweepSectorMath';
import { resolveCachedTrackStepsForMeasure } from './rodaTrackFrameCache';
import { isRodaDrawableTrack } from './sortTracksByRodaOrder';

export { computeSweepSectorPlan };

function drawClippedPieSector(
  ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, px: number, aStart: number, aEnd: number
): void {
  if (aEnd - aStart <= 1e-4) return;
  const h = px * 0.5;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath();
  ctx.moveTo(h, h);
  ctx.arc(h, h, px * 0.72, aStart, aEnd, false);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(src, 0, 0, px, px);
  ctx.restore();
}

export function composeRodaMeasureLayers(params: {
  ctx: CanvasRenderingContext2D; canvasPx: number; scaleFactor: number; pool: RodaMeasureLayerPool;
  isPlayheadActive: boolean; playheadRatio: number; rodaSweepMode?: 'sweep6h' | 'fullMeasure';
  measureIdx: number; nextMeasureIdx: number; prevMeasureIdx: number | null; hasPrevMeasure: boolean;
  currTimeSig: string; nextTimeSig: string; prevTimeSig: string;
  visibleTracks: TrackGroup[]; rawTracks: TrackGroup[]; dynamicScale: number; isEco: boolean;
  isLeftHanded: boolean; soloId: number | null; themeWood: string; themeBorder: string; themeText: string;
  activeVariationsRef?: React.MutableRefObject<{ [trackId: number]: any }>;
}): void {
  const { ctx, canvasPx: px, scaleFactor: sf, pool, isPlayheadActive, playheadRatio, rodaSweepMode, measureIdx, nextMeasureIdx, prevMeasureIdx, hasPrevMeasure, currTimeSig, nextTimeSig, prevTimeSig, visibleTracks, rawTracks, dynamicScale, isEco, isLeftHanded, soloId, themeWood, themeBorder, themeText, activeVariationsRef } = params;

  const plan = computeSweepSectorPlan({
    isPlayheadActive, playheadRatio, rodaSweepMode, currTimeSig, nextTimeSig, prevTimeSig, hasPrevMeasure,
    isNextSlotReady: pool.next.measureIdx === nextMeasureIdx && pool.next.key !== '',
    isPrevSlotReady: prevMeasureIdx !== null && pool.prev.measureIdx === prevMeasureIdx && pool.prev.key !== '',
  });

  if (plan.mode === 'single') {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(pool.curr.canvas, 0, 0, px, px);
  } else {
    const lead = plan.mode === 'sweepNext' ? pool.next.canvas : pool.curr.canvas;
    const trail = plan.mode === 'sweepNext' ? pool.curr.canvas : pool.prev.canvas;
    drawClippedPieSector(ctx, lead, px, plan.leadStartAngle, plan.leadEndAngle);
    drawClippedPieSector(ctx, trail, px, plan.trailStartAngle, plan.trailEndAngle);

    if (plan.wedgeEndAngle - plan.wedgeStartAngle > 1e-4) {
      const h = px * 0.5, st = useSequencerStore.getState();
      const rodaTracks = visibleTracks.filter(isRodaDrawableTrack), totalRings = rodaTracks.length;
      const snaps = getLiveVariationRodaSnapshots(nextMeasureIdx);
      const currMap = snaps.currentStepsByTrackId || activeVariationsRef?.current;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath();
      ctx.moveTo(h, h);
      ctx.arc(h, h, px * 0.72, plan.wedgeStartAngle, plan.wedgeEndAngle, false);
      ctx.closePath();
      ctx.clip();
      ctx.setTransform(sf, 0, 0, sf, 0, 0);

      for (let i = 0; i < totalRings; i++) {
        const track = rodaTracks[i], inst = instrumentsConfig[track.instrumentIdx];
        if (!inst || isToadaBus(track) || inst.type === 'voice') continue;
        const tRad = getTrackRadius(i, totalRings);
        const curr = resolveCachedTrackStepsForMeasure(1, track, rawTracks, measureIdx, soloId, currMap, st.measureTimeSigs, st.timeSig);
        ctx.save();
        if (soloId == null && getEffectiveMuteState(rawTracks, track.id)) ctx.globalAlpha = 0.26;
        drawPercussionTrack(
          ctx, track, inst, curr.pattern, curr.activeSteps, curr.stepAngles, curr.stepCount, -1,
          tRad, 600, 600, dynamicScale, isEco, measureIdx, rawTracks,
          currMap ? { current: currMap } : activeVariationsRef, isLeftHanded,
          themeWood, themeBorder, themeText, true, Math.max(0, playheadRatio), soloId, totalRings, 0,
          { wedgeRangeP: [plan.wedgeStartP, plan.wedgeEndP], skipLabel: true, staticHitIntensity: true }
        );
        ctx.restore();
      }
      ctx.restore();
    }
  }

  if (pool.hasToadaContent && pool.toada.key !== '') {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(pool.toada.canvas, 0, 0, px, px);
  }
  if (plan.sweepRatio !== null && !isEco) {
    ctx.setTransform(sf, 0, 0, sf, 0, 0);
    drawRodaSweepWave(ctx, 600, 600, 130, 512, plan.sweepRatio, isEco);
  }
}
