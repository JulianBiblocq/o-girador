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
  isFocusRecordingMode: boolean;
  selectedDeviceId: string | null;
  availableDevices: Array<{ deviceId: string; label: string }>;
  setSelectedDeviceId: (id: string | null) => void;
  refreshAudioDevices: () => Promise<void>;
  setRecordingStatus: (status: 'inactive' | 'arming' | 'countdown' | 'recording') => void;
  setIsFocusRecordingMode: (focus: boolean) => void;
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
  isFocusRecordingMode: false,
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

  selectedDeviceId: null,
  availableDevices: [],
  setSelectedDeviceId: (id) => set({ selectedDeviceId: id }),
  refreshAudioDevices: async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Micro / Carte Son (${d.deviceId.slice(0, 5)}...)`,
        }));
      set({ availableDevices: audioInputs });
      if (audioInputs.length > 0 && !useAudioStore.getState().selectedDeviceId) {
        set({ selectedDeviceId: audioInputs[0].deviceId });
      }
    } catch (err) {
      console.warn("🎙️ [AUDIO DEVICES] Error enumerating audio devices:", err);
    }
  },
  setRecordingStatus: (status) => set({
    recordingStatus: status,
    isFocusRecordingMode: status !== 'inactive'
  }),
  setIsFocusRecordingMode: (focus) => set({ isFocusRecordingMode: focus }),
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