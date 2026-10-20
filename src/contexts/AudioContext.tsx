import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioSync } from '../hooks/useAudioSync';
import { useSequencer } from './SequencerContext';
import { useAuth, checkHasFullPlaybackAccess } from './AuthContext';
import { getLocalLibrary, savePresetToLibrary } from '../library';
import { i18n } from '../data';
import { AudioContextType } from './audio/audioContextTypes';
import { useAudioEffectsState } from './audio/useAudioEffectsState';
import { useAudioRecordingState } from './audio/useAudioRecordingState';
import { executeApplyPreset } from './audio/audioPresetApplier';
import { fetchFallbackPresetData } from './audio/audioPresetLoader';
import { buildCurrentPresetData } from './audio/audioPresetDataBuilder';
import { handleTimeSigChange as resizeTimeSig } from './audio/audioTimeSigService';

export * from './audio/audioContextTypes';

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, isAdmin } = useAuth();
  const sequencer = useSequencer();
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const measureTimeSigs = useSequencerStore(state => state.measureTimeSigs);

  const fxState = useAudioEffectsState();
  const { isRecording, recordingSeconds, handleAudioRecordingToggle } = useAudioRecordingState();
  const [activePresetName, setActivePresetName] = useState<string>('');
  const [isPresetLoading, setIsPresetLoading] = useState<boolean>(false);

  const audioSync = useAudioSync({
    tracksRef: sequencer.tracksRef,
    totalMeasures,
    totalMeasuresRef: sequencer.totalMeasuresRef,
    measureTimeSigs,
    measureTimeSigsRef: sequencer.measureTimeSigsRef,
    measureBpms: sequencer.measureBpms,
    measureBpmsRef: sequencer.measureBpmsRef,
    measureBpmTransitionsRef: sequencer.measureBpmTransitionsRef,
    measureVolsRef: sequencer.measureVolsRef,
    measureVolTransitionsRef: sequencer.measureVolTransitionsRef,
    measureSignalsRef: sequencer.measureSignalsRef,
    loopStartRef: sequencer.loopStartRef,
    loopEndRef: sequencer.loopEndRef,
    isLoopRegionActiveRef: sequencer.isLoopRegionActiveRef,
    loopModeRef: sequencer.loopModeRef,
    isLoopExitRequestedRef: sequencer.isLoopExitRequestedRef,
    isLoopingRef: sequencer.isLoopingRef,
    songSectionsRef: sequencer.songSectionsRef,
    activeVariationsRef: sequencer.activeVariationsRef,
    isPlayingRef: sequencer.isPlayingRef,
    currentStepIndexRef: sequencer.currentStepIndexRef,
    measureCountRef: sequencer.measureCountRef,
    lastPlayedSignalIdRef: sequencer.lastPlayedSignalIdRef,
    setIsPlayingRef: sequencer.setIsPlayingRef,
    bpm: sequencer.bpm,
    isLeftHanded: sequencer.isLeftHanded,
    activeKeyboardInstrumentId: fxState.activeKeyboardInstrumentId,
    masterVol: fxState.masterVol,
    masterEQ: fxState.masterEQ,
    masterCompressor: fxState.masterCompressor,
    masterReverbVol: fxState.masterReverbVol,
    reverbDecay: fxState.reverbDecay
  });

  const applyPreset = useCallback(async (p: any) => {
    setIsPresetLoading(true);
    try {
      await executeApplyPreset(p, sequencer, audioSync, fxState);
    } finally {
      setTimeout(() => setIsPresetLoading(false), 300);
    }
  }, [audioSync, sequencer, fxState]);

  const t = useCallback((k: string) => (i18n[sequencer.lang as keyof typeof i18n] as any)?.[k] || k, [sequencer.lang]);

  const loadFallbackPreset = useCallback(async (name: string) => {
    setIsPresetLoading(true);
    try {
      const p = await fetchFallbackPresetData(name, sequencer.lang, t);
      if (p) await applyPreset(p);
    } finally {
      setIsPresetLoading(false);
    }
  }, [applyPreset, sequencer.lang, t]);

  const handlePresetSelect = useCallback(async (value: string) => {
    setActivePresetName(value);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (value.startsWith('cloud:')) url.searchParams.set('loadPreset', value.replace('cloud:', ''));
        else url.searchParams.delete('loadPreset');
        window.history.replaceState(null, '', url.toString());
      } catch (_) {}
    }
    await loadFallbackPreset(value);
  }, [loadFallbackPreset]);

  const getCurrentPresetData = useCallback(() => {
    return buildCurrentPresetData(sequencer, fxState.masterEQ, fxState.masterCompressor, fxState.masterVol, audioSync);
  }, [sequencer, fxState, audioSync]);

  const handleSaveToLocal = useCallback(async () => {
    const name = sequencer.metadata?.toada?.trim() || 'Sem Título';
    if (!checkHasFullPlaybackAccess(userProfile, isAdmin)) {
      const lib = await getLocalLibrary();
      if (Object.keys(lib).length >= 3 && !lib[name]) {
        await sequencer.alertAsync(sequencer.lang === 'fr' ? 'Limite de 3 morceaux atteinte.' : 'Limite de 3 músicas atingida.');
        return;
      }
    }
    await savePresetToLibrary(name, getCurrentPresetData());
    window.alert(t('presetSavedLocal') || (sequencer.lang === 'fr' ? 'Sauvegardé localement !' : 'Salvo localmente!'));
  }, [sequencer, userProfile, isAdmin, getCurrentPresetData, t]);

  const handleLoadLocalPreset = useCallback(async (name: string) => {
    const lib = await getLocalLibrary();
    if (lib[name]) await applyPreset(lib[name]);
  }, [applyPreset]);

  const value: AudioContextType = useMemo(() => ({
    ...audioSync,
    ...fxState,
    isRecording, recordingSeconds, handleAudioRecordingToggle,
    applyPreset, loadFallbackPreset, handlePresetSelect,
    handleSaveState: async () => {}, handleLoadState: () => {},
    handleSaveToLocal, getCurrentPresetData, handleLoadLocalPreset,
    activePresetName, setActivePresetName,
    handleTimeSigChange: (sig) => resizeTimeSig(sig, sequencer, audioSync),
    isPresetLoading
  }), [
    audioSync, fxState, isRecording, recordingSeconds, handleAudioRecordingToggle,
    applyPreset, loadFallbackPreset, handlePresetSelect, handleSaveToLocal, getCurrentPresetData,
    handleLoadLocalPreset, activePresetName, sequencer, isPresetLoading
  ]);

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};
