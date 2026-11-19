import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { subscribeToTick, unsubscribeFromTick, audioEngine } from '../../hooks/useAudioSync';
import { getLastAudibleTick } from '../../audio/visualTickBuffer';
import { getBluetoothVisualOffsetSec } from '../../utils/bluetoothLatencyStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getAudioTime } from '../circle-sequencer/circleAudioTime';
import {
  anchorBalancoMorphEnvelope,
  BalancoMorphPhase,
  getLiveBalancoMorphScaleAtTime,
  resolveBalancoMorphPhaseAtTime,
} from '../../audio/groove/liveBalancoMorph';
import { FocusMeasureStepsModel } from './focusBalancoTypes';
import { resolveFocusCycleButtonLabel } from './focusBalancoLayoutMath';
import { applyFocusBalancoDomFrame, FocusDomRefsBundle } from './updateFocusBalancoDomFrame';

export function useFocusBalancoRaf(params: FocusDomRefsBundle & {
  isOpen: boolean;
  compact: boolean;
  model: FocusMeasureStepsModel;
  lang: string;
  liveMeasureDurationRef: React.MutableRefObject<number>;
  onLiveMeasureChange: (mIdx: number) => void;
  onCycleActiveChange: (active: boolean) => void;
}): void {
  const modelRef = useRef(params.model);
  modelRef.current = params.model;
  const langRef = useRef(params.lang);
  langRef.current = params.lang;
  const compactRef = useRef(params.compact);
  compactRef.current = params.compact;
  const onMeasureRef = useRef(params.onLiveMeasureChange);
  onMeasureRef.current = params.onLiveMeasureChange;
  const onCycleRef = useRef(params.onCycleActiveChange);
  onCycleRef.current = params.onCycleActiveChange;

  const liveRef = useRef({ measure: 0, ratio: 0, time: 0, measureDuration: 2.4, isPreRoll: false });

  useEffect(() => {
    if (!params.isOpen) return;
    const handleTick = (evt: any) => {
      if (evt.isPaused || evt.step < 0) return;
      const prevM = liveRef.current.measure;
      liveRef.current.measure = evt.measure ?? 0;
      liveRef.current.ratio = evt.ratio ?? 0;
      liveRef.current.time = evt.time ?? 0;
      if (evt.measureDuration && evt.measureDuration > 0) {
        liveRef.current.measureDuration = evt.measureDuration;
        params.liveMeasureDurationRef.current = evt.measureDuration;
      }
      liveRef.current.isPreRoll = Boolean(evt.isPreRoll);
      if (evt.measure !== undefined && evt.measure !== prevM) onMeasureRef.current(evt.measure);
    };
    const last = getLastAudibleTick();
    if (last && last.drawTime > 0) handleTick(last);
    subscribeToTick(handleTick);
    return () => unsubscribeFromTick(handleTick);
  }, [params.isOpen, params.liveMeasureDurationRef]);

  useEffect(() => {
    if (!params.isOpen) return;
    let rafId: number | null = null;
    let lastDrawMs = 0;
    let lastPhase: BalancoMorphPhase = 'idle';
    let lastCycleLabel = '';
    const lastShownPctRef = { current: -1 };

    const frame = (nowMs: number) => {
      const st = useSequencerStore.getState();
      if (st.isEcoMode && nowMs - lastDrawMs < 32) {
        rafId = requestAnimationFrame(frame);
        return;
      }
      lastDrawMs = nowMs;

      const ctxTime = getAudioTime();
      const rawCtx = Tone.getContext().rawContext as AudioContext;
      const baseLat = typeof rawCtx?.outputLatency === 'number' && !isNaN(rawCtx.outputLatency) ? rawCtx.outputLatency : 0.05;
      const audibleAudioSec = Math.max(0, ctxTime - (baseLat + getBluetoothVisualOffsetSec()));
      const isPlaying = st.isPlaying || Boolean(audioEngine?.getIsPlaying());
      const live = liveRef.current;

      if (resolveBalancoMorphPhaseAtTime(audibleAudioSec) === 'waiting-play' && isPlaying && !st.isPreRolling && !live.isPreRoll && ctxTime > 0) {
        anchorBalancoMorphEnvelope(ctxTime, live.measureDuration || 2.4);
      }
      const nextPhase = resolveBalancoMorphPhaseAtTime(audibleAudioSec);
      if (nextPhase !== lastPhase) {
        const wasActive = lastPhase !== 'idle', nowActive = nextPhase !== 'idle';
        lastPhase = nextPhase;
        if (wasActive !== nowActive) onCycleRef.current(nowActive);
      }
      const nextLabel = resolveFocusCycleButtonLabel(nextPhase, langRef.current, compactRef.current);
      if (nextLabel !== lastCycleLabel && params.cycleLabelRef.current) {
        lastCycleLabel = nextLabel;
        params.cycleLabelRef.current.textContent = nextLabel;
      }

      const scale = getLiveBalancoMorphScaleAtTime(audibleAudioSec);
      let playheadRatio = live.ratio || 0;
      if (isPlaying && !live.isPreRoll && live.time > 0 && live.measureDuration > 0) {
        const elapsed = Math.max(0, ctxTime - live.time);
        if (elapsed <= 0.14) playheadRatio = (live.ratio + elapsed / live.measureDuration) % 1;
      }

      applyFocusBalancoDomFrame(params, modelRef.current, scale, playheadRatio, isPlaying, live.isPreRoll, live.measureDuration, lastShownPctRef);
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => { if (rafId !== null) cancelAnimationFrame(rafId); };
  }, [params.isOpen]);
}
