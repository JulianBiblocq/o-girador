/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { useAudioSync, audioEngine, masterVolumeNode, buildTickSchedule } from '../hooks/useAudioSync';
import { useSequencer } from './SequencerContext';
import { getVocalRecording, saveVocalRecording } from '../db';
import { getLocalLibrary, savePresetToLibrary } from '../library';
import { vouVadiarPreset, baqueDeImalePreset, ASSETS_BASE_URL, i18n, instrumentsConfig } from '../data';
import { Preset, Pattern, TrackGroup, TimeSignature } from '../types';
import { migrateCirclesToTracks } from '../migration';

// Web Audio recording variables
let wavRecordingBuffersL: Float32Array[] = [];
let wavRecordingBuffersR: Float32Array[] = [];
let scriptProcessorNode: ScriptProcessorNode | null = null;

export type AudioContextType = ReturnType<typeof useAudioSync> & {
  masterVol: number;
  setMasterVol: React.Dispatch<React.SetStateAction<number>>;
  masterEQ: { low: number; mid: number; high: number };
  setMasterEQ: React.Dispatch<React.SetStateAction<{ low: number; mid: number; high: number }>>;
  masterCompressor: { threshold: number; ratio: number };
  setMasterCompressor: React.Dispatch<React.SetStateAction<{ threshold: number; ratio: number }>>;
  reverbType: 'room' | 'studio' | 'hall';
  setReverbType: React.Dispatch<React.SetStateAction<'room' | 'studio' | 'hall'>>;
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
  handleShare: () => Promise<void>;
  handleSaveToLocal: () => Promise<void>;
  handleLoadLocalPreset: (name: string) => Promise<void>;
  activePresetName: string;
  setActivePresetName: React.Dispatch<React.SetStateAction<string>>;
  handleTimeSigChange: (selectValue: TimeSignature) => Promise<void>;
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

// Helpers for base64 vocal recording conversion
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const base64ToBlob = (base64Data: string): Blob => {
  const parts = base64Data.split(';base64,');
  let contentType = '';
  let rawBase64 = base64Data;
  if (parts.length === 2) {
    contentType = parts[0].replace('data:', '');
    rawBase64 = parts[1];
  }
  const sliceSize = 512;
  const byteCharacters = atob(rawBase64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType || 'audio/webm' });
};

function bufferToWav(leftBuffers: Float32Array[], rightBuffers: Float32Array[], sampleRate: number): Blob {
  let totalLength = 0;
  for (let i = 0; i < leftBuffers.length; i++) {
    totalLength += leftBuffers[i].length;
  }

  const mergedLeft = new Float32Array(totalLength);
  const mergedRight = new Float32Array(totalLength);
  let offset = 0;
  for (let i = 0; i < leftBuffers.length; i++) {
    mergedLeft.set(leftBuffers[i], offset);
    mergedRight.set(rightBuffers[i], offset);
    offset += leftBuffers[i].length;
  }

  const interleaved = new Float32Array(totalLength * 2);
  for (let i = 0; i < totalLength; i++) {
    interleaved[i * 2] = mergedLeft[i];
    interleaved[i * 2 + 1] = mergedRight[i];
  }

  const buffer = new ArrayBuffer(44 + interleaved.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + interleaved.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, interleaved.length * 2, true);

  let index = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(index, intSample, true);
    index += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sequencer = useSequencer();

  const [masterVol, setMasterVol] = useState<number>(-6);
  const [masterEQ, setMasterEQ] = useState<{ low: number; mid: number; high: number }>({ low: 0, mid: 0, high: 0 });
  const [masterCompressor, setMasterCompressor] = useState<{ threshold: number; ratio: number }>({ threshold: -20, ratio: 4 });
  const [reverbType, setReverbType] = useState<'room' | 'studio' | 'hall'>(() => {
    return (localStorage.getItem('oGirador_reverb_type') as any) || 'room';
  });
  const [activeKeyboardInstrumentId, setActiveKeyboardInstrumentId] = useState<string | null>(null);

  const [activePresetName, setActivePresetName] = useState<string>('');

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  const t = (key: string) => {
    return (i18n[sequencer.lang] as any)[key] || key;
  };

  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const audioSync = useAudioSync({
    tracks: sequencer.tracks,
    tracksRef: sequencer.tracksRef,
    totalMeasures: sequencer.totalMeasures,
    totalMeasuresRef: sequencer.totalMeasuresRef,
    measureTimeSigs: sequencer.measureTimeSigs,
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
    isLoopingRef: sequencer.isLoopingRef,
    songSectionsRef: sequencer.songSectionsRef,
    activeVariationsRef: sequencer.activeVariationsRef,

    isRecordingVocal: sequencer.isRecordingVocal,
    startVocalRecording: sequencer.startVocalRecording,
    stopVocalRecording: sequencer.stopVocalRecording,
    finishVocalRecording: sequencer.finishVocalRecording,
    recordingVocalPatternIdRef: sequencer.recordingVocalPatternIdRef,
    vocalRecordingStateRef: sequencer.vocalRecordingStateRef,
    recordedMeasuresCountRef: sequencer.recordedMeasuresCountRef,
    recordingDurationMeasuresRef: sequencer.recordingDurationMeasuresRef,
    vocalPlayersRef: sequencer.vocalPlayersRef,
    isVocalGuideEnabledRef: sequencer.isVocalGuideEnabledRef,
    loadVocalRecording: sequencer.loadVocalRecording,

    isPlayingRef: sequencer.isPlayingRef,
    currentStepIndexRef: sequencer.currentStepIndexRef,
    measureCountRef: sequencer.measureCountRef,
    lastPlayedSignalIdRef: sequencer.lastPlayedSignalIdRef,
    setIsPlayingRef: sequencer.setIsPlayingRef,

    bpm: sequencer.bpm,
    isLeftHanded: sequencer.isLeftHanded,
    activeKeyboardInstrumentId,
    masterVol,
    masterEQ,
    masterCompressor,
    reverbType
  });

  // Dynamic layout radial positioning offsets
  const updateRadii = (list: TrackGroup[]) => {
    const visibleList = list.filter(t => {
      const inst = instrumentsConfig[t.instrumentIdx];
      return !t.isHidden && inst?.id !== 'apito';
    });
    if (visibleList.length === 0) return;
    const minRadius = 180;
    const maxRadius = 495;

    if (visibleList.length === 1) {
      visibleList[0].radius = (minRadius + maxRadius) / 2;
    } else {
      const gap = (maxRadius - minRadius) / (visibleList.length - 1);
      visibleList.forEach((t, idx) => {
        t.radius = minRadius + idx * gap;
      });
    }
  };

  const normalizePatternData = (p: Pattern, instIdx: number, targetMeasures: number) => {
    if (!p.notes) p.notes = Array(p.steps).fill('');
    if (!p.lyrics) p.lyrics = Array(p.steps).fill('');
    if (!p.activeSteps) p.activeSteps = Array(p.steps).fill(0);
    if (!p.measureAssignments) {
      p.measureAssignments = Array(targetMeasures).fill(false);
    } else if (p.measureAssignments.length < targetMeasures) {
      const currentLen = p.measureAssignments.length;
      for (let i = currentLen; i < targetMeasures; i++) {
        p.measureAssignments.push(p.measureAssignments[0] || false);
      }
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const applyPreset = useCallback(async (p: any) => {
    try {
      sequencer.clearHistory();
      sequencer.setLetras(p.letras || '');
      sequencer.setMetadata(p.metadata || { toada: '', nacao: '', compositor: '', ritmo: '' });
      
      let loadedTracks: TrackGroup[] = [];
      let loadedMeasures = p.totalMeasures || 8;
      const version = p.version || 1;

      if (p.tracks) {
        loadedTracks = JSON.parse(JSON.stringify(p.tracks));
        if (version < 2) {
          loadedTracks.forEach(t => {
            if (t.instrumentIdx >= 4) {
              t.instrumentIdx += 1;
            }
          });
        }
        if (version < 3) {
          loadedTracks.forEach(t => {
            if (t.instrumentIdx >= 8) {
              t.instrumentIdx += 1;
            }
          });
        }
        loadedTracks.forEach(t => t.patterns.forEach(ptn => normalizePatternData(ptn, t.instrumentIdx, loadedMeasures)));
      } else if (p.circles) {
        const oldCircles = JSON.parse(JSON.stringify(p.circles));
        if (version < 2) {
          oldCircles.forEach((c: any) => {
            if (c.instrumentIdx >= 4) {
              c.instrumentIdx += 1;
            }
          });
        }
        if (version < 3) {
          oldCircles.forEach((c: any) => {
            if (c.instrumentIdx >= 8) {
              c.instrumentIdx += 1;
            }
          });
        }
        loadedTracks = migrateCirclesToTracks(oldCircles, loadedMeasures);
        loadedTracks.forEach(t => t.patterns.forEach(ptn => normalizePatternData(ptn, t.instrumentIdx, loadedMeasures)));
      }
      
      const promises: Promise<void>[] = [];
      loadedTracks.forEach(t => {
        const inst = instrumentsConfig[t.instrumentIdx];
        if (inst && inst.type === 'voice') {
          t.patterns.forEach(ptn => {
            if (ptn.vocalAudioData) {
              const patternId = ptn.id;
              const b64 = ptn.vocalAudioData;
              delete ptn.vocalAudioData;
              promises.push(
                (async () => {
                  try {
                    const blob = base64ToBlob(b64);
                    await saveVocalRecording(patternId, blob);
                  } catch (err) {
                    console.error(`Failed to save vocal recording for pattern ${patternId}:`, err);
                  }
                })()
              );
            }
          });
        }
      });

      if (promises.length > 0) {
        try {
          await Promise.all(promises);
        } catch (err) {
          console.error("Error restoring vocal recordings from base64:", err);
        }
      }

      updateRadii(loadedTracks);

      sequencer.setTracks(loadedTracks);
      sequencer.setTotalMeasures(loadedMeasures);
      sequencer.setBpm(Math.round(p.bpm || 90));
      sequencer.setTimeSig(p.timeSig || '4/4');

      const defaultBpm = Math.round(p.bpm || 90);
      const defaultTimeSig = p.timeSig || '4/4';

      const loadedBpms = p.measureBpms && Array.isArray(p.measureBpms)
        ? p.measureBpms.map((b: number) => Math.round(b))
        : Array(loadedMeasures).fill(defaultBpm);

      const loadedTimeSigs = p.measureTimeSigs && Array.isArray(p.measureTimeSigs)
        ? p.measureTimeSigs
        : Array(loadedMeasures).fill(defaultTimeSig);

      const loadedBpmTransitions = p.measureBpmTransitions && Array.isArray(p.measureBpmTransitions)
        ? p.measureBpmTransitions
        : Array(loadedMeasures).fill('immediate');

      const loadedVols = p.measureVols && Array.isArray(p.measureVols)
        ? p.measureVols.map((v: number) => Math.round(v))
        : Array(loadedMeasures).fill(100);

      const loadedVolTransitions = p.measureVolTransitions && Array.isArray(p.measureVolTransitions)
        ? p.measureVolTransitions
        : Array(loadedMeasures).fill('immediate');

      sequencer.setMeasureBpms(loadedBpms);
      sequencer.setMeasureTimeSigs(loadedTimeSigs);
      sequencer.setMeasureBpmTransitions(loadedBpmTransitions);
      sequencer.setMeasureVols(loadedVols);
      sequencer.setMeasureVolTransitions(loadedVolTransitions);

      if (p.loopStartMeasure !== undefined) sequencer.setLoopStartMeasure(p.loopStartMeasure);
      if (p.loopEndMeasure !== undefined) sequencer.setLoopEndMeasure(p.loopEndMeasure);
      if (p.isLoopRegionActive !== undefined) sequencer.setIsLoopRegionActive(p.isLoopRegionActive);
      if (p.isLooping !== undefined) sequencer.setIsLooping(p.isLooping);

      if (p.songSections && Array.isArray(p.songSections)) {
        sequencer.setSongSections(p.songSections);
      } else {
        sequencer.setSongSections([]);
      }

      if (p.measureSignals && Array.isArray(p.measureSignals)) {
        sequencer.setMeasureSignals(p.measureSignals);
      } else {
        sequencer.setMeasureSignals(Array(loadedMeasures).fill(null));
      }

      if (p.masterEQ) {
        setMasterEQ(p.masterEQ);
      } else {
        setMasterEQ({ low: 0, mid: 0, high: 0 });
      }

      if (p.masterCompressor) {
        setMasterCompressor(p.masterCompressor);
      } else {
        setMasterCompressor({ threshold: -20, ratio: 4 });
      }

      if (p.masterVol !== undefined) {
        setMasterVol(p.masterVol);
      }

      // Sync refs
      sequencer.tracksRef.current = loadedTracks;
      sequencer.totalMeasuresRef.current = loadedMeasures;
      sequencer.measureBpmsRef.current = loadedBpms;
      sequencer.measureTimeSigsRef.current = loadedTimeSigs;
      sequencer.measureBpmTransitionsRef.current = loadedBpmTransitions;
      sequencer.measureVolsRef.current = loadedVols;
      sequencer.measureVolTransitionsRef.current = loadedVolTransitions;

      try {
        if (import.meta.env.DEV) {
          console.log("⚙️⚙️⚙️ [loadFallbackPreset] Compiling tick schedule synchronously...");
        }
        audioSync.tickScheduleRef.current = buildTickSchedule(
          loadedTracks,
          loadedMeasures,
          loadedTimeSigs,
          instrumentsConfig,
          null
        );
        if (import.meta.env.DEV) {
          console.log("✅✅✅ [loadFallbackPreset] Done. Compiled measures count:", audioSync.tickScheduleRef.current.size);
        }
      } catch (err) {
        console.error("❌❌❌ [loadFallbackPreset] Synchronous compilation failed:", err);
      }

      sequencer.measureCountRef.current = 0;
      audioSync.setCurrentMeasure(0);
      audioSync.setIsLoading(false);
    } catch (err) {
      console.error("Failed to apply preset:", err);
      audioSync.setIsLoading(false);
      throw err;
    }
  }, []);

  const loadFallbackPreset = useCallback(async (name: string) => {
    let p;
    if (name.endsWith('.json')) {
      try {
        const response = await fetch(`${ASSETS_BASE_URL}presets/${name}`);
        if (!response.ok) throw new Error('Network response was not ok');
        p = await response.json();
      } catch (error) {
        console.error('Error fetching preset:', error);
        window.alert(t('invalidFile'));
        return;
      }
    } else {
      p = name === 'baque-de-imale' ? baqueDeImalePreset : vouVadiarPreset;
    }
    await applyPreset(p);
  }, [applyPreset]);

  const handlePresetSelect = async (value: string) => {
    setActivePresetName(value);
    await loadFallbackPreset(value);
  };

  const handleTimeSigChange = async (selectValue: TimeSignature) => {
    const shouldResize = await sequencer.confirmAsync(t('confirmResize'));
    if (shouldResize) {
      sequencer.pushUndoState();
      sequencer.setTimeSig(selectValue);
      audioSync.setCurrentStepIndex(-1);
      audioSync.setCurrentMeasure(0);
      
      let targetSteps = 16;
      if (selectValue === '3/4' || selectValue === '6/8') targetSteps = 12;
      if (selectValue === '2/4') targetSteps = 8;
      if (selectValue === '12/8') targetSteps = 24;

      const resizedList = sequencer.tracks.map((t) => {
        const nextPatterns = t.patterns.map(p => {
          const nextStepsArr = Array(targetSteps).fill(0);
          const nextLyrics = Array(targetSteps).fill('');
          const nextNotes = Array(targetSteps).fill('');
          const nextVols = Array(targetSteps).fill(80);
          const nextDecays = Array(targetSteps).fill(100);

          for (let idx = 0; idx < Math.min(targetSteps, p.steps); idx++) {
            nextStepsArr[idx] = p.activeSteps[idx];
            nextLyrics[idx] = p.lyrics?.[idx] || '';
            nextNotes[idx] = p.notes?.[idx] || '';
            if (p.volumes && p.volumes[idx] !== undefined) nextVols[idx] = p.volumes[idx];
            if (p.decays && p.decays[idx] !== undefined) nextDecays[idx] = p.decays[idx];
          }

          return {
            ...p,
            steps: targetSteps,
            activeSteps: nextStepsArr,
            lyrics: nextLyrics,
            notes: nextNotes,
            volumes: nextVols,
            decays: nextDecays,
            microtimings: Array(targetSteps).fill(0)
          };
        });
        return { ...t, patterns: nextPatterns };
      });

      sequencer.setTracks(resizedList);
      sequencer.tracksRef.current = resizedList;
    }
  };

  const handleSaveState = async () => {
    const tracksCopy = JSON.parse(JSON.stringify(sequencer.tracks));
    for (const t of tracksCopy) {
      const inst = instrumentsConfig[t.instrumentIdx];
      if (inst && inst.type === 'voice') {
        for (const p of t.patterns) {
          try {
            const blob = await getVocalRecording(p.id);
            if (blob) {
              const b64 = await blobToBase64(blob);
              p.vocalAudioData = b64;
            }
          } catch (err) {
            console.error(`Failed to get vocal recording for pattern ${p.id}:`, err);
          }
        }
      }
    }

    const dataToSave: Preset = {
      bpm: sequencer.bpm,
      timeSig: sequencer.timeSig,
      version: 3,
      totalMeasures: sequencer.totalMeasures,
      tracks: tracksCopy,
      letras: sequencer.letras,
      metadata: sequencer.metadata,
      measureTimeSigs: sequencer.measureTimeSigs,
      measureBpms: sequencer.measureBpms,
      measureBpmTransitions: sequencer.measureBpmTransitions,
      measureVols: sequencer.measureVols,
      measureVolTransitions: sequencer.measureVolTransitions,
      songSections: sequencer.songSections,
      measureSignals: sequencer.measureSignals,
      masterEQ,
      masterCompressor,
      masterVol
    };
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
    const dlLink = document.createElement('a');
    dlLink.href = URL.createObjectURL(blob);
    
    let fileName = 'rythme_samambaia.json';
    if (sequencer.metadata?.toada && sequencer.metadata.toada.trim() !== '') {
      const cleanTitle = sequencer.metadata.toada.trim()
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_-]+/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      if (cleanTitle) {
        fileName = `${cleanTitle}.json`;
      }
    }
    
    dlLink.download = fileName;
    dlLink.click();
  };

  const handleLoadState = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const resultText = evt.target?.result as string;
        const data = JSON.parse(resultText);
        await applyPreset(data);
      } catch (err: any) {
        console.error("Error loading preset file:", err);
        window.alert(`${t('invalidFile')}\n\nError details: ${err?.message || err}`);
      }
    };
    reader.readAsText(file);
  };

  const handleShare = async () => {
    const tracksCopy = JSON.parse(JSON.stringify(sequencer.tracks));
    tracksCopy.forEach((t: any) => t.patterns?.forEach((p: any) => { delete p.vocalAudioData; }));

    const cleanMetadata = sequencer.metadata ? {
      ...sequencer.metadata,
      partitionImage: undefined,
      rhythmSignals: sequencer.metadata.rhythmSignals ? sequencer.metadata.rhythmSignals.map(sig => ({
        ...sig,
        image: ''
      })) : []
    } : undefined;

    const dataToShare: Preset = {
      bpm: sequencer.bpm,
      timeSig: sequencer.timeSig,
      version: 3,
      totalMeasures: sequencer.totalMeasures,
      tracks: tracksCopy,
      letras: sequencer.letras,
      metadata: cleanMetadata,
      measureTimeSigs: sequencer.measureTimeSigs,
      measureBpms: sequencer.measureBpms,
      measureBpmTransitions: sequencer.measureBpmTransitions,
      measureVols: sequencer.measureVols,
      measureVolTransitions: sequencer.measureVolTransitions,
      songSections: sequencer.songSections,
      measureSignals: sequencer.measureSignals,
      masterEQ,
      masterCompressor,
      masterVol
    };

    const textStr = JSON.stringify(dataToShare);
    try {
      await navigator.clipboard.writeText(textStr);
      window.alert(t('shareSuccess') || 'Link copied to clipboard!');
    } catch (err) {
      console.error("Clipboard write failed:", err);
      window.prompt("Copy this content:", textStr);
    }
  };

  const handleSaveToLocal = async () => {
    try {
      const tracksCopy = JSON.parse(JSON.stringify(sequencer.tracks));
      tracksCopy.forEach((t: any) => t.patterns?.forEach((p: any) => { delete p.vocalAudioData; }));

      const cleanMetadata = sequencer.metadata ? {
        ...sequencer.metadata,
        partitionImage: undefined
      } : undefined;

      const dataToSave: Preset = {
        bpm: sequencer.bpm,
        timeSig: sequencer.timeSig,
        version: 3,
        totalMeasures: sequencer.totalMeasures,
        tracks: tracksCopy,
        letras: sequencer.letras,
        metadata: cleanMetadata,
        measureTimeSigs: sequencer.measureTimeSigs,
        measureBpms: sequencer.measureBpms,
        measureBpmTransitions: sequencer.measureBpmTransitions,
        measureVols: sequencer.measureVols,
        measureVolTransitions: sequencer.measureVolTransitions,
        songSections: sequencer.songSections,
        measureSignals: sequencer.measureSignals,
        masterEQ,
        masterCompressor,
        masterVol
      };

      const name = sequencer.metadata?.toada?.trim() || 'Sem Título';
      await savePresetToLibrary(name, dataToSave);
      window.alert(t('presetSavedLocal') || 'Saved locally!');
    } catch (err) {
      console.error("Local save failed:", err);
    }
  };

  const handleLoadLocalPreset = async (name: string) => {
    try {
      const library = await getLocalLibrary();
      const p = library[name];
      if (p) {
        await applyPreset(p);
      }
    } catch (err) {
      console.error("Local load failed:", err);
    }
  };

  // Recording
  const handleAudioRecordingToggle = async () => {
    const isNativeAudioContextInstance = (obj: any): boolean => {
      if (!obj) return false;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const BaseAudioCtx = (window as any).BaseAudioContext;
      if (AudioCtx && obj instanceof AudioCtx) return true;
      if (BaseAudioCtx && obj instanceof BaseAudioCtx) return true;
      const name = obj.constructor?.name;
      return name === 'AudioContext' || name === 'webkitAudioContext' || name === 'BaseAudioContext';
    };

    const isNativeCtx = (ctx: any) => ctx && typeof ctx.createScriptProcessor === 'function';

    const findNativeAudioContext = (obj: any, visited: Set<any> = new Set()): any => {
      if (!obj || typeof obj !== 'object') return null;
      if (visited.has(obj)) return null;
      visited.add(obj);
      if (isNativeAudioContextInstance(obj) && isNativeCtx(obj)) return obj;
      if (obj.nodeType || obj.$$typeof) return null;
      const directProps = ['_nativeContext', '_nativeAudioContext', 'rawContext', 'context', '_context'];
      for (const prop of directProps) {
        try {
          const val = obj[prop];
          if (val && typeof val === 'object') {
            const found = findNativeAudioContext(val, visited);
            if (found) return found;
          }
        } catch (e) {}
      }
      for (const key of Object.keys(obj)) {
        try {
          const val = obj[key];
          if (val && typeof val === 'object') {
            const found = findNativeAudioContext(val, visited);
            if (found) return found;
          }
        } catch (e) {}
      }
      try {
        const proto = Object.getPrototypeOf(obj);
        if (proto) {
          const found = findNativeAudioContext(proto, visited);
          if (found) return found;
        }
      } catch (e) {}
      return null;
    };

    const findNativeAudioNode = (obj: any, visited: Set<any> = new Set()): any => {
      if (!obj || typeof obj !== 'object') return null;
      if (visited.has(obj)) return null;
      visited.add(obj);
      const isNativeAudioNodeInstance = (val: any): boolean => {
        if (!val) return false;
        const AudioNodeClass = window.AudioNode;
        if (AudioNodeClass && val instanceof AudioNodeClass) return true;
        const name = val.constructor?.name;
        return typeof name === 'string' && (
          name === 'GainNode' ||
          name === 'AudioNode' ||
          name === 'AudioDestinationNode' ||
          name === 'ChannelMergerNode' ||
          name.endsWith('Node')
        );
      };
      if (isNativeAudioNodeInstance(obj)) return obj;
      if (obj.nodeType || obj.$$typeof) return null;
      const directProps = ['_nativeAudioNode', 'output', 'input', '_gainNode'];
      for (const prop of directProps) {
        try {
          const val = obj[prop];
          if (val && typeof val === 'object') {
            const found = findNativeAudioNode(val, visited);
            if (found) return found;
          }
        } catch (e) {}
      }
      for (const key of Object.keys(obj)) {
        try {
          const val = obj[key];
          if (val && typeof val === 'object') {
            const found = findNativeAudioNode(val, visited);
            if (found) return found;
          }
        } catch (e) {}
      }
      try {
        const proto = Object.getPrototypeOf(obj);
        if (proto) {
          const found = findNativeAudioNode(proto, visited);
          if (found) return found;
        }
      } catch (e) {}
      return null;
    };

    let audioContext: any = null;
    try {
      await Tone.start();
      if (masterVolumeNode) {
        audioContext = findNativeAudioContext(masterVolumeNode);
      }
      if (!audioContext && Tone.context) {
        audioContext = findNativeAudioContext(Tone.context);
      }
      if (!audioContext && typeof Tone.getContext === 'function') {
        audioContext = findNativeAudioContext(Tone.getContext());
      }
      if (!audioContext) {
        throw new Error("L'AudioContext de l'application n'a pas pu être résolu.");
      }

      if (!isRecording) {
        wavRecordingBuffersL = [];
        wavRecordingBuffersR = [];
        const configs = [
          { size: 4096, in: 2, out: 2 },
          { size: 4096, in: 1, out: 1 },
          { size: 8192, in: 2, out: 2 },
          { size: 8192, in: 1, out: 1 },
          { size: 2048, in: 2, out: 2 },
          { size: 2048, in: 1, out: 1 }
        ];

        let createdNode = null;
        let lastError = null;
        for (const config of configs) {
          try {
            createdNode = audioContext.createScriptProcessor(config.size, config.in, config.out);
            if (createdNode) break;
          } catch (e) {
            lastError = e;
          }
        }

        if (!createdNode) throw lastError || new Error("Failed to create ScriptProcessorNode");
        scriptProcessorNode = createdNode;

        scriptProcessorNode.onaudioprocess = (e) => {
          const left = e.inputBuffer.getChannelData(0);
          const right = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : left;
          wavRecordingBuffersL.push(new Float32Array(left));
          wavRecordingBuffersR.push(new Float32Array(right));
        };

        if (masterVolumeNode) {
          const nativeNode = findNativeAudioNode(masterVolumeNode);
          if (nativeNode && typeof nativeNode.connect === 'function') {
            nativeNode.connect(scriptProcessorNode);
          } else {
            masterVolumeNode.connect(scriptProcessorNode);
          }
        }
        scriptProcessorNode.connect(audioContext.destination);
        setIsRecording(true);
      } else {
        const sampleRate = audioContext.sampleRate;
        if (scriptProcessorNode) {
          try {
            scriptProcessorNode.disconnect();
            if (masterVolumeNode) {
              const nativeNode = findNativeAudioNode(masterVolumeNode);
              if (nativeNode && typeof nativeNode.disconnect === 'function') {
                try {
                  nativeNode.disconnect(scriptProcessorNode);
                } catch (e) {
                  nativeNode.disconnect();
                }
              } else {
                masterVolumeNode.disconnect(scriptProcessorNode);
              }
            }
          } catch (e) {}
          scriptProcessorNode = null;
        }
        setIsRecording(false);

        if (wavRecordingBuffersL.length > 0) {
          const wavBlob = bufferToWav(wavRecordingBuffersL, wavRecordingBuffersR, sampleRate);
          const url = URL.createObjectURL(wavBlob);
          const downloadLink = document.createElement('a');
          downloadLink.download = 'O Girador_Export.wav';
          downloadLink.href = url;
          downloadLink.click();
        }
      }
    } catch (err) {
      console.error("Erreur avec l'enregistrement WAV:", err);
    }
  };

  const value: AudioContextType = {
    ...audioSync,
    masterVol,
    setMasterVol,
    masterEQ,
    setMasterEQ,
    masterCompressor,
    setMasterCompressor,
    reverbType,
    setReverbType,
    activeKeyboardInstrumentId,
    setActiveKeyboardInstrumentId,
    isRecording,
    recordingSeconds,
    handleAudioRecordingToggle,
    applyPreset,
    loadFallbackPreset,
    handlePresetSelect,
    handleSaveState,
    handleLoadState,
    handleShare,
    handleSaveToLocal,
    handleLoadLocalPreset,
    activePresetName,
    setActivePresetName,
    handleTimeSigChange
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
