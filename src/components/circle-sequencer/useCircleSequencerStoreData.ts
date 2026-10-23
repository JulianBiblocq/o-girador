
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useAudioStore } from '../../stores/useAudioStore';

export function useCircleSequencerStoreData(isActive: boolean) {
  const totalMeasures = useSequencerStore(s => s.totalMeasures);
  const songSections = useSequencerStore(s => s.songSections);
  const songMarkers = useSequencerStore(s => s.songMarkers);
  const rodaTrackOrder = useSequencerStore(s => s.rodaTrackOrder);
  const isLoopRegionActive = useSequencerStore(s => s.isLoopRegionActive);
  const loopStartMeasure = useSequencerStore(s => s.loopStartMeasure);
  const loopEndMeasure = useSequencerStore(s => s.loopEndMeasure);
  const currentMeasure = useSequencerStore(s => (isActive ? s.currentMeasure : 0));
  const measureTimeSigs = useSequencerStore(s => s.measureTimeSigs);
  const isLetraActive = useSequencerStore(s => s.isLetraActive);
  const toggleLetraActive = useSequencerStore(s => s.toggleLetraActive);

  const isMetroOn = useTransportStore(s => s.isMetroOn);
  const soloPatternPlayId = useTransportStore(s => s.soloPatternPlayId);

  const vocalMode = useAudioStore(s => s.vocalMode);
  const setVocalMode = useAudioStore(s => s.setVocalMode);

  return {
    totalMeasures,
    songSections,
    songMarkers,
    rodaTrackOrder,
    isLoopRegionActive,
    loopStartMeasure,
    loopEndMeasure,
    currentMeasure,
    measureTimeSigs,
    isLetraActive,
    toggleLetraActive,
    isMetroOn,
    soloPatternPlayId,
    vocalMode,
    setVocalMode,
  };
}
