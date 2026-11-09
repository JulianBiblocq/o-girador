import { TrackGroup, SongSection } from '../../types';
import { instrumentsConfig } from '../../data';
import { renderTablatureChunk, getMeasureCharWidth } from './tablatureChunkRenderer';

const LINE_FIXED_OVERHEAD_CHARS = 23; // 12 (inst) + 1 + 3 (sig) + 1 + 3 ("|| ") + 3 (" ||")

export const generateTablatureCore = (
  tracks: TrackGroup[],
  totalMeasures: number,
  songSections: SongSection[],
  measureTimeSigs?: { [m: number]: string },
  measureBpms?: { [m: number]: number },
  isHtml: boolean = false,
  maxCharsPerLine: number = 95
): string => {
  let output = '';
  const filteredTracks = tracks.filter((t) => {
    const conf = instrumentsConfig[t.instrumentIdx];
    return conf && conf.id !== 'apito' && conf.type !== 'voice';
  });

  let currentChunk: number[] = [];
  let usedChars = LINE_FIXED_OVERHEAD_CHARS;

  for (let m = 0; m < totalMeasures; m++) {
    const mWidth = getMeasureCharWidth(m, measureTimeSigs);

    if (currentChunk.length === 0) {
      currentChunk.push(m);
      usedChars = LINE_FIXED_OVERHEAD_CHARS + mWidth;
      continue;
    }

    const prevM = currentChunk[currentChunk.length - 1];
    const prevSig = measureTimeSigs?.[prevM] || '4/4';
    const currSig = measureTimeSigs?.[m] || '4/4';
    const sepWidth = prevSig !== currSig ? ` || ${currSig} || `.length : 4;
    const neededChars = sepWidth + mWidth;

    if (usedChars + neededChars <= maxCharsPerLine) {
      currentChunk.push(m);
      usedChars += neededChars;
    } else {
      output += renderTablatureChunk(
        currentChunk,
        filteredTracks,
        songSections,
        measureTimeSigs,
        measureBpms,
        isHtml
      );
      currentChunk = [m];
      usedChars = LINE_FIXED_OVERHEAD_CHARS + mWidth;
    }
  }

  if (currentChunk.length > 0) {
    output += renderTablatureChunk(
      currentChunk,
      filteredTracks,
      songSections,
      measureTimeSigs,
      measureBpms,
      isHtml
    );
  }

  return output;
};
