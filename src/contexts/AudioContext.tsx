/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSequencerStore } from '../stores/useSequencerStore';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadTone } from '../ToneLoader';
import { useAudioSync, audioEngine, masterVolumeNode } from '../hooks/useAudioSync';
import { useSequencer } from './SequencerContext';
import { getVocalRecording, saveVocalRecording } from '../db';
import { getLocalLibrary, savePresetToLibrary } from '../library';
import { vouVadiarPreset, baqueDeImalePreset, ASSETS_BASE_URL, i18n, instrumentsConfig } from '../data';
import { Preset, Pattern, TrackGroup, TimeSignature } from '../types';
import { migrateCirclesToTracks } from '../migration';

// Web Audio recording variables
let wavRecordingBuffersL: Float32Array[] = [];
let wavRecordingBuffersR: Float32Array[] = [];
let recorderNode: AudioWorkletNode | null = null;
let isolatedRecordingContext: AudioContext | null = null;
let streamDestination: any = null;
let streamSource: MediaStreamAudioSourceNode | null = null;

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
  handleShare: () => Promise<void>;
  handleSaveToLocal: () => Promise<void>;
  getCurrentPresetData: () => Preset;
  handleLoadLocalPreset: (name: string) => Promise<void>;
  activePresetName: string;
  setActivePresetName: React.Dispatch<React.SetStateAction<string>>;
  handleTimeSigChange: (selectValue: TimeSignature) => Promise<void>;
  isCompiling: boolean;
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
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const measureTimeSigs = useSequencerStore(state => state.measureTimeSigs);

  const [masterVol, setMasterVol] = useState<number>(-10);
  const [masterEQ, setMasterEQ] = useState<{ low: number; mid: number; high: number }>({ low: 0, mid: 0, high: 0 });
  const [masterCompressor, setMasterCompressor] = useState<{ threshold: number; ratio: number }>({ threshold: -20, ratio: 4 });
  const [reverbDecay, setReverbDecay] = useState<number>(() => {
    const saved = localStorage.getItem('oGirador_reverb_decay');
    return saved ? parseFloat(saved) : 2.5;
  });
  const [masterReverbVol, setMasterReverbVol] = useState<number>(() => {
    const saved = localStorage.getItem('oGirador_master_reverb_vol');
    return saved ? parseFloat(saved) : 0;
  });
  const [activeKeyboardInstrumentId, setActiveKeyboardInstrumentId] = useState<string | null>(null);

  const [activePresetName, setActivePresetName] = useState<string>('');

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  useEffect(() => {
    localStorage.setItem('oGirador_reverb_decay', reverbDecay.toString());
  }, [reverbDecay]);

  useEffect(() => {
    localStorage.setItem('oGirador_master_reverb_vol', masterReverbVol.toString());
  }, [masterReverbVol]);

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
    tracksRef: sequencer.tracksRef,
    totalMeasures: totalMeasures,
    totalMeasuresRef: sequencer.totalMeasuresRef,
    measureTimeSigs: measureTimeSigs,
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
    masterReverbVol,
    reverbDecay
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
            if (t.instrumentIdx === 8) {
              const isApito = t.patterns.some(p => p.activeSteps && p.activeSteps.some(s => s === 'W' || s === 'w'));
              if (!isApito) {
                t.instrumentIdx = 9;
              }
            } else if (t.instrumentIdx > 8) {
              t.instrumentIdx = 9;
            }
          });
        }
        // Clamp any out-of-bounds instrumentIdx
        loadedTracks.forEach(t => {
          if (t.instrumentIdx >= instrumentsConfig.length) {
            t.instrumentIdx = instrumentsConfig.length - 1;
          }
        });
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
            if (c.instrumentIdx === 8) {
              const isApito = c.activeSteps && c.activeSteps.some((s: any) => s === 'W' || s === 'w');
              if (!isApito) {
                c.instrumentIdx = 9;
              }
            } else if (c.instrumentIdx > 8) {
              c.instrumentIdx = 9;
            }
          });
        }
        // Clamp any out-of-bounds instrumentIdx
        oldCircles.forEach((c: any) => {
          if (c.instrumentIdx >= instrumentsConfig.length) {
            c.instrumentIdx = instrumentsConfig.length - 1;
          }
        });
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
            } else if (ptn.vocalAudioUrl) {
              const patternId = ptn.id;
              const url = ptn.vocalAudioUrl;
              promises.push(
                (async () => {
                  try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                    const blob = await response.blob();
                    await saveVocalRecording(patternId, blob);
                  } catch (err) {
                    console.error(`Failed to download and save vocal recording from ${url}:`, err);
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

      useSequencerStore.getState().setTracks(loadedTracks);
      sequencer.setTotalMeasures(loadedMeasures);
      sequencer.setBpmRaw(Math.round(p.bpm || 90));
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

      if (p.songMarkers && Array.isArray(p.songMarkers)) {
        sequencer.setSongMarkers(p.songMarkers);
      } else {
        sequencer.setSongMarkers([]);
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
      if (p.masterReverbVol !== undefined) {
        setMasterReverbVol(p.masterReverbVol);
      }

      if (p.reverbDecay !== undefined) {
        setReverbDecay(p.reverbDecay);
      } else if ((p as any).reverbType) {
        const oldType = (p as any).reverbType;
        if (oldType === 'hall') setReverbDecay(4.5);
        else if (oldType === 'studio') setReverbDecay(2.5);
        else setReverbDecay(1.5);
      }

      if (p.globalSwing) {
        audioSync.setGlobalSwing(p.globalSwing);
      } else if (p.isSwingOn !== undefined) {
        audioSync.setGlobalSwing(p.isSwingOn ? { mode: 'maracatu', customOffsets: [0, 8, -29, -58] } : { mode: 'off', customOffsets: [0, 8, -29, -58] });
      } else {
        audioSync.setGlobalSwing({ mode: 'maracatu', customOffsets: [0, 8, -29, -58] });
      }

      // Sync refs
      sequencer.totalMeasuresRef.current = loadedMeasures;
      sequencer.measureBpmsRef.current = loadedBpms;
      sequencer.measureTimeSigsRef.current = loadedTimeSigs;
      sequencer.measureBpmTransitionsRef.current = loadedBpmTransitions;
      sequencer.measureVolsRef.current = loadedVols;
      sequencer.measureVolTransitionsRef.current = loadedVolTransitions;

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
    if (name.startsWith('cloud:')) {
      const id = name.replace('cloud:', '');
      const { getCloudPreset } = await import('../cloudLibrary');
      p = await getCloudPreset(id);
      if (!p) {
        window.alert(t('invalidFile') || 'Error');
        return;
      }
    } else if (name.startsWith('local:')) {
      const id = name.replace('local:', '');
      // 🛡️ FIX (Audit): Use static import for getLocalLibrary to fix Vite duplicate chunk warning
      p = getLocalLibrary()[id];
      if (!p) {
        window.alert(t('invalidFile') || 'Error');
        return;
      }
    } else if (name.endsWith('.json')) {
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
      audioSync.currentStepIndexRef.current = -1;
      audioSync.setCurrentMeasure(0);
      
      let targetSteps = 16;
      if (selectValue === '3/4' || selectValue === '6/8') targetSteps = 12;
      if (selectValue === '2/4') targetSteps = 8;
      if (selectValue === '12/8') targetSteps = 24;

      const tracks = useSequencerStore.getState().tracks;
      const resizedList = tracks.map((t) => {
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

      useSequencerStore.getState().setTracks(resizedList);
    }
  };

  const handleSaveState = async () => {
    const tracksCopy = JSON.parse(JSON.stringify(useSequencerStore.getState().tracks));
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

    const storeState = useSequencerStore.getState();
    const dataToSave: Preset = {
      bpm: sequencer.bpm,
      timeSig: sequencer.timeSig,
      version: 3,
      totalMeasures: storeState.totalMeasures,
      tracks: tracksCopy,
      letras: sequencer.letras,
      metadata: sequencer.metadata,
      measureTimeSigs: storeState.measureTimeSigs,
      measureBpms: sequencer.measureBpms,
      measureBpmTransitions: sequencer.measureBpmTransitions,
      measureVols: sequencer.measureVols,
      measureVolTransitions: sequencer.measureVolTransitions,
      songSections: storeState.songSections,
      songMarkers: storeState.songMarkers,
      measureSignals: sequencer.measureSignals,
      masterEQ,
      masterCompressor,
      masterVol,
      masterReverbVol,
      reverbDecay,
      isSwingOn: audioSync.globalSwing.mode !== 'off', // Keep for backwards compatibility
      globalSwing: audioSync.globalSwing,
      loopStartMeasure: storeState.loopStartMeasure,
      loopEndMeasure: storeState.loopEndMeasure,
      isLoopRegionActive: storeState.isLoopRegionActive,
      isLooping: sequencer.isLooping
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
    const isPt = sequencer.lang === 'pt';
    const textStr = isPt 
      ? "Descubra O Girador, o sequenciador interativo de Maracatu! https://ogirador.web.app" 
      : "Découvrez O Girador, le séquenceur de Maracatu interactif ! https://ogirador.web.app";
    
    try {
      await navigator.clipboard.writeText(textStr);
      window.alert(isPt ? 'Link copiado para a área de transferência!' : 'Lien copié dans le presse-papier !');
    } catch (err) {
      console.error("Clipboard write failed:", err);
      window.prompt(isPt ? "Copie este texto:" : "Copiez ce texte :", textStr);
    }
  };

  const getCurrentPresetData = (): Preset => {
    const tracksCopy = JSON.parse(JSON.stringify(useSequencerStore.getState().tracks));
    tracksCopy.forEach((t: any) => t.patterns?.forEach((p: any) => { delete p.vocalAudioData; }));

    const cleanMetadata = sequencer.metadata ? {
      ...sequencer.metadata,
      partitionImage: undefined
    } : undefined;

    const storeState = useSequencerStore.getState();

    return {
      bpm: sequencer.bpm,
      timeSig: sequencer.timeSig,
      version: 3,
      totalMeasures: storeState.totalMeasures,
      tracks: tracksCopy,
      letras: sequencer.letras,
      metadata: cleanMetadata,
      measureTimeSigs: storeState.measureTimeSigs,
      measureBpms: sequencer.measureBpms,
      measureBpmTransitions: sequencer.measureBpmTransitions,
      measureVols: sequencer.measureVols,
      measureVolTransitions: sequencer.measureVolTransitions,
      songSections: storeState.songSections,
      songMarkers: storeState.songMarkers,
      measureSignals: sequencer.measureSignals,
      masterEQ,
      masterCompressor,
      masterVol,
      masterReverbVol,
      reverbDecay,
      isSwingOn: audioSync.globalSwing.mode !== 'off',
      globalSwing: audioSync.globalSwing,
      loopStartMeasure: storeState.loopStartMeasure,
      loopEndMeasure: storeState.loopEndMeasure,
      isLoopRegionActive: storeState.isLoopRegionActive,
      isLooping: sequencer.isLooping
    };
  };

  const handleSaveToLocal = async () => {
    try {
      const dataToSave = getCurrentPresetData();
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
    if (!isRecording) {
      wavRecordingBuffersL = [];
      wavRecordingBuffersR = [];

      try {
        const Tone = await loadTone();
        if (Tone.context && Tone.context.state !== 'running') {
          try {
            await Tone.context.resume();
          } catch (e) {
            // console.warn("AudioContext resume failed:", e);
          }
        }
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        try {
          isolatedRecordingContext = new AudioContextClass({ latencyHint: 'playback', sampleRate: 44100 });
        } catch (_) {
          isolatedRecordingContext = new AudioContextClass({ latencyHint: 'playback' });
        }
        
        const workletUrl = import.meta.env.BASE_URL + 'recorder-worklet.js';
        
        try {
          await isolatedRecordingContext.audioWorklet.addModule(workletUrl);
        } catch (e) {
          console.error("Échec 1: addModule sur contexte isolé", e);
          throw e;
        }
        
        try {
          recorderNode = new AudioWorkletNode(isolatedRecordingContext, 'recorder-worklet', {
            numberOfInputs: 1,
            numberOfOutputs: 1
          });
        } catch (e) {
          console.error("Échec 2: new AudioWorkletNode", e);
          throw e;
        }
        
        recorderNode.port.onmessage = (e: MessageEvent) => {
          if (e.data && e.data.left && e.data.right) {
            wavRecordingBuffersL.push(e.data.left);
            wavRecordingBuffersR.push(e.data.right);
          }
        };

        if (masterVolumeNode) {
          try {
            streamDestination = Tone.context.createMediaStreamDestination();
            masterVolumeNode.connect(streamDestination);
            
            streamSource = isolatedRecordingContext.createMediaStreamSource(streamDestination.stream);
            
            streamSource.connect(recorderNode as unknown as AudioNode);
          } catch (e) {
            console.error("Échec 3: connexion MediaStream master -> recorder", e);
            throw e;
          }
        }
        
        try {
          recorderNode.connect(isolatedRecordingContext.destination);
        } catch (e) {
          console.error("Échec 4: connexion recorder -> destination", e);
          throw e;
        }
        
        setIsRecording(true);
      } catch (error) {
        console.error("Échec de la séquence Worklet :", error);
      }
    } else {
      const exportSampleRate = isolatedRecordingContext ? isolatedRecordingContext.sampleRate : 44100;
      
      if (recorderNode) {
        try { recorderNode.disconnect(); } catch(e) {}
        recorderNode = null;
      }
      if (masterVolumeNode && streamDestination) {
        try { masterVolumeNode.disconnect(streamDestination); } catch(e) {}
      }
      if (streamSource) {
        try { streamSource.disconnect(); } catch(e) {}
        streamSource = null;
      }
      if (isolatedRecordingContext) {
        try { isolatedRecordingContext.close(); } catch(e) {}
        isolatedRecordingContext = null;
      }
      streamDestination = null;
      
      setIsRecording(false);

      if (wavRecordingBuffersL.length > 0) {
        const wavBlob = bufferToWav(wavRecordingBuffersL, wavRecordingBuffersR, exportSampleRate);
        const url = URL.createObjectURL(wavBlob);
        const downloadLink = document.createElement('a');
        downloadLink.download = 'O Girador_Export.wav';
        downloadLink.href = url;
        downloadLink.click();
        
        wavRecordingBuffersL = [];
        wavRecordingBuffersR = [];
      }
    }
  };

  const value: AudioContextType = React.useMemo(() => ({
    ...audioSync,
    masterVol,
    setMasterVol,
    masterEQ,
    setMasterEQ,
    masterCompressor,
    setMasterCompressor,
    reverbDecay,
    setReverbDecay,
    masterReverbVol,
    setMasterReverbVol,
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
    getCurrentPresetData,
    handleLoadLocalPreset,
    activePresetName,
    setActivePresetName,
    handleTimeSigChange
  }), [
    audioSync,
    masterVol,
    masterEQ,
    masterCompressor,
    reverbDecay,
    masterReverbVol,
    activeKeyboardInstrumentId,
    isRecording,
    recordingSeconds,
    activePresetName,
    applyPreset,
    loadFallbackPreset,
    handlePresetSelect,
    handleSaveState,
    handleLoadState,
    handleShare,
    handleSaveToLocal,
    getCurrentPresetData,
    handleLoadLocalPreset,
    handleTimeSigChange
  ]);

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
