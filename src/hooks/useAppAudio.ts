import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { useSequencer } from '../contexts/SequencerContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getLocalLibrary } from '../library';
import { instrumentsConfig } from '../data';
import { loadInitialPresetPipeline } from './app-audio/initialPresetLoader';
import { setupPwaLaunchHandler } from './app-audio/pwaLaunchHandler';
import { useAutosaveSubscription } from './app-audio/useAutosaveSubscription';

export function useAppAudio() {
  const audio = useAudio();
  const sequencer = useSequencer();
  const { userProfile } = useAuth();
  const tracks = useSequencerStore(state => state.tracks);

  const [presetFiles, setPresetFiles] = useState<string[]>([]);
  const [localPresets, setLocalPresets] = useState<string[]>([]);
  const hasLoadedInitialPreset = useRef(false);
  const audioRef = useRef<any>(audio);

  useEffect(() => { audioRef.current = audio; }, [audio]);

  const { isSavedIndicatorVisible } = useAutosaveSubscription(audio, audioRef);

  useEffect(() => {
    if (hasLoadedInitialPreset.current) return;
    hasLoadedInitialPreset.current = true;
    loadInitialPresetPipeline(audio, sequencer, userProfile, setPresetFiles);
  }, [audio, sequencer, userProfile]);

  useEffect(() => {
    return setupPwaLaunchHandler(audio.applyPreset);
  }, [audio.applyPreset]);

  // Default Instrument selection for keyboard play
  useEffect(() => {
    if (tracks.length > 0 && !audio.activeKeyboardInstrumentId) {
      const firstNonVoice = tracks.find(t => {
        const conf = instrumentsConfig[t.instrumentIdx];
        return conf && conf.type !== 'voice';
      });
      if (firstNonVoice) {
        audio.setActiveKeyboardInstrumentId(instrumentsConfig[firstNonVoice.instrumentIdx].id);
      } else {
        audio.setActiveKeyboardInstrumentId(instrumentsConfig[tracks[0].instrumentIdx].id);
      }
    }
  }, [tracks, audio]);

  const refreshLocalPresets = useCallback(async () => {
    try {
      const library = await getLocalLibrary();
      setLocalPresets(Object.keys(library));
    } catch (err) {
      console.error("Failed to load local presets:", err);
    }
  }, []);

  useEffect(() => { refreshLocalPresets(); }, [refreshLocalPresets]);

  return {
    presetFiles,
    localPresets,
    isSavedIndicatorVisible,
    refreshLocalPresets,
  };
}
