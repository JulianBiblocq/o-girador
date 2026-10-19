import { SongSection, SongMarker, TrackGroup } from '../../types';
import { stretchInsertModeState } from './timelineStretchInsertHelper';
import { stretchOverwriteModeState } from './timelineStretchOverwriteHelper';

export const stretchSongSectionState = (
  state: {
    songSections: SongSection[];
    songMarkers?: SongMarker[];
    totalMeasures: number;
    measureTimeSigs: any[];
    measureBpms: number[];
    measureBpmTransitions: any[];
    measureVols: number[];
    measureVolTransitions: any[];
    measureSignals: any[];
    tracks: TrackGroup[];
    timeSig: any;
    bpm: number;
    hasFullPlaybackAccess?: boolean;
    maxMeasuresAllowed?: number | null;
    loopStartMeasure?: number | null;
    loopEndMeasure?: number | null;
    tracksVersion: number;
    [key: string]: any;
  },
  sectionId: string,
  newEndMeasure: number,
  mode: 'insert' | 'overwrite'
): Record<string, any> => {
  const section = state.songSections.find(s => s.id === sectionId);
  if (!section) return {};

  const origStart = section.startMeasure;
  const origEnd = section.endMeasure;
  const blockSize = origEnd - origStart + 1;
  const count = newEndMeasure - origEnd;
  if (count <= 0 || blockSize <= 0) return {};

  if (mode === 'insert') {
    return stretchInsertModeState(state, section, count, blockSize);
  }
  return stretchOverwriteModeState(state, section, newEndMeasure, count, blockSize);
};
