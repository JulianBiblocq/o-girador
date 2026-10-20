import { useRef } from 'react';
import { UseAudioSyncProps, TickCallbackDetail } from './audioSyncTypes';
import { GlobalSwing, Track, HitTriggerPool } from '../../types';

export function useAudioSyncRefs(props: UseAudioSyncProps) {
  const isPlayingRef = useRef(false);
  const isStartingRef = useRef(false);
  const currentStepIndexRef = useRef(-1);
  const measureCountRef = useRef(0);
  const maxTicksRef = useRef(16);
  const absoluteTickCountRef = useRef(0);
  const currentMeasureStartTickRef = useRef(0);
  const totalMeasuresRef = useRef(props.totalMeasures);
  totalMeasuresRef.current = props.totalMeasures;
  const tracksRef = useRef<Track[]>(props.tracksRef?.current as any || []);
  tracksRef.current = props.tracksRef?.current as any || [];
  const measureTimeSigsRef = useRef(props.measureTimeSigs);
  measureTimeSigsRef.current = props.measureTimeSigs;
  const measureBpmsRef = useRef(props.measureBpms);
  measureBpmsRef.current = props.measureBpms;

  const isMetroOnRef = useRef(false);
  const metroVolumeRef = useRef(80);
  const metroSoundRef = useRef<'synth' | 'clave' | 'cowbell'>('synth');
  const metroChannelRef = useRef<any>(null);

  const globalSwingRef = useRef<GlobalSwing>({ mode: 'off', customOffsets: [0, 0, 0, 0] });
  const soloPatternPlayIdRef = useRef<number | null>(null);
  const soloPatternVariationIdRef = useRef<string | null>(null);
  const soloLoopCycleRef = useRef(0);
  const soloPhraseMeasureRef = useRef(0);
  const isLoopRegionActiveRef = useRef(false);
  const loopStartRef = useRef<number | null>(null);
  const loopEndRef = useRef<number | null>(null);
  const isLoopingRef = useRef(true);
  const isPlaybackEndingRef = useRef(false);

  const hitTriggersRef = useRef<HitTriggerPool>(new HitTriggerPool());
  const engineTimeoutsRef = useRef(new Set<number>());
  const autoStopTimeoutRef = useRef<number | null>(null);
  const speedTrainerTimeoutsRef = useRef<number[]>([]);
  const speedTrainerCurrentBpmRef = useRef(100);
  const speedTrainerConsolidationLapsDoneRef = useRef(0);

  const activeSequencerVocalsRef = useRef(new Map<string, any>());
  const anticipatedMeasuresRef = useRef(new Set<string>());
  const mutedVoiceTracksRef = useRef(new Set<string | number>());
  const lastPlayedPatternRef = useRef<Record<number, any>>({});
  const lastPlayedSignalIdRef = useRef<string | null>(null);

  const anchoredMeasureStartSecRef = useRef(0);
  const anchoredMeasureIdxRef = useRef(-1);
  const lastElapsedSecRef = useRef(0);
  const isPreRollActiveRef = useRef(false);
  const preRollTotalMeasuresRef = useRef(1);
  const preRollRemainingMeasuresRef = useRef(1);
  const targetPreRollMeasureRef = useRef(0);

  const isAudioInitializedRef = useRef(false);
  const flatCompiledScheduleRef = useRef<Float64Array | null>(null);
  const flatArrayPointerRef = useRef(0);
  const lastCompiledScheduleRef = useRef<Float64Array | null>(null);
  const lastAbsoluteTickRef = useRef(-1);
  const familyMuteSetRef = useRef(new Set<string>());
  const savedSoloMuteStateRef = useRef<any>(null);
  const lastAppliedTracksParamsRef = useRef<Record<string | number, string>>({});
  const lastAppliedBussesRef = useRef<Record<string | number, string | number | null>>({});

  const sectionIterationRef = useRef(1);
  const pendingMeasureRef = useRef<number | null>(null);
  const pendingIterationRef = useRef<number | null>(null);
  const hasFinishedRef = useRef(false);

  const tickEventDetailRef = useRef<TickCallbackDetail>({
    step: -1,
    measure: 0,
    maxTicks: 16,
    ratio: 0,
    visualStep16: 0,
    visualStep12: 0,
    time: 0,
    iteration: 1,
  });

  return {
    isPlayingRef, isStartingRef, currentStepIndexRef, measureCountRef, maxTicksRef,
    absoluteTickCountRef, currentMeasureStartTickRef, totalMeasuresRef, tracksRef,
    measureTimeSigsRef, measureBpmsRef, isMetroOnRef, metroVolumeRef, metroSoundRef,
    metroChannelRef, globalSwingRef, soloPatternPlayIdRef, soloPatternVariationIdRef,
    soloLoopCycleRef, soloPhraseMeasureRef, isLoopRegionActiveRef, loopStartRef,
    loopEndRef, isLoopingRef, isPlaybackEndingRef, hitTriggersRef, engineTimeoutsRef,
    autoStopTimeoutRef, speedTrainerTimeoutsRef, speedTrainerCurrentBpmRef,
    speedTrainerConsolidationLapsDoneRef, activeSequencerVocalsRef, anticipatedMeasuresRef,
    mutedVoiceTracksRef, lastPlayedPatternRef, lastPlayedSignalIdRef,
    anchoredMeasureStartSecRef, anchoredMeasureIdxRef, lastElapsedSecRef,
    isPreRollActiveRef, preRollTotalMeasuresRef, preRollRemainingMeasuresRef,
    targetPreRollMeasureRef, isAudioInitializedRef, flatCompiledScheduleRef,
    flatArrayPointerRef, lastCompiledScheduleRef, lastAbsoluteTickRef,
    familyMuteSetRef, savedSoloMuteStateRef, lastAppliedTracksParamsRef,
    lastAppliedBussesRef, sectionIterationRef, pendingMeasureRef,
    pendingIterationRef, hasFinishedRef, tickEventDetailRef,
  };
}
