import * as Tone from 'tone';
import { TrackGroup } from '../../types';
import { transposeNoteString } from '../../utils/musicTheory';
import { instrumentsConfig } from '../../data';

export const transposePatternNotesState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: string | number,
  semitones: number
): { tracks: TrackGroup[]; noteToPreview: string | null } => {
  let firstTransposedNote: string | null = null;

  const nextTracks = tracks.map((t) => {
    if (String(t.id) !== String(trackId)) return t;

    const newPatterns = t.patterns.map((p) => {
      if (String(p.id) !== String(patternId)) return p;

      const transposedNotes = (p.notes || []).map((n) => transposeNoteString(n, semitones));
      const transposedPreRollNotes = p.preRollNotes
        ? p.preRollNotes.map((n) => transposeNoteString(n, semitones))
        : undefined;

      if (!firstTransposedNote) {
        for (const n of transposedNotes) {
          if (n && n !== '0' && n !== '───' && n !== '-') {
            firstTransposedNote = n;
            break;
          }
        }
        if (!firstTransposedNote && transposedPreRollNotes) {
          for (const n of transposedPreRollNotes) {
            if (n && n !== '0' && n !== '───' && n !== '-') {
              firstTransposedNote = n;
              break;
            }
          }
        }
      }

      return {
        ...p,
        notes: transposedNotes,
        ...(transposedPreRollNotes ? { preRollNotes: transposedPreRollNotes } : {}),
      };
    });

    return { ...t, patterns: newPatterns };
  });

  return { tracks: nextTracks, noteToPreview: firstTransposedNote };
};

export const extractLyricsFromTracks = (tracks: TrackGroup[]): string => {
  const voiceTracks = tracks.filter((t) => instrumentsConfig[t.instrumentIdx]?.type === 'voice');
  const htmlArr: string[] = [];

  voiceTracks.forEach((t) => {
    t.patterns.forEach(p => {
      let trackStr = '';
      for (let i = 0; i < p.steps; i++) {
        if (p.activeSteps[i] !== 0 && p.lyrics && p.lyrics[i]) {
          const rawLyric = p.lyrics[i];
          const hasSpace = rawLyric.endsWith(' ');
          const syl = rawLyric.replace(/-$/, '').trim();
          if (syl) {
            trackStr += syl + (hasSpace ? ' ' : '');
          }
        }
      }
      if (trackStr) {
        htmlArr.push(trackStr.trim());
      }
    });
  });

  return htmlArr.join('\n\n');
};
