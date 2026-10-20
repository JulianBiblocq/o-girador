import { TrackGroup, SongSection } from '../../types';
import { instrumentsConfig } from '../../data';
import { renderTablatureChunk } from './tablatureChunkRenderer';

export const generateTablatureCore = (
  tracks: TrackGroup[],
  totalMeasures: number,
  songSections: SongSection[],
  measureTimeSigs?: { [m: number]: string },
  measureBpms?: { [m: number]: number },
  isHtml: boolean = false
): string => {
  let output = ``;
  const filteredTracks = tracks.filter(t => {
    const conf = instrumentsConfig[t.instrumentIdx];
    return conf && conf.id !== 'apito' && conf.type !== 'voice';
  });

  let currentChunk: number[] = [];

  for (let m = 0; m < totalMeasures; m++) {
    const sectionStart = songSections.find(s => s.startMeasure === m);
    if (currentChunk.length > 0 && (currentChunk.length === 2 || sectionStart)) {
      output += renderTablatureChunk(currentChunk, filteredTracks, songSections, measureTimeSigs, measureBpms, isHtml);
      currentChunk = [];
    }
    currentChunk.push(m);
    const sectionEnd = songSections.find(s => s.endMeasure === m);
    if (sectionEnd) {
      output += renderTablatureChunk(currentChunk, filteredTracks, songSections, measureTimeSigs, measureBpms, isHtml);
      currentChunk = [];
    }
  }

  if (currentChunk.length > 0) {
    output += renderTablatureChunk(currentChunk, filteredTracks, songSections, measureTimeSigs, measureBpms, isHtml);
  }

  return output;
};
