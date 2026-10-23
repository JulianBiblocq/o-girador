import { useEffect, useRef } from 'react';
import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencer } from '../../contexts/SequencerContext';
import { resolvePatternForMeasure } from '../circle-sequencer/measurePatternHelpers';
import { dispatchAlfaiaOrDrum, dispatchTimbal } from './aoVivoStrokeDispatchers';
import { dispatchMineiro, dispatchAgbe, dispatchGongue } from './aoVivoOtherDispatchers';
import { resetAoVivoRestPosition } from './aoVivoReset';
import { MineiroPole } from '../../audio/animationGenerators';
import { getMeasureDurationSec } from '../../utils/meterTiming';

export function useAoVivoAnimationEngine(
  activeAoVivoTrackId: string | number,
  isLeftHanded: boolean,
  activeTrack: any,
  inst: any,
  geometryRef: React.MutableRefObject<{ targetX: number; targetY: number; width: number; height: number }>,
  leftStickRef: React.RefObject<SVGSVGElement | null>,
  rightStickRef: React.RefObject<SVGSVGElement | null>,
  mineiroStickRef: React.RefObject<SVGSVGElement | null>,
  agbeWholeRef: React.RefObject<SVGGElement | null>,
  gongueStickRef: React.RefObject<SVGSVGElement | null>,
  haloRef: React.RefObject<HTMLDivElement | null>,
  voiceWrapperRef: React.RefObject<HTMLDivElement | null>
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
    if (isPreRolling) {
      clearSubStepTimers();
      lastVuStepRef.current = -1;
      leftAnimRef.current?.cancel();
      rightAnimRef.current?.cancel();
      gongueAnimRef.current?.cancel();
      agbeAnimRef.current?.cancel();
      mineiroAnimRef.current?.cancel();
      resetAoVivoRestPosition(inst?.id, isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, mineiroStickRef, agbeWholeRef);
    }
  }, [isPreRolling, inst, isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, mineiroStickRef, agbeWholeRef]);

  useEffect(() => {
    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number; isPreRoll?: boolean }) => {
      const { step, measure, maxTicks, ratio = step / maxTicks } = detail;
      if (isPreRolling || Boolean((detail as any).isPreRoll) || step < 0) {
        clearSubStepTimers();
        lastVuStepRef.current = -1;
        leftAnimRef.current?.cancel(); rightAnimRef.current?.cancel();
        gongueAnimRef.current?.cancel(); agbeAnimRef.current?.cancel(); mineiroAnimRef.current?.cancel();
        resetAoVivoRestPosition(inst?.id, isLeftHanded, leftStickRef, rightStickRef, gongueStickRef, mineiroStickRef, agbeWholeRef);
        return;
      }

      const pattern = resolvePatternForMeasure(activeTrack, measure, null) || activeTrack?.patterns?.[0];
      if (!pattern) { lastVuStepRef.current = -1; return; }

      const patSteps = pattern.steps || 16;
      const targetStep = Math.min(patSteps - 1, Math.max(0, Math.floor(ratio * patSteps)));
      if (targetStep === lastVuStepRef.current) return;
      lastVuStepRef.current = targetStep;
      clearSubStepTimers();

      const activePlayingSteps = (activeVariationsRef?.current?.[activeTrack.id]) || pattern.activeSteps;
      const rawVal = activePlayingSteps?.[targetStep];
      if (!rawVal || rawVal === '-' || rawVal === '.' || rawVal === '0' || rawVal === 0) return;

      const triggerStroke = (stroke: string, isSubStep: boolean) => {
        if (!inst) return;
        const isVibrate = stroke === '~';
        if (['marcante', 'meiao', 'repique', 'caixa', 'tarol'].includes(inst.id)) {
          dispatchAlfaiaOrDrum(inst.id, stroke, isVibrate, isSubStep, isLeftHanded, leftStickRef.current, rightStickRef.current, haloRef.current, leftAnimRef, rightAnimRef, geometryRef.current);
        } else if (inst.id === 'timbal') {
          dispatchTimbal(stroke, isVibrate, isLeftHanded, leftStickRef.current, rightStickRef.current, haloRef.current, leftAnimRef, rightAnimRef, geometryRef.current);
        } else if (inst.id === 'mineiro') {
          dispatchMineiro(stroke, isVibrate, mineiroStickRef.current, mineiroPoleRef, mineiroAnimRef);
        } else if (inst.id === 'agbe') {
          dispatchAgbe(stroke, isVibrate, agbeWholeRef.current, agbeAnimRef);
        } else if (inst.id === 'gongue') {
          dispatchGongue(stroke, isVibrate, gongueStickRef.current, gongueAnimRef);
        }
      };

      const state = useSequencerStore.getState();
      const currentSig = state.measureTimeSigs?.[measure] || state.timeSig || '4/4';
      const currentBpm = state.measureBpms?.[measure] || state.bpm || 100;
      const measureDurationSec = getMeasureDurationSec(currentSig, currentBpm);
      const stepDurationMs = Math.max(40, (measureDurationSec * 1000) / patSteps);

      if (Array.isArray(rawVal)) {
        triggerStroke(String(rawVal[0]), false);
        const subDelay = Math.max(20, Math.round(stepDurationMs / 2));
        subStepTimersRef.current.push(setTimeout(() => triggerStroke(String(rawVal[1]), true), subDelay));
      } else {
        triggerStroke(String(rawVal), false);
      }
    };

    subscribeToTick(handleTick);
    return () => { unsubscribeFromTick(handleTick); clearSubStepTimers(); };
  }, [activeAoVivoTrackId, isLeftHanded, activeTrack, inst, isPreRolling, geometryRef, leftStickRef, rightStickRef, mineiroStickRef, agbeWholeRef, gongueStickRef, haloRef, activeVariationsRef]);

  return { leftAnimRef, rightAnimRef };
}
