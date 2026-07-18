import { create } from 'zustand';

export interface AudioState {
  recordingStatus: 'inactive' | 'arming' | 'countdown' | 'recording';
  targetPatternId: number | null;
  targetMeasureIdx: number | null;
  vocalBlobs: Record<number, Blob>;
  vocalBuffers: Record<number, AudioBuffer>;
  tempRecording: { patternId: number; blob: Blob } | null;
  chorusDensity: number;
  isVocalGuideEnabled: boolean;
  isVocalRecordingBarExpanded: boolean;
  selectedVocalPatternId: number | null;
  isAudioUnlocked: boolean;
  recordingStartTimelineSec: number | null;

  setRecordingStatus: (status: 'inactive' | 'arming' | 'countdown' | 'recording') => void;
  setTargetPatternId: (id: number | null) => void;
  setTargetMeasureIdx: (idx: number | null) => void;
  setTempRecording: (temp: { patternId: number; blob: Blob } | null) => void;
  setChorusDensity: (density: number) => void;
  setIsVocalGuideEnabled: (enabled: boolean) => void;
  addVocalBlob: (patternId: number, blob: Blob) => void;
  removeVocalBlob: (patternId: number) => void;
  addVocalBuffer: (patternId: number, buffer: AudioBuffer) => void;
  removeVocalBuffer: (patternId: number) => void;
  setIsVocalRecordingBarExpanded: (expanded: boolean) => void;
  setSelectedVocalPatternId: (id: number | null) => void;
  unlockAudio: () => void;
  setRecordingStartTimelineSec: (sec: number | null) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  recordingStatus: 'inactive',
  targetPatternId: null,
  targetMeasureIdx: null,
  vocalBlobs: {},
  vocalBuffers: {},
  tempRecording: null,
  chorusDensity: 0.0,
  isVocalGuideEnabled: true,
  isVocalRecordingBarExpanded: false,
  selectedVocalPatternId: null,
  isAudioUnlocked: false,
  recordingStartTimelineSec: null,

  setRecordingStatus: (status) => set({ recordingStatus: status }),
  setTargetPatternId: (id) => set({ targetPatternId: id }),
  setTargetMeasureIdx: (idx) => set({ targetMeasureIdx: idx }),
  setTempRecording: (temp) => set({ tempRecording: temp }),
  setChorusDensity: (density) => set({ chorusDensity: Math.max(0, Math.min(1, density)) }),
  setIsVocalGuideEnabled: (enabled) => set({ isVocalGuideEnabled: enabled }),
  setIsVocalRecordingBarExpanded: (expanded) => set({ isVocalRecordingBarExpanded: expanded }),
  setSelectedVocalPatternId: (id) => set({ selectedVocalPatternId: id }),
  unlockAudio: () => set({ isAudioUnlocked: true }),
  setRecordingStartTimelineSec: (sec) => set({ recordingStartTimelineSec: sec }),
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
  addVocalBuffer: (patternId, buffer) =>
    set((state) => ({
      vocalBuffers: { ...state.vocalBuffers, [patternId]: buffer },
    })),
  removeVocalBuffer: (patternId) =>
    set((state) => {
      const nextBuffers = { ...state.vocalBuffers };
      delete nextBuffers[patternId];
      return { vocalBuffers: nextBuffers };
    }),
}));