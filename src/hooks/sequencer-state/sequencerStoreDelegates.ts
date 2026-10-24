import { useSequencerStore } from '../../stores/useSequencerStore';

export function getSequencerStoreDelegates() {
  const store = useSequencerStore.getState();
  return {
    activeAoVivoTrackId: store.activeAoVivoTrackId,
    setActiveAoVivoTrackId: (id: any) => useSequencerStore.getState().setActiveAoVivoTrackId(id),
    vocalTransposeSteps: store.vocalTransposeSteps,
    setVocalTransposeSteps: (steps: any) => useSequencerStore.getState().setVocalTransposeSteps(steps),
    incrementVocalTransposeSteps: () => useSequencerStore.getState().incrementVocalTransposeSteps(),
    decrementVocalTransposeSteps: () => useSequencerStore.getState().decrementVocalTransposeSteps(),
    transposePatternNotes: (trackId: any, ptnId: any, semitones: any) => useSequencerStore.getState().transposePatternNotes(trackId, ptnId, semitones),
    handleTrackBalancoChange: (trackId: any, intensity: any, preset: any) => useSequencerStore.getState().handleTrackBalancoChange(trackId, intensity, preset),
    setTrackBalancoIntensity: (trackId: any, intensity: any) => useSequencerStore.getState().setTrackBalancoIntensity(trackId, intensity),
    setTrackBalancoPreset: (trackId: any, preset: any) => useSequencerStore.getState().setTrackBalancoPreset(trackId, preset),
    handlePatternBalancoChange: (trackId: any, ptnId: any, intensity: any, preset: any) => useSequencerStore.getState().handlePatternBalancoChange(trackId, ptnId, intensity, preset),
    handleReorderTracksDnd: (activeId: any, overId: any, dropSide?: any) => useSequencerStore.getState().handleReorderTracksDnd(activeId, overId, dropSide),
    handleReorderMixerTracks: (activeId: any, overId: any, dropSide?: any) => useSequencerStore.getState().handleReorderMixerTracks(activeId, overId, dropSide),
    handleReorderRodaTracks: (activeId: any, overId: any) => useSequencerStore.getState().handleReorderRodaTracks(activeId, overId),
    handleTimelinePatternAssign: (trackId: any, patternId: any, measureIdx: any) => useSequencerStore.getState().handleTimelinePatternAssign(trackId, patternId, measureIdx),
    handleTimelinePatternVariationToggle: (trackId: any, patternId: any, measureIdx: any, val: any) => useSequencerStore.getState().handleTimelinePatternVariationToggle(trackId, patternId, measureIdx, val),
    handleCreateSongMarker: (name: any, measure: any, color?: any) => useSequencerStore.getState().handleCreateSongMarker(name, measure, color),
    handleUpdateSongMarker: (id: any, name: any, measure: any, color?: any) => useSequencerStore.getState().handleUpdateSongMarker(id, name, measure, color),
    handleDeleteSongMarker: (id: any) => useSequencerStore.getState().handleDeleteSongMarker(id),
    handlePatternBeatResolutionChange: (patternId: any, beatIndex: any, newResolution: any) => useSequencerStore.getState().handlePatternBeatResolutionChange(patternId, beatIndex, newResolution),
    copiedPattern: store.copiedPattern,
    copiedSection: store.copiedSection,
  };
}
