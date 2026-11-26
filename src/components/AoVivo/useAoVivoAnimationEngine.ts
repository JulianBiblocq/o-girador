import { useEffect, useRef } from 'react';
import { CONFIG_ALFAIA_STICKS } from '../../audio/animations/alfaiaStickConfig';
import { isBarulhoRollActive, resetBarulhoRollState } from '../../audio/animations/barulhoRollPlanner';
import { MineiroPole } from '../../audio/animationGenerators';
import { subscribeToLookaheadTick, unsubscribeFromLookaheadTick } from '../../audio/visualTickBuffer';
import { useSequencer } from '../../contexts/SequencerContext';
import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { getPhysicalStepFromRatio } from '../circle-sequencer/measurePatternHelpers';
import { computeAoVivoHitLeadMs } from './aoVivoHitTiming';
import { cancelAllAoVivoElementSlots, pauseAoVivoAnimations, prepareAoVivoForStepPreview, resumeAoVivoAnimations } from './aoVivoFreezeHelper';
import { AoVivoBarCacheEntry, resolveCachedAoVivoBarForTick } from './aoVivoMeasureBarCache';
import { resetAoVivoRestPosition } from './aoVivoReset';
import { cancelAoVivoShockwave } from './AoVivoShockwave';
import { AoVivoResolvedFamily } from './resolveAoVivoFamily';
import { resolveAoVivoStepPhaseAndAnchor } from './aoVivoStepPhaseHelper';
import { dispatchAoVivoStepStrokes } from './aoVivoStrokeDispatcher';

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
  const barCacheRef = useRef<AoVivoBarCacheEntry | null>(null);

  const livePropsRef = useRef({ activeAoVivoTrackId, isLeftHanded, activeTrack, family, isSyntheticPreview, isPreRolling });
  livePropsRef.current = { activeAoVivoTrackId, isLeftHanded, activeTrack, family, isSyntheticPreview, isPreRolling };
  const prevIdentityRef = useRef<string | null>(null);
  const leftStickMode = CONFIG_ALFAIA_STICKS.leftStickMode;
  const getRootEls = () => [leftStickRef.current, rightStickRef.current, gongueStickRef.current, mineiroStickRef.current, agbeWholeRef.current];

  const resetEngineToRest = () => {
    resetBarulhoRollState(); barCacheRef.current = null;
    lastDispatchedKeyRef.current = ''; isInSilentMeasureRef.current = false;
    cancelAllAoVivoElementSlots(getRootEls());
    allAnimRefs.forEach((r) => { try { r.current?.cancel(); } catch (_) {} r.current = null; });
    cancelAoVivoShockwave(haloRef.current);
    const p = livePropsRef.current;
    resetAoVivoRestPosition(p.family ?? undefined, p.isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, mineiroStickRef, agbeWholeRef, p.activeTrack);
  };

  useEffect(() => {
    const onResume = () => resumeAoVivoAnimations(allAnimRefs, haloRef.current, getRootEls());
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
    if (isPreRolling || !useSequencerStore.getState().isPlaying || identityChanged) resetEngineToRest();
  }, [activeAoVivoTrackId, family, isLeftHanded, leftStickMode, isPreRolling]);

  useEffect(() => {
    const processStrokeEvent = (detail: any, isFromLookahead: boolean) => {
      const { step, measure, maxTicks, ratio = step / maxTicks, isStepPreview } = detail;
      const p = livePropsRef.current;
      if (!isFromLookahead) {
        if (detail.isPaused && !isStepPreview && step >= 0) { pauseAoVivoAnimations(allAnimRefs, haloRef.current, getRootEls()); return; }
        if (p.isPreRolling || Boolean(detail.isPreRoll) || step < 0 || detail.isNavigation) { resetEngineToRest(); return; }
        if (!isStepPreview) return;
      } else if (p.isPreRolling || Boolean(detail.isPreRoll) || step < 0) return;
      if (!p.family || p.isSyntheticPreview || !p.activeTrack) { lastDispatchedKeyRef.current = ''; return; }

      const state = useSequencerStore.getState(), trState = useTransportStore.getState();
      const soloPlayId = trState.soloPatternPlayId ?? null, measureSeqId = isStepPreview ? undefined : detail.measureSeqId;
      const bar = resolveCachedAoVivoBarForTick({
        cacheRef: barCacheRef, activeTrack: p.activeTrack, family: p.family, measure, measureSeqId,
        soloPlayId, soloVarId: trState.soloPatternVariationId ?? null, isStepPreview: Boolean(isStepPreview),
        varMap: activeVariationsRef?.current, state,
      });

      if (!bar || !bar.pattern || !bar.effectivePattern) {
        lastDispatchedKeyRef.current = '';
        if (bar && (!isInSilentMeasureRef.current || isBarulhoRollActive())) {
          isInSilentMeasureRef.current = true;
          cancelAllAoVivoElementSlots(getRootEls()); cancelAoVivoShockwave(haloRef.current);
          resetAoVivoRestPosition(p.family, p.isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, mineiroStickRef, agbeWholeRef, p.activeTrack);
        }
        return;
      }
      isInSilentMeasureRef.current = false;

      const stepInMeasure = Math.max(0, getPhysicalStepFromRatio(ratio, bar.effectivePattern, bar.stepsPerMeasure, bar.beatsCount, bar.beatRes));
      const targetStep = bar.stepOffset + stepInMeasure, rawVal = bar.currSlice[stepInMeasure];
      const { subPhase, stepAnchorDrawSec, stepAnchorAudioSec } = resolveAoVivoStepPhaseAndAnchor(detail, bar, stepInMeasure, rawVal, ratio, Boolean(isStepPreview));
      const dispatchKey = `${measureSeqId ?? 0}:${measure}:${targetStep}:${subPhase}:${bar.pattern.id}`;
      if (!isStepPreview && dispatchKey === lastDispatchedKeyRef.current) return;
      lastDispatchedKeyRef.current = dispatchKey;

      if (isStepPreview) prepareAoVivoForStepPreview(allAnimRefs, haloRef.current, p.family, p.isLeftHanded, p.activeTrack, rawVal, leftStickRef.current, rightStickRef.current, leftAnimRef, rightAnimRef);
      if ((!rawVal || rawVal === '-' || rawVal === '0' || rawVal === 0) && !isBarulhoRollActive(p.family)) return;

      dispatchAoVivoStepStrokes({
        detail, rawVal, subPhase, stepAnchorDrawSec, stepAnchorAudioSec, family: p.family, activeTrack: p.activeTrack, concreteTrack: bar.concreteTrack,
        effectivePattern: bar.effectivePattern, effectiveMicrotimings: bar.effectiveMicrotimings, currentSig: bar.currentSig,
        isLeftHanded: p.isLeftHanded, isStepPreview: Boolean(isStepPreview),
        lookaheadSteps: bar.lookaheadSteps, lookaheadDurationsMs: bar.lookaheadDurationsMs,
        stepInMeasure, targetStep, stepDurationMs: bar.currStepDursMs[stepInMeasure] ?? 150, geometry: geometryRef.current,
        leftStickEl: leftStickRef.current, rightStickEl: rightStickRef.current,
        mineiroStickEl: mineiroStickRef.current, agbeWholeEl: agbeWholeRef.current,
        gongueStickEl: gongueStickRef.current, haloEl: haloRef.current,
        leftAnimRef, rightAnimRef, mineiroAnimRef, agbeAnimRef, gongueAnimRef, mineiroPoleRef,
      });
    };

    const onSyncTick = (d: any) => processStrokeEvent(d, false);
    const onLookaheadTick = (d: any) => processStrokeEvent(d, true);
    subscribeToTick(onSyncTick); subscribeToLookaheadTick(onLookaheadTick);
    return () => { unsubscribeFromTick(onSyncTick); unsubscribeFromLookaheadTick(onLookaheadTick); };
  }, [geometryRef, leftStickRef, rightStickRef, mineiroStickRef, agbeWholeRef, gongueStickRef, haloRef, activeVariationsRef]);

  return { leftAnimRef, rightAnimRef };
}
