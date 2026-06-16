/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import LZString from 'lz-string';
import * as Tone from 'tone';
import { Circle, TrackGroup, Pattern, Language, Preset, TimeSignature, PresetMetadata, HitTrigger, SongSection, RhythmSignal } from './types';
import { migrateCirclesToTracks } from './migration';
import {
  instrumentsConfig,
  vouVadiarPreset,
  baqueDeImalePreset,
  getMarkers,
  getMaxTicks,
  i18n,
  ASSETS_BASE_URL,
  getVisualStrokeSymbol,
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
import { AudioEngine } from './AudioEngine';
import { InputManager } from './InputManager';
import { instrumentAudioConfigs } from './data/audioConfig';
import { QuizEngine } from './components/QuizEngine';
import { DicteeEngine } from './components/DicteeEngine';
import { InspecteurEngine } from './components/InspecteurEngine';
import { MestreEngine } from './components/MestreEngine';
import { RythmeLiveEngine } from './components/RythmeLiveEngine';
import { VaralCordel } from './components/VaralCordel';
import { MestreStudio } from './components/MestreStudio';

// Module scope audio engines to avoid duplicate instantiations on React re-renders
let bMetroClick: Tone.Synth | null = null;
const channels: { [id: string]: Tone.Channel } = {};
const meters: { [id: string]: Tone.Meter } = {};
const voiceSynths: { [id: string]: any } = {};
let audioEngine: AudioEngine | null = null;
let inputManager: InputManager | null = null;

let wavRecordingBuffersL: Float32Array[] = [];
let wavRecordingBuffersR: Float32Array[] = [];
let scriptProcessorNode: ScriptProcessorNode | null = null;
let reverbNode: Tone.Reverb | null = null;
const reverbSends: { [id: string]: Tone.Gain } = {};
let masterVolumeNode: Tone.Gain | null = null;
let masterMeterNode: Tone.Meter | null = null;
let masterEQNode: Tone.EQ3 | null = null;
let masterCompressorNode: Tone.Compressor | null = null;

const VOCAL_RECORDING_ARM_DELAY_MS = 300;
const VOCAL_RECORDING_ARM_DELAY_SEC = 0.3;

// ─── Cache et Pool de Performance ───────────────────────────────────────────
const RANDOM_POOL_SIZE = 1000;
const randomPool = Array.from({ length: RANDOM_POOL_SIZE }, () => Math.random());
let randomPoolIdx = 0;

function nextRandom(): number {
  const val = randomPool[randomPoolIdx];
  randomPoolIdx = (randomPoolIdx + 1) % RANDOM_POOL_SIZE;
  return val;
}

const markersCache = new Map<string, number[]>();
function getCachedMarkers(timeSig: string, ticks: number): number[] {
  const key = `${timeSig}_${ticks}`;
  if (!markersCache.has(key)) {
    markersCache.set(key, getMarkers(timeSig as any, ticks));
  }
  return markersCache.get(key)!;
}

// ─── Pré-compilation du séquenceur ───────────────────────────────────────────
// Plutôt que de faire forEach/find à chaque tick (133x/sec), on pre-compiles
// toutes les notes à jouer dans une Map (measureIdx → tickIdx → notes[]).
// La boucle AudioEngine ne fait alors qu'un accès O(1) — le thread audio n'est plus
// chargé par les calculs React.
interface ScheduledNote {
  instId: string;
  playerKey: string;
  baseGain: number;           // trackVol * 1 (stepVol applied at trigger)
  stepVolMultiplier: number;  // activeSteps volume per step
  stepDecayMultiplier: number;
  isStrong: boolean;
  microtimingPct: number;     // -100..+100, applied relative to tick96nSec
  stepsPerMeasure: number;    // needed for microOffset calc
  trackId: number;
  circleStepIdx: number;
  state: any;
}


function buildTickSchedule(
  tracks: any[],
  totalMeasures: number,
  measureTimeSigs: string[],
  instConfig: any[],
  soloPatternPlayId: number | null
): Map<number, Map<number, ScheduledNote[]>> {
  const schedule = new Map<number, Map<number, ScheduledNote[]>>();
  const hasSolo = tracks.some((t: any) => t.isSolo);
  const isSoloPlayActive = soloPatternPlayId !== null;

  for (let measureIdx = 0; measureIdx < totalMeasures; measureIdx++) {
    const timeSig = measureTimeSigs[measureIdx] || '4/4';
    // getMaxTicks is defined inside App component — duplicate inline for module-level access
    const parts = timeSig.split('/');
    const beats = parseInt(parts[0], 10);
    const beatUnit = parseInt(parts[1], 10);
    const maxTicks = beats * (96 / beatUnit);
    const measureMap = new Map<number, ScheduledNote[]>();

    tracks.forEach((track: any) => {
      const inst = instConfig[track.instrumentIdx];
      if (!inst || inst.type === 'voice') return; // voice handled separately in loop

      let activePattern: any = null;
      let canPlay = false;

      if (isSoloPlayActive) {
        const isTargetSoloTrack = track.patterns.some((p: any) => p.id === soloPatternPlayId);
        if (isTargetSoloTrack) {
          activePattern = track.patterns.find((p: any) => p.id === soloPatternPlayId);
          canPlay = true;
        }
      } else {
        activePattern = track.patterns.find((p: any) => p.measureAssignments[measureIdx]);
        canPlay = hasSolo ? track.isSolo : !track.isMute;
      }

      if (!activePattern || !canPlay) return;

      const stepCount = activePattern.steps;

      for (let step = 0; step < stepCount; step++) {
        const state = activePattern.activeSteps[step];
        if (!state || state === 0) continue;

        // Which 96th-note tick does this step land on?
        const tickIdx = Math.floor((step * maxTicks) / stepCount);

        // Resolve player key
        let targetKey: string | null = typeof state === 'string' ? state : String(state);
        let isStrong = false;

        if (inst.type === 'gongue') {
          if (state === 'G' || state === 'A') { isStrong = true; }
        } else if (inst.id === 'caixa') {
          if (['D', 'E', 'Q', 'R', 'r', 'X', 'F', 'C'].includes(state)) { isStrong = true; }
        } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
          if (['D', 'E', 'Q', 'X', 'I', 'C'].includes(state)) { isStrong = true; }
        } else if (inst.id === 'tarol') {
          if (['D', 'E', 'Q', 'R', 'r', 'X', 'F', 'C'].includes(state)) { isStrong = true; }
        } else if (inst.id === 'agbe') {
          if (['D', 'E', 'S'].includes(state)) { isStrong = true; }
        } else {
          if (['D', 'E', 'P', 'T'].includes(state as string)) { isStrong = true; }
        }

        if (!targetKey) continue;

        const stepVolMultiplier = (activePattern.volumes?.[step] ?? 80) / 100;
        const stepDecayMultiplier = (activePattern.decays?.[step] ?? 100) / 100;
        const microtimingPct = activePattern.microtimings?.[step] ?? 0;

        if (!measureMap.has(tickIdx)) measureMap.set(tickIdx, []);
        measureMap.get(tickIdx)!.push({
          instId: inst.id,
          playerKey: targetKey,
          baseGain: 1.0,
          stepVolMultiplier,
          stepDecayMultiplier,
          isStrong,
          microtimingPct,
          stepsPerMeasure: stepCount,
          trackId: track.id,
          circleStepIdx: step,
          state,
        });
      }
    });

    schedule.set(measureIdx, measureMap);
  }
  return schedule;
}
// ─────────────────────────────────────────────────────────────────────────────

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

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function App() {
  const CURRENT_VERSION = "2.2"; // Matches version.json

  const [lang, setLang] = useState<Language>('pt');
  const [bpm, setBpm] = useState<number>(83);
  const [masterVol, setMasterVol] = useState<number>(-6);
  const [masterEQ, setMasterEQ] = useState<{ low: number; mid: number; high: number }>({ low: 0, mid: 0, high: 0 });
  const [masterCompressor, setMasterCompressor] = useState<{ threshold: number; ratio: number }>({ threshold: -20, ratio: 4 });
  const [timeSig, setTimeSig] = useState<TimeSignature>('4/4');
  const [isMetroOn, setIsMetroOn] = useState<boolean>(false);
  const [whistleVol, setWhistleVol] = useState<number>(() => {
    return Number(localStorage.getItem('baquemix_whistle_vol') ?? '60');
  });
  const [activePresetName, setActivePresetName] = useState<string>('');
  const [presetFiles, setPresetFiles] = useState<string[]>([]);
  const [tracks, setTracks] = useState<TrackGroup[]>([]);
  const [isLeftHanded, setIsLeftHanded] = useState<boolean>(() => localStorage.getItem('baquemix_left_handed') === 'true');
  const [activeKeyboardInstrumentId, setActiveKeyboardInstrumentId] = useState<string | null>(null);

  // Sync left-handed preference
  useEffect(() => {
    localStorage.setItem('baquemix_left_handed', String(isLeftHanded));
    if (inputManager) {
      inputManager.setLeftHanded(isLeftHanded);
    }
  }, [isLeftHanded]);

  // Sync active instrument to InputManager
  useEffect(() => {
    if (inputManager) {
      inputManager.setActiveInstrument(activeKeyboardInstrumentId);
    }
  }, [activeKeyboardInstrumentId]);

  // Default active keyboard instrument if none is selected
  useEffect(() => {
    if (tracks.length > 0 && !activeKeyboardInstrumentId) {
      const firstNonVoice = tracks.find(t => instrumentsConfig[t.instrumentIdx] && instrumentsConfig[t.instrumentIdx].type !== 'voice');
      if (firstNonVoice) {
        setActiveKeyboardInstrumentId(instrumentsConfig[firstNonVoice.instrumentIdx].id);
      } else {
        setActiveKeyboardInstrumentId(instrumentsConfig[tracks[0].instrumentIdx].id);
      }
    }
  }, [tracks, activeKeyboardInstrumentId]);
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
  const [viewMode, setViewMode] = useState<'roda' | 'console' | 'timeline' | 'quiz' | 'dictee' | 'inspecteur' | 'mestre' | 'rythmelive' | 'varal' | 'studio'>('roda');
  const [unlockedFolhetos, setUnlockedFolhetos] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('baquemix-unlocked-folhetos');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [justUnlockedBookletId, setJustUnlockedBookletId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('baquemix-unlocked-folhetos', JSON.stringify(unlockedFolhetos));
  }, [unlockedFolhetos]);

  const unlockBooklet = (id: string) => {
    setUnlockedFolhetos((prev) => {
      if (prev.includes(id)) return prev;
      // Newly unlocked!
      setJustUnlockedBookletId(id);
      setViewMode('varal');
      return [...prev, id];
    });
  };

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('baquemix-theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
    const mediaLight = window.matchMedia('(prefers-color-scheme: light)');
    if (mediaDark.matches) return true;
    if (mediaLight.matches) return false;
    return true; // default to true
  });
  const [localPresets, setLocalPresets] = useState<string[]>([]);
  
  // Custom non-blocking modal overlay state (replaces window.alert, window.confirm, window.prompt)
  const [customDialog, setCustomDialog] = useState<{
    type: 'alert' | 'confirm' | 'prompt';
    message: string;
    defaultValue?: string;
    onResolve: (value: any) => void;
  } | null>(null);

  const alertAsync = (message: string): Promise<void> => {
    return new Promise((resolve) => {
      setCustomDialog({ type: 'alert', message, onResolve: resolve });
    });
  };

  const confirmAsync = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setCustomDialog({ type: 'confirm', message, onResolve: resolve });
    });
  };

  const promptAsync = (message: string, defaultValue = ''): Promise<string | null> => {
    return new Promise((resolve) => {
      setCustomDialog({ type: 'prompt', message, defaultValue, onResolve: resolve });
    });
  };

  // A2HS Deferred Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Capture beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the A2HS prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  // Helper for unified app updates (clean SW + clean caches + reload)
  const handleAppUpdate = async (reg: ServiceWorkerRegistration) => {
    const shouldUpdate = await confirmAsync(
      lang === 'fr' 
        ? "Une nouvelle version de BaqueMix est disponible. Recharger pour mettre à jour ?"
        : "Uma nova versão do BaqueMix está disponível. Recarregar para atualizar ?"
    );
    if (shouldUpdate) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      // Clear caches
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          for (const key of keys) {
            await caches.delete(key);
          }
        }
      } catch (err) {
        console.warn('Error clearing caches:', err);
      }

      // Trigger skipWaiting on the waiting worker
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        // Fallback if no waiting worker, unregister all SWs and reload
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        } catch (err) {
          console.warn('Error unregistering service workers:', err);
        }
        window.location.reload();
      }
    }
  };

  // Listen for the custom service worker update event
  useEffect(() => {
    const handleSWUpdateEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ServiceWorkerRegistration>;
      handleAppUpdate(customEvent.detail);
    };
    window.addEventListener('sw-update-available', handleSWUpdateEvent);
    return () => {
      window.removeEventListener('sw-update-available', handleSWUpdateEvent);
    };
  }, [lang, confirmAsync]);

  // Secure version.json check to prevent reload loops
  useEffect(() => {
    const checkVersion = async () => {
      if (!navigator.onLine) {
        console.log('Offline: skipping version.json update check.');
        return;
      }
      try {
        const response = await fetch(
          `${window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/'}version.json?t=${Date.now()}`
        );
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data && typeof data === 'object' && 'version' in data) {
              const latestVersion = String(data.version);
              
              if (latestVersion && latestVersion !== "undefined" && latestVersion !== CURRENT_VERSION) {
                console.log(`New version detected via version.json: ${latestVersion}. Prompting user...`);
                
                const shouldUpdate = await confirmAsync(
                  lang === 'fr' 
                    ? "Une nouvelle version de BaqueMix est disponible. Recharger pour mettre à jour ?"
                    : "Uma nova versão do BaqueMix está disponível. Recarregar para atualizar ?"
                );
                
                if (shouldUpdate) {
                  let refreshing = false;
                  navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                      refreshing = true;
                      window.location.reload();
                    }
                  });

                  // Clear caches
                  try {
                    if ('caches' in window) {
                      const keys = await caches.keys();
                      for (const key of keys) {
                        await caches.delete(key);
                      }
                    }
                  } catch (err) {
                    console.warn('Error clearing caches:', err);
                  }

                  // Unregister service workers so new version loads cleanly
                  try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                      await registration.unregister();
                    }
                  } catch (err) {
                    console.warn('Error unregistering service workers:', err);
                  }
                  
                  window.location.reload();
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('version.json update check failed:', err);
      }
    };
    
    // Delay check slightly to not block initial loading metrics
    const timer = setTimeout(checkVersion, 3000);
    return () => clearTimeout(timer);
  }, [lang, confirmAsync]);

  // Prevent context menus on faders, sliders and images to avoid touch screen copy/share popup interference
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target && (
          target.tagName === 'IMG' || 
          (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range') ||
          target.classList.contains('vertical-fader') ||
          target.closest('.vertical-fader')
        )
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const [tracksHistory, setTracksHistory] = useState<TrackGroup[][]>([]);
  const tracksHistoryRef = useRef<TrackGroup[][]>([]);
  const [tracksRedoHistory, setTracksRedoHistory] = useState<TrackGroup[][]>([]);
  const tracksRedoHistoryRef = useRef<TrackGroup[][]>([]);
  const [songStructureRedoHistory, setSongStructureRedoHistory] = useState<{
    measureTimeSigs: TimeSignature[];
    measureBpms: number[];
    measureBpmTransitions: ('immediate' | 'ramp')[];
    measureVols: number[];
    measureVolTransitions: ('immediate' | 'ramp')[];
    songSections?: SongSection[];
  }[]>([]);
  const songStructureRedoHistoryRef = useRef<{
    measureTimeSigs: TimeSignature[];
    measureBpms: number[];
    measureBpmTransitions: ('immediate' | 'ramp')[];
    measureVols: number[];
    measureVolTransitions: ('immediate' | 'ramp')[];
    songSections?: SongSection[];
  }[]>([]);
  const [reverbType, setReverbType] = useState<'room' | 'studio' | 'hall'>('studio');
  const [touchSelector, setTouchSelector] = useState<TouchSelectorState | null>(null);
  const [hoveredStroke, setHoveredStroke] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'roda' | 'mixer' | 'toada'>('roda');
  const [copiedPattern, setCopiedPattern] = useState<Pattern | null>(null);
  const [songSections, setSongSections] = useState<SongSection[]>([]);
  const [measureSignals, setMeasureSignals] = useState<(string | null)[]>([]);
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
  const masterEQRef = useRef({ low: 0, mid: 0, high: 0 });
  const masterCompressorRef = useRef({ threshold: -20, ratio: 4 });

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

  // Autosave notification state
  const [isSavedIndicatorVisible, setIsSavedIndicatorVisible] = useState<boolean>(false);

  // Pattern Solo Playback state and ref
  const [soloPatternPlayId, setSoloPatternPlayId] = useState<number | null>(null);
  const soloPatternPlayIdRef = useRef<number | null>(null);

  useEffect(() => {
    soloPatternPlayIdRef.current = soloPatternPlayId;
  }, [soloPatternPlayId]);

  // Inspecteur sequences state and ref
  const inspecteurSequencesRef = useRef<{
    alfaia?: Tone.Sequence;
    gongue?: Tone.Sequence;
    agbe?: Tone.Sequence;
    caixaParfaite?: Tone.Sequence;
    caixaErreur?: Tone.Sequence;
  }>({});
  const [inspecteurCaixaParfaite, setInspecteurCaixaParfaite] = useState<Tone.Sequence | undefined>(undefined);
  const [inspecteurCaixaErreur, setInspecteurCaixaErreur] = useState<Tone.Sequence | undefined>(undefined);

  const stopInspecteurAudio = () => {
    const seqs = inspecteurSequencesRef.current;
    if (seqs.alfaia) seqs.alfaia.dispose();
    if (seqs.gongue) seqs.gongue.dispose();
    if (seqs.agbe) seqs.agbe.dispose();
    if (seqs.caixaParfaite) seqs.caixaParfaite.dispose();
    if (seqs.caixaErreur) seqs.caixaErreur.dispose();
    
    inspecteurSequencesRef.current = {};
    setInspecteurCaixaParfaite(undefined);
    setInspecteurCaixaErreur(undefined);
    Tone.Transport.stop();
  };

  const startInspecteurAudio = () => {
    stopInspecteurAudio();
    Tone.start();

    const playSample = (instId: string, playerKey: string, time: number) => {
      if (!audioEngine) return;
      
      let symbol = playerKey;
      let velocity = 1.0;
      
      // Map educational mode playerKeys to definitive symbols and velocities
      if (playerKey === 'fort') {
        symbol = 'D';
        velocity = 1.0;
      } else if (playerKey === 'faible') {
        symbol = 'd';
        velocity = 0.4;
      } else if (playerKey === 'fort-grave') {
        symbol = 'G';
        velocity = 1.0;
      } else if (playerKey === 'fort-aigue') {
        symbol = 'A';
        velocity = 1.0;
      } else if (playerKey === 'faible-grave') {
        symbol = 'g';
        velocity = 0.4;
      } else if (playerKey === 'faible-aigue') {
        symbol = 'a';
        velocity = 0.4;
      } else if (playerKey === 'barulho') {
        symbol = 'B';
        velocity = 0.8;
      } else if (playerKey === 'ruffada-D') {
        symbol = 'R';
        velocity = 1.0;
      } else if (playerKey === 'ruffada-G') {
        symbol = 'r';
        velocity = 1.0;
      } else if (playerKey === 'saut') {
        symbol = 'S';
        velocity = 1.0;
      }
      
      audioEngine.playNote(instId, symbol, time, velocity, 1.0);
    };

    const alfaia = new Tone.Sequence((time, note) => {
      if (note) playSample('marcante', note, time);
    }, ["fort", "faible", "fort", "faible"], "4n").start(0);

    const gongue = new Tone.Sequence((time, note) => {
      if (note) playSample('gongue', note, time);
    }, ["fort-grave", "fort-aigue", "fort-grave", "fort-aigue"], "4n").start(0);

    const agbe = new Tone.Sequence((time, note) => {
      if (note) playSample('agbe', note, time);
    }, ["fort", "faible", "fort", "faible"], "4n").start(0);

    const caixaParfaite = new Tone.Sequence((time, note) => {
      if (note) playSample('caixa', note, time);
    }, ["fort", "faible", "fort", "faible", "fort", "faible", "fort", "faible", "fort", "faible", "fort", "faible", "fort", "faible", "fort", "faible"], "16n").start(0);

    const caixaErreur = new Tone.Sequence((time, note) => {
      if (note) playSample('caixa', note, time);
    }, ["fort", null, "faible", "fort", null, "fort", "faible", null, "fort", null, "faible", "fort", null, "fort", "faible", null], "16n").start(0);

    caixaParfaite.mute = true;
    caixaErreur.mute = false;

    inspecteurSequencesRef.current = { alfaia, gongue, agbe, caixaParfaite, caixaErreur };
    setInspecteurCaixaParfaite(caixaParfaite);
    setInspecteurCaixaErreur(caixaErreur);

    Tone.Transport.start();
  };

  // Mestre sequences state and ref
  const [mestreRhythmState, setMestreRhythmState] = useState<'base' | 'variation' | 'rufo'>('base');
  const mestreSequencesRef = useRef<{
    alfaia?: Tone.Sequence;
    caixa?: Tone.Sequence;
    gongue?: Tone.Sequence;
    agbe?: Tone.Sequence;
  }>({});
  const mestreRhythmStateRef = useRef<'base' | 'variation' | 'rufo'>('base');

  useEffect(() => {
    mestreRhythmStateRef.current = mestreRhythmState;
  }, [mestreRhythmState]);

  const stopMestreAudio = () => {
    const seqs = mestreSequencesRef.current;
    if (seqs.alfaia) seqs.alfaia.dispose();
    if (seqs.caixa) seqs.caixa.dispose();
    if (seqs.gongue) seqs.gongue.dispose();
    if (seqs.agbe) seqs.agbe.dispose();
    
    mestreSequencesRef.current = {};
    setMestreRhythmState('base');
    Tone.Transport.stop();
    Tone.Transport.cancel();
  };

  const startMestreAudio = () => {
    stopMestreAudio();
    Tone.start();

    const playSample = (instId: string, playerKey: string, time: number) => {
      if (!audioEngine) return;
      
      let symbol = playerKey;
      let velocity = 1.0;
      
      // Map educational mode playerKeys to definitive symbols and velocities
      if (playerKey === 'fort') {
        symbol = 'D';
        velocity = 1.0;
      } else if (playerKey === 'faible') {
        symbol = 'd';
        velocity = 0.4;
      } else if (playerKey === 'fort-grave') {
        symbol = 'G';
        velocity = 1.0;
      } else if (playerKey === 'fort-aigue') {
        symbol = 'A';
        velocity = 1.0;
      } else if (playerKey === 'faible-grave') {
        symbol = 'g';
        velocity = 0.4;
      } else if (playerKey === 'faible-aigue') {
        symbol = 'a';
        velocity = 0.4;
      } else if (playerKey === 'barulho') {
        symbol = 'B';
        velocity = 0.8;
      } else if (playerKey === 'ruffada-D') {
        symbol = 'R';
        velocity = 1.0;
      } else if (playerKey === 'ruffada-G') {
        symbol = 'r';
        velocity = 1.0;
      } else if (playerKey === 'saut') {
        symbol = 'S';
        velocity = 1.0;
      }
      
      audioEngine.playNote(instId, symbol, time, velocity, 1.0);
    };

    const alfaia = new Tone.Sequence((time, note) => {
      const state = mestreRhythmStateRef.current;
      if (state === 'rufo') {
        playSample('marcante', 'barulho', time);
      } else if (state === 'variation') {
        if (note === 'fort') {
          playSample('marcante', 'fort', time);
          playSample('marcante', 'fort', time + 0.15);
        } else if (note) {
          playSample('marcante', 'faible', time);
        }
      } else {
        if (note) playSample('marcante', note, time);
      }
    }, ["fort", "faible", "fort", "faible"], "4n").start(0);

    const caixa = new Tone.Sequence((time, note) => {
      const state = mestreRhythmStateRef.current;
      if (state === 'rufo') {
        playSample('caixa', 'ruffada-D', time);
        playSample('caixa', 'ruffada-G', time + 0.15);
      } else if (state === 'variation') {
        if (note) {
          playSample('caixa', 'fort', time);
          playSample('caixa', 'faible', time + 0.075);
        }
      } else {
        if (note) playSample('caixa', note, time);
      }
    }, ["fort", "faible", "fort", "faible", "fort", "faible", "fort", "faible", "fort", "faible", "fort", "faible", "fort", "faible", "fort", "faible"], "16n").start(0);

    const gongue = new Tone.Sequence((time, note) => {
      const state = mestreRhythmStateRef.current;
      if (state === 'rufo') {
        playSample('gongue', 'barulho', time);
      } else if (state === 'variation') {
        if (note) playSample('gongue', 'fort-aigue', time);
      } else {
        if (note) playSample('gongue', note, time);
      }
    }, ["fort-grave", "fort-aigue", "fort-grave", "fort-aigue"], "4n").start(0);

    const agbe = new Tone.Sequence((time, note) => {
      const state = mestreRhythmStateRef.current;
      if (state === 'rufo') {
        playSample('agbe', 'barulho', time);
      } else if (state === 'variation') {
        if (note) {
          playSample('agbe', 'fort', time);
          playSample('agbe', 'saut', time + 0.15);
        }
      } else {
        if (note) playSample('agbe', note, time);
      }
    }, ["fort", "faible", "fort", "faible"], "4n").start(0);

    mestreSequencesRef.current = { alfaia, caixa, gongue, agbe };
    Tone.Transport.start();
  };

  useEffect(() => {
    if (viewMode === 'inspecteur') {
      if (isPlaying) {
        handleRewind();
      }
      startInspecteurAudio();
    } else {
      stopInspecteurAudio();
    }

    if (viewMode === 'mestre') {
      if (isPlaying) {
        handleRewind();
      }
      startMestreAudio();
    } else {
      stopMestreAudio();
    }
    
    if ((viewMode === 'quiz' || viewMode === 'dictee' || viewMode === 'rythmelive' || viewMode === 'varal' || viewMode === 'studio') && isPlaying) {
      handleRewind();
    }
  }, [viewMode]);

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
    tracksRedoHistoryRef.current = tracksRedoHistory;
  }, [tracksRedoHistory]);

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
    masterEQRef.current = masterEQ;
    if (masterEQNode) {
      masterEQNode.low.value = masterEQ.low;
      masterEQNode.mid.value = masterEQ.mid;
      masterEQNode.high.value = masterEQ.high;
    }
  }, [masterEQ]);

  useEffect(() => {
    masterCompressorRef.current = masterCompressor;
    if (masterCompressorNode) {
      masterCompressorNode.threshold.value = masterCompressor.threshold;
      masterCompressorNode.ratio.value = masterCompressor.ratio;
    }
  }, [masterCompressor]);

  useEffect(() => {
    songStructureHistoryRef.current = songStructureHistory;
  }, [songStructureHistory]);

  useEffect(() => {
    songStructureRedoHistoryRef.current = songStructureRedoHistory;
  }, [songStructureRedoHistory]);

  useEffect(() => {
    songSectionsRef.current = songSections;
  }, [songSections]);


  useEffect(() => {
    setLocalPresets(Object.keys(getLocalLibrary()));
  }, []);

  // Apply theme to document and save to localStorage
  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('baquemix-theme', theme);
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

    setMeasureSignals(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push(null);
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });
  }, [totalMeasures, timeSig, bpm]);

  // Memoize mixer control values snapshot to trigger sync effect only when they actually change
  const hasSoloActive = tracks.some(t => t.isSolo);
  const mixerControlsKey = tracks.map(t => `${t.id}:${t.volumeVal ?? 100}:${t.reverbVal || 0}:${t.panVal || 0}:${t.isMute ? 1 : 0}:${t.isSolo ? 1 : 0}`).join('|') + `|solo:${hasSoloActive ? 1 : 0}`;

  // Synchronize track volume, panning, reverb send levels, and mute/solo state whenever tracks update
  useEffect(() => {
    const hasSolo = tracks.some(t => t.isSolo);
    tracks.forEach(t => {
      const inst = instrumentsConfig[t.instrumentIdx];
      if (inst) {
        if (channels[inst.id]) {
          const gain = (t.volumeVal ?? 100) / 100;
          channels[inst.id].volume.value = Tone.gainToDb(gain);
          channels[inst.id].pan.value = (t.panVal || 0) / 100;
          channels[inst.id].mute = t.isMute || (hasSolo && !t.isSolo);
        }
        if (reverbSends[inst.id]) {
          reverbSends[inst.id].gain.value = (t.reverbVal || 0) / 100;
        }
      }
    });
  }, [mixerControlsKey]);

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

  // whistleVol state is maintained to prevent breaking RightSidebar integration

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSwingOn, setIsSwingOn] = useState<boolean>(true);

  const [currentMeasure, setCurrentMeasure] = useState<number>(0);

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
  const engineTimeoutsRef = useRef<any[]>([]);
  const measureSignalsRef = useRef<(string | null)[]>([]);
  const lastPlayedSignalIdRef = useRef<string | null>(null);
  const tickScheduleRef = useRef<Map<number, Map<number, ScheduledNote[]>>>(new Map());

  // For vocal recording
  const recordingDurationMeasuresRef = useRef<number>(1);
  const recordedMeasuresCountRef = useRef<number>(0);
  const vocalRecordArmTimeoutRef = useRef<any>(null);
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
  const vocalPlayersRef = useRef<{ [patternId: number]: any }>({});
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
      
      // 1. Save sliced WAV Blob in IndexedDB
      await saveVocalRecording(newPatternId, wavBlob);
      
      // 2. Load the vocal playback player
      await loadVocalRecording(newPatternId);

      // 3. Inject new Pattern into active voice tracks
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
        
        const player = new Tone.GrainPlayer(audioBuffer);
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



  // Dedicated synchronization of audio engine refs and recompilation of tick schedule
  // when composition structure, tracks, or states change (runs on load, clean, or bounds edits)
  useEffect(() => {
    console.log("⚙️⚙️⚙️ [AUDIO_ENGINE_SYNC_&_RECOMPILE] State changed! Syncing refs and recompiling tickScheduleRef...");
    tracksRef.current = tracks;
    totalMeasuresRef.current = totalMeasures;
    measureTimeSigsRef.current = measureTimeSigs;
    measureBpmsRef.current = measureBpms;
    measureBpmTransitionsRef.current = measureBpmTransitions;
    measureVolsRef.current = measureVols;
    measureVolTransitionsRef.current = measureVolTransitions;
    measureSignalsRef.current = measureSignals;
    maxTicksRef.current = getMaxTicks(timeSig);

    try {
      const schedule = buildTickSchedule(
        tracks,
        totalMeasures,
        measureTimeSigs,
        instrumentsConfig,
        soloPatternPlayId
      );
      tickScheduleRef.current = schedule;
      console.log("✅✅✅ [AUDIO_ENGINE_SYNC_&_RECOMPILE] Success. Compiled measure map size:", schedule.size);
    } catch (err) {
      console.error("❌❌❌ [AUDIO_ENGINE_SYNC_&_RECOMPILE] Failed to compile tick schedule:", err);
    }
  }, [
    tracks,
    totalMeasures,
    measureTimeSigs,
    measureBpms,
    measureBpmTransitions,
    measureVols,
    measureVolTransitions,
    measureSignals,
    timeSig,
    soloPatternPlayId
  ]);

  // Synchronisation des refs de statut d'exécution (se déclenche lors des play/pause, metronome, swing, vocal state changes)
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    isMetroOnRef.current = isMetroOn;
    isSwingOnRef.current = isSwingOn;
    recordingVocalPatternIdRef.current = recordingVocalPatternId;
    isVocalGuideEnabledRef.current = isVocalGuideEnabled;
  }, [isPlaying, isMetroOn, isSwingOn, recordingVocalPatternId, isVocalGuideEnabled]);

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
        masterEQNode = new Tone.EQ3({
          low: masterEQRef.current.low,
          mid: masterEQRef.current.mid,
          high: masterEQRef.current.high
        });
        masterCompressorNode = new Tone.Compressor({
          threshold: masterCompressorRef.current.threshold,
          ratio: masterCompressorRef.current.ratio,
          attack: 0.03,
          release: 0.25
        });

        masterVolumeNode = new Tone.Gain(1.0);
        
        masterVolumeNode.connect(masterEQNode);
        masterEQNode.connect(masterCompressorNode);
        masterCompressorNode.toDestination();
        
        masterVolumeNode.gain.value = Tone.dbToGain(masterVolRef.current === -40 ? -Infinity : masterVolRef.current);
        masterMeterNode = new Tone.Meter();
        (window as any).masterMeterNode = masterMeterNode;
        Tone.Destination.connect(masterMeterNode);
      }

      // Configurer le lookAhead de Tone.js à 150ms pour pré-scheduler les événements audio.
      // Avec la mémoïsation React complète, 150ms est optimal pour garantir à la fois l'absence de coupures
      // et une synchronisation audio-visuelle parfaite.
      try {
        Tone.getContext().lookAhead = 0.15;
      } catch (err) {
        console.warn("Failed to set Tone.js lookAhead:", err);
      }

      bMetroClick = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.01 },
        volume: 4,
      }).connect(masterVolumeNode);

      // whistleSynth initialization removed (Apito is now a standalone track)

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
        }
      });

      // Synchronize track volume, panning, reverb levels, and mute/solo initially once nodes exist
      const initialHasSolo = tracksRef.current.some((t: any) => t.isSolo);
      tracksRef.current.forEach((t) => {
        const inst = instrumentsConfig[t.instrumentIdx];
        if (inst) {
          if (channels[inst.id]) {
            const gain = (t.volumeVal ?? 100) / 100;
            channels[inst.id].volume.value = Tone.gainToDb(gain);
            channels[inst.id].pan.value = (t.panVal || 0) / 100;
            channels[inst.id].mute = t.isMute || (initialHasSolo && !t.isSolo);
          }
          if (reverbSends[inst.id]) {
            reverbSends[inst.id].gain.value = (t.reverbVal || 0) / 100;
          }
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

      // Stable 96-tick sequencing loop using our AudioEngine
      const rawCtx = Tone.getContext().rawContext as AudioContext;
      audioEngine = new AudioEngine(
        rawCtx,
        (time) => {
        console.log("⏰⏰⏰ [AUDIO ENGINE ON_TICK CALLBACK] Fired. time parameter: " + time + " | Current step index ref: " + currentStepIndexRef.current);
        let currentTicks = maxTicksRef.current;
        let stepIdx = currentStepIndexRef.current;

        // 1. Commuter la mesure si on arrive à la fin
        if (stepIdx === -1) {
          if (soloPatternPlayIdRef.current !== null) {
            measureCountRef.current = 0;
          } else if (loopStartRef.current !== null && (measureCountRef.current < loopStartRef.current || (loopEndRef.current !== null && measureCountRef.current > loopEndRef.current))) {
            measureCountRef.current = loopStartRef.current;
          } else {
            measureCountRef.current = measureCountRef.current % (totalMeasuresRef.current || 1);
          }
          const firstMeasureIdx = measureCountRef.current;
          const firstTimeSig = measureTimeSigsRef.current[firstMeasureIdx] || '4/4';
          currentTicks = getMaxTicks(firstTimeSig);
          maxTicksRef.current = currentTicks;
        } else if (stepIdx === currentTicks - 1) {
          if (soloPatternPlayIdRef.current !== null) {
            measureCountRef.current = 0;
          } else {
            const currentMeasureIdx = measureCountRef.current;
            if (loopStartRef.current !== null && loopEndRef.current !== null && currentMeasureIdx === loopEndRef.current) {
              measureCountRef.current = loopStartRef.current;
            } else {
              measureCountRef.current = (measureCountRef.current + 1) % (totalMeasuresRef.current || 1);
            }
          }
          const nextMeasureIdx = measureCountRef.current;
          const nextTimeSig = measureTimeSigsRef.current[nextMeasureIdx] || '4/4';
          currentTicks = getMaxTicks(nextTimeSig);
          maxTicksRef.current = currentTicks;
        }

        // 2. Avancer le pas
        stepIdx = (stepIdx + 1) % currentTicks;
        currentStepIndexRef.current = stepIdx;

        const currentMeasureIdx = measureCountRef.current;

        if (stepIdx === 0) {
          const prevMeasureIdx = (currentMeasureIdx - 1 + (totalMeasuresRef.current || 1)) % (totalMeasuresRef.current || 1);
          const sigId = measureSignalsRef.current[prevMeasureIdx] || null;
          lastPlayedSignalIdRef.current = sigId;
        }

        const _stepForUI = isNaN(stepIdx) ? 0 : stepIdx;
        const _measureForUI = isNaN(currentMeasureIdx) ? 0 : currentMeasureIdx;
        const _currentTicks = isNaN(currentTicks) || currentTicks <= 0 ? 96 : currentTicks;
        const ratioVal = _stepForUI / _currentTicks;

        const delayMs = Math.max(0, (time - rawCtx.currentTime) * 1000);
        const timeoutId = setTimeout(() => {
          window.dispatchEvent(new CustomEvent('baquemix-tick', {
            detail: {
              step: _stepForUI,
              measure: _measureForUI,
              maxTicks: _currentTicks,
              ratio: ratioVal,
              visualStep16: Math.floor(ratioVal * 16),
              visualStep12: Math.floor(ratioVal * 12),
              time: time
            }
          }));
          engineTimeoutsRef.current = engineTimeoutsRef.current.filter(id => id !== timeoutId);
        }, delayMs);
        engineTimeoutsRef.current.push(timeoutId);

        // Pré-calculer la durée d'un 96n une seule fois par tick (formule mathématique sans allocation d'objet)
        const targetBpm = measureBpmsRef.current[currentMeasureIdx] ?? 100;
        const tick96nSec = 2.5 / targetBpm;

        // 3. Appliquer le BPM — uniquement au début de la mesure via AudioParam scheduling
        // (évite 96 écritures/mesure qui forçaient Tone.js à recalculer son horloge interne)
        const transition = measureBpmTransitionsRef.current[currentMeasureIdx] || 'immediate';

        if (stepIdx === 0) {
          try {
            if (transition === 'ramp') {
              const prevMeasureIdx = (currentMeasureIdx - 1 + totalMeasuresRef.current) % totalMeasuresRef.current;
              const startBpm = measureBpmsRef.current[prevMeasureIdx] ?? targetBpm;
              const measureDurationSec = currentTicks * tick96nSec;
              // Planifier la rampe BPM via AudioParam (propre et sans écriture répétée)
              Tone.Transport.bpm.cancelScheduledValues(time);
              Tone.Transport.bpm.setValueAtTime(startBpm, time);
              Tone.Transport.bpm.linearRampToValueAtTime(targetBpm, time + measureDurationSec);
            } else {
              Tone.Transport.bpm.cancelScheduledValues(time);
              Tone.Transport.bpm.setValueAtTime(targetBpm, time);
            }
          } catch (e) {}
        }

        // 3b. Appliquer le volume — planifié via AudioParam pour la mesure courante (indépendant du volume master)
        const targetVolPercent = measureVolsRef.current[currentMeasureIdx] !== undefined ? measureVolsRef.current[currentMeasureIdx] : 100;
        const volTransition = measureVolTransitionsRef.current[currentMeasureIdx] || 'immediate';

        if (stepIdx === 0) {
          try {
            const endGain = targetVolPercent / 100;
            if (volTransition === 'ramp') {
              const prevMeasureIdx = (currentMeasureIdx - 1 + totalMeasuresRef.current) % totalMeasuresRef.current;
              const startVolPercent = measureVolsRef.current[prevMeasureIdx] !== undefined ? measureVolsRef.current[prevMeasureIdx] : 100;
              const startGain = startVolPercent / 100;
              const measureDurationSec = currentTicks * tick96nSec;
              Tone.Destination.volume.cancelScheduledValues(time);
              Tone.Destination.volume.setValueAtTime(Tone.gainToDb(startGain === 0 ? 0.0001 : startGain), time);
              Tone.Destination.volume.linearRampToValueAtTime(Tone.gainToDb(endGain === 0 ? 0.0001 : endGain), time + measureDurationSec);
            } else {
              Tone.Destination.volume.cancelScheduledValues(time);
              Tone.Destination.volume.setValueAtTime(Tone.gainToDb(endGain === 0 ? 0.0001 : endGain), time);
            }
          } catch (e) {}
        }

        // Click metronome beat pulse
        const currentMeasureSig = measureTimeSigsRef.current[currentMeasureIdx] || '4/4';
        const markers = getCachedMarkers(currentMeasureSig, currentTicks);

        if (isMetroOnRef.current && markers.includes(stepIdx)) {
          const noteVal = stepIdx === 0 ? 'A5' : 'E5';
          bMetroClick?.triggerAttackRelease(noteVal, '32n', time);
        }

        // Parse trigger of step events
        // --- SWING & MICRO-TIMING MARACATU ---
        let swingOffset = 0;
        if (isSwingOnRef.current) {
          const stepDurationSec = tick96nSec * 6; // one 16th note
          const posInBeat = ((stepIdx / (currentTicks / 4)) % 1) * 4; // 0-3 within a beat group of 4 steps
          const posInGroup = Math.round(posInBeat) % 4;
          
          const swingIntensity = 1.0;
          const jitter = (nextRandom() * 0.06 - 0.03) * stepDurationSec; // +/- 3%

          if (posInGroup === 0) {
            // 1ère DC : Légèrement au fond + jitter
            swingOffset = (0.05 * swingIntensity * stepDurationSec) + jitter;
          } else if (posInGroup === 1) {
            // 2ème DC : En retard + jitter
            swingOffset = (0.15 * swingIntensity * stepDurationSec) + jitter;
          } else if (posInGroup === 2) {
            // 3ème DC : Pivot stable + jitter minimal
            const minimalJitter = (nextRandom() * 0.02 - 0.01) * stepDurationSec;
            swingOffset = (0.02 * swingIntensity * stepDurationSec) + minimalJitter;
          } else if (posInGroup === 3) {
            // 4ème DC : En avance + jitter
            swingOffset = (-0.10 * swingIntensity * stepDurationSec) + jitter;
          }
        }
        const swingTime = time + swingOffset;

        // ─── LECTURE DEPUIS LE TABLEAU PRÉ-COMPILÉ (O(1) par tick) ───────
        // Les instruments (non-voix) sont joués depuis tickSchedule pour
        // éviter tout forEach/find/switch dans le thread audio.
        const measureMap = tickScheduleRef.current.get(currentMeasureIdx);
        const scheduledNotes = measureMap?.get(stepIdx);

        if (scheduledNotes) {
          for (const note of scheduledNotes) {
            try {
              // Velocity humanization (random — can't be pre-computed)
              let vel = 1.0;
              if (isSwingOnRef.current) {
                vel = note.isStrong
                  ? 0.8 + (nextRandom() * 0.2 - 0.1)
                  : 0.4 + (nextRandom() * 0.24 - 0.12);
              }
              vel *= note.stepVolMultiplier;

              // Micro-timing offset
              const stepDurSec = tick96nSec * (currentTicks / note.stepsPerMeasure);
              const microOffset = (note.microtimingPct / 100) * stepDurSec * 0.5;
              const triggerTime = swingTime + microOffset;

              console.log("🎵 [PLAY NOTE] AudioEngine", note.instId, note.playerKey, triggerTime);
              audioEngine?.playNote(note.instId, note.playerKey, triggerTime, note.baseGain * vel, note.stepDecayMultiplier);

              const delayMs = Math.max(0, (triggerTime - rawCtx.currentTime) * 1000);
              const timeoutId = setTimeout(() => {
                hitTriggersRef.current.push({ trackId: note.trackId, stepIndex: note.circleStepIdx, state: note.state });
                engineTimeoutsRef.current = engineTimeoutsRef.current.filter(id => id !== timeoutId);
              }, delayMs);
              engineTimeoutsRef.current.push(timeoutId);
            } catch (_) {}
          }
        }

        // ─── LOGIQUE VOCALE (conservée dans le loop car stateful) ────────
        tracksRef.current.forEach((track) => {
          const currentMeasureLocal = measureCountRef.current % totalMeasuresRef.current;
          const inst = instrumentsConfig[track.instrumentIdx];
          if (!inst || inst.type !== 'voice') return; // instruments handled above

          // Recording handling
          if (recordingVocalPatternIdRef.current !== null) {
            const hasPatternBeingRecorded = track.patterns.some((p: any) => p.id === recordingVocalPatternIdRef.current);
            if (hasPatternBeingRecorded) {
              if (stepIdx === 0 && vocalRecordingStateRef.current === 'waiting') {
                vocalRecordingStateRef.current = 'recording';
                const startDelayMs = Math.max(0, (time - Tone.context.rawContext.currentTime) * 1000);
                setTimeout(() => {
                  if (vocalMediaRecorderRef.current && vocalMediaRecorderRef.current.state === 'inactive') {
                    try { vocalMediaRecorderRef.current.start(); } catch (err) {}
                  }
                }, startDelayMs);
              }
              if (stepIdx === currentTicks - 1 && vocalRecordingStateRef.current === 'recording') {
                recordedMeasuresCountRef.current++;
                if (recordedMeasuresCountRef.current >= recordingDurationMeasuresRef.current) {
                  vocalRecordingStateRef.current = 'inactive';
                  const stopDelayMs = Math.max(0, (time + tick96nSec - Tone.context.rawContext.currentTime) * 1000);
                  setTimeout(() => {
                    let stopped = false;
                    if (vocalMediaRecorderRef.current && vocalMediaRecorderRef.current.state === 'recording') {
                      try { vocalMediaRecorderRef.current.stop(); stopped = true; } catch (err) {}
                    }
                    if (!stopped) { setIsRecordingVocal(false); setRecordingVocalPatternId(null); cleanupVocalNodes(); }
                  }, stopDelayMs);
                }
              }
            }
          }

          const isSoloPlayActive = soloPatternPlayIdRef.current !== null;
          const isTargetSoloTrack = isSoloPlayActive && track.patterns.some((p: any) => p.id === soloPatternPlayIdRef.current);
          let activePattern: any;
          let canPlay = false;

          if (isSoloPlayActive) {
            if (isTargetSoloTrack) { activePattern = track.patterns.find((p: any) => p.id === soloPatternPlayIdRef.current); canPlay = true; }
            else return;
          } else {
            activePattern = track.patterns.find((p: any) => p.measureAssignments[currentMeasureLocal]);
            const hasSoloVoice = tracksRef.current.some((t: any) => t.isSolo);
            canPlay = hasSoloVoice ? track.isSolo : !track.isMute;
          }

          if (!activePattern || !canPlay) return;

          // Micro mode: loop vocal recording at measure start
          if (activePattern.vocalMode === 'micro' && stepIdx === 0 && recordingVocalPatternIdRef.current !== activePattern.id) {
            const isContinuation = currentMeasureLocal > 0 && activePattern.measureAssignments[currentMeasureLocal - 1];
            if (!isContinuation) {
              const player = vocalPlayersRef.current[activePattern.id];
              if (player?.loaded) {
                try {
                  player.stop();
                  const totalLatencyMs = (activePattern.vocalLatency || 0) + getSystemDefaultLatencyMs();
                  const offsetSec = Math.max(0, VOCAL_RECORDING_ARM_DELAY_SEC + (totalLatencyMs / 1000));
                  
                  // Calculate dynamic playback rate for time-stretching (BPM sync)
                  let rate = 1.0;
                  if (activePattern.vocalBpmSync !== false && activePattern.vocalBaseBpm) {
                    const currentMeasureBpm = measureBpmsRef.current[currentMeasureLocal] ?? targetBpm;
                    rate = currentMeasureBpm / activePattern.vocalBaseBpm;
                  }
                  player.playbackRate = rate;

                  if (totalLatencyMs >= 0) { 
                    player.start(time, offsetSec); 
                  } else { 
                    player.start(time + Math.abs(totalLatencyMs) / 1000, VOCAL_RECORDING_ARM_DELAY_SEC); 
                  }
                } catch (_) {}
              }
            }
          }

          // Step-by-step vocal guide or non-micro vocal steps
          const stepCount = activePattern.steps;
          const circleStepIdx = Math.floor((stepIdx / currentTicks) * stepCount);
          const expectedTick = Math.floor((circleStepIdx * currentTicks) / stepCount);
          if (stepIdx !== expectedTick) return;

          const state = activePattern.activeSteps[circleStepIdx];
          if (!state || state === 0) return;

          if (activePattern.vocalMode !== 'micro' || (recordingVocalPatternIdRef.current === activePattern.id && isVocalGuideEnabledRef.current)) {
            const baseGain = 1.0;
            const stepVolMultiplier = (activePattern.volumes?.[circleStepIdx] ?? 80) / 100;
            const stepDecayMultiplier = (activePattern.decays?.[circleStepIdx] ?? 100) / 100;
            const manualMicro = activePattern.microtimings?.[circleStepIdx] ?? 0;
            const stepDurSec = tick96nSec * (currentTicks / stepCount);
            const microTimeOffset = (manualMicro / 100) * stepDurSec * 0.5;
            const finalTriggerTime = swingTime + microTimeOffset;
            let note = 'C5';
            if (activePattern.notes?.[circleStepIdx]?.trim()) note = activePattern.notes[circleStepIdx];
            else if (state === 'P') note = 'E5';
            try {
              const synth = voiceSynths[inst.id];
              if (synth) {
                synth.volume.setValueAtTime(Tone.gainToDb(baseGain * stepVolMultiplier) - 10, finalTriggerTime);
                synth.triggerAttackRelease(note, `${(1 / 8) * stepDecayMultiplier}s`, finalTriggerTime);
              }
            } catch (_) {}
          }
        });
        },
        () => {
          const currentMeasureIdx = measureCountRef.current % totalMeasuresRef.current;
          const targetBpm = measureBpmsRef.current[currentMeasureIdx] ?? 100;
          return 2.5 / targetBpm;
        }
      );

      // Initialize InputManager
      inputManager = new InputManager(audioEngine);
      inputManager.setLeftHanded(isLeftHanded);
      if (activeKeyboardInstrumentId) {
        inputManager.setActiveInstrument(activeKeyboardInstrumentId);
      }

      // Connect channels to audioEngine
      instrumentsConfig.forEach((inst) => {
        if (inst.type !== 'voice' && channels[inst.id]) {
          audioEngine?.setInstrumentChannel(inst.id, channels[inst.id]);
        }
      });

      // Load all samples via the AudioEngine
      audioEngine.loadAllSamples()
        .then(() => {
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load samples via AudioEngine:", err);
          setIsLoading(false);
        });
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
    if (masterVolumeNode) {
      try {
        masterVolumeNode.gain.setValueAtTime(Tone.dbToGain(masterVol === -40 ? -Infinity : masterVol), Tone.context.currentTime);
      } catch (err) {}
    }
  }, [masterVol]);

  // Reset Destination Volume to neutral when stopped
  useEffect(() => {
    if (!isPlaying) {
      try {
        Tone.Destination.volume.setValueAtTime(0, Tone.context.currentTime);
      } catch (err) {}
    }
  }, [isPlaying]);

  // Autosave sequencer state in localStorage with 1 second debounce
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isLoading) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const tracksCopy = JSON.parse(JSON.stringify(tracks));
      // Remove vocalAudioData from tracks copy as it's already stored in IndexedDB by patternId
      tracksCopy.forEach((t: any) => t.patterns?.forEach((p: any) => { delete p.vocalAudioData; }));

      const dataToSave = {
        bpm,
        timeSig,
        version: 3,
        totalMeasures,
        tracks: tracksCopy,
        letras,
        metadata,
        measureTimeSigs,
        measureBpms,
        measureBpmTransitions,
        measureVols,
        measureVolTransitions,
        songSections,
        measureSignals,
        masterEQ,
        masterCompressor,
        masterVol,
        whistleVol,
      };

      try {
        localStorage.setItem('baquemix_autosave', JSON.stringify(dataToSave));
        setIsSavedIndicatorVisible(true);
      } catch (err) {
        console.error('Failed to autosave state to localStorage:', err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    isLoading,
    tracks,
    bpm,
    timeSig,
    totalMeasures,
    measureBpms,
    measureTimeSigs,
    measureBpmTransitions,
    measureVols,
    measureVolTransitions,
    songSections,
    measureSignals,
    letras,
    metadata,
    masterEQ,
    masterCompressor,
    masterVol,
    whistleVol,
  ]);

  useEffect(() => {
    if (isSavedIndicatorVisible) {
      const timer = setTimeout(() => {
        setIsSavedIndicatorVisible(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSavedIndicatorVisible]);

  // 2. Load Preset catalog initially
  useEffect(() => {
    const hash = window.location.hash;
    let loadedFromHash = false;

    const tryLoadQueryOrHash = async () => {
      // 1. Try URL query parameter '?baque='
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const baqueParam = urlParams.get('baque');
        if (baqueParam) {
          const decompressed = LZString.decompressFromEncodedURIComponent(baqueParam);
          if (decompressed) {
            const preset = JSON.parse(decompressed);
            await applyPreset(preset);
            // Clean URL immediately to keep address bar clean
            window.history.replaceState({}, document.title, window.location.pathname);
            return true;
          }
        }
      } catch (err) {
        console.error('Failed to load shared state from URL query parameter:', err);
      }

      // 2. Fallback to existing '#state=' hash
      if (!hash || !hash.startsWith('#state=')) return false;
      const encoded = hash.substring(7);
      // Try new compressed format first (gzip + base64url)
      try {
        const padding = '='.repeat((4 - encoded.length % 4) % 4);
        const standard = (encoded + padding).replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(standard);
        const bytes = new Uint8Array([...binary].map(c => c.charCodeAt(0)));
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        const jsonStr = await new Response(stream).text();
        const stateData = JSON.parse(jsonStr);
        await applyPreset(stateData);
        return true;
      } catch (_) {}
      // Fallback: try old uncompressed base64 format
      try {
        const jsonStr = decodeURIComponent(escape(atob(encoded)));
        const stateData = JSON.parse(jsonStr);
        await applyPreset(stateData);
        return true;
      } catch (err) {
        console.error('Failed to load shared state from URL hash:', err);
      }
      return false;
    };

    tryLoadQueryOrHash().then(async (loaded) => {
      loadedFromHash = loaded;

      let restoredFromLocalStorage = false;
      if (!loadedFromHash) {
        try {
          const savedSession = localStorage.getItem('baquemix_autosave');
          if (savedSession) {
            const data = JSON.parse(savedSession);
            await applyPreset(data);
            restoredFromLocalStorage = true;
            console.log('[BaqueMix] Autosave restored from localStorage.');
          }
        } catch (err) {
          console.error('[BaqueMix] Failed to restore autosave from localStorage:', err);
        }
      }

      fetch(`${ASSETS_BASE_URL}presets/catalog.json`)
        .then((res) => res.json())
        .then((files: string[]) => {
          setPresetFiles(files);
          if (files.length > 0 && !loadedFromHash && !restoredFromLocalStorage) {
            setActivePresetName(files[0]);
            loadFallbackPreset(files[0]);
          }
        })
        .catch((err) => console.error('Could not load catalog.json:', err));
    });
  }, []);

  // PWA File Handler: handle files opened via the OS file handler (launchQueue API)
  useEffect(() => {
    if ('launchQueue' in window) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (!launchParams.files || launchParams.files.length === 0) return;
        try {
          const fileHandle = launchParams.files[0];
          const file: File = await fileHandle.getFile();
          if (!file.name.endsWith('.json')) return;
          const text = await file.text();
          const data = JSON.parse(text);
          await applyPreset(data);
        } catch (err) {
          console.error('Failed to load file from launchQueue:', err);
        }
      });
    }
  }, []);

  // VU-meters are now animated locally inside components using requestAnimationFrame for better performance and encapsulation


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



  // Live keyboard play listener using InputManager
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (inputManager) {
        inputManager.handleKeyDown(e);
      }
    };

    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (inputManager) {
        inputManager.handleKeyUp(e);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, []);

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

  const applyPreset = async (p: any) => {
    try {
      setTracksHistory([]);
      setSongStructureHistory([]);
      setLetras(p.letras || '');
      setMetadata(p.metadata || { toada: '', nacao: '', compositor: '', ritmo: '' });
      
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
        loadedTracks.forEach(t => t.patterns.forEach(ptn => normalizePatternData(ptn, t.instrumentIdx)));
      } else if (p.circles) {
        // Migrate old format
        const oldCircles: Circle[] = JSON.parse(JSON.stringify(p.circles));
        if (version < 2) {
          oldCircles.forEach(c => {
            if (c.instrumentIdx >= 4) {
              c.instrumentIdx += 1;
            }
          });
        }
        if (version < 3) {
          oldCircles.forEach(c => {
            if (c.instrumentIdx >= 8) {
              c.instrumentIdx += 1;
            }
          });
        }
        loadedTracks = migrateCirclesToTracks(oldCircles, loadedMeasures);
        loadedTracks.forEach(t => t.patterns.forEach(ptn => normalizePatternData(ptn, t.instrumentIdx)));
      }
      
      // Process vocal audio data if present
      const promises: Promise<void>[] = [];
      loadedTracks.forEach(t => {
        const inst = instrumentsConfig[t.instrumentIdx];
        if (inst && inst.type === 'voice') {
          t.patterns.forEach(ptn => {
            if (ptn.vocalAudioData) {
              const patternId = ptn.id;
              const b64 = ptn.vocalAudioData;
              // Clean it from the pattern to save React state memory
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

      if (p.songSections && Array.isArray(p.songSections)) {
        setSongSections(p.songSections);
      } else {
        setSongSections([]);
      }

      if (p.measureSignals && Array.isArray(p.measureSignals)) {
        setMeasureSignals(p.measureSignals);
      } else {
        setMeasureSignals(Array(loadedMeasures).fill(null));
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
      if (p.whistleVol !== undefined) {
        setWhistleVol(p.whistleVol);
      }

      // Sync refs immediately to avoid audio scheduling lag
      tracksRef.current = loadedTracks;
      totalMeasuresRef.current = loadedMeasures;
      measureBpmsRef.current = loadedBpms;
      measureTimeSigsRef.current = loadedTimeSigs;
      measureBpmTransitionsRef.current = loadedBpmTransitions;
      measureVolsRef.current = loadedVols;
      measureVolTransitionsRef.current = loadedVolTransitions;

      try {
        console.log("⚙️⚙️⚙️ [loadFallbackPreset] Compiling tick schedule synchronously...");
        tickScheduleRef.current = buildTickSchedule(
          loadedTracks,
          loadedMeasures,
          loadedTimeSigs,
          instrumentsConfig,
          null
        );
        console.log("✅✅✅ [loadFallbackPreset] Done. Compiled measures count:", tickScheduleRef.current.size);
      } catch (err) {
        console.error("❌❌❌ [loadFallbackPreset] Synchronous compilation failed:", err);
      }

      measureCountRef.current = 0;
      setCurrentMeasure(0);
    } catch (err) {
      console.error("Failed to apply preset:", err);
      throw err;
    }
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
    await applyPreset(p);
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

    // Migration: old shortcuts/symbols to new definitive ones
    if (inst && inst.type !== 'voice') {
      for (let i = 0; i < p.steps; i++) {
        let val = p.activeSteps[i];
        if (typeof val === 'string') {
          val = val.trim();
          
          // 1. Gonguê: GRV/grv/AIG/aig -> G/g/A/a
          if (inst.id === 'gongue') {
            if (val === 'GRV') val = 'G';
            else if (val === 'grv') val = 'g';
            else if (val === 'AIG') val = 'A';
            else if (val === 'aig') val = 'a';
          }
          
          // 2. Caixa & Tarol: rd/Rd -> R, re/Re/rg/rf -> r, x/c/f -> X/C/F
          if (inst.id === 'caixa' || inst.id === 'tarol') {
            if (val === 'rd' || val === 'Rd') val = 'R';
            else if (val === 're' || val === 'Re' || val === 'rg' || val === 'rf') val = 'r';
            else if (val === 'x') val = 'X';
            else if (val === 'c') val = 'C';
            else if (val === 'f') val = 'F';
          }
          
          // 3. Alfaias: x/c/i -> X/C/I
          if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
            if (val === 'x') val = 'X';
            else if (val === 'c') val = 'C';
            else if (val === 'i') val = 'I';
          }
          
          // 4. Agbê: s/v -> S/V
          if (inst.id === 'agbe') {
            if (val === 's') val = 'S';
            else if (val === 'v') val = 'V';
          }
          
          // 5. Mineiro: l -> L
          if (inst.id === 'mineiro') {
            if (val === 'l') val = 'L';
          }
          
          // 6. Barulho: any lowercase 'b' or alternate 't' / 'barulho' / 'tremblement' -> B
          if (['b', 't', 'barulho', 'tremblement'].includes(val.toLowerCase())) {
            val = 'B';
          }
          
          // 7. General E/e swap if G/g is found for hands-based instruments
          if (['caixa', 'tarol', 'marcante', 'meiao', 'repique', 'agbe'].includes(inst.id)) {
            if (val === 'G') val = 'E';
            else if (val === 'g') val = 'e';
          }
          
          p.activeSteps[i] = val;
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
    // Clear redo history when a new action is performed
    setTracksRedoHistory([]);
    setSongStructureRedoHistory([]);

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

    // Enregistrer l'état actuel dans l'historique de redo
    const currentTracksCloned = JSON.parse(JSON.stringify(tracks));
    setTracksRedoHistory(prev => [...prev, currentTracksCloned]);

    const currentStructureCloned = {
      measureTimeSigs: [...measureTimeSigsRef.current],
      measureBpms: [...measureBpmsRef.current],
      measureBpmTransitions: [...measureBpmTransitionsRef.current],
      measureVols: [...measureVolsRef.current],
      measureVolTransitions: [...measureVolTransitionsRef.current],
      songSections: JSON.parse(JSON.stringify(songSectionsRef.current))
    };
    setSongStructureRedoHistory(prev => [...prev, currentStructureCloned]);

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

  const handleRedo = () => {
    if (tracksRedoHistoryRef.current.length === 0) return;

    // Enregistrer l'état actuel dans l'historique d'undo
    const currentTracksCloned = JSON.parse(JSON.stringify(tracks));
    setTracksHistory(prev => [...prev, currentTracksCloned]);

    const currentStructureCloned = {
      measureTimeSigs: [...measureTimeSigsRef.current],
      measureBpms: [...measureBpmsRef.current],
      measureBpmTransitions: [...measureBpmTransitionsRef.current],
      measureVols: [...measureVolsRef.current],
      measureVolTransitions: [...measureVolTransitionsRef.current],
      songSections: JSON.parse(JSON.stringify(songSectionsRef.current))
    };
    setSongStructureHistory(prev => [...prev, currentStructureCloned]);

    setTracksRedoHistory(prev => {
      const nextHistory = [...prev];
      const nextState = nextHistory.pop();
      if (nextState) {
        setTracks(nextState);
      }
      return nextHistory;
    });

    if (songStructureRedoHistoryRef.current.length > 0) {
      setSongStructureRedoHistory(prev => {
        const nextHistory = [...prev];
        const nextState = nextHistory.pop();
        if (nextState) {
          setMeasureTimeSigs(nextState.measureTimeSigs);
          setMeasureBpms(nextState.measureBpms);
          setMeasureBpmTransitions(nextState.measureBpmTransitions);
          if (nextState.measureVols) setMeasureVols(nextState.measureVols);
          if (nextState.measureVolTransitions) setMeasureVolTransitions(nextState.measureVolTransitions);
          if (nextState.songSections) setSongSections(nextState.songSections);
        }
        return nextHistory;
      });
    }
  };

  // 3. User operations callbacks
  const handleTogglePlay = async () => {
    console.log("📣📣📣 [PLAY_BUTTON_TRIGGERED] handleTogglePlay called! Current state -> isPlaying: " + isPlaying + " | First step (currentStepIndexRef.current): " + currentStepIndexRef.current);
    await Tone.start();
    if (soloPatternPlayIdRef.current !== null) {
      setSoloPatternPlayId(null);
    }
    if (!isPlaying) {
      lastPlayedSignalIdRef.current = null;
      // Ensure Transport is running
      if (Tone.Transport.state !== 'started') {
        Tone.Transport.start();
      }
      console.log("🚀 [AUDIO ENGINE START] Starting audioEngine. Step index ref:", currentStepIndexRef.current);
      audioEngine?.start();
      setIsPlaying(true);
    } else {
      console.log("⏸️ [AUDIO ENGINE STOP] Stopping audioEngine.");
      audioEngine?.stop();
      engineTimeoutsRef.current.forEach(clearTimeout);
      engineTimeoutsRef.current = [];
      hitTriggersRef.current = [];
      Tone.Transport.pause();
      if (isRecordingVocal) {
        stopVocalRecording();
      }
      // Stop ongoing voice synthesizers decay and barulho loops
      audioEngine?.stopAllBarulho();
      instrumentsConfig.forEach((inst) => {
        if (voiceSynths[inst.id]) voiceSynths[inst.id].triggerRelease();
      });

      (Object.values(vocalPlayersRef.current) as any[]).forEach((player) => {
        try {
          player.stop();
        } catch (_) {}
      });
      setIsPlaying(false);
      window.dispatchEvent(new CustomEvent('baquemix-tick', {
        detail: { step: -1, measure: 0, maxTicks: 16 }
      }));
    }
  };

  // Keep event handler refs up to date on every render to prevent stale closures in keybindings
  const handleTogglePlayRef = useRef(handleTogglePlay);
  const handleUndoRef = useRef(handleUndo);
  const handleRedoRef = useRef(handleRedo);

  useEffect(() => {
    handleTogglePlayRef.current = handleTogglePlay;
    handleUndoRef.current = handleUndo;
    handleRedoRef.current = handleRedo;
  });

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
        handleTogglePlayRef.current();
      }

      const isUndoKey = (e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey;
      const isRedoKey = 
        ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey));
      
      if (isUndoKey) {
        e.preventDefault();
        handleUndoRef.current();
      } else if (isRedoKey) {
        e.preventDefault();
        handleRedoRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRewind = () => {
    if (soloPatternPlayIdRef.current !== null) {
      setSoloPatternPlayId(null);
    }
    audioEngine?.stop();
    engineTimeoutsRef.current.forEach(clearTimeout);
    engineTimeoutsRef.current = [];
    hitTriggersRef.current = [];
    Tone.Transport.stop();
    if (isRecordingVocal) {
      stopVocalRecording();
    }
    audioEngine?.stopAllBarulho();
    instrumentsConfig.forEach((inst) => {
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
    setCurrentMeasure(0);
    Tone.Transport.seconds = 0;
    lastPlayedSignalIdRef.current = null;
    window.dispatchEvent(new CustomEvent('baquemix-tick', {
      detail: { step: -1, measure: 0, maxTicks: 16 }
    }));
  };

  const handlePresetSelect = (value: string) => {
    setActivePresetName(value);
    loadFallbackPreset(value);
  };

  const handleSaveToLocal = async () => {
    const name = await promptAsync(t('promptName'));
    if (!name || name.trim() === '') return;
    
    const presetToSave: Preset = {
      bpm,
      timeSig,
      totalMeasures,
      tracks,
      letras,
      metadata,
      measureBpms,
      measureTimeSigs,
      measureBpmTransitions,
      measureVols,
      measureVolTransitions,
      songSections,
      measureSignals,
      masterEQ,
      masterCompressor
    };
    savePresetToLibrary(name.trim(), presetToSave);
    setLocalPresets(Object.keys(getLocalLibrary()));
  };

  const handleLoadLocalPreset = async (name: string) => {
    const lib = getLocalLibrary();
    const preset = lib[name];
    if (preset) {
      await applyPreset(preset);
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
    const isApito = instrumentsConfig[instIdx]?.id === 'apito';
    const newPattern: Pattern = {
      id: patternId,
      name: 'Padrão 1',
      steps: defaultSteps,
      activeSteps: Array(defaultSteps).fill(0),
      lyrics: Array(defaultSteps).fill(''),
      notes: Array(defaultSteps).fill(''),
      measureAssignments: Array(totalMeasures).fill(isApito ? false : true),
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

    const inst = instrumentsConfig[instIdx];
    if (inst && inst.type !== 'voice') {
      setActiveKeyboardInstrumentId(inst.id);
    }
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

  const handleTimeSigChange = async (selectValue: TimeSignature) => {
    setTimeSig(selectValue);
    setCurrentStepIndex(-1);
    measureCountRef.current = 0;
    setCurrentMeasure(0);

    let targetSteps = 16;
    if (selectValue === '3/4' || selectValue === '6/8') targetSteps = 12;
    if (selectValue === '2/4') targetSteps = 8;
    if (selectValue === '12/8') targetSteps = 24;

    const shouldResize = await confirmAsync(t('confirmResize'));
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
    setTracks(prev => prev.map((t) => (t.id === id ? { ...t, isMute: !t.isMute } : t)));
  };

  const handleTrackSoloToggle = (id: number) => {
    setTracks(prev => prev.map((t) => (t.id === id ? { ...t, isSolo: !t.isSolo } : t)));
  };

  const handleTrackHideToggle = (id: number) => {
    setTracks(prev => prev.map((t) => (t.id === id ? { ...t, isHidden: !t.isHidden } : t)));
  };

  const handleTrackDelete = (id: number) => {
    pushUndoState();
    setTracks(prev => {
      const remaining = prev.filter((t) => t.id !== id);
      updateRadii(remaining);
      return remaining;
    });
  };

  const handleTrackVolumeChange = (id: number, val: number) => {
    setTracks(prev => prev.map((t) => (t.id === id ? { ...t, volumeVal: val } : t)));
  };

  const handleTrackReverbChange = (id: number, val: number) => {
    setTracks(prev => prev.map((t) => (t.id === id ? { ...t, reverbVal: val } : t)));
  };

  const handleTrackStepVolumeChange = (trackId: number, patternId: number, stepIdx: number | number[], val: number) => {
    setTracks(prev => prev.map(t => {
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
    setTracks(prev => prev.map(t => {
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
    setTracks(prev => prev.map(t => {
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
    setTracks(prev => prev.map(t => {
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
    setTracks(prev => prev.map((t) => (t.id === id ? { ...t, panVal: val } : t)));
  };

  const handleTrackStepsChange = (trackId: number, patternId: number, targetSteps: number) => {
    pushUndoState();
    setTracks(prev =>
      prev.map((t) => {
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
    setTracks(prev => prev.map(t => ({
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
    setTracks(prev => prev.map(t => ({
      ...t,
      patterns: t.patterns.map(p => {
        const assign = [...p.measureAssignments];
        assign.splice(measureIdx, 1);
        return { ...p, measureAssignments: assign };
      })
    })));

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
    setTracks(prev => prev.map(t => ({
      ...t,
      patterns: t.patterns.map(p => {
        const assign = [...p.measureAssignments];
        assign.splice(measureIdx, 0, false);
        return { ...p, measureAssignments: assign };
      })
    })));

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
    audioEngine?.stop();
    Tone.Transport.stop();
    
    audioEngine?.stopAllBarulho();
    instrumentsConfig.forEach((inst) => {
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
    setCurrentMeasure(0);
    Tone.Transport.seconds = 0;
    lastPlayedSignalIdRef.current = null;

    // Start playback
    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
    }
    audioEngine?.start();
    setIsPlaying(true);
  };

  const handleStopSoloPattern = () => {
    setSoloPatternPlayId(null);
    handleTogglePlay(); // stop main loop and pause
  };

  const handleCopyPattern = (pattern: Pattern) => {
    setCopiedPattern(JSON.parse(JSON.stringify(pattern)));
  };

  const handlePastePattern = (trackId: number, patternId?: number) => {
    if (!copiedPattern) return;
    pushUndoState();
    
    // Deep copy to prevent shared object references
    const patternClone = JSON.parse(JSON.stringify(copiedPattern)) as Pattern;
    
    // Generate new unique ID
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const newName = `${patternClone.name || (lang === 'fr' ? 'Motif' : 'Padrão')} (${lang === 'fr' ? 'Copie' : 'Cópia'})`;
        
        const newPattern: Pattern = {
          ...patternClone,
          id: newId,
          name: newName,
          // Since it's a new pattern, it shouldn't be assigned to any measures in the timeline yet
          measureAssignments: Array(totalMeasures).fill(false)
        };
        
        return {
          ...t,
          patterns: [...t.patterns, newPattern],
          selectedPatternId: newId // Set the newly pasted pattern as selected
        };
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
    setCurrentMeasure(measureIdx % totalMeasures);
    currentStepIndexRef.current = tickIdx - 1; // -1 so the next loop cycle increments to tickIdx
    setCurrentStepIndex(tickIdx);
    maxTicksRef.current = currentTicks;

    const ratioVal = tickIdx / currentTicks;
    window.dispatchEvent(new CustomEvent('baquemix-tick', {
      detail: {
        step: tickIdx,
        measure: measureIdx % totalMeasures,
        maxTicks: currentTicks,
        ratio: ratioVal,
        visualStep16: Math.floor(ratioVal * 16),
        visualStep12: Math.floor(ratioVal * 12)
      }
    }));

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
  const handleTrackStepValueChange = (
    trackId: number,
    patternId: number,
    stepIdx: number | number[],
    val: string | string[],
    lyrics?: string[],
    notes?: string[]
  ) => {
    pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const inst = instrumentsConfig[t.instrumentIdx];

        const parseVal = (v: string): string | number => {
          if (!v) return 0;
          const cleanChar = v.slice(-1);
          let parsed: string | number = 0;
          if (v === '0') {
            parsed = 0;
          } else if (inst.colors[v] !== undefined && v !== 'text') {
            parsed = v;
          } else if (cleanChar && cleanChar.trim() !== '') {
            if (inst.type === 'gongue') {
              if (['G', 'g', 'A', 'a'].includes(cleanChar)) parsed = cleanChar;
              else if (['x', 'X'].includes(cleanChar)) parsed = 'X';
              else if (['b', 'B', 't'].includes(cleanChar)) parsed = 'B';
            } else if (inst.id === 'mineiro') {
              if (['P', 'p', 'T', 't'].includes(cleanChar)) parsed = cleanChar;
              else if (['l', 'L'].includes(cleanChar)) parsed = 'L';
              else if (['b', 'B'].includes(cleanChar)) parsed = 'B';
            } else if (inst.id === 'caixa') {
              const lowerChar = cleanChar.toLowerCase();
              if (cleanChar === 'r') parsed = 'r';
              else if (cleanChar === 'R') parsed = 'R';
              else if (lowerChar === 'x') parsed = 'X';
              else if (lowerChar === 'f') parsed = 'F';
              else if (lowerChar === 'c') parsed = 'C';
              else if (['b', 't'].includes(lowerChar)) parsed = 'B';
              else if (['d', 'D', 'e', 'E', 'q', 'Q'].includes(cleanChar)) {
                parsed = cleanChar;
              }
            } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
              const lowerChar = cleanChar.toLowerCase();
              if (lowerChar === 'x') parsed = 'X';
              else if (lowerChar === 'i') parsed = 'I';
              else if (lowerChar === 'c') parsed = 'C';
              else if (['b', 't'].includes(lowerChar)) parsed = 'B';
              else if (['d', 'D', 'e', 'E', 'q', 'Q'].includes(cleanChar)) {
                parsed = cleanChar;
              }
            } else if (inst.id === 'tarol') {
              const lowerChar = cleanChar.toLowerCase();
              if (cleanChar === 'r') parsed = 'r';
              else if (cleanChar === 'R') parsed = 'R';
              else if (lowerChar === 'x') parsed = 'X';
              else if (lowerChar === 'f') parsed = 'F';
              else if (lowerChar === 'c') parsed = 'C';
              else if (['b', 't'].includes(lowerChar)) parsed = 'B';
              else if (['d', 'D', 'e', 'E', 'q', 'Q'].includes(cleanChar)) {
                parsed = cleanChar;
              }
            } else if (inst.id === 'agbe') {
              const lowerChar = cleanChar.toLowerCase();
              if (lowerChar === 's') parsed = 'S';
              else if (lowerChar === 'v') parsed = 'V';
              else if (['b', 't'].includes(lowerChar)) parsed = 'B';
              else if (['d', 'D', 'e', 'E'].includes(cleanChar)) {
                parsed = cleanChar;
              }
            } else if (inst.id === 'apito') {
              if (['W', 'w'].includes(cleanChar)) parsed = cleanChar;
            } else {
              if (['D', 'E', 'd', 'e'].includes(cleanChar)) parsed = cleanChar;
            }
          }
          return getVisualStrokeSymbol(parsed, isLeftHanded, inst.id);
        };

        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            const copySteps = [...p.activeSteps];
            const arrLyrics = [...(p.lyrics || Array(p.steps).fill(''))];
            const arrNotes = [...(p.notes || Array(p.steps).fill(''))];

            if (Array.isArray(stepIdx)) {
              stepIdx.forEach((idx, i) => {
                const currentVal = Array.isArray(val) ? val[i] : val;
                copySteps[idx] = parseVal(currentVal);
                if (lyrics && lyrics[i] !== undefined) {
                  arrLyrics[idx] = lyrics[i];
                }
                if (notes && notes[i] !== undefined) {
                  arrNotes[idx] = notes[i];
                }
              });
            } else {
              const currentVal = Array.isArray(val) ? val[0] : val;
              copySteps[stepIdx] = parseVal(currentVal);
              if (lyrics && lyrics[0] !== undefined) {
                arrLyrics[stepIdx] = lyrics[0];
              }
              if (notes && notes[0] !== undefined) {
                arrNotes[stepIdx] = notes[0];
              }
            }
            return {
              ...p,
              activeSteps: copySteps,
              lyrics: arrLyrics,
              notes: arrNotes
            };
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
      ['d', 'D', 'p', 'P', 't', 'T', 'g', 'G', 'a', 'A', 'r', 'R', 'e', 'E', 'x', 'X', 'f', 'F', 'i', 'I', 's', 'S', 'c', 'C', 'w', 'W'].includes(key) &&
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
      
      // Calculate consecutive measures assigned to this pattern starting from measureIdx
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

      // Start MediaRecorder immediately to avoid startup latency cutting off the beginning
      if (mediaRecorder && mediaRecorder.state === 'inactive') {
        mediaRecorder.start();
        vocalRecordingStateRef.current = 'recording';
      } else {
        vocalRecordingStateRef.current = 'waiting';
      }

      setRecordingVocalPatternId(patternId);
      setIsRecordingVocal(true);
      
      await Tone.start();
      
      // Delay playhead start by 300ms to allow the recorder to fully arm and record silence
      vocalRecordArmTimeoutRef.current = setTimeout(() => {
        if (!isPlayingRef.current) {
          measureCountRef.current = measureIdx;
          currentStepIndexRef.current = -1;
          Tone.Transport.seconds = 0;
          lastPlayedSignalIdRef.current = null;
          if (Tone.Transport.state !== 'started') {
            Tone.Transport.start();
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

  const handlePatternNameChange = (trackId: number, patternId: number, name: string) => {
    pushUndoState();
    setTracks((prevTracks) => {
      return prevTracks.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          patterns: t.patterns.map((p) => {
            if (p.id === patternId) {
              return { ...p, name: name.trim() };
            }
            return p;
          }),
        };
      });
    });
  };

  const handleReorderPatterns = (trackId: number, patternId: number, direction: 'up' | 'down') => {
    pushUndoState();
    setTracks((prevTracks) => {
      return prevTracks.map((t) => {
        if (t.id !== trackId) return t;
        const index = t.patterns.findIndex((p) => p.id === patternId);
        if (index === -1) return t;
        const newPatterns = [...t.patterns];
        if (direction === 'up' && index > 0) {
          const temp = newPatterns[index];
          newPatterns[index] = newPatterns[index - 1];
          newPatterns[index - 1] = temp;
        } else if (direction === 'down' && index < newPatterns.length - 1) {
          const temp = newPatterns[index];
          newPatterns[index] = newPatterns[index + 1];
          newPatterns[index + 1] = temp;
        }
        return {
          ...t,
          patterns: newPatterns
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

  // Vocals inputs handlers
  const handleVoiceTypeToggle = (trackId: number, patternId: number, stepIdx: number) => {
    pushUndoState();
    setTracks(prev => prev.map(t => {
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
    setTracks(prev => prev.map(t => {
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
    setTracks(prev => prev.map(t => {
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
        setTracks(prev => prev.map(t => {
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
  const handleSaveState = async () => {
    const tracksCopy = JSON.parse(JSON.stringify(tracks));
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
      bpm,
      timeSig,
      version: 3,
      totalMeasures,
      tracks: tracksCopy,
      letras,
      metadata,
      measureTimeSigs,
      measureBpms,
      measureBpmTransitions,
      measureVols,
      measureVolTransitions,
      songSections,
      measureSignals,
      masterEQ,
      masterCompressor
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
    console.log("[BaqueMix] handleLoadState called for file:", file.name);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const resultText = evt.target?.result as string;
        const data = JSON.parse(resultText);
        await applyPreset(data);
        console.log("[BaqueMix] Preset applied successfully!");
      } catch (err: any) {
        console.error("[BaqueMix] Error loading preset file:", err);
        window.alert(`${t('invalidFile')}\n\nError details: ${err?.message || err}`);
      }
    };
    reader.onerror = () => {
      console.error("[BaqueMix] FileReader error:", reader.error);
      window.alert(`FileReader error: ${reader.error?.message || 'Unknown error'}`);
    };
    reader.readAsText(file);
  };

  async function handleShare() {
    // Note: vocal audio recordings are NOT included in the shared file —
    // they are device-local (stored in IndexedDB) and would make the file
    // several MB large. The recipient can record their own voice in BaqueMix.
    const tracksCopy = JSON.parse(JSON.stringify(tracks));
    // Strip any vocalAudioData that may be in memory (shouldn't be, but safety)
    tracksCopy.forEach((t: any) => t.patterns?.forEach((p: any) => { delete p.vocalAudioData; }));

    const cleanMetadata = metadata ? {
      ...metadata,
      partitionImage: undefined,
      rhythmSignals: metadata.rhythmSignals ? metadata.rhythmSignals.map(sig => ({
        ...sig,
        image: '' // Remove heavy base64 image data for sharing
      })) : undefined
    } : undefined;

    // Strip redundant per-measure arrays when all values are identical to defaults
    const defaultBpm = measureBpms[0] ?? bpm;
    const defaultTimeSig = measureTimeSigs[0] ?? timeSig;
    const defaultVol = measureVols[0] ?? 100;
    const allBpmsSame = measureBpms.every(v => v === defaultBpm);
    const allTimeSigsSame = measureTimeSigs.every(v => v === defaultTimeSig);
    const allVolsSame = measureVols.every(v => v === defaultVol);
    const allBpmTransSame = measureBpmTransitions.every(v => v === 'immediate');
    const allVolTransSame = measureVolTransitions.every(v => v === 'immediate');
    const hasSignals = (measureSignals || []).some(s => s !== null);

    const dataToSave: Preset = {
      bpm,
      timeSig,
      version: 3,
      totalMeasures,
      tracks: tracksCopy,
      letras,
      metadata: cleanMetadata,
      ...(allBpmsSame ? {} : { measureBpms }),
      ...(allTimeSigsSame ? {} : { measureTimeSigs }),
      ...(allVolsSame ? {} : { measureVols }),
      ...(allBpmTransSame ? {} : { measureBpmTransitions }),
      ...(allVolTransSame ? {} : { measureVolTransitions }),
      ...(songSections && songSections.length > 0 ? { songSections } : {}),
      ...(hasSignals ? { measureSignals } : {}),
      masterEQ,
      masterCompressor
    };

    try {
      const jsonStr = JSON.stringify(dataToSave);
      const compressed = LZString.compressToEncodedURIComponent(jsonStr);
      const shareUrl = `${window.location.origin}${window.location.pathname}?baque=${compressed}`;

      const isMobileOrTablet = /Mobi|Android|iPhone|iPad|Tablet/i.test(navigator.userAgent) ||
        ('ontouchstart' in window && navigator.maxTouchPoints > 0);

      let sharedNatively = false;

      // Try native text sharing (works on Android Chrome, iOS Safari)
      if (isMobileOrTablet && navigator.share) {
        try {
          const shareText = lang === 'pt'
            ? 'Abra no BaqueMix para jogar este ritmo de Maracatu!'
            : 'Ouvrez dans BaqueMix pour jouer ce rythme de Maracatu !';
          await navigator.share({
            title: metadata?.toada || 'BaqueMix',
            text: shareText,
            url: shareUrl
          });
          sharedNatively = true;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') {
            // User cancelled/closed the share sheet.
            return;
          }
          console.warn('Native share failed, falling back to clipboard copy', shareErr);
        }
      }

      if (!sharedNatively) {
        // Fallback: copy the magic link to clipboard
        await navigator.clipboard.writeText(shareUrl);
        window.alert(
          lang === 'pt'
            ? 'Link de compartilhamento copiado para a área de transferência!'
            : 'Lien de partage copié dans le presse-papiers !'
        );
      }
    } catch (e: any) {
      console.error('Failed to prepare or compress preset data for sharing', e);
      window.alert(
        lang === 'pt'
          ? 'Erro ao exportar o ritmo. Por favor, tente novamente.'
          : 'Erreur lors de l\'exportation du rythme. Veuillez réessayer.'
      );
    }
  }

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

  // Memoize pattern-to-track/inst mappings: only recompute when tracks, currentMeasure,
  // isPlaying or soloPatternPlayId change — NOT on every currentStepIndex tick (16x/sec)
  const activePatternIdByInst = useMemo(() => {
    const result: { [instIdx: number]: number | null } = {};
    tracks.forEach(t => {
      if (result[t.instrumentIdx] === undefined) {
        if (isPlaying) {
          const activePattern = t.patterns.find(p => p.measureAssignments[currentMeasure]);
          result[t.instrumentIdx] = activePattern ? activePattern.id : null;
        } else {
          result[t.instrumentIdx] = t.selectedPatternId;
        }
      }
    });
    return result;
  }, [tracks, currentMeasure, isPlaying]);

  const activePatternIdByTrack = useMemo(() => {
    const result: { [trackId: number]: number | null } = {};
    tracks.forEach(t => {
      if (soloPatternPlayId !== null) {
        const hasSoloPattern = t.patterns.some(p => p.id === soloPatternPlayId);
        result[t.id] = hasSoloPattern ? soloPatternPlayId : null;
      } else {
        const activePattern = t.patterns.find(p => p.measureAssignments[currentMeasure]);
        result[t.id] = activePattern ? activePattern.id : null;
      }
    });
    return result;
  }, [tracks, currentMeasure, soloPatternPlayId]);

  return (
    <div className="flex flex-col h-dvh text-[var(--cordel-text)] bg-[var(--cordel-bg)] overflow-hidden select-none font-sans relative">
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
        showInstallButton={!!deferredPrompt}
        onInstallClick={handleInstallClick}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        preset={activePresetName}
        presetFiles={presetFiles}
        onPresetChange={handlePresetSelect}
        onShare={handleShare}
        onClear={() => {
          pushUndoState();
          setTracks([]);
          setLetras('');
          setMeasureSignals([]);
          setMetadata({ toada: '', nacao: '', compositor: '', ritmo: '', youtubeUrl: '', partitionImage: undefined, rhythmSignals: [] });
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
        onRedo={handleRedo}
        canRedo={tracksRedoHistory.length > 0}
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
        version={CURRENT_VERSION}
      />

      {/* Main Workspace workspace containing expanding grids layouts */}
      <div id="main-workspace" className="flex flex-grow overflow-hidden relative w-full h-[calc(100dvh-130px)] mobile-stack cordel-bg">
        {viewMode === 'roda' && (
          <>
            {/* Left column tracks mixers */}
            {(!isMobile || mobileTab === 'mixer') && (
              <Mixer
                lang={lang}
                isLeftHanded={isLeftHanded}
                tracks={tracks}
                meters={meters}
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
                  setTracks(prev => prev.map(t => t.id === trackId ? { ...t, selectedPatternId: patternId } : t));
                }}
                onPatternAssign={(trackId, patternId, measureIdx, val) => {
                  setTracks(prev => prev.map(t => {
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
                  setTracks(prev => prev.map(t => {
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
                  setTracks(prev => prev.map(t => {
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
                onReorderPatterns={handleReorderPatterns}
              />
            )}

            {/* Center circle visual canvas engine */}
            {(!isMobile || mobileTab === 'roda') && (
              <CircleSequencer
                lang={lang}
                tracks={tracks}
                isPlaying={isPlaying}
                currentStepIndex={currentStepIndex}
                currentMeasure={currentMeasure}
                maxTicks={getMaxTicks(measureTimeSigs[currentMeasure] || timeSig)}
                timeSig={measureTimeSigs[currentMeasure] || timeSig}
                totalMeasures={totalMeasures}
                onTogglePlay={handleTogglePlay}
                onStepChange={handleStepValueSelectAndToggle}
                langPromptVoiceText={t('promptVoice')}
                isMetroOn={isMetroOn}
                activePatternIdByTrack={activePatternIdByTrack}
                soloPatternPlayId={soloPatternPlayId}
                hitTriggersRef={hitTriggersRef}
                bpm={bpm}
                measureBpms={measureBpms}
                measureVols={measureVols}
                isMobile={isMobile}
                isLeftHanded={isLeftHanded}
                onNavigateMeasure={(measureIdx) => handleTimelineNavigate(measureIdx, 0, 16)}
                activeSignal={(() => {
                  const sigId = measureSignals[currentMeasure];
                  if (!sigId) return null;
                  const sig = (metadata?.rhythmSignals || []).find(s => s.id === sigId);
                  return sig || null;
                })()}
                measureSignals={measureSignals}
                rhythmSignals={metadata?.rhythmSignals || []}
                songSections={songSections}
              />
            )}
          </>
        )}
        {viewMode === 'console' && (
          <div className="flex-1 min-w-0 flex flex-col h-full overflow-x-auto overflow-y-hidden custom-scrollbar">
            <ConsoleMixer
              activeInstrumentId={activeKeyboardInstrumentId}
              onActiveInstrumentChange={setActiveKeyboardInstrumentId}
              isMobile={isMobile}
              lang={lang}
              meters={meters}
              masterMeter={masterMeterNode}
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
              currentMeasure={currentMeasure}
              maxTicks={getMaxTicks(timeSig)}
              timeSig={timeSig}
              totalMeasures={totalMeasures}
              onReverbChange={handleTrackReverbChange}
              onStepVolumeChange={handleTrackStepVolumeChange}
              onStepDecayChange={handleTrackStepDecayChange}
              onStepMicrotimingChange={handleTrackStepMicrotimingChange}
              onResetMicrotimings={handleResetTrackMicrotimings}
              isSwingOn={isSwingOn}
              masterVol={masterVol}
              onMasterVolChange={(val) => setMasterVol(val)}
              masterEQ={masterEQ}
              onMasterEQChange={setMasterEQ}
              masterCompressor={masterCompressor}
              onMasterCompressorChange={setMasterCompressor}
              onTrackSelectPattern={(trackId, patternId) => {
                setTracks(prev => prev.map(t => t.id === trackId ? { ...t, selectedPatternId: patternId } : t));
              }}
              onPatternNameChange={handlePatternNameChange}
              onReorderPatterns={handleReorderPatterns}
              onPatternAssign={(trackId, patternId, measureIdx, val) => {
                pushUndoState();
                setTracks(prev => prev.map(t => {
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
                setTracks(prev => prev.map(t => {
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
                setTracks(prev => prev.map(t => {
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
              onVocalBpmSyncToggle={handleVocalBpmSyncToggle}
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
            currentMeasure={currentMeasure}
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
            measureSignals={measureSignals}
            onMeasureSignalChange={(mIdx, sigId) => {
              setMeasureSignals(prev => {
                const arr = [...prev];
                while (arr.length <= mIdx) arr.push(null);
                arr[mIdx] = sigId;
                return arr;
              });
            }}
            rhythmSignals={metadata?.rhythmSignals || []}
          />
        )}

        {viewMode === 'quiz' && (
          <QuizEngine
            lang={lang}
            onExit={() => setViewMode('roda')}
            onSuccess={() => unlockBooklet('folheto_quiz')}
          />
        )}

        {viewMode === 'dictee' && (
          <DicteeEngine
            lang={lang}
            onExit={() => setViewMode('roda')}
            onSuccess={() => unlockBooklet('folheto_dictee')}
          />
        )}

        {viewMode === 'inspecteur' && (
          <InspecteurEngine
            lang={lang}
            onExit={() => setViewMode('roda')}
            caixaParfaite={inspecteurCaixaParfaite}
            caixaErreur={inspecteurCaixaErreur}
            onSuccess={() => unlockBooklet('folheto_inspecteur')}
          />
        )}

        {viewMode === 'mestre' && (
          <MestreEngine
            lang={lang}
            onExit={() => setViewMode('roda')}
            rhythmState={mestreRhythmState}
            setRhythmState={setMestreRhythmState}
            onSuccess={() => unlockBooklet('folheto_mestre')}
          />
        )}

        {viewMode === 'rythmelive' && (
          <RythmeLiveEngine
            lang={lang}
            onExit={() => setViewMode('roda')}
            onSuccess={() => unlockBooklet('folheto_rythmelive')}
          />
        )}

        {viewMode === 'varal' && (
          <VaralCordel
            lang={lang}
            onExit={() => setViewMode('roda')}
            unlockedFolhetos={unlockedFolhetos}
            justUnlockedBookletId={justUnlockedBookletId}
            onClearJustUnlocked={() => setJustUnlockedBookletId(null)}
          />
        )}

        {viewMode === 'studio' && (
          <MestreStudio
            lang={lang}
            onExit={() => setViewMode('roda')}
          />
        )}

        {/* Right drawer sidebar context panel */}
        {viewMode !== 'quiz' && viewMode !== 'dictee' && viewMode !== 'inspecteur' && viewMode !== 'mestre' && viewMode !== 'rythmelive' && viewMode !== 'varal' && viewMode !== 'studio' && (!isMobile || (viewMode === 'roda' && mobileTab === 'toada')) && (
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
            onMetadataChange={(newMeta) => {
              setMetadata(newMeta);
              // Si les signaux changent, nettoyer les assignations orphelines
              if (newMeta.rhythmSignals !== metadata?.rhythmSignals) {
                const validIds = new Set((newMeta.rhythmSignals || []).map((s: RhythmSignal) => s.id));
                setMeasureSignals(prev => prev.map(id => (id && validIds.has(id)) ? id : null));
              }
            }}
            onExtractLyrics={handleExtractLyrics}
            currentPlayState={isPlaying ? {
              stepIndex: currentStepIndex,
              maxTicks: getMaxTicks(timeSig),
              activePatternIdByInst,
            } : null}
            totalMeasures={totalMeasures}
            whistleVol={whistleVol}
            onWhistleVolChange={(val) => {
              setWhistleVol(val);
              localStorage.setItem('baquemix_whistle_vol', String(val));
            }}
            bpm={bpm}
            beatsPerMeasure={parseInt(timeSig.split('/')[0]) || 4}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onAudioPatternCreated={handleAudioPatternCreated}
          />
        )}
      </div>

      {/* Mobile view Tab Bar (Roda, Mixeur, Toada) */}
      {isMobile && viewMode === 'roda' && (
        <div className="flex w-full bg-[var(--cordel-bg)] border-t-2 border-[var(--cordel-border)] h-12 shrink-0 z-40 text-[var(--cordel-text)]">
          <button
            onClick={() => setMobileTab('roda')}
            className={`flex-1 font-cactus font-bold text-xs flex flex-col items-center justify-center border-r border-[var(--cordel-border)] cursor-pointer ${
              mobileTab === 'roda' ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
            }`}
          >
            <span className="text-sm">⭕</span>
            <span className="text-[9px] uppercase tracking-wider mt-0.5 font-bold">Roda</span>
          </button>
          <button
            onClick={() => setMobileTab('mixer')}
            className={`flex-1 font-cactus font-bold text-xs flex flex-col items-center justify-center border-r border-[var(--cordel-border)] cursor-pointer ${
              mobileTab === 'mixer' ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
            }`}
          >
            <span className="text-sm">🎛️</span>
            <span className="text-[9px] uppercase tracking-wider mt-0.5 font-bold">{lang === 'pt' ? 'Mixador' : 'Mixeur'}</span>
          </button>
          <button
            onClick={() => setMobileTab('toada')}
            className={`flex-1 font-cactus font-bold text-xs flex flex-col items-center justify-center cursor-pointer ${
              mobileTab === 'toada' ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
            }`}
          >
            <span className="text-sm">📝</span>
            <span className="text-[9px] uppercase tracking-wider mt-0.5 font-bold font-cactus">Toada</span>
          </button>
        </div>
      )}

      {viewMode !== 'quiz' && viewMode !== 'dictee' && viewMode !== 'inspecteur' && viewMode !== 'mestre' && viewMode !== 'rythmelive' && viewMode !== 'varal' && viewMode !== 'studio' && (
        <TransportBar
          viewMode={viewMode as any}
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
          reverbType={reverbType}
          onReverbTypeChange={setReverbType}
          isLeftHanded={isLeftHanded}
          onLeftHandedToggle={() => setIsLeftHanded(!isLeftHanded)}
        />
      )}
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
          isLeftHanded={isLeftHanded}
        />
      )}

      {/* Autosave status indicator */}
      <div
        className={`fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-[11px] font-bold border-2 border-[var(--cordel-border)] shadow-[2px_2px_0_var(--cordel-border)] transition-all duration-300 pointer-events-none ${
          isSavedIndicatorVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
        <span>{lang === 'pt' ? 'Salvo' : 'Sauvegardé'}</span>
      </div>

      {/* Custom Cordel Dialog Overlay */}
      {customDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 select-none">
          <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] shadow-[6px_6px_0px_var(--cordel-border)] p-6 max-w-sm w-full flex flex-col gap-4 font-cactus">
            <h3 className="font-cactus font-black text-sm uppercase tracking-wider border-b-2 border-dashed border-[var(--cordel-border)] pb-2 select-none">
              {customDialog.type === 'alert' ? '📢 Info' : customDialog.type === 'confirm' ? '❓' : '📝'} {customDialog.type === 'alert' ? (lang === 'pt' ? 'Aviso' : 'Information') : customDialog.type === 'confirm' ? (lang === 'pt' ? 'Confirmação' : 'Confirmation') : (lang === 'pt' ? 'Entrada' : 'Saisie')}
            </h3>
            
            <p className="text-xs leading-relaxed">{customDialog.message}</p>
            
            {customDialog.type === 'prompt' && (
              <input
                id="custom-dialog-input"
                type="text"
                defaultValue={customDialog.defaultValue}
                className="bg-transparent border-b-2 border-[var(--cordel-border)] py-1 text-xs font-bold font-cactus outline-none text-[var(--cordel-text)]"
                autoFocus
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.currentTarget as HTMLInputElement).value;
                    customDialog.onResolve(val);
                    setCustomDialog(null);
                  }
                }}
              />
            )}
            
            <div className="flex justify-end gap-3 mt-2">
              {customDialog.type !== 'alert' && (
                <button
                  onClick={() => {
                    customDialog.onResolve(customDialog.type === 'prompt' ? null : false);
                    setCustomDialog(null);
                  }}
                  className="px-3 py-1.5 border border-[var(--cordel-border)] text-xs font-bold hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer"
                >
                  {lang === 'pt' ? 'Cancelar' : 'Annuler'}
                </button>
              )}
              <button
                onClick={() => {
                  if (customDialog.type === 'prompt') {
                    const input = document.getElementById('custom-dialog-input') as HTMLInputElement;
                    customDialog.onResolve(input?.value || '');
                  } else {
                    customDialog.onResolve(true);
                  }
                  setCustomDialog(null);
                }}
                className="px-4 py-1.5 bg-[var(--cordel-border)] text-[var(--cordel-bg)] text-xs font-black hover:opacity-90 cursor-pointer"
              >
                {lang === 'pt' ? 'Confirmar' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
