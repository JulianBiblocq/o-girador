import { useState } from 'react';
import { TimeSignature } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';

export function useSequencerMeasuresState() {
  const [bpm, setBpm] = useState<number>(83);
  const [timeSig, setTimeSig] = useState<TimeSignature>('4/4');
  const [isLooping, setIsLooping] = useState<boolean>(true);

  const setTracks = (useSequencerStore as any)(state => state.setTracks);
  const setTotalMeasures = (useSequencerStore as any)(state => state.setTotalMeasures);
  const setMeasureTimeSigs = (useSequencerStore as any)(state => state.setMeasureTimeSigs);
  const measureBpms = useSequencerStore(state => state.measureBpms);
  const setMeasureBpms = useSequencerStore(state => state.setMeasureBpms);
  const measureBpmTransitions = useSequencerStore(state => state.measureBpmTransitions);
  const setMeasureBpmTransitions = useSequencerStore(state => state.setMeasureBpmTransitions);
  const measureVols = useSequencerStore(state => state.measureVols);
  const setMeasureVols = useSequencerStore(state => state.setMeasureVols);
  const measureVolTransitions = useSequencerStore(state => state.measureVolTransitions);
  const setMeasureVolTransitions = useSequencerStore(state => state.setMeasureVolTransitions);
  const setSongSections = (useSequencerStore as any)(state => state.setSongSections);
  const measureSignals = useSequencerStore(state => state.measureSignals);
  const setMeasureSignals = (useSequencerStore as any)(state => state.setMeasureSignals);
  const setSongMarkers = (useSequencerStore as any)(state => state.setSongMarkers);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const songSections = useSequencerStore(state => state.songSections);
  const setLoopStartMeasure = (useSequencerStore as any)(state => state.setLoopStartMeasure);
  const setLoopEndMeasure = (useSequencerStore as any)(state => state.setLoopEndMeasure);
  const setIsLoopRegionActive = (useSequencerStore as any)(state => state.setIsLoopRegionActive);

  return {
    bpm, setBpm, timeSig, setTimeSig, isLooping, setIsLooping, setTracks,
    setTotalMeasures, setMeasureTimeSigs, measureBpms, setMeasureBpms,
    measureBpmTransitions, setMeasureBpmTransitions, measureVols, setMeasureVols,
    measureVolTransitions, setMeasureVolTransitions, setSongSections, measureSignals,
    setMeasureSignals, setSongMarkers, totalMeasures, songSections,
    setLoopStartMeasure, setLoopEndMeasure, setIsLoopRegionActive,
  };
}
