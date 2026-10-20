import { useEffect } from 'react';
import * as Tone from 'tone';
import { instrumentsConfig, getMaxTicks } from '../../data';
import { getMeasureStartTick } from './audioParamsCache';
import { initBusesAudioNodes } from './audioBusInitializer';
import { initTrackChannelsAudioNodes } from './audioTrackChannelsInitializer';
import { startVisualLoop, stopVisualLoop, registerAudioEngineSyncTarget } from '../../audio/visualTickBuffer';
import { stopAllNativeOscillators } from '../../audio/nativeSynths';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { AudioEngine } from '../../AudioEngine';
import { InputManager } from '../../InputManager';
import { audioEngine, setAudioEngine, setInputManager, channels } from './audioEngineNodes';

export interface AudioInitProps {
  tracksRef: { current: any[] };
  measureTimeSigsRef: { current: Record<number, string> };
  totalMeasuresRef: { current: number };
  currentStepIndexRef: { current: number };
  measureCountRef: { current: number };
  maxTicksRef: { current: number };
  absoluteTickCountRef: { current: number };
  currentMeasureStartTickRef: { current: number };
  hitTriggersRef: { current: Map<number, any> };
  engineTimeoutsRef: { current: Set<number> };
  isAudioInitializedRef: { current: boolean };
  lastAppliedBussesRef: { current: any };
  lastAppliedTracksParamsRef: { current: any };
  onTickRef: { current: (time: number) => boolean };
  getTickDurationRef: { current: () => number };
  setIsLoading: (l: boolean) => void;
}

export function useAudioInitialization(p: AudioInitProps): void {
  const {
    tracksRef, measureTimeSigsRef, totalMeasuresRef, currentStepIndexRef,
    measureCountRef, maxTicksRef, absoluteTickCountRef, currentMeasureStartTickRef,
    hitTriggersRef, engineTimeoutsRef, isAudioInitializedRef,
    lastAppliedBussesRef, lastAppliedTracksParamsRef, onTickRef,
    getTickDurationRef, setIsLoading
  } = p;

  useEffect(() => {
    const initAudio = async () => {
      try {
        initBusesAudioNodes(tracksRef.current, false, lastAppliedBussesRef as any, lastAppliedTracksParamsRef as any);
        initTrackChannelsAudioNodes(tracksRef.current, false, lastAppliedBussesRef as any, lastAppliedTracksParamsRef as any, null);
        isAudioInitializedRef.current = true;

        const rawCtx = Tone.getContext().rawContext as AudioContext;
        const engine = new AudioEngine(
          rawCtx,
          (time) => onTickRef.current(time),
          () => (getTickDurationRef.current ? getTickDurationRef.current() : 2.5 / 100),
          (measureIdx) => {
            const timeSig = measureTimeSigsRef.current[measureIdx % (totalMeasuresRef.current || 1)] || '4/4';
            return getMaxTicks(timeSig as any);
          }
        );
        setAudioEngine(engine);
        (window as any).__AUDIO_ENGINE__ = engine;

        engine.setOnPositionJump((step, measure) => {
          currentStepIndexRef.current = step === 0 ? -1 : step - 1;
          measureCountRef.current = measure;
          const targetSig = measureTimeSigsRef.current[measure % (totalMeasuresRef.current || 1)] || '4/4';
          maxTicksRef.current = getMaxTicks(targetSig as any);
          absoluteTickCountRef.current = getMeasureStartTick(measure, measureTimeSigsRef.current) + step;
          currentMeasureStartTickRef.current = getMeasureStartTick(measure, measureTimeSigsRef.current);
        });
        registerAudioEngineSyncTarget(engine as any);

        const inputMgr = new InputManager(engine);
        setInputManager(inputMgr);

        tracksRef.current.forEach((t) => {
          if (!t.isBusFolder) {
            const inst = instrumentsConfig[t.instrumentIdx];
            if (inst && channels[t.id]) {
              engine.setInstrumentChannel(t.id, inst.id, channels[t.id]);
            }
          }
        });

        startVisualLoop(rawCtx, hitTriggersRef as any);
      } catch (err) {
        console.error("❌ Critical error during initAudio:", err);
      } finally {
        if (audioEngine) {
          audioEngine.loadAllSamples().catch(() => {});
        }
        vocalEngineService.rehydrateVocalBuffers(tracksRef.current).catch((e) => {
          console.error("🎙️ [VOCAL REHYDRATE] Background rehydration error in initAudio:", e);
        });
        setIsLoading(false);
      }
    };

    initAudio();

    return () => {
      stopVisualLoop();
      registerAudioEngineSyncTarget(null);
      if (audioEngine) {
        audioEngine.stop();
      }
      engineTimeoutsRef.current.forEach((t) => clearTimeout(t));
      engineTimeoutsRef.current.clear();
      stopAllNativeOscillators();
    };
  }, []);
}
