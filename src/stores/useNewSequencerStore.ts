import { create } from 'zustand';

export interface SequencerState {
  trackIds: string[];
  tracks: Record<string, { id: string; name: string; isMuted: boolean }>;
  steps: Record<string, boolean[]>;
  isPlaying: boolean;

  togglePlay: () => void;
  addTrack: (name: string) => void;
  toggleMute: (trackId: string) => void;
  toggleStep: (trackId: string, stepIndex: number) => void;
}

export const useNewSequencerStore = create<SequencerState>((set) => ({
  // État initial avec 2 pistes pré-remplies
  trackIds: ['track-1', 'track-2'],
  tracks: {
    'track-1': { id: 'track-1', name: 'Alfaia', isMuted: false },
    'track-2': { id: 'track-2', name: 'Caixa', isMuted: false },
  },
  steps: {
    'track-1': [
      true, false, false, false, // Temps forts (0, 4, 8, 12)
      true, false, false, false,
      true, false, false, false,
      true, false, false, false
    ],
    'track-2': [
      false, false, true, false, // Contretemps (2, 6, 10, 14)
      false, false, true, false,
      false, false, true, false,
      false, false, true, false
    ],
  },
  isPlaying: false,

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  addTrack: (name: string) => set((state) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString();

    const newSteps = Array(16).fill(false);

    return {
      trackIds: [...state.trackIds, id],
      tracks: {
        ...state.tracks,
        [id]: { id, name, isMuted: false }
      },
      steps: {
        ...state.steps,
        [id]: newSteps
      }
    };
  }),

  toggleMute: (trackId: string) => set((state) => {
    const track = state.tracks[trackId];
    if (!track) return state;

    return {
      tracks: {
        ...state.tracks,
        [trackId]: { ...track, isMuted: !track.isMuted }
      }
    };
  }),

  toggleStep: (trackId: string, stepIndex: number) => set((state) => {
    const trackSteps = state.steps[trackId];
    if (!trackSteps) return state;

    const newSteps = [...trackSteps];
    newSteps[stepIndex] = !newSteps[stepIndex];

    return {
      steps: {
        ...state.steps,
        [trackId]: newSteps
      }
    };
  }),
}));
