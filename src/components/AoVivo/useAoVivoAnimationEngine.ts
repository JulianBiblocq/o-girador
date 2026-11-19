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
  const leftAnimRef = useRef<Animation | null>(null);
  const rightAnimRef = useRef<Animation | null>(null);
  const gongueAnimRef = useRef<Animation | null>(null);
  const agbeAnimRef = useRef<Animation | null>(null);
  const mineiroAnimRef = useRef<Animation | null>(null);
  const mineiroPoleRef = useRef<MineiroPole>('backWeak');
  const lastVuStepRef = useRef<number>(-1);
  const subStepTimersRef = useRef<any[]>([]);

  const clearSubStepTimers = () => {
    subStepTimersRef.current.forEach((t) => clearTimeout(t));
    subStepTimersRef.current = [];
  };

  useEffect(() => {
    const resetAllToRest = () => {
      clearSubStepTimers(); resetBarulhoRollState(); lastVuStepRef.current = -1;
      leftAnimRef.current?.cancel(); rightAnimRef.current?.cancel();
      gongueAnimRef.current?.cancel(); agbeAnimRef.current?.cancel(); mineiroAnimRef.current?.cancel();
      cancelAoVivoShockwave(haloRef.current);
      resetAoVivoRestPosition(family ?? undefined, isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, mineiroStickRef, agbeWholeRef, activeTrack);
    };
    resetAllToRest();
    window.addEventListener('o-girador-playback-stopped', resetAllToRest);
    return () => window.removeEventListener('o-girador-playback-stopped', resetAllToRest);
  }, [isPreRolling, family, isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, mineiroStickRef, agbeWholeRef, activeTrack]);

  useEffect(() => {
    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number; time?: number; isPreRoll?: boolean }) => {
      const { step, measure, maxTicks, ratio = step / maxTicks } = detail;
      if (isPreRolling || Boolean((detail as any).isPreRoll) || step < 0) {
        clearSubStepTimers(); resetBarulhoRollState(); lastVuStepRef.current = -1;
        leftAnimRef.current?.cancel(); rightAnimRef.current?.cancel();
        gongueAnimRef.current?.cancel(); agbeAnimRef.current?.cancel(); mineiroAnimRef.current?.cancel();
        cancelAoVivoShockwave(haloRef.current);
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
      const stepsPerMeasure = (parseInt(String(currentSig).split('/')[0], 10) || 4) * 4;
      const patSteps = pattern.steps || stepsPerMeasure;
      const patternSpan = Math.max(1, Math.round(patSteps / stepsPerMeasure));
      let stepOffset = 0;
      if (patternSpan > 1) {
        let startM = measure;
        while (startM > 0 && pattern.measureAssignments?.[startM - 1] === true) startM--;
        stepOffset = ((measure - startM) % patternSpan) * stepsPerMeasure;
      }

      const stepInMeasure = Math.min(stepsPerMeasure - 1, Math.max(0, Math.floor(ratio * stepsPerMeasure)));
      const targetStep = Math.min(patSteps - 1, stepOffset + stepInMeasure);
      if (targetStep === lastVuStepRef.current) return;
      lastVuStepRef.current = targetStep;
      clearSubStepTimers();

      const rawVal = activePlayingSteps?.[targetStep];
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
        if (family === 'alfaia') dispatchAlfaiaPredictiveStroke(activeTrack, effStroke, isVibrate, isSubStep, isLeftHanded, activePlayingSteps, targetStep, subDurMs, leftStickRef.current, rightStickRef.current, haloRef.current, leftAnimRef, rightAnimRef, geometryRef.current, leadMs);
        else if (family === 'caixa' || family === 'tarol') dispatchCaixaPredictiveStroke(family, effStroke, isVibrate, isSubStep, isLeftHanded, activePlayingSteps, targetStep, subDurMs, leftStickRef.current, rightStickRef.current, haloRef.current, leftAnimRef, rightAnimRef, geometryRef.current, leadMs);
        else if (family === 'timbal') dispatchTimbalPredictiveStroke(effStroke, isVibrate, isSubStep, isLeftHanded, activePlayingSteps, targetStep, subDurMs, leftStickRef.current, rightStickRef.current, haloRef.current, leftAnimRef, rightAnimRef, geometryRef.current, leadMs);
        else if (family === 'mineiro') dispatchMineiro(effStroke, isVibrate, mineiroStickRef.current, mineiroPoleRef, mineiroAnimRef, isLeftHanded, activePlayingSteps, targetStep, subDurMs, isSubStep, leadMs);
        else if (family === 'agbe') {
          const nextRaw = activePlayingSteps?.[(targetStep + 1) % Math.max(1, activePlayingSteps.length)];
          dispatchAgbe(effStroke, isVibrate, agbeWholeRef.current, agbeAnimRef, Array.isArray(nextRaw) ? String(nextRaw[0] || '') : String(nextRaw || ''), activePlayingSteps, targetStep, subDurMs, isSubStep, leadMs);
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
