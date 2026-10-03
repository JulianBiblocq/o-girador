import { create } from 'zustand';

export interface TempRecordingData {
  patternId: number;
  trackId?: string | number;
  blob?: Blob;
  audioBuffer?: AudioBuffer;
  isImported?: boolean;
  targetMeasureIdx?: number;
  sampleBpm?: number;
}

export interface AudioState {
  targetPatternId: number | null;
  targetMeasureIdx: number | null;
  vocalBlobs: Record<string | number, Blob>;
  vocalBuffers: Record<string | number, AudioBuffer>;
  tempRecording: TempRecordingData | null;
  chorusDensity: number;
  isVocalGuideEnabled: boolean;
  selectedVocalPatternId: number | null;
  isAudioUnlocked: boolean;
  selectedOutputDeviceId: string | null;
  availableOutputDevices: Array<{ deviceId: string; label: string }>;
  setSelectedOutputDeviceId: (id: string | null) => void;
  refreshAudioOutputDevices: () => Promise<void>;
  setTargetPatternId: (id: number | null) => void;
  setTargetMeasureIdx: (idx: number | null) => void;
  setTempRecording: (temp: TempRecordingData | null) => void;
  setChorusDensity: (density: number) => void;
  setIsVocalGuideEnabled: (enabled: boolean) => void;
  addVocalBlob: (patternId: string | number, blob: Blob) => void;
  removeVocalBlob: (patternId: string | number) => void;
  addVocalBuffer: (patternId: string | number, buffer: AudioBuffer) => void;
  setVocalBuffer: (patternId: string | number, buffer: AudioBuffer) => void;
  setVocalBuffersBatch: (entries: Array<{ key: string | number; buffer: AudioBuffer; blob?: Blob }>) => void;
  removeVocalBuffer: (patternId: string | number) => void;
  setSelectedVocalPatternId: (id: number | null) => void;
  unlockAudio: () => void;
  vocalMode: 'voice' | 'synth' | 'both';
  setVocalMode: (mode: 'voice' | 'synth' | 'both') => void;
  voiceInputMode: 'free' | 'step';
  setVoiceInputMode: (mode: 'free' | 'step') => void;
  vocalPreset: VocalPresetId;
  setVocalPreset: (preset: VocalPresetId) => void;
}

export type VocalPresetId = 'guide' | 'rhodes' | 'pifano' | 'organ' | 'pluck';



export const useAudioStore = create<AudioState>((set) => ({
  targetPatternId: null,
  targetMeasureIdx: null,
  vocalBlobs: {},
  vocalBuffers: {},
  tempRecording: null,
  chorusDensity: 0.0,
  isVocalGuideEnabled: true,
  selectedVocalPatternId: null,
  isAudioUnlocked: false,
  voiceInputMode: 'free',
  setVoiceInputMode: (mode) => set({ voiceInputMode: mode }),

  selectedOutputDeviceId: null,
  availableOutputDevices: [],
  setSelectedOutputDeviceId: async (id) => {
    set({ selectedOutputDeviceId: id });
    if (id !== null) {
      try {
        const Tone = await import('tone');
        const ctx = Tone.getContext().rawContext as any;
        if (typeof ctx.setSinkId === 'function') {
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
      if (audioOutputs.length > 0 && !useAudioStore.getState().selectedOutputDeviceId) {
        set({ selectedOutputDeviceId: audioOutputs[0].deviceId });
      }
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
    try {
      import('../audio/vocalSynthService').then(({ applyVocalPresetLive }) => {
        applyVocalPresetLive(preset);
      });
    } catch (_) {}
  },
  vocalMode: 'voice',
  setVocalMode: (mode) => {
    set({ vocalMode: mode });
    if (mode === 'synth') {
      try {
        import('../audio/vocalEngineService').then(({ vocalEngineService }) => {
          vocalEngineService.stopAllVocalPlayback();
        });
      } catch (_) {}
    } else if (mode === 'voice') {
      try {
        import('../hooks/useAudioSync').then(({ audioEngine }) => {
          audioEngine?.releaseVoicePitch();
        });
      } catch (_) {}
    }
  },
}));