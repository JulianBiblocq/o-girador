/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSequencerStore } from '../stores/useSequencerStore';
import React, { useState, useRef, useEffect } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '@/src/ToneLoader';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}
import { saveVocalRecording, getVocalRecording, deleteVocalRecording } from '../db';
import { TrackGroup, Pattern } from '../types';
import { instrumentsConfig } from '../data';

const VOCAL_RECORDING_ARM_DELAY_MS = 300;

interface UseVocalRecorderProps {
  pushUndoState: () => void;
  bpm: number;
  measureBpms: number[];
  totalMeasures: number;
  audioEngine: any;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  channels: { [id: string]: any };
  masterVolumeNode: any;
  // Refs to sync or update in playback loop
  isPlayingRef: React.MutableRefObject<boolean>;
  measureCountRef: React.MutableRefObject<number>;
  currentStepIndexRef: React.MutableRefObject<number>;
  lastPlayedSignalIdRef: React.MutableRefObject<string | null>;
}

export function useVocalRecorder({
  pushUndoState,
  bpm,
  measureBpms,
  totalMeasures,
  audioEngine,
  setIsPlaying,
  channels,
  masterVolumeNode,
  isPlayingRef,
  measureCountRef,
  currentStepIndexRef,
  lastPlayedSignalIdRef
}: UseVocalRecorderProps) {
  const tracks = useSequencerStore(state => state.tracks);
  const setTracks = useSequencerStore(state => state.setTracks);
  const recordingDurationMeasuresRef = useRef<number>(1);
  const recordedMeasuresCountRef = useRef<number>(0);
  const vocalRecordArmTimeoutRef = useRef<any>(null);
  
  const [isRecordingVocal, setIsRecordingVocal] = useState<boolean>(false);
  const [recordingVocalPatternId, setRecordingVocalPatternId] = useState<number | null>(null);
  const recordingVocalPatternIdRef = useRef<number | null>(null);
  const vocalMediaRecorderRef = useRef<any>(null);
  const vocalStreamRef = useRef<MediaStream | null>(null);
  
  const vocalRecordingStateRef = useRef<'inactive' | 'waiting' | 'recording'>('inactive');
  const vocalPlayersRef = useRef<{ [patternId: number]: any }>({});
  const [recordedPatternIds, setRecordedPatternIds] = useState<number[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>(() => {
    return localStorage.getItem('oGirador_vocal_device_id') || '';
  });
  const [isVocalGuideEnabled, setIsVocalGuideEnabled] = useState<boolean>(true);
  const isVocalGuideEnabledRef = useRef<boolean>(true);

  // Sync state with refs for safeGetTone()?.js loop safety
  useEffect(() => {
    recordingVocalPatternIdRef.current = recordingVocalPatternId;
  }, [recordingVocalPatternId]);

  useEffect(() => {
    isVocalGuideEnabledRef.current = isVocalGuideEnabled;
  }, [isVocalGuideEnabled]);

  // Cleanup effect for GrainPlayers on unmount
  useEffect(() => {
    return () => {
      Object.values(vocalPlayersRef.current).forEach((player: any) => {
        if (player && typeof player.dispose === 'function') {
          try {
            player.dispose();
          } catch (e) {
            console.warn("Error disposing vocal player on unmount:", e);
          }
        }
      });
      vocalPlayersRef.current = {};
    };
  }, []);

  const updateAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedAudioDeviceId) {
        const defaultDev = audioInputs.find(d => d.deviceId === 'default') || audioInputs[0];
        setSelectedAudioDeviceId(defaultDev.deviceId);
      }
    } catch (err) {
      console.warn("Failed to enumerate audio devices:", err);
    }
  };

  useEffect(() => {
    updateAudioDevices();
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', updateAudioDevices);
      }
    } catch (_) {}
    return () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
          navigator.mediaDevices.removeEventListener('devicechange', updateAudioDevices);
        }
      } catch (_) {}
    };
  }, []);

  const handleAudioDeviceChange = (deviceId: string) => {
    setSelectedAudioDeviceId(deviceId);
    localStorage.setItem('oGirador_vocal_device_id', deviceId);
  };

  const loadVocalRecording = async (patternId: number) => {
    try {
      const blob = await getVocalRecording(patternId);
      if (blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await safeGetTone()?.getContext().rawContext.decodeAudioData(arrayBuffer);
        
        if (vocalPlayersRef.current[patternId]) {
          try {
            vocalPlayersRef.current[patternId].dispose();
          } catch (_) {}
        }
        
        const player = new (getTone().GrainPlayer)(audioBuffer);
        player.grainSize = 0.09;
        player.overlap = 0.04;
        const channel = channels['voice'];
        if (channel) {
          player.connect(channel);
        } else if (masterVolumeNode) {
          player.connect(masterVolumeNode);
        } else {
          player.toDestination();
        }
        vocalPlayersRef.current[patternId] = player;
        setRecordedPatternIds((prev) => prev.includes(patternId) ? prev : [...prev, patternId]);
      } else {
        if (vocalPlayersRef.current[patternId]) {
          try {
            vocalPlayersRef.current[patternId].dispose();
          } catch (_) {}
          delete vocalPlayersRef.current[patternId];
        }
        setRecordedPatternIds((prev) => prev.filter((id) => id !== patternId));
      }
    } catch (err) {
      console.error(`Failed to load vocal recording for pattern ${patternId}:`, err);
    }
  };

  const handleImportVocalFile = async (patternId: number, file: File) => {
    try {
      await saveVocalRecording(patternId, file);
      await loadVocalRecording(patternId);
      
      setTracks((prevTracks) => {
        let targetPattern: Pattern | undefined;
        for (const t of prevTracks) {
          const p = t.patterns.find((pat) => pat.id === patternId);
          if (p) {
            targetPattern = p;
            break;
          }
        }
        const measureIdx = targetPattern ? targetPattern.measureAssignments.indexOf(true) : -1;
        const baseBpmOfImport = measureIdx !== -1 ? (measureBpms[measureIdx] || bpm) : bpm;

        return prevTracks.map((t) => {
          const hasPattern = t.patterns.some((p) => p.id === patternId);
          if (!hasPattern) return t;
          return {
            ...t,
            patterns: t.patterns.map((p) => {
              if (p.id === patternId) {
                return { 
                  ...p, 
                  vocalMode: 'micro',
                  vocalBaseBpm: baseBpmOfImport,
                  vocalBpmSync: true
                };
              }
              return p;
            }),
          };
        });
      });
    } catch (err) {
      console.error("Error importing vocal file:", err);
      alert("Erreur lors de l'importation du fichier audio : " + err);
    }
  };

  const handleAudioPatternCreated = async (wavBlob: Blob, durationInMeasures: number, name?: string) => {
    try {
      const newPatternId = Date.now();
      await saveVocalRecording(newPatternId, wavBlob);
      await loadVocalRecording(newPatternId);

      setTracks((prevTracks) => {
        return prevTracks.map((t) => {
          const inst = instrumentsConfig[t.instrumentIdx];
          if (inst && inst.type === 'voice') {
            const newPattern: Pattern = {
              id: newPatternId,
              name: name || `Découpe (${durationInMeasures} mes.)`,
              steps: 16,
              activeSteps: Array(16).fill(0),
              lyrics: Array(16).fill(''),
              notes: Array(16).fill(''),
              measureAssignments: Array(totalMeasures).fill(false),
              vocalMode: 'micro',
              vocalBaseBpm: bpm,
              vocalBpmSync: true
            };
            newPattern.measureAssignments[0] = true;

            return {
              ...t,
              patterns: [...t.patterns, newPattern],
              selectedPatternId: newPatternId
            };
          }
          return t;
        });
      });
    } catch (err) {
      console.error("Error creating audio pattern from sliced slice:", err);
      alert("Erreur lors de la création du pattern découpé : " + err);
    }
  };

  const getSystemDefaultLatencyMs = () => {
    let latencySec = 0.08;
    try {
      const rawCtx = safeGetTone()?.context.rawContext as any;
      if (rawCtx) {
        if (typeof rawCtx.outputLatency === 'number') {
          latencySec += rawCtx.outputLatency;
        }
        if (typeof rawCtx.baseLatency === 'number') {
          latencySec += rawCtx.baseLatency;
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve raw AudioContext latency values:", e);
    }
    return Math.round(latencySec * 1000);
  };

  const cleanupVocalNodes = () => {
    if (vocalRecordArmTimeoutRef.current) {
      clearTimeout(vocalRecordArmTimeoutRef.current);
      vocalRecordArmTimeoutRef.current = null;
    }
    if (vocalMediaRecorderRef.current) {
      vocalMediaRecorderRef.current = null;
    }
    if (vocalStreamRef.current) {
      try {
        vocalStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      vocalStreamRef.current = null;
    }
  };

  const startVocalRecording = async (patternId: number) => {
    try {
      let targetTrack: TrackGroup | undefined;
      let targetPattern: Pattern | undefined;
      for (const t of tracks) {
        const p = t.patterns.find((pat) => pat.id === patternId);
        if (p) {
          targetTrack = t;
          targetPattern = p;
          break;
        }
      }
      if (!targetTrack || !targetPattern) return;

      const initialMeasureIdx = targetPattern.measureAssignments.indexOf(true) !== -1 
        ? targetPattern.measureAssignments.indexOf(true) 
        : 0;
      const baseBpmOfRecording = measureBpms[initialMeasureIdx] || bpm;

      cleanupVocalNodes();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedAudioDeviceId ? { exact: selectedAudioDeviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      vocalStreamRef.current = stream;
      updateAudioDevices();

      const mediaRecorder = new MediaRecorder(stream, {
        audioBitsPerSecond: 96000
      });
      vocalMediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
          await saveVocalRecording(patternId, blob);
          await loadVocalRecording(patternId);

          setTracks((prevTracks) => {
            return prevTracks.map((t) => {
              const hasPattern = t.patterns.some((p) => p.id === patternId);
              if (!hasPattern) return t;
              return {
                ...t,
                patterns: t.patterns.map((p) => {
                  if (p.id === patternId) {
                    return { 
                      ...p, 
                      vocalMode: 'micro',
                      vocalBaseBpm: baseBpmOfRecording,
                      vocalBpmSync: true
                    };
                  }
                  return p;
                }),
              };
            });
          });
        } catch (err) {
          console.error("Error saving vocal recording:", err);
        } finally {
          setIsRecordingVocal(false);
          setRecordingVocalPatternId(null);
          cleanupVocalNodes();
        }
      };

      let measureIdx = targetPattern.measureAssignments.indexOf(true);
      if (measureIdx === -1) {
        pushUndoState();
        setTracks((prevTracks) => {
          return prevTracks.map((t) => {
            const hasPattern = t.patterns.some((p) => p.id === patternId);
            if (!hasPattern) return t;
            return {
              ...t,
              patterns: t.patterns.map((p) => {
                if (p.id === patternId) {
                  const assign = [...p.measureAssignments];
                  assign[0] = true;
                  return { ...p, measureAssignments: assign };
                }
                return p;
              }),
            };
          });
        });
        measureIdx = 0;
      }
      
      let consecutiveMeasures = 0;
      for (let i = measureIdx; i < totalMeasures; i++) {
        if (targetPattern.measureAssignments[i]) {
          consecutiveMeasures++;
        } else {
          break;
        }
      }
      recordingDurationMeasuresRef.current = Math.max(1, consecutiveMeasures);
      recordedMeasuresCountRef.current = 0;

      if (mediaRecorder && mediaRecorder.state === 'inactive') {
        mediaRecorder.start();
        vocalRecordingStateRef.current = 'recording';
      } else {
        vocalRecordingStateRef.current = 'waiting';
      }

      setRecordingVocalPatternId(patternId);
      setIsRecordingVocal(true);
      
      await loadTone();
    await getTone().start();
      
      vocalRecordArmTimeoutRef.current = setTimeout(() => {
        if (!isPlayingRef.current) {
          measureCountRef.current = measureIdx;
          currentStepIndexRef.current = -1;
          if (safeGetTone()) safeGetTone()!.Transport.seconds = 0;
          lastPlayedSignalIdRef.current = null;
          if (safeGetTone()?.Transport.state !== 'started') {
            safeGetTone()?.Transport.start();
          }
          audioEngine?.start();
          setIsPlaying(true);
        }
      }, VOCAL_RECORDING_ARM_DELAY_MS);
    } catch (err) {
      console.error("Failed to start vocal recording:", err);
      alert("Erreur d'accès au microphone : " + err);
      cleanupVocalNodes();
      setIsRecordingVocal(false);
      setRecordingVocalPatternId(null);
      vocalRecordingStateRef.current = 'inactive';
    }
  };

  const stopVocalRecording = () => {
    setIsRecordingVocal(false);
    setRecordingVocalPatternId(null);
    vocalRecordingStateRef.current = 'inactive';

    if (vocalMediaRecorderRef.current && vocalMediaRecorderRef.current.state === 'recording') {
      try {
        vocalMediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping MediaRecorder manually:", err);
        cleanupVocalNodes();
      }
    } else {
      cleanupVocalNodes();
    }
  };

  const finishVocalRecording = () => {
    setIsRecordingVocal(false);
    setRecordingVocalPatternId(null);
    cleanupVocalNodes();
  };

  const handleVocalModeChange = (patternId: number, mode: 'synth' | 'micro') => {
    pushUndoState();
    setTracks((prevTracks) => {
      return prevTracks.map((t) => {
        const hasPattern = t.patterns.some((p) => p.id === patternId);
        if (!hasPattern) return t;
        return {
          ...t,
          patterns: t.patterns.map((p) => {
            if (p.id === patternId) {
              return { ...p, vocalMode: mode };
            }
            return p;
          }),
        };
      });
    });
  };

  const handleVocalLatencyChange = (patternId: number, latencyMs: number) => {
    pushUndoState();
    setTracks((prevTracks) => {
      return prevTracks.map((t) => {
        const hasPattern = t.patterns.some((p) => p.id === patternId);
        if (!hasPattern) return t;
        return {
          ...t,
          patterns: t.patterns.map((p) => {
            if (p.id === patternId) {
              return { ...p, vocalLatency: latencyMs };
            }
            return p;
          }),
        };
      });
    });
  };

  const handleVocalBpmSyncToggle = (patternId: number, sync: boolean) => {
    pushUndoState();
    setTracks((prevTracks) => {
      return prevTracks.map((t) => {
        const hasPattern = t.patterns.some((p) => p.id === patternId);
        if (!hasPattern) return t;
        return {
          ...t,
          patterns: t.patterns.map((p) => {
            if (p.id === patternId) {
              return { ...p, vocalBpmSync: sync };
            }
            return p;
          }),
        };
      });
    });
  };

  const handleDeleteVocalRecording = async (patternId: number) => {
    pushUndoState();
    await deleteVocalRecording(patternId);
    if (vocalPlayersRef.current[patternId]) {
      try {
        vocalPlayersRef.current[patternId].dispose();
      } catch (_) {}
      delete vocalPlayersRef.current[patternId];
    }
    setRecordedPatternIds((prev) => prev.filter((id) => id !== patternId));
    setTracks((prevTracks) => {
      return prevTracks.map((t) => {
        const hasPattern = t.patterns.some((p) => p.id === patternId);
        if (!hasPattern) return t;
        return {
          ...t,
          patterns: t.patterns.map((p) => {
            if (p.id === patternId) {
              return { ...p, vocalMode: 'synth' };
            }
            return p;
          }),
        };
      });
    });
  };

  return {
    isRecordingVocal,
    recordingVocalPatternId,
    recordedPatternIds,
    audioDevices,
    selectedAudioDeviceId,
    isVocalGuideEnabled,
    setIsVocalGuideEnabled,
    // Refs needed for safeGetTone()?.js scheduling loop
    recordingVocalPatternIdRef,
    vocalRecordingStateRef,
    vocalMediaRecorderRef,
    recordedMeasuresCountRef,
    recordingDurationMeasuresRef,
    vocalPlayersRef,
    isVocalGuideEnabledRef,
    // Handlers
    handleAudioDeviceChange,
    handleImportVocalFile,
    handleAudioPatternCreated,
    startVocalRecording,
    stopVocalRecording,
    finishVocalRecording,
    handleVocalModeChange,
    handleVocalLatencyChange,
    handleVocalBpmSyncToggle,
    handleDeleteVocalRecording,
    getSystemDefaultLatencyMs,
    loadVocalRecording
  };
}
