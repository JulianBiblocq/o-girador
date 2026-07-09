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
  TouchSensor,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { AudioFader } from './AudioFader';
import { Pattern } from '../types';
import { MixerChannel } from './MixerChannel';
import { MixerLinkedTrack } from './MixerLinkedTrack';
import { MixerFolderBus } from './MixerFolderBus';
import { MixerMasterEffects } from './MixerMasterEffects';
import { MixerVolumeFader } from './MixerVolumeFader';
import { DragNumberBox } from './DragNumberBox';
import { metroChannel, masterVolumeNode } from '../audio/effectsChain';
import { i18n, instrumentsConfig } from '../data';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { meters, masterMeterNode } from '../hooks/useAudioSync';
import { masterLeftMeterNode, masterRightMeterNode } from '../audio/effectsChain';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';

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
    handleReorderTracksDnd,
    handleTrackInstrumentIdxChange: onInstrumentChange,
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
    return tracks.filter(t => {
      if (t.isHidden) return false;
      if (t.busId) {
        const parentBus = tracks.find(p => String(p.id) === String(t.busId));
        if (parentBus && parentBus.isFolded) return false;
      }
      return true;
    });
  }, [tracks]);
  const displayedTrackIds = useMemo(() => displayedTracks.map(t => `track-${t.id}`), [displayedTracks]);
  
  const setTracks = useSequencerStore(state => state.setTracks);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);

  const {
    isPlaying,
    maxTicksRef,
    soloPatternPlayId,
    soloPatternVariationId,
    handleStartSoloPattern,
    handleStopSoloPattern,
    activeKeyboardInstrumentId,
    setActiveKeyboardInstrumentId,
    handleTimeSigChange,
    masterVol, setMasterVol, masterEQ, setMasterEQ, masterCompressor, setMasterCompressor, reverbDecay, setReverbDecay, masterReverbVol, setMasterReverbVol,
    metroVolume, setMetroVolume, metroSound, setMetroSound, isMetroOn, setIsMetroOn, globalSwing,
    isPresetLoading
  } = audio;

  const maxTicks = maxTicksRef.current;
  const onActiveInstrumentChange = setActiveKeyboardInstrumentId;
  const onMasterVolChange = setMasterVol;
  const onMasterEQChange = setMasterEQ;
  const onMasterCompressorChange = setMasterCompressor;

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
            currentLeftScale = currentLeftScale * 0.90 + targetLeftScale * 0.10; // smooth decay
          }
          lastMasterLeftRef.current = currentLeftScale;

          // Right channel lissage
          const targetRightScale = Math.max(0, Math.min(1, (clampedRightDb + 60) / 65));
          let currentRightScale = lastMasterRightRef.current;
          if (targetRightScale > currentRightScale) {
            currentRightScale = targetRightScale; // instant attack
          } else {
            currentRightScale = currentRightScale * 0.90 + targetRightScale * 0.10; // smooth decay
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
  const isEditingTrackValid = useSequencerStore(state => state.tracks.some(t => t.id === editingTrackId));

  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const editingTrackInstIdx = useSequencerStore(state => state.tracks.find(t => t.id === editingTrackId)?.instrumentIdx);

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
          name: lang === 'fr' ? `Motif ${t.patterns.length + 1}` : `Padrão ${t.patterns.length + 1}`,
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeId = String(active.id);
      const overId = String(over.id);

      if (activeId.startsWith('pattern-') && overId.startsWith('pattern-')) {
        const activePatternId = parseInt(activeId.replace('pattern-', ''), 10);
        const overPatternId = parseInt(overId.replace('pattern-', ''), 10);
        const track = useSequencerStore.getState().tracks.find(t => t.patterns.some(p => p.id === activePatternId));
        if (track && onReorderPatternsDnd) {
          const oldIndex = track.patterns.findIndex(p => p.id === activePatternId);
          const newIndex = track.patterns.findIndex(p => p.id === overPatternId);
          onReorderPatternsDnd(track.id, oldIndex, newIndex);
        }
      } else if (activeId.startsWith('track-') && overId.startsWith('track-')) {
        const activeTrackId = parseInt(activeId.replace('track-', ''), 10);
        const overTrackId = parseInt(overId.replace('track-', ''), 10);
        handleReorderTracksDnd(activeTrackId, overTrackId);
      }
    }
  };

  const memoizedOnClose = React.useCallback(() => setEditingTrackId(null), []);
  const memoizedOnNavigatePrev = React.useCallback(() => {
    const idx = trackIds.indexOf(editingTrackId);
    if (idx > 0) setEditingTrackId(trackIds[idx - 1]);
    else if (trackIds.length > 0) setEditingTrackId(trackIds[trackIds.length - 1]);
  }, [editingTrackId, trackIds]);
  const memoizedOnNavigateNext = React.useCallback(() => {
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
      className={`flex-1 flex flex-col h-full overflow-hidden transition-opacity duration-200 ${isPresetLoading ? 'pointer-events-none opacity-80' : ''}`}
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      <div ref={scrollRef} className="flex-grow flex overflow-x-auto p-4 custom-scrollbar">
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
          <SortableContext items={displayedTrackIds} strategy={horizontalListSortingStrategy}>
            {displayedTracks.map((track, index) => {
              const trackId = track.id;

              const group = track.isBusFolder ? String(track.id) : (track.busId ? String(track.busId) : null);
              const prevTrack = index > 0 ? displayedTracks[index - 1] : null;
              const nextTrack = index < displayedTracks.length - 1 ? displayedTracks[index + 1] : null;

              const prevGroup = prevTrack ? (prevTrack.isBusFolder ? String(prevTrack.id) : (prevTrack.busId ? String(prevTrack.busId) : null)) : null;
              const nextGroup = nextTrack ? (nextTrack.isBusFolder ? String(nextTrack.id) : (nextTrack.busId ? String(nextTrack.busId) : null)) : null;

              let busPosition: 'first' | 'middle' | 'last' | 'none' = 'none';
              if (group) {
                const hasPrev = group === prevGroup;
                const hasNext = group === nextGroup;
                if (!hasPrev && hasNext) busPosition = 'first';
                else if (hasPrev && hasNext) busPosition = 'middle';
                else if (hasPrev && !hasNext) busPosition = 'last';
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
                      isPlaying={isPlaying}
                      isLeftHanded={isLeftHanded}
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
                />
              );
            })}
          </SortableContext>
        </DndContext>



        {/* Master Console Strip */}
        <div 
          className="flex flex-col bg-[var(--cordel-bg)] cordel-border w-[240px] shrink-0 text-[var(--cordel-text)] overflow-hidden relative pb-4 transition-colors"
          style={{
            zIndex: 1,
            '--fader-thumb-bg': '#8b2a1a',
            '--fader-thumb-border': 'var(--cordel-border)',
          } as React.CSSProperties}
        >
          {/* Header / Title */}
          <div className="relative p-3 pb-1 flex justify-center items-center h-[52px] border-b-[3px] border-[var(--cordel-border)] bg-[var(--cordel-bg)]">
            <div className="flex items-center gap-1.5">
              <span className="font-cactus font-bold text-sm tracking-wider">🔥 MASTER</span>
            </div>
          </div>

          {/* Middle Section (EQ & Compressor Controls) */}
          <div className="relative z-10 flex-1 p-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar border-b-[3px] border-[var(--cordel-border)] bg-[#1a1a1a]/5">
            
            {/* EQ Section */}
            <div className="flex flex-col gap-1 border-b border-[var(--cordel-border)]/20 pb-2">
              <span className="text-[10px] font-cactus font-bold tracking-wider text-[var(--cordel-text)] opacity-80">
                🎛️ {t('eqTitle')}
              </span>
              <div className="flex gap-2 justify-between mt-1">
                <DragNumberBox 
                  label={t('eqLow')}
                  value={masterEQ.low}
                  onChange={(val) => onMasterEQChange({ ...masterEQ, low: val })}
                  min={-12}
                  max={12}
                  step={0.5}
                  className="flex-1"
                />
                <DragNumberBox 
                  label={t('eqMid')}
                  value={masterEQ.mid}
                  onChange={(val) => onMasterEQChange({ ...masterEQ, mid: val })}
                  min={-12}
                  max={12}
                  step={0.5}
                  className="flex-1"
                />
                <DragNumberBox 
                  label={t('eqHigh')}
                  value={masterEQ.high}
                  onChange={(val) => onMasterEQChange({ ...masterEQ, high: val })}
                  min={-12}
                  max={12}
                  step={0.5}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Compressor Section */}
            <div className="flex flex-col gap-1 border-b border-[var(--cordel-border)]/20 pb-2">
              <span className="text-[10px] font-cactus font-bold tracking-wider text-[var(--cordel-text)] opacity-80">
                🌀 {t('compTitle')}
              </span>
              <div className="flex gap-2 justify-between mt-1">
                <DragNumberBox 
                  label={t('compThreshold')}
                  value={masterCompressor.threshold}
                  onChange={(val) => onMasterCompressorChange({ ...masterCompressor, threshold: val })}
                  min={-60}
                  max={0}
                  step={1}
                  className="flex-1"
                />
                <DragNumberBox 
                  label={t('compRatio')}
                  value={masterCompressor.ratio}
                  onChange={(val) => onMasterCompressorChange({ ...masterCompressor, ratio: val })}
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
          <div className="relative z-10 p-3 pt-2 flex justify-center items-end h-[200px] gap-8">
            
            {/* Master Fader Column */}
            <div className="flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Master</span>
              <div className="h-[140px] flex items-center">
                <MixerVolumeFader
                  value={Math.max(0, Math.min(100, Math.round(((masterVol + 40) / 46) * 100)))}
                  height={140}
                  thumbWidth={44}
                  thumbHeight={24}
                  fontSize="text-[11px]"
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
            <div className="flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Meter</span>
              <div className="w-7 h-[140px] bg-[var(--cordel-bg)] cordel-border relative overflow-hidden flex gap-[2px] p-[1.5px]">
                <div className="flex-1 h-full bg-[var(--cordel-bg)]/20 relative overflow-hidden">
                  <div
                    ref={vuMeterLeftRef}
                    className="meter-vertical absolute bottom-0 left-0 right-0 bg-[#8b2a1a] w-full"
                    style={{ height: '100%', transform: 'scaleY(0)', transformOrigin: 'bottom', transition: 'none' }}
                  />
                </div>
                <div className="flex-1 h-full bg-[var(--cordel-bg)]/20 relative overflow-hidden">
                  <div
                    ref={vuMeterRightRef}
                    className="meter-vertical absolute bottom-0 left-0 right-0 bg-[#8b2a1a] w-full"
                    style={{ height: '100%', transform: 'scaleY(0)', transformOrigin: 'bottom', transition: 'none' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConsoleMixer = React.memo(ConsoleMixerComponent);
