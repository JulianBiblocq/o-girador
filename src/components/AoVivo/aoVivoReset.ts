import React from 'react';
import { resetBarulhoRollState } from '../../audio/animations/barulhoRollPlanner';
import { resetGonguePostureMemory } from '../../audio/animations/gongueKinematics';
import { resetHandPostureMemory } from '../../audio/animations/handTransitionEngine';
import { getVariationSnapshotBySeqOrMeasure } from '../../hooks/audio-sync/liveVariationSnapshotStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { getVariationSculptArrays, resolveEffectivePatternStepsForSoloOrLive } from '../../utils/soloVariationMatcher';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { resetAlfaiaSticksAndShadows } from './alfaiaLookaheadHelper';
import { resetAlfaiaMuffleState } from './alfaiaMuffleReleaseHelper';
import { resetAgbeAndMineiroRest, resetGongueStickAndShadow } from './aoVivoOtherDispatchers';
import { resetCaixaSticksAndShadows } from './caixaLookaheadHelper';
import { normalizeAoVivoFamily } from './resolveAoVivoFamily';
import { resetTimbalHandsAndShadows } from './timbalLookaheadHelper';

export function resolveAoVivoPatternAndSteps(
  activeTrack: any,
  allTracks: any[],
  measure: number,
  soloPlayId: number | null,
  varMap?: Record<number, any>,
  seqIdOrCombine?: number | boolean
): { pattern: any | null; effectivePattern: any | null; activePlayingSteps: any[]; effectiveMicrotimings?: any[] } {
  if (!activeTrack) return { pattern: null, effectivePattern: null, activePlayingSteps: [] };

  const concreteTrack =
    activeTrack.isBusFolder || activeTrack.isLinkFolder
      ? resolveMasterTrack(activeTrack.id, allTracks) ?? activeTrack
      : activeTrack;
  if (!concreteTrack || concreteTrack.isBusFolder || concreteTrack.isLinkFolder) {
    return { pattern: null, effectivePattern: null, activePlayingSteps: [] };
  }

  const isSolo = soloPlayId !== null && soloPlayId !== undefined;
  const pattern = resolveActivePattern(concreteTrack, allTracks, measure, isSolo, soloPlayId);
  if (!pattern) {
    return { pattern: null, effectivePattern: null, activePlayingSteps: [] };
  }

  const measureSeqId = typeof seqIdOrCombine === 'number' && seqIdOrCombine > 0 ? seqIdOrCombine : undefined;
  const seqStepsMap = measureSeqId !== undefined
    ? getVariationSnapshotBySeqOrMeasure(measureSeqId, measure)?.stepsByTrackId
    : undefined;
  const effectiveVarMap = seqStepsMap ?? varMap;

  const isSlave = isSlaveTrack(concreteTrack, allTracks);
  const hasOwnOverride = !isSolo && concreteTrack.patternOverrides?.[measure] !== undefined;
  const master = isSlave && !hasOwnOverride ? resolveMasterTrack(concreteTrack.id, allTracks) : undefined;
  const lookupMap =
    effectiveVarMap && !Array.isArray(effectiveVarMap[concreteTrack.id]) && master && Array.isArray(effectiveVarMap[master.id])
      ? { ...effectiveVarMap, [concreteTrack.id]: effectiveVarMap[master.id] }
      : effectiveVarMap;

  const soloVarId = isSolo ? useTransportStore.getState().soloPatternVariationId : null;
  const resolved = resolveEffectivePatternStepsForSoloOrLive({
    pattern,
    trackId: concreteTrack.id,
    tracks: allTracks,
    soloPatternPlayId: soloPlayId,
    soloPatternVariationId: soloVarId,
    liveStepsMap: lookupMap,
    canUseLiveVariation: true,
  });

  const effectivePattern = resolved.beatResolutions
    ? { ...pattern, beatResolutions: resolved.beatResolutions }
    : pattern;
  const effectiveMicrotimings = resolved.matchedVariation
    ? getVariationSculptArrays(pattern, resolved.matchedVariation).microtimings
    : pattern.microtimings;

  return {
    pattern,
    effectivePattern,
    activePlayingSteps: resolved.steps || [],
    effectiveMicrotimings,
  };
}

export function resetAoVivoRestPosition(
  instIdOrFam: string | undefined,
  isLeftHanded: boolean,
  leftStickRef: React.RefObject<SVGSVGElement | null>,
  rightStickRef: React.RefObject<SVGSVGElement | null>,
  gongueStickRef: React.RefObject<SVGSVGElement | null>,
  mineiroStickRef: React.RefObject<SVGSVGElement | null>,
  agbeWholeRef: React.RefObject<SVGGElement | null>,
  activeTrack?: any
) {
  const fam = normalizeAoVivoFamily(instIdOrFam);
  if (!fam) return;
  resetBarulhoRollState();
  resetHandPostureMemory();
  resetGonguePostureMemory();
  resetAlfaiaMuffleState();

  if (fam === 'alfaia') {
    resetAlfaiaSticksAndShadows(activeTrack, isLeftHanded, leftStickRef.current, rightStickRef.current);
  } else if (fam === 'caixa' || fam === 'tarol') {
    resetCaixaSticksAndShadows(fam, leftStickRef.current, rightStickRef.current);
  } else if (fam === 'timbal') {
    resetTimbalHandsAndShadows(leftStickRef.current, rightStickRef.current);
  } else if (fam === 'gongue') {
    resetGongueStickAndShadow(isLeftHanded, gongueStickRef.current);
  } else if (fam === 'mineiro' || fam === 'agbe') {
    resetAgbeAndMineiroRest(agbeWholeRef.current, mineiroStickRef.current);
  }
}
