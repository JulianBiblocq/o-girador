/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo, lazy, Suspense } from 'react';
import * as Tone from 'tone';
import {
  DndContext,
  PointerSensor,
  useSensors,
  useSensor,
  DragEndEvent,
  DragMoveEvent,
  TouchSensor,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { AudioFader } from './AudioFader';
import { Pattern, TrackGroup } from '../types';
import { MixerChannel } from './MixerChannel';
import { MixerLinkedTrack } from './MixerLinkedTrack';
import { MixerFolderBus } from './MixerFolderBus';
import { MixerMasterEffects } from './MixerMasterEffects';
import { MixerVolumeFader } from './MixerVolumeFader';
import { MixerAddChannel } from './MixerAddChannel';
import { MixerKnob } from './MixerKnob';
import { interpolateAutomationValue } from '../utils/automationMath';
import { getNextPatternName } from '../utils/patternNaming';
import { getLastAudibleTick } from '../audio/visualTickBuffer';
import { SaveWorkspaceTemplateModal } from './SaveWorkspaceTemplateModal';
import { DragNumberBox } from './DragNumberBox';
import { XiloEQ, XiloCompressor, XiloMestre, XiloScroll } from './XiloIcons';
import { metroChannel, masterVolumeNode, masterEQNode, masterCompressorNode } from '../audio/effectsChain';
import { i18n, instrumentsConfig } from '../data';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { meters, masterMeterNode } from '../hooks/useAudioSync';
import { masterLeftMeterNode, masterRightMeterNode } from '../audio/effectsChain';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useTransportStore } from '../stores/useTransportStore';
import { useShallow } from 'zustand/react/shallow';
import { getMixerTheme } from '../theme';

import { getTopParentBusId } from '../utils/colorHelpers';

const trackListCache = new Map<string, { id: number; isHidden: boolean; isSolo: boolean; isMute: boolean }>();
const getCachedTrack = (id: number, isHidden: boolean, isSolo: boolean, isMute: boolean) => {
  const key = `${id}_${isHidden}_${isSolo}_${isMute}`;
  let obj = trackListCache.get(key);
  if (!obj) {
    obj = { id, isHidden, isSolo, isMute };
    trackListCache.set(key, obj);
  }
  return obj;
};

const getTrackGroupKey = (t: TrackGroup | null | undefined, allTracks: TrackGroup[]): string | null => {
  if (!t) return null;
  const topBus = getTopParentBusId(t, allTracks);
  if (topBus) return topBus;
  if (t.isLinkFolder) return String(t.id);
  if (t.linkedToTrackId) return String(t.linkedToTrackId);
  if (t.busId) return String(t.busId);
  return null;
};

interface ConsoleMixerProps {
  isMobile: boolean;
  isActive?: boolean;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  editingTrackId: number | null;
  setEditingTrackId: (id: number | null) => void;
}

const ConsoleMixerComponent: React.FC<ConsoleMixerProps> = ({
  isMobile,
  isActive = true,
  onStepTouchStart,
  editingTrackId,
  setEditingTrackId,
}) => {
  const sequencer = useSequencer();
  const audio = useAudio();


  const {
    lang,
    isLeftHanded = false,
    timeSig,
    copiedPattern,
    handleCopyPattern,
    handlePastePattern,
    handleLoadLibraryPattern,
    handleReorderMixerTracks,
    handleReorderTracksDnd,
    handleTrackMuteToggle: onMuteToggle,
    handleTrackSoloToggle: onSoloToggle,
    handleTrackHideToggle: onHideToggle,
    handleTrackDelete: onDelete,
    handleTrackVolumeChange: onVolumeChange,
    handleTrackPanChange: onPanChange,
    handleTrackStepsChange: onStepsChange,
    handleTrackStepValueChange: onStepValueChange,
    handleTrackStepKeyDown: onStepKeyDown,
    handleVoiceTypeToggle: onVoiceTypeToggle,
    handleVoiceSylChange: onVoiceSylChange,
    handleVoiceNoteChange: onVoiceNoteChange,
    handleVoiceNoteBlur: onVoiceNoteBlur,
    handleReorderPatternsDnd: onReorderPatternsDnd,
    handleTrackReverbChange: onReverbChange,
    handleTrackStepVolumeChange: onStepVolumeChange,
    handleTrackStepDecayChange: onStepDecayChange,
    handleTrackStepMicrotimingChange: onStepMicrotimingChange,
    handleResetTrackMicrotimings: onResetMicrotimings,
    handlePatternNameChange: onPatternNameChange,
    handleAddPatternVariation: onAddPatternVariation,
    handleUpdatePatternVariationProbability: onUpdatePatternVariationProbability,
    handleTogglePatternVariationFirstTimeOnly: onTogglePatternVariationFirstTimeOnly,
    handleVariationStepValueChange: onVariationStepValueChange,
    handleVariationStepVolumeChange: onVariationStepVolumeChange,
    handleVariationStepDecayChange: onVariationStepDecayChange,
    handleVariationStepMicrotimingChange: onVariationStepMicrotimingChange,
    handleDeletePatternVariation: onDeletePatternVariation,
    // Vocal Recorder
    isRecordingVocal = false,
    recordingVocalPatternId = null,
    recordedPatternIds = [],
    startVocalRecording: onStartVocalRecording,
    stopVocalRecording: onStopVocalRecording,
    handleVocalModeChange: onVocalModeChange,
    handleDeleteVocalRecording: onDeleteVocalRecording,
    handleVocalLatencyChange: onVocalLatencyChange,
    audioDevices = [],
    selectedAudioDeviceId = '',
    handleAudioDeviceChange: onAudioDeviceChange,
    handleImportVocalFile: onImportVocalFile,
    isVocalGuideEnabled = true,
    setIsVocalGuideEnabled: onVocalGuideToggle,
    handleVocalBpmSyncToggle: onVocalBpmSyncToggle,
    activeVariationsRef,
    runAutoCalibration,
    vocalCalibrationLatencyMs,
  } = sequencer;

  const trackList = useSequencerStore(useShallow(state => state.tracks.map(t => getCachedTrack(t.id, t.isHidden, t.isSolo, t.isMute))));
  const trackIds = trackList.map(t => t.id);
  const tracks = useSequencerStore(state => state.tracks);
  const displayedTracks = useMemo(() => {
    // 1. Filtrer les pistes visibles dans le mixeur
    const filtered = tracks.filter(t => {
      // Les esclaves d'Alfaias masqués de la timeline s'affichent dans le mixeur si leur dossier de liens est déplié
      const isAlfSlave = t.linkedToTrackId && 
        (instrumentsConfig[t.instrumentIdx]?.id === 'meiao' || 
         instrumentsConfig[t.instrumentIdx]?.id === 'repique' || 
         (instrumentsConfig[t.instrumentIdx]?.id === 'marcante' && !t.isLinkMaster));

      if (isAlfSlave && t.isHidden) {
        const parentBus = tracks.find(p => String(p.id) === String(t.linkedToTrackId) && p.isLinkFolder);
        if (parentBus && !parentBus.isFolded) {
          return true;
        }
      }

      if (t.isHidden) return false;
      if (t.busId) {
        const parentBus = tracks.find(p => String(p.id) === String(t.busId));
        if (parentBus && parentBus.isFolded) return false;

        // Sécurité récursive : si n'importe quel parent ascendant est plié
        let currentParent = parentBus;
        while (currentParent) {
          if (currentParent.isFolded) return false;
          if (currentParent.busId) {
            currentParent = tracks.find(p => String(p.id) === String(currentParent!.busId));
          } else {
            break;
          }
        }
      }
      return true;
    });

    // 2. Ordonner hiérarchiquement de gauche à droite
    const visited = new Set<number>();
    const ordered: TrackGroup[] = [];

    const isRoot = (t: TrackGroup) => {
      const isAlfSlave = t.linkedToTrackId && 
        (instrumentsConfig[t.instrumentIdx]?.id === 'meiao' || 
         instrumentsConfig[t.instrumentIdx]?.id === 'repique' || 
         (instrumentsConfig[t.instrumentIdx]?.id === 'marcante' && !t.isLinkMaster));
      if (isAlfSlave) return false;

      if (t.linkedToTrackId && !t.isLinkMaster && !t.isLinkFolder) {
        return false;
      }

      const busIdStr = t.busId;
      if (!busIdStr) return true;

      const hasParent = filtered.some(p => String(p.id) === String(busIdStr));
      return !hasParent;
    };

    const roots = filtered.filter(isRoot);

    const visit = (track: TrackGroup) => {
      if (visited.has(track.id)) return;
      visited.add(track.id);
      ordered.push(track);

      // Trouver les enfants directs (par busId ou par linkedToTrackId)
      const children = filtered.filter(t => {
        if (visited.has(t.id)) return false;
        const isChildByBus = t.busId && String(t.busId) === String(track.id);
        const isChildByLink = t.linkedToTrackId && String(t.linkedToTrackId) === String(track.id);
        return isChildByBus || isChildByLink;
      });

      // Trier les enfants : dossiers de bus/liens en premier
      children.sort((a, b) => {
        const aScore = a.isBusFolder ? 1 : 0;
        const bScore = b.isBusFolder ? 1 : 0;
        return bScore - aScore;
      });

      children.forEach(visit);
    };

    roots.forEach(visit);

    // Ajouter les orphelins éventuels
    filtered.forEach(t => {
      if (!visited.has(t.id)) {
        ordered.push(t);
      }
    });

    return ordered;
  }, [tracks]);
  const displayedTrackIds = useMemo(() => displayedTracks.map(t => `track-${t.id}`), [displayedTracks]);

  const [activeDragTrackId, setActiveDragTrackId] = React.useState<number | null>(null);
  const [overDragTrackId, setOverDragTrackId] = React.useState<number | null>(null);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  
  const setTracks = useSequencerStore(state => state.setTracks);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const measureVols = useSequencerStore(state => state.measureVols);
  const isMasterVolumeBypassed = useSequencerStore(state => state.isMasterVolumeBypassed);
  const toggleMasterVolumeBypass = useSequencerStore(state => state.toggleMasterVolumeBypass);

  const hasMasterVolAuto = useMemo(() => measureVols && measureVols.some(v => v !== 100), [measureVols]);
  const isMasterVolActive = hasMasterVolAuto && !isMasterVolumeBypassed;

  const {
    isMetroOn,
    setIsMetroOn,
    metroVolume,
    setMetroVolume,
    metroSound,
    setMetroSound,
    globalSwing,
    soloPatternPlayId,
    soloPatternVariationId
  } = useTransportStore(
    useShallow((state) => ({
      isMetroOn: state.isMetroOn,
      setIsMetroOn: state.setIsMetroOn,
      metroVolume: state.metroVolume,
      setMetroVolume: state.setMetroVolume,
      metroSound: state.metroSound,
      setMetroSound: state.setMetroSound,
      globalSwing: state.globalSwing,
      soloPatternPlayId: state.soloPatternPlayId,
      soloPatternVariationId: state.soloPatternVariationId
    }))
  );

  const {
    isPlaying,
    maxTicksRef,
    handleStartSoloPattern,
    handleStopSoloPattern,
    activeKeyboardInstrumentId,
    setActiveKeyboardInstrumentId,
    handleTimeSigChange,
    masterVol, setMasterVol, masterEQ, setMasterEQ, masterCompressor, setMasterCompressor, reverbDecay, setReverbDecay, masterReverbVol, setMasterReverbVol,
    isPresetLoading
  } = audio;

  const maxTicks = maxTicksRef.current;
  const onActiveInstrumentChange = setActiveKeyboardInstrumentId;
  const onMasterVolChange = setMasterVol;
  const onMasterEQChange = setMasterEQ;
  const onMasterCompressorChange = setMasterCompressor;

  const isEcoMode = useSequencerStore(state => state.isEcoMode);
  const isEcoModeRef = useRef(isEcoMode);
  isEcoModeRef.current = isEcoMode;
  const measureVolTransitions = useSequencerStore(state => state.measureVolTransitions);
  const measureVolTransitionsRef = useRef(measureVolTransitions);
  measureVolTransitionsRef.current = measureVolTransitions;
  const totalMeasuresRef = useRef(totalMeasures);
  totalMeasuresRef.current = totalMeasures;
  const measureVolsRef = useRef(measureVols);
  measureVolsRef.current = measureVols;
  const masterVolRef = useRef(masterVol);
  masterVolRef.current = masterVol;

  const masterFaderHandleRef = useRef<HTMLDivElement>(null);
  const masterFaderTextRef = useRef<HTMLSpanElement>(null);
  const masterTravelRangeRef = useRef<number>(90);

  const resetMasterFaderPosition = () => {
    if (masterFaderHandleRef.current) {
      masterFaderHandleRef.current.style.transform = 'translateY(0px)';
      if (masterFaderTextRef.current) {
        const manualVal = Math.max(0, Math.min(100, Math.round(((masterVolRef.current + 40) / 46) * 100)));
        masterFaderTextRef.current.textContent = String(manualVal);
      }
    }
  };

  useEffect(() => {
    if (!isPlaying || !isMasterVolActive || isEcoMode) {
      resetMasterFaderPosition();
      return;
    }

    let rafId: number | null = null;

    const animate = () => {
      if (isEcoModeRef.current) {
        resetMasterFaderPosition();
        return;
      }

      const tick = getLastAudibleTick();
      if (tick && tick.measureDuration && tick.measureDuration > 0 && tick.measureStartTime !== undefined) {
        const audioCtxTime = Tone.context?.currentTime ?? (performance.now() / 1000);
        const elapsed = audioCtxTime - tick.measureStartTime;
        const progress = Math.max(0, Math.min(1, elapsed / tick.measureDuration));
        const currentM = tick.measure;
        const totalM = totalMeasuresRef.current || 1;
        const prevM = (currentM - 1 + totalM) % totalM;

        const mVols = measureVolsRef.current;
        if (mVols && mVols.length > 0) {
          const rawStart = mVols[prevM] !== undefined ? mVols[prevM] : 100;
          const rawEnd = mVols[currentM] !== undefined ? mVols[currentM] : 100;
          const trans = measureVolTransitionsRef.current?.[currentM] || 'immediate';
          const interpVol = interpolateAutomationValue(rawStart, rawEnd, progress, trans);

          if (masterFaderHandleRef.current) {
            const manualVal = Math.max(0, Math.min(100, Math.round(((masterVolRef.current + 40) / 46) * 100)));
            const travel = masterTravelRangeRef.current || 90;
            const deltaY = ((manualVal - interpVol) / 100) * travel;
            masterFaderHandleRef.current.style.transform = `translateY(${deltaY}px)`;
          }
          if (masterFaderTextRef.current) {
            masterFaderTextRef.current.textContent = String(Math.round(interpVol));
          }
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      resetMasterFaderPosition();
    };
  }, [isPlaying, isMasterVolActive, isEcoMode]);

  const handleMetroAudioDrag = (val: number) => {
    if (metroChannel && metroChannel.volume) {
      const gain = Math.max(0.00001, val / 100);
      const db = val === 0 ? -Infinity : Tone.gainToDb(gain);
      metroChannel.volume.rampTo(db, 0.05);
    }
  };

  const handleMasterAudioDrag = (val: number) => {
    if (masterVolumeNode && masterVolumeNode.gain) {
      const db = val === 0 ? -Infinity : -40 + (val / 100) * 46;
      const gain = Tone.dbToGain(db);
      masterVolumeNode.gain.rampTo(gain, 0.05);
    }
  };

  const handleMasterEQLowAudioDrag = (val: number) => {
    if (masterEQNode && masterEQNode.low) {
      masterEQNode.low.rampTo(val, 0.05);
    }
  };

  const handleMasterEQMidAudioDrag = (val: number) => {
    if (masterEQNode && masterEQNode.mid) {
      masterEQNode.mid.rampTo(val, 0.05);
    }
  };

  const handleMasterEQHighAudioDrag = (val: number) => {
    if (masterEQNode && masterEQNode.high) {
      masterEQNode.high.rampTo(val, 0.05);
    }
  };

  const handleMasterCompThresholdAudioDrag = (val: number) => {
    if (masterCompressorNode && masterCompressorNode.threshold) {
      try {
        masterCompressorNode.threshold.rampTo(val, 0.05);
      } catch (_) {}
    }
  };

  const handleMasterCompRatioAudioDrag = (val: number) => {
    if (masterCompressorNode && masterCompressorNode.ratio) {
      try {
        masterCompressorNode.ratio.rampTo(val, 0.05);
      } catch (_) {}
    }
  };

  const masterContainerRef = useRef<HTMLDivElement>(null);

  // Injection des tokens de thème sur le conteneur Master (Zéro Render Thrashing)
  useEffect(() => {
    const applyThemeTokens = () => {
      const el = masterContainerRef.current;
      if (!el) return;
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const mode = isLight ? 'light' : 'dark';
      const theme = getMixerTheme('maracatu');

      el.style.setProperty('--master-header-bg', theme.master.headerBg[mode]);
      el.style.setProperty('--master-header-text', theme.master.headerText[mode]);
      el.style.setProperty('--master-border', theme.master.border[mode]);
      el.style.setProperty('--master-fader-thumb', theme.master.faderThumb[mode]);
      el.style.setProperty('--master-comp-bg', theme.master.compressorBg[mode]);
      el.style.setProperty('--comp-color', theme.master.compressorColor || '#d4af37');
      el.style.setProperty('--eq-low-color', theme.eq.low.color);
      el.style.setProperty('--eq-mid-color', theme.eq.mid.color);
      el.style.setProperty('--eq-high-color', theme.eq.high.color);
      el.style.setProperty('--reverb-color', theme.effects.reverb.accentColor);
      el.style.setProperty('--disto-color', theme.effects.distortion.accentColor);
    };

    // 1. Exécution immédiate dès le premier montage
    applyThemeTokens();

    // 2. Écoute directe des mutations de thème sans aucun re-rendu React
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'data-theme') {
          applyThemeTokens();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const [isMasterCollapsed, setIsMasterCollapsed] = useState(isMobile);

  const vuMeterLeftRef = useRef<HTMLDivElement>(null);
  const vuMeterRightRef = useRef<HTMLDivElement>(null);
  const dbTextRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(false);
  const lastMasterLeftRef = useRef<number>(0);
  const lastMasterRightRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive || !isPlaying) {
      lastMasterLeftRef.current = 0;
      lastMasterRightRef.current = 0;
      if (vuMeterLeftRef.current) vuMeterLeftRef.current.style.transform = 'scaleY(0)';
      if (vuMeterRightRef.current) vuMeterRightRef.current.style.transform = 'scaleY(0)';
      if (dbTextRef.current) dbTextRef.current.innerText = '— dB';
      return;
    }

    let animationFrameId: number;
    let idleTimerId: ReturnType<typeof setTimeout> | null = null;

    // Sync isPlayingRef with the value from audio context
    isPlayingRef.current = isPlaying;

    const updateMasterMeter = () => {
      if ((window as any).oGiradorDetailEditorOpen) {
        animationFrameId = requestAnimationFrame(updateMasterMeter);
        return;
      }
      if (!isPlayingRef.current) {
        lastMasterLeftRef.current = 0;
        lastMasterRightRef.current = 0;
        if (vuMeterLeftRef.current) vuMeterLeftRef.current.style.transform = 'scaleY(0)';
        if (vuMeterRightRef.current) vuMeterRightRef.current.style.transform = 'scaleY(0)';
        if (dbTextRef.current) dbTextRef.current.innerText = '— dB';
        idleTimerId = setTimeout(() => {
          animationFrameId = requestAnimationFrame(updateMasterMeter);
        }, 250);
        return;
      }

      const liveLeftMeter = (window as any).masterLeftMeterNode || masterLeftMeterNode;
      const liveRightMeter = (window as any).masterRightMeterNode || masterRightMeterNode;

      if (liveLeftMeter && liveRightMeter) {
        try {
          const leftDb = liveLeftMeter.getValue() as number;
          const rightDb = liveRightMeter.getValue() as number;

          const clampedLeftDb = Math.max(-80, Math.min(6, leftDb));
          const clampedRightDb = Math.max(-80, Math.min(6, rightDb));
          const maxDb = Math.max(clampedLeftDb, clampedRightDb);

          if (dbTextRef.current) {
            dbTextRef.current.innerText = maxDb <= -79 ? '-∞ dB' : `${Math.round(maxDb)} dB`;
          }

          // Left channel lissage
          const targetLeftScale = Math.max(0, Math.min(1, (clampedLeftDb + 60) / 65));
          let currentLeftScale = lastMasterLeftRef.current;
          if (targetLeftScale > currentLeftScale) {
            currentLeftScale = targetLeftScale; // instant attack
          } else {
            currentLeftScale = currentLeftScale * 0.97 + targetLeftScale * 0.03; // smooth decay
          }
          lastMasterLeftRef.current = currentLeftScale;

          // Right channel lissage
          const targetRightScale = Math.max(0, Math.min(1, (clampedRightDb + 60) / 65));
          let currentRightScale = lastMasterRightRef.current;
          if (targetRightScale > currentRightScale) {
            currentRightScale = targetRightScale; // instant attack
          } else {
            currentRightScale = currentRightScale * 0.97 + targetRightScale * 0.03; // smooth decay
          }
          lastMasterRightRef.current = currentRightScale;

          if (vuMeterLeftRef.current) {
            vuMeterLeftRef.current.style.transform = `scaleY(${currentLeftScale})`;
          }
          if (vuMeterRightRef.current) {
            vuMeterRightRef.current.style.transform = `scaleY(${currentRightScale})`;
          }
        } catch (e) {
          console.error("Error reading master meter value:", e);
        }
      } else {
        if (dbTextRef.current) {
          dbTextRef.current.innerText = 'NO MTR';
        }
        if (vuMeterLeftRef.current) vuMeterLeftRef.current.style.transform = 'scaleY(0)';
        if (vuMeterRightRef.current) vuMeterRightRef.current.style.transform = 'scaleY(0)';
      }
      animationFrameId = requestAnimationFrame(updateMasterMeter);
    };

    animationFrameId = requestAnimationFrame(updateMasterMeter);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (idleTimerId) clearTimeout(idleTimerId);
      if (vuMeterLeftRef.current) vuMeterLeftRef.current.style.transform = 'scaleY(0)';
      if (vuMeterRightRef.current) vuMeterRightRef.current.style.transform = 'scaleY(0)';
    };
  }, [isPlaying, isActive]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { isEditingTrackValid, editingTrackInstIdx } = useSequencerStore(
    useShallow((state) => {
      const track = state.tracks.find((t) => t.id === editingTrackId);
      return {
        isEditingTrackValid: !!track,
        editingTrackInstIdx: track?.instrumentIdx,
      };
    })
  );

  const t = (key: string) => (i18n[lang] as any)[key] || key;

  useEffect(() => {
    if (editingTrackInstIdx !== undefined) {
      const inst = instrumentsConfig[editingTrackInstIdx];
      if (inst && inst.type !== 'voice' && onActiveInstrumentChange) {
        onActiveInstrumentChange(inst.id);
      }
    }
  }, [editingTrackInstIdx, onActiveInstrumentChange]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        let target = e.target as HTMLElement | null;
        while (target && target !== el) {
          if (target.scrollHeight > target.clientHeight) {
            const overflowY = window.getComputedStyle(target).overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') {
              return;
            }
          }
          target = target.parentElement;
        }
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onTrackSelectPattern = (trackId: number, patternId: number) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, selectedPatternId: patternId } : t));
  };

  const onPatternAssign = (trackId: number, patternId: number, measureIdx: number, val: boolean) => {
    sequencer.pushUndoState();
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
  };

  const onAddPattern = (trackId: number) => {
    sequencer.pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const p = t.patterns[0];
        const newPattern: Pattern = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          name: getNextPatternName(t.patterns, undefined, lang),
          steps: p.steps,
          activeSteps: Array(p.steps).fill(0),
          lyrics: Array(p.steps).fill(''),
          notes: Array(p.steps).fill(''),
          measureAssignments: Array(totalMeasures).fill(false),
          volumes: Array(p.steps).fill(80),
          decays: Array(p.steps).fill(100),
          microtimings: Array(p.steps).fill(0),
          beatResolutions: p.beatResolutions ? [...p.beatResolutions] : undefined,
        };
        return { ...t, patterns: [...t.patterns, newPattern], selectedPatternId: newPattern.id };
      }
      return t;
    }));
  };

  const onDeletePattern = (trackId: number, patternId: number) => {
    sequencer.pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId && t.patterns.length > 1) {
        const nextPatterns = t.patterns.filter(p => p.id !== patternId);
        const nextSelected = t.selectedPatternId === patternId ? nextPatterns[0].id : t.selectedPatternId;
        return { ...t, patterns: nextPatterns, selectedPatternId: nextSelected };
      }
      return t;
    }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const activeGroupTrackIdsRef = useRef<number[]>([]);
  const activeDragGroupElementsRef = useRef<HTMLElement[]>([]);

  const cleanupGroupDrag = React.useCallback(() => {
    const elements = activeDragGroupElementsRef.current;
    elements.forEach(el => {
      el.classList.remove('mixer-strip-lifted');
      el.style.transform = '';
      el.style.transition = '';
      el.style.zIndex = '';
    });
    activeDragGroupElementsRef.current = [];
    activeGroupTrackIdsRef.current = [];
  }, []);

  const handleDragStart = React.useCallback((event: any) => {
    const activeId = String(event.active.id);
    if (activeId.startsWith('track-')) {
      const activeTrackId = Number(activeId.replace('track-', ''));
      setActiveDragTrackId(activeTrackId);

      const activeTrack = tracks.find(t => t.id === activeTrackId);
      const isGroupHeader = activeTrack && (
        activeTrack.isBusFolder ||
        activeTrack.isLinkFolder ||
        activeTrack.isLinkMaster ||
        tracks.some(t => String(t.busId) === String(activeTrack.id) || String(t.linkedToTrackId) === String(activeTrack.id))
      );

      if (isGroupHeader && scrollRef.current) {
        const children = tracks.filter(t => 
          t.id !== activeTrackId && (
            String(t.busId) === String(activeTrackId) ||
            String(t.linkedToTrackId) === String(activeTrackId) ||
            (activeTrack?.linkedToTrackId && activeTrack.isLinkMaster && String(t.linkedToTrackId) === String(activeTrack.linkedToTrackId))
          )
        );
        const groupIds = [activeTrackId, ...children.map(c => c.id)];
        activeGroupTrackIdsRef.current = groupIds;

        const elements: HTMLElement[] = [];
        groupIds.forEach(id => {
          const el = scrollRef.current?.querySelector(`[data-track-id="${id}"]`) as HTMLElement | null;
          if (el) {
            elements.push(el);
            el.classList.add('mixer-strip-lifted');
            el.style.zIndex = '50';
            el.style.transition = 'none';
          }
        });
        activeDragGroupElementsRef.current = elements;
      } else {
        activeGroupTrackIdsRef.current = [activeTrackId];
        activeDragGroupElementsRef.current = [];
      }
    }
  }, [tracks]);

  const handleDragMove = React.useCallback((event: DragMoveEvent) => {
    const deltaX = event.delta?.x || 0;
    const elements = activeDragGroupElementsRef.current;
    if (elements.length > 1) {
      // Synchronisation directe DOM Vanilla JS des enfants du bloc sans aucun re-render React (Zero Render Thrashing)
      for (let i = 1; i < elements.length; i++) {
        elements[i].style.transform = `translate3d(${deltaX}px, 0px, 0px)`;
      }
    }
  }, []);

  const customCollisionDetection = React.useCallback((args: any) => {
    const collisions = pointerWithin(args);
    if (!collisions || collisions.length === 0) return [];

    const groupIds = activeGroupTrackIdsRef.current;
    if (groupIds.length <= 1) return collisions;

    // Ignorer les collisions internes avec les pistes membres du bloc solidaire actif
    const groupSet = new Set(groupIds.map(id => `track-${id}`));
    const filtered = collisions.filter((c: any) => !groupSet.has(String(c.id)));
    return filtered.length > 0 ? filtered : [];
  }, []);

  const handleDragOver = React.useCallback((event: any) => {
    const overId = event.over ? String(event.over.id) : null;
    if (overId && overId.startsWith('track-')) {
      setOverDragTrackId(Number(overId.replace('track-', '')));
    } else {
      setOverDragTrackId(null);
    }
  }, []);

  const handleDragCancel = React.useCallback(() => {
    cleanupGroupDrag();
    setActiveDragTrackId(null);
    setOverDragTrackId(null);
  }, [cleanupGroupDrag]);

  const handleDragEnd = (event: DragEndEvent) => {
    cleanupGroupDrag();
    setActiveDragTrackId(null);
    setOverDragTrackId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeId = String(active.id);
      const overId = String(over.id);

      if (activeId.startsWith('pattern-') && overId.startsWith('pattern-')) {
        const activePatternId = Number(activeId.replace('pattern-', ''));
        const overPatternId = Number(overId.replace('pattern-', ''));
        const track = useSequencerStore.getState().tracks.find(t => t.patterns.some(p => p.id === activePatternId));
        if (track && onReorderPatternsDnd) {
          const oldIndex = track.patterns.findIndex(p => p.id === activePatternId);
          const newIndex = track.patterns.findIndex(p => p.id === overPatternId);
          onReorderPatternsDnd(track.id, oldIndex, newIndex);
        }
      } else if (activeId.startsWith('track-') && overId.startsWith('track-')) {
        const activeTrackId = Number(activeId.replace('track-', ''));
        const overTrackId = Number(overId.replace('track-', ''));
        const reorderFn = handleReorderMixerTracks || handleReorderTracksDnd;
        if (reorderFn) {
          reorderFn(activeTrackId, overTrackId);
        }
      }
    }
  };

  const memoizedOnClose = React.useCallback(() => setEditingTrackId(null), []);
  const memoizedOnNavigatePrev = React.useCallback(() => {
    if (editingTrackId === null) return;
    const idx = trackIds.indexOf(editingTrackId);
    if (idx > 0) setEditingTrackId(trackIds[idx - 1]);
    else if (trackIds.length > 0) setEditingTrackId(trackIds[trackIds.length - 1]);
  }, [editingTrackId, trackIds]);
  const memoizedOnNavigateNext = React.useCallback(() => {
    if (editingTrackId === null) return;
    const idx = trackIds.indexOf(editingTrackId);
    if (idx >= 0 && idx < trackIds.length - 1) setEditingTrackId(trackIds[idx + 1]);
    else if (trackIds.length > 0) setEditingTrackId(trackIds[0]);
  }, [editingTrackId, trackIds]);
  const memoizedOnStepValueChange = React.useCallback((pid: number, sIdx: number | number[], val: string | string[], lyrics?: string[], notes?: string[]) => {
    if (editingTrackId !== null) {
      onStepValueChange(editingTrackId, pid, sIdx, val, lyrics, notes);
    }
  }, [editingTrackId, onStepValueChange]);
  const memoizedOnStepKeyDown = React.useCallback((pid: number, sIdx: number, k: string, cVal: string, el: HTMLInputElement) => {
    if (editingTrackId !== null) {
      onStepKeyDown(editingTrackId, pid, sIdx, k, cVal, el);
    }
  }, [editingTrackId, onStepKeyDown]);
  const memoizedOnStepsChange = React.useCallback((pid: number, steps: number) => {
    if (editingTrackId !== null) {
      onStepsChange(editingTrackId, pid, steps);
    }
  }, [editingTrackId, onStepsChange]);
  const memoizedOnVoiceTypeToggle = React.useCallback((pid: number, sIdx: number) => {
    if (editingTrackId !== null) {
      onVoiceTypeToggle(editingTrackId, pid, sIdx);
    }
  }, [editingTrackId, onVoiceTypeToggle]);
  const memoizedOnVoiceSylChange = React.useCallback((pid: number, sIdx: number, val: string) => {
    if (editingTrackId !== null) {
      onVoiceSylChange(editingTrackId, pid, sIdx, val);
    }
  }, [editingTrackId, onVoiceSylChange]);
  const memoizedOnVoiceNoteChange = React.useCallback((pid: number, sIdx: number, val: string) => {
    if (editingTrackId !== null) {
      onVoiceNoteChange(editingTrackId, pid, sIdx, val);
    }
  }, [editingTrackId, onVoiceNoteChange]);
  const memoizedOnVoiceNoteBlur = React.useCallback((pid: number, sIdx: number, val: string) => {
    if (editingTrackId !== null) {
      onVoiceNoteBlur(editingTrackId, pid, sIdx, val);
    }
  }, [editingTrackId, onVoiceNoteBlur]);
  const memoizedOnAddPattern = React.useCallback(() => {
    if (editingTrackId !== null) {
      onAddPattern(editingTrackId);
    }
  }, [editingTrackId, onAddPattern]);
  const memoizedOnDeletePattern = React.useCallback((pid: number) => {
    if (editingTrackId !== null) {
      onDeletePattern(editingTrackId, pid);
    }
  }, [editingTrackId, onDeletePattern]);
  const memoizedOnReorderPatternsDnd = React.useCallback((oldIdx: number, newIdx: number) => {
    if (editingTrackId !== null && onReorderPatternsDnd) {
      onReorderPatternsDnd(editingTrackId, oldIdx, newIdx);
    }
  }, [editingTrackId, onReorderPatternsDnd]);
  const memoizedOnAddPatternVariation = React.useCallback((pid: number) => {
    if (editingTrackId !== null && onAddPatternVariation) {
      onAddPatternVariation(editingTrackId, pid);
    }
  }, [editingTrackId, onAddPatternVariation]);
  const memoizedOnUpdatePatternVariationProbability = React.useCallback((pid: number, vid: string, prob: number) => {
    if (editingTrackId !== null && onUpdatePatternVariationProbability) {
      onUpdatePatternVariationProbability(editingTrackId, pid, vid, prob);
    }
  }, [editingTrackId, onUpdatePatternVariationProbability]);
  const memoizedOnTogglePatternVariationFirstTimeOnly = React.useCallback((pid: number, vid: string, val: boolean) => {
    if (editingTrackId !== null && onTogglePatternVariationFirstTimeOnly) {
      onTogglePatternVariationFirstTimeOnly(editingTrackId, pid, vid, val);
    }
  }, [editingTrackId, onTogglePatternVariationFirstTimeOnly]);
  const memoizedOnVariationStepValueChange = React.useCallback((pid: number, vid: string, sIdx: number | number[], val: string | string[]) => {
    if (editingTrackId !== null && onVariationStepValueChange) {
      onVariationStepValueChange(editingTrackId, pid, vid, sIdx, val);
    }
  }, [editingTrackId, onVariationStepValueChange]);
  const memoizedOnDeletePatternVariation = React.useCallback((pid: number, vid: string) => {
    if (editingTrackId !== null && onDeletePatternVariation) {
      onDeletePatternVariation(editingTrackId, pid, vid);
    }
  }, [editingTrackId, onDeletePatternVariation]);
  const memoizedOnStepVolumeChange = React.useCallback((pid: number, sIdx: number | number[], val: number) => {
    if (editingTrackId !== null && onStepVolumeChange) {
      onStepVolumeChange(editingTrackId, pid, sIdx, val);
    }
  }, [editingTrackId, onStepVolumeChange]);
  const memoizedOnStepDecayChange = React.useCallback((pid: number, sIdx: number | number[], val: number) => {
    if (editingTrackId !== null && onStepDecayChange) {
      onStepDecayChange(editingTrackId, pid, sIdx, val);
    }
  }, [editingTrackId, onStepDecayChange]);
  const memoizedOnStepMicrotimingChange = React.useCallback((pid: number, sIdx: number | number[], val: number) => {
    if (editingTrackId !== null && onStepMicrotimingChange) {
      onStepMicrotimingChange(editingTrackId, pid, sIdx, val);
    }
  }, [editingTrackId, onStepMicrotimingChange]);
  const memoizedOnVariationStepVolumeChange = React.useCallback((pid: number, vid: string, sIdx: number | number[], val: number) => {
    if (editingTrackId !== null && onVariationStepVolumeChange) {
      onVariationStepVolumeChange(editingTrackId, pid, vid, sIdx, val);
    }
  }, [editingTrackId, onVariationStepVolumeChange]);
  const memoizedOnVariationStepDecayChange = React.useCallback((pid: number, vid: string, sIdx: number | number[], val: number) => {
    if (editingTrackId !== null && onVariationStepDecayChange) {
      onVariationStepDecayChange(editingTrackId, pid, vid, sIdx, val);
    }
  }, [editingTrackId, onVariationStepDecayChange]);
  const memoizedOnVariationStepMicrotimingChange = React.useCallback((pid: number, vid: string, sIdx: number | number[], val: number) => {
    if (editingTrackId !== null && onVariationStepMicrotimingChange) {
      onVariationStepMicrotimingChange(editingTrackId, pid, vid, sIdx, val);
    }
  }, [editingTrackId, onVariationStepMicrotimingChange]);
  const memoizedOnSelectPattern = React.useCallback((pid: number) => {
    if (editingTrackId !== null) {
      onTrackSelectPattern(editingTrackId, pid);
    }
  }, [editingTrackId]);
  const memoizedOnPatternAssign = React.useCallback((pid: number, mIdx: number, val: boolean) => {
    if (editingTrackId !== null) {
      onPatternAssign(editingTrackId, pid, mIdx, val);
    }
  }, [editingTrackId]);
  const memoizedOnVolumeChange = React.useCallback((val: number) => {
    if (editingTrackId !== null) {
      onVolumeChange(editingTrackId, val);
    }
  }, [editingTrackId, onVolumeChange]);
  const memoizedOnMuteToggle = React.useCallback(() => {
    if (editingTrackId !== null) {
      onMuteToggle(editingTrackId);
    }
  }, [editingTrackId, onMuteToggle]);
  const memoizedOnSoloToggle = React.useCallback(() => {
    if (editingTrackId !== null) {
      onSoloToggle(editingTrackId);
    }
  }, [editingTrackId, onSoloToggle]);
  const memoizedOnPastePattern = React.useCallback((pId: number) => {
    if (editingTrackId !== null) {
      handlePastePattern(editingTrackId, pId);
    }
  }, [editingTrackId, handlePastePattern]);
  const memoizedOnLoadLibraryPattern = React.useCallback((targetPtnId: number, libPattern: any) => {
    if (editingTrackId !== null && handleLoadLibraryPattern) {
      handleLoadLibraryPattern(editingTrackId, targetPtnId, libPattern);
    }
  }, [editingTrackId, handleLoadLibraryPattern]);
  const memoizedOnPatternNameChange = React.useCallback((pid: number, name: string) => {
    if (editingTrackId !== null && onPatternNameChange) {
      onPatternNameChange(editingTrackId, pid, name);
    }
  }, [editingTrackId, onPatternNameChange]);

  const onOpenDetailEditor = React.useCallback((trackId: number) => {
    setEditingTrackId(trackId);
  }, []);

  return (
    <div 
      className={`flex-1 flex flex-col h-full overflow-hidden transition-opacity duration-200 relative ${isPresetLoading ? 'pointer-events-none opacity-80' : ''}`}
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      <div ref={scrollRef} className="flex-grow flex overflow-x-auto pt-4 pb-4 pl-4 pr-0 custom-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={displayedTrackIds} strategy={horizontalListSortingStrategy}>
            {displayedTracks.map((track, index) => {
              const trackId = track.id;
              const prevTrack = index > 0 ? displayedTracks[index - 1] : null;
              const nextTrack = index < displayedTracks.length - 1 ? displayedTracks[index + 1] : null;

              const activeTrack = activeDragTrackId !== null ? tracks.find(t => t.id === activeDragTrackId) : null;
              const overTrack = overDragTrackId !== null ? tracks.find(t => t.id === overDragTrackId) : null;

              const activeGroupKey = getTrackGroupKey(activeTrack, tracks);
              const hoveredGroupKey = getTrackGroupKey(overTrack, tracks);
              const currentTrackGroupKey = getTrackGroupKey(track, tracks);

              // Ce groupe est-il actuellement survolé ?
              const isThisGroupHovered = !!(
                hoveredGroupKey &&
                currentTrackGroupKey === hoveredGroupKey &&
                activeDragTrackId !== null &&
                !activeTrack?.isBusFolder
              );

              // S'agit-il d'une piste externe qui survole ce groupe ?
              const isExternalHoveringThisGroup = !!(
                isThisGroupHovered &&
                (!activeGroupKey || activeGroupKey !== hoveredGroupKey)
              );

              let dropIndicator: 'left' | 'right' | null = null;
              if (
                activeDragTrackId !== null &&
                overDragTrackId === trackId &&
                activeDragTrackId !== trackId &&
                !isExternalHoveringThisGroup
              ) {
                const activeIdx = displayedTracks.findIndex(t => t.id === activeDragTrackId);
                const overIdx = displayedTracks.findIndex(t => t.id === trackId);
                if (activeIdx !== -1 && overIdx !== -1) {
                  dropIndicator = activeIdx < overIdx ? 'right' : 'left';
                }
              }

              const parentBusId = getTopParentBusId(track, tracks);
              const prevParentBusId = prevTrack ? getTopParentBusId(prevTrack, tracks) : null;
              const nextParentBusId = nextTrack ? getTopParentBusId(nextTrack, tracks) : null;

              let busPosition: 'first' | 'middle' | 'last' | 'none' = 'none';
              if (parentBusId) {
                const hasPrev = parentBusId === prevParentBusId;
                const hasNext = parentBusId === nextParentBusId;
                if (!hasPrev && hasNext) busPosition = 'first';
                else if (hasPrev && hasNext) busPosition = 'middle';
                else if (hasPrev && !hasNext) busPosition = 'last';
              }

              const linkGroupId = track.isLinkFolder
                ? String(track.id)
                : (track.linkedToTrackId ? String(track.linkedToTrackId) : null);
              
              const prevLinkGroupId = prevTrack
                ? (prevTrack.isLinkFolder
                    ? String(prevTrack.id)
                    : (prevTrack.linkedToTrackId ? String(prevTrack.linkedToTrackId) : null))
                : null;
              
              const nextLinkGroupId = nextTrack
                ? (nextTrack.isLinkFolder
                    ? String(nextTrack.id)
                    : (nextTrack.linkedToTrackId ? String(nextTrack.linkedToTrackId) : null))
                : null;

              let linkPosition: 'first' | 'middle' | 'last' | 'none' = 'none';
              if (linkGroupId) {
                const hasPrev = linkGroupId === prevLinkGroupId;
                const hasNext = linkGroupId === nextLinkGroupId;
                if (!hasPrev && hasNext) linkPosition = 'first';
                else if (hasPrev && hasNext) linkPosition = 'middle';
                else if (hasPrev && !hasNext) linkPosition = 'last';
              }

              if (track.isBusFolder) {
                if (track.isLinkFolder) {
                  return (
                    <MixerChannel
                      key={trackId}
                      trackId={trackId}
                      index={index}
                      onOpenDetailEditor={onOpenDetailEditor}
                      onCopyPattern={handleCopyPattern}
                      onPastePattern={handlePastePattern}
                      canPaste={copiedPattern !== null}
                      isActive={isActive}
                      busPosition={busPosition}
                      linkPosition={linkPosition}
                      isDragOver={isThisGroupHovered}
                      dropIndicator={dropIndicator}
                    />
                  );
                }
                return (
                  <MixerFolderBus
                    key={trackId}
                    trackId={trackId}
                    index={index}
                    isActive={isActive}
                    busPosition={busPosition}
                    linkPosition={linkPosition}
                    isDragOver={isThisGroupHovered}
                    dropIndicator={dropIndicator}
                  />
                );
              }

              if (track.linkedToTrackId) {
                return (
                  <MixerLinkedTrack
                    key={trackId}
                    trackId={trackId}
                    index={index}
                    onOpenDetailEditor={onOpenDetailEditor}
                    isActive={isActive}
                    busPosition={busPosition}
                    linkPosition={linkPosition}
                    isDragOver={isThisGroupHovered}
                    dropIndicator={dropIndicator}
                  />
                );
              }
              return (
                <MixerChannel
                  key={trackId}
                  trackId={trackId}
                  index={index}
                  onOpenDetailEditor={onOpenDetailEditor}
                  onStepTouchStart={onStepTouchStart}
                  onCopyPattern={handleCopyPattern}
                  onPastePattern={handlePastePattern}
                  canPaste={!!copiedPattern}
                  isActive={isActive}
                  busPosition={busPosition}
                  linkPosition={linkPosition}
                  isDragOver={isThisGroupHovered}
                  dropIndicator={dropIndicator}
                />
              );
            })}
          </SortableContext>
        </DndContext>

        <MixerAddChannel isActive={isActive} />

        {/* Master Console Strip Sticky Wrapper */}
        <div 
          className="flex shrink-0 sticky right-0 z-20 items-stretch shadow-[-8px_0_16px_rgba(0,0,0,0.18)] ml-auto"
          style={{
            position: 'sticky',
            right: 0,
            zIndex: 20,
            marginLeft: 'auto'
          }}
        >
          {/* Master Console Strip */}
          <div 
            ref={masterContainerRef}
            className={`flex flex-col cordel-master-strip shrink-0 text-[var(--cordel-text)] overflow-hidden pb-2 transition-all duration-300 border-2 border-[var(--master-border)] ${
              isMasterCollapsed ? 'w-[45px]' : 'w-[240px]'
            }`}
            style={{
              '--fader-thumb-bg': 'var(--master-fader-thumb)',
              '--fader-thumb-border': 'var(--master-border)',
            } as React.CSSProperties}
          >
          {/* Header / Title */}
          <div className="relative px-3 py-1.5 flex justify-between items-center h-[42px] border-b-2 border-[var(--master-border)] bg-[var(--master-header-bg)] text-[var(--master-header-text)] w-full transition-colors">
            {!isMasterCollapsed ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="font-cactus font-black text-sm tracking-widest flex items-center gap-1.5 uppercase select-none">
                    <XiloMestre size={14} className="shrink-0" /> MASTER
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMasterCollapsed(true)}
                  className="w-6 h-6 bg-transparent text-[var(--master-header-text)] border border-[var(--master-header-text)]/40 hover:border-[var(--master-header-text)] hover:bg-[var(--master-header-text)]/15 font-bold flex items-center justify-center transition-all rounded-[2px] cursor-pointer text-[10px]"
                  title={lang === 'fr' ? 'Replier le Master' : 'Recolher o Master'}
                >
                  ▶
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 mx-auto">
                <button
                  type="button"
                  onClick={() => setIsMasterCollapsed(false)}
                  className="w-7 h-7 bg-transparent text-[var(--master-header-text)] border border-[var(--master-header-text)]/40 hover:border-[var(--master-header-text)] hover:bg-[var(--master-header-text)]/15 font-bold flex items-center justify-center transition-all rounded-[2px] cursor-pointer text-[10px]"
                  title={lang === 'fr' ? 'Déplier le Master' : 'Expandir o Master'}
                >
                  ◀
                </button>
              </div>
            )}
          </div>

          {!isMasterCollapsed ? (
            <>
              {/* Bouton Mémoriser gabarit Cordel */}
              <div className="p-1.5 px-2 border-b-2 border-[var(--master-border)] bg-[var(--cordel-bg)] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSaveTemplateModalOpen(true)}
                  className="w-full py-1 px-2 bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cordel-border-sm cordel-button font-cactus font-bold text-[11px] uppercase flex items-center justify-center gap-1.5 transition-colors shadow-[2px_2px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                  title={lang === 'pt' ? 'Salvar configuração do batuque como modelo privado' : 'Mémoriser la configuration du batuque comme gabarit privé'}
                >
                  <XiloScroll size={14} className="shrink-0" />
                  <span>{lang === 'pt' ? 'Salvar Modelo' : 'Mémoriser gabarit'}</span>
                </button>
              </div>
              {/* Middle Section (EQ & Compressor Controls) */}
              <div className="relative z-10 p-2 flex flex-col gap-2 shrink-0 border-b-2 border-[var(--master-border)] bg-[#1a1a1a]/5">
                
                {/* EQ Section (3 Potentiomètres rotatifs Baxandall ±6 dB) */}
                <div className="flex flex-col gap-1 border-b border-[var(--cordel-border)]/20 pb-1.5">
                  <span className="text-[10px] font-cactus font-bold tracking-wider text-[var(--cordel-text)] opacity-85 flex items-center gap-1">
                    <XiloEQ size={11} className="shrink-0" /> {t('eqTitle')}
                  </span>
                  <div className="flex justify-between items-center w-full mt-0.5 px-0.5">
                    <MixerKnob 
                      label={t('eqLow')}
                      value={masterEQ.low}
                      min={-6.0}
                      max={6.0}
                      step={0.5}
                      decimals={1}
                      defaultValue={0}
                      unit="dB"
                      size={40}
                      color="var(--eq-low-color)"
                      onChange={(val) => onMasterEQChange({ ...masterEQ, low: val })}
                      onAudioDrag={handleMasterEQLowAudioDrag}
                    />
                    <MixerKnob 
                      label={t('eqMid')}
                      value={masterEQ.mid}
                      min={-6.0}
                      max={6.0}
                      step={0.5}
                      decimals={1}
                      defaultValue={0}
                      unit="dB"
                      size={40}
                      color="var(--eq-mid-color)"
                      onChange={(val) => onMasterEQChange({ ...masterEQ, mid: val })}
                      onAudioDrag={handleMasterEQMidAudioDrag}
                    />
                    <MixerKnob 
                      label={t('eqHigh')}
                      value={masterEQ.high}
                      min={-6.0}
                      max={6.0}
                      step={0.5}
                      decimals={1}
                      defaultValue={0}
                      unit="dB"
                      size={40}
                      color="var(--eq-high-color)"
                      onChange={(val) => onMasterEQChange({ ...masterEQ, high: val })}
                      onAudioDrag={handleMasterEQHighAudioDrag}
                    />
                  </div>
                </div>


                {/* Compressor Section */}
                <div className="flex flex-col gap-0.5 border border-[var(--comp-color,#d4af37)]/40 rounded-xs p-1.5 bg-[var(--master-comp-bg)] transition-colors shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-cactus font-bold tracking-wider text-[var(--comp-color,#d4af37)] flex items-center gap-1">
                      <XiloCompressor size={11} className="shrink-0 text-[var(--comp-color,#d4af37)]" /> {t('compTitle')}
                    </span>
                    <span className="text-[8px] font-mono font-bold px-1 rounded-xs bg-[var(--comp-color,#d4af37)]/15 text-[var(--comp-color,#d4af37)] border border-[var(--comp-color,#d4af37)]/30 leading-tight">
                      DYN
                    </span>
                  </div>
                  <div className="flex gap-2 justify-between mt-0.5">
                    <DragNumberBox 
                      label={t('compThreshold')}
                      value={masterCompressor.threshold}
                      onChange={(val) => onMasterCompressorChange({ ...masterCompressor, threshold: val })}
                      onAudioDrag={handleMasterCompThresholdAudioDrag}
                      fillColor="var(--comp-color, #d4af37)"
                      min={-60}
                      max={0}
                      step={1}
                      className="flex-1"
                    />
                    <DragNumberBox 
                      label={t('compRatio')}
                      value={masterCompressor.ratio}
                      onChange={(val) => onMasterCompressorChange({ ...masterCompressor, ratio: val })}
                      onAudioDrag={handleMasterCompRatioAudioDrag}
                      fillColor="var(--comp-color, #d4af37)"
                      min={1}
                      max={12}
                      step={0.1}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Retours d'effets Master (Réverbe & Distorsion) intégrés au milieu */}
                <MixerMasterEffects />

              </div>

              {/* Bottom Fader (Master Fader & Master LED Meter) */}
              <div className="relative z-10 p-3 pt-2 flex justify-center items-stretch flex-grow flex-1 min-h-[140px] h-auto gap-7 overflow-hidden">
                
                {/* Master Fader Column */}
                <div className="flex flex-col items-center gap-1 h-full justify-end flex-1 min-w-0">
                  <div className="flex items-center justify-between w-full px-1 shrink-0 h-4">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Master</span>
                    {hasMasterVolAuto && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMasterVolumeBypass();
                        }}
                        className={`w-[18px] h-[18px] rounded-[3px] flex items-center justify-center font-bold text-[10px] transition-all cursor-pointer select-none ${
                          isMasterVolActive
                            ? 'bg-[#8b2a1a] text-[#f4ecd8] border border-[#a83220] shadow-xs hover:bg-[#a83220]'
                            : 'bg-black/40 text-gray-400 border border-dashed border-gray-600 line-through hover:text-gray-200'
                        }`}
                        title={isMasterVolActive ? "Automation Master Volume active (cliquer pour débrayer)" : "Automation Master Volume débrayée (cliquer pour activer)"}
                      >
                        A
                      </button>
                    )}
                  </div>
                  <div className={`flex-grow flex-1 w-full flex items-center justify-center min-h-0 transition-opacity ${
                    isMasterVolActive ? 'opacity-50 pointer-events-none' : ''
                  }`}>
                    <MixerVolumeFader
                      value={Math.max(0, Math.min(100, Math.round(((masterVol + 40) / 46) * 100)))}
                      thumbWidth={44}
                      thumbHeight={24}
                      fontSize="text-[11px]"
                      isMaster={true}
                      faderColor="var(--master-fader-thumb)"
                      textColor="#f4ecd8"
                      faderHandleRef={masterFaderHandleRef}
                      valueTextRefProp={masterFaderTextRef}
                      travelRangeRef={masterTravelRangeRef}
                      onChange={(val) => {
                        const db = val === 0 ? -40 : -40 + (val / 100) * 46;
                        onMasterVolChange(db);
                      }}
                      onAudioDrag={(val) => {
                        if (masterVolumeNode && masterVolumeNode.gain) {
                           const db = val === 0 ? -Infinity : -40 + (val / 100) * 46;
                           const gain = Tone.dbToGain(db);
                           masterVolumeNode.gain.rampTo(gain, 0.05);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Master LED Meter (Stereo) */}
                <div className="flex flex-col items-center gap-1 h-full justify-end shrink-0 w-8">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60 shrink-0">Meter</span>
                  <div className="w-8 flex-grow flex-1 bg-[var(--cordel-bg)] border border-[var(--master-border)]/40 relative overflow-hidden flex gap-[2px] p-[1.5px] min-h-0">
                    <div className="flex-1 h-full bg-[var(--cordel-bg)]/20 relative overflow-hidden">
                      <div
                        ref={vuMeterLeftRef}
                        className="meter-vertical absolute bottom-0 left-0 right-0 bg-[var(--master-fader-thumb)] w-full"
                        style={{ height: '100%', transform: 'scaleY(0)', transformOrigin: 'bottom', transition: 'none' }}
                      />
                    </div>
                    <div className="flex-1 h-full bg-[var(--cordel-bg)]/20 relative overflow-hidden">
                      <div
                        ref={vuMeterRightRef}
                        className="meter-vertical absolute bottom-0 left-0 right-0 bg-[var(--master-fader-thumb)] w-full"
                        style={{ height: '100%', transform: 'scaleY(0)', transformOrigin: 'bottom', transition: 'none' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Version Repliée */
            <div className="flex-grow flex flex-col items-center justify-between py-3 px-1 w-full gap-4 min-h-0 bg-[var(--master-header-bg)] text-[var(--master-header-text)] transition-colors">
              {/* Titre vertical cliquable pour déplier */}
              <div 
                className="flex-grow flex items-center justify-center select-none py-2 cursor-pointer"
                onClick={() => setIsMasterCollapsed(false)}
                title={lang === 'fr' ? 'Déplier le Master' : 'Expandir o Master'}
              >
                <span
                  className="font-cactus font-black text-xs tracking-widest text-[var(--master-header-text)] opacity-85 hover:opacity-100 transition-opacity uppercase"
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }}
                >
                  MASTER
                </span>
              </div>

              {/* VU-mètre LED vertical Master (Même taille et hauteur généreuse que le Master déplié) */}
              <div className="flex flex-col items-center gap-1 shrink-0 w-8 h-[280px] pb-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--master-header-text)]/60 shrink-0">Meter</span>
                <div className="w-8 flex-grow flex-1 bg-[var(--cordel-bg)] border border-[var(--master-border)]/40 relative overflow-hidden flex gap-[2px] p-[1.5px] min-h-0">
                  <div className="flex-1 h-full bg-[var(--cordel-bg)]/20 relative overflow-hidden">
                    <div
                      ref={vuMeterLeftRef}
                      className="meter-vertical absolute bottom-0 left-0 right-0 bg-[var(--master-fader-thumb)] w-full"
                      style={{ height: '100%', transform: 'scaleY(0)', transformOrigin: 'bottom', transition: 'none' }}
                    />
                  </div>
                  <div className="flex-1 h-full bg-[var(--cordel-bg)]/20 relative overflow-hidden">
                    <div
                      ref={vuMeterRightRef}
                      className="meter-vertical absolute bottom-0 left-0 right-0 bg-[var(--master-fader-thumb)] w-full"
                      style={{ height: '100%', transform: 'scaleY(0)', transformOrigin: 'bottom', transition: 'none' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Solid masking spacer on the right */}
          <div className="w-4 shrink-0 bg-[var(--cordel-bg)] z-10 transition-colors" />
        </div>
      </div>

      <SaveWorkspaceTemplateModal
        isOpen={isSaveTemplateModalOpen}
        onClose={() => setIsSaveTemplateModalOpen(false)}
        lang={lang}
      />
    </div>
  </div>
);
};

export const ConsoleMixer = React.memo(ConsoleMixerComponent);
