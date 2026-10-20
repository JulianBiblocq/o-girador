import React from 'react';
import { useAudioSync } from '../../hooks/useAudioSync';
import { Preset, TimeSignature } from '../../types';

export type AudioContextType = ReturnType<typeof useAudioSync> & {
  masterVol: number;
  setMasterVol: React.Dispatch<React.SetStateAction<number>>;
  masterEQ: { low: number; mid: number; high: number };
  setMasterEQ: React.Dispatch<React.SetStateAction<{ low: number; mid: number; high: number }>>;
  masterCompressor: { threshold: number; ratio: number };
  setMasterCompressor: React.Dispatch<React.SetStateAction<{ threshold: number; ratio: number }>>;
  reverbDecay: number;
  setReverbDecay: React.Dispatch<React.SetStateAction<number>>;
  masterReverbVol: number;
  setMasterReverbVol: React.Dispatch<React.SetStateAction<number>>;
  activeKeyboardInstrumentId: string | null;
  setActiveKeyboardInstrumentId: React.Dispatch<React.SetStateAction<string | null>>;

  // Recording
  isRecording: boolean;
  recordingSeconds: number;
  handleAudioRecordingToggle: () => Promise<void>;

  // Presets
  applyPreset: (p: any) => Promise<void>;
  loadFallbackPreset: (name: string) => Promise<void>;
  handlePresetSelect: (value: string) => Promise<void>;
  handleSaveState: () => Promise<void>;
  handleLoadState: (file: File) => void;

  handleSaveToLocal: () => Promise<void>;
  getCurrentPresetData: () => Preset;
  handleLoadLocalPreset: (name: string) => Promise<void>;
  activePresetName: string;
  setActivePresetName: React.Dispatch<React.SetStateAction<string>>;
  handleTimeSigChange: (selectValue: TimeSignature) => Promise<void>;
  isPresetLoading: boolean;
};
