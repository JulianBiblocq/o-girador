import { useRef, useEffect } from 'react';
import { TrackGroup, TimeSignature, SongSection, SongMarker } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';

export function useSequencerStateRefs() {
  const tracksRef = useRef<TrackGroup[]>([]);
  const totalMeasuresRef = useRef<number>(8);
  const measureTimeSigsRef = useRef<TimeSignature[]>([]);
  const measureBpmsRef = useRef<number[]>([]);
  const measureBpmTransitionsRef = useRef<('immediate' | 'ramp' | 'bezier')[]>([]);
  const measureVolsRef = useRef<number[]>([]);
  const measureVolTransitionsRef = useRef<('immediate' | 'ramp' | 'bezier')[]>([]);
  const songSectionsRef = useRef<SongSection[]>([]);
  const songMarkersRef = useRef<SongMarker[]>([]);
  const measureSignalsRef = useRef<(string | null)[]>([]);
  const pendingStructureActionRef = useRef<{ type: 'insert' | 'delete'; measureIdx: number } | null>(null);

  const loopStartRef = useRef<number | null>(null);
  const loopEndRef = useRef<number | null>(null);
  const isLoopRegionActiveRef = useRef<boolean>(true);
  const loopModeRef = useRef<'infinite' | number>('infinite');
  const isLoopExitRequestedRef = useRef<boolean>(false);
  const isLoopingRef = useRef<boolean>(true);
  const activeVariationsRef = useRef<Record<number, (string | number)[]>>({});
  const lastExpandedRef = useRef<{ baseMeasure: number; iteration: number }[]>([]);

  useEffect(() => {
    const unsub = useSequencerStore.subscribe((state) => {
      tracksRef.current = state.tracks;
      totalMeasuresRef.current = state.totalMeasures;
      measureTimeSigsRef.current = state.measureTimeSigs;
      songSectionsRef.current = state.songSections;
      songMarkersRef.current = state.songMarkers;
      loopStartRef.current = state.loopStartMeasure;
      loopEndRef.current = state.loopEndMeasure;
      isLoopRegionActiveRef.current = state.isLoopRegionActive;
      isLoopingRef.current = state.isLooping;
      loopModeRef.current = state.loopMode;
      isLoopExitRequestedRef.current = state.isLoopExitRequested;
      measureBpmsRef.current = state.measureBpms;
      measureBpmTransitionsRef.current = state.measureBpmTransitions;
      measureVolsRef.current = state.measureVols;
      measureVolTransitionsRef.current = state.measureVolTransitions;
      measureSignalsRef.current = state.measureSignals;
    });

    const state = useSequencerStore.getState();
    tracksRef.current = state.tracks;
    totalMeasuresRef.current = state.totalMeasures;
    measureTimeSigsRef.current = state.measureTimeSigs;
    songSectionsRef.current = state.songSections;
    songMarkersRef.current = state.songMarkers;
    loopStartRef.current = state.loopStartMeasure;
    loopEndRef.current = state.loopEndMeasure;
    isLoopRegionActiveRef.current = state.isLoopRegionActive;
    isLoopingRef.current = state.isLooping;
    loopModeRef.current = state.loopMode;
    isLoopExitRequestedRef.current = state.isLoopExitRequested;
    measureBpmsRef.current = state.measureBpms;
    measureBpmTransitionsRef.current = state.measureBpmTransitions;
    measureVolsRef.current = state.measureVols;
    measureVolTransitionsRef.current = state.measureVolTransitions;
    measureSignalsRef.current = state.measureSignals;

    return unsub;
  }, []);

  return {
    tracksRef, totalMeasuresRef, measureTimeSigsRef, measureBpmsRef,
    measureBpmTransitionsRef, measureVolsRef, measureVolTransitionsRef,
    songSectionsRef, songMarkersRef, measureSignalsRef, pendingStructureActionRef,
    loopStartRef, loopEndRef, isLoopRegionActiveRef, loopModeRef,
    isLoopExitRequestedRef, isLoopingRef, activeVariationsRef, lastExpandedRef
  };
}
