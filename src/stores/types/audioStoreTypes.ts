/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TempRecordingData {
  patternId: number;
  trackId?: string | number;
  blob?: Blob;
  audioBuffer?: AudioBuffer;
  isImported?: boolean;
  targetMeasureIdx?: number;
  sampleBpm?: number;
}

export type VocalPresetId = 'guide' | 'rhodes' | 'pifano' | 'organ' | 'pluck';

export interface AudioState {
  targetPatternId: number | null;
  targetMeasureIdx: number | null;
  vocalBlobs: Record<string | number, Blob>;
  vocalBuffers: Record<string | number, AudioBuffer>;
  tempRecording: TempRecordingData | null;
  selectedVocalPatternId: number | null;
  isAudioUnlocked: boolean;
  selectedOutputDeviceId: string | null;
  availableOutputDevices: Array<{ deviceId: string; label: string }>;
  setSelectedOutputDeviceId: (id: string | null) => void;
  refreshAudioOutputDevices: () => Promise<void>;
  setTargetPatternId: (id: number | null) => void;
  setTargetMeasureIdx: (idx: number | null) => void;
  setTempRecording: (temp: TempRecordingData | null) => void;
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
  recordingStatus?: string;
  setRecordingStatus?: (status: string) => void;
}
