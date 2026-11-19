import React from 'react';
import { CONFIG_ALFAIA_STICKS, getAlfaiaImpactPoseTransform, getAlfaiaShadowRestTransform, getAlfaiaStickRestTransform } from '../../audio/animations/alfaiaKinematics';
import { getCaixaImpactPoseTransform, getCaixaStickRestTransform, resolveCaixaActiveFamily } from '../../audio/animations/caixaKinematics';
import { buildGonguePoseForStroke, resetGonguePostureMemory, stopGongueTwoNodeAnimation } from '../../audio/animations/gongueKinematics';
import { CONFIG_AGBE_LAB, getAgbeImpactPoseTransform, resetAgbePostureMemory } from '../../audio/animations/agbeKeyframes';
import { AoVivoLabPreviewFamily, setAoVivoLabPreviewFamily, setIsAoVivoLabOpen } from '../../audio/animations/aoVivoConfigStorage';
import { getMineiroImpactPoseTransform, resetMineiroPostureMemory } from '../../audio/animations/mineiroKeyframes';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { MineiroPole } from '../../audio/animations/configMineiro';
import { resetHandPostureMemory } from '../../audio/animations/handTransitionEngine';
import { getTimbalHandRestTransform, getTimbalImpactPoseTransform } from '../../audio/animations/timbalKinematics';
import { dispatchAlfaiaPredictiveStroke, resetAlfaiaSticksAndShadows } from './alfaiaLookaheadHelper';
import { isMufflingStickRef, resetAlfaiaMuffleState } from './alfaiaMuffleReleaseHelper';
import { resolveAlfaiaSecondaryFamily } from './AlfaiaSticksOverlay';
import { dispatchCaixaPredictiveStroke, resetCaixaSticksAndShadows } from './caixaLookaheadHelper';
import { dispatchAgbe, dispatchGongue, dispatchMineiro, resetAgbeAndMineiroRest, resetGongueStickAndShadow } from './aoVivoOtherDispatchers';
import { updateGongueStickGeometry } from './GongueStickSvg';
import { findTrackForAoVivoFamily, resolveTrackAoVivoFamily } from './resolveAoVivoFamily';
import { dispatchTimbalPredictiveStroke, resetTimbalHandsAndShadows } from './timbalLookaheadHelper';
import { applyTimbalSlapBiomechanics } from './TimbalHandSvgs';
import { TESTER_SEQUENCES, TESTER_STROKES, type TesterFamily } from './aoVivoTesterCatalog';
import { cancelAoVivoShockwave } from './AoVivoShockwave';

export { TESTER_SEQUENCES, TESTER_STROKES, type TesterFamily };

interface TesterRefs {
  instId: string; activeTrack: any; isLeftHanded: boolean;
  leftStickRef: React.RefObject<SVGSVGElement | null>; rightStickRef: React.RefObject<SVGSVGElement | null>;
  gongueStickRef: React.RefObject<SVGSVGElement | null>; agbeWholeRef: React.RefObject<SVGGElement | null>;
  mineiroStickRef: React.RefObject<SVGSVGElement | null>; haloRef: React.RefObject<HTMLDivElement | null>;
  geometryRef: React.MutableRefObject<{ targetX: number; targetY: number; width: number; height: number }>;
}

let currentRefs: TesterRefs | null = null;
const dummyLeftAnim = { current: null as Animation | null }, dummyRightAnim = { current: null as Animation | null };
const dummyGongueAnim = { current: null as Animation | null }, dummyAgbeAnim = { current: null as Animation | null };
const dummyMineiroAnim = { current: null as Animation | null }, dummyMineiroPole = { current: 'backWeak' as MineiroPole };

export function registerAoVivoTesterRefs(refs: TesterRefs): void { currentRefs = refs; }

function cancelStickAnims(el: Element | null): void {
  if (!el) return;
  el.getAnimations().forEach((a) => a.cancel());
  el.querySelectorAll('*').forEach((child) => child.getAnimations?.().forEach((a) => a.cancel()));
}

export function triggerSequenceStep(fam: TesterFamily, steps: string[], stepIdx: number, stepMs = 260): void {
  if (!currentRefs || steps.length === 0) return;
  const idx = stepIdx % steps.length, stroke = steps[idx], nextTok = steps[(idx + 1) % steps.length];
  const { instId, activeTrack, isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, agbeWholeRef, mineiroStickRef, haloRef, geometryRef } = currentRefs;
  const lEl = leftStickRef.current, rEl = rightStickRef.current, gEl = gongueStickRef.current, agEl = agbeWholeRef.current, mEl = mineiroStickRef.current, hEl = haloRef.current;
  if (fam === 'alfaia') dispatchAlfaiaPredictiveStroke(activeTrack, stroke, false, false, isLeftHanded, steps, idx, stepMs, lEl, rEl, hEl, dummyLeftAnim, dummyRightAnim, geometryRef.current);
  else if (fam === 'caixa') dispatchCaixaPredictiveStroke(instId === 'tarol' ? 'tarol' : 'caixa', stroke, false, false, isLeftHanded, steps, idx, stepMs, lEl, rEl, hEl, dummyLeftAnim, dummyRightAnim, geometryRef.current);
  else if (fam === 'gongue') dispatchGongue(stroke, false, false, isLeftHanded, steps, idx, stepMs, gEl, dummyGongueAnim, hEl, geometryRef.current);
  else if (fam === 'agbe') dispatchAgbe(stroke, false, agEl, dummyAgbeAnim, nextTok);
  else if (fam === 'mineiro') dispatchMineiro(stroke, false, mEl, dummyMineiroPole, dummyMineiroAnim, isLeftHanded);
  else dispatchTimbalPredictiveStroke(stroke, false, false, isLeftHanded, steps, idx, stepMs, lEl, rEl, hEl, dummyLeftAnim, dummyRightAnim, geometryRef.current);
}

export function triggerSingleTestStroke(fam: TesterFamily, stroke: string): void {
  if (!(fam === 'alfaia' && isMufflingStickRef.current)) resetHandPostureMemory();
  resetGonguePostureMemory(); resetAgbePostureMemory(); resetMineiroPostureMemory();
  triggerSequenceStep(fam, [stroke, '0'], 0, 260);
}

export function applyFrozenImpactPose(fam: TesterFamily, stroke: string): void {
  if (!currentRefs) return;
  const { instId, activeTrack, isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, agbeWholeRef, mineiroStickRef } = currentRefs;
  const lEl = leftStickRef.current, rEl = rightStickRef.current, gEl = gongueStickRef.current, agEl = agbeWholeRef.current, mEl = mineiroStickRef.current;
  [lEl, rEl, gEl, agEl, mEl].forEach(cancelStickAnims);
  const domEl = isLeftHanded ? lEl : rEl, secEl = isLeftHanded ? rEl : lEl, sUp = stroke.toUpperCase();

  if (fam === 'alfaia') {
    const secFam = stroke === 'I' ? 'bacalhau' : resolveAlfaiaSecondaryFamily(activeTrack);
    const hitDom = ['D', 'C', 'X', 'B'].includes(sUp), hitSec = ['E', 'A', 'I', 'C', 'X', 'B'].includes(sUp);
    if (domEl) domEl.style.transform = hitDom ? getAlfaiaImpactPoseTransform(stroke, isLeftHanded, 'macaneta') : getAlfaiaStickRestTransform(isLeftHanded, 'macaneta');
    if (secEl) {
      secEl.style.transform = hitSec ? getAlfaiaImpactPoseTransform(stroke, !isLeftHanded, secFam) : getAlfaiaStickRestTransform(!isLeftHanded, secFam);
      const sh = secEl.querySelector('[data-stick-shadow]') as SVGGElement | null;
      if (sh) sh.style.transform = sUp === 'A' ? 'translate(0px, 0px) scale(1)' : getAlfaiaShadowRestTransform(!isLeftHanded);
      const tip = secEl.querySelector('[data-bacalhau-tip]') as SVGGElement | null;
      if (tip) { const b = CONFIG_ALFAIA_STICKS.bacalhau, sign = !isLeftHanded ? 1 : -1; tip.style.transform = hitSec && secFam === 'bacalhau' ? `rotateZ(${sign * b.impactBendDeg}deg) skewX(${-sign * +(b.impactBendDeg * 0.65).toFixed(1)}deg) scaleX(${b.impactSquashX})` : 'rotateZ(0deg) skewX(0deg) scaleX(1)'; }
    }
  } else if (fam === 'caixa') {
    const cf = resolveCaixaActiveFamily(instId), hitDom = ['D', 'C', 'X', 'B'].includes(sUp) || stroke === 'A' || stroke === 'R' || stroke === 'F', hitSec = ['E', 'C', 'X', 'B'].includes(sUp) || stroke === 'a' || stroke === 'r' || stroke === 'f';
    if (domEl) domEl.style.transform = hitDom ? getCaixaImpactPoseTransform(stroke, isLeftHanded, cf) : getCaixaStickRestTransform(isLeftHanded, cf);
    if (secEl) secEl.style.transform = hitSec ? getCaixaImpactPoseTransform(stroke, !isLeftHanded, cf) : getCaixaStickRestTransform(!isLeftHanded, cf);
  } else if (fam === 'gongue') {
    stopGongueTwoNodeAnimation(); updateGongueStickGeometry(gEl, buildGonguePoseForStroke(stroke, true), isLeftHanded);
  } else if (fam === 'agbe' && agEl) {
    agEl.style.transformOrigin = `50% ${CONFIG_AGBE_LAB.pivotYPercent}%`;
    agEl.style.transform = getAgbeImpactPoseTransform(stroke);
  } else if (fam === 'mineiro' && mEl) {
    mEl.style.transform = getMineiroImpactPoseTransform(stroke, isLeftHanded);
  } else {
    const hitDom = ['G', 'S', 'A', 'P', 'D'].includes(stroke) || ['F', 'V', 'C', 'X', 'B'].includes(sUp);
    const hitSec = ['g', 's', 'a', 'p', 'd'].includes(stroke) || ['F', 'V', 'C', 'X', 'B'].includes(sUp);
    const isSlapOrClap = sUp === 'S' || sUp === 'V' || sUp === 'C' || sUp === 'X';
    if (domEl) { domEl.style.transform = hitDom ? getTimbalImpactPoseTransform(stroke, isLeftHanded) : getTimbalHandRestTransform(isLeftHanded, true); applyTimbalSlapBiomechanics(domEl, hitDom && isSlapOrClap); }
    if (secEl) { secEl.style.transform = hitSec ? getTimbalImpactPoseTransform(stroke, !isLeftHanded) : getTimbalHandRestTransform(!isLeftHanded, true); applyTimbalSlapBiomechanics(secEl, hitSec && isSlapOrClap); }
  }
}

export function clearFrozenPose(fam: TesterFamily): void {
  if (!currentRefs) return;
  resetHandPostureMemory(); resetGonguePostureMemory(); resetAgbePostureMemory(); resetMineiroPostureMemory(); resetAlfaiaMuffleState();
  const { instId, activeTrack, isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, agbeWholeRef, mineiroStickRef, haloRef } = currentRefs;
  [leftStickRef.current, rightStickRef.current, gongueStickRef.current, agbeWholeRef.current, mineiroStickRef.current].forEach(cancelStickAnims);
  cancelAoVivoShockwave(haloRef.current);
  if (fam === 'alfaia') resetAlfaiaSticksAndShadows(activeTrack, isLeftHanded, leftStickRef.current, rightStickRef.current);
  else if (fam === 'caixa') resetCaixaSticksAndShadows(instId === 'tarol' ? 'tarol' : 'caixa', leftStickRef.current, rightStickRef.current);
  else if (fam === 'gongue') resetGongueStickAndShadow(isLeftHanded, gongueStickRef.current);
  else if (fam === 'agbe' || fam === 'mineiro') resetAgbeAndMineiroRest(agbeWholeRef.current, mineiroStickRef.current);
  else resetTimbalHandsAndShadows(leftStickRef.current, rightStickRef.current);
}

export function selectAoVivoLabInstrument(fam: AoVivoLabPreviewFamily): void {
  const st = useSequencerStore.getState();
  const match = findTrackForAoVivoFamily(st.tracks || [], fam);
  if (match) {
    st.setActiveAoVivoTrackId(match.id);
    if (st.isFocusActive && st.setFocusTrackId) st.setFocusTrackId(match.id);
  }
  setAoVivoLabPreviewFamily(fam);
}

export function openAoVivoLabWithActiveTrack(preferredTrackId?: number | string | null): void {
  const st = useSequencerStore.getState();
  setAoVivoLabPreviewFamily(null);
  if (st.activeAoVivoTrackId === null) {
    const firstPerc = (st.tracks || []).find((t: any) => !t.isBusFolder && !t.isLinkFolder && resolveTrackAoVivoFamily(t, st.tracks).family !== null);
    const fallbackId = preferredTrackId ?? st.focusTrackId ?? firstPerc?.id ?? st.tracks?.[0]?.id ?? null;
    if (fallbackId !== null && fallbackId !== undefined) st.setActiveAoVivoTrackId(Number(fallbackId));
  }
  setIsAoVivoLabOpen(true);
}
