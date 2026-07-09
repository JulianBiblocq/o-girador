/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '../ToneLoader';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}
import { TrackGroup, Language, HitTrigger, HitTriggerPool, TimeSignature, SongSection, SongMarker, CloudRhythmSignal } from '../types';
import { instrumentsConfig, getMarkers, ASSETS_BASE_URL, isDarkText, getVisualStrokeSymbol, i18n } from '../data';
import { getNextStepValue } from '../utils/instrumentStrokes';
import { useGameData } from '../contexts/GameDataContext';
import { useSequencerStore, isSequencerVisibleTrack, isToadaBus } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useTransportStore } from '../stores/useTransportStore';
import { subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';
import { getExpandedMeasures } from '../utils/measureHelpers';
import { getBusColor, getBusNoteColor } from '../utils/colorHelpers';

interface CircleSequencerProps {
  isActive?: boolean;
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
  hitTriggersRef?: React.MutableRefObject<HitTriggerPool>;
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
  songMarkers?: SongMarker[];
  circleId?: number;
  measureIndex?: number;
  trackId?: number;
}

const EMPTY_ARRAY: any[] = [];

const isTracksStructureEqual = (prev: TrackGroup[], next: TrackGroup[]) => {
  if (prev === next) return true;
  if (!prev || !next) return false;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (p.id !== n.id ||
        p.instrumentIdx !== n.instrumentIdx ||
        p.isHidden !== n.isHidden ||
        p.isMute !== n.isMute ||
        p.isSolo !== n.isSolo ||
        p.radius !== n.radius) {
      return false;
    }
    if (p.patterns.length !== n.patterns.length) return false;
    for (let j = 0; j < p.patterns.length; j++) {
      const pp = p.patterns[j];
      const np = n.patterns[j];
      if (pp.id !== np.id || pp.steps !== np.steps) return false;
      if (pp.measureAssignments.length !== np.measureAssignments.length) return false;
      for (let m = 0; m < pp.measureAssignments.length; m++) {
        if (pp.measureAssignments[m] !== np.measureAssignments[m]) return false;
      }
    }
  }
  return true;
};

function useTracksWithCustomEquality(isActive: boolean): TrackGroup[] {
  const [tracks, setTracks] = useState<TrackGroup[]>(() => {
    if (!isActive) return EMPTY_ARRAY;
    return useSequencerStore.getState().tracks;
  });

  const lastTracksRef = useRef<TrackGroup[]>(tracks);

  useEffect(() => {
    if (!isActive) {
      if (lastTracksRef.current !== EMPTY_ARRAY) {
        lastTracksRef.current = EMPTY_ARRAY;
        setTracks(EMPTY_ARRAY);
      }
      return;
    }

    const handleStoreChange = (state: any) => {
      const nextTracks = state.tracks;
      if (!isTracksStructureEqual(lastTracksRef.current, nextTracks)) {
        lastTracksRef.current = nextTracks;
        setTracks(nextTracks);
      }
    };

    handleStoreChange(useSequencerStore.getState());

    const unsubscribe = useSequencerStore.subscribe(handleStoreChange);
    return unsubscribe;
  }, [isActive]);

  return tracks;
}

const MIN_RADIUS = 180;
const MAX_RADIUS = 495;

const getTrackRadius = (visibleIdx: number, totalTracks: number) => {
  if (totalTracks <= 0) return 0;
  if (totalTracks === 1) return (MIN_RADIUS + MAX_RADIUS) / 2;
  if (totalTracks === 2) {
    // spacing equivalent to position 2 and 4 out of 5 tracks
    // gap = (495 - 180) / 4 = 78.75
    // pos 2: 180 + 78.75 = 258.75
    // pos 4: 180 + 3 * 78.75 = 416.25
    return visibleIdx === 0 ? 258.75 : 416.25;
  }
  const gap = (MAX_RADIUS - MIN_RADIUS) / (totalTracks - 1);
  return MIN_RADIUS + visibleIdx * gap;
};

const CircleSequencerComponent: React.FC<CircleSequencerProps> = (props) => {
  const { isActive = true } = props;
  const sequencer = useSequencer();
  const audio = useAudio();

  // Extract identity props even if unused to maintain interface consistency
  const { circleId, measureIndex, trackId } = props;

  const isMobile = props.isMobile !== undefined ? props.isMobile : false;

  const lang = props.lang !== undefined ? props.lang : sequencer.lang;
  const isLeftHanded = props.isLeftHanded !== undefined ? props.isLeftHanded : sequencer.isLeftHanded;
  const tracksFromStore = useTracksWithCustomEquality(isActive);
  const rawTracks = props.tracks !== undefined ? props.tracks : tracksFromStore;
  const tracks = rawTracks.filter(t => isSequencerVisibleTrack(t, rawTracks));
  const totalMeasuresFromStore = useSequencerStore(state => state.totalMeasures);
  const totalMeasures = props.totalMeasures !== undefined ? props.totalMeasures : totalMeasuresFromStore;
  const bpm = props.bpm !== undefined ? props.bpm : sequencer.bpm;
  const measureBpms = props.measureBpms !== undefined ? props.measureBpms : sequencer.measureBpms;
  const measureVols = props.measureVols !== undefined ? props.measureVols : sequencer.measureVols;
  const measureSignals = props.measureSignals !== undefined ? props.measureSignals : (sequencer.measureSignals || []);
  const songSectionsFromStore = useSequencerStore(state => state.songSections);
  const songSections = props.songSections !== undefined ? props.songSections : (songSectionsFromStore || []);
  const songMarkersFromStore = useSequencerStore(state => state.songMarkers);
  const songMarkers = props.songMarkers !== undefined ? props.songMarkers : (songMarkersFromStore || []);

  const isPlaying = props.isPlaying !== undefined ? props.isPlaying : audio.isPlaying;
  const globalCurrentMeasure = useSequencerStore(state => isActive ? state.currentMeasure : 0);
  const measureTimeSigs = useSequencerStore(state => state.measureTimeSigs);
  const currentMeasure = props.currentMeasure !== undefined ? props.currentMeasure : globalCurrentMeasure;
  const storeIsMetroOn = useTransportStore(state => state.isMetroOn);
  const storeSoloPatternPlayId = useTransportStore(state => state.soloPatternPlayId);
  const isMetroOn = props.isMetroOn !== undefined ? props.isMetroOn : storeIsMetroOn;
  const soloPatternPlayId = props.soloPatternPlayId !== undefined ? props.soloPatternPlayId : storeSoloPatternPlayId;
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
  const centerAfficheurRef = useRef<HTMLDivElement>(null);
  const centerOverlayImgRef = useRef<HTMLImageElement>(null);
  const centerOverlayTintRef = useRef<HTMLDivElement>(null);
  const centerOverlayTextRef = useRef<HTMLSpanElement>(null);

  const lastOverlayTextRef = useRef<string>('');
  const lastOverlayStateRef = useRef({
    opacity: '',
    bgColor: '',
    imgDisplay: '',
    imgSrc: '',
    tintDisplay: '',
    color: '',
    textShadow: '',
    fontSize: '',
  });

  const [isCenterShaking, setIsCenterShaking] = useState(false);
  const [pendingTargetMeasure, setPendingTargetMeasure] = useState<number | null>(null);
  const pendingTargetMeasureRef = useRef<number | null>(null);
  const [pendingTargetExpandedIndex, setPendingTargetExpandedIndex] = useState<number | null>(null);
  const pendingTargetExpandedIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setPendingTargetMeasure(null);
    pendingTargetMeasureRef.current = null;
    setPendingTargetExpandedIndex(null);
    pendingTargetExpandedIndexRef.current = null;
  }, [currentMeasure]);

  const expandedRef = useRef<any[]>([]);

  useEffect(() => {
    expandedRef.current = getExpandedMeasures(totalMeasures, songSections);
  }, [totalMeasures, songSections]);

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

    const afficheurEl = centerAfficheurRef.current;
    const imgEl = centerOverlayImgRef.current;
    const tintEl = centerOverlayTintRef.current;
    const textEl = centerOverlayTextRef.current;

    if (!afficheurEl || !imgEl || !tintEl || !textEl) return;

    const cache = lastOverlayStateRef.current;

    if (activeSig) {
      if (cache.imgSrc !== activeSig.image) {
        imgEl.src = activeSig.image;
        imgEl.alt = activeSig.name;
        cache.imgSrc = activeSig.image;
      }
      if (cache.imgDisplay !== 'block') {
        imgEl.style.display = 'block';
        cache.imgDisplay = 'block';
      }
      if (cache.tintDisplay !== 'block') {
        tintEl.style.display = 'block';
        cache.tintDisplay = 'block';
      }
      if (cache.bgColor !== 'transparent') {
        afficheurEl.style.backgroundColor = 'transparent';
        cache.bgColor = 'transparent';
      }

      if (lastOverlayTextRef.current !== activeSig.name) {
        textEl.innerText = activeSig.name;
        lastOverlayTextRef.current = activeSig.name;
      }
      if (cache.color !== '#ffffff') {
        textEl.style.color = '#ffffff';
        cache.color = '#ffffff';
      }
      if (cache.textShadow !== '0 1px 3px rgba(0,0,0,0.9)') {
        textEl.style.textShadow = '0 1px 3px rgba(0,0,0,0.9)';
        cache.textShadow = '0 1px 3px rgba(0,0,0,0.9)';
      }

      // Font size adaptation based on length (using CSS variables for clean updates)
      const len = activeSig.name.length;
      let sizeVal = 'clamp(7px, 1.1vw, 9px)';
      if (len <= 6) sizeVal = 'clamp(9px, 1.8vw, 16px)';
      else if (len <= 12) sizeVal = 'clamp(8px, 1.4vw, 12px)';

      if (cache.fontSize !== sizeVal) {
        textEl.style.setProperty('--dynamic-font-size', sizeVal);
        cache.fontSize = sizeVal;
      }

      if (cache.opacity !== '0.85') {
        container.style.opacity = '0.85';
        cache.opacity = '0.85';
      }
    } else if (activeMarker) {
      if (cache.imgDisplay !== 'none') {
        imgEl.style.display = 'none';
        cache.imgDisplay = 'none';
      }
      if (cache.tintDisplay !== 'none') {
        tintEl.style.display = 'none';
        cache.tintDisplay = 'none';
      }
      
      const targetBgColor = activeMarker.color || '#f19066';
      if (cache.bgColor !== targetBgColor) {
        afficheurEl.style.backgroundColor = targetBgColor;
        cache.bgColor = targetBgColor;
      }

      if (lastOverlayTextRef.current !== activeMarker.name) {
        textEl.innerText = activeMarker.name;
        lastOverlayTextRef.current = activeMarker.name;
      }
      if (cache.color !== '#1a1a1a') {
        textEl.style.color = '#1a1a1a';
        cache.color = '#1a1a1a';
      }
      if (cache.textShadow !== 'none') {
        textEl.style.textShadow = 'none';
        cache.textShadow = 'none';
      }

      // Font size adaptation based on length (using CSS variables for clean updates)
      const len = activeMarker.name.length;
      let sizeVal = 'clamp(7px, 1.1vw, 9px)';
      if (len <= 6) sizeVal = 'clamp(9px, 1.8vw, 16px)';
      else if (len <= 12) sizeVal = 'clamp(8px, 1.4vw, 12px)';

      if (cache.fontSize !== sizeVal) {
        textEl.style.setProperty('--dynamic-font-size', sizeVal);
        cache.fontSize = sizeVal;
      }

      if (cache.opacity !== '0.85') {
        container.style.opacity = '0.85';
        cache.opacity = '0.85';
      }
    } else {
      if (cache.imgDisplay !== 'none') {
        imgEl.style.display = 'none';
        cache.imgDisplay = 'none';
      }
      if (cache.tintDisplay !== 'none') {
        tintEl.style.display = 'none';
        cache.tintDisplay = 'none';
      }
      if (lastOverlayTextRef.current !== '') {
        textEl.innerText = '';
        lastOverlayTextRef.current = '';
      }
      if (cache.textShadow !== 'none') {
        textEl.style.textShadow = 'none';
        cache.textShadow = 'none';
      }
      if (cache.bgColor !== 'transparent') {
        afficheurEl.style.backgroundColor = 'transparent';
        cache.bgColor = 'transparent';
      }
      if (cache.opacity !== '0') {
        container.style.opacity = '0';
        cache.opacity = '0';
      }
    }
  };

  useEffect(() => {
    if (!isActive) return;

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number; time?: number; iteration?: number }) => {
      const { step, measure, maxTicks, ratio = step / maxTicks, iteration = 1 } = detail;
      
      livePlaybackRef.current = {
        step,
        measure,
        maxTicks,
        ratio,
      };

      if (measureDisplayRef.current) {
        const expanded = expandedRef.current;
        let displayMeasure = 1;
        const displayTotal = expanded.length > 0 ? expanded.length : totalMeasures;

        if (pendingTargetExpandedIndexRef.current !== null) {
          displayMeasure = pendingTargetExpandedIndexRef.current + 1;
        } else {
          const activeRepIndex = expanded.findIndex(item => item.baseMeasure === measure && item.iteration === iteration);
          displayMeasure = activeRepIndex !== -1 ? activeRepIndex + 1 : measure + 1;
        }
        measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
      }

      updateOverlay(measure);
    };

    const handleMeasureQueued = (e: Event) => {
      const customEvent = e as CustomEvent<{ measure: number; iteration?: number }>;
      const { measure, iteration = 1 } = customEvent.detail;
      if (measureDisplayRef.current) {
        const expanded = expandedRef.current;
        let displayMeasure = 1;
        const displayTotal = expanded.length > 0 ? expanded.length : totalMeasures;

        if (pendingTargetExpandedIndexRef.current !== null) {
          displayMeasure = pendingTargetExpandedIndexRef.current + 1;
        } else {
          const activeRepIndex = expanded.findIndex(item => item.baseMeasure === measure && item.iteration === iteration);
          displayMeasure = activeRepIndex !== -1 ? activeRepIndex + 1 : measure + 1;
        }
        measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
      }
    };

    subscribeToTick(handleTick);
    window.addEventListener('o-girador-measure-queued', handleMeasureQueued);
    return () => {
      unsubscribeFromTick(handleTick);
      window.removeEventListener('o-girador-measure-queued', handleMeasureQueued);
    };
  }, [totalMeasures, songSections, isActive]);

  useEffect(() => {
    const live = livePlaybackRef.current;
    const measureIdx = isPlaying && live.step >= 0 ? live.measure : currentMeasure;
    updateOverlay(measureIdx);
  }, [currentMeasure, isPlaying, measureSignals, rhythmSignals, mestreSignals, songSections, songMarkers]);

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
    const measureIdx = (live && live.step >= 0) ? live.measure : state.currentMeasure;

    const isToada = isToadaBus(track);

    if (isToada) {
      const pux = state.rawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coro = state.rawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
      
      const soloPlayId = state.soloPatternPlayId;
      if (soloPlayId !== undefined && soloPlayId !== null) {
        if (pux && pux.patterns.some(p => p.id === soloPlayId)) return soloPlayId;
        if (coro && coro.patterns.some(p => p.id === soloPlayId)) return soloPlayId;
        return null;
      }

      if (coro) {
        for (let i = 0; i < coro.patterns.length; i++) {
          if (coro.patterns[i].measureAssignments[measureIdx]) {
            return coro.patterns[i].id;
          }
        }
      }
      if (pux) {
        for (let i = 0; i < pux.patterns.length; i++) {
          if (pux.patterns[i].measureAssignments[measureIdx]) {
            return pux.patterns[i].id;
          }
        }
      }
      return null;
    }

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
    rawTracks,
    isPlaying,
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
    songMarkers,
  });

  useEffect(() => {
    stateRef.current = {
      tracks,
      rawTracks,
      isPlaying,
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
      songMarkers
    };
  }, [tracks, rawTracks, isPlaying, currentMeasure, maxTicks, timeSig, lang, isMetroOn, activeCircleIdByInst, totalMeasures, activePatternIdByTrack, hitTriggersRef, bpm, measureBpms, measureVols, isMobile, soloPatternPlayId, measureSignals, rhythmSignals, mestreSignals, songSections, songMarkers, isLeftHanded]);

  useEffect(() => {
    if (props.tracks !== undefined) return;
    
    // Keep filtered tracks in stateRef up to date imperatively
    stateRef.current.tracks = useSequencerStore.getState().tracks.filter(t => isSequencerVisibleTrack(t, useSequencerStore.getState().tracks));
    stateRef.current.rawTracks = useSequencerStore.getState().tracks;
    
    const unsubscribe = useSequencerStore.subscribe(
      (state) => {
        stateRef.current.tracks = state.tracks.filter(t => isSequencerVisibleTrack(t, state.tracks));
        stateRef.current.rawTracks = state.tracks;
      }
    );
    return unsubscribe;
  }, [props.tracks]);

  // Handle click on canvas via Pointer Events (no touch latency)
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
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

    const hasSolo = currentTracks.some(t => 
      t.isSolo && 
      !t.isHidden && 
      isSequencerVisibleTrack(t, currentTracks) && 
      instrumentsConfig[t.instrumentIdx]?.id !== 'apito'
    );

    const activeVisibleTracksToDraw = currentTracks.filter(t => {
      if (t.isHidden) return false;
      if (!isSequencerVisibleTrack(t, currentTracks)) return false;
      if (instrumentsConfig[t.instrumentIdx]?.id === 'apito') return false;

      const isMutedOut = hasSolo ? !t.isSolo : t.isMute;
      return !isMutedOut;
    });

    // Detect click on any track
    activeVisibleTracksToDraw.forEach((track, visibleIdx) => {
      const isToada = isToadaBus(track);
      let activePattern = null;
      let ownerTrack = track;
      
      const activePatternId = getLiveActivePatternId(track);
      if (activePatternId === null) return;
      
      if (isToada) {
        const pux = currentTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
        const coro = currentTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
        
        if (pux) {
          activePattern = pux.patterns.find(p => p.id === activePatternId);
          if (activePattern) ownerTrack = pux;
        }
        if (!activePattern && coro) {
          activePattern = coro.patterns.find(p => p.id === activePatternId);
          if (activePattern) ownerTrack = coro;
        }
      } else {
        activePattern = track.patterns.find(p => p.id === activePatternId);
      }
      
      if (!activePattern) return;
      const inst = instrumentsConfig[ownerTrack.instrumentIdx];
      if (!inst) return null;

      const tRad = getTrackRadius(visibleIdx, activeVisibleTracksToDraw.length);

      if (Math.abs(distance - tRad) < 18) {
        let clickAngle = Math.atan2(dy, dx) + Math.PI / 2;
        if (clickAngle < 0) clickAngle += Math.PI * 2;

        const stepAngleSize = (Math.PI * 2) / activePattern.steps;

        for (let i = 0; i < activePattern.steps; i++) {
          const targetAngle = i * stepAngleSize;
          let angleDiff = Math.abs(clickAngle - targetAngle);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

          // Inside target step hitbox
          if (angleDiff < stepAngleSize / 2) {
            const currentVal = activePattern.activeSteps[i];

            if (inst.type === 'voice') {
              // Dialog prompt to customize vocals
              const currentNote = (activePattern.notes && activePattern.notes[i]) ? activePattern.notes[i] + ':' : '';
              const lyricPrompt = currentNote + (currentVal === 'P' ? '*' : '') + (activePattern.lyrics[i] || '');
              const typed = window.prompt(langPromptVoiceText, lyricPrompt);

              if (typed !== null) {
                const trimmed = typed.trim();
                if (trimmed === '') {
                  onStepChange(ownerTrack.id, activePattern.id, i, 0, '', '');
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

                  onStepChange(ownerTrack.id, activePattern.id, i, activeType, parsedSyllable, parsedNote.toUpperCase());
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
                    onStepChange(ownerTrack.id, activePattern.id, i, nextVal);
                  }
                );
              } else {
                const visualVal = getVisualStrokeSymbol(currentVal, stateRef.current.isLeftHanded || false, inst.id);
                const nextVisualVal = getNextStepValue(inst.id, inst.type, visualVal);
                const nextSemanticVal = getVisualStrokeSymbol(nextVisualVal, stateRef.current.isLeftHanded || false, inst.id);
                onStepChange(ownerTrack.id, activePattern.id, i, nextSemanticVal);
              }
            }
            return;
          }
        }
      }
    });
  };

  // 🛡️ FIX (Performance): control requestAnimationFrame lifecycle based on visibility
  const visibleRef = useRef(isActive);
  const loopRunningRef = useRef(false);
  const drawLoopRef = useRef<() => void>(() => {});

  useEffect(() => {
    visibleRef.current = isActive;
    if (isActive && !loopRunningRef.current) {
      loopRunningRef.current = true;
      drawLoopRef.current();
    }
  }, [isActive]);

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
      if ((window as any).oGiradorDetailEditorOpen) {
        animId = requestAnimationFrame(drawLoop);
        return;
      }
      if (!visibleRef.current) {
        loopRunningRef.current = false;
        return;
      }
      const time = performance.now();
      
      const sequencerState = useSequencerStore.getState();
      const isEco = sequencerState.isEcoMode;
      const storeTracks = sequencerState.tracks;
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
        tracks, 
        rawTracks: localRawTracks,
        isPlaying: localPlaying, 
        timeSig: localTimeSig,
        isMetroOn: localMetroOn, 
        hitTriggersRef: localHitTriggers,
        isLeftHanded: localLeftHanded
      } = stateRef.current;

      const live = livePlaybackRef.current;
      const localStep = live.step;
      const localTicks = live.maxTicks || 96;

      // 1. Détecter si des pistes sont en solo
      const hasSoloTrack = tracks.some(t => 
        t.isSolo && 
        !t.isHidden && 
        isSequencerVisibleTrack(t, tracks) && 
        instrumentsConfig[t.instrumentIdx]?.id !== 'apito'
      );

      // 2. Filtrer les pistes actives et visibles (non mutées, non masquées)
      const activeVisibleTracks = tracks.filter(t => {
        if (t.isHidden) return false;
        if (!isSequencerVisibleTrack(t, tracks)) return false;
        if (instrumentsConfig[t.instrumentIdx]?.id === 'apito') return false;

        const isMutedOut = hasSoloTrack ? !t.isSolo : t.isMute;
        return !isMutedOut;
      });

      // Consume hit triggers to create ripples
      if (localHitTriggers && localHitTriggers.current) {
        const pool = localHitTriggers.current;
        if (!isEco) {
          // Coût unique par trame de dessin : O(N) où N est le nombre de pistes
          const tracksMap = new Map<number | string, any>();
          const len = localRawTracks.length;
          for (let i = 0; i < len; i++) {
            const t = localRawTracks[i];
            tracksMap.set(t.id, t);
            tracksMap.set(String(t.id), t);
          }

          while (pool.readIndex !== pool.writeIndex) {
            const hit = pool.buffer[pool.readIndex];
            pool.readIndex = (pool.readIndex + 1) % pool.size;
            
            let track = tracksMap.get(hit.trackId);
            if (track && track.linkedToTrackId) {
              track = tracksMap.get(track.linkedToTrackId) || tracksMap.get(Number(track.linkedToTrackId));
            }
            if (track && !track.isHidden && !track.isMute) {
              const inst = instrumentsConfig[track.instrumentIdx];
              if (!inst) continue;
              const color = inst.colors[hit.state as any] || themeText;
              const activePatternId = getLiveActivePatternId(track);
              if (activePatternId === null) continue;
              const activePattern = track.patterns.find(p => p.id === activePatternId) || track.patterns[0];
              const angle = -Math.PI / 2 + ((hit.stepIndex / activePattern.steps) * Math.PI * 2);
              
              const visibleIdx = activeVisibleTracks.findIndex(vt => vt.id === track!.id);
              if (visibleIdx !== -1) {
                const radius = getTrackRadius(visibleIdx, activeVisibleTracks.length);
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
            }
          }
        } else {
          pool.readIndex = pool.writeIndex;
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
            bgCtx.globalAlpha = 0.60;
            bgCtx.lineWidth = 3.0;
            bgCtx.setLineDash([]);
          } else {
            bgCtx.globalAlpha = 0.22;
            bgCtx.lineWidth = 1.5;
            bgCtx.setLineDash([4, 4]);
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

      // 3. Dessiner la baguette avec la longueur maximale dynamique uniforme
      const maxVisibleRadius = activeVisibleTracks.length > 0 
        ? getTrackRadius(activeVisibleTracks.length - 1, activeVisibleTracks.length) 
        : 120;
      const stickLength = maxVisibleRadius + 35;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(stickAngle);

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
      const countClamped = Math.min(activeVisibleTracks.length, maxTracks);
      const dynamicScale = activeVisibleTracks.length > 0 ? 1 + ((maxTracks - countClamped) * 0.08) : 1;

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

      for (const key in instrumentTotals) delete instrumentTotals[key];
      for (const key in instrumentIndexes) delete instrumentIndexes[key];

      for (let i = 0; i < activeVisibleTracks.length; i++) {
        const idx = activeVisibleTracks[i].instrumentIdx;
        instrumentTotals[idx] = (instrumentTotals[idx] || 0) + 1;
      }

      // Render concentric sequencer tracks
      activeVisibleTracks.forEach((track, visibleIdx) => {
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
        let ownerTrack = track;

        const isToada = isToadaBus(track);
        if (isToada) {
          const pux = (props.tracks !== undefined ? rawTracks : stateRef.current.rawTracks).find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
          const coro = (props.tracks !== undefined ? rawTracks : stateRef.current.rawTracks).find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
          
          if (pux) {
            activePattern = pux.patterns.find(p => p.id === activePatternId);
            if (activePattern) ownerTrack = pux;
          }
          if (!activePattern && coro) {
            activePattern = coro.patterns.find(p => p.id === activePatternId);
            if (activePattern) ownerTrack = coro;
          }
        } else {
          for (let i = 0; i < track.patterns.length; i++) {
            if (track.patterns[i].id === activePatternId) {
              activePattern = track.patterns[i];
              break;
            }
          }
        }

        if (!activePattern) return;
        
        const currentInst = instrumentsConfig[ownerTrack.instrumentIdx] || inst;
        const currentInstIdx = ownerTrack.instrumentIdx;
        
         const activePlayingSteps = (props.tracks === undefined && sequencer.activeVariationsRef?.current)
          ? (sequencer.activeVariationsRef.current[track.id] || activePattern.activeSteps)
          : activePattern.activeSteps;
        let hasAnyNotes = false;
        for (let sIdx = 0; sIdx < activePlayingSteps.length; sIdx++) {
          if (activePlayingSteps[sIdx] !== 0) {
            hasAnyNotes = true;
            break;
          }
        }
        const isActiveState = hasAnyNotes;

        const busColor = track.isLinkFolder ? getBusColor(String(track.id), localRawTracks, instrumentsConfig) : null;

        ctx.save();
        ctx.globalAlpha = isActiveState ? 1.0 : 0.25;

        // Standard dashed track line
        ctx.beginPath();
        const tRad = getTrackRadius(visibleIdx, activeVisibleTracks.length);
        ctx.arc(centerX, centerY, tRad, 0, Math.PI * 2);
        ctx.strokeStyle = busColor || themeBorder;
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
        let stepAngles: number[] | null = null;
        if (activePattern.beatResolutions) {
          stepAngles = [];
          const beatRes = activePattern.beatResolutions;
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
        }

        for (let i = 0; i < stepCount; i++) {
          const stepAngle = stepAngles ? stepAngles[i] : (-Math.PI / 2 + (i * (Math.PI * 2 / stepCount)));
          const x = centerX + Math.cos(stepAngle) * tRad;
          const y = centerY + Math.sin(stepAngle) * tRad;

          // ── DESSIN DES SATELLITES POUR VARIATIONS INDIVIDUELLES ──
          let satellitesToDraw: Array<{
            color: string;
            text: string;
            isDark: boolean;
            childInstId: string;
            childState: string | number;
          }> = [];

          const live = livePlaybackRef.current;
          const stateVal = stateRef.current;
          const measureIdx = (live && live.step >= 0) ? live.measure : (pendingTargetMeasureRef.current !== null ? pendingTargetMeasureRef.current : stateVal.currentMeasure);

          if (track.isLinkFolder) {
            const children = (props.tracks !== undefined ? rawTracks : stateRef.current.rawTracks).filter((t: any) => 
              String(t.linkedToTrackId) === String(track.id) && 
              !t.isBusFolder
            );
            
            children.forEach((c: any) => {
              const override = c.patternOverrides?.[measureIdx];
              if (override !== undefined) {
                if (override !== null) {
                  const childPattern = track.patterns.find((p: any) => p.id === override);
                  if (childPattern) {
                    const childActivePlayingSteps = (props.tracks === undefined && sequencer.activeVariationsRef?.current)
                      ? (sequencer.activeVariationsRef.current[c.id] || childPattern.activeSteps)
                      : childPattern.activeSteps;
                    const childState = childActivePlayingSteps[i] || 0;
                    if (childState !== 0 && childState !== '') {
                      const childInst = instrumentsConfig[c.instrumentIdx];
                      if (childInst) {
                        const childVisualState = getVisualStrokeSymbol(childState, localLeftHanded || false, childInst.id);
                        if (childVisualState !== 0) {
                          const childColor = (childInst.colors && childInst.colors[childVisualState]) || childInst.color || '#fff';
                          const childText = String(childVisualState);
                          satellitesToDraw.push({
                            color: childColor,
                            text: childText,
                            isDark: isDarkText(childInst.id, String(childState)),
                            childInstId: childInst.id,
                            childState: childState
                          });
                        }
                      }
                    }
                  }
                }
              }
            });
          }
          // ── RÉSOLUTION DES ÉVÉNEMENTS MASTER ET VARIATIONS ──
          const masterState = activePlayingSteps[i];
          const hasMasterEvent = masterState !== 0 && masterState !== '0' && masterState !== '' && masterState !== undefined && masterState !== null;
          const hasVariationEvent = satellitesToDraw.length > 0;

          if (!hasMasterEvent && !hasVariationEvent) {
            continue; // Pas d'événement au pas i
          }

          // 1. Résoudre les détails du Master
          let masterText = '';
          let masterFillColor = 'rgba(255,255,255,0.2)';
          let masterTxtColor = '#f4ecd8';
          let masterIsAccent = false;
          let masterRadiusSize = 6 * dynamicScale;

          if (hasMasterEvent) {
            const visualState = getVisualStrokeSymbol(masterState, localLeftHanded || false, currentInst.id);
            if (visualState !== 0 && visualState !== '0') {
              masterRadiusSize = 13 * dynamicScale;
              if (currentInst.type === 'voice') {
                masterRadiusSize = 22 * dynamicScale;
                masterFillColor = track.isLinkFolder
                  ? getBusNoteColor(String(track.id), String(visualState), localRawTracks, instrumentsConfig)
                  : currentInst.color;
                let syl = activePattern.lyrics[i] || String(visualState);
                if (syl === '-') {
                  masterText = '-';
                  masterFillColor = '#ab5318'; // orange pour le silence
                  masterTxtColor = '#1a1a1a';
                } else {
                  masterText = String(syl).endsWith('-') ? String(syl).slice(0, -1) : String(syl);
                  masterTxtColor = '#000000';
                }
              } else {
                const stateStr = String(visualState);
                masterFillColor = track.isLinkFolder 
                  ? getBusNoteColor(String(track.id), String(visualState), localRawTracks, instrumentsConfig)
                  : ((currentInst.colors && currentInst.colors[visualState]) ? currentInst.colors[visualState] : '#fff');
                masterIsAccent = (stateStr === stateStr.toUpperCase());
                masterRadiusSize = (masterIsAccent ? 15 : 12) * dynamicScale;

                masterText = stateStr;
                if (currentInst.id === 'mineiro') {
                  if (stateStr.toLowerCase() === 'p') masterText = '↑';
                  else if (stateStr.toLowerCase() === 't') masterText = '↓';
                } else if (currentInst.id === 'agbe') {
                  if (stateStr.toLowerCase() === 'e') masterText = '←';
                  else if (stateStr.toLowerCase() === 'd') masterText = '→';
                  else if (stateStr.toLowerCase() === 's') masterText = '↑';
                  else if (stateStr.toLowerCase() === 'v') masterText = '↓';
                }
                
                masterTxtColor = isDarkText(currentInst.id, String(masterState)) ? '#1a1a1a' : '#f4ecd8';
              }
            } else if (visualState === '0' || visualState === '-') {
              masterRadiusSize = (currentInst.type === 'voice' ? 22 : 12) * dynamicScale;
              masterFillColor = '#ab5318'; // orange pour le silence
              masterText = '-';
              masterTxtColor = '#1a1a1a';
            }
          }

          // 2. Décider de la forme du pas (Complet, Divisé ou Demi-cercle droit seul)
          let isSplit = false;
          let isRightHalfOnly = false;
          let leftText = '';
          let leftFillColor = 'rgba(255,255,255,0.2)';
          let leftTxtColor = '#f4ecd8';
          let leftIsAccent = false;

          let rightText = '';
          let rightFillColor = '';
          let rightTxtColor = '#f4ecd8';

          let radiusSize = 6 * dynamicScale;

          if (hasMasterEvent && hasVariationEvent) {
            // Master + Variation
            isSplit = true;
            leftText = masterText;
            leftFillColor = masterFillColor;
            leftTxtColor = masterTxtColor;
            leftIsAccent = masterIsAccent;

            const rightSat = satellitesToDraw[0];
            rightText = rightSat.text;
            rightFillColor = rightSat.color;
            rightTxtColor = rightSat.isDark ? '#1a1a1a' : '#f4ecd8';

            radiusSize = (currentInst.type === 'voice' ? 22 : (leftIsAccent ? 15 : 12)) * dynamicScale;
          } else if (!hasMasterEvent && satellitesToDraw.length >= 2) {
            // Deux variations ou plus sans Master (on utilise la première et la deuxième)
            isSplit = true;
            const leftSat = satellitesToDraw[0];
            leftText = leftSat.text;
            leftFillColor = leftSat.color;
            leftTxtColor = leftSat.isDark ? '#1a1a1a' : '#f4ecd8';
            leftIsAccent = false;

            const rightSat = satellitesToDraw[1];
            rightText = rightSat.text;
            rightFillColor = rightSat.color;
            rightTxtColor = rightSat.isDark ? '#1a1a1a' : '#f4ecd8';

            radiusSize = (currentInst.type === 'voice' ? 22 : 12) * dynamicScale;
          } else if (!hasMasterEvent && satellitesToDraw.length === 1) {
            // Une seule Variation sans Master (Demi-cercle droit uniquement)
            isRightHalfOnly = true;
            const singleSat = satellitesToDraw[0];
            rightText = singleSat.text;
            rightFillColor = singleSat.color;
            rightTxtColor = singleSat.isDark ? '#1a1a1a' : '#f4ecd8';

            radiusSize = (currentInst.type === 'voice' ? 22 : 12) * dynamicScale;
          } else {
            // Master uniquement (Cercle Complet)
            isSplit = false;
            leftText = masterText;
            leftFillColor = masterFillColor;
            leftTxtColor = masterTxtColor;
            leftIsAccent = masterIsAccent;
            radiusSize = masterRadiusSize;
          }

          // 3. Calculer la couleur de la bordure active
          let strokeColor = themeBorder;
          let strokeWidth = 2.0;
          if (hasMasterEvent) {
            const visualState = getVisualStrokeSymbol(masterState, localLeftHanded || false, currentInst.id);
            strokeColor = track.isLinkFolder 
              ? getBusNoteColor(String(track.id), String(visualState), localRawTracks, instrumentsConfig)
              : ((currentInst && currentInst.color) ? currentInst.color : themeBorder);
            strokeWidth = 2.5;
          } else if (hasVariationEvent) {
            strokeColor = themeBorder;
            strokeWidth = 2.5;
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
          if (leftIsAccent) {
            ctx.beginPath();
            ctx.arc(x, y, radiusSize + 4, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // 4. Rendu graphique Canvas (Complet, Divisé ou Demi-cercle droit seul)
          if (isRightHalfOnly) {
            // Remplissage Moitié Droite uniquement
            ctx.beginPath();
            ctx.arc(x, y, radiusSize, Math.PI * 1.5, Math.PI * 0.5, false);
            ctx.closePath();
            ctx.fillStyle = rightFillColor;
            ctx.fill();

            // Bordure du demi-cercle fermé
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();

            // Dessin de la lettre décalée à droite
            if (rightText) {
              const rightFontSize = Math.max(8, Math.floor((rightText.length > 1 ? 11 : 15) * dynamicScale * 0.9));
              ctx.font = `900 ${rightFontSize}px "Outfit", "Inter", sans-serif`;
              ctx.fillStyle = rightTxtColor;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const textX = x + radiusSize * 0.4;
              const textY = y + 2;

              if (['↑', '↓', '←', '→'].includes(rightText)) {
                ctx.save();
                ctx.strokeStyle = rightTxtColor;
                ctx.lineWidth = 2.0;
                ctx.strokeText(rightText, textX, textY);
                ctx.restore();
              }
              ctx.fillText(rightText, textX, textY);
            }
          } else if (isSplit) {
            // Remplissage Moitié Gauche
            ctx.beginPath();
            ctx.arc(x, y, radiusSize, Math.PI * 0.5, Math.PI * 1.5, false);
            ctx.closePath();
            ctx.fillStyle = leftFillColor;
            ctx.fill();

            // Remplissage Moitié Droite
            ctx.beginPath();
            ctx.arc(x, y, radiusSize, Math.PI * 1.5, Math.PI * 0.5, false);
            ctx.closePath();
            ctx.fillStyle = rightFillColor;
            ctx.fill();

            // Ligne verticale médiane de séparation
            ctx.beginPath();
            ctx.moveTo(x, y - radiusSize);
            ctx.lineTo(x, y + radiusSize);
            ctx.strokeStyle = themeBorder;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Bordure extérieure
            ctx.beginPath();
            ctx.arc(x, y, radiusSize, 0, Math.PI * 2);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();

            // Dessin des lettres décalées
            if (leftText) {
              const leftFontSize = Math.max(8, Math.floor((leftText.length > 1 ? 11 : 15) * dynamicScale * 0.9));
              ctx.font = `900 ${leftFontSize}px "Outfit", "Inter", sans-serif`;
              ctx.fillStyle = leftTxtColor;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const textX = x - radiusSize * 0.4;
              const textY = y + 2;

              if (['↑', '↓', '←', '→'].includes(leftText)) {
                ctx.save();
                ctx.strokeStyle = leftTxtColor;
                ctx.lineWidth = 2.0;
                ctx.strokeText(leftText, textX, textY);
                ctx.restore();
              }
              ctx.fillText(leftText, textX, textY);
            }

            if (rightText) {
              const rightFontSize = Math.max(8, Math.floor((rightText.length > 1 ? 11 : 15) * dynamicScale * 0.9));
              ctx.font = `900 ${rightFontSize}px "Outfit", "Inter", sans-serif`;
              ctx.fillStyle = rightTxtColor;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const textX = x + radiusSize * 0.4;
              const textY = y + 2;

              if (['↑', '↓', '←', '→'].includes(rightText)) {
                ctx.save();
                ctx.strokeStyle = rightTxtColor;
                ctx.lineWidth = 2.0;
                ctx.strokeText(rightText, textX, textY);
                ctx.restore();
              }
              ctx.fillText(rightText, textX, textY);
            }
          } else {
            // Rendu Complet Traditionnel
            ctx.beginPath();
            ctx.arc(x, y, radiusSize, 0, Math.PI * 2);
            ctx.fillStyle = leftFillColor;
            ctx.fill();

            // Bordure
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();

            // Dessin du texte au centre
            if (leftText) {
              const fontSize = Math.max(10, Math.floor((leftText.length > 1 ? 15 : 20) * dynamicScale * 0.9));
              ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
              ctx.fillStyle = leftTxtColor;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const textY = y + 2;

              if (['↑', '↓', '←', '→'].includes(leftText)) {
                ctx.save();
                ctx.strokeStyle = leftTxtColor;
                ctx.lineWidth = 2.5;
                ctx.strokeText(leftText, x, textY);
                ctx.restore();
              }
              ctx.fillText(leftText, x, textY);
            }
          }

          // Name overlay on step 0
          if (i === 0 && !isEco) {
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = themeText;
            ctx.font = 'bold 10px serif';
            ctx.textAlign = 'left';
            const isMaster = storeTracks.some(t => String(t.linkedToTrackId) === String(track.id));
            const getPluralName = (name: string) => {
              if (name.includes('Alfaia')) return 'Alfaias';
              if (name === 'Caixa') return 'Caixas';
              if (name === 'Tarol') return 'Tarols';
              if (name === 'Agbê') return 'Agbês';
              if (name === 'Mineiro') return 'Mineiros';
              if (name === 'Gonguê') return 'Gonguês';
              return name + 's';
            };
            let labelText = (isMaster && currentInst) 
              ? `🔗 ${getPluralName(currentInst.name)}` 
              : (currentInst?.name || 'Instrument');
            if (!isMaster && instrumentTotals[currentInstIdx] > 1) {
              labelText += ` ${instrumentIndexes[currentInstIdx]}`;
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

    drawLoopRef.current = drawLoop;

    if (visibleRef.current) {
      loopRunningRef.current = true;
      drawLoop();
    }

    return () => {
      cancelAnimationFrame(animId);
      loopRunningRef.current = false;
      observer.disconnect();
    };
  }, []);

  const activeBpm = measureBpms[currentMeasure] || bpm;
  const activeVol = measureVols[currentMeasure] !== undefined ? measureVols[currentMeasure] : 100;

  const expanded = useMemo(() => getExpandedMeasures(totalMeasures, songSections), [totalMeasures, songSections]);
  let displayMeasure = 1;
  const displayTotal = expanded.length > 0 ? expanded.length : totalMeasures;

  if (pendingTargetExpandedIndex !== null) {
    displayMeasure = pendingTargetExpandedIndex + 1;
  } else {
    const activeMeasureForDisplay = currentMeasure;
    const activeRepIndex = expanded.findIndex(item => item.baseMeasure === activeMeasureForDisplay);
    displayMeasure = activeRepIndex !== -1 ? activeRepIndex + 1 : activeMeasureForDisplay + 1;
  }

  return (
    <div
      id="circle-sequencer-panel"
      className="flex-grow flex items-center justify-center bg-[var(--cordel-bg)] relative p-2.5 overflow-hidden w-full h-full select-none"
      style={{
        backgroundImage: `url(${ASSETS_BASE_URL}Pictures/atelier.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: isActive ? 'flex' : 'none',
      }}
    >
      {/* Dynamic Measure Information Widgets around the Roda */}
      <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] cordel-border-sm p-1.5 px-2 md:p-2 md:px-3 shadow-[3px_3px_0px_var(--cordel-border)] md:shadow-[4px_4px_0px_var(--cordel-border)] flex flex-col items-center min-w-[115px] md:min-w-[150px] z-20 select-none">
        <span className="text-[8px] md:text-[9px] uppercase opacity-65 tracking-wider font-bold select-none">{lang === 'pt' ? 'Compasso' : 'Mesure'}</span>
        <div className="flex items-center justify-between w-full mt-1.5 px-1.5 gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const expanded = expandedRef.current;
              if (expanded.length === 0) {
                const activeMeasureForNavigation = pendingTargetMeasure !== null ? pendingTargetMeasure : currentMeasure;
                const prev = (activeMeasureForNavigation - 1 + totalMeasures) % totalMeasures;
                setPendingTargetMeasure(prev);
                pendingTargetMeasureRef.current = prev;
                onNavigateMeasure?.(prev);
                return;
              }

              let currentIdx = 0;
              if (pendingTargetExpandedIndexRef.current !== null) {
                currentIdx = pendingTargetExpandedIndexRef.current;
              } else {
                const activeMeasureForNavigation = currentMeasure;
                currentIdx = expanded.findIndex(item => item.baseMeasure === activeMeasureForNavigation);
                if (currentIdx === -1) currentIdx = 0;
              }

              const prevIdx = (currentIdx - 1 + expanded.length) % expanded.length;
              const prevBaseMeasure = expanded[prevIdx].baseMeasure;

              setPendingTargetExpandedIndex(prevIdx);
              pendingTargetExpandedIndexRef.current = prevIdx;
              setPendingTargetMeasure(prevBaseMeasure);
              pendingTargetMeasureRef.current = prevBaseMeasure;

              onNavigateMeasure?.(prevBaseMeasure);
            }}
            className="w-6 h-6 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors rounded-sm active:scale-95"
            title={lang === 'pt' ? 'Compasso anterior' : 'Mesure précédente'}
            style={{ padding: 0 }}
          >
            &lt;
          </button>
          <span ref={measureDisplayRef} className="text-sm md:text-base font-cactus font-bold leading-none select-none flex-grow text-center">
            {displayMeasure} / {displayTotal}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const expanded = expandedRef.current;
              if (expanded.length === 0) {
                const activeMeasureForNavigation = pendingTargetMeasure !== null ? pendingTargetMeasure : currentMeasure;
                const next = (activeMeasureForNavigation + 1) % totalMeasures;
                setPendingTargetMeasure(next);
                pendingTargetMeasureRef.current = next;
                onNavigateMeasure?.(next);
                return;
              }

              let currentIdx = 0;
              if (pendingTargetExpandedIndexRef.current !== null) {
                currentIdx = pendingTargetExpandedIndexRef.current;
              } else {
                const activeMeasureForNavigation = currentMeasure;
                currentIdx = expanded.findIndex(item => item.baseMeasure === activeMeasureForNavigation);
                if (currentIdx === -1) currentIdx = 0;
              }

              const nextIdx = (currentIdx + 1) % expanded.length;
              const nextBaseMeasure = expanded[nextIdx].baseMeasure;

              setPendingTargetExpandedIndex(nextIdx);
              pendingTargetExpandedIndexRef.current = nextIdx;
              setPendingTargetMeasure(nextBaseMeasure);
              pendingTargetMeasureRef.current = nextBaseMeasure;

              onNavigateMeasure?.(nextBaseMeasure);
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
          onPointerDown={handleCanvasPointerDown}
          className={`max-w-full max-h-full aspect-square cursor-pointer block select-none ${isPlaying ? 'pointer-events-none' : ''}`}
          style={{ touchAction: 'none' }}
          role="application"
          aria-label={lang === 'pt' ? 'Roda de maracatu — sequenciador circular' : 'Roda de maracatu — sequenciador circular'}
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
            ref={centerAfficheurRef}
            className={`w-[20%] aspect-square rounded-full border-4 border-[var(--cordel-border)] shadow-2xl relative overflow-hidden flex items-center justify-center text-center p-1.5 md:p-2.5 select-none ${isCenterShaking ? 'shake-active' : ''}`}
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
          >
            {/* Background image for signal */}
            <img
              id="center-overlay-img"
              ref={centerOverlayImgRef}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: 'none' }}
            />
            {/* Dark tint overlay for signal readability */}
            <div
              id="center-overlay-tint"
              ref={centerOverlayTintRef}
              className="absolute inset-0 bg-black/30"
              style={{ display: 'none' }}
            />
            {/* Text layer in the center */}
            <span
              id="center-overlay-text"
              ref={centerOverlayTextRef}
              className="relative z-10 font-cactus font-bold uppercase tracking-wide select-none break-words w-full"
              style={{ 
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                fontSize: 'var(--dynamic-font-size, clamp(9px, 1.8vw, 16px))'
              }}
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

export const CircleSequencer = React.memo(CircleSequencerComponent);

