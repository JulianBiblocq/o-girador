import React from 'react';
import { Pattern, TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus, useSequencerStore } from '../../stores/useSequencerStore';
import { getTrackDisplayName } from '../../utils/colorHelpers';
import { getLiveVariationRodaSnapshots } from '../../hooks/audio-sync/liveVariationLookaheadEngine';
import { computeBaseStampRadius, computeStepAngles, getTrackRadius, resolveBeatsFromTimeSig } from './circleGeometry';
import { resolvePatternForMeasure } from './measurePatternHelpers';
import { buildCandidateAnglesForSweep, resolveStepSweepBlend, resolveTrackStepsForMeasure } from './rodaSweepMath';
import { buildPercussionPedagogyTarget, buildVocalRoleCard } from '../pedagogy/resolvePedagogyPopoverModel';
import { StrokeInfoPopoverTarget } from '../pedagogy/strokeInfoTypes';
import { LivePlaybackState } from './circleSequencerTypes';

const isNonEmpty = (v: any): boolean => {
  if (Array.isArray(v)) return isNonEmpty(v[0]) || isNonEmpty(v[1]);
  return v !== 0 && v !== '0' && v !== '' && v !== null && v !== undefined && v !== '-';
};

export function resolveRodaPedagogicalHit(params: {
  clientX: number; clientY: number; mouseX: number; mouseY: number; distance: number;
  visibleTracks: TrackGroup[]; allTracks: TrackGroup[];
  livePlaybackRef: React.MutableRefObject<LivePlaybackState>;
  activeVariationsRef?: React.MutableRefObject<Record<number, any>>;
  stateRef: React.MutableRefObject<any>;
}): StrokeInfoPopoverTarget | null {
  const { clientX, clientY, mouseX, mouseY, distance, visibleTracks, allTracks, livePlaybackRef, activeVariationsRef, stateRef } = params;
  const totalTracks = visibleTracks.length;
  if (totalTracks === 0) return null;

  const ringTol = Math.max(24, computeBaseStampRadius(totalTracks) + 8);
  let bestTrack: TrackGroup | null = null;
  let bestRingRadius = 0;
  let minRingDelta = Infinity;
  for (let i = 0; i < totalTracks; i++) {
    const tRad = getTrackRadius(i, totalTracks);
    const delta = Math.abs(distance - tRad);
    if (delta <= ringTol && delta < minRingDelta) {
      minRingDelta = delta;
      bestTrack = visibleTracks[i];
      bestRingRadius = tRad;
    }
  }
  if (!bestTrack) return null;

  const st = useSequencerStore.getState();
  const isPlaying = Boolean(stateRef.current.isPlaying);
  const measureIdx = isPlaying && livePlaybackRef.current.measure >= 0
    ? livePlaybackRef.current.measure
    : (stateRef.current.currentMeasure ?? st.currentMeasure ?? 0);
  const playheadRatio = livePlaybackRef.current.ratio || 0;
  const soloPlayId = stateRef.current.soloPatternPlayId ?? null;
  const lang = stateRef.current.lang || st.lang || 'fr';
  const isLeftHanded = Boolean(stateRef.current.isLeftHanded ?? st.isLeftHanded);
  const inst = instrumentsConfig[bestTrack.instrumentIdx];
  if (!inst) return null;

  const isToada = isToadaBus(bestTrack);
  const isVocal = isToada || inst.type === 'voice' || ['puxador', 'coro', 'toada'].includes(inst.id);
  if (isVocal) {
    const puxTrack = isToada ? allTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador') : (inst.id === 'puxador' ? bestTrack : undefined);
    const coroTrack = isToada ? allTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro') : (inst.id === 'coro' ? bestTrack : undefined);
    const puxPat = resolvePatternForMeasure(puxTrack, measureIdx, soloPlayId);
    const coroPat = resolvePatternForMeasure(coroTrack, measureIdx, soloPlayId);
    const refPat = puxPat || coroPat;
    if (!refPat) return null;
    const sig = st.measureTimeSigs?.[measureIdx] || st.timeSig || '4/4';
    const beats = resolveBeatsFromTimeSig(String(sig), refPat.steps || 16);
    const stepAngles = computeStepAngles(beats, refPat.beatResolutions);
    let hitStep = -1;
    let bestDist = 28;
    for (let s = 0; s < stepAngles.length; s++) {
      const px = 600 + Math.cos(stepAngles[s]) * bestRingRadius;
      const py = 600 + Math.sin(stepAngles[s]) * bestRingRadius;
      const d = Math.hypot(mouseX - px, mouseY - py);
      if (d < bestDist) { bestDist = d; hitStep = s; }
    }
    if (hitStep < 0) return null;
    const cards = [
      puxTrack && puxPat ? buildVocalRoleCard({ role: 'puxador', roleTrack: puxTrack, pattern: puxPat, stepIdx: hitStep, lang }) : null,
      coroTrack && coroPat ? buildVocalRoleCard({ role: 'coro', roleTrack: coroTrack, pattern: coroPat, stepIdx: hitStep, lang }) : null,
    ].filter(Boolean) as NonNullable<ReturnType<typeof buildVocalRoleCard>>[];
    if (cards.length === 0) return null;
    return {
      anchorX: clientX, anchorY: clientY, trackId: cards[0].targetTrackId, patternId: cards[0].targetPatternId,
      measureIdx, stepIdx: hitStep, instrumentName: getTrackDisplayName(bestTrack, allTracks) || inst.name, instId: inst.id, cards,
    };
  }

  const totalM = st.totalMeasures || 1;
  const isAtLoopEnd = st.isLoopRegionActive && st.loopEndMeasure !== null && measureIdx === st.loopEndMeasure && !st.isLoopExitRequested;
  const fallbackNextM = isAtLoopEnd ? (st.loopStartMeasure ?? 0) : (measureIdx + 1) % totalM;
  const nextMeasureIdx = st.queuedMeasure !== null && st.queuedMeasure !== undefined ? st.queuedMeasure : fallbackNextM;
  const snapshots = getLiveVariationRodaSnapshots(nextMeasureIdx);
  const currSnap = snapshots.currentStepsByTrackId || activeVariationsRef?.current || null;
  const curRes = resolveTrackStepsForMeasure(bestTrack, allTracks, measureIdx, soloPlayId, currSnap, st.measureTimeSigs, st.timeSig);
  const nextRes = resolveTrackStepsForMeasure(bestTrack, allTracks, nextMeasureIdx, soloPlayId, snapshots.nextStepsByTrackId, st.measureTimeSigs, st.timeSig);
  const prevRes = snapshots.hasPrevMeasure && snapshots.prevMeasureIdx !== null
    ? resolveTrackStepsForMeasure(bestTrack, allTracks, snapshots.prevMeasureIdx, soloPlayId, snapshots.prevStepsByTrackId, st.measureTimeSigs, st.timeSig)
    : { activeSteps: [], baseSteps: [], pattern: null, stepAngles: [], stepCount: curRes.stepCount };

  const candidates = buildCandidateAnglesForSweep(curRes.stepAngles, nextRes.stepAngles, prevRes.stepAngles, isPlaying, st.rodaSweepMode);
  let bestHit: { rawState: any; baseState: any; mIdx: number; stepIdx: number; pat: Pattern | null; subIdx?: 0 | 1; dist: number } | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const { p, angle } = candidates[i];
    const blend = resolveStepSweepBlend({
      p, isPlaying, playheadRatio, rodaSweepMode: st.rodaSweepMode,
      currentMeasureIdx: measureIdx, nextMeasureIdx, prevMeasureIdx: snapshots.prevMeasureIdx, hasPrevMeasure: snapshots.hasPrevMeasure,
      currStepCount: curRes.stepCount, currentActiveSteps: curRes.activeSteps, currentBaseSteps: curRes.baseSteps,
      nextStepCount: nextRes.stepCount, nextActiveSteps: nextRes.activeSteps, nextBaseSteps: nextRes.baseSteps,
      prevStepCount: prevRes.stepCount, prevActiveSteps: prevRes.activeSteps, prevBaseSteps: prevRes.baseSteps,
    });
    const useSec = blend.isBlending && (blend.secondaryAlpha ?? 0) >= 0.5 && blend.secondaryMeasureIdx !== undefined;
    const rawState = useSec ? blend.secondaryState : blend.primaryState;
    if (!isNonEmpty(rawState)) continue;
    const baseState = useSec ? blend.secondaryBaseState : blend.primaryBaseState;
    const mIdx = useSec ? blend.secondaryMeasureIdx! : blend.primaryMeasureIdx;
    const stepIdx = useSec ? (blend.secondaryStepIdx ?? 0) : blend.primaryStepIdx;
    const stepCountM = useSec ? (blend.secondaryStepCount ?? curRes.stepCount) : blend.primaryStepCount;
    const pat = mIdx === measureIdx ? curRes.pattern : (mIdx === nextMeasureIdx ? nextRes.pattern : prevRes.pattern);
    const dMain = Math.hypot(mouseX - (600 + Math.cos(angle) * bestRingRadius), mouseY - (600 + Math.sin(angle) * bestRingRadius));
    if (dMain <= 26 && (!bestHit || dMain < bestHit.dist)) {
      bestHit = { rawState, baseState, mIdx, stepIdx, pat, subIdx: Array.isArray(rawState) ? 0 : undefined, dist: dMain };
    }
    if (Array.isArray(rawState) && rawState.length === 2 && isNonEmpty(rawState[1])) {
      const subAngle = angle + 0.5 * ((Math.PI * 2) / Math.max(1, stepCountM));
      const dSub = Math.hypot(mouseX - (600 + Math.cos(subAngle) * bestRingRadius), mouseY - (600 + Math.sin(subAngle) * bestRingRadius));
      if (dSub <= 20 && (!bestHit || dSub < bestHit.dist)) {
        bestHit = { rawState, baseState, mIdx, stepIdx, pat, subIdx: 1, dist: dSub };
      }
    }
  }

  if (!bestHit) return null;
  return buildPercussionPedagogyTarget({
    anchorX: clientX, anchorY: clientY, track: bestTrack, allTracks, inst, pattern: bestHit.pat,
    measureIdx: bestHit.mIdx, stepIdx: bestHit.stepIdx, rawVal: bestHit.rawState, masterBaseVal: bestHit.baseState,
    clickedSubIndex: bestHit.subIdx, isLeftHanded, lang,
  });
}
