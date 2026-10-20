import { TrackGroup, SongMarker, SongSection, SavedSectionData } from '../../types';

export interface CloudSectionContext {
  pushUndoState: () => void;
  setTotalMeasures: (updater: (prev: number) => number) => void;
  setMeasureTimeSigs: (updater: (prev: any[]) => any[]) => void;
  setMeasureBpms: (updater: (prev: any[]) => any[]) => void;
  setMeasureBpmTransitions: (updater: (prev: any[]) => any[]) => void;
  setMeasureVols: (updater: (prev: any[]) => any[]) => void;
  setMeasureVolTransitions: (updater: (prev: any[]) => any[]) => void;
  setMeasureSignals: (updater: (prev: any[]) => any[]) => void;
  setSongSections: (updater: (prev: any[]) => any[]) => void;
  setSongMarkers: (updater: (prev: any[]) => any[]) => void;
  setLoopStartMeasure: (updater: any) => void;
  setLoopEndMeasure: (updater: any) => void;
  setTracks: (updater: (prev: TrackGroup[]) => TrackGroup[]) => void;
}

export function executeInsertCloudSection(sectionData: SavedSectionData, insertAtMeasure: number, ctx: CloudSectionContext): void {
  ctx.pushUndoState();
  const n = sectionData.numMeasures;

  ctx.setTotalMeasures((prev: number) => prev + n);
  ctx.setMeasureTimeSigs((prev: any[]) => [...prev.slice(0, insertAtMeasure), ...sectionData.timeSigs, ...prev.slice(insertAtMeasure)]);
  ctx.setMeasureBpms((prev: any[]) => {
    const fallbackBpm = insertAtMeasure > 0 && prev[insertAtMeasure - 1] ? prev[insertAtMeasure - 1] : 83;
    return [...prev.slice(0, insertAtMeasure), ...Array(n).fill(fallbackBpm), ...prev.slice(insertAtMeasure)];
  });
  ctx.setMeasureBpmTransitions((prev: any[]) => [...prev.slice(0, insertAtMeasure), ...Array(n).fill('immediate'), ...prev.slice(insertAtMeasure)]);
  ctx.setMeasureVols((prev: any[]) => [...prev.slice(0, insertAtMeasure), ...sectionData.vols, ...prev.slice(insertAtMeasure)]);
  ctx.setMeasureVolTransitions((prev: any[]) => [...prev.slice(0, insertAtMeasure), ...sectionData.volTransitions, ...prev.slice(insertAtMeasure)]);
  ctx.setMeasureSignals((prev: any[]) => [...prev.slice(0, insertAtMeasure), ...sectionData.signals, ...prev.slice(insertAtMeasure)]);

  ctx.setSongSections((prev: SongSection[]) => prev.map((sec: SongSection) => {
    let newStart = sec.startMeasure;
    let newEnd = sec.endMeasure;
    if (sec.startMeasure >= insertAtMeasure) { newStart += n; newEnd += n; }
    else if (sec.endMeasure >= insertAtMeasure) { newEnd += n; }
    return { ...sec, startMeasure: newStart, endMeasure: newEnd };
  }));

  ctx.setSongMarkers((prev: SongMarker[]) => (prev || []).map((m: SongMarker) => m.measure >= insertAtMeasure ? { ...m, measure: m.measure + n } : m));
  ctx.setLoopStartMeasure((prev: number | null) => (prev !== null && prev >= insertAtMeasure) ? prev + n : prev);
  ctx.setLoopEndMeasure((prev: number | null) => (prev !== null && prev >= insertAtMeasure) ? prev + n : prev);

  ctx.setTracks((prev: TrackGroup[]) => {
    const newTracks = [...prev];
    newTracks.forEach((t: TrackGroup, tIdx: number) => {
      newTracks[tIdx] = {
        ...t,
        patterns: t.patterns.map((p) => {
          if (!p.measureAssignments) return p;
          return { ...p, measureAssignments: [...p.measureAssignments.slice(0, insertAtMeasure), ...Array(n).fill(false), ...p.measureAssignments.slice(insertAtMeasure)] };
        })
      };
    });

    sectionData.tracks.forEach((loadedTrack: any) => {
      let existingTrackIdx = newTracks.findIndex((t: TrackGroup) => t.instrumentIdx === loadedTrack.instrumentIdx);
      if (existingTrackIdx === -1) {
        const newTrack: TrackGroup = {
          id: Date.now() + Math.random(), instrumentIdx: loadedTrack.instrumentIdx, patterns: [],
          isMute: loadedTrack.isMute, isSolo: loadedTrack.isSolo, isHidden: false, volumeVal: loadedTrack.volumeVal,
          selectedPatternId: -1, reverbVal: loadedTrack.reverbVal, panVal: loadedTrack.panVal, pan: loadedTrack.pan ?? loadedTrack.panVal ?? 0,
          swingIntensity: loadedTrack.swingIntensity, fxSends: loadedTrack.fxSends ?? { reverb: loadedTrack.reverbVal ?? 0, distortion: 0 }
        };
        newTracks.push(newTrack);
        existingTrackIdx = newTracks.length - 1;
      }

      const trackToUpdate = newTracks[existingTrackIdx];
      const newPatterns = loadedTrack.patterns.map((loadedPattern: any) => ({
        ...loadedPattern,
        measureAssignments: [...Array(insertAtMeasure).fill(false), ...(loadedPattern.measureAssignments || Array(n).fill(true))]
      }));
      newTracks[existingTrackIdx] = { ...trackToUpdate, patterns: [...trackToUpdate.patterns, ...newPatterns] };
    });
    return newTracks;
  });
}
