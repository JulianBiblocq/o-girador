/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Circle, TrackGroup, Pattern, Language, Preset, TimeSignature, PresetMetadata, HitTrigger, SongSection } from './types';
import { migrateCirclesToTracks } from './migration';
import {
  instrumentsConfig,
  vouVadiarPreset,
  baqueDeImalePreset,
  getMarkers,
  getMaxTicks,
  i18n,
  ASSETS_BASE_URL,
} from './data';
import { getLocalLibrary, savePresetToLibrary, deletePresetFromLibrary } from './library';
import { Header } from './components/Header';
import { TransportBar } from './components/TransportBar';
import { Mixer } from './components/Mixer';
import { ConsoleMixer } from './components/ConsoleMixer';
import { CircleSequencer } from './components/CircleSequencer';
import { RightSidebar } from './components/RightSidebar';
import { TimelineSequencer } from './components/TimelineSequencer';
import { TouchStrokeSelector, TouchSelectorState } from './components/TouchStrokeSelector';
import { saveVocalRecording, getVocalRecording, deleteVocalRecording } from './db';

// Module scope audio engines to avoid duplicate instantiations on React re-renders
let bMetroClick: Tone.Synth | null = null;
const channels: { [id: string]: Tone.Channel } = {};
const meters: { [id: string]: Tone.Meter } = {};
const samplers: { [id: string]: Tone.Players } = {};
const voiceSynths: { [id: string]: any } = {};
let loadedCount = 0;
let mainLoop: Tone.Loop | null = null;
let wavRecordingBuffersL: Float32Array[] = [];
let wavRecordingBuffersR: Float32Array[] = [];
let scriptProcessorNode: ScriptProcessorNode | null = null;
let reverbNode: Tone.Reverb | null = null;
const reverbSends: { [id: string]: Tone.Gain } = {};
let masterVolumeNode: Tone.Gain | null = null;

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

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + interleaved.length * 2, true);
  // WAVE identifier
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM = 1)
  view.setUint16(20, 1, true);
  // channel count (stereo = 2)
  view.setUint16(22, 2, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 4, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 4, true);
  // bits per sample (16-bit)
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, interleaved.length * 2, true);

  // Write PCM audio data
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

export default function App() {
  // PWA Auto-Update Check
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch(
          `${window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/'}version.json?t=${Date.now()}`
        );
        if (response.ok) {
          const data = await response.json();
          const latestVersion = Number(data.version);
          const CURRENT_VERSION = 12; // Matches version.json
          
          if (latestVersion > CURRENT_VERSION) {
            console.log(`New version detected: ${latestVersion}. Clearing Service Worker and reloading...`);
            if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of registrations) {
                await registration.unregister();
              }
            }
            if ('caches' in window) {
              const keys = await caches.keys();
              for (const key of keys) {
                await caches.delete(key);
              }
            }
            window.location.reload();
          }
        }
      } catch (err) {
        console.warn('Auto-update check failed:', err);
      }
    };
    checkVersion();
  }, []);

  const [lang, setLang] = useState<Language>('pt');
  const [bpm, setBpm] = useState<number>(83);
  const [masterVol, setMasterVol] = useState<number>(-6);
  const [timeSig, setTimeSig] = useState<TimeSignature>('4/4');
  const [isMetroOn, setIsMetroOn] = useState<boolean>(false);
  const [activePresetName, setActivePresetName] = useState<string>('');
  const [presetFiles, setPresetFiles] = useState<string[]>([]);
  const [tracks, setTracks] = useState<TrackGroup[]>([]);
  const [totalMeasures, setTotalMeasures] = useState<number>(8);
  const [letras, setLetras] = useState<string>('');
  const [metadata, setMetadata] = useState<PresetMetadata>({
    toada: '',
    nacao: '',
    compositor: '',
    ritmo: ''
  });
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);
  const [activeRightPanel, setActiveRightPanel] = useState<'legend' | 'letras' | null>(
    window.innerWidth <= 768 ? 'letras' : (window.innerWidth >= 1024 ? 'letras' : null)
  );
  const [viewMode, setViewMode] = useState<'roda' | 'console' | 'timeline'>('roda');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [localPresets, setLocalPresets] = useState<string[]>([]);
  const [tracksHistory, setTracksHistory] = useState<TrackGroup[][]>([]);
  const tracksHistoryRef = useRef<TrackGroup[][]>([]);
  const [reverbType, setReverbType] = useState<'room' | 'studio' | 'hall'>('studio');
  const [touchSelector, setTouchSelector] = useState<TouchSelectorState | null>(null);
  const [hoveredStroke, setHoveredStroke] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'roda' | 'mixer' | 'toada'>('roda');
  const [copiedPattern, setCopiedPattern] = useState<Pattern | null>(null);
  const [songSections, setSongSections] = useState<SongSection[]>([]);
  const [copiedSection, setCopiedSection] = useState<{
    length: number;
    name: string;
    color: string;
    assignments: { [trackId: number]: (number | null)[] };
  } | null>(null);


  const [measureTimeSigs, setMeasureTimeSigs] = useState<TimeSignature[]>([]);
  const [measureBpms, setMeasureBpms] = useState<number[]>([]);
  const [measureBpmTransitions, setMeasureBpmTransitions] = useState<('immediate' | 'ramp')[]>([]);
  const [measureVols, setMeasureVols] = useState<number[]>([]);
  const [measureVolTransitions, setMeasureVolTransitions] = useState<('immediate' | 'ramp')[]>([]);

  const measureTimeSigsRef = useRef<TimeSignature[]>([]);
  const measureBpmsRef = useRef<number[]>([]);
  const measureBpmTransitionsRef = useRef<('immediate' | 'ramp')[]>([]);
  const measureVolsRef = useRef<number[]>([]);
  const measureVolTransitionsRef = useRef<('immediate' | 'ramp')[]>([]);
  const masterVolRef = useRef<number>(-6);

  const songSectionsRef = useRef<SongSection[]>([]);

  // Loop bounds states and refs
  const [loopStartMeasure, setLoopStartMeasure] = useState<number | null>(null);
  const [loopEndMeasure, setLoopEndMeasure] = useState<number | null>(null);
  const loopStartRef = useRef<number | null>(null);
  const loopEndRef = useRef<number | null>(null);

  useEffect(() => {
    loopStartRef.current = loopStartMeasure;
    loopEndRef.current = loopEndMeasure;
  }, [loopStartMeasure, loopEndMeasure]);

  // Zoom state
  const [measureWidth, setMeasureWidth] = useState<number>(480);

  // Pattern Solo Playback state and ref
  const [soloPatternPlayId, setSoloPatternPlayId] = useState<number | null>(null);
  const soloPatternPlayIdRef = useRef<number | null>(null);

  useEffect(() => {
    soloPatternPlayIdRef.current = soloPatternPlayId;
  }, [soloPatternPlayId]);

  const [songStructureHistory, setSongStructureHistory] = useState<{
    measureTimeSigs: TimeSignature[];
    measureBpms: number[];
    measureBpmTransitions: ('immediate' | 'ramp')[];
    measureVols: number[];
    measureVolTransitions: ('immediate' | 'ramp')[];
    songSections?: SongSection[];
  }[]>([]);
  const songStructureHistoryRef = useRef<{
    measureTimeSigs: TimeSignature[];
    measureBpms: number[];
    measureBpmTransitions: ('immediate' | 'ramp')[];
    measureVols: number[];
    measureVolTransitions: ('immediate' | 'ramp')[];
    songSections?: SongSection[];
  }[]>([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    tracksHistoryRef.current = tracksHistory;
  }, [tracksHistory]);

  useEffect(() => {
    measureTimeSigsRef.current = measureTimeSigs;
  }, [measureTimeSigs]);

  useEffect(() => {
    measureBpmsRef.current = measureBpms;
  }, [measureBpms]);

  useEffect(() => {
    measureBpmTransitionsRef.current = measureBpmTransitions;
  }, [measureBpmTransitions]);

  useEffect(() => {
    measureVolsRef.current = measureVols;
  }, [measureVols]);

  useEffect(() => {
    measureVolTransitionsRef.current = measureVolTransitions;
  }, [measureVolTransitions]);

  useEffect(() => {
    masterVolRef.current = masterVol;
  }, [masterVol]);

  useEffect(() => {
    songStructureHistoryRef.current = songStructureHistory;
  }, [songStructureHistory]);

  useEffect(() => {
    songSectionsRef.current = songSections;
  }, [songSections]);


  useEffect(() => {
    setLocalPresets(Object.keys(getLocalLibrary()));
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Adjust measure arrays length when totalMeasures changes
  useEffect(() => {
    setMeasureTimeSigs(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push(timeSig);
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });

    setMeasureBpms(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push(bpm);
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });

    setMeasureBpmTransitions(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push('immediate');
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });

    setMeasureVols(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push(100);
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });

    setMeasureVolTransitions(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push('immediate');
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });
  }, [totalMeasures, timeSig, bpm]);

  // Synchronize Reverb send levels and panning whenever tracks update
  useEffect(() => {
    tracks.forEach(t => {
      const inst = instrumentsConfig[t.instrumentIdx];
      if (inst) {
        if (reverbSends[inst.id]) {
          reverbSends[inst.id].gain.value = (t.reverbVal || 0) / 100;
        }
        if (channels[inst.id]) {
          channels[inst.id].pan.value = (t.panVal || 0) / 100;
        }
      }
    });
  }, [tracks]);

  // Synchronize Reverb parameters when reverbType changes
  useEffect(() => {
    if (reverbNode) {
      const config = {
        room: { decay: 0.8, pre: 0.0 },
        studio: { decay: 1.4, pre: 0.0 },
        hall: { decay: 2.8, pre: 0.008 }
      }[reverbType];

      reverbNode.decay = config.decay;
      reverbNode.preDelay = config.pre;
      reverbNode.generate().catch(err => console.error("Error generating Tone.Reverb on type change:", err));
    }
  }, [reverbType]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSwingOn, setIsSwingOn] = useState<boolean>(true);

  // Measure counter tracks loops boundaries
  const measureCountRef = useRef<number>(0);
  const tracksRef = useRef<TrackGroup[]>([]);
  const totalMeasuresRef = useRef<number>(8);
  const isPlayingRef = useRef<boolean>(false);
  const currentStepIndexRef = useRef<number>(-1);
  const maxTicksRef = useRef<number>(96);
  const isMetroOnRef = useRef<boolean>(false);
  const isSwingOnRef = useRef<boolean>(true);
  const hitTriggersRef = useRef<HitTrigger[]>([]);

  // For vocal recording
  const [isRecordingVocal, setIsRecordingVocal] = useState<boolean>(false);
  const [recordingVocalPatternId, setRecordingVocalPatternId] = useState<number | null>(null);
  const recordingVocalPatternIdRef = useRef<number | null>(null);
  const vocalMediaRecorderRef = useRef<any>(null);
  const vocalStreamRef = useRef<MediaStream | null>(null);
  const vocalScriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const vocalSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const vocalRecordBuffersLRef = useRef<Float32Array[]>([]);
  const vocalRecordBuffersRRef = useRef<Float32Array[]>([]);
  const vocalRecordingStateRef = useRef<'inactive' | 'waiting' | 'recording'>('inactive');
  const vocalPlayersRef = useRef<{ [patternId: number]: Tone.Player }>({});
  const [recordedPatternIds, setRecordedPatternIds] = useState<number[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>(() => {
    return localStorage.getItem('baquemix_vocal_device_id') || '';
  });
  const [isVocalGuideEnabled, setIsVocalGuideEnabled] = useState<boolean>(true);
  const isVocalGuideEnabledRef = useRef<boolean>(true);

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
    localStorage.setItem('baquemix_vocal_device_id', deviceId);
  };

  const handleImportVocalFile = async (patternId: number, file: File) => {
    try {
      await saveVocalRecording(patternId, file);
      await loadVocalRecording(patternId);
      
      setTracks((prevTracks) => {
        return prevTracks.map((t) => {
          const hasPattern = t.patterns.some((p) => p.id === patternId);
          if (!hasPattern) return t;
          return {
            ...t,
            patterns: t.patterns.map((p) => {
              if (p.id === patternId) {
                return { ...p, vocalMode: 'micro' };
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

  const getSystemDefaultLatencyMs = () => {
    let latencySec = 0.08; // 80 ms default for hardware input / encoder startup
    try {
      const rawCtx = Tone.context.rawContext as any;
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

  const loadVocalRecording = async (patternId: number) => {
    try {
      const blob = await getVocalRecording(patternId);
      if (blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await Tone.getContext().rawContext.decodeAudioData(arrayBuffer);
        
        if (vocalPlayersRef.current[patternId]) {
          try {
            vocalPlayersRef.current[patternId].dispose();
          } catch (_) {}
        }
        
        const player = new Tone.Player(audioBuffer);
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

  // Synchronization with refs to have lag-free values inside Tone.js loop
  useEffect(() => {
    tracksRef.current = tracks;
    totalMeasuresRef.current = totalMeasures;
    isPlayingRef.current = isPlaying;
    currentStepIndexRef.current = currentStepIndex;
    maxTicksRef.current = getMaxTicks(timeSig);
    isMetroOnRef.current = isMetroOn;
    isSwingOnRef.current = isSwingOn;
    recordingVocalPatternIdRef.current = recordingVocalPatternId;
    isVocalGuideEnabledRef.current = isVocalGuideEnabled;
  }, [tracks, totalMeasures, isPlaying, currentStepIndex, timeSig, isMetroOn, isSwingOn, recordingVocalPatternId, isVocalGuideEnabled]);

  useEffect(() => {
    const voicePatternIds: number[] = [];
    tracks.forEach((t) => {
      const inst = instrumentsConfig[t.instrumentIdx];
      if (inst && inst.type === 'voice') {
        t.patterns.forEach((p) => {
          voicePatternIds.push(p.id);
        });
      }
    });
    
    voicePatternIds.forEach((id) => {
      if (!vocalPlayersRef.current[id]) {
        loadVocalRecording(id);
      }
    });
    
    Object.keys(vocalPlayersRef.current).forEach((key) => {
      const id = Number(key);
      if (!voicePatternIds.includes(id)) {
        try {
          vocalPlayersRef.current[id].dispose();
        } catch (_) {}
        delete vocalPlayersRef.current[id];
      }
    });
  }, [tracks]);

  const t = (key: string) => {
    return (i18n[lang] as any)[key] || key;
  };

  // 1. Initialize stable Audio Engine Nodes
  useEffect(() => {
    const initAudio = async () => {
      if (bMetroClick) return; // already initialized

      if (!masterVolumeNode) {
        masterVolumeNode = new Tone.Gain(1.0).toDestination();
      }

      bMetroClick = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.01 },
        volume: 4,
      }).connect(masterVolumeNode);

      if (!reverbNode) {
        reverbNode = new Tone.Reverb({ decay: 1.4, preDelay: 0.0 }).connect(masterVolumeNode);
        reverbNode.generate().catch(err => console.error("Error generating initial Tone.Reverb:", err));
      }

      const totalAudioCount = instrumentsConfig.filter((i) => i.type !== 'voice').length;

      instrumentsConfig.forEach((inst) => {
        channels[inst.id] = new Tone.Channel({ volume: 0 }).connect(masterVolumeNode!);
        meters[inst.id] = new Tone.Meter();
        channels[inst.id].connect(meters[inst.id]);

        if (!reverbSends[inst.id]) {
          reverbSends[inst.id] = new Tone.Gain(0);
          channels[inst.id].connect(reverbSends[inst.id]);
          reverbSends[inst.id].connect(reverbNode!);
        }

        if (inst.type === 'voice') {
          voiceSynths[inst.id] = new Tone.AMSynth({
            harmonicity: 1,
            oscillator: { type: 'sine' },
            modulation: { type: 'sine' },
            envelope: { attack: 0.05, decay: 0.2 },
            volume: -10,
          }).connect(channels[inst.id]);
        } else {
          let urls;
          if (inst.id === 'caixa') {
            urls = {
              faible: 'faible.wav',
              fort: 'fort.wav',
              'ruffada-D': 'Caixa-ruffada-D.wav',
              'ruffada-G': 'Caixa-ruffada-G.wav',
              cerclage: 'Caixa-cerclage.wav',
              fla: 'Caixa-fla.wav',
              barulho: 'Caixa-barulho.wav',
            };
          } else if (inst.type === 'gongue') {
            urls = {
              'faible-grave': 'faible-grave.wav',
              'fort-grave': 'fort-grave.wav',
              'faible-aigue': 'faible-aigue.wav',
              'fort-aigue': 'fort-aigue.wav',
              barulho: 'Gongue-barulho.wav',
            };
          } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
            urls = {
              faible: 'faible.wav',
              fort: 'fort.wav',
              barulho: 'barulho.wav',
              cerclage: 'cerclage.wav',
              iguarassu: 'iguarassu.wav',
            };
          } else if (inst.id === 'agbe') {
            urls = {
              faible: 'faible.wav',
              fort: 'fort.wav',
              barulho: 'barulho.wav',
              saut: 'saut.wav',
            };
          } else {
            urls = { faible: 'faible.wav', fort: 'fort.wav' };
          }

          samplers[inst.id] = new Tone.Players({
            urls,
            baseUrl: `${ASSETS_BASE_URL}sons-maracatu/${inst.path}/`,
            onload: () => {
              loadedCount++;
              if (loadedCount >= totalAudioCount) {
                setIsLoading(false);
              }
            },
          }).connect(channels[inst.id]);
        }
      });

      // Load vocal recordings for all patterns in tracks
      tracksRef.current.forEach((t) => {
        const inst = instrumentsConfig[t.instrumentIdx];
        if (inst && inst.type === 'voice') {
          t.patterns.forEach((p) => {
            loadVocalRecording(p.id);
          });
        }
      });

      // Stable 96-tick sequencing loop
      mainLoop = new Tone.Loop((time) => {
        let currentTicks = maxTicksRef.current;
        let stepIdx = currentStepIndexRef.current;

        // 1. Commuter la mesure si on arrive à la fin
        if (stepIdx === -1) {
          if (soloPatternPlayIdRef.current !== null) {
            measureCountRef.current = 0;
          } else if (loopStartRef.current !== null && (measureCountRef.current < loopStartRef.current || (loopEndRef.current !== null && measureCountRef.current > loopEndRef.current))) {
            measureCountRef.current = loopStartRef.current;
          }
          const firstMeasureIdx = measureCountRef.current % totalMeasuresRef.current;
          const firstTimeSig = measureTimeSigsRef.current[firstMeasureIdx] || '4/4';
          currentTicks = getMaxTicks(firstTimeSig);
          maxTicksRef.current = currentTicks;
        } else if (stepIdx === currentTicks - 1) {
          if (soloPatternPlayIdRef.current !== null) {
            measureCountRef.current = 0;
          } else {
            const currentMeasureIdx = measureCountRef.current % totalMeasuresRef.current;
            if (loopStartRef.current !== null && loopEndRef.current !== null && currentMeasureIdx === loopEndRef.current) {
              measureCountRef.current = loopStartRef.current;
            } else {
              measureCountRef.current++;
            }
          }
          const nextMeasureIdx = measureCountRef.current % totalMeasuresRef.current;
          const nextTimeSig = measureTimeSigsRef.current[nextMeasureIdx] || '4/4';
          currentTicks = getMaxTicks(nextTimeSig);
          maxTicksRef.current = currentTicks;
        }

        // 2. Avancer le pas
        stepIdx = (stepIdx + 1) % currentTicks;
        currentStepIndexRef.current = stepIdx;
        setCurrentStepIndex(stepIdx);

        // 3. Appliquer le BPM de manière fluide ou immédiate à chaque pas
        const currentMeasureIdx = measureCountRef.current % totalMeasuresRef.current;
        const targetBpm = measureBpmsRef.current[currentMeasureIdx] || 100;
        const transition = measureBpmTransitionsRef.current[currentMeasureIdx] || 'immediate';

        try {
          if (transition === 'ramp') {
            const prevMeasureIdx = (currentMeasureIdx - 1 + totalMeasuresRef.current) % totalMeasuresRef.current;
            const startBpm = measureBpmsRef.current[prevMeasureIdx] || targetBpm;
            
            // Interpolation linéaire du BPM pour le pas actuel au sein de la mesure
            const currentStepBpm = startBpm + (targetBpm - startBpm) * (stepIdx / currentTicks);
            Tone.Transport.bpm.value = currentStepBpm;
          } else {
            // Pour une transition immédiate, on applique le BPM cible dès le premier pas de la mesure
            if (stepIdx === 0) {
              Tone.Transport.bpm.value = targetBpm;
            }
          }
        } catch (e) {}

        // 3b. Appliquer le volume de manière fluide ou immédiate à chaque pas (fondus)
        const targetVolPercent = measureVolsRef.current[currentMeasureIdx] !== undefined ? measureVolsRef.current[currentMeasureIdx] : 100;
        const volTransition = measureVolTransitionsRef.current[currentMeasureIdx] || 'immediate';
        let currentVolPercent = targetVolPercent;

        if (volTransition === 'ramp') {
          const prevMeasureIdx = (currentMeasureIdx - 1 + totalMeasuresRef.current) % totalMeasuresRef.current;
          const startVolPercent = measureVolsRef.current[prevMeasureIdx] !== undefined ? measureVolsRef.current[prevMeasureIdx] : 100;
          currentVolPercent = startVolPercent + (targetVolPercent - startVolPercent) * (stepIdx / currentTicks);
        }

        try {
          const globalGain = Tone.dbToGain(masterVolRef.current);
          const finalGain = globalGain * (currentVolPercent / 100);
          Tone.Destination.volume.value = Tone.gainToDb(finalGain === 0 ? 0.0001 : finalGain);
        } catch (e) {}

        // Click metronome beat pulse
        const currentMeasureSig = measureTimeSigsRef.current[currentMeasureIdx] || '4/4';
        const markers = getMarkers(currentMeasureSig, currentTicks);

        if (isMetroOnRef.current && markers.includes(stepIdx)) {
          const noteVal = stepIdx === 0 ? 'A5' : 'E5';
          bMetroClick?.triggerAttackRelease(noteVal, '32n', time);
        }

        // Parse trigger of step events
        // --- SWING & MICRO-TIMING MARACATU ---
        let swingOffset = 0;
        if (isSwingOnRef.current) {
          const stepDurationSec = Tone.Time('96n').toSeconds() * 6; // one 16th note
          const posInBeat = ((stepIdx / (currentTicks / 4)) % 1) * 4; // 0-3 within a beat group of 4 steps
          const posInGroup = Math.round(posInBeat) % 4;
          
          const swingIntensity = 1.0;
          const jitter = (Math.random() * 0.06 - 0.03) * stepDurationSec; // +/- 3%

          if (posInGroup === 0) {
            // 1ère DC : Légèrement au fond + jitter
            swingOffset = (0.05 * swingIntensity * stepDurationSec) + jitter;
          } else if (posInGroup === 1) {
            // 2ème DC : En retard + jitter
            swingOffset = (0.15 * swingIntensity * stepDurationSec) + jitter;
          } else if (posInGroup === 2) {
            // 3ème DC : Pivot stable + jitter minimal
            const minimalJitter = (Math.random() * 0.02 - 0.01) * stepDurationSec;
            swingOffset = (0.02 * swingIntensity * stepDurationSec) + minimalJitter;
          } else if (posInGroup === 3) {
            // 4ème DC : En avance + jitter
            swingOffset = (-0.10 * swingIntensity * stepDurationSec) + jitter;
          }
        }
        const swingTime = time + swingOffset;

        const hasSolo = tracksRef.current.some((t) => t.isSolo);
        tracksRef.current.forEach((track) => {
          const currentMeasure = measureCountRef.current % totalMeasuresRef.current;
          const inst = instrumentsConfig[track.instrumentIdx];

          // Recording handling should run even if track is muted/soloed or pattern is not assigned
          if (inst.type === 'voice' && recordingVocalPatternIdRef.current !== null) {
            const hasPatternBeingRecorded = track.patterns.some(p => p.id === recordingVocalPatternIdRef.current);
            if (hasPatternBeingRecorded) {
              if (stepIdx === 0 && vocalRecordingStateRef.current === 'waiting') {
                vocalRecordingStateRef.current = 'recording';
                const startDelayMs = Math.max(0, (time - Tone.context.rawContext.currentTime) * 1000);
                setTimeout(() => {
                  if (vocalMediaRecorderRef.current && vocalMediaRecorderRef.current.state === 'inactive') {
                    try {
                      vocalMediaRecorderRef.current.start();
                      console.log(`Vocal MediaRecorder started (delay applied: ${startDelayMs.toFixed(1)}ms)`);
                    } catch (err) {
                      console.error("Failed to start MediaRecorder via timeout:", err);
                    }
                  }
                }, startDelayMs);
              }
              if (stepIdx === currentTicks - 1 && vocalRecordingStateRef.current === 'recording') {
                vocalRecordingStateRef.current = 'inactive';
                const stepDurationSec = Tone.Time('96n').toSeconds();
                const stopDelayMs = Math.max(0, (time + stepDurationSec - Tone.context.rawContext.currentTime) * 1000);
                setTimeout(() => {
                  let stopped = false;
                  if (vocalMediaRecorderRef.current && vocalMediaRecorderRef.current.state === 'recording') {
                    try {
                      vocalMediaRecorderRef.current.stop();
                      console.log(`Vocal MediaRecorder stopped (delay applied: ${stopDelayMs.toFixed(1)}ms)`);
                      stopped = true;
                    } catch (err) {
                      console.error("Failed to stop MediaRecorder via timeout:", err);
                    }
                  }
                  if (!stopped) {
                    setIsRecordingVocal(false);
                    setRecordingVocalPatternId(null);
                    cleanupVocalNodes();
                  }
                }, stopDelayMs);
              }
            }
          }

          const isSoloPlayActive = soloPatternPlayIdRef.current !== null;
          const isTargetSoloTrack = isSoloPlayActive && track.patterns.some(p => p.id === soloPatternPlayIdRef.current);

          let activePattern: Pattern | undefined;
          let canPlay = false;

          if (isSoloPlayActive) {
            if (isTargetSoloTrack) {
              activePattern = track.patterns.find(p => p.id === soloPatternPlayIdRef.current);
              canPlay = true;
            } else {
              // Silence all other tracks during pattern solo playback
              return;
            }
          } else {
            activePattern = track.patterns.find(p => p.measureAssignments[currentMeasure]);
            canPlay = hasSolo ? track.isSolo : !track.isMute;
          }

          if (!activePattern) return;
          if (!canPlay) return;

          // If it is a voice track and in 'micro' mode, play the loop at stepIdx === 0
          if (inst.type === 'voice' && activePattern.vocalMode === 'micro' && stepIdx === 0 && recordingVocalPatternIdRef.current !== activePattern.id) {
            const player = vocalPlayersRef.current[activePattern.id];
            if (player && player.loaded) {
              try {
                player.stop();
                const userLatencyMs = activePattern.vocalLatency || 0;
                const systemDefaultLatencyMs = getSystemDefaultLatencyMs();
                const totalLatencyMs = userLatencyMs + systemDefaultLatencyMs;

                if (totalLatencyMs >= 0) {
                  const offsetSec = totalLatencyMs / 1000;
                  player.start(time, offsetSec);
                } else {
                  const startDelaySec = Math.abs(totalLatencyMs) / 1000;
                  player.start(time + startDelaySec, 0);
                }
              } catch (err) {
                console.warn("Failed to play vocal player loop:", err);
              }
            }
          }

          const stepCount = activePattern.steps;
          const circleStepIdx = Math.floor((stepIdx / currentTicks) * stepCount);
          const expectedTick = Math.floor((circleStepIdx * currentTicks) / stepCount);

          if (stepIdx === expectedTick) {
            const state = activePattern.activeSteps[circleStepIdx];
            if (state !== 0) {
              hitTriggersRef.current.push({ trackId: track.id, stepIndex: circleStepIdx, state });
              const baseGain = track.volumeVal / 100;

              const stepVolMultiplier = (activePattern.volumes?.[circleStepIdx] ?? 80) / 100;
              const stepDecayMultiplier = (activePattern.decays?.[circleStepIdx] ?? 100) / 100;

              const manualMicro = activePattern.microtimings?.[circleStepIdx] ?? 0;
              const stepDurationSec = Tone.Time('96n').toSeconds() * (currentTicks / stepCount);
              const microTimeOffset = (manualMicro / 100) * stepDurationSec * 0.5;
              const finalTriggerTime = swingTime + microTimeOffset;

              if (inst.type === 'voice') {
                if (activePattern.vocalMode !== 'micro' || (recordingVocalPatternIdRef.current === activePattern.id && isVocalGuideEnabledRef.current)) {
                  let note = 'C5';
                  if (
                    activePattern.notes &&
                    activePattern.notes[circleStepIdx] &&
                    activePattern.notes[circleStepIdx].trim() !== ''
                  ) {
                    note = activePattern.notes[circleStepIdx];
                  } else if (state === 'P') {
                    note = 'E5';
                  }

                  try {
                    const synth = voiceSynths[inst.id];
                    if (synth) {
                      synth.volume.value = Tone.gainToDb(baseGain * stepVolMultiplier) - 10;
                      const noteLength = (1 / 8) * stepDecayMultiplier;
                      synth.triggerAttackRelease(note, `${noteLength}s`, finalTriggerTime);
                    }
                  } catch (err) {
                    voiceSynths[inst.id]?.triggerAttackRelease('C5', '8n', finalTriggerTime);
                  }
                }
              } else if (samplers[inst.id]) {
                const playerGroup = samplers[inst.id];
                let targetKey: string | null = null;
                let isStrong = false;

                if (inst.type === 'gongue') {
                  if (state === 'GRV') { targetKey = 'fort-grave'; isStrong = true; }
                  else if (state === 'grv') { targetKey = 'faible-grave'; isStrong = false; }
                  else if (state === 'AIG') { targetKey = 'fort-aigue'; isStrong = true; }
                  else if (state === 'aig') { targetKey = 'faible-aigue'; isStrong = false; }
                  else if (state === 'b' || state === 'T' || state === 't') { targetKey = 'barulho'; isStrong = true; }
                } else if (inst.id === 'caixa') {
                  if (state === 'D' || state === 'G' || state === 'E') { targetKey = 'fort'; isStrong = true; }
                  else if (state === 'd' || state === 'g' || state === 'e') { targetKey = 'faible'; isStrong = false; }
                  else if (state === 'rd') { targetKey = 'ruffada-D'; isStrong = true; }
                  else if (state === 'rg' || state === 'Re' || state === 're') { targetKey = 'ruffada-G'; isStrong = true; }
                  else if (state === 'x') { targetKey = 'cerclage'; isStrong = true; }
                  else if (state === 'f') { targetKey = 'fla'; isStrong = true; }
                  else if (state === 'b' || state === 'T' || state === 't') { targetKey = 'barulho'; isStrong = true; }
                } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
                  if (state === 'D' || state === 'G' || state === 'E') { targetKey = 'fort'; isStrong = true; }
                  else if (state === 'd' || state === 'g' || state === 'e') { targetKey = 'faible'; isStrong = false; }
                  else if (state === 'b' || state === 'T' || state === 't') { targetKey = 'barulho'; isStrong = true; }
                  else if (state === 'x') { targetKey = 'cerclage'; isStrong = true; }
                  else if ((inst.id as string) === 'alfaia' || state === 'i') { targetKey = 'iguarassu'; isStrong = true; }
                } else if (inst.id === 'agbe') {
                  if (state === 'G' || state === 'D' || state === 'E') { targetKey = 'fort'; isStrong = true; }
                  else if (state === 'g' || state === 'd' || state === 'e') { targetKey = 'faible'; isStrong = false; }
                  else if (state === 'b' || state === 'T' || state === 't') { targetKey = 'barulho'; isStrong = true; }
                  else if (state === 's') { targetKey = 'saut'; isStrong = true; }
                } else {
                  if (['D', 'G', 'E', 'P', 'T'].includes(state as string)) { targetKey = 'fort'; isStrong = true; }
                  else if (['d', 'g', 'e', 'p', 't'].includes(state as string)) { targetKey = 'faible'; isStrong = false; }
                }

                if (targetKey && playerGroup.has(targetKey)) {
                  try {
                    // BARULHO CHOKE: stop barulho when another sound plays (and vice versa)
                    if (playerGroup.has('barulho')) {
                      try { playerGroup.player('barulho').stop(); } catch(_) {}
                    }

                    const player = playerGroup.player(targetKey);
                    if (player.loaded) {
                      // HUMANISATION DE LA DYNAMIQUE (VÉLOCITÉ)
                      let vel = 1.0;
                      if (isSwingOnRef.current) {
                        if (isStrong) {
                          // Coup Fort (Base 0.8) ±10% -> 0.7 to 0.9
                          vel = 0.8 + (Math.random() * 0.2 - 0.1);
                        } else {
                          // Coup Faible (Base 0.4) ±12% -> 0.28 to 0.52
                          vel = 0.4 + (Math.random() * 0.24 - 0.12);
                        }
                      }
                      
                      vel *= stepVolMultiplier;
                      
                      const finalVolDb = Tone.gainToDb(baseGain * vel);
                      player.volume.value = finalVolDb;

                      if (stepDecayMultiplier < 1.0) {
                        const duration = player.buffer.duration * stepDecayMultiplier;
                        player.start(finalTriggerTime, 0, duration);
                      } else {
                        player.start(finalTriggerTime);
                      }
                    }
                  } catch (err) {}
                }
              }
            }
          }
        });
      }, '96n');

      // Set fallback timer if loading assets get blocked
      setTimeout(() => {
        setIsLoading(false);
      }, 1500);
    };

    initAudio();

    // Resize collapse left sidebar on small width screens
    if (window.innerWidth <= 1000) {
      setIsLeftPanelCollapsed(true);
    }
  }, []);

  // Update BPM of Transport
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Prevent context menu (long press options) on step edit cells & touch selector bubble
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.closest('.step-boxes') || target.closest('#touch-stroke-selector-bubble'))) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', preventContextMenu);
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);

  // Adjust Master Volume gain
  useEffect(() => {
    Tone.Destination.volume.value = masterVol === -40 ? -Infinity : masterVol;
  }, [masterVol]);

  // 2. Load Preset catalog initially
  useEffect(() => {
    fetch(`${ASSETS_BASE_URL}presets/catalog.json`)
      .then((res) => res.json())
      .then((files: string[]) => {
        setPresetFiles(files);
        if (files.length > 0) {
          setActivePresetName(files[0]);
          loadFallbackPreset(files[0]);
        }
      })
      .catch((err) => console.error("Could not load catalog.json:", err));
  }, []);

  // Sync levels display bar via non-re-rendering dynamic canvas interval
  useEffect(() => {
    const updateLocalMenders = () => {
      const dbToPercent = (db: number) => {
        if (db < -50) return 0;
        if (db > 0) return 100;
        return Math.floor(((db + 50) / 50) * 100);
      };

      tracksRef.current.forEach((c) => {
        const inst = instrumentsConfig[c.instrumentIdx];
        const bar = document.getElementById(`meter-bar-${c.id}`);
        const meter = meters[inst.id];
        if (bar && meter) {
          const val = isPlayingRef.current ? dbToPercent(meter.getValue() as number) + '%' : '0%';
          if (bar.classList.contains('meter-vertical')) {
            bar.style.height = val;
            bar.style.width = '100%';
          } else {
            bar.style.width = val;
            bar.style.height = '100%';
          }
        }
      });
    };

    const timer = setInterval(updateLocalMenders, 40);
    return () => clearInterval(timer);
  }, []);

  // Recording duration timer
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      setRecordingSeconds(0);
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

  // Keybindings listener: Spacebar & Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName || '';
      const activeId = document.activeElement?.id || '';

      if (
        e.code === 'Space' &&
        activeTag !== 'INPUT' &&
        activeTag !== 'SELECT' &&
        activeId !== 'letras-textarea'
      ) {
        e.preventDefault();
        handleTogglePlay();
      }

      const isUndoKey = (e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey);
      if (isUndoKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Dynamic layout radial positioning offsets
  const updateRadii = (list: TrackGroup[]) => {
    if (list.length === 0) return;
    const minRadius = 180;
    const maxRadius = 495;

    if (list.length === 1) {
      list[0].radius = (minRadius + maxRadius) / 2;
    } else {
      const gap = (maxRadius - minRadius) / (list.length - 1);
      list.forEach((t, idx) => {
        t.radius = minRadius + idx * gap;
      });
    }
  };

  const applyPreset = (p: any) => {
    setTracksHistory([]);
    setSongStructureHistory([]);
    setTracks([]);
    setLetras(p.letras || '');
    setMetadata(p.metadata || { toada: '', nacao: '', compositor: '', ritmo: '' });
    
    let loadedTracks: TrackGroup[] = [];
    let loadedMeasures = p.totalMeasures || 8;

    if (p.tracks) {
      loadedTracks = JSON.parse(JSON.stringify(p.tracks));
      loadedTracks.forEach(t => t.patterns.forEach(ptn => normalizePatternData(ptn, t.instrumentIdx)));
    } else if (p.circles) {
      // Migrate old format
      const oldCircles: Circle[] = JSON.parse(JSON.stringify(p.circles));
      loadedTracks = migrateCirclesToTracks(oldCircles, loadedMeasures);
      loadedTracks.forEach(t => t.patterns.forEach(ptn => normalizePatternData(ptn, t.instrumentIdx)));
    }
    
    updateRadii(loadedTracks);

    setTracks(loadedTracks);
    setTotalMeasures(loadedMeasures);
    setBpm(Math.round(p.bpm || 90));
    setTimeSig(p.timeSig || '4/4');

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

    setMeasureBpms(loadedBpms);
    setMeasureTimeSigs(loadedTimeSigs);
    setMeasureBpmTransitions(loadedBpmTransitions);
    setMeasureVols(loadedVols);
    setMeasureVolTransitions(loadedVolTransitions);

    measureCountRef.current = 0;
  };

  const loadFallbackPreset = async (name: string) => {
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
    applyPreset(p);
  };

  const normalizePatternData = (p: Pattern, instIdx: number) => {
    if (!p.notes) p.notes = Array(p.steps).fill('');
    if (!p.lyrics) p.lyrics = Array(p.steps).fill('');
    if (!p.activeSteps) p.activeSteps = Array(p.steps).fill(0);
    if (!p.measureAssignments) p.measureAssignments = Array(totalMeasuresRef.current || 8).fill(false);

    if (!p.volumes) {
      p.volumes = Array(p.steps).fill(80);
    } else if (p.volumes.every(v => v === 100)) {
      p.volumes = Array(p.steps).fill(80);
    }
    if (!p.decays) p.decays = Array(p.steps).fill(100);
    if (!p.microtimings) p.microtimings = Array(p.steps).fill(0);

    const inst = instrumentsConfig[instIdx];

    // Migration: old shortcuts to new ones
    if (inst && inst.type !== 'voice') {
      for (let i = 0; i < p.steps; i++) {
        const val = p.activeSteps[i];
        if (val === 'G') p.activeSteps[i] = 'E';
        else if (val === 'g') p.activeSteps[i] = 'e';
        else if (val === 'rg' || val === 'rf') p.activeSteps[i] = 'Re';
        else if (val === 'b') p.activeSteps[i] = 't';
      }
    }

    if (inst && inst.type === 'voice') {
      for (let i = 0; i < p.steps; i++) {
        const stepState = p.activeSteps[i];
        if (stepState !== 0 && stepState !== 'P' && stepState !== 'C' && stepState !== 'X') {
          p.notes[i] = String(stepState);
          p.activeSteps[i] = 'C';
        } else if (stepState === 'X') {
          p.activeSteps[i] = 'C';
        }
      }
    }
  };

  const pushUndoState = (customTracksState?: TrackGroup[]) => {
    const stateToSave = customTracksState ? customTracksState : tracks;
    setTracksHistory(prev => {
      const cloned = JSON.parse(JSON.stringify(stateToSave));
      const next = [...prev, cloned];
      if (next.length > 50) next.shift();
      return next;
    });

    setSongStructureHistory(prev => {
      const cloned = {
        measureTimeSigs: [...measureTimeSigsRef.current],
        measureBpms: [...measureBpmsRef.current],
        measureBpmTransitions: [...measureBpmTransitionsRef.current],
        measureVols: [...measureVolsRef.current],
        measureVolTransitions: [...measureVolTransitionsRef.current],
        songSections: JSON.parse(JSON.stringify(songSectionsRef.current))
      };
      const next = [...prev, cloned];
      if (next.length > 50) next.shift();
      return next;
    });
  };

  const handleUndo = () => {
    if (tracksHistoryRef.current.length === 0) return;
    setTracksHistory(prev => {
      const nextHistory = [...prev];
      const previousState = nextHistory.pop();
      if (previousState) {
        setTracks(previousState);
      }
      return nextHistory;
    });

    if (songStructureHistoryRef.current.length > 0) {
      setSongStructureHistory(prev => {
        const nextHistory = [...prev];
        const previousState = nextHistory.pop();
        if (previousState) {
          setMeasureTimeSigs(previousState.measureTimeSigs);
          setMeasureBpms(previousState.measureBpms);
          setMeasureBpmTransitions(previousState.measureBpmTransitions);
          if (previousState.measureVols) setMeasureVols(previousState.measureVols);
          if (previousState.measureVolTransitions) setMeasureVolTransitions(previousState.measureVolTransitions);
          if (previousState.songSections) setSongSections(previousState.songSections);
        }
        return nextHistory;
      });
    }
  };

  // 3. User operations callbacks
  const handleTogglePlay = async () => {
    await Tone.start();
    if (soloPatternPlayIdRef.current !== null) {
      setSoloPatternPlayId(null);
    }
    if (!isPlaying) {
      // Ensure Transport is running
      if (Tone.Transport.state !== 'started') {
        Tone.Transport.start();
      }
      mainLoop?.start(0);
      setIsPlaying(true);
    } else {
      mainLoop?.stop();
      Tone.Transport.pause();
      if (isRecordingVocal) {
        stopVocalRecording();
      }
      // Stop ongoing voice synthesizers decay
      instrumentsConfig.forEach((inst) => {
        if (samplers[inst.id]) samplers[inst.id].stopAll();
        if (voiceSynths[inst.id]) voiceSynths[inst.id].triggerRelease();
      });
      (Object.values(vocalPlayersRef.current) as any[]).forEach((player) => {
        try {
          player.stop();
        } catch (_) {}
      });
      setIsPlaying(false);
    }
  };

  const handleRewind = () => {
    if (soloPatternPlayIdRef.current !== null) {
      setSoloPatternPlayId(null);
    }
    mainLoop?.stop();
    Tone.Transport.stop();
    if (isRecordingVocal) {
      stopVocalRecording();
    }
    instrumentsConfig.forEach((inst) => {
      if (samplers[inst.id]) samplers[inst.id].stopAll();
      if (voiceSynths[inst.id]) voiceSynths[inst.id].triggerRelease();
    });
    (Object.values(vocalPlayersRef.current) as any[]).forEach((player) => {
      try {
        player.stop();
      } catch (_) {}
    });
    setIsPlaying(false);
    setCurrentStepIndex(-1);
    currentStepIndexRef.current = -1;
    measureCountRef.current = 0;
    Tone.Transport.seconds = 0;
  };

  const handlePresetSelect = (value: string) => {
    setActivePresetName(value);
    loadFallbackPreset(value);
  };

  const handleSaveToLocal = () => {
    const name = window.prompt(t('promptName'));
    if (!name || name.trim() === '') return;
    
    const presetToSave: Preset = {
      bpm,
      timeSig,
      totalMeasures,
      tracks,
      letras
    };
    savePresetToLibrary(name.trim(), presetToSave);
    setLocalPresets(Object.keys(getLocalLibrary()));
  };

  const handleLoadLocalPreset = (name: string) => {
    const lib = getLocalLibrary();
    const preset = lib[name];
    if (preset) {
      applyPreset(preset);
      setActivePresetName(name);
    }
  };

  const handleAddTrackInstrument = (instIdx: number) => {
    pushUndoState();
    if (tracks.length >= 20) {
      window.alert(t('limitReached'));
      return;
    }

    let defaultSteps = 16;
    if (timeSig === '3/4' || timeSig === '6/8') defaultSteps = 12;
    if (timeSig === '2/4') defaultSteps = 8;
    if (timeSig === '12/8') defaultSteps = 24;

    const patternId = Date.now() + Math.floor(Math.random() * 1000);
    const newPattern: Pattern = {
      id: patternId,
      name: 'Padrão 1',
      steps: defaultSteps,
      activeSteps: Array(defaultSteps).fill(0),
      lyrics: Array(defaultSteps).fill(''),
      notes: Array(defaultSteps).fill(''),
      measureAssignments: Array(totalMeasures).fill(true), // active everywhere by default
      volumes: Array(defaultSteps).fill(80),
      decays: Array(defaultSteps).fill(100),
      microtimings: Array(defaultSteps).fill(0),
    };

    const newTrack: TrackGroup = {
      id: Date.now() + 1 + Math.floor(Math.random() * 1000),
      instrumentIdx: instIdx,
      patterns: [newPattern],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 100,
      selectedPatternId: patternId,
      reverbVal: 0,
      panVal: 0,
    };

    const updated = [...tracks, newTrack];
    updateRadii(updated);
    setTracks(updated);
  };

  const handleAudioRecordingToggle = async () => {
    // Check if this object is a native AudioContext
    const isNativeAudioContextInstance = (obj: any): boolean => {
      if (!obj) return false;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const BaseAudioCtx = (window as any).BaseAudioContext;
      if (AudioCtx && obj instanceof AudioCtx) return true;
      if (BaseAudioCtx && obj instanceof BaseAudioCtx) return true;
      
      // Constructor name fallback
      const name = obj.constructor?.name;
      return name === 'AudioContext' || name === 'webkitAudioContext' || name === 'BaseAudioContext';
    };

    const isNativeCtx = (ctx: any) => ctx && typeof ctx.createScriptProcessor === 'function';

    // Recursively search any object properties for the native AudioContext
    const findNativeAudioContext = (obj: any, visited: Set<any> = new Set()): any => {
      if (!obj || typeof obj !== 'object') return null;
      if (visited.has(obj)) return null;
      visited.add(obj);

      if (isNativeAudioContextInstance(obj) && isNativeCtx(obj)) {
        return obj;
      }

      // Avoid traversing DOM elements or React internal objects
      if (obj.nodeType || obj.$$typeof) return null;

      // Try standard properties first for speed
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

      // Then search all other properties
      for (const key of Object.keys(obj)) {
        try {
          const val = obj[key];
          if (val && typeof val === 'object') {
            const found = findNativeAudioContext(val, visited);
            if (found) return found;
          }
        } catch (e) {}
      }

      // Search prototype
      try {
        const proto = Object.getPrototypeOf(obj);
        if (proto) {
          const found = findNativeAudioContext(proto, visited);
          if (found) return found;
        }
      } catch (e) {}

      return null;
    };

    // Recursively search any object properties for the native AudioNode instance
    const findNativeAudioNode = (obj: any, visited: Set<any> = new Set()): any => {
      if (!obj || typeof obj !== 'object') return null;
      if (visited.has(obj)) return null;
      visited.add(obj);

      // Check if this object is a native AudioNode instance
      const isNativeAudioNodeInstance = (val: any): boolean => {
        if (!val) return false;
        const AudioNodeClass = window.AudioNode;
        if (AudioNodeClass && val instanceof AudioNodeClass) return true;
        // Check standard constructor names just in case
        const name = val.constructor?.name;
        return typeof name === 'string' && (
          name === 'GainNode' ||
          name === 'AudioNode' ||
          name === 'AudioDestinationNode' ||
          name === 'ChannelMergerNode' ||
          name.endsWith('Node')
        );
      };

      if (isNativeAudioNodeInstance(obj)) {
        return obj;
      }

      // Avoid traversing DOM elements or React internal objects
      if (obj.nodeType || obj.$$typeof) return null;

      // Try standard properties first for speed
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

      // Then search all other properties
      for (const key of Object.keys(obj)) {
        try {
          const val = obj[key];
          if (val && typeof val === 'object') {
            const found = findNativeAudioNode(val, visited);
            if (found) return found;
          }
        } catch (e) {}
      }

      // Search prototype
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
      
      // 1. Try to get native context from masterVolumeNode
      if (masterVolumeNode) {
        audioContext = findNativeAudioContext(masterVolumeNode);
      }

      // 2. Try global Tone.context wrapper
      if (!audioContext && Tone.context) {
        audioContext = findNativeAudioContext(Tone.context);
      }

      // 3. Try Tone.getContext() wrapper
      if (!audioContext && typeof Tone.getContext === 'function') {
        audioContext = findNativeAudioContext(Tone.getContext());
      }

      if (!audioContext) {
        throw new Error("L'AudioContext de l'application n'a pas pu être résolu. Impossible de démarrer l'enregistrement.");
      }

      if (!isRecording) {
        // Start recording
        wavRecordingBuffersL = [];
        wavRecordingBuffersR = [];
        
        // Loop over safe/standard configuration parameters for createScriptProcessor
        const configs = [
          { size: 4096, in: 2, out: 2 },
          { size: 4096, in: 1, out: 1 },
          { size: 8192, in: 2, out: 2 },
          { size: 8192, in: 1, out: 1 },
          { size: 2048, in: 2, out: 2 },
          { size: 2048, in: 1, out: 1 },
          { size: 0, in: 2, out: 2 },
          { size: 0, in: 1, out: 1 }
        ];

        let createdNode = null;
        let lastError = null;
        for (const config of configs) {
          try {
            createdNode = audioContext.createScriptProcessor(config.size, config.in, config.out);
            if (createdNode) break;
          } catch (e) {
            lastError = e;
            console.warn(`createScriptProcessor(${config.size}, ${config.in}, ${config.out}) failed:`, e);
          }
        }

        if (!createdNode) {
          throw lastError || new Error("Failed to create ScriptProcessorNode");
        }
        scriptProcessorNode = createdNode;

        scriptProcessorNode.onaudioprocess = (e) => {
          // Handle both mono and stereo recording buffers
          const left = e.inputBuffer.getChannelData(0);
          const right = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : left;
          wavRecordingBuffersL.push(new Float32Array(left));
          wavRecordingBuffersR.push(new Float32Array(right));
        };

        if (masterVolumeNode) {
          // Connect native Web Audio nodes directly to bypass Tone.js asserts
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
        // Stop recording
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
                  try {
                    nativeNode.disconnect();
                  } catch (inner) {}
                }
              } else {
                masterVolumeNode.disconnect(scriptProcessorNode);
              }
            }
          } catch (e) {
            console.warn("Erreur lors de la déconnexion du scriptProcessorNode:", e);
          }
          scriptProcessorNode = null;
        }
        setIsRecording(false);

        if (wavRecordingBuffersL.length > 0) {
          const wavBlob = bufferToWav(wavRecordingBuffersL, wavRecordingBuffersR, sampleRate);
          const url = URL.createObjectURL(wavBlob);
          const downloadLink = document.createElement('a');
          downloadLink.download = 'BaqueMix_Export.wav';
          downloadLink.href = url;
          downloadLink.click();
        }
      }
    } catch (err) {
      console.error("Erreur avec l'enregistrement WAV:", err);
      const ctxName = audioContext ? audioContext.constructor.name : 'null';
      const errStr = String(err);
      const errMsg = (err as any)?.message || 'pas de message';
      const errName = (err as any)?.name || 'pas de nom';
      const errStack = (err as any)?.stack || 'pas de stack';
      alert("Erreur WAV : " + errStr + "\nNom: " + errName + "\nMsg: " + errMsg + "\n(ctx: " + ctxName + ")\n\nStack:\n" + errStack);
    }
  };

  const handleTimeSigChange = (selectValue: TimeSignature) => {
    setTimeSig(selectValue);
    setCurrentStepIndex(-1);
    measureCountRef.current = 0;

    let targetSteps = 16;
    if (selectValue === '3/4' || selectValue === '6/8') targetSteps = 12;
    if (selectValue === '2/4') targetSteps = 8;
    if (selectValue === '12/8') targetSteps = 24;

    const shouldResize = window.confirm(t('confirmResize'));
    if (shouldResize) {
      pushUndoState();
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
          };
        });

        return {
          ...t,
          patterns: nextPatterns
        };
      });
      setTracks(resizedList);
    }
  };

  // Local tracks updates
  const handleTrackMoveUp = (id: number) => {
    pushUndoState();
    const idx = tracks.findIndex((t) => t.id === id);
    if (idx > 0) {
      const copy = [...tracks];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      updateRadii(copy);
      setTracks(copy);
    }
  };

  const handleTrackMoveDown = (id: number) => {
    pushUndoState();
    const idx = tracks.findIndex((t) => t.id === id);
    if (idx > -1 && idx < tracks.length - 1) {
      const copy = [...tracks];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      updateRadii(copy);
      setTracks(copy);
    }
  };

  const handleTrackInstrumentIdxChange = (id: number, targetInstIdx: number) => {
    pushUndoState();
    const updated = tracks.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          instrumentIdx: targetInstIdx,
        };
      }
      return t;
    });
    setTracks(updated);
  };

  const handleTrackMuteToggle = (id: number) => {
    setTracks(tracks.map((t) => (t.id === id ? { ...t, isMute: !t.isMute } : t)));
  };

  const handleTrackSoloToggle = (id: number) => {
    setTracks(tracks.map((t) => (t.id === id ? { ...t, isSolo: !t.isSolo } : t)));
  };

  const handleTrackHideToggle = (id: number) => {
    setTracks(tracks.map((t) => (t.id === id ? { ...t, isHidden: !t.isHidden } : t)));
  };

  const handleTrackDelete = (id: number) => {
    pushUndoState();
    const remaining = tracks.filter((t) => t.id !== id);
    updateRadii(remaining);
    setTracks(remaining);
  };

  const handleTrackVolumeChange = (id: number, val: number) => {
    setTracks(tracks.map((t) => (t.id === id ? { ...t, volumeVal: val } : t)));
  };

  const handleTrackReverbChange = (id: number, val: number) => {
    setTracks(tracks.map((t) => (t.id === id ? { ...t, reverbVal: val } : t)));
  };

  const handleTrackStepVolumeChange = (trackId: number, patternId: number, stepIdx: number | number[], val: number) => {
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId) {
              const copyVols = [...(p.volumes || Array(p.steps).fill(80))];
              if (Array.isArray(stepIdx)) {
                stepIdx.forEach(idx => {
                  copyVols[idx] = val;
                });
              } else {
                copyVols[stepIdx] = val;
              }
              return { ...p, volumes: copyVols };
            }
            return p;
          })
        };
      }
      return t;
    }));
  };

  const handleTrackStepDecayChange = (trackId: number, patternId: number, stepIdx: number | number[], val: number) => {
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId) {
              const copyDecays = [...(p.decays || Array(p.steps).fill(100))];
              if (Array.isArray(stepIdx)) {
                stepIdx.forEach(idx => {
                  copyDecays[idx] = val;
                });
              } else {
                copyDecays[stepIdx] = val;
              }
              return { ...p, decays: copyDecays };
            }
            return p;
          })
        };
      }
      return t;
    }));
  };

  const handleTrackStepMicrotimingChange = (trackId: number, patternId: number, stepIdx: number | number[], val: number) => {
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId) {
              const copyMicros = [...(p.microtimings || Array(p.steps).fill(0))];
              if (Array.isArray(stepIdx)) {
                stepIdx.forEach(idx => {
                  copyMicros[idx] = val;
                });
              } else {
                copyMicros[stepIdx] = val;
              }
              return { ...p, microtimings: copyMicros };
            }
            return p;
          })
        };
      }
      return t;
    }));
  };

  const handleResetTrackMicrotimings = (trackId: number, patternId: number) => {
    pushUndoState();
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId) {
              return { ...p, microtimings: Array(p.steps).fill(0) };
            }
            return p;
          })
        };
      }
      return t;
    }));
  };

  const handleTrackPanChange = (id: number, val: number) => {
    setTracks(tracks.map((t) => (t.id === id ? { ...t, panVal: val } : t)));
  };

  const handleTrackStepsChange = (trackId: number, patternId: number, targetSteps: number) => {
    pushUndoState();
    setTracks(
      tracks.map((t) => {
        if (t.id === trackId) {
          const nextPatterns = t.patterns.map(p => {
            if (p.id === patternId) {
              const arrSteps = Array(targetSteps).fill(0);
              const arrLyrics = Array(targetSteps).fill('');
              const arrNotes = Array(targetSteps).fill('');
              const arrVols = Array(targetSteps).fill(80);
              const arrDecays = Array(targetSteps).fill(100);
              const arrMicro = Array(targetSteps).fill(0);

              for (let i = 0; i < Math.min(targetSteps, p.steps); i++) {
                arrSteps[i] = p.activeSteps[i];
                arrLyrics[i] = p.lyrics?.[i] || '';
                arrNotes[i] = p.notes?.[i] || '';
                if (p.volumes && p.volumes[i] !== undefined) arrVols[i] = p.volumes[i];
                if (p.decays && p.decays[i] !== undefined) arrDecays[i] = p.decays[i];
                if (p.microtimings && p.microtimings[i] !== undefined) arrMicro[i] = p.microtimings[i];
              }

              return {
                ...p,
                steps: targetSteps,
                activeSteps: arrSteps,
                lyrics: arrLyrics,
                notes: arrNotes,
                volumes: arrVols,
                decays: arrDecays,
                microtimings: arrMicro,
              };
            }
            return p;
          });
          return { ...t, patterns: nextPatterns };
        }
        return t;
      })
    );
  };

  const handleTimelinePatternAssign = (trackId: number, patternId: number | null, measureIdx: number) => {
    pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          const assign = [...p.measureAssignments];
          assign[measureIdx] = p.id === patternId;
          return { ...p, measureAssignments: assign };
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleMeasureTimeSigChange = (measureIdx: number, val: TimeSignature) => {
    pushUndoState();
    setMeasureTimeSigs(prev => {
      const arr = [...prev];
      arr[measureIdx] = val;
      return arr;
    });
  };

  const handleGlobalBpmChange = (newBpm: number) => {
    const delta = newBpm - bpm;
    pushUndoState();
    setBpm(newBpm);
    setMeasureBpms(prev => prev.map(val => {
      const currentVal = typeof val === 'number' ? val : bpm;
      const nextVal = currentVal + delta;
      return Math.max(40, Math.min(240, nextVal));
    }));
  };

  const handleMeasureBpmChange = (measureIdx: number, val: number) => {
    pushUndoState();
    setMeasureBpms(prev => {
      const arr = [...prev];
      arr[measureIdx] = val;
      return arr;
    });
  };

  const handleMeasureTransitionChange = (measureIdx: number, val: 'immediate' | 'ramp') => {
    pushUndoState();
    setMeasureBpmTransitions(prev => {
      const arr = [...prev];
      arr[measureIdx] = val;
      return arr;
    });
  };

  const handleMeasureVolChange = (measureIdx: number, val: number) => {
    pushUndoState();
    setMeasureVols(prev => {
      const arr = [...prev];
      arr[measureIdx] = val;
      return arr;
    });
  };

  const handleMeasureVolTransitionChange = (measureIdx: number, val: 'immediate' | 'ramp') => {
    pushUndoState();
    setMeasureVolTransitions(prev => {
      const arr = [...prev];
      arr[measureIdx] = val;
      return arr;
    });
  };

  const handleTotalMeasuresChange = (val: number) => {
    pushUndoState();
    setTotalMeasures(val);
    setTracks(tracks.map(t => ({
      ...t,
      patterns: t.patterns.map(p => ({
        ...p,
        measureAssignments: Array(val).fill(false).map((_, i) => p.measureAssignments[i] || false)
      }))
    })));
  };

  const handleDeleteMeasure = (measureIdx: number) => {
    if (totalMeasures <= 1) {
      alert(lang === 'fr' ? "Impossible de supprimer la dernière mesure restante." : "Não é possível excluir o único compasso restante.");
      return;
    }
    pushUndoState();

    const newTotal = totalMeasures - 1;

    // 1. Update tracks patterns measureAssignments
    const updatedTracks = tracks.map(t => ({
      ...t,
      patterns: t.patterns.map(p => {
        const assign = [...p.measureAssignments];
        assign.splice(measureIdx, 1);
        return { ...p, measureAssignments: assign };
      })
    }));
    setTracks(updatedTracks);

    // 2. Update measure-specific arrays
    setMeasureTimeSigs(prev => {
      const arr = [...prev];
      arr.splice(measureIdx, 1);
      return arr;
    });
    setMeasureBpms(prev => {
      const arr = [...prev];
      arr.splice(measureIdx, 1);
      return arr;
    });
    setMeasureBpmTransitions(prev => {
      const arr = [...prev];
      arr.splice(measureIdx, 1);
      return arr;
    });
    setMeasureVols(prev => {
      const arr = [...prev];
      arr.splice(measureIdx, 1);
      return arr;
    });
    setMeasureVolTransitions(prev => {
      const arr = [...prev];
      arr.splice(measureIdx, 1);
      return arr;
    });

    // 3. Update song sections
    setSongSections(prev => {
      return prev
        .map(sec => {
          let start = sec.startMeasure;
          let end = sec.endMeasure;
          if (start > measureIdx) {
            start -= 1;
          }
          if (end >= measureIdx) {
            end -= 1;
          }
          return { ...sec, startMeasure: start, endMeasure: end };
        })
        .filter(sec => sec.startMeasure <= sec.endMeasure);
    });

    // 4. Update loop bounds if necessary
    let newLoopStart = loopStartMeasure;
    let newLoopEnd = loopEndMeasure;
    if (newLoopStart !== null) {
      if (newLoopStart > measureIdx) {
        newLoopStart -= 1;
      } else if (newLoopStart === measureIdx) {
        newLoopStart = Math.min(newLoopStart, newTotal - 1);
        if (newLoopStart < 0) newLoopStart = null;
      }
    }
    if (newLoopEnd !== null) {
      if (newLoopEnd > measureIdx) {
        newLoopEnd -= 1;
      } else if (newLoopEnd === measureIdx) {
        newLoopEnd = Math.min(newLoopEnd, newTotal - 1);
        if (newLoopEnd < 0) newLoopEnd = null;
      }
    }
    if (newLoopStart !== null && newLoopEnd !== null && newLoopStart > newLoopEnd) {
      newLoopStart = null;
      newLoopEnd = null;
    }
    setLoopStartMeasure(newLoopStart);
    setLoopEndMeasure(newLoopEnd);

    // 5. Update total measures count
    setTotalMeasures(newTotal);
  };

  const handleInsertMeasure = (measureIdx: number) => {
    pushUndoState();

    const newTotal = totalMeasures + 1;

    // 1. Update tracks patterns measureAssignments
    const updatedTracks = tracks.map(t => ({
      ...t,
      patterns: t.patterns.map(p => {
        const assign = [...p.measureAssignments];
        assign.splice(measureIdx, 0, false);
        return { ...p, measureAssignments: assign };
      })
    }));
    setTracks(updatedTracks);

    // 2. Update measure-specific arrays with values from neighbor measure or defaults
    setMeasureTimeSigs(prev => {
      const arr = [...prev];
      const fallback = arr[measureIdx - 1] || arr[measureIdx] || timeSig;
      arr.splice(measureIdx, 0, fallback);
      return arr;
    });
    setMeasureBpms(prev => {
      const arr = [...prev];
      const fallback = arr[measureIdx - 1] || arr[measureIdx] || bpm;
      arr.splice(measureIdx, 0, fallback);
      return arr;
    });
    setMeasureBpmTransitions(prev => {
      const arr = [...prev];
      const fallback = arr[measureIdx - 1] || arr[measureIdx] || 'immediate';
      arr.splice(measureIdx, 0, fallback);
      return arr;
    });
    setMeasureVols(prev => {
      const arr = [...prev];
      const fallback = arr[measureIdx - 1] !== undefined ? arr[measureIdx - 1] : (arr[measureIdx] !== undefined ? arr[measureIdx] : 100);
      arr.splice(measureIdx, 0, fallback);
      return arr;
    });
    setMeasureVolTransitions(prev => {
      const arr = [...prev];
      const fallback = arr[measureIdx - 1] || arr[measureIdx] || 'immediate';
      arr.splice(measureIdx, 0, fallback);
      return arr;
    });

    // 3. Update song sections
    setSongSections(prev => {
      return prev.map(sec => {
        let start = sec.startMeasure;
        let end = sec.endMeasure;
        if (start >= measureIdx) {
          start += 1;
        }
        if (end >= measureIdx) {
          end += 1;
        }
        return { ...sec, startMeasure: start, endMeasure: end };
      });
    });

    // 4. Update loop bounds if necessary
    let newLoopStart = loopStartMeasure;
    let newLoopEnd = loopEndMeasure;
    if (newLoopStart !== null && newLoopStart >= measureIdx) {
      newLoopStart += 1;
    }
    if (newLoopEnd !== null && newLoopEnd >= measureIdx) {
      newLoopEnd += 1;
    }
    setLoopStartMeasure(newLoopStart);
    setLoopEndMeasure(newLoopEnd);

    // 5. Update total measures count
    setTotalMeasures(newTotal);
  };

  const handleSetLoopStart = (measureIdx: number) => {
    if (loopEndMeasure !== null && measureIdx > loopEndMeasure) {
      setLoopEndMeasure(measureIdx);
    }
    setLoopStartMeasure(measureIdx);
  };

  const handleSetLoopEnd = (measureIdx: number) => {
    if (loopStartMeasure !== null && measureIdx < loopStartMeasure) {
      setLoopStartMeasure(measureIdx);
    }
    setLoopEndMeasure(measureIdx);
  };

  const handleClearLoop = () => {
    setLoopStartMeasure(null);
    setLoopEndMeasure(null);
  };

  const handleStartSoloPattern = async (patternId: number) => {
    await Tone.start();
    
    // Stop vocal recording if any
    if (isRecordingVocal) {
      stopVocalRecording();
    }
    
    // Reset playhead
    mainLoop?.stop();
    Tone.Transport.stop();
    
    instrumentsConfig.forEach((inst) => {
      if (samplers[inst.id]) samplers[inst.id].stopAll();
      if (voiceSynths[inst.id]) voiceSynths[inst.id].triggerRelease();
    });
    (Object.values(vocalPlayersRef.current) as any[]).forEach((player) => {
      try {
        player.stop();
      } catch (_) {}
    });

    setSoloPatternPlayId(patternId);
    
    // Set step to -1 to start clean, measure count to 0
    setCurrentStepIndex(-1);
    currentStepIndexRef.current = -1;
    measureCountRef.current = 0;
    Tone.Transport.seconds = 0;

    // Start playback
    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
    }
    mainLoop?.start(0);
    setIsPlaying(true);
  };

  const handleStopSoloPattern = () => {
    setSoloPatternPlayId(null);
    handleTogglePlay(); // stop main loop and pause
  };

  const handleCopyPattern = (pattern: Pattern) => {
    setCopiedPattern(JSON.parse(JSON.stringify(pattern)));
  };

  const handlePastePattern = (trackId: number, patternId: number) => {
    if (!copiedPattern) return;
    pushUndoState();
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            return {
              ...p,
              steps: copiedPattern.steps,
              activeSteps: [...copiedPattern.activeSteps],
              lyrics: [...(copiedPattern.lyrics || Array(copiedPattern.steps).fill(''))],
              notes: [...(copiedPattern.notes || Array(copiedPattern.steps).fill(''))],
              volumes: [...(copiedPattern.volumes || Array(copiedPattern.steps).fill(80))],
              decays: [...(copiedPattern.decays || Array(copiedPattern.steps).fill(100))],
              microtimings: [...(copiedPattern.microtimings || Array(copiedPattern.steps).fill(0))],
            };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleCreateSongSection = (name: string, start: number, end: number, color?: string) => {
    pushUndoState();
    const newSection: SongSection = {
      id: String(Date.now() + Math.floor(Math.random() * 1000)),
      name,
      startMeasure: start,
      endMeasure: end,
      color: color || '#f39c12',
    };
    setSongSections(prev => {
      const next = [...prev, newSection];
      next.sort((a, b) => a.startMeasure - b.startMeasure);
      return next;
    });
  };

  const handleUpdateSongSection = (id: string, name: string, start: number, end: number, color?: string) => {
    pushUndoState();
    setSongSections(prev => {
      const next = prev.map(s => s.id === id ? { ...s, name, startMeasure: start, endMeasure: end, color } : s);
      next.sort((a, b) => a.startMeasure - b.startMeasure);
      return next;
    });
  };

  const handleDeleteSongSection = (id: string) => {
    pushUndoState();
    setSongSections(prev => prev.filter(s => s.id !== id));
  };

  const handleCopySongSection = (section: SongSection) => {
    const len = section.endMeasure - section.startMeasure + 1;
    const assignments: { [trackId: number]: (number | null)[] } = {};
    tracks.forEach(track => {
      const trackAssignments: (number | null)[] = [];
      for (let m = section.startMeasure; m <= section.endMeasure; m++) {
        const activePtn = track.patterns.find(p => p.measureAssignments[m]);
        trackAssignments.push(activePtn ? activePtn.id : null);
      }
      assignments[track.id] = trackAssignments;
    });
    setCopiedSection({
      length: len,
      name: section.name,
      color: section.color || '#f19066',
      assignments,
    });
  };

  const handlePasteSongSection = (destStartMeasure: number) => {
    if (!copiedSection) return;
    pushUndoState();
    
    // 1. Paste track assignments
    setTracks(prevTracks => {
      return prevTracks.map(track => {
        const trackAssignments = copiedSection.assignments[track.id];
        if (!trackAssignments) return track;

        const nextPatterns = track.patterns.map(pattern => {
          const nextMeasureAssignments = [...pattern.measureAssignments];
          for (let i = 0; i < copiedSection.length; i++) {
            const targetM = destStartMeasure + i;
            if (targetM >= totalMeasures) break;

            const copiedPtnId = trackAssignments[i];
            if (copiedPtnId === pattern.id) {
              nextMeasureAssignments[targetM] = true;
            } else {
              nextMeasureAssignments[targetM] = false;
            }
          }
          return { ...pattern, measureAssignments: nextMeasureAssignments };
        });

        return { ...track, patterns: nextPatterns };
      });
    });

    // 2. Add the pasted section block to songSections
    const newSection: SongSection = {
      id: String(Date.now() + Math.floor(Math.random() * 1000)),
      name: copiedSection.name,
      startMeasure: destStartMeasure,
      endMeasure: Math.min(totalMeasures - 1, destStartMeasure + copiedSection.length - 1),
      color: copiedSection.color,
    };
    
    setSongSections(prev => {
      const next = [...prev, newSection];
      next.sort((a, b) => a.startMeasure - b.startMeasure);
      return next;
    });
  };


  const handleStepTouchStart = (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => {
    if ('button' in e && e.button !== 0) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const targetEl = e.currentTarget as HTMLElement;
    const rect = targetEl.getBoundingClientRect();

    setTouchSelector({
      patternId,
      stepIdx,
      instId,
      x: rect.left + rect.width / 2,
      y: rect.top,
      currentVal,
      onSelect,
    });
    setHoveredStroke(String(currentVal));
  };

  const handleTimelineNavigate = (measureIdx: number, stepIdxInMeasure: number, stepsInMeasure: number) => {
    const mSig = measureTimeSigs[measureIdx] || timeSig;
    const currentTicks = getMaxTicks(mSig);
    const tickIdx = Math.max(0, Math.min(currentTicks - 1, Math.floor((stepIdxInMeasure / stepsInMeasure) * currentTicks)));
    
    measureCountRef.current = measureIdx;
    currentStepIndexRef.current = tickIdx - 1; // -1 so the next loop cycle increments to tickIdx
    setCurrentStepIndex(tickIdx);
    maxTicksRef.current = currentTicks;

    // Apply target BPM instantly when navigating
    const targetBpm = measureBpms[measureIdx] || bpm;
    try {
      Tone.Transport.bpm.cancelScheduledValues(0);
      Tone.Transport.bpm.value = targetBpm;
    } catch (e) {}

    // Sync Tone.js Transport position
    const stepDurationSec = Tone.Time('96n').toSeconds();
    let totalTicksBefore = 0;
    for (let i = 0; i < measureIdx; i++) {
      const prevSig = measureTimeSigs[i] || timeSig;
      totalTicksBefore += getMaxTicks(prevSig);
    }
    totalTicksBefore += tickIdx;
    Tone.Transport.seconds = totalTicksBefore * stepDurationSec;
  };

  // Text values key bindings helpers for traditional grid steps
  const handleTrackStepValueChange = (trackId: number, patternId: number, stepIdx: number, val: string) => {
    pushUndoState();
    const cleanChar = val.slice(-1);
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            const copySteps = [...p.activeSteps];
            const inst = instrumentsConfig[t.instrumentIdx];
            let parsed: string | number = 0;
            if (val === '0') {
              parsed = 0;
            } else if (inst.colors[val] !== undefined && val !== 'text') {
              parsed = val;
            } else if (cleanChar && cleanChar.trim() !== '') {
              if (inst.type === 'gongue') {
                if (cleanChar === 'G') parsed = 'GRV';
                else if (cleanChar === 'g') parsed = 'grv';
                else if (cleanChar === 'A') parsed = 'AIG';
                else if (cleanChar === 'a') parsed = 'aig';
                else if (['T', 't'].includes(cleanChar)) parsed = cleanChar;
              } else if (inst.id === 'mineiro') {
                if (['P', 'T', 'p', 't'].includes(cleanChar)) parsed = cleanChar;
              } else if (inst.id === 'caixa') {
                const normVal = val.trim().toLowerCase();
                if (normVal === 'rd') parsed = 'rd';
                else if (normVal === 're') parsed = 'Re';
                else if (normVal === 'rg') parsed = 'Re';
                else {
                  const lowerChar = cleanChar.toLowerCase();
                  if (lowerChar === 'r') parsed = 'rd';
                  else if (lowerChar === 'z') parsed = 'Re';
                  else if (lowerChar === 'x') parsed = 'x';
                  else if (lowerChar === 'f') parsed = 'f';
                  else if (lowerChar === 't') parsed = cleanChar;
                  else if (['d', 'e'].includes(lowerChar)) {
                    parsed = cleanChar;
                  }
                }
              } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
                const lowerChar = cleanChar.toLowerCase();
                if (['x', 'i'].includes(lowerChar)) {
                  parsed = lowerChar;
                } else if (['t'].includes(lowerChar)) {
                  parsed = cleanChar;
                } else if (['d', 'e'].includes(lowerChar)) {
                  parsed = cleanChar;
                }
              } else if (inst.id === 'agbe') {
                const lowerChar = cleanChar.toLowerCase();
                if (['s'].includes(lowerChar)) {
                  parsed = cleanChar;
                } else if (['t'].includes(lowerChar)) {
                  parsed = cleanChar;
                } else if (['d', 'e'].includes(lowerChar)) {
                  parsed = cleanChar;
                }
              } else {
                if (['D', 'E', 'd', 'e'].includes(cleanChar)) parsed = cleanChar;
              }
            }
            copySteps[stepIdx] = parsed;
            return { ...p, activeSteps: copySteps };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleTrackStepKeyDown = (
    trackId: number,
    patternId: number,
    stepIdx: number,
    key: string,
    currentWord: string,
    targetInputEl: HTMLInputElement
  ) => {
    const cardGrid = targetInputEl.closest('.step-boxes');
    if (!cardGrid) return;
    const inputs = Array.from(cardGrid.querySelectorAll('input'));
    const indexInGrid = inputs.indexOf(targetInputEl);

    // Auto advancing cell index focus triggers
    if (key === 'Backspace' && currentWord === '' && indexInGrid > 0) {
      const prevEl = inputs[indexInGrid - 1] as HTMLInputElement;
      prevEl.focus();
      prevEl.select();
    } else if ((key === 'ArrowRight' || key === 'Tab' || key === 'Enter') && indexInGrid < inputs.length - 1) {
      const nextEl = inputs[indexInGrid + 1] as HTMLInputElement;
      nextEl.focus();
      nextEl.select();
    } else if (key === 'ArrowLeft' && indexInGrid > 0) {
      const prevEl = inputs[indexInGrid - 1] as HTMLInputElement;
      prevEl.focus();
      prevEl.select();
    } else if (
      ['d', 'D', 'g', 'G', 'p', 'P', 't', 'T', 'a', 'A', 'r', 'R', 'e', 'E', 'x', 'X', 'f', 'F', 'b', 'B', 'i', 'I', 's', 'S'].includes(key) &&
      indexInGrid < inputs.length - 1
    ) {
      // Focus advance on character entry
      setTimeout(() => {
        const nextEl = inputs[indexInGrid + 1] as HTMLInputElement;
        nextEl.focus();
        nextEl.select();
      }, 10);
    }
  };

  const cleanupVocalNodes = () => {
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

      cleanupVocalNodes();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedAudioDeviceId ? { exact: selectedAudioDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      vocalStreamRef.current = stream;
      updateAudioDevices();

      const mediaRecorder = new MediaRecorder(stream);
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
                    return { ...p, vocalMode: 'micro' };
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
      
      vocalRecordingStateRef.current = 'waiting';
      setRecordingVocalPatternId(patternId);
      setIsRecordingVocal(true);
      
      await Tone.start();
      
      if (!isPlayingRef.current) {
        measureCountRef.current = measureIdx;
        currentStepIndexRef.current = -1;
        Tone.Transport.seconds = 0;
        if (Tone.Transport.state !== 'started') {
          Tone.Transport.start();
        }
        mainLoop?.start(0);
        setIsPlaying(true);
      }
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
    const wasRecording = vocalRecordingStateRef.current === 'recording';
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

  // Vocals inputs handlers
  const handleVoiceTypeToggle = (trackId: number, patternId: number, stepIdx: number) => {
    pushUndoState();
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            const copySteps = [...p.activeSteps];
            if (copySteps[stepIdx] === 0) return p;
            copySteps[stepIdx] = copySteps[stepIdx] === 'P' ? 'C' : 'P';
            return { ...p, activeSteps: copySteps };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleVoiceSylChange = (trackId: number, patternId: number, stepIdx: number, val: string) => {
    const activePattern = tracks.find(t => t.id === trackId)?.patterns.find(p => p.id === patternId);
    const prevVal = activePattern?.lyrics?.[stepIdx] || '';
    if (prevVal === '' && val !== '') {
      pushUndoState();
    }
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            const copySteps = [...p.activeSteps];
            const arrLyrics = [...(p.lyrics || Array(p.steps).fill(''))];
            const arrNotes = [...(p.notes || Array(p.steps).fill(''))];
            arrLyrics[stepIdx] = val;
            if (val.trim() !== '') {
              if (copySteps[stepIdx] === 0) {
                copySteps[stepIdx] = 'C';
                if (!arrNotes[stepIdx]) arrNotes[stepIdx] = 'C4';
              }
            } else {
              copySteps[stepIdx] = 0;
            }
            return { ...p, activeSteps: copySteps, lyrics: arrLyrics, notes: arrNotes };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleVoiceNoteChange = (trackId: number, patternId: number, stepIdx: number, val: string) => {
    const activePattern = tracks.find(t => t.id === trackId)?.patterns.find(p => p.id === patternId);
    const prevVal = activePattern?.notes?.[stepIdx] || '';
    if (prevVal === '' && val !== '') {
      pushUndoState();
    }
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            const arrNotes = [...(p.notes || Array(p.steps).fill(''))];
            arrNotes[stepIdx] = val;
            return { ...p, notes: arrNotes };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleVoiceNoteBlur = (trackId: number, patternId: number, stepIdx: number, val: string) => {
    pushUndoState();
    const trimmed = val.trim();
    if (trimmed.length === 1 || (trimmed.length === 2 && (trimmed.includes('#') || trimmed.includes('b')))) {
      if (/^[a-gA-G][#b]?$/.test(trimmed)) {
        const completedNote = trimmed.toUpperCase() + '4';
        setTracks(tracks.map(t => {
          if (t.id === trackId) {
            const nextPatterns = t.patterns.map(p => {
              if (p.id === patternId) {
                const arrNotes = [...(p.notes || Array(p.steps).fill(''))];
                arrNotes[stepIdx] = completedNote;
                return { ...p, notes: arrNotes };
              }
              return p;
            });
            return { ...t, patterns: nextPatterns };
          }
          return t;
        }));
      }
    }
  };

  // Interactive syllables trigger extraction formatting
  const handleExtractLyrics = () => {
    const voiceTracks = tracks.filter((t) => instrumentsConfig[t.instrumentIdx].type === 'voice');
    const htmlArr: string[] = [];

    voiceTracks.forEach((t) => {
      t.patterns.forEach(p => {
        let trackStr = '';
        for (let i = 0; i < p.steps; i++) {
          if (p.activeSteps[i] !== 0 && p.lyrics[i]) {
            const rawLyric = p.lyrics[i];
            const hasSpace = rawLyric.endsWith(' ');
            const syl = rawLyric.replace(/-$/, '').trim();
            if (syl) {
              trackStr += syl + (hasSpace ? ' ' : '');
            }
          }
        }
        if (trackStr) {
          htmlArr.push(trackStr.trim());
        }
      });
    });

    setLetras(htmlArr.join('\n\n'));
  };

  // Master Save Preset state down to local downloadable JSON
  const handleSaveState = () => {
    const dataToSave: Preset = {
      bpm,
      timeSig,
      totalMeasures,
      tracks,
      letras,
      metadata,
      measureTimeSigs,
      measureBpms,
      measureBpmTransitions,
      measureVols,
      measureVolTransitions,
      songSections
    };
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
    const dlLink = document.createElement('a');
    dlLink.href = URL.createObjectURL(blob);
    
    let fileName = 'rythme_samambaia.json';
    if (metadata?.toada && metadata.toada.trim() !== '') {
      const cleanTitle = metadata.toada.trim()
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

  // Master Load state from uploaded JSON
  const handleLoadState = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data.bpm) {
          setBpm(Math.round(data.bpm));
        }
        if (data.timeSig) {
          setTimeSig(data.timeSig);
        }
        if (data.letras !== undefined) {
          setLetras(data.letras);
        }
        if (data.metadata) {
          setMetadata(data.metadata);
        }

        let loadedTracks: TrackGroup[] = [];
        let loadedMeasures = data.totalMeasures || 8;

        const defaultBpm = Math.round(data.bpm || bpm || 90);
        const defaultTimeSig = data.timeSig || timeSig || '4/4';

        const loadedBpms = data.measureBpms && Array.isArray(data.measureBpms)
          ? data.measureBpms.map((b: number) => Math.round(b))
          : Array(loadedMeasures).fill(defaultBpm);

        const loadedTimeSigs = data.measureTimeSigs && Array.isArray(data.measureTimeSigs)
          ? data.measureTimeSigs
          : Array(loadedMeasures).fill(defaultTimeSig);

        const loadedBpmTransitions = data.measureBpmTransitions && Array.isArray(data.measureBpmTransitions)
          ? data.measureBpmTransitions
          : Array(loadedMeasures).fill('immediate');

        const loadedVols = data.measureVols && Array.isArray(data.measureVols)
          ? data.measureVols.map((v: number) => Math.round(v))
          : Array(loadedMeasures).fill(100);

        const loadedVolTransitions = data.measureVolTransitions && Array.isArray(data.measureVolTransitions)
          ? data.measureVolTransitions
          : Array(loadedMeasures).fill('immediate');

        setMeasureBpms(loadedBpms);
        setMeasureTimeSigs(loadedTimeSigs);
        setMeasureBpmTransitions(loadedBpmTransitions);
        setMeasureVols(loadedVols);
        setMeasureVolTransitions(loadedVolTransitions);

        if (data.tracks) {
          loadedTracks = data.tracks;
          loadedTracks.forEach(t => t.patterns.forEach(ptn => normalizePatternData(ptn, t.instrumentIdx)));
        } else if (data.circles) {
          loadedTracks = migrateCirclesToTracks(data.circles, loadedMeasures);
          loadedTracks.forEach(t => t.patterns.forEach(ptn => normalizePatternData(ptn, t.instrumentIdx)));
        }

        updateRadii(loadedTracks);
        setTracks(loadedTracks);
        setTotalMeasures(loadedMeasures);
        if (data.songSections && Array.isArray(data.songSections)) {
          setSongSections(data.songSections);
        } else {
          setSongSections([]);
        }
        measureCountRef.current = 0;
      } catch (err) {
        window.alert(t('invalidFile'));
      }
    };
    reader.readAsText(file);
  };

  const handleStepValueSelectAndToggle = (
    trackId: number,
    patternId: number,
    stepIdx: number,
    newState: string | number,
    optLyric?: string,
    optNote?: string
  ) => {
    pushUndoState();
    setTracks(tracks.map((t) => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            const arrSteps = [...p.activeSteps];
            arrSteps[stepIdx] = newState;
            const arrLyrics = [...(p.lyrics || Array(p.steps).fill(''))];
            const arrNotes = [...(p.notes || Array(p.steps).fill(''))];

            if (optLyric !== undefined) arrLyrics[stepIdx] = optLyric;
            if (optNote !== undefined) arrNotes[stepIdx] = optNote;

            return {
              ...p,
              activeSteps: arrSteps,
              lyrics: arrLyrics,
              notes: arrNotes,
            };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const activePatternIdByInst: { [instIdx: number]: number | null } = {};
  tracks.forEach(t => {
    if (activePatternIdByInst[t.instrumentIdx] === undefined) {
      if (isPlaying) {
        const currentMeasure = measureCountRef.current % totalMeasuresRef.current;
        const activePattern = t.patterns.find(p => p.measureAssignments[currentMeasure]);
        activePatternIdByInst[t.instrumentIdx] = activePattern ? activePattern.id : null;
      } else {
        activePatternIdByInst[t.instrumentIdx] = t.selectedPatternId;
      }
    }
  });

  const activePatternIdByTrack: { [trackId: number]: number | null } = {};
  tracks.forEach(t => {
    if (soloPatternPlayId !== null) {
      const hasSoloPattern = t.patterns.some(p => p.id === soloPatternPlayId);
      activePatternIdByTrack[t.id] = hasSoloPattern ? soloPatternPlayId : null;
    } else {
      const currentMeasure = measureCountRef.current % totalMeasuresRef.current;
      const activePattern = t.patterns.find(p => p.measureAssignments[currentMeasure]);
      activePatternIdByTrack[t.id] = activePattern ? activePattern.id : null;
    }
  });

  return (
    <div className="flex flex-col h-screen text-[#f5f5f5] bg-[#0a0807] overflow-hidden select-none font-sans relative">
      {/* Visual buffer loader loading overlay */}
      {isLoading && (
        <div id="loading-overlay" className="absolute inset-0 bg-[#121212]/90 flex flex-col items-center justify-center z-[9999] gap-2.5">
          <span className="text-3xl">🌿</span>
          <span className="text-xl font-bold font-cactus tracking-wider text-[#f1c40f]">
            {t('loading')}
          </span>
        </div>
      )}

      {/* Header controls bar */}
      <Header
        lang={lang}
        onLangToggle={() => setLang(lang === 'pt' ? 'fr' : 'pt')}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        preset={activePresetName}
        presetFiles={presetFiles}
        onPresetChange={handlePresetSelect}
        onClear={() => {
          pushUndoState();
          setTracks([]);
          setLetras('');
          setMetadata({ toada: '', nacao: '', compositor: '', ritmo: '', youtubeUrl: '', partitionImage: undefined });
        }}
        onSave={handleSaveState}
        onSaveToLocal={handleSaveToLocal}
        onLoad={handleLoadState}
        localPresets={localPresets}
        onLoadLocalPreset={handleLoadLocalPreset}
        onAddInstrument={handleAddTrackInstrument}
        activeRightPanel={activeRightPanel}
        onToggleRightPanel={(p) => setActiveRightPanel(activeRightPanel === p ? null : p)}
        isLeftPanelCollapsed={isLeftPanelCollapsed}
        onToggleLeftPanel={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
        viewMode={viewMode}
        onViewModeToggle={(mode) => {
          setViewMode(mode);
          if (mode === 'console' || mode === 'timeline') {
            setActiveRightPanel(null);
          } else if (mode === 'roda') {
            if (window.innerWidth >= 1024) {
              setActiveRightPanel('letras');
            }
          }
        }}
        onUndo={handleUndo}
        canUndo={tracksHistory.length > 0}
        isMobile={isMobile}
        isSwingOn={isSwingOn}
        onSwingToggle={() => setIsSwingOn(!isSwingOn)}
        masterVol={masterVol}
        onMasterVolChange={(val) => setMasterVol(val)}
        timeSig={timeSig}
        onTimeSigChange={handleTimeSigChange}
        totalMeasures={totalMeasures}
        onTotalMeasuresChange={handleTotalMeasuresChange}
        reverbType={reverbType}
        onReverbTypeChange={setReverbType}
      />

      {/* Main Workspace workspace containing expanding grids layouts */}
      <div id="main-workspace" className="flex flex-grow overflow-hidden relative w-full h-[calc(100vh-130px)] mobile-stack cordel-bg">
        {viewMode === 'roda' && (
          <>
            {/* Left column tracks mixers */}
            {(!isMobile || mobileTab === 'mixer') && (
              <Mixer
                lang={lang}
                tracks={tracks}
                onMoveUp={handleTrackMoveUp}
                onMoveDown={handleTrackMoveDown}
                onInstrumentChange={handleTrackInstrumentIdxChange}
                onMuteToggle={handleTrackMuteToggle}
                onSoloToggle={handleTrackSoloToggle}
                onHideToggle={handleTrackHideToggle}
                onDelete={handleTrackDelete}
                onVolumeChange={handleTrackVolumeChange}
                onPanChange={handleTrackPanChange}
                onStepsChange={handleTrackStepsChange}
                onStepValueChange={handleTrackStepValueChange}
                onStepKeyDown={handleTrackStepKeyDown}
                onStepTouchStart={handleStepTouchStart}
                onVoiceTypeToggle={handleVoiceTypeToggle}
                onVoiceSylChange={handleVoiceSylChange}
                onVoiceNoteChange={handleVoiceNoteChange}
                onVoiceNoteBlur={handleVoiceNoteBlur}
                isPlaying={isPlaying}
                currentStepIndex={currentStepIndex}
                maxTicks={getMaxTicks(timeSig)}
                timeSig={timeSig}
                isLeftPanelCollapsed={isMobile ? false : isLeftPanelCollapsed}
                onToggleLeftPanel={() => setIsLeftPanelCollapsed(true)}
                totalMeasures={totalMeasures}
                onTrackSelectPattern={(trackId, patternId) => {
                  setTracks(tracks.map(t => t.id === trackId ? { ...t, selectedPatternId: patternId } : t));
                }}
                onPatternAssign={(trackId, patternId, measureIdx, val) => {
                  setTracks(tracks.map(t => {
                    if (t.id === trackId) {
                      const nextPatterns = t.patterns.map(p => {
                        if (p.id === patternId) {
                          const assign = [...p.measureAssignments];
                          assign[measureIdx] = val;
                          return { ...p, measureAssignments: assign };
                        }
                        return p;
                      });
                      return { ...t, patterns: nextPatterns };
                    }
                    return t;
                  }));
                }}
                onAddPattern={(trackId) => {
                  setTracks(tracks.map(t => {
                    if (t.id === trackId) {
                      const p = t.patterns[0];
                      const newPattern: Pattern = {
                        id: Date.now() + Math.floor(Math.random() * 1000),
                        name: `Padrão ${t.patterns.length + 1}`,
                        steps: p.steps,
                        activeSteps: Array(p.steps).fill(0),
                        lyrics: Array(p.steps).fill(''),
                        notes: Array(p.steps).fill(''),
                        measureAssignments: Array(totalMeasures).fill(false),
                        volumes: Array(p.steps).fill(80),
                        decays: Array(p.steps).fill(100),
                        microtimings: Array(p.steps).fill(0),
                      };
                      return { ...t, patterns: [...t.patterns, newPattern], selectedPatternId: newPattern.id };
                    }
                    return t;
                  }));
                }}
                onDeletePattern={(trackId, patternId) => {
                  setTracks(tracks.map(t => {
                    if (t.id === trackId && t.patterns.length > 1) {
                      const nextPatterns = t.patterns.filter(p => p.id !== patternId);
                      const nextSelected = t.selectedPatternId === patternId ? nextPatterns[0].id : t.selectedPatternId;
                      return { ...t, patterns: nextPatterns, selectedPatternId: nextSelected };
                    }
                    return t;
                  }));
                }}
                onCopyPattern={handleCopyPattern}
                onPastePattern={handlePastePattern}
                canPaste={!!copiedPattern}
              />
            )}

            {/* Center circle visual canvas engine */}
            {(!isMobile || mobileTab === 'roda') && (
              <CircleSequencer
                lang={lang}
                tracks={tracks}
                isPlaying={isPlaying}
                currentStepIndex={currentStepIndex}
                currentMeasure={measureCountRef.current % totalMeasures}
                maxTicks={getMaxTicks(measureTimeSigs[measureCountRef.current % totalMeasures] || timeSig)}
                timeSig={measureTimeSigs[measureCountRef.current % totalMeasures] || timeSig}
                totalMeasures={totalMeasures}
                onTogglePlay={handleTogglePlay}
                onStepChange={handleStepValueSelectAndToggle}
                langPromptVoiceText={t('promptVoice')}
                isMetroOn={isMetroOn}
                activePatternIdByTrack={activePatternIdByTrack}
                hitTriggersRef={hitTriggersRef}
                bpm={bpm}
                measureBpms={measureBpms}
                measureVols={measureVols}
                isMobile={isMobile}
              />
            )}
          </>
        )}
        {viewMode === 'console' && (
          <div className="flex-1 min-w-0 flex flex-col h-full overflow-x-auto overflow-y-hidden custom-scrollbar">
            <ConsoleMixer
              isMobile={isMobile}
              lang={lang}
              tracks={tracks}
              onMoveUp={handleTrackMoveUp}
              onMoveDown={handleTrackMoveDown}
              onInstrumentChange={handleTrackInstrumentIdxChange}
              onMuteToggle={handleTrackMuteToggle}
              onSoloToggle={handleTrackSoloToggle}
              onHideToggle={handleTrackHideToggle}
              onDelete={handleTrackDelete}
              onVolumeChange={handleTrackVolumeChange}
              onPanChange={handleTrackPanChange}
              onStepsChange={handleTrackStepsChange}
              onStepValueChange={handleTrackStepValueChange}
              onStepKeyDown={handleTrackStepKeyDown}
              onStepTouchStart={handleStepTouchStart}
              onVoiceTypeToggle={handleVoiceTypeToggle}
              onVoiceSylChange={handleVoiceSylChange}
              onVoiceNoteChange={handleVoiceNoteChange}
              onVoiceNoteBlur={handleVoiceNoteBlur}
              isPlaying={isPlaying}
              currentStepIndex={currentStepIndex}
              currentMeasure={measureCountRef.current % totalMeasures}
              maxTicks={getMaxTicks(timeSig)}
              timeSig={timeSig}
              totalMeasures={totalMeasures}
              onReverbChange={handleTrackReverbChange}
              onStepVolumeChange={handleTrackStepVolumeChange}
              onStepDecayChange={handleTrackStepDecayChange}
              onStepMicrotimingChange={handleTrackStepMicrotimingChange}
              onResetMicrotimings={handleResetTrackMicrotimings}
              isSwingOn={isSwingOn}
              onTrackSelectPattern={(trackId, patternId) => {
                setTracks(tracks.map(t => t.id === trackId ? { ...t, selectedPatternId: patternId } : t));
              }}
              onPatternAssign={(trackId, patternId, measureIdx, val) => {
                pushUndoState();
                setTracks(tracks.map(t => {
                  if (t.id === trackId) {
                    const nextPatterns = t.patterns.map(p => {
                      if (p.id === patternId) {
                        const assign = [...p.measureAssignments];
                        assign[measureIdx] = val;
                        return { ...p, measureAssignments: assign };
                      }
                      return p;
                    });
                    return { ...t, patterns: nextPatterns };
                  }
                  return t;
                }));
              }}
              onAddPattern={(trackId) => {
                pushUndoState();
                setTracks(tracks.map(t => {
                  if (t.id === trackId) {
                    const p = t.patterns[0];
                    const newPattern: Pattern = {
                      id: Date.now() + Math.floor(Math.random() * 1000),
                      name: `Padrão ${t.patterns.length + 1}`,
                      steps: p.steps,
                      activeSteps: Array(p.steps).fill(0),
                      lyrics: Array(p.steps).fill(''),
                      notes: Array(p.steps).fill(''),
                      measureAssignments: Array(totalMeasures).fill(false),
                      volumes: Array(p.steps).fill(80),
                      decays: Array(p.steps).fill(100),
                      microtimings: Array(p.steps).fill(0),
                    };
                    return { ...t, patterns: [...t.patterns, newPattern], selectedPatternId: newPattern.id };
                  }
                  return t;
                }));
              }}
              onDeletePattern={(trackId, patternId) => {
                pushUndoState();
                setTracks(tracks.map(t => {
                  if (t.id === trackId && t.patterns.length > 1) {
                    const nextPatterns = t.patterns.filter(p => p.id !== patternId);
                    const nextSelected = t.selectedPatternId === patternId ? nextPatterns[0].id : t.selectedPatternId;
                    return { ...t, patterns: nextPatterns, selectedPatternId: nextSelected };
                  }
                  return t;
                }));
              }}
              onCopyPattern={handleCopyPattern}
              onPastePattern={handlePastePattern}
              canPaste={!!copiedPattern}
              isRecordingVocal={isRecordingVocal}
              recordingVocalPatternId={recordingVocalPatternId}
              recordedPatternIds={recordedPatternIds}
              onStartVocalRecording={startVocalRecording}
              onStopVocalRecording={stopVocalRecording}
              onVocalModeChange={handleVocalModeChange}
              onDeleteVocalRecording={handleDeleteVocalRecording}
              onVocalLatencyChange={handleVocalLatencyChange}
              audioDevices={audioDevices}
              selectedAudioDeviceId={selectedAudioDeviceId}
              onAudioDeviceChange={handleAudioDeviceChange}
              onImportVocalFile={handleImportVocalFile}
              isVocalGuideEnabled={isVocalGuideEnabled}
              onVocalGuideToggle={setIsVocalGuideEnabled}
              soloPatternPlayId={soloPatternPlayId}
              onStartSoloPattern={handleStartSoloPattern}
              onStopSoloPattern={handleStopSoloPattern}
            />
          </div>
        )}
        {viewMode === 'timeline' && (
          <TimelineSequencer
            lang={lang}
            tracks={tracks}
            isPlaying={isPlaying}
            currentStepIndex={currentStepIndex}
            currentMeasure={measureCountRef.current % totalMeasures}
            maxTicks={getMaxTicks(timeSig)}
            totalMeasures={totalMeasures}
            isMobile={isMobile}
            onMuteToggle={handleTrackMuteToggle}
            onSoloToggle={handleTrackSoloToggle}
            onPatternAssignForMeasure={handleTimelinePatternAssign}
            onNavigate={handleTimelineNavigate}
            measureTimeSigs={measureTimeSigs}
            measureBpms={measureBpms}
            measureBpmTransitions={measureBpmTransitions}
            measureVols={measureVols}
            measureVolTransitions={measureVolTransitions}
            onMeasureTimeSigChange={handleMeasureTimeSigChange}
            onMeasureBpmChange={handleMeasureBpmChange}
            onMeasureTransitionChange={handleMeasureTransitionChange}
            onMeasureVolChange={handleMeasureVolChange}
            onMeasureVolTransitionChange={handleMeasureVolTransitionChange}
            onTotalMeasuresChange={handleTotalMeasuresChange}
            songSections={songSections}
            copiedSection={copiedSection}
            onCreateSection={handleCreateSongSection}
            onUpdateSection={handleUpdateSongSection}
            onDeleteSection={handleDeleteSongSection}
            onCopySection={handleCopySongSection}
            onPasteSection={handlePasteSongSection}
            metadata={metadata}
            letras={letras}
            loopStartMeasure={loopStartMeasure}
            loopEndMeasure={loopEndMeasure}
            onSetLoopStart={handleSetLoopStart}
            onSetLoopEnd={handleSetLoopEnd}
            onClearLoop={handleClearLoop}
            measureWidth={measureWidth}
            onMeasureWidthChange={setMeasureWidth}
            onDeleteMeasure={handleDeleteMeasure}
            onInsertMeasure={handleInsertMeasure}
          />
        )}

        {/* Right drawer sidebar context panel */}
        {(!isMobile || (viewMode === 'roda' && mobileTab === 'toada')) && (
          <RightSidebar
            lang={lang}
            activePanel={isMobile ? (activeRightPanel || 'letras') : activeRightPanel}
            onTogglePanel={(p) => {
              if (isMobile) {
                setActiveRightPanel(activeRightPanel === 'letras' ? 'legend' : 'letras');
              } else {
                setActiveRightPanel(activeRightPanel === p ? null : p);
              }
            }}
            tracks={tracks}
            letras={letras}
            onLetrasChange={setLetras}
            metadata={metadata}
            onMetadataChange={setMetadata}
            onExtractLyrics={handleExtractLyrics}
            currentPlayState={isPlaying ? {
              stepIndex: currentStepIndex,
              maxTicks: getMaxTicks(timeSig),
              activePatternIdByInst,
            } : null}
            totalMeasures={totalMeasures}
          />
        )}
      </div>

      {/* Mobile view Tab Bar (Roda, Mixeur, Toada) */}
      {isMobile && viewMode === 'roda' && (
        <div className="flex w-full bg-[#f4ecd8] border-t-2 border-[#1a1a1a] h-12 shrink-0 z-40 text-[#1a1a1a]">
          <button
            onClick={() => setMobileTab('roda')}
            className={`flex-1 font-cactus font-bold text-xs flex flex-col items-center justify-center border-r border-[#1a1a1a] cursor-pointer ${
              mobileTab === 'roda' ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a]'
            }`}
          >
            <span className="text-sm">⭕</span>
            <span className="text-[9px] uppercase tracking-wider mt-0.5 font-bold">Roda</span>
          </button>
          <button
            onClick={() => setMobileTab('mixer')}
            className={`flex-1 font-cactus font-bold text-xs flex flex-col items-center justify-center border-r border-[#1a1a1a] cursor-pointer ${
              mobileTab === 'mixer' ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a]'
            }`}
          >
            <span className="text-sm">🎛️</span>
            <span className="text-[9px] uppercase tracking-wider mt-0.5 font-bold">{lang === 'pt' ? 'Mixador' : 'Mixeur'}</span>
          </button>
          <button
            onClick={() => setMobileTab('toada')}
            className={`flex-1 font-cactus font-bold text-xs flex flex-col items-center justify-center cursor-pointer ${
              mobileTab === 'toada' ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a]'
            }`}
          >
            <span className="text-sm">📝</span>
            <span className="text-[9px] uppercase tracking-wider mt-0.5 font-bold font-cactus">Toada</span>
          </button>
        </div>
      )}

      <TransportBar
        viewMode={viewMode}
        lang={lang}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onRewind={handleRewind}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        onRecordToggle={handleAudioRecordingToggle}
        bpm={bpm}
        onBpmChange={handleGlobalBpmChange}
        isMetroOn={isMetroOn}
        onMetroToggle={() => setIsMetroOn(!isMetroOn)}
        isSwingOn={isSwingOn}
        onSwingToggle={() => setIsSwingOn(!isSwingOn)}
        masterVol={masterVol}
        onMasterVolChange={(val) => setMasterVol(val)}
        timeSig={timeSig}
        onTimeSigChange={handleTimeSigChange}
        totalMeasures={totalMeasures}
        onTotalMeasuresChange={handleTotalMeasuresChange}
        reverbType={reverbType}
        onReverbTypeChange={setReverbType}
      />
      {touchSelector && (
        <TouchStrokeSelector
          selector={touchSelector}
          hoveredStroke={hoveredStroke}
          setHoveredStroke={setHoveredStroke}
          onClose={() => {
            setTouchSelector(null);
            setHoveredStroke(null);
          }}
          lang={lang}
        />
      )}
    </div>
  );
}
