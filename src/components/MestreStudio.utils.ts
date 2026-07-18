import { TrackGroup } from '../types';
import { 
  DEFAULT_INSTRUMENTS, 
  MIN_RADIUS, 
  MAX_RADIUS, 
  MIDDLE_RADIUS 
} from './MestreStudio.types';

// Helper for generating initial tracks (Alfaia, Caixa, Gongue, Agbe)
export function createInitialTracks(prefix = 'track'): TrackGroup[] {
  const instruments = DEFAULT_INSTRUMENTS;
  const initial = instruments.map((inst, index) => {
    const patternId = Date.now() + index * 100 + Math.floor(Math.random() * 50);
    return {
      id: index + 1,
      instrumentIdx: inst.idx,
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 80,
      selectedPatternId: patternId,
      radius: 0,
      reverbVal: 0,
      panVal: 0,
      patterns: [
        {
          id: patternId,
          name: `${prefix}_${inst.name}`,
          steps: 16,
          activeSteps: Array(16).fill(0),
          lyrics: Array(16).fill(''),
          notes: Array(16).fill(''),
          measureAssignments: [true],
        }
      ]
    };
  });

  // Compute radii
  const minRadius = MIN_RADIUS;
  const maxRadius = MAX_RADIUS;
  const gap = (maxRadius - minRadius) / (initial.length - 1);
  initial.forEach((t, idx) => {
    t.radius = minRadius + idx * gap;
  });

  return initial;
}

// Helper for generating single track (used for target/sabotaged tracks)
export function createInitialSingleTrack(instIdx: number, label: string): TrackGroup[] {
  const patternId = Date.now() + Math.floor(Math.random() * 1000);
  return [
    {
      id: 1,
      instrumentIdx: instIdx,
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 80,
      selectedPatternId: patternId,
      radius: MIDDLE_RADIUS, // middle radius (180 + 495) / 2
      reverbVal: 0,
      panVal: 0,
      patterns: [
        {
          id: patternId,
          name: label,
          steps: 16,
          activeSteps: Array(16).fill(0),
          lyrics: Array(16).fill(''),
          notes: Array(16).fill(''),
          measureAssignments: [true],
        }
      ]
    }
  ];
}

// Instrument helpers
export const getInstrumentIdxFromName = (name: string): number => {
  if (name === 'alfaia') return 0;
  if (name === 'caixa') return 3;
  if (name === 'gongue') return 5;
  if (name === 'agbe') return 6;
  return 3;
};

// Sequencer helpers
export const getActivePatternMap = (list: TrackGroup[]): Record<number, number | null> => {
  const map: Record<number, number | null> = {};
  list.forEach(t => {
    map[t.id] = t.selectedPatternId;
  });
  return map;
};

export const updateStepGeneric = (
  list: TrackGroup[],
  trackId: number,
  patternId: number,
  stepIdx: number,
  newState: string | number,
  lyric?: string,
  note?: string
): TrackGroup[] => {
  return list.map(t => {
    if (t.id === trackId) {
      return {
        ...t,
        patterns: t.patterns.map(p => {
          if (p.id === patternId) {
            const activeSteps = [...p.activeSteps];
            activeSteps[stepIdx] = newState;

            const lyrics = [...(p.lyrics || Array(p.steps).fill(''))];
            if (lyric !== undefined) lyrics[stepIdx] = lyric;

            const notes = [...(p.notes || Array(p.steps).fill(''))];
            if (note !== undefined) notes[stepIdx] = note;

            return { ...p, activeSteps, lyrics, notes };
          }
          return p;
        })
      };
    }
    return t;
  });
};
