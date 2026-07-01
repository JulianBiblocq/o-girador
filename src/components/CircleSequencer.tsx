/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '@/src/ToneLoader';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}
import { TrackGroup, Language, HitTrigger, TimeSignature, SongSection, SongMarker, CloudRhythmSignal } from '../types';
import { instrumentsConfig, getMarkers, ASSETS_BASE_URL, isDarkText, getVisualStrokeSymbol, i18n } from '../data';
import { getNextStepValue } from './InstrumentDetailEditor';
import { useGameData } from '../contexts/GameDataContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';

interface CircleSequencerProps {
  lang?: Language;
  isLeftHanded?: boolean;
  tracks?: TrackGroup[];
  isPlaying?: boolean;

  currentMeasure?: number;
  maxTicks?: number;
  timeSig?: TimeSignature;
  onTogglePlay?: () => void;
  onStepChange?: (trackId: number, patternId: number, stepIdx: number, newState: string | number, lyric?: string, note?: string) => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  langPromptVoiceText?: string;
  isMetroOn?: boolean;
  activeCircleIdByInst?: { [instIdx: number]: number | null };
  totalMeasures?: number;
  activePatternIdByTrack?: Record<number, number | null>;
  hitTriggersRef?: React.MutableRefObject<HitTrigger[]>;
  bpm?: number;
  measureBpms?: number[];
  measureVols?: number[];
  isMobile?: boolean;
  onNavigateMeasure?: (measureIdx: number) => void;
  activeSignal?: { id: string; name: string; image: string } | null;
  soloPatternPlayId?: number | null;
  measureSignals?: (string | null)[];
  rhythmSignals?: { id: string; name: string; image: string }[];
  mestreSignals?: CloudRhythmSignal[];
  songSections?: SongSection[];
  circleId?: number;
  measureIndex?: number;
  trackId?: number;
}

export const CircleSequencer: React.FC<CircleSequencerProps> = (props) => {
  const sequencer = useSequencer();
  const audio = useAudio();

  // Extract identity props even if unused to maintain interface consistency
  const { circleId, measureIndex, trackId } = props;

  const isMobile = props.isMobile !== undefined ? props.isMobile : false;

  const lang = props.lang !== undefined ? props.lang : sequencer.lang;
  const isLeftHanded = props.isLeftHanded !== undefined ? props.isLeftHanded : sequencer.isLeftHanded;
  const tracksFromStore = useSequencerStore(state => state.tracks);
  const tracks = props.tracks !== undefined ? props.tracks : tracksFromStore;
  const totalMeasuresFromStore = useSequencerStore(state => state.totalMeasures);
  const totalMeasures = props.totalMeasures !== undefined ? props.totalMeasures : totalMeasuresFromStore;
  const bpm = props.bpm !== undefined ? props.bpm : sequencer.bpm;
  const measureBpms = props.measureBpms !== undefined ? props.measureBpms : sequencer.measureBpms;
  const measureVols = props.measureVols !== undefined ? props.measureVols : sequencer.measureVols;
  const measureSignals = props.measureSignals !== undefined ? props.measureSignals : (sequencer.measureSignals || []);
  const songSectionsFromStore = useSequencerStore(state => state.songSections);
  const songSections = props.songSections !== undefined ? props.songSections : (songSectionsFromStore || []);

  const isPlaying = props.isPlaying !== undefined ? props.isPlaying : audio.isPlaying;
  const currentStepRef = useRef<number>(-1);

  useEffect(() => {
    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number }>;
      currentStepRef.current = customEvent.detail.step;
    };
    window.addEventListener('o-girador-tick', handleTick);
    return () => window.removeEventListener('o-girador-tick', handleTick);
  }, []);
  const globalCurrentMeasure = useSequencerStore(state => state.currentMeasure);
  const measureTimeSigs = useSequencerStore(state => state.measureTimeSigs);
  const currentMeasure = props.currentMeasure !== undefined ? props.currentMeasure : globalCurrentMeasure;
  const isMetroOn = props.isMetroOn !== undefined ? props.isMetroOn : audio.isMetroOn;
  const soloPatternPlayId = props.soloPatternPlayId !== undefined ? props.soloPatternPlayId : audio.soloPatternPlayId;
  const hitTriggersRef = props.hitTriggersRef !== undefined ? props.hitTriggersRef : audio.hitTriggersRef;

  const metadata = sequencer.metadata;
  const rhythmSignals = props.rhythmSignals !== undefined ? props.rhythmSignals : (metadata?.rhythmSignals || []);
  const mestreSignals = props.mestreSignals !== undefined ? props.mestreSignals : [];

  const maxTicks = props.maxTicks !== undefined ? props.maxTicks : audio.maxTicksRef.current;
  const timeSig = props.timeSig !== undefined ? props.timeSig : (measureTimeSigs[currentMeasure] || sequencer.timeSig);

  const onTogglePlay = props.onTogglePlay !== undefined ? props.onTogglePlay : audio.handleTogglePlay;
  const onNavigateMeasure = props.onNavigateMeasure !== undefined ? props.onNavigateMeasure : ((mIdx: number) => audio.handleTimelineNavigate(mIdx, 0, 16));
  const onStepChange = props.onStepChange !== undefined ? props.onStepChange : sequencer.handleStepValueSelectAndToggle;
  const onStepTouchStart = props.onStepTouchStart;

  const t = (key: string) => (i18n[lang] as any)[key] || key;
  const langPromptVoiceText = props.langPromptVoiceText !== undefined ? props.langPromptVoiceText : t('promptVoice');

  // Compute activePatternIdByTrack
  const activePatternIdByTrack = props.activePatternIdByTrack !== undefined ? props.activePatternIdByTrack : (() => {
    const result: { [trackId: number]: number | null } = {};
    (tracks || []).forEach(track => {
      if (soloPatternPlayId !== null && soloPatternPlayId !== undefined) {
        const hasSoloPattern = track.patterns.some(p => p.id === soloPatternPlayId);
        result[track.id] = hasSoloPattern ? soloPatternPlayId : null;
      } else {
        const activePattern = track.patterns.find(p => p.measureAssignments[currentMeasure]);
        result[track.id] = activePattern ? activePattern.id : null;
      }
    });
    return result;
  })();

  const activeCircleIdByInst = props.activeCircleIdByInst !== undefined ? props.activeCircleIdByInst : (() => {
    const result: { [instIdx: number]: number | null } = {};
    (tracks || []).forEach(track => {
      const pId = activePatternIdByTrack[track.id];
      result[track.instrumentIdx] = pId;
    });
    return result;
  })();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const measureDisplayRef = useRef<HTMLSpanElement>(null);
  const centerOverlayRef = useRef<HTMLDivElement>(null);
  const [isCenterShaking, setIsCenterShaking] = useState(false);

  const livePlaybackRef = useRef({
    step: -1,
    measure: 0,
    maxTicks: 96,
    ratio: 0,
  });

  if (!tracks) return null;

  const updateOverlay = (measureIdx: number) => {
    const container = centerOverlayRef.current;
    if (!container) return;

    const {
      measureSignals: currentMeasureSignals,
      rhythmSignals: currentRhythmSignals,
      mestreSignals: currentMestreSignals,
      songMarkers: currentSongMarkers,
    } = stateRef.current;

    // 1. Resolve active signal (visible only on the measure it's set)
    const sigId = currentMeasureSignals?.[measureIdx] || null;
    let activeSig: { name: string; image: string } | null = null;
    if (sigId) {
      const cloudSig = currentMestreSignals?.find(s => s.id === sigId);
      if (cloudSig) {
        activeSig = { name: cloudSig.name, image: cloudSig.imageUrl };
      } else {
        const localSig = currentRhythmSignals?.find(s => s.id === sigId);
        if (localSig) activeSig = { name: localSig.name, image: localSig.image };
      }
    }

    // 2. Resolve active marker (last crossed marker)
    let activeMarker: SongMarker | null = null;
    if (currentSongMarkers && currentSongMarkers.length > 0) {
      for (const marker of currentSongMarkers) {
        if (marker.measure <= measureIdx) {
          if (!activeMarker || marker.measure > activeMarker.measure) {
            activeMarker = marker;
          }
        }
      }
    }

    const afficheurEl = container.querySelector('#center-afficheur') as HTMLDivElement;
    const imgEl = container.querySelector('#center-overlay-img') as HTMLImageElement;
    const tintEl = container.querySelector('#center-overlay-tint') as HTMLDivElement;
    const textEl = container.querySelector('#center-overlay-text') as HTMLSpanElement;

    if (activeSig) {
      if (imgEl) {
        imgEl.src = activeSig.image;
        imgEl.alt = activeSig.name;
        imgEl.style.display = 'block';
      }
      if (tintEl) tintEl.style.display = 'block';
      if (afficheurEl) afficheurEl.style.backgroundColor = 'transparent';

      if (textEl) {
        textEl.innerText = activeSig.name;
        textEl.style.color = '#ffffff';
        textEl.style.textShadow = '0 1px 3px rgba(0,0,0,0.9)';
        
        // Font size adaptation based on length
        const len = activeSig.name.length;
        if (len <= 6) {
          textEl.style.fontSize = 'clamp(9px, 1.8vw, 16px)';
        } else if (len <= 12) {
          textEl.style.fontSize = 'clamp(8px, 1.4vw, 12px)';
        } else {
          textEl.style.fontSize = 'clamp(7px, 1.1vw, 9px)';
        }
      }
      container.style.opacity = '0.85';
    } else if (activeMarker) {
      if (imgEl) imgEl.style.display = 'none';
      if (tintEl) tintEl.style.display = 'none';
      if (afficheurEl) {
        afficheurEl.style.backgroundColor = activeMarker.color || '#f19066';
      }

      if (textEl) {
        textEl.innerText = activeMarker.name;
        textEl.style.color = '#1a1a1a';
        textEl.style.textShadow = 'none';
        
        // Font size adaptation based on length
        const len = activeMarker.name.length;
        if (len <= 6) {
          textEl.style.fontSize = 'clamp(9px, 1.8vw, 16px)';
        } else if (len <= 12) {
          textEl.style.fontSize = 'clamp(8px, 1.4vw, 12px)';
        } else {
          textEl.style.fontSize = 'clamp(7px, 1.1vw, 9px)';
        }
      }
      container.style.opacity = '0.85';
    } else {
      if (imgEl) imgEl.style.display = 'none';
      if (tintEl) tintEl.style.display = 'none';
      if (textEl) {
        textEl.innerText = '';
        textEl.style.textShadow = 'none';
      }
      if (afficheurEl) afficheurEl.style.backgroundColor = 'transparent';
      container.style.opacity = '0';
    }
  };

  useEffect(() => {
    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number; measure: number; maxTicks: number; ratio?: number; time?: number }>;
      const { step, measure, maxTicks, ratio = step / maxTicks } = customEvent.detail;
      
      livePlaybackRef.current = {
        step,
        measure,
        maxTicks,
        ratio,
      };

      if (measureDisplayRef.current) {
        measureDisplayRef.current.innerText = `${measure + 1} / ${totalMeasures}`;
      }

      updateOverlay(measure);
    };

    window.addEventListener('o-girador-tick', handleTick);
    return () => {
      window.removeEventListener('o-girador-tick', handleTick);
    };
  }, [totalMeasures]);

  useEffect(() => {
    const live = livePlaybackRef.current;
    const measureIdx = isPlaying && live.step >= 0 ? live.measure : currentMeasure;
    updateOverlay(measureIdx);
  }, [currentMeasure, isPlaying, measureSignals, rhythmSignals, mestreSignals, songSections, useSequencerStore.getState().songMarkers]);

  useEffect(() => {
    let timerId: any = null;
    const handleApitoShake = () => {
      if (timerId) clearTimeout(timerId);
      setIsCenterShaking(true);
      timerId = setTimeout(() => {
        setIsCenterShaking(false);
      }, 300);
    };

    window.addEventListener('o-girador-apito-shake', handleApitoShake);
    return () => {
      window.removeEventListener('o-girador-apito-shake', handleApitoShake);
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  const getLiveActivePatternId = (track: TrackGroup): number | null => {
    const live = livePlaybackRef.current;
    const state = stateRef.current;
    const measureIdx = (live && live.step >= 0) ? live.measure : currentMeasure;

    const soloPlayId = state.soloPatternPlayId;
    if (soloPlayId !== undefined && soloPlayId !== null) {
      for (let i = 0; i < track.patterns.length; i++) {
        if (track.patterns[i].id === soloPlayId) {
          return soloPlayId;
        }
      }
      return null;
    }

    for (let i = 0; i < track.patterns.length; i++) {
      if (track.patterns[i].measureAssignments[measureIdx]) {
        return track.patterns[i].id;
      }
    }
    return null;
  };

  // Use refs in the animation loop to avoid stale closure issues
  const stateRef = useRef({
    tracks,
    isPlaying,
    currentStepIndex: currentStepRef.current,
    currentMeasure,
    maxTicks,
    timeSig,
    lang,
    isMetroOn,
    activeCircleIdByInst,
    totalMeasures,
    activePatternIdByTrack,
    hitTriggersRef,
    bpm,
    measureBpms,
    measureVols,
    isMobile,
    soloPatternPlayId,
    measureSignals,
    rhythmSignals,
    mestreSignals,
    songSections,
    isLeftHanded,
  });

  useEffect(() => {
    stateRef.current = {
      tracks,
      isPlaying,
      currentStepIndex: currentStepRef.current,
      currentMeasure,
      maxTicks,
      timeSig,
      lang,
      isMetroOn,
      activeCircleIdByInst,
      totalMeasures,
      activePatternIdByTrack,
      hitTriggersRef,
      bpm,
      measureBpms,
      measureVols,
      isMobile,
      soloPatternPlayId,
      measureSignals,
      rhythmSignals,
      mestreSignals,
      songSections,
      isLeftHanded,
      songMarkers: useSequencerStore.getState().songMarkers
    };
  }, [tracks, isPlaying, currentMeasure, maxTicks, timeSig, lang, isMetroOn, activeCircleIdByInst, totalMeasures, activePatternIdByTrack, hitTriggersRef, bpm, measureBpms, measureVols, isMobile, soloPatternPlayId, measureSignals, rhythmSignals, mestreSignals, songSections, useSequencerStore.getState().songMarkers, isLeftHanded]);

  // Handle click on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Translate click to real coordinate system of size 1200 x 1200
    const mouseX = (e.clientX - rect.left) * (1200 / rect.width);
    const mouseY = (e.clientY - rect.top) * (1200 / rect.height);

    const centerX = 600;
    const centerY = 600;
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Toggle Play when clicking center area
    if (distance < 55) {
      if (audio.isLoading) return;
      onTogglePlay();
      return;
    }

    const currentTracks = stateRef.current.tracks;

    // Detect click on any track
    currentTracks.forEach((track) => {
      const inst = instrumentsConfig[track.instrumentIdx];
      if (!inst) return null;
      if (track.isHidden || inst?.id === 'apito') return;
      
      const hasSolo = currentTracks.some(t => t.isSolo);
      const isMutedOut = hasSolo ? !track.isSolo : track.isMute;
      if (isMutedOut) return;
      
      const activePatternId = getLiveActivePatternId(track);
      if (activePatternId === null) return;
      const activePattern = track.patterns.find(p => p.id === activePatternId);
      if (!activePattern) return;

      if (Math.abs(distance - (track.radius || 0)) < 18) {
        let clickAngle = Math.atan2(dy, dx) + Math.PI / 2;
        if (clickAngle < 0) clickAngle += Math.PI * 2;

        const stepAngleSize = (Math.PI * 2) / activePattern.steps;

        for (let i = 0; i < activePattern.steps; i++) {
          const targetAngle = i * stepAngleSize;
          let angleDiff = Math.abs(clickAngle - targetAngle);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

          // Inside target step hitbox
          if (angleDiff < stepAngleSize / 2) {
            const inst = instrumentsConfig[track.instrumentIdx];
      if (!inst) return null;
            const currentVal = activePattern.activeSteps[i];

            if (inst.type === 'voice') {
              // Dialog prompt to customize vocals
              const currentNote = (activePattern.notes && activePattern.notes[i]) ? activePattern.notes[i] + ':' : '';
              const lyricPrompt = currentNote + (currentVal === 'P' ? '*' : '') + (activePattern.lyrics[i] || '');
              const typed = window.prompt(langPromptVoiceText, lyricPrompt);

              if (typed !== null) {
                const trimmed = typed.trim();
                if (trimmed === '') {
                  onStepChange(track.id, activePattern.id, i, 0, '', '');
                } else {
                  let parsedNote = '';
                  let parsedSyllable = trimmed;

                  if (trimmed.includes(':')) {
                    const parts = trimmed.split(':');
                    parsedNote = parts[0].trim();
                    parsedSyllable = parts[1].trim();
                    if (/^[a-gA-G][#b]?$/.test(parsedNote)) {
                      parsedNote += '4';
                    }
                  }

                  let activeType = 'C';
                  if (parsedSyllable.startsWith('*')) {
                    activeType = 'P';
                    parsedSyllable = parsedSyllable.substring(1).substring(0, 15);
                  } else {
                    parsedSyllable = parsedSyllable.substring(0, 15);
                  }

                  onStepChange(track.id, activePattern.id, i, activeType, parsedSyllable, parsedNote.toUpperCase());
                }
              }
            } else {
              if (onStepTouchStart) {
                onStepTouchStart(
                  e,
                  activePattern.id,
                  i,
                  inst.id,
                  currentVal,
                  (nextVal) => {
                    onStepChange(track.id, activePattern.id, i, nextVal);
                  }
                );
              } else {
                const visualVal = getVisualStrokeSymbol(currentVal, stateRef.current.isLeftHanded || false, inst.id);
                const nextVisualVal = getNextStepValue(inst.id, inst.type, visualVal);
                const nextSemanticVal = getVisualStrokeSymbol(nextVisualVal, stateRef.current.isLeftHanded || false, inst.id);
                onStepChange(track.id, activePattern.id, i, nextSemanticVal);
              }
            }
            return;
          }
        }
      }
    });
  };

  // Canvas render animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 1200;
    bgCanvas.height = 1200;
    const bgCtx = bgCanvas.getContext('2d');
    let currentCanvasSize = 1200;
    let isBgCached = false;
    let lastTimeSig = '';
    let lastTicks = -1;

    let animId: number;
    let flashAlpha = 0;
    let stickAngle = -Math.PI / 2;
    let lastFlashBeat = -1;

    const instrumentTotals: Record<number, number> = {};
    const instrumentIndexes: Record<number, number> = {};

    interface Ripple {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      alpha: number;
      color: string;
      speed: number;
    }
    let ripples: Ripple[] = [];

    // Cache theme colors to avoid layout reflows from calling getComputedStyle in the 60fps drawLoop
    let themeBg = '#f4ecd8';
    let themeText = '#1a1a1a';
    let themeBorder = '#1a1a1a';
    let themeWood = '#8b2a1a';

    const updateThemeColors = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      themeBg = computedStyle.getPropertyValue('--cordel-bg').trim() || '#f4ecd8';
      themeText = computedStyle.getPropertyValue('--cordel-text').trim() || '#1a1a1a';
      themeBorder = computedStyle.getPropertyValue('--cordel-border').trim() || '#1a1a1a';
      themeWood = computedStyle.getPropertyValue('--cordel-wood').trim() || '#8b2a1a';
      isBgCached = false;
    };

    updateThemeColors();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          updateThemeColors();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    let lastDrawTime = performance.now();

    const drawLoop = () => {
      const time = performance.now();
      const isEco = !!(window as any).oGiradorEcoMode;
      const targetSize = isEco ? 600 : 1200;
      
      if (currentCanvasSize !== targetSize) {
        if (canvas) {
          canvas.width = targetSize;
          canvas.height = targetSize;
        }
        bgCanvas.width = targetSize;
        bgCanvas.height = targetSize;
        currentCanvasSize = targetSize;
        isBgCached = false;
      }
      
      if (isEco) {
        // Throttle to roughly 30fps to drastically save GPU on old tablets
        if (time - lastDrawTime < 33) {
          animId = requestAnimationFrame(drawLoop);
          return;
        }
      }
      lastDrawTime = time;

      const { 
        tracks: currentTracks, 
        isPlaying: localPlaying, 
        timeSig: localTimeSig,
        isMetroOn: localMetroOn, 
        hitTriggersRef: localHitTriggers,
        isLeftHanded: localLeftHanded
      } = stateRef.current;

      const live = livePlaybackRef.current;
      const localStep = live.step;
      const localTicks = live.maxTicks || 96;

      // Consume hit triggers to create ripples
      if (localHitTriggers && localHitTriggers.current.length > 0) {
        const hits = localHitTriggers.current.splice(0, localHitTriggers.current.length);
        if (!isEco) {
          hits.forEach(hit => {
            const track = currentTracks.find(t => t.id === hit.trackId);
          if (track && !track.isHidden && !track.isMute) {
            const inst = instrumentsConfig[track.instrumentIdx];
      if (!inst) return null;
            const color = inst.colors[hit.state as any] || themeText;
            const activePatternId = getLiveActivePatternId(track);
            if (activePatternId === null) return;
            const activePattern = track.patterns.find(p => p.id === activePatternId) || track.patterns[0];
            const angle = -Math.PI / 2 + ((hit.stepIndex / activePattern.steps) * Math.PI * 2);
            const radius = track.radius || 0;
            const x = 600 + Math.cos(angle) * radius;
            const y = 600 + Math.sin(angle) * radius;

            ripples.push({
              x, y,
              radius: 6,
              maxRadius: 25 + (track.volumeVal / 100) * 15,
              alpha: 0.6 * (track.volumeVal / 100),
              color: color,
              speed: 1.0 + Math.random() * 0.5
            });
          }
        });
      }
      }

      const centerX = 600;
      const centerY = 600;

      // Cordel style Alfaia Drum
      const drumRadius = 560;
      const rimRadius = 540;
      const innerSkinRadius = 522;

      const markers = getMarkers(localTimeSig, localTicks);
      const ticksPerBeat = localTicks / markers.length;

      ctx.clearRect(0, 0, currentCanvasSize, currentCanvasSize);
      
      ctx.save();
      if (isEco) {
        ctx.scale(0.5, 0.5);
      }

      if (lastTimeSig !== localTimeSig || lastTicks !== localTicks) {
        isBgCached = false;
        lastTimeSig = localTimeSig;
        lastTicks = localTicks;
      }

      if (!isBgCached && bgCtx) {
        bgCtx.clearRect(0, 0, currentCanvasSize, currentCanvasSize);
        bgCtx.save();
        if (isEco) {
          bgCtx.scale(0.5, 0.5);
        }

        // 1. Ropes (Cordas) - drawn with black ink style
        const numCords = 16;
        bgCtx.lineWidth = 7;
        bgCtx.strokeStyle = themeBorder;
        bgCtx.lineCap = 'round';
        bgCtx.lineJoin = 'round';

        for (let i = 0; i < numCords; i++) {
          const a1 = (i * Math.PI * 2) / numCords;
          const a2 = ((i + 0.5) * Math.PI * 2) / numCords;
          
          bgCtx.beginPath();
          bgCtx.moveTo(centerX + Math.cos(a1) * (rimRadius - 5), centerY + Math.sin(a1) * (rimRadius - 5));
          bgCtx.lineTo(centerX + Math.cos(a2) * drumRadius, centerY + Math.sin(a2) * drumRadius);
          const a3 = ((i + 1) * Math.PI * 2) / numCords;
          bgCtx.lineTo(centerX + Math.cos(a3) * (rimRadius - 5), centerY + Math.sin(a3) * (rimRadius - 5));
          bgCtx.stroke();
        }

        // 2. Wooden Rim (Aro) - flat dark wood that fits Cordel
        bgCtx.beginPath();
        bgCtx.arc(centerX, centerY, rimRadius, 0, Math.PI * 2);
        bgCtx.lineWidth = 36;
        bgCtx.strokeStyle = '#2c1e16'; // Very dark wood brown
        bgCtx.stroke();

        // Rim ink outlines
        bgCtx.beginPath();
        bgCtx.arc(centerX, centerY, rimRadius - 18, 0, Math.PI * 2);
        bgCtx.lineWidth = 4;
        bgCtx.strokeStyle = themeBorder;
        bgCtx.stroke();
        
        bgCtx.beginPath();
        bgCtx.arc(centerX, centerY, rimRadius + 18, 0, Math.PI * 2);
        bgCtx.lineWidth = 4;
        bgCtx.strokeStyle = themeBorder;
        bgCtx.stroke();

        // 3. Animal Skin (Couro) - Cream paper
        bgCtx.beginPath();
        bgCtx.arc(centerX, centerY, innerSkinRadius, 0, Math.PI * 2);
        bgCtx.fillStyle = themeBg;
        bgCtx.save();
        bgCtx.globalAlpha = 0.85;
        bgCtx.fill();
        bgCtx.restore();

        // Skin edge ink shadow
        bgCtx.beginPath();
        bgCtx.arc(centerX, centerY, innerSkinRadius, 0, Math.PI * 2);
        bgCtx.lineWidth = 5;
        bgCtx.strokeStyle = themeBorder;
        bgCtx.stroke();

        // Inner decorative ring (Cordel style dashes)
        bgCtx.beginPath();
        bgCtx.arc(centerX, centerY, innerSkinRadius - 15, 0, Math.PI * 2);
        bgCtx.lineWidth = 1.5;
        bgCtx.strokeStyle = themeBorder;
        bgCtx.setLineDash([8, 8]);
        bgCtx.stroke();
        bgCtx.setLineDash([]);

        // Render Time markers around the rim
        markers.forEach((tick, idx) => {
          const angle = -Math.PI / 2 + ((tick / localTicks) * Math.PI * 2);
          const inRad = innerSkinRadius - 35, outRad = innerSkinRadius - 20;
          bgCtx.beginPath();
          bgCtx.moveTo(centerX + Math.cos(angle) * inRad, centerY + Math.sin(angle) * inRad);
          bgCtx.lineTo(centerX + Math.cos(angle) * outRad, centerY + Math.sin(angle) * outRad);
          bgCtx.strokeStyle = themeBorder;
          bgCtx.save();
          if (tick !== 0) {
            bgCtx.globalAlpha = 0.3;
          }
          bgCtx.lineWidth = (tick === 0) ? 4 : 2;
          bgCtx.stroke();
          bgCtx.restore();

          // Draw a premium circular badge on the dark wood rim for the beat number
          const textRad = 540;
          const badgeX = centerX + Math.cos(angle) * textRad;
          const badgeY = centerY + Math.sin(angle) * textRad;

          bgCtx.beginPath();
          bgCtx.arc(badgeX, badgeY, 18, 0, Math.PI * 2);
          bgCtx.fillStyle = themeBg; // Cream skin color
          bgCtx.fill();
          bgCtx.strokeStyle = themeBorder; // Dark ink outline
          bgCtx.lineWidth = 1.5;
          bgCtx.stroke();

          // Draw the beat number inside the badge
          bgCtx.fillStyle = themeText; // Dark ink text
          bgCtx.font = 'bold 20px "Outfit", "Inter", sans-serif';
          bgCtx.textAlign = 'center';
          bgCtx.textBaseline = 'middle';
          const strVal = (idx + 1).toString();
          bgCtx.fillText(strVal, badgeX, badgeY + 1.5); // slight offset for vertical alignment
        });

        // 5b. Grid lines (lines indicating beats and subdivisions) under the sequencer tracks
        bgCtx.save();
        const isCompound = localTimeSig === '6/8' || localTimeSig === '12/8';
        
        // For compound signatures, beat is dotted quarter note = 12 ticks, subdivision is eighth note = 4 ticks.
        // For simple signatures, beat is quarter note = 24 ticks, subdivision is 16th note = 6 ticks.
        const subdivisionTickInterval = isCompound ? 4 : 6;

        for (let t = 0; t < localTicks; t += subdivisionTickInterval) {
          const angle = -Math.PI / 2 + (t / localTicks) * Math.PI * 2;
          const isMainBeat = t % ticksPerBeat === 0;

          bgCtx.beginPath();
          // Draw from the play button edge (radius 60) to the outer skin limit (radius 516)
          bgCtx.moveTo(centerX + Math.cos(angle) * 60, centerY + Math.sin(angle) * 60);
          bgCtx.lineTo(centerX + Math.cos(angle) * 516, centerY + Math.sin(angle) * 516);

          bgCtx.strokeStyle = themeBorder;
          if (isMainBeat) {
            bgCtx.globalAlpha = 0.28;
            bgCtx.lineWidth = 2.0;
            bgCtx.setLineDash([]);
          } else {
            bgCtx.globalAlpha = 0.12;
            bgCtx.lineWidth = 1.0;
            bgCtx.setLineDash([5, 5]);
          }
          bgCtx.stroke();
        }
        bgCtx.restore();

        if (isEco) {
          bgCtx.restore(); // Restore bgCtx scale
        }
        isBgCached = true;
      }

      // Temporarily restore ctx so we can draw bgCanvas at 1:1 scale
      ctx.restore();
      ctx.drawImage(bgCanvas, 0, 0);
      
      // Re-apply ctx scale for the rest of the dynamic drawing
      ctx.save();
      if (isEco) {
        ctx.scale(0.5, 0.5);
      }

      // Metronome Flash (if active)
      if (localMetroOn && flashAlpha > 0 && !isEco) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerSkinRadius, 0, Math.PI * 2);
        ctx.fillStyle = themeBorder;
        ctx.globalAlpha = flashAlpha * 0.15;
        ctx.fill();
        ctx.restore();
      }

      // Animated golden beat indicators glow
      const currentBeat = localStep >= 0 ? Math.floor(localStep / ticksPerBeat) : -1;
      
      if (localPlaying && localMetroOn && currentBeat !== -1 && currentBeat !== lastFlashBeat) {
        flashAlpha = 1.0;
        lastFlashBeat = currentBeat;
      } else if (!localPlaying) {
        lastFlashBeat = -1;
      }

      if (flashAlpha > 0) {
        flashAlpha -= 0.05;
      }

      // Rotate Drumstick indicating active play head step
      if (localStep !== -1) {
        stickAngle = -Math.PI / 2 + ((localStep / localTicks) * Math.PI * 2);
      } else {
        stickAngle = -Math.PI / 2;
      }

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(stickAngle);
      let maxVisibleRadius = -1;
      for (let i = 0; i < currentTracks.length; i++) {
        const t = currentTracks[i];
        if (!t.isHidden && instrumentsConfig[t.instrumentIdx]?.id !== 'apito') {
          const r = t.radius || 0;
          if (r > maxVisibleRadius) {
            maxVisibleRadius = r;
          }
        }
      }
      if (maxVisibleRadius === -1) maxVisibleRadius = 120;
      const stickLength = maxVisibleRadius + 35;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(stickLength - 10, -1);
      ctx.lineTo(stickLength - 10, 1);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fillStyle = themeBorder;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(stickLength - 5, 0, 5, 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = themeBorder;
      ctx.fill();
      ctx.restore();

      // Dynamic scale multiplier
      const maxTracks = 10;
      const countClamped = Math.min(currentTracks.length, maxTracks);
      const dynamicScale = currentTracks.length > 0 ? 1 + ((maxTracks - countClamped) * 0.08) : 1;

      // Render Ripples (Ondes de choc)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.alpha -= 0.015;
        if (r.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.globalAlpha = Math.min(1, r.alpha);
        ctx.strokeStyle = r.color;
        ctx.stroke();
        ctx.restore();
      }

      let hasSoloTrack = false;
      for (let i = 0; i < currentTracks.length; i++) {
        if (currentTracks[i].isSolo) {
          hasSoloTrack = true;
          break;
        }
      }

      for (const key in instrumentTotals) delete instrumentTotals[key];
      for (const key in instrumentIndexes) delete instrumentIndexes[key];

      for (let i = 0; i < currentTracks.length; i++) {
        const idx = currentTracks[i].instrumentIdx;
        instrumentTotals[idx] = (instrumentTotals[idx] || 0) + 1;
      }

      // Render concentric sequencer tracks
      currentTracks.forEach((track) => {
        const instIdx = track.instrumentIdx;
        const inst = instrumentsConfig[instIdx];
        
        if (instrumentTotals[instIdx] > 1) {
          instrumentIndexes[instIdx] = (instrumentIndexes[instIdx] || 0) + 1;
        }

        if (!inst || track.isHidden || inst.id === 'apito') return;

        const isMutedOut = hasSoloTrack ? !track.isSolo : track.isMute;
        if (isMutedOut) return;

        const activePatternId = getLiveActivePatternId(track);
        if (activePatternId === null) return;
        let activePattern = null;
        for (let i = 0; i < track.patterns.length; i++) {
          if (track.patterns[i].id === activePatternId) {
            activePattern = track.patterns[i];
            break;
          }
        }
        if (!activePattern) return;
        
        const activePlayingSteps = sequencer.activeVariationsRef?.current[track.id] || activePattern.activeSteps;
        let hasAnyNotes = false;
        for (let sIdx = 0; sIdx < activePlayingSteps.length; sIdx++) {
          if (activePlayingSteps[sIdx] !== 0) {
            hasAnyNotes = true;
            break;
          }
        }
        const isActiveState = hasAnyNotes;

        ctx.save();
        ctx.globalAlpha = isActiveState ? 1.0 : 0.25;

        // Standard dashed track line
        ctx.beginPath();
        const tRad = track.radius || 0;
        ctx.arc(centerX, centerY, tRad, 0, Math.PI * 2);
        ctx.strokeStyle = themeBorder;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        if (!track.isSolo) {
          ctx.save();
          ctx.globalAlpha = ctx.globalAlpha * 0.2;
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.stroke();
        }
        ctx.setLineDash([]);

        const currentStep = (localStep >= 0) ? Math.floor((localStep / localTicks) * activePattern.steps) : -1;
        const stepCount = activePattern.steps;

        const stepAngles: number[] = [];
        const beatRes = activePattern.beatResolutions || Array(4).fill(Math.floor(stepCount / 4) || 4);
        const anglePerBeat = (Math.PI * 2) / beatRes.length;
        let currentAngle = -Math.PI / 2;
        for (let b = 0; b < beatRes.length; b++) {
          const res = beatRes[b];
          const anglePerStep = anglePerBeat / res;
          for (let s = 0; s < res; s++) {
            stepAngles.push(currentAngle + s * anglePerStep);
          }
          currentAngle += anglePerBeat;
        }

        for (let i = 0; i < stepCount; i++) {
          const stepAngle = stepAngles[i] || (-Math.PI / 2 + (i * (Math.PI * 2 / stepCount)));
          const x = centerX + Math.cos(stepAngle) * tRad;
          const y = centerY + Math.sin(stepAngle) * tRad;

          const state = activePlayingSteps[i];
          if (!state || state === 0) continue;

          const visualState = getVisualStrokeSymbol(state, localLeftHanded || false, inst.id);
          let fillColor = 'rgba(255,255,255,0.2)';
          let radiusSize = 6 * dynamicScale;
          let isAccent = false;
          let textSymbol = String(visualState);

          if (visualState !== 0) {
            radiusSize = 13 * dynamicScale;
            if (inst.type === 'voice') {
              radiusSize = 22 * dynamicScale;
              fillColor = (visualState === 'P') ? inst.colors['P'] : inst.colors['C'];
              let syl = activePattern.lyrics[i] || 'X';
              textSymbol = String(syl).endsWith('-') ? String(syl).slice(0, -1) : String(syl);
            } else {
              const stateStr = String(visualState);
              fillColor = (inst.colors && inst.colors[visualState]) ? inst.colors[visualState] : '#fff';
              isAccent = (stateStr === stateStr.toUpperCase());
              radiusSize = (isAccent ? 15 : 12) * dynamicScale;

              if (inst.id === 'mineiro') {
                if (stateStr.toLowerCase() === 'p') textSymbol = '↑';
                else if (stateStr.toLowerCase() === 't') textSymbol = '↓';
              } else if (inst.id === 'agbe') {
                if (stateStr.toLowerCase() === 'e') textSymbol = '←';
                else if (stateStr.toLowerCase() === 'd') textSymbol = '→';
                else if (stateStr.toLowerCase() === 's') textSymbol = '↑';
                else if (stateStr.toLowerCase() === 'v') textSymbol = '↓';
              }
            }
          }

          // Highlight playhead match step
          if (!isEco && i === currentStep) {
            ctx.beginPath();
            ctx.arc(x, y, radiusSize + 5, 0, Math.PI * 2);
            ctx.strokeStyle = themeWood;
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }

          // Accent ring decoration
          if (isAccent) {
            ctx.beginPath();
            ctx.arc(x, y, radiusSize + 4, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(x, y, radiusSize, 0, Math.PI * 2);
          ctx.fillStyle = fillColor;
          ctx.fill();

          const isHit = state !== 0 && state !== '0' && state !== '';
          if (isHit) {
            ctx.strokeStyle = (inst && inst.color) ? inst.color : themeBorder;
            ctx.lineWidth = 2.5;
          } else {
            ctx.strokeStyle = themeBorder;
            ctx.lineWidth = 2;
          }
          ctx.stroke();

          // Render letter/direction marker on top of step
          if (state !== 0) {
            let txtColor = '#f4ecd8'; // Cream by default
            if (inst.type === 'voice' || isDarkText(inst.id, String(state))) {
              txtColor = '#1a1a1a'; // Dark charcoal
            }
            ctx.fillStyle = txtColor;
            const fontSize = Math.max(10, Math.floor((textSymbol.length > 1 ? 15 : 20) * dynamicScale * 0.9));
            ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Draw text outline for arrow symbols to make them extra bold/thick
            if (['↑', '↓', '←', '→'].includes(textSymbol)) {
              ctx.save();
              ctx.strokeStyle = txtColor;
              ctx.lineWidth = 2.5;
              ctx.strokeText(textSymbol, x, y + 2);
              ctx.restore();
            }

            ctx.fillText(textSymbol, x, y + 2);
          }

          // Name overlay on step 0
          if (i === 0 && !(window as any).oGiradorEcoMode) {
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = themeText;
            ctx.font = 'bold 10px serif';
            ctx.textAlign = 'left';
            let labelText = inst?.name || 'Instrument';
            if (instrumentTotals[instIdx] > 1) {
              labelText += ` ${instrumentIndexes[instIdx]}`;
            }
            if (track.patterns.length > 1) {
              let patternIdx = -1;
              for (let pIdx = 0; pIdx < track.patterns.length; pIdx++) {
                if (track.patterns[pIdx].id === activePatternId) {
                  patternIdx = pIdx;
                  break;
                }
              }
              if (patternIdx !== -1) {
                labelText += ` (P${patternIdx + 1})`;
              }
            }
            ctx.fillText(labelText, x + 20, y + 3);
            ctx.restore();
          }
        }
        ctx.restore();
      });

      // Restore the ctx scale applied after drawImage
      ctx.restore();
      
      animId = requestAnimationFrame(drawLoop);
    };

    drawLoop(performance.now());

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, []);

  const activeBpm = measureBpms[currentMeasure] || bpm;
  const activeVol = measureVols[currentMeasure] !== undefined ? measureVols[currentMeasure] : 100;

  return (
    <div
      id="circle-sequencer-panel"
      className="flex-grow flex items-center justify-center bg-[var(--cordel-bg)] relative p-2.5 overflow-hidden w-full h-full select-none"
      style={{
        backgroundImage: `url(${ASSETS_BASE_URL}Pictures/atelier.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dynamic Measure Information Widgets around the Roda */}
      <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] cordel-border-sm p-1.5 px-2 md:p-2 md:px-3 shadow-[3px_3px_0px_var(--cordel-border)] md:shadow-[4px_4px_0px_var(--cordel-border)] flex flex-col items-center min-w-[115px] md:min-w-[150px] z-20 select-none">
        <span className="text-[8px] md:text-[9px] uppercase opacity-65 tracking-wider font-bold select-none">{lang === 'pt' ? 'Compasso' : 'Mesure'}</span>
        <div className="flex items-center justify-between w-full mt-1.5 px-1.5 gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const prev = (currentMeasure - 1 + totalMeasures) % totalMeasures;
              onNavigateMeasure?.(prev);
            }}
            className="w-6 h-6 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors rounded-sm active:scale-95"
            title={lang === 'pt' ? 'Compasso anterior' : 'Mesure précédente'}
            style={{ padding: 0 }}
          >
            &lt;
          </button>
          <span ref={measureDisplayRef} className="text-sm md:text-base font-cactus font-bold leading-none select-none flex-grow text-center">
            {currentMeasure + 1} / {totalMeasures}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const next = (currentMeasure + 1) % totalMeasures;
              onNavigateMeasure?.(next);
            }}
            className="w-6 h-6 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors rounded-sm active:scale-95"
            title={lang === 'pt' ? 'Próximo compasso' : 'Mesure suivante'}
            style={{ padding: 0 }}
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] cordel-border-sm p-1.5 px-2.5 md:p-2 md:px-3.5 shadow-[3px_3px_0px_var(--cordel-border)] md:shadow-[4px_4px_0px_var(--cordel-border)] flex flex-col items-end min-w-[90px] md:min-w-[120px] z-20 pointer-events-none">
        <span className="text-[8px] md:text-[9px] uppercase opacity-65 tracking-wider font-bold">{lang === 'pt' ? 'Fórmula' : 'Rythme'}</span>
        <span className="text-sm md:text-lg font-cactus font-bold leading-tight">{timeSig}</span>
      </div>

      <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] cordel-border-sm p-1.5 px-2.5 md:p-2 md:px-3.5 shadow-[3px_3px_0px_var(--cordel-border)] md:shadow-[4px_4px_0px_var(--cordel-border)] flex flex-col items-start min-w-[90px] md:min-w-[120px] z-20 pointer-events-none">
        <span className="text-[8px] md:text-[9px] uppercase opacity-65 tracking-wider font-bold">Tempo</span>
        <span className="text-sm md:text-lg font-cactus font-bold leading-tight">{activeBpm} <span className="text-[10px] md:text-xs font-sans font-bold">BPM</span></span>
      </div>

      <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] cordel-border-sm p-1.5 px-2.5 md:p-2 md:px-3.5 shadow-[3px_3px_0px_var(--cordel-border)] md:shadow-[4px_4px_0px_var(--cordel-border)] flex flex-col items-end min-w-[90px] md:min-w-[120px] z-20 pointer-events-none">
        <span className="text-[8px] md:text-[9px] uppercase opacity-65 tracking-wider font-bold">Volume</span>
        <span className="text-sm md:text-lg font-cactus font-bold leading-tight">{activeVol}%</span>
      </div>

      <div className="flex-1 min-h-0 relative w-full h-full max-w-[800px] mx-auto flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={1200}
          height={1200}
          onClick={handleCanvasClick}
          className="max-w-full max-h-full aspect-square cursor-pointer block select-none"
          role="application"
          aria-label={lang === 'pt' ? 'Roda de maracatu — sequenciador circular' : 'Roda de maracatu — séquenceur circulaire'}
        />
        {/* Center overlay — displays signal or structural marker */}
        <div
          ref={centerOverlayRef}
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
          style={{
            opacity: 0,
            transition: 'opacity 0.6s ease',
          }}
        >
          {/* Afficheur rond */}
          <div
            id="center-afficheur"
            className={`w-[20%] aspect-square rounded-full border-4 border-[var(--cordel-border)] shadow-2xl relative overflow-hidden flex items-center justify-center text-center p-1.5 md:p-2.5 select-none ${isCenterShaking ? 'shake-active' : ''}`}
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
          >
            {/* Background image for signal */}
            <img
              id="center-overlay-img"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: 'none' }}
            />
            {/* Dark tint overlay for signal readability */}
            <div
              id="center-overlay-tint"
              className="absolute inset-0 bg-black/30"
              style={{ display: 'none' }}
            />
            {/* Text layer in the center */}
            <span
              id="center-overlay-text"
              className="relative z-10 font-cactus font-bold uppercase tracking-wide select-none break-words w-full"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
            />
          </div>
        </div>
      </div>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-[var(--cordel-text)]/40 pointer-events-none select-none font-medium tracking-wide hidden md:block">
        Créé par Julian Biblocq | Art: Toni Braga
      </div>
    </div>
  );
};
