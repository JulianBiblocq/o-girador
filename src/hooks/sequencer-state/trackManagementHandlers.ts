import { TrackGroup, TimeSignature, SongMarker } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { applyRadii } from './sequencerStateTypes';
import { resetActiveCloudPresetId } from '../../utils/cloudPresetState';
import type { TrackManagementContext } from './trackManagementTypes';

export type { TrackManagementContext };

export function createTrackManagementHandlers(ctx: TrackManagementContext) {
  const { pushUndoState, setTracks } = ctx;

  const handleTrackInstrumentIdxChange = (id: number, targetInstIdx: number) => {
    pushUndoState();
    const tracks = useSequencerStore.getState().tracks;
    setTracks(() => tracks.map((t: TrackGroup) => t.id === id ? { ...t, instrumentIdx: targetInstIdx } : t));
  };

  const handleTrackMuteToggle = (id: number) => {
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => (t.id === id ? { ...t, isMute: !t.isMute } : t)));
  };

  const handleTrackSoloToggle = (id: number) => {
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => (t.id === id ? { ...t, isSolo: !t.isSolo } : t)));
  };

  const handleTrackHideToggle = (id: number) => {
    setTracks((prev: TrackGroup[]) => applyRadii(prev.map((t: TrackGroup) => (t.id === id ? { ...t, isHidden: !t.isHidden } : t))));
  };

  const handleTrackDelete = (id: number) => {
    useSequencerStore.getState().handleTrackDelete(id);
  };

  const handleTrackVolumeChange = (id: number, val: number) => {
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => (t.id === id ? { ...t, volumeVal: val } : t)));
  };

  const handleTrackReverbChange = (id: number, val: number) => {
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => (t.id === id ? { ...t, reverbVal: val } : t)));
  };

  const handleTrackPanChange = (id: number, val: number) => {
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => (t.id === id ? { ...t, panVal: val, pan: val } : t)));
  };

  const handleTrackSwingChange = (id: number, val: number) => {
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => (t.id === id ? { ...t, swingIntensity: val } : t)));
  };

  const handleResetTrackMicrotimings = (trackId: number, patternId: number) => {
    pushUndoState();
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => t.id === trackId ? {
      ...t, patterns: t.patterns.map((p) => p.id === patternId ? { ...p, microtimings: Array(p.steps).fill(0) } : p)
    } : t));
  };

  const handleVocalLatencyChange = (trackId: number, patternId: number, latencyMs: number) => {
    pushUndoState();
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => t.id === trackId ? {
      ...t, patterns: t.patterns.map((p) => p.id === patternId ? { ...p, vocalLatency: latencyMs } : p)
    } : t));
  };

  const handleTrackStepsChange = (trackId: number, patternId: number, targetSteps: number) => {
    pushUndoState();
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        patterns: t.patterns.map((p) => {
          if (p.id !== patternId) return p;
          const arrSteps = Array(targetSteps).fill(0);
          const arrLyrics = Array(targetSteps).fill('');
          const arrNotes = Array(targetSteps).fill('');
          const arrVols = Array(targetSteps).fill(80);
          const arrDecays = Array(targetSteps).fill(100);
          const arrMicro = Array(targetSteps).fill(0);
          for (let i = 0; i < Math.min(targetSteps, p.steps); i++) {
            arrSteps[i] = p.activeSteps[i];
            arrLyrics[i] = p.lyrics?.[i] || '';
            arrNotes[i] = p.notes?.[i] || '';
            if (p.volumes?.[i] !== undefined) arrVols[i] = p.volumes[i];
            if (p.decays?.[i] !== undefined) arrDecays[i] = p.decays[i];
            if (p.microtimings?.[i] !== undefined) arrMicro[i] = p.microtimings[i];
          }
          return { ...p, steps: targetSteps, activeSteps: arrSteps, lyrics: arrLyrics, notes: arrNotes, volumes: arrVols, decays: arrDecays, microtimings: arrMicro };
        })
      };
    }));
  };

  const handleClear = () => {
    pushUndoState();
    setTracks(() => []);
    ctx.setLetras('');
    ctx.setBpm(83);
    ctx.setTimeSig('4/4');
    ctx.setTotalMeasures(8);
    ctx.setMeasureTimeSigs(Array(8).fill('4/4'));
    ctx.setMeasureBpms(Array(8).fill(83));
    ctx.setMeasureBpmTransitions(Array(8).fill('immediate'));
    ctx.setMeasureVols(Array(8).fill(100));
    ctx.setMeasureVolTransitions(Array(8).fill('immediate'));
    ctx.setMeasureSignals(Array(8).fill(null));
    ctx.setSongSections([]);
    ctx.setSongMarkers([]);
    ctx.setActiveAoVivoTrackId(null);
    ctx.setMetadata({ toada: '', nacao: '', compositor: '', ritmo: '', youtubeUrl: '', partitionImage: undefined, rhythmSignals: [], morceauId: undefined });
    useSequencerStore.setState({
      songMarkers: [],
      mestreSignals: [],
      measureSignals: Array(8).fill(null),
      loopStartMeasure: null, loopEndMeasure: null, isLoopRegionActive: false, pendingLoopRange: null,
      currentMeasure: 0, currentExpandedMeasureIdx: 0,
    });
    window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', { detail: { mIdx: 0, sIdx: 0 } }));
    resetActiveCloudPresetId();
  };

  return {
    handleTrackInstrumentIdxChange,
    handleTrackMuteToggle,
    handleTrackSoloToggle,
    handleTrackHideToggle,
    handleTrackDelete,
    handleTrackVolumeChange,
    handleTrackReverbChange,
    handleTrackPanChange,
    handleTrackSwingChange,
    handleResetTrackMicrotimings,
    handleVocalLatencyChange,
    handleTrackStepsChange,
    handleClear,
  };
}
