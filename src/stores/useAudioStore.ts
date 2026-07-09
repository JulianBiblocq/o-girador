import { create } from 'zustand';

export interface AudioState {
  recordingStatus: 'inactive' | 'arming' | 'countdown' | 'recording';
  targetPatternId: number | null;
  vocalBlobs: Record<number, Blob>;
  chorusDensity: number;
  isVocalGuideEnabled: boolean;
  isVocalRecordingBarExpanded: boolean;
  selectedVocalPatternId: number | null;

  setRecordingStatus: (status: 'inactive' | 'arming' | 'countdown' | 'recording') => void;
  setTargetPatternId: (id: number | null) => void;
  setChorusDensity: (density: number) => void;
  setIsVocalGuideEnabled: (enabled: boolean) => void;
  addVocalBlob: (patternId: number, blob: Blob) => void;
  removeVocalBlob: (patternId: number) => void;
  setIsVocalRecordingBarExpanded: (expanded: boolean) => void;
  setSelectedVocalPatternId: (id: number | null) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  recordingStatus: 'inactive',
  targetPatternId: null,
  vocalBlobs: {},
  chorusDensity: 0.0,
  isVocalGuideEnabled: true,
  isVocalRecordingBarExpanded: false,
  selectedVocalPatternId: null,

  setRecordingStatus: (status) => set({ recordingStatus: status }),
  setTargetPatternId: (id) => set({ targetPatternId: id }),
  setChorusDensity: (density) => set({ chorusDensity: Math.max(0, Math.min(1, density)) }),
  setIsVocalGuideEnabled: (enabled) => set({ isVocalGuideEnabled: enabled }),
  setIsVocalRecordingBarExpanded: (expanded) => set({ isVocalRecordingBarExpanded: expanded }),
  setSelectedVocalPatternId: (id) => set({ selectedVocalPatternId: id }),
  addVocalBlob: (patternId, blob) =>
    set((state) => ({
      vocalBlobs: { ...state.vocalBlobs, [patternId]: blob },
    })),
  removeVocalBlob: (patternId) =>
    set((state) => {
      const nextBlobs = { ...state.vocalBlobs };
      delete nextBlobs[patternId];
      return { vocalBlobs: nextBlobs };
    }),
}));
