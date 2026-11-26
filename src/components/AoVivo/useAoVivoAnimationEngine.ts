import { useEffect, useRef } from 'react';
import { CONFIG_ALFAIA_STICKS } from '../../audio/animations/alfaiaStickConfig';
import { isBarulhoRollActive, resetBarulhoRollState } from '../../audio/animations/barulhoRollPlanner';
import { MineiroPole } from '../../audio/animationGenerators';
import { useSequencer } from '../../contexts/SequencerContext';
import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { getPhysicalStepFromRatio } from '../circle-sequencer/measurePatternHelpers';
import { computeAoVivoHitLeadMs } from './aoVivoHitTiming';
import { pauseAoVivoAnimations, prepareAoVivoForStepPreview, resumeAoVivoAnimations } from './aoVivoFreezeHelper';
import { AoVivoBarCacheEntry, resolveCachedAoVivoBarForTick } from './aoVivoMeasureBarCache';
import { resetAoVivoRestPosition } from './aoVivoReset';
import { cancelAoVivoShockwave } from './AoVivoShockwave';
import { AoVivoResolvedFamily } from './resolveAoVivoFamily';
import { clearPendingAoVivoSubSteps, dispatchAoVivoStepStrokes, PendingSubStepTimer } from './aoVivoStrokeDispatcher';

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
  const mineiroPoleRef = useRef<MineiroPole>('backWeak');
  const lastDispatchedKeyRef = useRef<string>('');
  const isInSilentMeasureRef = useRef<boolean>(false);
  const subStepTimersRef = useRef<PendingSubStepTimer[]>([]);
  const barCacheRef = useRef<AoVivoBarCacheEntry | null>(null);

  const livePropsRef = useRef({ activeAoVivoTrackId, isLeftHanded, activeTrack, family, isSyntheticPreview, isPreRolling });
  livePropsRef.current = { activeAoVivoTrackId, isLeftHanded, activeTrack, family, isSyntheticPreview, isPreRolling };
  const prevIdentityRef = useRef<string | null>(null);
  const leftStickMode = CONFIG_ALFAIA_STICKS.leftStickMode;

  const resetEngineToRest = () => {
    clearPendingAoVivoSubSteps(subStepTimersRef);
    resetBarulhoRollState();
    barCacheRef.current = null;
    lastDispatchedKeyRef.current = ''; isInSilentMeasureRef.current = false;
    allAnimRefs.forEach((r) => r.current?.cancel()); cancelAoVivoShockwave(haloRef.current);
    const p = livePropsRef.current;
    resetAoVivoRestPosition(p.family ?? undefined, p.isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, mineiroStickRef, agbeWholeRef, p.activeTrack);
  };

  useEffect(() => {
    const onResume = () => resumeAoVivoAnimations(allAnimRefs, haloRef.current);
    window.addEventListener('o-girador-playback-stopped', resetEngineToRest);
    window.addEventListener('o-girador-playback-resumed', onResume);
    return () => {
      window.removeEventListener('o-girador-playback-stopped', resetEngineToRest);
      window.removeEventListener('o-girador-playback-resumed', onResume);
    };
  }, [leftStickRef, rightStickRef, gongueStickRef, mineiroStickRef, agbeWholeRef, haloRef]);

  useEffect(() => {
    const identityKey = `${String(activeAoVivoTrackId ?? '')}|${family ?? ''}|${isLeftHanded ? 'L' : 'R'}|${leftStickMode}`;
    const identityChanged = prevIdentityRef.current !== identityKey;
    prevIdentityRef.current = identityKey;
    if (isPreRolling || !useSequencerStore.getState().isPlaying || identityChanged) {
      resetEngineToRest();
    }
  }, [activeAoVivoTrackId, family, isLeftHanded, leftStickMode, isPreRolling]);

  useEffect(() => {
    const handleTick = (detail: any) => {
      const { step, measure, maxTicks, ratio = step / maxTicks, isStepPreview } = detail;
      const p = livePropsRef.current;
      if (detail.isPaused && !isStepPreview && step >= 0) {
        clearPendingAoVivoSubSteps(subStepTimersRef); pauseAoVivoAnimations(allAnimRefs, haloRef.current); return;
      }
      if (p.isPreRolling || Boolean(detail.isPreRoll) || step < 0) { resetEngineToRest(); return; }
      if (!p.family || p.isSyntheticPreview || !p.activeTrack) { lastDispatchedKeyRef.current = ''; return; }

      const state = useSequencerStore.getState(), trState = useTransportStore.getState();
      const soloPlayId = trState.soloPatternPlayId ?? null, measureSeqId = isStepPreview ? undefined : detail.measureSeqId;
      const bar = resolveCachedAoVivoBarForTick({
        cacheRef: barCacheRef, activeTrack: p.activeTrack, family: p.family, measure, measureSeqId,
        soloPlayId, soloVarId: trState.soloPatternVariationId ?? null, isStepPreview: Boolean(isStepPreview),
        varMap: activeVariationsRef?.current, state,
      });

      if (!bar || !bar.pattern || !bar.effectivePattern) {
        clearPendingAoVivoSubSteps(subStepTimersRef); lastDispatchedKeyRef.current = '';
        if (bar && (!isInSilentMeasureRef.current || isBarulhoRollActive())) {
          isInSilentMeasureRef.current = true;
          allAnimRefs.forEach((r) => r.current?.cancel()); cancelAoVivoShockwave(haloRef.current);
          resetAoVivoRestPosition(p.family, p.isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, mineiroStickRef, agbeWholeRef, p.activeTrack);
        }
        return;
      }
      isInSilentMeasureRef.current = false;

      const stepInMeasure = Math.max(0, getPhysicalStepFromRatio(ratio, bar.effectivePattern, bar.stepsPerMeasure, bar.beatsCount, bar.beatRes));
      const targetStep = bar.stepOffset + stepInMeasure;
      const dispatchKey = `${measureSeqId ?? 0}:${measure}:${targetStep}:${bar.pattern.id}`;
      if (!isStepPreview && dispatchKey === lastDispatchedKeyRef.current) return;
      lastDispatchedKeyRef.current = dispatchKey;

      const rawVal = bar.currSlice[stepInMeasure];
      if (isStepPreview) {
        clearPendingAoVivoSubSteps(subStepTimersRef);
        prepareAoVivoForStepPreview(allAnimRefs, haloRef.current, p.family, p.isLeftHanded, p.activeTrack, rawVal, leftStickRef.current, rightStickRef.current, leftAnimRef, rightAnimRef);
      }
      if ((!rawVal || rawVal === '-' || rawVal === '0' || rawVal === 0) && !isBarulhoRollActive(p.family)) return;

      dispatchAoVivoStepStrokes({
        detail, rawVal, family: p.family, activeTrack: p.activeTrack, concreteTrack: bar.concreteTrack,
        effectivePattern: bar.effectivePattern, effectiveMicrotimings: bar.effectiveMicrotimings, currentSig: bar.currentSig,
        isLeftHanded: p.isLeftHanded, isStepPreview: Boolean(isStepPreview),
        lookaheadSteps: bar.lookaheadSteps, lookaheadDurationsMs: bar.lookaheadDurationsMs,
        stepInMeasure, targetStep, stepDurationMs: bar.currStepDursMs[stepInMeasure] ?? 150, geometry: geometryRef.current,
        leftStickEl: leftStickRef.current, rightStickEl: rightStickRef.current,
        mineiroStickEl: mineiroStickRef.current, agbeWholeEl: agbeWholeRef.current,
        gongueStickEl: gongueStickRef.current, haloEl: haloRef.current,
        leftAnimRef, rightAnimRef, mineiroAnimRef, agbeAnimRef, gongueAnimRef, mineiroPoleRef, subStepTimersRef,
      });
    };

    subscribeToTick(handleTick);
    return () => { unsubscribeFromTick(handleTick); clearPendingAoVivoSubSteps(subStepTimersRef); };
  }, [geometryRef, leftStickRef, rightStickRef, mineiroStickRef, agbeWholeRef, gongueStickRef, haloRef, activeVariationsRef]);

  return { leftAnimRef, rightAnimRef };
}
