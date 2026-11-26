/**
 * aoVivoStrokeDispatcher.ts — Dispatch WAAPI GPU anticipé (`85 ms`) des pas et sous-pas Ao Vivo (< 130 lignes).
 * - Zéro `setTimeout` JS : les pas (`subPhase = 0`) et sous-pas (`subPhase = 1`) sont cadencés sur le flux `96n` anticipé.
 * - Calcule l'offset déterministe `computeAoVivoSwingAndMicroOffsetSec` (`swingJitter = 0`) même piste mutée.
 */
import React from 'react';
import { isBarulhoRollActive } from '../../audio/animations/barulhoRollPlanner';
import { MineiroPole } from '../../audio/animationGenerators';
import { computeAoVivoSignedDeltaMs, computeAoVivoSwingAndMicroOffsetSec } from './aoVivoHitTiming';
import { dispatchAlfaiaPredictiveStroke } from './alfaiaLookaheadHelper';
import { dispatchCaixaPredictiveStroke } from './caixaLookaheadHelper';
import { dispatchTimbalPredictiveStroke } from './timbalLookaheadHelper';
import { dispatchAgbe, dispatchGongue, dispatchMineiro } from './aoVivoOtherDispatchers';
import { AoVivoResolvedFamily } from './resolveAoVivoFamily';

export interface PendingSubStepTimer {
  id: ReturnType<typeof setTimeout>;
  handMask: number;
}

export interface AoVivoStrokeDispatchArgs {
  detail: any;
  rawVal: any;
  subPhase?: 0 | 1 | 'both';
  stepAnchorDrawSec?: number;
  stepAnchorAudioSec?: number;
  family: AoVivoResolvedFamily;
  activeTrack: any;
  concreteTrack: any;
  effectivePattern: any;
  effectiveMicrotimings?: any[];
  currentSig: string;
  isLeftHanded: boolean;
  isStepPreview: boolean;
  lookaheadSteps: any[];
  lookaheadDurationsMs: number[];
  stepInMeasure: number;
  targetStep: number;
  stepDurationMs: number;
  geometry: { targetX: number; targetY: number; width: number; height: number };
  leftStickEl: SVGSVGElement | null;
  rightStickEl: SVGSVGElement | null;
  mineiroStickEl: SVGSVGElement | null;
  agbeWholeEl: SVGGElement | null;
  gongueStickEl: SVGSVGElement | null;
  haloEl: HTMLDivElement | null;
  leftAnimRef: React.MutableRefObject<Animation | null>;
  rightAnimRef: React.MutableRefObject<Animation | null>;
  mineiroAnimRef: React.MutableRefObject<Animation | null>;
  agbeAnimRef: React.MutableRefObject<Animation | null>;
  gongueAnimRef: React.MutableRefObject<Animation | null>;
  mineiroPoleRef: React.MutableRefObject<MineiroPole>;
  subStepTimersRef?: React.MutableRefObject<PendingSubStepTimer[]>;
}

export function clearPendingAoVivoSubSteps(timersRef?: React.MutableRefObject<PendingSubStepTimer[]>): void {
  if (!timersRef) return;
  for (let i = 0; i < timersRef.current.length; i++) clearTimeout(timersRef.current[i].id);
  timersRef.current = [];
}

export function dispatchAoVivoStepStrokes(a: AoVivoStrokeDispatchArgs): void {
  const {
    detail, rawVal, subPhase = 'both', stepAnchorDrawSec, stepAnchorAudioSec,
    family, activeTrack, concreteTrack, effectivePattern, effectiveMicrotimings,
    currentSig, isLeftHanded, isStepPreview, lookaheadSteps, lookaheadDurationsMs,
    stepInMeasure, targetStep, stepDurationMs,
  } = a;

  const stepDurSec = stepDurationMs / 1000;
  const anchorDetail = stepAnchorDrawSec !== undefined && stepAnchorDrawSec > 0
    ? { ...detail, drawTime: stepAnchorDrawSec, time: stepAnchorDrawSec, audioTime: stepAnchorAudioSec ?? detail.audioTime }
    : detail;
  const baseAudioSec = typeof anchorDetail.audioTime === 'number' && anchorDetail.audioTime > 0 ? anchorDetail.audioTime : undefined;

  const computeOffsetSec = (strokeIndex: number, extraGridSec: number): number => {
    if (isStepPreview) return extraGridSec;
    const swingMicro = computeAoVivoSwingAndMicroOffsetSec({
      effectivePattern, concreteTrack, stepInMeasure, targetStep, strokeIndex,
      stepDurationSec: stepDurSec, currentSig, effectiveMicrotimings,
      baseStepAudioSec: baseAudioSec !== undefined ? baseAudioSec + extraGridSec : undefined,
    });
    return extraGridSec + swingMicro;
  };

  const triggerStroke = (stroke: string, isSubStep: boolean, totalOffsetSec: number, explicitPreviewDelayMs = 0) => {
    const tok = (stroke || '').trim(), isSilent = !tok || tok === '0' || tok === '-';
    if (isSilent && !isBarulhoRollActive(family)) return;
    const effStroke = isSilent ? '.' : tok, isVibrate = effStroke === '~';
    const signedLeadMs = isStepPreview ? explicitPreviewDelayMs : computeAoVivoSignedDeltaMs(anchorDetail, totalOffsetSec);
    const oneShot = Boolean(isStepPreview && explicitPreviewDelayMs === 0);

    if (family === 'alfaia') dispatchAlfaiaPredictiveStroke(activeTrack, effStroke, isVibrate, isSubStep, isLeftHanded, lookaheadSteps, stepInMeasure, stepDurationMs, a.leftStickEl, a.rightStickEl, a.haloEl, a.leftAnimRef, a.rightAnimRef, a.geometry, signedLeadMs, oneShot, lookaheadDurationsMs);
    else if (family === 'caixa' || family === 'tarol') dispatchCaixaPredictiveStroke(family, effStroke, isVibrate, isSubStep, isLeftHanded, lookaheadSteps, stepInMeasure, stepDurationMs, a.leftStickEl, a.rightStickEl, a.haloEl, a.leftAnimRef, a.rightAnimRef, a.geometry, signedLeadMs, oneShot, lookaheadDurationsMs);
    else if (family === 'timbal') dispatchTimbalPredictiveStroke(effStroke, isVibrate, isSubStep, isLeftHanded, lookaheadSteps, stepInMeasure, stepDurationMs, a.leftStickEl, a.rightStickEl, a.haloEl, a.leftAnimRef, a.rightAnimRef, a.geometry, signedLeadMs, oneShot, lookaheadDurationsMs);
    else if (family === 'mineiro') dispatchMineiro(effStroke, isVibrate, a.mineiroStickEl, a.mineiroPoleRef, a.mineiroAnimRef, isLeftHanded, lookaheadSteps, stepInMeasure, stepDurationMs, isSubStep, signedLeadMs, oneShot);
    else if (family === 'agbe') {
      const nextRaw = !isSubStep && Array.isArray(rawVal) && rawVal.length > 1 ? rawVal[1] : lookaheadSteps[stepInMeasure + 1];
      dispatchAgbe(effStroke, isVibrate, a.agbeWholeEl, a.agbeAnimRef, Array.isArray(nextRaw) ? String(nextRaw[0] || '') : String(nextRaw || ''), lookaheadSteps, stepInMeasure, stepDurationMs, isSubStep, signedLeadMs, oneShot, isLeftHanded);
    } else if (family === 'gongue') dispatchGongue(effStroke, isVibrate, isSubStep, isLeftHanded, lookaheadSteps, stepInMeasure, stepDurationMs, a.gongueStickEl, a.gongueAnimRef, a.haloEl, a.geometry, signedLeadMs, lookaheadDurationsMs);
  };

  if (Array.isArray(rawVal)) {
    if (subPhase === 0 || subPhase === 'both') {
      triggerStroke(String(rawVal[0] ?? ''), false, computeOffsetSec(0, 0), 0);
    }
    if (subPhase === 1 || subPhase === 'both') {
      const subTok = String(rawVal[1] ?? '');
      const previewSubDelay = isStepPreview ? Math.max(24, Math.round(stepDurationMs * 0.5)) : 0;
      triggerStroke(subTok, true, computeOffsetSec(1, stepDurSec * 0.5), previewSubDelay);
    }
  } else if (subPhase !== 1) {
    if (typeof rawVal === 'object' && Array.isArray(rawVal.sim)) {
      const off0 = computeOffsetSec(0, 0);
      rawVal.sim.forEach((s: string) => triggerStroke(String(s), false, off0, 0));
    } else {
      triggerStroke(String(rawVal ?? ''), false, computeOffsetSec(0, 0), 0);
    }
  }
}
