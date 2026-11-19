import { useEffect, useRef } from 'react';
import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencer } from '../../contexts/SequencerContext';
import { isBarulhoRollActive, resetBarulhoRollState } from '../../audio/animations/barulhoRollPlanner';
import { computeAoVivoHitLeadMs } from './aoVivoHitTiming';
import { dispatchTimbalPredictiveStroke } from './timbalLookaheadHelper';
import { dispatchAlfaiaPredictiveStroke } from './alfaiaLookaheadHelper';
import { dispatchCaixaPredictiveStroke } from './caixaLookaheadHelper';
import { dispatchMineiro, dispatchAgbe, dispatchGongue } from './aoVivoOtherDispatchers';
import { resetAoVivoRestPosition, resolveAoVivoPatternAndSteps } from './aoVivoReset';
import { pauseAoVivoAnimations, prepareAoVivoForStepPreview, resolveAoVivoMeasureStepInfo, resumeAoVivoAnimations } from './aoVivoFreezeHelper';
import { cancelAoVivoShockwave } from './AoVivoShockwave';
import { AoVivoResolvedFamily, resolveTrackAoVivoFamily } from './resolveAoVivoFamily';
import { MineiroPole } from '../../audio/animationGenerators';
import { getMeasureDurationSec } from '../../utils/meterTiming';

export { computeAoVivoHitLeadMs };

export function useAoVivoAnimationEngine(
  activeAoVivoTrackId: string | number | null, isLeftHanded: boolean, activeTrack: any,
  family: AoVivoResolvedFamily | null, isSyntheticPreview: boolean,
  geometryRef: React.MutableRefObject<{ targetX: number; targetY: number; width: number; height: number }>,
  leftStickRef: React.RefObject<SVGSVGElement | null>, rightStickRef: React.RefObject<SVGSVGElement | null>,
  mineiroStickRef: React.RefObject<SVGSVGElement | null>, agbeWholeRef: React.RefObject<SVGGElement | null>,
  gongueStickRef: React.RefObject<SVGSVGElement | null>, haloRef: React.RefObject<HTMLDivElement | null>,
  _voiceWrapperRef: React.RefObject<HTMLDivElement | null>
) {
  const isPreRolling = useSequencerStore((state) => state.isPreRolling);
  const { activeVariationsRef } = useSequencer();
  const leftAnimRef = useRef<Animation | null>(null), rightAnimRef = useRef<Animation | null>(null);
  const gongueAnimRef = useRef<Animation | null>(null), agbeAnimRef = useRef<Animation | null>(null), mineiroAnimRef = useRef<Animation | null>(null);
  const allAnimRefs = [leftAnimRef, rightAnimRef, gongueAnimRef, agbeAnimRef, mineiroAnimRef];
  const mineiroPoleRef = useRef<MineiroPole>('backWeak'), lastVuStepRef = useRef<number>(-1), subStepTimersRef = useRef<any[]>([]);

  const clearSubStepTimers = () => { subStepTimersRef.current.forEach((t) => clearTimeout(t)); subStepTimersRef.current = []; };

  useEffect(() => {
    const resetAllToRest = () => {
      clearSubStepTimers(); resetBarulhoRollState(); lastVuStepRef.current = -1;
      allAnimRefs.forEach((r) => r.current?.cancel()); cancelAoVivoShockwave(haloRef.current);
      resetAoVivoRestPosition(family ?? undefined, isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, mineiroStickRef, agbeWholeRef, activeTrack);
    };
    const onResume = () => resumeAoVivoAnimations(allAnimRefs, haloRef.current);
    resetAllToRest();
    window.addEventListener('o-girador-playback-stopped', resetAllToRest);
    window.addEventListener('o-girador-playback-resumed', onResume);
    return () => {
      window.removeEventListener('o-girador-playback-stopped', resetAllToRest);
      window.removeEventListener('o-girador-playback-resumed', onResume);
    };
  }, [isPreRolling, family, isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, mineiroStickRef, agbeWholeRef, activeTrack]);

  useEffect(() => {
    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number; time?: number; isPreRoll?: boolean; isPaused?: boolean; isStepPreview?: boolean }) => {
      const { step, measure, maxTicks, ratio = step / maxTicks, isStepPreview } = detail;
      if (detail.isPaused && !isStepPreview && step >= 0) {
        clearSubStepTimers(); pauseAoVivoAnimations(allAnimRefs, haloRef.current); return;
      }
      if (isPreRolling || Boolean(detail.isPreRoll) || step < 0) {
        clearSubStepTimers(); resetBarulhoRollState(); lastVuStepRef.current = -1;
        allAnimRefs.forEach((r) => r.current?.cancel()); cancelAoVivoShockwave(haloRef.current);
        resetAoVivoRestPosition(family ?? undefined, isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, mineiroStickRef, agbeWholeRef, activeTrack);
        return;
      }

      const state = useSequencerStore.getState();
      if (!family || isSyntheticPreview || !activeTrack || resolveTrackAoVivoFamily(activeTrack, state.tracks).family !== family) {
        lastVuStepRef.current = -1; return;
      }

      const soloPlayId = (state as any).soloPlayingPatternId ?? (state as any).soloPatternPlayId ?? null;
      const isCombineGroup = family === 'alfaia' || family === 'caixa' || family === 'tarol' || family === 'timbal';
      const { pattern, activePlayingSteps } = resolveAoVivoPatternAndSteps(activeTrack, state.tracks, measure, soloPlayId, activeVariationsRef?.current, isCombineGroup);
      if (!pattern) {
        if (isBarulhoRollActive()) resetAoVivoRestPosition(family, isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, mineiroStickRef, agbeWholeRef, activeTrack);
        lastVuStepRef.current = -1; return;
      }

      const currentSig = state.measureTimeSigs?.[measure] || state.timeSig || '4/4';
      const { stepsPerMeasure, targetStep } = resolveAoVivoMeasureStepInfo(currentSig, pattern, measure, ratio);
      if (!isStepPreview && targetStep === lastVuStepRef.current) return;
      lastVuStepRef.current = targetStep; clearSubStepTimers();

      const rawVal = activePlayingSteps?.[targetStep];
      if (isStepPreview) {
        prepareAoVivoForStepPreview(allAnimRefs, haloRef.current, family, isLeftHanded, activeTrack, rawVal, leftStickRef.current, rightStickRef.current, leftAnimRef, rightAnimRef);
      }
      if ((!rawVal || rawVal === '-' || rawVal === '0' || rawVal === 0) && !isBarulhoRollActive(family)) return;

      const currentBpm = state.measureBpms?.[measure] || state.bpm || 100;
      const stepDurationMs = Math.max(40, (getMeasureDurationSec(currentSig, currentBpm) * 1000) / stepsPerMeasure);

      const triggerStroke = (stroke: string, isSubStep: boolean, extraSec = 0) => {
        const tok = (stroke || '').trim();
        const isSilent = !tok || tok === '0' || tok === '-';
        if (isSilent && !isBarulhoRollActive(family)) return;
        const effStroke = isSilent ? '.' : tok, isVibrate = effStroke === '~';
        const leadMs = computeAoVivoHitLeadMs(detail, extraSec);
        const subDurMs = isSubStep ? Math.max(35, Math.round(stepDurationMs * 0.5)) : stepDurationMs;
        const oneShot = Boolean(isStepPreview);
        if (family === 'alfaia') dispatchAlfaiaPredictiveStroke(activeTrack, effStroke, isVibrate, isSubStep, isLeftHanded, activePlayingSteps, targetStep, subDurMs, leftStickRef.current, rightStickRef.current, haloRef.current, leftAnimRef, rightAnimRef, geometryRef.current, leadMs, oneShot);
        else if (family === 'caixa' || family === 'tarol') dispatchCaixaPredictiveStroke(family, effStroke, isVibrate, isSubStep, isLeftHanded, activePlayingSteps, targetStep, subDurMs, leftStickRef.current, rightStickRef.current, haloRef.current, leftAnimRef, rightAnimRef, geometryRef.current, leadMs, oneShot);
        else if (family === 'timbal') dispatchTimbalPredictiveStroke(effStroke, isVibrate, isSubStep, isLeftHanded, activePlayingSteps, targetStep, subDurMs, leftStickRef.current, rightStickRef.current, haloRef.current, leftAnimRef, rightAnimRef, geometryRef.current, leadMs, oneShot);
        else if (family === 'mineiro') dispatchMineiro(effStroke, isVibrate, mineiroStickRef.current, mineiroPoleRef, mineiroAnimRef, isLeftHanded, activePlayingSteps, targetStep, subDurMs, isSubStep, leadMs, oneShot);
        else if (family === 'agbe') {
          const nextRaw = activePlayingSteps?.[(targetStep + 1) % Math.max(1, activePlayingSteps.length)];
          dispatchAgbe(effStroke, isVibrate, agbeWholeRef.current, agbeAnimRef, Array.isArray(nextRaw) ? String(nextRaw[0] || '') : String(nextRaw || ''), activePlayingSteps, targetStep, subDurMs, isSubStep, leadMs, oneShot);
        } else if (family === 'gongue') dispatchGongue(effStroke, isVibrate, isSubStep, isLeftHanded, activePlayingSteps, targetStep, subDurMs, gongueStickRef.current, gongueAnimRef, haloRef.current, geometryRef.current, leadMs);
      };

      if (Array.isArray(rawVal)) {
        triggerStroke(String(rawVal[0] ?? ''), false, 0);
        subStepTimersRef.current.push(setTimeout(() => triggerStroke(String(rawVal[1] ?? ''), true, stepDurationMs / 2000), Math.max(20, Math.round(stepDurationMs / 2))));
      } else if (typeof rawVal === 'object' && Array.isArray(rawVal.sim)) {
        rawVal.sim.forEach((s: string) => triggerStroke(String(s), false, 0));
      } else {
        triggerStroke(String(rawVal ?? ''), false, 0);
      }
    };

    subscribeToTick(handleTick);
    return () => { unsubscribeFromTick(handleTick); clearSubStepTimers(); };
  }, [activeAoVivoTrackId, isLeftHanded, activeTrack, family, isSyntheticPreview, isPreRolling, geometryRef, leftStickRef, rightStickRef, mineiroStickRef, agbeWholeRef, gongueStickRef, haloRef, activeVariationsRef]);

  return { leftAnimRef, rightAnimRef };
}
