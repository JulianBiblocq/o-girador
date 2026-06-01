/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Circle, Language, Preset, TimeSignature } from './types';
import {
  instrumentsConfig,
  vouVadiarPreset,
  baqueDeImalePreset,
  getMarkers,
  getMaxTicks,
  i18n,
  ASSETS_BASE_URL,
} from './data';
import { Header } from './components/Header';
import { Mixer } from './components/Mixer';
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

export default function App() {
  const [lang, setLang] = useState<Language>('pt');
  const [bpm, setBpm] = useState<number>(83);
  const [masterVol, setMasterVol] = useState<number>(-6);
  const [timeSig, setTimeSig] = useState<TimeSignature>('4/4');
  const [isMetroOn, setIsMetroOn] = useState<boolean>(false);
  const [activePresetName, setActivePresetName] = useState<string>('vou-vadiar');
  const [circles, setCircles] = useState<Circle[]>([]);
  const [letras, setLetras] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  const [activeRightPanel, setActiveRightPanel] = useState<'legend' | 'letras' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSwingOn, setIsSwingOn] = useState<boolean>(false);

  // Measure counter tracks loops boundaries
  const measureCountRef = useRef<number>(0);
  const circlesRef = useRef<Circle[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const currentStepIndexRef = useRef<number>(-1);
  const maxTicksRef = useRef<number>(96);
  const isMetroOnRef = useRef<boolean>(false);
  const isSwingOnRef = useRef<boolean>(false);

  // Synchronization with refs to have lag-free values inside Tone.js loop
  useEffect(() => {
    circlesRef.current = circles;
    isPlayingRef.current = isPlaying;
    currentStepIndexRef.current = currentStepIndex;
    maxTicksRef.current = getMaxTicks(timeSig);
    isMetroOnRef.current = isMetroOn;
    isSwingOnRef.current = isSwingOn;
  }, [circles, isPlaying, currentStepIndex, timeSig, isMetroOn, isSwingOn]);

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

      const totalAudioCount = instrumentsConfig.filter((i) => i.type !== 'voice').length;

      instrumentsConfig.forEach((inst) => {
        channels[inst.id] = new Tone.Channel({ volume: 0 }).toDestination();
        meters[inst.id] = new Tone.Meter();
        channels[inst.id].connect(meters[inst.id]);

        if (inst.type === 'voice') {
          voiceSynths[inst.id] = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.05, decay: 0.2 },
            volume: -10,
          }).connect(channels[inst.id]);
        } else {
          const urls =
            inst.type === 'gongue'
              ? {
                  'faible-grave': 'faible-grave.wav',
                  'fort-grave': 'fort-grave.wav',
                  'faible-aigue': 'faible-aigue.wav',
                  'fort-aigue': 'fort-aigue.wav',
                }
              : { faible: 'faible.wav', fort: 'fort.wav' };

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
        // --- SWING MARACATU ---
        // In 4/4 with 16 steps (96 ticks), each step = 6 ticks.
        // Maracatu swing offsets (as fraction of one step duration in seconds):
        //   step pos 0 (beat 1): on time
        //   step pos 1 (& of 1): delay +15%
        //   step pos 2 (beat 2): on time
        //   step pos 3 (& of 2): advance -10%
        // Pattern repeats every 4 steps.
        let swingOffset = 0;
        if (isSwingOnRef.current) {
          const stepDurationSec = Tone.Time('96n').toSeconds() * 6; // one 16th note
          const posInBeat = ((stepIdx / (currentTicks / 4)) % 1) * 4; // 0-3 within a beat group of 4 steps
          const posInGroup = Math.round(posInBeat) % 4;
          if (posInGroup === 1) swingOffset = stepDurationSec * 0.15;   // slightly late
          else if (posInGroup === 3) swingOffset = -stepDurationSec * 0.10; // slightly early
        }
        const swingTime = time + swingOffset;

        const hasSolo = circlesRef.current.some((c) => c.isSolo);
        circlesRef.current.forEach((circle) => {
          const canPlay = hasSolo ? circle.isSolo : !circle.isMute;
          if (!canPlay) return;

          const inst = instrumentsConfig[circle.instrumentIdx];

          // Compute active cycle group routing if multiple presets instances are mapped
          const activeId = getActiveCircleIdForInstrument(circle.instrumentIdx);
          if (circle.id !== activeId) return;

          const stepCount = circle.steps;
          const circleStepIdx = Math.floor((stepIdx / currentTicks) * stepCount);
          const expectedTick = Math.floor((circleStepIdx * currentTicks) / stepCount);

          if (stepIdx === expectedTick) {
            const state = circle.activeSteps[circleStepIdx];
            if (state !== 0) {
              // Convert 0-100 volume slider gain directly to playback dB trigger dynamically
              const volDb = Tone.gainToDb(circle.volumeVal / 100);

              if (inst.type === 'voice') {
                let note = 'C5';
                if (
                  circle.notes &&
                  circle.notes[circleStepIdx] &&
                  circle.notes[circleStepIdx].trim() !== ''
                ) {
                  note = circle.notes[circleStepIdx];
                } else if (state === 'P') {
                  note = 'E5';
                }

                try {
                  const synth = voiceSynths[inst.id];
                  if (synth) {
                    synth.volume.value = volDb - 10;
                    synth.triggerAttackRelease(note, '8n', swingTime);
                  }
                } catch (err) {
                  voiceSynths[inst.id]?.triggerAttackRelease('C5', '8n', swingTime);
                }
              } else if (samplers[inst.id]) {
                const playerGroup = samplers[inst.id];
                let targetKey: string | null = null;

                if (inst.type === 'gongue') {
                  if (state === 'GRV') targetKey = 'fort-grave';
                  else if (state === 'grv') targetKey = 'faible-grave';
                  else if (state === 'AIG') targetKey = 'fort-aigue';
                  else if (state === 'aig') targetKey = 'faible-aigue';
                } else {
                  if (['D', 'G', 'P', 'T'].includes(state as string)) targetKey = 'fort';
                  else if (['d', 'g', 'p', 't'].includes(state as string)) targetKey = 'faible';
                }

                if (targetKey && playerGroup.has(targetKey)) {
                  try {
                    const player = playerGroup.player(targetKey);
                    if (player.loaded) {
                      player.volume.value = volDb;
                      player.start(swingTime);
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

  // 2. Load Preset samambaia state initially
  useEffect(() => {
    loadFallbackPreset('vou-vadiar');
  }, []);

  // Sync levels display bar via non-re-rendering dynamic canvas interval
  useEffect(() => {
    const updateLocalMenders = () => {
      const dbToPercent = (db: number) => {
        if (db < -50) return 0;
        if (db > 0) return 100;
        return Math.floor(((db + 50) / 50) * 100);
      };

      circlesRef.current.forEach((c) => {
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

  // Keybindings listener: Spacebar toggles Play/Pause
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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Dynamic layout radial positioning offsets
  const updateRadii = (list: Circle[]) => {
    if (list.length === 0) return;
    const minRadius = 120;
    const maxRadius = 495;

    if (list.length === 1) {
      list[0].radius = (minRadius + maxRadius) / 2;
    } else {
      const gap = (maxRadius - minRadius) / (list.length - 1);
      list.forEach((c, idx) => {
        c.radius = minRadius + idx * gap;
      });
    }
  };

  const getActiveCircleIdForInstrument = (instIdx: number) => {
    const group = circlesRef.current.filter((c) => c.instrumentIdx === instIdx);
    if (group.length === 0) return null;
    if (group.length === 1) return group[0].id;

    // Sum overall measures weights
    const sumRepeats = group.reduce((sum, c) => sum + (parseInt(c.repeats as any) || 1), 0);
    if (sumRepeats <= 0) return group[0].id;

    const cursor = measureCountRef.current % sumRepeats;
    let runValue = 0;
    for (const c of group) {
      runValue += parseInt(c.repeats as any) || 1;
      if (cursor < runValue) {
        return c.id;
      }
    }
    return group[0].id;
  };

  const loadFallbackPreset = (name: string) => {
    const p = name === 'baque-de-imale' ? baqueDeImalePreset : vouVadiarPreset;
    setCircles([]);
    setLetras('');

    const copy: Circle[] = JSON.parse(JSON.stringify(p.circles));
    copy.forEach((c) => normalizeCircleData(c));
    updateRadii(copy);

    setCircles(copy);
    setBpm(Math.round(p.bpm));
    setTimeSig(p.timeSig);
    measureCountRef.current = 0;
  };

  const normalizeCircleData = (c: Circle) => {
    if (c.repeats === undefined) c.repeats = 1;
    if (!c.notes) c.notes = Array(c.steps).fill('');
    if (!c.lyrics) c.lyrics = Array(c.steps).fill('');
    if (!c.activeSteps) c.activeSteps = Array(c.steps).fill(0);

    const inst = instrumentsConfig[c.instrumentIdx];
    if (inst && inst.type === 'voice') {
      for (let i = 0; i < c.steps; i++) {
        const stepState = c.activeSteps[i];
        if (stepState !== 0 && stepState !== 'P' && stepState !== 'C' && stepState !== 'X') {
          c.notes[i] = String(stepState);
          c.activeSteps[i] = 'C';
        } else if (stepState === 'X') {
          c.activeSteps[i] = 'C';
        }
      }
    }
  };

  // 3. User operations callbacks
  const handleTogglePlay = async () => {
    await Tone.start();
    if (!isPlaying) {
      mainLoop?.start(0);
      Tone.Transport.start();
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

  const handleAddCircleInstrument = (instIdx: number) => {
    if (circles.length >= 20) {
      window.alert(t('limitReached'));
      return;
    }

    let defaultSteps = 16;
    if (timeSig === '3/4' || timeSig === '6/8') defaultSteps = 12;
    if (timeSig === '2/4') defaultSteps = 8;
    if (timeSig === '12/8') defaultSteps = 24;

    const newCircle: Circle = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      steps: defaultSteps,
      repeats: 1,
      activeSteps: Array(defaultSteps).fill(0),
      instrumentIdx: instIdx,
      lyrics: Array(defaultSteps).fill(''),
      notes: Array(defaultSteps).fill(''),
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 100,
    };

    const updated = [...circles, newCircle];
    updateRadii(updated);
    setCircles(updated);
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
      const resizedList = circles.map((c) => {
        const nextStepsArr = Array(targetSteps).fill(0);
        const nextLyrics = Array(targetSteps).fill('');
        const nextNotes = Array(targetSteps).fill('');

        for (let idx = 0; idx < Math.min(targetSteps, c.steps); idx++) {
          nextStepsArr[idx] = c.activeSteps[idx];
          nextLyrics[idx] = c.lyrics?.[idx] || '';
          nextNotes[idx] = c.notes?.[idx] || '';
        }

        return {
          ...c,
          steps: targetSteps,
          activeSteps: nextStepsArr,
          lyrics: nextLyrics,
          notes: nextNotes,
        };
      });
      setCircles(resizedList);
    }
  };

  // Local tracks updates
  const handleTrackMoveUp = (id: number) => {
    const idx = circles.findIndex((c) => c.id === id);
    if (idx > 0) {
      const copy = [...circles];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      updateRadii(copy);
      setCircles(copy);
    }
  };

  const handleTrackMoveDown = (id: number) => {
    const idx = circles.findIndex((c) => c.id === id);
    if (idx > -1 && idx < circles.length - 1) {
      const copy = [...circles];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      updateRadii(copy);
      setCircles(copy);
    }
  };

  const handleTrackInstrumentIdxChange = (id: number, targetInstIdx: number) => {
    const updated = circles.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          instrumentIdx: targetInstIdx,
          activeSteps: Array(c.steps).fill(0),
          lyrics: Array(c.steps).fill(''),
          notes: Array(c.steps).fill(''),
        };
      }
      return c;
    });
    setCircles(updated);
  };

  const handleTrackMuteToggle = (id: number) => {
    setCircles(circles.map((c) => (c.id === id ? { ...c, isMute: !c.isMute } : c)));
  };

  const handleTrackSoloToggle = (id: number) => {
    setCircles(circles.map((c) => (c.id === id ? { ...c, isSolo: !c.isSolo } : c)));
  };

  const handleTrackHideToggle = (id: number) => {
    setCircles(circles.map((c) => (c.id === id ? { ...c, isHidden: !c.isHidden } : c)));
  };

  const handleTrackDelete = (id: number) => {
    const remaining = circles.filter((c) => c.id !== id);
    updateRadii(remaining);
    setCircles(remaining);
  };

  const handleTrackVolumeChange = (id: number, val: number) => {
    setCircles(circles.map((c) => (c.id === id ? { ...c, volumeVal: val } : c)));
  };

  const handleTrackStepsChange = (id: number, targetSteps: number) => {
    setCircles(
      circles.map((c) => {
        if (c.id === id) {
          const arrSteps = Array(targetSteps).fill(0);
          const arrLyrics = Array(targetSteps).fill('');
          const arrNotes = Array(targetSteps).fill('');

          for (let i = 0; i < Math.min(targetSteps, c.steps); i++) {
            arrSteps[i] = c.activeSteps[i];
            arrLyrics[i] = c.lyrics?.[i] || '';
            arrNotes[i] = c.notes?.[i] || '';
          }

          return {
            ...c,
            steps: targetSteps,
            activeSteps: arrSteps,
            lyrics: arrLyrics,
            notes: arrNotes,
          };
        }
        return c;
      })
    );
  };

  const handleTrackRepeatsChange = (id: number, val: number) => {
    setCircles(circles.map((c) => (c.id === id ? { ...c, repeats: val } : c)));
  };

  // Text values key bindings helpers for traditional grid steps
  const handleTrackStepValueChange = (circleId: number, stepIdx: number, val: string) => {
    const cleanChar = val.slice(-1);
    const updated = circles.map((c) => {
      if (c.id === circleId) {
        const copySteps = [...c.activeSteps];
        const inst = instrumentsConfig[c.instrumentIdx];
        let parsed: string | number = 0;

        if (cleanChar && cleanChar.trim() !== '') {
          if (inst.type === 'gongue') {
            if (cleanChar === 'G') parsed = 'GRV';
            else if (cleanChar === 'g') parsed = 'grv';
            else if (cleanChar === 'A') parsed = 'AIG';
            else if (cleanChar === 'a') parsed = 'aig';
          } else if (inst.id === 'mineiro') {
            if (['P', 'T', 'p', 't'].includes(cleanChar)) parsed = cleanChar;
          } else {
            if (['D', 'G', 'd', 'g'].includes(cleanChar)) parsed = cleanChar;
          }
        }

        copySteps[stepIdx] = parsed;
        return {
          ...c,
          activeSteps: copySteps,
        };
      }
      return c;
    });
    setCircles(updated);
  };

  const handleTrackStepKeyDown = (
    circleId: number,
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
      ['d', 'D', 'g', 'G', 'p', 'P', 't', 'T', 'a', 'A'].includes(key) &&
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
  const handleVoiceTypeToggle = (circleId: number, stepIdx: number) => {
    setCircles(
      circles.map((c) => {
        if (c.id === circleId) {
          const copySteps = [...c.activeSteps];
          if (copySteps[stepIdx] === 0) return c;
          copySteps[stepIdx] = copySteps[stepIdx] === 'P' ? 'C' : 'P';
          return {
            ...c,
            activeSteps: copySteps,
          };
        }
        return c;
      })
    );
  };

  const handleVoiceSylChange = (circleId: number, stepIdx: number, val: string) => {
    setCircles(
      circles.map((c) => {
        if (c.id === circleId) {
          const copySteps = [...c.activeSteps];
          const arrLyrics = [...(c.lyrics || Array(c.steps).fill(''))];
          const arrNotes = [...(c.notes || Array(c.steps).fill(''))];

          arrLyrics[stepIdx] = val;

          if (val.trim() !== '') {
            if (copySteps[stepIdx] === 0) {
              copySteps[stepIdx] = 'C';
              if (!arrNotes[stepIdx]) arrNotes[stepIdx] = 'C4';
            }
          } else {
            copySteps[stepIdx] = 0;
          }

          return {
            ...c,
            activeSteps: copySteps,
            lyrics: arrLyrics,
            notes: arrNotes,
          };
        }
        return c;
      })
    );
  };

  const handleVoiceNoteChange = (circleId: number, stepIdx: number, val: string) => {
    setCircles(
      circles.map((c) => {
        if (c.id === circleId) {
          const arrNotes = [...(c.notes || Array(c.steps).fill(''))];
          arrNotes[stepIdx] = val;
          return {
            ...c,
            notes: arrNotes,
          };
        }
        return c;
      })
    );
  };

  const handleVoiceNoteBlur = (circleId: number, stepIdx: number, val: string) => {
    const trimmed = val.trim();
    if (trimmed.length === 1 || (trimmed.length === 2 && (trimmed.includes('#') || trimmed.includes('b')))) {
      if (/^[a-gA-G][#b]?$/.test(trimmed)) {
        const completedNote = trimmed.toUpperCase() + '4';
        setCircles(
          circles.map((c) => {
            if (c.id === circleId) {
              const arrNotes = [...(c.notes || Array(c.steps).fill(''))];
              arrNotes[stepIdx] = completedNote;
              return {
                ...c,
                notes: arrNotes,
              };
            }
            return c;
          })
        );
      }
    }
  };

  // Interactive syllables trigger extraction formatting
  const handleExtractLyrics = () => {
    const voiceCircles = circles.filter(
      (c) => instrumentsConfig[c.instrumentIdx].type === 'voice'
    );
    const htmlArr: string[] = [];

    voiceCircles.forEach((c) => {
      let trackStr = '';
      for (let i = 0; i < c.steps; i++) {
        if (c.activeSteps[i] !== 0 && c.lyrics[i]) {
          const syl = c.lyrics[i].trim();
          trackStr += `${syl.replace(/-/g, '')}${syl.endsWith('-') ? '' : ' '}`;
        }
      }
      if (trackStr) {
        htmlArr.push(trackStr.trim());
      }
    });

    setLetras(htmlArr.join('\n\n'));
  };

  // Master Save Preset state down to local downloadable JSON
  const handleSaveState = () => {
    const stateObj = {
      bpm,
      timeSig,
      letras,
      circles,
    };
    const blob = new Blob([JSON.stringify(stateObj, null, 2)], { type: 'application/json' });
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
        if (data.circles) {
          const list = data.circles;
          list.forEach((c: Circle) => normalizeCircleData(c));
          updateRadii(list);
          setCircles(list);
        }
      } catch (err) {
        window.alert(t('invalidFile'));
      }
    };
    reader.readAsText(file);
  };

  const handleStepValueSelectAndToggle = (
    circleId: number,
    stepIdx: number,
    newState: string | number,
    optLyric?: string,
    optNote?: string
  ) => {
    setCircles(
      circles.map((c) => {
        if (c.id === circleId) {
          const arrSteps = [...c.activeSteps];
          arrSteps[stepIdx] = newState;

          const arrLyrics = [...(c.lyrics || Array(c.steps).fill(''))];
          const arrNotes = [...(c.notes || Array(c.steps).fill(''))];

          if (optLyric !== undefined) arrLyrics[stepIdx] = optLyric;
          if (optNote !== undefined) arrNotes[stepIdx] = optNote;

          return {
            ...c,
            activeSteps: arrSteps,
            lyrics: arrLyrics,
            notes: arrNotes,
          };
        }
        return c;
      })
    );
  };

  const activeCircleIdByInst: { [instIdx: number]: number | null } = {};
  circles.forEach(c => {
    if (activeCircleIdByInst[c.instrumentIdx] === undefined) {
      activeCircleIdByInst[c.instrumentIdx] = getActiveCircleIdForInstrument(c.instrumentIdx);
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
        bpm={bpm}
        onBpmChange={(val) => setBpm(val)}
        masterVol={masterVol}
        onMasterVolChange={(val) => setMasterVol(val)}
        timeSig={timeSig}
        onTimeSigChange={handleTimeSigChange}
        isMetroOn={isMetroOn}
        onMetroToggle={() => setIsMetroOn(!isMetroOn)}
        isSwingOn={isSwingOn}
        onSwingToggle={() => setIsSwingOn(!isSwingOn)}
        onRewind={handleRewind}
        preset={activePresetName}
        onPresetChange={handlePresetSelect}
        isRecording={isRecording}
        onRecordToggle={handleAudioRecordingToggle}
        onClear={() => {
          setCircles([]);
          setLetras('');
        }}
        onSave={handleSaveState}
        onLoad={handleLoadState}
        onAddInstrument={handleAddCircleInstrument}
        activeRightPanel={activeRightPanel}
        onToggleRightPanel={(p) => setActiveRightPanel(activeRightPanel === p ? null : p)}
        isLeftPanelCollapsed={isLeftPanelCollapsed}
        onToggleLeftPanel={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
      />

      {/* Main Workspace workspace containing expanding grids layouts */}
      <div id="main-workspace" className="flex flex-grow overflow-hidden relative w-full h-[calc(100vh-70px)] mobile-stack">
        {/* Left column tracks mixers */}
        <Mixer
          lang={lang}
          circles={circles}
          onMoveUp={handleTrackMoveUp}
          onMoveDown={handleTrackMoveDown}
          onInstrumentChange={handleTrackInstrumentIdxChange}
          onMuteToggle={handleTrackMuteToggle}
          onSoloToggle={handleTrackSoloToggle}
          onHideToggle={handleTrackHideToggle}
          onDelete={handleTrackDelete}
          onVolumeChange={handleTrackVolumeChange}
          onStepsChange={handleTrackStepsChange}
          onRepeatsChange={handleTrackRepeatsChange}
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
        />

        {/* Center circle visual canvas engine */}
        <CircleSequencer
          lang={lang}
          circles={circles}
          isPlaying={isPlaying}
          currentStepIndex={currentStepIndex}
          maxTicks={getMaxTicks(timeSig)}
          onTogglePlay={handleTogglePlay}
          onStepChange={handleStepValueSelectAndToggle}
          langPromptVoiceText={t('promptVoice')}
          isMetroOn={isMetroOn}
          activeCircleIdByInst={activeCircleIdByInst}
        />

        {/* Right drawer sidebar context panel */}
        <RightSidebar
          lang={lang}
          activePanel={activeRightPanel}
          onTogglePanel={(p) => setActiveRightPanel(activeRightPanel === p ? null : p)}
          circles={circles}
          letrasValue={letras}
          onLetrasChange={(val) => setLetras(val)}
          onExtractLyrics={handleExtractLyrics}
          currentPlayState={isPlaying ? {
            stepIndex: currentStepIndex,
            maxTicks: getMaxTicks(timeSig),
            activeCircleIdByInst,
          } : null}
        />
      </div>
    </div>
  );
}
