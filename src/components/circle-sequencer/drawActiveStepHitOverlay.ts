/**
 * drawActiveStepHitOverlay.ts — Surbrillance légère par trame uniquement sur les 1–2 pas sous la baguette (< 120 lignes).
 */
import { instrumentsConfig } from '../../data';
import { getLiveVariationRodaSnapshots } from '../../hooks/audio-sync/liveVariationLookaheadEngine';
import { getEffectiveMuteState, isToadaBus, useSequencerStore } from '../../stores/useSequencerStore';
import { TrackGroup } from '../../types';
import { computeRodaStepAngles, getRodaMeasureGeometry, getStepAngularSpan, resolveActiveBeatResolutions } from '../../utils/rodaTimeSigGeometry';
import { areStepValuesEqual, resolveSlaveStepOpacity, SlaveFocusContext } from '../../utils/slaveStepOpacityResolver';
import { getTrackRadius } from './circleGeometry';
import { drawRasSubStep } from './drawRasSubStep';
import { drawSplitStepPastille } from './drawSplitStepPastille';
import { getPhysicalStepFromRatio, resolvePatternForMeasure } from './measurePatternHelpers';
import { resolveStepPastilleData } from './resolveStepPastilleData';
import { resolveCachedToadaStepsAndBlocks } from './rodaToadaTrackCache';
import { resolveCachedTrackStepsForMeasure } from './rodaTrackFrameCache';
import { isRodaDrawableTrack } from './sortTracksByRodaOrder';

const DECAY_ARC_RAD = 0.52;

export function drawActiveStepHitOverlay(params: {
  ctx: CanvasRenderingContext2D; visibleTracks: TrackGroup[]; rawTracks: TrackGroup[];
  measureIdx: number; nextMeasureIdx: number; activeTimeSig: string; playheadRatio: number;
  dynamicScale: number; isEco: boolean; isLeftHanded: boolean; soloId: number | null;
  themeWood: string; themeBorder: string; themeText: string;
  activeVariationsRef?: React.MutableRefObject<{ [trackId: number]: any }>;
}): void {
  const { ctx, visibleTracks, rawTracks, measureIdx, nextMeasureIdx, activeTimeSig, playheadRatio, dynamicScale, isEco, isLeftHanded, soloId, themeWood, themeBorder, activeVariationsRef } = params;
  if (isEco || playheadRatio < 0) return;
  const rodaTracks = visibleTracks.filter(isRodaDrawableTrack), totalRings = rodaTracks.length;
  if (totalRings === 0) return;

  const st = useSequencerStore.getState();
  const focusCtx: SlaveFocusContext = {
    isFocusActive: st.isFocusActive, focusTrackId: st.focusTrackId, referenceTrackId: st.referenceTrackId,
    activeAoVivoTrackId: st.activeAoVivoTrackId, editingTrackId: st.editingTrackId, mobileViewMode: st.mobileViewMode,
  };
  const currVarMap = getLiveVariationRodaSnapshots(nextMeasureIdx).currentStepsByTrackId || activeVariationsRef?.current;
  const stickAngle = -Math.PI / 2 + playheadRatio * Math.PI * 2;
  const beatsCount = getRodaMeasureGeometry(activeTimeSig).beatsCount;

  for (let ringIdx = 0; ringIdx < totalRings; ringIdx++) {
    const track = rodaTracks[ringIdx], inst = instrumentsConfig[track.instrumentIdx];
    if (!inst) continue;
    const tRad = getTrackRadius(ringIdx, totalRings);
    const trackAlpha = soloId == null && getEffectiveMuteState(rawTracks, track.id) ? 0.26 : 1.0;

    if (isToadaBus(track) || inst.type === 'voice') {
      const pux = isToadaBus(track) ? rawTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador') : (inst.id !== 'coro' ? track : undefined);
      const coro = isToadaBus(track) ? rawTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro') : (inst.id === 'coro' ? track : undefined);
      const puxPat = resolvePatternForMeasure(pux, measureIdx, soloId), coroPat = resolvePatternForMeasure(coro, measureIdx, soloId);
      const refPat = puxPat || coroPat, beatRes = resolveActiveBeatResolutions(activeTimeSig, refPat);
      const stepAngles = computeRodaStepAngles(activeTimeSig, beatRes), stepCount = stepAngles.length;
      const cStep = getPhysicalStepFromRatio(playheadRatio, refPat, stepCount, beatsCount, beatRes);
      if (cStep >= 0 && cStep < stepCount) {
        const prevM = measureIdx > 0 ? measureIdx - 1 : (st.totalMeasures > 1 ? st.totalMeasures - 1 : -1);
        const { puxSteps, coroSteps } = resolveCachedToadaStepsAndBlocks({
          trackId: track.id, effectiveStepCount: stepCount, hasSeparateVoiceTracks: Boolean(pux || coro),
          puxPattern: puxPat, coroPattern: coroPat,
          nextPuxPattern: resolvePatternForMeasure(pux, nextMeasureIdx, soloId), nextCoroPattern: resolvePatternForMeasure(coro, nextMeasureIdx, soloId),
          prevPuxPattern: prevM >= 0 ? resolvePatternForMeasure(pux, prevM, soloId) : null, prevCoroPattern: prevM >= 0 ? resolvePatternForMeasure(coro, prevM, soloId) : null,
          activePattern: refPat, currentInst: inst,
          puxPlayingSteps: currVarMap && pux ? (currVarMap[pux.id] || puxPat?.activeSteps) : puxPat?.activeSteps,
          coroPlayingSteps: currVarMap && coro ? (currVarMap[coro.id] || coroPat?.activeSteps) : coroPat?.activeSteps,
          activePlayingSteps: refPat?.activeSteps, soloPlayId: soloId, currentStep: cStep,
          stepsInFirstBeat: beatRes[0] || 4, stepsInLastBeat: beatRes[beatRes.length - 1] || 4,
        });
        const pS = puxSteps[cStep], cS = coroSteps[cStep];
        if ((pS?.active && !pS.isProlongation) || (cS?.active && !cS.isProlongation)) {
          const ang = stepAngles[cStep], x = 600 + Math.cos(ang) * tRad, y = 600 + Math.sin(ang) * tRad;
          const isAna = Boolean(pS?.isAnacrusis || cS?.isAnacrusis);
          ctx.save(); ctx.globalAlpha = trackAlpha; ctx.beginPath(); ctx.arc(x, y, 22 * dynamicScale + 5, 0, Math.PI * 2);
          ctx.strokeStyle = isAna ? '#f59e0b' : themeWood; ctx.lineWidth = isAna ? 3.0 : 2.5; ctx.stroke(); ctx.restore();
        }
      }
      continue;
    }

    const curr = resolveCachedTrackStepsForMeasure(1, track, rawTracks, measureIdx, soloId, currVarMap, st.measureTimeSigs, st.timeSig);
    const angles = curr.stepAngles, count = curr.stepCount;
    for (let s = 0; s < count; s++) {
      const stepAngle = angles[s];
      const deltaRad = ((stickAngle - stepAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      if (deltaRad > DECAY_ARC_RAD + 0.16) continue;
      const rawState = curr.activeSteps?.[s] ?? 0;
      if (!rawState || rawState === 0 || rawState === '0') continue;
      const isRas = Array.isArray(rawState) && rawState.length === 2, master = isRas ? rawState[0] : rawState;
      const canVary = Boolean(curr.pattern?.variations?.length && (soloId !== null || curr.pattern.measureAllowVariations?.[measureIdx] !== false));
      const isVar = canVary && !areStepValuesEqual(rawState, curr.baseSteps?.[s] ?? 0);
      const slaveAlpha = isVar ? 1.0 : resolveSlaveStepOpacity({ track, allTracks: rawTracks, measureIdx, stepIdx: s, ownStepVal: rawState, focusCtx, activeVariationsMap: currVarMap });
      const effAlpha = trackAlpha * slaveAlpha;
      if (effAlpha <= 0.01) continue;

      if (deltaRad <= DECAY_ARC_RAD) {
        const hitIntensity = Math.pow(1 - deltaRad / DECAY_ARC_RAD, 1.55);
        const pastille = hitIntensity > 0.01 ? resolveStepPastilleData(master, [], inst, track, rawTracks, instrumentsConfig, isLeftHanded, dynamicScale, totalRings, tRad, count) : null;
        if (pastille?.hasEvent) {
          const x = 600 + Math.cos(stepAngle) * tRad, y = 600 + Math.sin(stepAngle) * tRad;
          ctx.save(); ctx.globalAlpha = effAlpha < 0.99 ? effAlpha * hitIntensity * 0.65 : effAlpha;
          drawSplitStepPastille(ctx, x, y, pastille.radiusSize, false, false, pastille.leftFillColor, '', pastille.leftText, '', pastille.leftTxtColor, '', false, false, themeWood, themeBorder, dynamicScale, hitIntensity, isVar);
          ctx.restore();
        }
      }
      if (isRas) {
        const span = angles.length > 0 ? getStepAngularSpan(angles, s) : (Math.PI * 2) / Math.max(1, count);
        const subDelta = ((stickAngle - (stepAngle + 0.5 * span)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        if (subDelta <= 0.42) {
          ctx.save(); ctx.globalAlpha = effAlpha < 0.99 ? effAlpha * 0.65 : effAlpha;
          drawRasSubStep(ctx, rawState[1], stepAngle, span, 600, 600, tRad, inst, track, rawTracks, instrumentsConfig, isLeftHanded, dynamicScale, themeBorder, true, playheadRatio, false);
          ctx.restore();
        }
      }
    }
  }
}
