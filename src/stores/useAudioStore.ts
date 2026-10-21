import { create } from 'zustand';
import { TempRecordingData, AudioState, VocalPresetId } from './types/audioStoreTypes';

export type { TempRecordingData, AudioState, VocalPresetId };

export const useAudioStore = create<AudioState>((set) => ({
  targetPatternId: null,
  targetMeasureIdx: null,
  vocalBlobs: {},
  vocalBuffers: {},
  tempRecording: null,
  recordingStatus: 'inactive',
  isFocusRecordingMode: false,
  setRecordingStatus: (status) => set({ recordingStatus: status }),
  setIsFocusRecordingMode: (focus) => set({ isFocusRecordingMode: focus }),
  chorusDensity: 0.0,
  isVocalGuideEnabled: true,
  selectedVocalPatternId: null,
  isAudioUnlocked: false,
  voiceInputMode: 'free',
  setVoiceInputMode: (mode) => set({ voiceInputMode: mode }),

  selectedOutputDeviceId: null,
  availableOutputDevices: [],
  setSelectedOutputDeviceId: async (id) => {
    const currentId = useAudioStore.getState().selectedOutputDeviceId;
    if (currentId === id) return;
    set({ selectedOutputDeviceId: id });
    if (id !== null && id !== '' && id !== 'default') {
      try {
        const Tone = await import('tone');
        const ctx = Tone.getContext().rawContext as any;
        if (typeof ctx?.setSinkId === 'function' && ctx.sinkId !== id) {
          await ctx.setSinkId(id);
        }
      } catch (_) {}
    }
  },
  refreshAudioOutputDevices: async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Sortie (${d.deviceId.slice(0, 5)}...)`,
        }));
      set({ availableOutputDevices: audioOutputs });
    } catch (_) {}
  },
  setTargetPatternId: (id) => set({ targetPatternId: id }),
  setTargetMeasureIdx: (idx) => set({ targetMeasureIdx: idx }),
  setTempRecording: (temp) => set({ tempRecording: temp }),
  setChorusDensity: (density) => set({ chorusDensity: Math.max(0, Math.min(1, density)) }),
  setIsVocalGuideEnabled: (enabled) => set({ isVocalGuideEnabled: enabled }),
  setSelectedVocalPatternId: (id) => set({ selectedVocalPatternId: id }),
  unlockAudio: () => set({ isAudioUnlocked: true }),
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
  setVocalBuffer: (patternId, buffer) =>
    set((state) => ({
      vocalBuffers: { ...state.vocalBuffers, [patternId]: buffer },
    })),
  setVocalBuffersBatch: (entries) =>
    set((state) => {
      const nextBuffers = { ...state.vocalBuffers };
      const nextBlobs = { ...state.vocalBlobs };
      for (const entry of entries) {
        nextBuffers[entry.key] = entry.buffer;
        if (entry.blob) {
          nextBlobs[entry.key] = entry.blob;
        }
      }
      return { vocalBuffers: nextBuffers, vocalBlobs: nextBlobs };
    }),
  removeVocalBuffer: (patternId) =>
    set((state) => {
      const nextBuffers = { ...state.vocalBuffers };
      delete nextBuffers[patternId];
      return { vocalBuffers: nextBuffers };
    }),
  vocalPreset: 'guide',
  setVocalPreset: (preset) => {
    set({ vocalPreset: preset });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vocal-apply-preset-live', { detail: preset }));
    }
  },
  vocalMode: 'voice',
  setVocalMode: (mode) => {
    set({ vocalMode: mode });
    if (typeof window !== 'undefined') {
      if (mode === 'synth') {
        window.dispatchEvent(new CustomEvent('vocal-stop-all-playback'));
      } else if (mode === 'voice') {
        window.dispatchEvent(new CustomEvent('vocal-release-voice-pitch'));
      }
    }
  },
}));