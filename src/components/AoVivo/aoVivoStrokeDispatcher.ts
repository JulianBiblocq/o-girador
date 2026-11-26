/**
 * aoVivoStrokeDispatcher.ts — Dispatch Balanço-compensé des frappes et sous-pas Ao Vivo (< 132 lignes).
 * - Passe toujours le vrai `stepDurationMs` du pas entier et `lookaheadDurationsMs` (`M` + `M+1`).
 * - Calcule l'offset déterministe `computeAoVivoSwingAndMicroOffsetSec` (`swingJitter = 0`) même piste mutée.
 * - N'annule un sous-pas en attente que sur Stop/Pause/changement de piste ou collision réelle de la même main.
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
  subStepTimersRef: React.MutableRefObject<PendingSubStepTimer[]>;
}

function resolveStrokeHandMask(family: AoVivoResolvedFamily, stroke: string): number {
  const s = (stroke || '').trim(), up = s.toUpperCase();
  if (!s || s === '0' || s === '-' || s === '.' || s === '/') return 0;
  if (family === 'gongue' || family === 'agbe' || family === 'mineiro') return 3;
  if (['C', 'X', 'B', 'F', '~'].includes(up) || (family === 'alfaia' && (up === 'R' || up === 'T')) || (family === 'timbal' && up === 'V')) return 3;
  if (family === 'timbal') return ['G', 'A', 'S', 'T', 'D', 'P'].includes(s) ? 1 : 2;
  if (family === 'caixa' || family === 'tarol') {
    if (s === 'R' || s === 'A') return 1;
    if (s === 'r' || s === 'a') return 2;
    return up === 'D' || up === 'S' ? 1 : 2;
  }
  return up === 'D' || up === 'S' ? 1 : 2;
}

export function clearPendingAoVivoSubSteps(timersRef: React.MutableRefObject<PendingSubStepTimer[]>): void {
  for (let i = 0; i < timersRef.current.length; i++) clearTimeout(timersRef.current[i].id);
  timersRef.current = [];
}

function cancelCollidingHandSubSteps(timersRef: React.MutableRefObject<PendingSubStepTimer[]>, mask: number): void {
  if (!mask || timersRef.current.length === 0) return;
  const kept: PendingSubStepTimer[] = [];
  for (let i = 0; i < timersRef.current.length; i++) {
    const entry = timersRef.current[i];
    if ((entry.handMask & mask) !== 0) clearTimeout(entry.id);
    else kept.push(entry);
  }
  timersRef.current = kept;
}

export function dispatchAoVivoStepStrokes(a: AoVivoStrokeDispatchArgs): void {
  const { detail, rawVal, family, activeTrack, concreteTrack, effectivePattern, effectiveMicrotimings, currentSig, isLeftHanded, isStepPreview, lookaheadSteps, lookaheadDurationsMs, stepInMeasure, targetStep, stepDurationMs } = a;
  const stepDurSec = stepDurationMs / 1000;
  const baseAudioSec = typeof detail.audioTime === 'number' && detail.audioTime > 0 ? detail.audioTime : undefined;

  const computeOffsetSec = (strokeIndex: number, extraGridSec: number): number => {
    if (isStepPreview) return extraGridSec;
    const swingMicro = computeAoVivoSwingAndMicroOffsetSec({
      effectivePattern, concreteTrack, stepInMeasure, targetStep, strokeIndex,
      stepDurationSec: stepDurSec, currentSig, effectiveMicrotimings,
      baseStepAudioSec: baseAudioSec !== undefined ? baseAudioSec + extraGridSec : undefined,
    });
    return extraGridSec + swingMicro;
  };

  const triggerStroke = (stroke: string, isSubStep: boolean, totalOffsetSec: number) => {
    const tok = (stroke || '').trim(), isSilent = !tok || tok === '0' || tok === '-';
    if (isSilent && !isBarulhoRollActive(family)) return;
    const effStroke = isSilent ? '.' : tok, isVibrate = effStroke === '~';
    cancelCollidingHandSubSteps(a.subStepTimersRef, resolveStrokeHandMask(family, effStroke));
    const signedLeadMs = isStepPreview ? 0 : computeAoVivoSignedDeltaMs(detail, totalOffsetSec);
    const oneShot = Boolean(isStepPreview);

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
    triggerStroke(String(rawVal[0] ?? ''), false, computeOffsetSec(0, 0));
    const subTok = String(rawVal[1] ?? '');
    const subOffsetSec = computeOffsetSec(1, stepDurSec * 0.5);
    const waitMs = isStepPreview ? Math.max(15, Math.round(stepDurationMs * 0.48)) : computeAoVivoSignedDeltaMs(detail, subOffsetSec);
    if (!isStepPreview && waitMs <= 4) {
      triggerStroke(subTok, true, subOffsetSec);
    } else {
      const entry: PendingSubStepTimer = { id: 0 as unknown as ReturnType<typeof setTimeout>, handMask: resolveStrokeHandMask(family, subTok) };
      entry.id = setTimeout(() => {
        a.subStepTimersRef.current = a.subStepTimersRef.current.filter((item) => item !== entry);
        triggerStroke(subTok, true, subOffsetSec);
      }, Math.max(4, Math.round(waitMs)));
      a.subStepTimersRef.current.push(entry);
    }
  } else if (typeof rawVal === 'object' && Array.isArray(rawVal.sim)) {
    const off0 = computeOffsetSec(0, 0);
    rawVal.sim.forEach((s: string) => triggerStroke(String(s), false, off0));
  } else {
    triggerStroke(String(rawVal ?? ''), false, computeOffsetSec(0, 0));
  }
}
