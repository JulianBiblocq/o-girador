/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Circle, TrackGroup, Pattern, Language, Preset, TimeSignature, PresetMetadata, HitTrigger } from './types';
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

// Module scope audio engines to avoid duplicate instantiations on React re-renders
let bMetroClick: Tone.Synth | null = null;
const channels: { [id: string]: Tone.Channel } = {};
const meters: { [id: string]: Tone.Meter } = {};
const samplers: { [id: string]: Tone.Players } = {};
const voiceSynths: { [id: string]: Tone.Synth } = {};
let loadedCount = 0;
let mainLoop: Tone.Loop | null = null;
let audioRecorder: Tone.Recorder | null = null;
let reverbNode: Tone.Reverb | null = null;
const reverbSends: { [id: string]: Tone.Gain } = {};

export default function App() {
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
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  const [activeRightPanel, setActiveRightPanel] = useState<'legend' | 'letras' | null>(
    window.innerWidth >= 1024 ? 'letras' : null
  );
  const [viewMode, setViewMode] = useState<'roda' | 'console'>('roda');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [localPresets, setLocalPresets] = useState<string[]>([]);
  const [tracksHistory, setTracksHistory] = useState<TrackGroup[][]>([]);
  const tracksHistoryRef = useRef<TrackGroup[][]>([]);
  const [reverbType, setReverbType] = useState<'room' | 'studio' | 'hall'>('studio');

  useEffect(() => {
    tracksHistoryRef.current = tracksHistory;
  }, [tracksHistory]);

  useEffect(() => {
    setLocalPresets(Object.keys(getLocalLibrary()));
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

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

  // Synchronization with refs to have lag-free values inside Tone.js loop
  useEffect(() => {
    tracksRef.current = tracks;
    totalMeasuresRef.current = totalMeasures;
    isPlayingRef.current = isPlaying;
    currentStepIndexRef.current = currentStepIndex;
    maxTicksRef.current = getMaxTicks(timeSig);
    isMetroOnRef.current = isMetroOn;
    isSwingOnRef.current = isSwingOn;
  }, [tracks, totalMeasures, isPlaying, currentStepIndex, timeSig, isMetroOn, isSwingOn]);

  const t = (key: string) => {
    return (i18n[lang] as any)[key] || key;
  };

  // 1. Initialize stable Audio Engine Nodes
  useEffect(() => {
    const initAudio = async () => {
      if (bMetroClick) return; // already initialized

      Tone.Destination.volume.value = masterVol;

      bMetroClick = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.01 },
        volume: 4,
      }).toDestination();

      if (!reverbNode) {
        reverbNode = new Tone.Reverb({ decay: 1.4, preDelay: 0.0 }).toDestination();
        reverbNode.generate().catch(err => console.error("Error generating initial Tone.Reverb:", err));
      }

      const totalAudioCount = instrumentsConfig.filter((i) => i.type !== 'voice').length;

      instrumentsConfig.forEach((inst) => {
        channels[inst.id] = new Tone.Channel({ volume: 0 }).toDestination();
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

      // Stable 96-tick sequencing loop
      mainLoop = new Tone.Loop((time) => {
        const currentTicks = maxTicksRef.current;
        let stepIdx = currentStepIndexRef.current;

        if (stepIdx === currentTicks - 1) {
          measureCountRef.current++;
        }
        stepIdx = (stepIdx + 1) % currentTicks;
        currentStepIndexRef.current = stepIdx;
        setCurrentStepIndex(stepIdx);

        // Click metronome beat pulse
        const markers = getMarkers(
          currentTicks === 144
            ? '12/8'
            : currentTicks === 72
            ? '3/4'
            : currentTicks === 48
            ? '2/4'
            : '4/4',
          currentTicks
        );
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
          const canPlay = hasSolo ? track.isSolo : !track.isMute;
          if (!canPlay) return;

          const currentMeasure = measureCountRef.current % totalMeasuresRef.current;
          const activePattern = track.patterns.find(p => p.measureAssignments[currentMeasure]);
          if (!activePattern) return;

          const inst = instrumentsConfig[track.instrumentIdx];

          const stepCount = activePattern.steps;
          const circleStepIdx = Math.floor((stepIdx / currentTicks) * stepCount);
          const expectedTick = Math.floor((circleStepIdx * currentTicks) / stepCount);

          if (stepIdx === expectedTick) {
            const state = activePattern.activeSteps[circleStepIdx];
            if (state !== 0) {
              hitTriggersRef.current.push({ trackId: track.id, stepIndex: circleStepIdx, state });
              const baseGain = track.volumeVal / 100;

              const stepVolMultiplier = (activePattern.volumes?.[circleStepIdx] ?? 100) / 100;
              const stepDecayMultiplier = (activePattern.decays?.[circleStepIdx] ?? 100) / 100;

              const manualMicro = activePattern.microtimings?.[circleStepIdx] ?? 0;
              const stepDurationSec = Tone.Time('96n').toSeconds() * (currentTicks / stepCount);
              const microTimeOffset = (manualMicro / 100) * stepDurationSec * 0.5;
              const finalTriggerTime = swingTime + microTimeOffset;

              if (inst.type === 'voice') {
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
              } else if (samplers[inst.id]) {
                const playerGroup = samplers[inst.id];
                let targetKey: string | null = null;
                let isStrong = false;

                if (inst.type === 'gongue') {
                  if (state === 'GRV') { targetKey = 'fort-grave'; isStrong = true; }
                  else if (state === 'grv') { targetKey = 'faible-grave'; isStrong = false; }
                  else if (state === 'AIG') { targetKey = 'fort-aigue'; isStrong = true; }
                  else if (state === 'aig') { targetKey = 'faible-aigue'; isStrong = false; }
                  else if (state === 'b') { targetKey = 'barulho'; isStrong = true; }
                } else if (inst.id === 'caixa') {
                  if (state === 'D' || state === 'G') { targetKey = 'fort'; isStrong = true; }
                  else if (state === 'd' || state === 'g') { targetKey = 'faible'; isStrong = false; }
                  else if (state === 'rd') { targetKey = 'ruffada-D'; isStrong = true; }
                  else if (state === 'rg') { targetKey = 'ruffada-G'; isStrong = true; }
                  else if (state === 'x') { targetKey = 'cerclage'; isStrong = true; }
                  else if (state === 'f') { targetKey = 'fla'; isStrong = true; }
                  else if (state === 'b') { targetKey = 'barulho'; isStrong = true; }
                } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
                  if (state === 'D' || state === 'G') { targetKey = 'fort'; isStrong = true; }
                  else if (state === 'd' || state === 'g') { targetKey = 'faible'; isStrong = false; }
                  else if (state === 'b') { targetKey = 'barulho'; isStrong = true; }
                  else if (state === 'x') { targetKey = 'cerclage'; isStrong = true; }
                  else if (inst.id === 'alfaia' || state === 'i') { targetKey = 'iguarassu'; isStrong = true; }
                } else if (inst.id === 'agbe') {
                  if (state === 'G' || state === 'D') { targetKey = 'fort'; isStrong = true; }
                  else if (state === 'g' || state === 'd') { targetKey = 'faible'; isStrong = false; }
                  else if (state === 'b') { targetKey = 'barulho'; isStrong = true; }
                  else if (state === 's') { targetKey = 'saut'; isStrong = true; }
                } else {
                  if (['D', 'G', 'P', 'T'].includes(state as string)) { targetKey = 'fort'; isStrong = true; }
                  else if (['d', 'g', 'p', 't'].includes(state as string)) { targetKey = 'faible'; isStrong = false; }
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
          bar.style.width = isPlayingRef.current ? dbToPercent(meter.getValue() as number) + '%' : '0%';
        }
      });
    };

    const timer = setInterval(updateLocalMenders, 40);
    return () => clearInterval(timer);
  }, []);

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
    pushUndoState();
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

    if (!p.volumes) p.volumes = Array(p.steps).fill(100);
    if (!p.decays) p.decays = Array(p.steps).fill(100);
    if (!p.microtimings) p.microtimings = Array(p.steps).fill(0);

    const inst = instrumentsConfig[instIdx];

    // Migration: rf -> rg (rufada gauche rename)
    if (inst && inst.id === 'caixa') {
      for (let i = 0; i < p.steps; i++) {
        if (p.activeSteps[i] === 'rf') {
          p.activeSteps[i] = 'rg';
        }
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
  };

  // 3. User operations callbacks
  const handleTogglePlay = async () => {
    await Tone.start();
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
      // Stop ongoing voice synthesizers decay
      instrumentsConfig.forEach((inst) => {
        if (samplers[inst.id]) samplers[inst.id].stopAll();
        if (voiceSynths[inst.id]) voiceSynths[inst.id].triggerRelease();
      });
      setIsPlaying(false);
    }
  };

  const handleRewind = () => {
    mainLoop?.stop();
    Tone.Transport.stop();
    instrumentsConfig.forEach((inst) => {
      if (samplers[inst.id]) samplers[inst.id].stopAll();
      if (voiceSynths[inst.id]) voiceSynths[inst.id].triggerRelease();
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
      volumes: Array(defaultSteps).fill(100),
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
    if (!audioRecorder) {
      audioRecorder = new Tone.Recorder();
      Tone.Destination.connect(audioRecorder);
    }

    if (!isRecording) {
      audioRecorder.start();
      setIsRecording(true);
    } else {
      const clip = await audioRecorder.stop();
      setIsRecording(false);

      const url = URL.createObjectURL(clip);
      const downloadLink = document.createElement('a');
      downloadLink.download = 'BaqueMix_Gravacao.webm';
      downloadLink.href = url;
      downloadLink.click();
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
          const nextVols = Array(targetSteps).fill(100);
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

  const handleTrackStepVolumeChange = (trackId: number, patternId: number, stepIdx: number, val: number) => {
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId) {
              const copyVols = [...(p.volumes || Array(p.steps).fill(100))];
              copyVols[stepIdx] = val;
              return { ...p, volumes: copyVols };
            }
            return p;
          })
        };
      }
      return t;
    }));
  };

  const handleTrackStepDecayChange = (trackId: number, patternId: number, stepIdx: number, val: number) => {
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId) {
              const copyDecays = [...(p.decays || Array(p.steps).fill(100))];
              copyDecays[stepIdx] = val;
              return { ...p, decays: copyDecays };
            }
            return p;
          })
        };
      }
      return t;
    }));
  };

  const handleTrackStepMicrotimingChange = (trackId: number, patternId: number, stepIdx: number, val: number) => {
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId) {
              const copyMicros = [...(p.microtimings || Array(p.steps).fill(0))];
              copyMicros[stepIdx] = val;
              return { ...p, microtimings: copyMicros };
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
              const arrVols = Array(targetSteps).fill(100);
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
            if (cleanChar && cleanChar.trim() !== '') {
              if (inst.type === 'gongue') {
                if (cleanChar === 'G') parsed = 'GRV';
                else if (cleanChar === 'g') parsed = 'grv';
                else if (cleanChar === 'A') parsed = 'AIG';
                else if (cleanChar === 'a') parsed = 'aig';
                else if (cleanChar.toLowerCase() === 'b') parsed = 'b';
              } else if (inst.id === 'mineiro') {
                if (['P', 'T', 'p', 't'].includes(cleanChar)) parsed = cleanChar;
              } else if (inst.id === 'caixa') {
                const normVal = val.trim().toLowerCase();
                if (normVal === 'rd') parsed = 'rd';
                else if (normVal === 'rg') parsed = 'rg';
                else {
                  const lowerChar = cleanChar.toLowerCase();
                  if (lowerChar === 'r') parsed = 'rd';
                  else if (lowerChar === 'e') parsed = 'rg';
                  else if (lowerChar === 'x') parsed = 'x';
                  else if (lowerChar === 'f') parsed = 'f';
                  else if (lowerChar === 'b') parsed = 'b';
                  else if (['d', 'g'].includes(lowerChar)) {
                    parsed = cleanChar;
                  }
                }
              } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
                const lowerChar = cleanChar.toLowerCase();
                if (['b', 'x', 'i'].includes(lowerChar)) {
                  parsed = lowerChar;
                } else if (['d', 'g'].includes(lowerChar)) {
                  parsed = cleanChar;
                }
              } else if (inst.id === 'agbe') {
                const lowerChar = cleanChar.toLowerCase();
                if (['b', 's'].includes(lowerChar)) {
                  parsed = lowerChar;
                } else if (['d', 'g'].includes(lowerChar)) {
                  parsed = cleanChar;
                }
              } else {
                if (['D', 'G', 'd', 'g'].includes(cleanChar)) parsed = cleanChar;
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
            const syl = p.lyrics[i].trim();
            trackStr += `${syl.replace(/-/g, '')}${syl.endsWith('-') ? '' : ' '}`;
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
      metadata
    };
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
    const dlLink = document.createElement('a');
    dlLink.href = URL.createObjectURL(blob);
    dlLink.download = 'rythme_samambaia.json';
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
          if (mode === 'console') {
            setActiveRightPanel(null);
          }
        }}
        onUndo={handleUndo}
        canUndo={tracksHistory.length > 0}
      />

      {/* Main Workspace workspace containing expanding grids layouts */}
      <div id="main-workspace" className="flex flex-grow overflow-hidden relative w-full h-[calc(100vh-130px)] mobile-stack cordel-bg">
        {viewMode === 'roda' ? (
          <>
            {/* Left column tracks mixers */}
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
              onVoiceTypeToggle={handleVoiceTypeToggle}
              onVoiceSylChange={handleVoiceSylChange}
              onVoiceNoteChange={handleVoiceNoteChange}
              onVoiceNoteBlur={handleVoiceNoteBlur}
              isPlaying={isPlaying}
              currentStepIndex={currentStepIndex}
              maxTicks={getMaxTicks(timeSig)}
              timeSig={timeSig}
              isLeftPanelCollapsed={isLeftPanelCollapsed}
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
                      volumes: Array(p.steps).fill(100),
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
            />

            {/* Center circle visual canvas engine */}
            <CircleSequencer
              lang={lang}
              tracks={tracks}
              isPlaying={isPlaying}
              currentStepIndex={currentStepIndex}
              currentMeasure={measureCountRef.current % totalMeasures}
              maxTicks={getMaxTicks(timeSig)}
              totalMeasures={totalMeasures}
              onTogglePlay={handleTogglePlay}
              onStepChange={handleStepValueSelectAndToggle}
              langPromptVoiceText={t('promptVoice')}
              isMetroOn={isMetroOn}
              activePatternIdByInst={activePatternIdByInst}
              hitTriggersRef={hitTriggersRef}
            />
          </>
        ) : (
          <div className="flex-1 min-w-0 flex flex-col h-full overflow-x-auto overflow-y-hidden custom-scrollbar">
            <ConsoleMixer
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
              reverbType={reverbType}
              onReverbTypeChange={setReverbType}
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
                      volumes: Array(p.steps).fill(100),
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
            />
          </div>
        )}

        {/* Right drawer sidebar context panel */}
        <RightSidebar
          lang={lang}
          activePanel={activeRightPanel}
          onTogglePanel={(p) => setActiveRightPanel(activeRightPanel === p ? null : p)}
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
        />
      </div>
      
      <TransportBar
        lang={lang}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onRewind={handleRewind}
        isRecording={isRecording}
        onRecordToggle={handleAudioRecordingToggle}
        bpm={bpm}
        onBpmChange={setBpm}
        isMetroOn={isMetroOn}
        onMetroToggle={() => setIsMetroOn(!isMetroOn)}
        isSwingOn={isSwingOn}
        onSwingToggle={() => setIsSwingOn(!isSwingOn)}
        masterVol={masterVol}
        onMasterVolChange={(val) => setMasterVol(val)}
        timeSig={timeSig}
        onTimeSigChange={handleTimeSigChange}
        totalMeasures={totalMeasures}
        onTotalMeasuresChange={(val) => {
          setTotalMeasures(val);
          setTracks(tracks.map(t => ({
            ...t,
            patterns: t.patterns.map(p => ({
              ...p,
              measureAssignments: Array(val).fill(false).map((_, i) => p.measureAssignments[i] || false)
            }))
          })));
        }}
      />
    </div>
  );
}
