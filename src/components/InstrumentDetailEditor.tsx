/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { useSequencerStore, isLinearDAWVisibleTrack, isSequencerVisibleTrack } from '../stores/useSequencerStore';
import { useTransportStore } from '../stores/useTransportStore';
import { useShallow } from 'zustand/react/shallow';
import { subscribeToTick, unsubscribeFromTick, getActiveStrokesForTrack, audioEngine } from '../hooks/useAudioSync';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { useMidiStore } from '../stores/useMidiStore';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getStrokesForInstrument, STEP_OPTIONS } from '../utils/instrumentStrokes';
import { createPortal } from 'react-dom';
import { Play, Square, GripVertical } from 'lucide-react';
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  useSensors,
  useSensor,
  DragEndEvent,
  TouchSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { Pattern, RhythmSignal, CloudPattern, CatalogVisibility, Language, GlobalSwing } from '../types';
import { i18n, instrumentsConfig, ASSETS_BASE_URL, isDarkText, NEWTON_NOTE_COLORS } from '../data';
import { useAuth } from '../contexts/AuthContext';
import { fetchCloudPatterns, savePatternToCloud, deleteCloudPattern } from '../cloudPatterns';
import { useGameData } from '../contexts/GameDataContext';
import { AudioFader } from './AudioFader';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { MelodicNoteSelector } from './MelodicNoteSelector';
import { PatternVariationsEditor } from './instrument-editor/PatternVariationsEditor';
import { InstrumentEffects } from './InstrumentEffects';
import { InstrumentPatternGrid } from './InstrumentPatternGrid';
import { XiloChisel, XiloMegaphone } from './XiloIcons';

const SortablePatternWrapper = ({ id, children, className, style: propStyle }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { ...propStyle, transform: CSS.Transform.toString(transform), transition };
  return children({ setNodeRef, style, attributes, listeners });
};

const getPatternUsage = (patternId: number, parentBusTrack: any, allTracks: any[], lang: string) => {
  const pattern = parentBusTrack.patterns.find((p: any) => p.id === patternId);
  if (!pattern) return [];

  const totalMeasures = pattern.measureAssignments.length;
  const usage: Array<{
    trackName: string;
    trackId: number;
    isMaster: boolean;
    measures: number[];
  }> = [];

  if (!parentBusTrack.isLinkFolder) {
    const measures: number[] = [];
    for (let m = 0; m < totalMeasures; m++) {
      if (pattern.measureAssignments[m]) {
        measures.push(m + 1);
      }
    }
    if (measures.length > 0) {
      usage.push({
        trackName: parentBusTrack.customName || instrumentsConfig[parentBusTrack.instrumentIdx]?.name || 'Instrument',
        trackId: parentBusTrack.id,
        isMaster: true,
        measures
      });
    }
    return usage;
  }

  // 1. Find master track and slave tracks for this group
  const masterTrack = allTracks.find(t => String(t.linkedToTrackId) === String(parentBusTrack.id) && t.isLinkMaster);
  const slaveTracks = allTracks.filter(t => String(t.linkedToTrackId) === String(parentBusTrack.id) && !t.isLinkFolder && !t.isLinkMaster);

  // Track usage for master
  if (masterTrack) {
    const masterMeasures: number[] = [];
    for (let m = 0; m < totalMeasures; m++) {
      if (pattern.measureAssignments[m]) {
        masterMeasures.push(m + 1);
      }
    }
    if (masterMeasures.length > 0) {
      usage.push({
        trackName: masterTrack.customName || instrumentsConfig[masterTrack.instrumentIdx]?.name || 'Master',
        trackId: masterTrack.id,
        isMaster: true,
        measures: masterMeasures
      });
    }
  }

  // Track usage for slaves
  slaveTracks.forEach(slave => {
    const slaveMeasures: number[] = [];
    for (let m = 0; m < totalMeasures; m++) {
      const override = slave.patternOverrides?.[m];
      if (override === patternId) {
        slaveMeasures.push(m + 1);
      } else if (override === undefined && pattern.measureAssignments[m]) {
        slaveMeasures.push(m + 1);
      }
    }
    if (slaveMeasures.length > 0) {
      usage.push({
        trackName: slave.customName || instrumentsConfig[slave.instrumentIdx]?.name || (lang === 'fr' ? 'Esclave' : 'Escravo'),
        trackId: slave.id,
        isMaster: false,
        measures: slaveMeasures
      });
    }
  });

  return usage;
};

const midiNoteToName = (note: number): string => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(note / 12) - 1;
  return `${notes[note % 12]}${octave}`;
};

interface InstrumentDetailEditorProps {
  trackId: number;
  onClose: () => void;
  isMobile: boolean;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  setEditingTrackId: (id: number | null) => void;
}

const InstrumentDetailEditorComponent: React.FC<InstrumentDetailEditorProps> = ({
  trackId,
  onClose,
  isMobile,
  onStepTouchStart,
  setEditingTrackId,
}) => {

  const sequencer = useSequencer();
  const audio = useAudio();

  // Zustand states and granular selectors (Commandement 1)
  const lang = useSequencerStore(state => state.lang);
  const isLeftHanded = useSequencerStore(state => state.isLeftHanded);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const currentMeasure = useSequencerStore(state => state.currentMeasure);

  // Audio states
  const isPlaying = audio.isPlaying;
  const { soloPatternPlayId, soloPatternVariationId } = useTransportStore(
    useShallow((state) => ({
      soloPatternPlayId: state.soloPatternPlayId,
      soloPatternVariationId: state.soloPatternVariationId
    }))
  );
  const vocalCalibrationLatencyMs = useSequencerStore(state => state.vocalCalibrationLatencyMs);
  const setTracks = useSequencerStore(state => state.setTracks);
  const pushUndoState = useSequencerStore(state => state.pushUndoState);

  // Settings Store hooks for global stroke controls
  const forcedStrokes = useSequencerSettingsStore(state => state.forcedStrokes) || {};
  const setStrokeForcedState = useSequencerSettingsStore(state => state.setStrokeForcedState);
  const strokeDefaults = useSequencerSettingsStore(state => state.strokeDefaults);
  const setStrokeDefault = useSequencerSettingsStore(state => state.setStrokeDefault);

  // MIDI store hooks
  const isMidiLearnActive = useMidiStore(state => state.isMidiLearnActive);
  const setMidiLearnActive = useMidiStore(state => state.setMidiLearnActive);
  const waitingForMidiStroke = useMidiStore(state => state.waitingForMidiStroke);
  const setWaitingForMidiStroke = useMidiStore(state => state.setWaitingForMidiStroke);
  const mappings = useMidiStore(state => state.mappings);
  const removeMidiMapping = useMidiStore(state => state.removeMidiMapping);

  const [selectedStrokeMacro, setSelectedStrokeMacro] = useState<string | null>(null);

  const canPaste = !!sequencer.copiedPattern;

  // Callbacks mapped directly to sequencer context actions
  const onStepValueChange = React.useCallback((
    patternId: number,
    stepIdx: number | number[],
    val: string | string[],
    lyrics?: string[],
    notes?: string[]
  ) => {
    sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, val, lyrics, notes);
  }, [trackId, sequencer]);

  const onStepKeyDown = React.useCallback((
    patternId: number,
    stepIdx: number,
    key: string,
    currentVal: string,
    targetEl: HTMLInputElement
  ) => {
    sequencer.handleTrackStepKeyDown(trackId, patternId, stepIdx, key, currentVal, targetEl);
  }, [trackId, sequencer]);

  const onVoiceTypeToggle = React.useCallback((patternId: number, stepIdx: number) => {
    sequencer.handleVoiceTypeToggle(trackId, patternId, stepIdx);
  }, [trackId, sequencer]);

  const onVoiceSylChange = React.useCallback((patternId: number, stepIdx: number, val: string) => {
    sequencer.handleVoiceSylChange(trackId, patternId, stepIdx, val);
  }, [trackId, sequencer]);

  const onVoiceNoteChange = React.useCallback((patternId: number, stepIdx: number, val: string) => {
    sequencer.handleVoiceNoteChange(trackId, patternId, stepIdx, val);
  }, [trackId, sequencer]);

  const onVoiceNoteBlur = React.useCallback((patternId: number, stepIdx: number, val: string) => {
    sequencer.handleVoiceNoteBlur(trackId, patternId, stepIdx, val);
  }, [trackId, sequencer]);

  const onCopyPattern = sequencer.handleCopyPattern;

  const onPlaySoloPattern = audio.handleStartSoloPattern;
  const onStopSoloPattern = audio.handleStopSoloPattern;

  // Local actions utilizing trackId
  const onStepsChange = React.useCallback((patternId: number, steps: number) => {
    sequencer.handleTrackStepsChange(trackId, patternId, steps);
  }, [trackId, sequencer]);

  const onAddPattern = React.useCallback(() => {
    sequencer.pushUndoState();
    useSequencerStore.getState().setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const p = t.patterns[0];
        const newPattern = {
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
          variations: [],
        };
        return { ...t, patterns: [...t.patterns, newPattern], selectedPatternId: newPattern.id };
      }
      return t;
    }));
  }, [trackId, sequencer, totalMeasures]);

  const onDeletePattern = React.useCallback((patternId: number) => {
    sequencer.pushUndoState();
    useSequencerStore.getState().setTracks(prev => prev.map(t => {
      if (t.id === trackId && t.patterns.length > 1) {
        const nextPatterns = t.patterns.filter(p => p.id !== patternId);
        const nextSelected = t.selectedPatternId === patternId ? nextPatterns[0].id : t.selectedPatternId;
        return { ...t, patterns: nextPatterns, selectedPatternId: nextSelected };
      }
      return t;
    }));
  }, [trackId, sequencer]);

  const onSelectPattern = React.useCallback((patternId: number) => {
    useSequencerStore.getState().setTracks(prev =>
      prev.map(t => t.id === trackId ? { ...t, selectedPatternId: patternId } : t)
    );
  }, [trackId]);

  const onReorderPatternsDnd = React.useCallback((oldIndex: number, newIndex: number) => {
    if (sequencer.handleReorderPatternsDnd) {
      sequencer.handleReorderPatternsDnd(trackId, oldIndex, newIndex);
    }
  }, [trackId, sequencer]);

  const onAddPatternVariation = React.useCallback((patternId: number) => {
    if (sequencer.handleAddPatternVariation) {
      sequencer.handleAddPatternVariation(trackId, patternId);
    }
  }, [trackId, sequencer]);

  const onUpdatePatternVariationProbability = React.useCallback((patternId: number, variationId: string, probability: number) => {
    if (sequencer.handleUpdatePatternVariationProbability) {
      sequencer.handleUpdatePatternVariationProbability(trackId, patternId, variationId, probability);
    }
  }, [trackId, sequencer]);

  const onTogglePatternVariationFirstTimeOnly = React.useCallback((patternId: number, variationId: string, val: boolean) => {
    if (sequencer.handleTogglePatternVariationFirstTimeOnly) {
      sequencer.handleTogglePatternVariationFirstTimeOnly(trackId, patternId, variationId, val);
    }
  }, [trackId, sequencer]);

  const onVariationStepValueChange = React.useCallback((patternId: number, variationId: string, stepIdx: number | number[], val: string | string[]) => {
    if (sequencer.handleVariationStepValueChange) {
      sequencer.handleVariationStepValueChange(trackId, patternId, variationId, stepIdx, val);
    }
  }, [trackId, sequencer]);

  const onDeletePatternVariation = React.useCallback((patternId: number, variationId: string) => {
    if (sequencer.handleDeletePatternVariation) {
      sequencer.handleDeletePatternVariation(trackId, patternId, variationId);
    }
  }, [trackId, sequencer]);


  const onVolumeChange = React.useCallback((val: number) => {
    sequencer.handleTrackVolumeChange(trackId, val);
  }, [trackId, sequencer]);

  const onMuteToggle = React.useCallback(() => {
    sequencer.handleTrackMuteToggle(trackId);
  }, [trackId, sequencer]);

  const onSoloToggle = React.useCallback(() => {
    sequencer.handleTrackSoloToggle(trackId);
  }, [trackId, sequencer]);

  const onStepVolumeChange = React.useCallback((patternId: number, stepIdx: number | number[], val: number) => {
    sequencer.handleTrackStepVolumeChange(trackId, patternId, stepIdx, val);
  }, [trackId, sequencer]);

  const onStepDecayChange = React.useCallback((patternId: number, stepIdx: number | number[], val: number) => {
    sequencer.handleTrackStepDecayChange(trackId, patternId, stepIdx, val);
  }, [trackId, sequencer]);

  const onStepMicrotimingChange = React.useCallback((patternId: number, stepIdx: number | number[], val: number) => {
    sequencer.handleTrackStepMicrotimingChange(trackId, patternId, stepIdx, val);
  }, [trackId, sequencer]);

  const onVariationStepVolumeChange = React.useCallback((patternId: number, variationId: string, stepIdx: number | number[], val: number) => {
    sequencer.handleVariationStepVolumeChange(trackId, patternId, variationId, stepIdx, val);
  }, [trackId, sequencer]);

  const onVariationStepDecayChange = React.useCallback((patternId: number, variationId: string, stepIdx: number | number[], val: number) => {
    sequencer.handleVariationStepDecayChange(trackId, patternId, variationId, stepIdx, val);
  }, [trackId, sequencer]);

  const onVariationStepMicrotimingChange = React.useCallback((patternId: number, variationId: string, stepIdx: number | number[], val: number) => {
    sequencer.handleVariationStepMicrotimingChange(trackId, patternId, variationId, stepIdx, val);
  }, [trackId, sequencer]);

  const onPastePattern = React.useCallback((patternId: number) => {
    sequencer.handlePastePattern(trackId, patternId);
  }, [trackId, sequencer]);

  const onLoadLibraryPattern = React.useCallback((targetPatternId: number, libraryPattern: any) => {
    if (sequencer.handleLoadLibraryPattern) {
      sequencer.handleLoadLibraryPattern(trackId, targetPatternId, libraryPattern);
    }
  }, [trackId, sequencer]);

  const onPatternNameChange = React.useCallback((patternId: number, name: string) => {
    sequencer.handlePatternNameChange(trackId, patternId, name);
  }, [trackId, sequencer]);

  // Dynamic Navigation callbacks
  const onNavigatePrev = React.useCallback(() => {
    const tracksList = useSequencerStore.getState().tracks.filter(t => !t.isHidden && isSequencerVisibleTrack(t, useSequencerStore.getState().tracks));
    const idx = tracksList.findIndex(t => t.id === trackId);
    if (idx > 0) {
      setEditingTrackId(tracksList[idx - 1].id);
    } else if (idx === 0 && tracksList.length > 0) {
      setEditingTrackId(tracksList[tracksList.length - 1].id);
    }
  }, [trackId, setEditingTrackId]);

  const onNavigateNext = React.useCallback(() => {
    const tracksList = useSequencerStore.getState().tracks.filter(t => !t.isHidden && isSequencerVisibleTrack(t, useSequencerStore.getState().tracks));
    const idx = tracksList.findIndex(t => t.id === trackId);
    if (idx >= 0 && idx < tracksList.length - 1) {
      setEditingTrackId(tracksList[idx + 1].id);
    } else if (idx === tracksList.length - 1 && tracksList.length > 0) {
      setEditingTrackId(tracksList[0].id);
    }
  }, [trackId, setEditingTrackId]);

  const onKeyDown = React.useCallback((e: any) => {
    const tracksList = useSequencerStore.getState().tracks.filter(t => !t.isHidden && isSequencerVisibleTrack(t, useSequencerStore.getState().tracks));
    const idx = tracksList.findIndex(t => t.id === trackId);
    if (e.key === 'ArrowDown') {
      if (idx >= 0 && idx < tracksList.length - 1) {
        setEditingTrackId(tracksList[idx + 1].id);
      } else if (idx === tracksList.length - 1 && tracksList.length > 0) {
        setEditingTrackId(tracksList[0].id);
      }
    } else if (e.key === 'ArrowUp') {
      if (idx > 0) {
        setEditingTrackId(tracksList[idx - 1].id);
      } else if (idx === 0 && tracksList.length > 0) {
        setEditingTrackId(tracksList[tracksList.length - 1].id);
      }
    }
  }, [trackId, setEditingTrackId]);

  // Granular selection of only the current track to prevent parent-level render thrashing
  const track = useSequencerStore(
    React.useCallback(state => state.tracks.find(t => t.id === trackId), [trackId])
  );
  const allTracks = useSequencerStore(state => state.tracks);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const inst = track ? instrumentsConfig[track.instrumentIdx] : { id: '', name: '', type: 'percussion', iconImg: '', colors: { text: '' }, mixerBg: '' };
  
  if (!track) return null;

  // 1. Calculer les moyennes réelles (volume et decay) pour une frappe donnée sur la piste en cours
  const getStrokeAverages = (stroke: string) => {
    let volSum = 0;
    let volCount = 0;
    let decaySum = 0;
    let decayCount = 0;

    const isVoice = inst?.type === 'voice';
    const defaultDecay = isVoice ? 10 : 100;

    track.patterns.forEach((p) => {
      const vols = p.volumes || [];
      const decays = p.decays || [];

      p.activeSteps.forEach((step, idx) => {
        if (step === stroke) {
          volSum += vols[idx] !== undefined ? vols[idx] : 80;
          volCount++;
          decaySum += decays[idx] !== undefined ? decays[idx] : defaultDecay;
          decayCount++;
        }
      });

      p.variations?.forEach((v) => {
        const varVols = v.volumes || [];
        const varDecays = v.decays || [];
        v.steps.forEach((step, idx) => {
          if (step === stroke) {
            volSum += varVols[idx] !== undefined ? varVols[idx] : 80;
            volCount++;
            decaySum += varDecays[idx] !== undefined ? varDecays[idx] : defaultDecay;
            decayCount++;
          }
        });
      });
    });

    if (volCount > 0 && decayCount > 0) {
      return {
        avgVolume: Math.round(volSum / volCount),
        avgDecay: Math.round(decaySum / decayCount),
      };
    }

    // Récupération de la valeur par défaut anticipée dans les strokeDefaults
    const defaults = strokeDefaults[`${track.id}:${stroke}`];
    return {
      avgVolume: defaults?.volume !== undefined ? defaults.volume : 80,
      avgDecay: defaults?.decay !== undefined ? defaults.decay : defaultDecay,
    };
  };

  // 2. Appliquer un delta de volume relatif sur tous les pas correspondants de la piste, et sauvegarder la valeur par défaut
  const applyMacroVolumeDelta = (stroke: string, delta: number, targetVal: number) => {
    if (pushUndoState) pushUndoState();

    // Enregistrer la macro par défaut anticipée
    setStrokeDefault(`${trackId}:${stroke}`, { volume: targetVal });

    setTracks(prevTracks => prevTracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            const newVols = [...(p.volumes || Array(p.steps).fill(80))];
            let hasChanged = false;
            p.activeSteps.forEach((step, idx) => {
              if (step === stroke) {
                newVols[idx] = Math.max(0, Math.min(100, newVols[idx] + delta));
                hasChanged = true;
              }
            });

            const newVariations = p.variations?.map(v => {
              const newVarVols = [...(v.volumes || Array(v.steps.length).fill(80))];
              let varChanged = false;
              v.steps.forEach((step, idx) => {
                if (step === stroke) {
                  newVarVols[idx] = Math.max(0, Math.min(100, newVarVols[idx] + delta));
                  varChanged = true;
                }
              });
              return varChanged ? { ...v, volumes: newVarVols } : v;
            });

            return (hasChanged || p.variations) ? { ...p, volumes: newVols, variations: newVariations } : p;
          })
        };
      }
      return t;
    }));
  };

  // 3. Appliquer un delta de decay relatif sur tous les pas correspondants de la piste, et sauvegarder la valeur par défaut
  const applyMacroDecayDelta = (stroke: string, delta: number, targetVal: number) => {
    if (pushUndoState) pushUndoState();

    // Enregistrer la macro par défaut anticipée
    setStrokeDefault(`${trackId}:${stroke}`, { decay: targetVal });

    setTracks(prevTracks => prevTracks.map(t => {
      if (t.id === trackId) {
        const isVoice = inst?.type === 'voice';
        const defaultDecay = isVoice ? 10 : 100;

        return {
          ...t,
          patterns: t.patterns.map(p => {
            const newDecays = [...(p.decays || Array(p.steps).fill(defaultDecay))];
            let hasChanged = false;
            p.activeSteps.forEach((step, idx) => {
              if (step === stroke) {
                newDecays[idx] = Math.max(10, Math.min(100, newDecays[idx] + delta));
                hasChanged = true;
              }
            });

            const newVariations = p.variations?.map(v => {
              const newVarDecays = [...(v.decays || Array(v.steps.length).fill(defaultDecay))];
              let varChanged = false;
              v.steps.forEach((step, idx) => {
                if (step === stroke) {
                  newVarDecays[idx] = Math.max(10, Math.min(100, newVarDecays[idx] + delta));
                  varChanged = true;
                }
              });
              return varChanged ? { ...v, decays: newVarDecays } : v;
            });

            return (hasChanged || p.variations) ? { ...p, decays: newDecays, variations: newVariations } : p;
          })
        };
      }
      return t;
    }));
  };

  const [editingPatternId, setEditingPatternId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [noteSelectorTarget, setNoteSelectorTarget] = useState<{ patternId: number; stepIdx: number; note: string; element: HTMLElement } | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const isPlayingRef = useRef(isPlaying);
  const soloPatternPlayIdRef = useRef(soloPatternPlayId);
  const trackRef = useRef(track);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastActivePatternIdRef = useRef<number | null>(null);
  const patternDOMRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const badgeDOMRefs = useRef<Map<number, HTMLSpanElement>>(new Map());

  useEffect(() => {
    (window as any).oGiradorDetailEditorOpen = true;
    return () => {
      (window as any).oGiradorDetailEditorOpen = false;
    };
  }, []);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { soloPatternPlayIdRef.current = soloPatternPlayId; }, [soloPatternPlayId]);
  useEffect(() => { trackRef.current = track; }, [track]);

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
    if (over && active.id !== over.id && onReorderPatternsDnd) {
      const oldIndex = track.patterns.findIndex(p => p.id === active.id);
      const newIndex = track.patterns.findIndex(p => p.id === over.id);
      onReorderPatternsDnd(oldIndex, newIndex);
    }
  };

  const patternIds = useMemo(() => track.patterns.map(p => p.id), [track.patterns]);

  // --- Pattern Cloud Logic ---
  const { userProfile } = useAuth();
  const [cloudPatterns, setCloudPatterns] = useState<CloudPattern[]>([]);
  const [isSavingPattern, setIsSavingPattern] = useState(false);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);
  const [savePatternVisibility, setSavePatternVisibility] = useState<CatalogVisibility>('private');

  useEffect(() => {
    const loadPatterns = async () => {
      if (!userProfile) return;
      setIsLoadingPatterns(true);
      const patterns = await fetchCloudPatterns(userProfile.uid, userProfile.role, userProfile.mestreId || null);
      setCloudPatterns(patterns);
      setIsLoadingPatterns(false);
    };
    loadPatterns();
  }, [userProfile]);

  const existingLibraryPatterns = cloudPatterns.filter(p => p.instrumentId === inst.id);
  const existingFolders = Array.from(new Set(existingLibraryPatterns.map(p => p.folder))).filter(Boolean);

  const [saveModalPatternId, setSaveModalPatternId] = useState<number | null>(null);
  const [savePatternName, setSavePatternName] = useState('');
  const [savePatternFolder, setSavePatternFolder] = useState('');
  const [loadModalPatternId, setLoadModalPatternId] = useState<number | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSavePatternToLibrary = async () => {
    if (saveModalPatternId === null || !savePatternName.trim() || !userProfile) return;
    const ptn = track.patterns.find(p => p.id === saveModalPatternId);
    if (!ptn) return;

    setIsSavingPattern(true);
    try {
      const savedPattern = {
        id: crypto.randomUUID(),
        instrumentId: inst.id,
        name: savePatternName.trim(),
        folder: savePatternFolder.trim() || 'Général',
        steps: [...ptn.activeSteps],
        variations: JSON.parse(JSON.stringify(ptn.variations || [])),
        volumes: ptn.volumes ? [...ptn.volumes] : undefined,
        decays: ptn.decays ? [...ptn.decays] : undefined,
        microtimings: ptn.microtimings ? [...ptn.microtimings] : undefined,
        createdAt: Date.now()
      };

      await savePatternToCloud(savedPattern, userProfile.uid, savePatternVisibility, userProfile.mestreId || undefined);
      
      const updatedPatterns = await fetchCloudPatterns(userProfile.uid, userProfile.role, userProfile.mestreId || null);
      setCloudPatterns(updatedPatterns);

      setSaveModalPatternId(null);
      setToastMessage(lang === 'fr' ? 'Sauvegardé !' : 'Salvo !');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
      alert(lang === 'fr' ? 'Erreur lors de la sauvegarde.' : 'Erro ao salvar.');
    } finally {
      setIsSavingPattern(false);
    }
  };

  const handleLoadPatternFromLibrary = (libraryPatternId: string) => {
    if (loadModalPatternId === null) return;
    const libPtn = existingLibraryPatterns.find(p => p.id === libraryPatternId);
    if (!libPtn) return;
    
    if (confirm(lang === 'fr' ? 'Attention, cela remplacera la phrase en cours. Continuer ?' : 'Atenção, isso substituirá o padrão atual. Continuar?')) {
      if (onLoadLibraryPattern) {
        onLoadLibraryPattern(loadModalPatternId, libPtn);
      }
      setLoadModalPatternId(null);
    }
  };

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  // Ensure we always call the latest onStopSoloPattern, but ONLY on component unmount
  const stopSoloRef = useRef(onStopSoloPattern);
  useEffect(() => {
    stopSoloRef.current = onStopSoloPattern;
  }, [onStopSoloPattern]);

  useEffect(() => {
    return () => {
      // Only stop playback on unmount if we were playing a solo pattern
      if (soloPatternPlayIdRef.current !== null && stopSoloRef.current) {
        stopSoloRef.current();
      }
    };
  }, []);

  useEffect(() => {
    let lastActiveId = lastActivePatternIdRef.current;

    const highlightActivePattern = (measure: number) => {
      const currentTrack = trackRef.current;
      if (!currentTrack) return;

      const isPlay = isPlayingRef.current;
      const soloPatternId = soloPatternPlayIdRef.current;

      let activeId: number | null = null;
      if (isPlay) {
        if (soloPatternId !== undefined && soloPatternId !== null) {
          const hasSoloPattern = currentTrack.patterns.some(p => p.id === soloPatternId);
          if (hasSoloPattern) {
            activeId = soloPatternId;
          }
        }
        if (activeId === null) {
          const activePattern = currentTrack.patterns.find(p => p.measureAssignments[measure]);
          activeId = activePattern ? activePattern.id : currentTrack.patterns[0]?.id;
        }
      }

      if (activeId !== lastActiveId) {
        // Clear old highlight
        if (lastActiveId !== null) {
          const oldCard = patternDOMRefs.current.get(lastActiveId);
          if (oldCard) {
            oldCard.style.boxShadow = oldCard.getAttribute('data-selected') === 'true' ? '4px 4px 0px 0px #1a1a1a' : '2px 2px 0px 0px #bbb';
            oldCard.style.borderColor = oldCard.getAttribute('data-selected') === 'true' ? '#1a1a1a' : '#999';
          }
          const oldBadge = badgeDOMRefs.current.get(lastActiveId);
          if (oldBadge) {
            oldBadge.classList.add('hidden');
          }
        }

        // Apply new highlight
        if (activeId !== null) {
          const newCard = patternDOMRefs.current.get(activeId);
          if (newCard) {
            newCard.style.boxShadow = '4px 4px 0px 0px #8b2a1a';
            newCard.style.borderColor = '#8b2a1a';
          }
          const newBadge = badgeDOMRefs.current.get(activeId);
          if (newBadge) {
            newBadge.classList.remove('hidden');
          }
        }

        lastActiveId = activeId;
        lastActivePatternIdRef.current = activeId;
      }
    };

    // Run initial highlight
    highlightActivePattern(currentMeasure || 0);

    let lastMeasure = currentMeasure !== undefined ? currentMeasure : -1;

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number }) => {
      if (detail) {
        const { measure, step } = detail;
        if (step < 0) {
          if (lastMeasure !== -1) {
            lastMeasure = -1;
            highlightActivePattern(-1);
          }
        } else if (measure !== lastMeasure) {
          lastMeasure = measure;
          highlightActivePattern(measure);
        }
      }
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
      // Clean up highlights on unmount
      if (lastActiveId !== null) {
        const card = patternDOMRefs.current.get(lastActiveId);
        if (card) {
          card.style.boxShadow = card.getAttribute('data-selected') === 'true' ? '4px 4px 0px 0px #1a1a1a' : '2px 2px 0px 0px #bbb';
          card.style.borderColor = card.getAttribute('data-selected') === 'true' ? '#1a1a1a' : '#999';
        }
        const badge = badgeDOMRefs.current.get(lastActiveId);
        if (badge) {
          badge.classList.add('hidden');
        }
      }
    };
  }, [track.id, isPlaying, currentMeasure]);

  const handleSave = (patternId: number) => {
    if (onPatternNameChange) {
      onPatternNameChange(patternId, editName);
    }
    setEditingPatternId(null);
  };

  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(null);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [selectedStepIndices, setSelectedStepIndices] = useState<number[]>([]);
  const [selectedPatternId, setSelectedPatternId] = useState<number>(track.patterns[0]?.id || 0);
  const [isTupletEditMode, setIsTupletEditMode] = useState(false);
  const [isMultiSelectActive, setIsMultiSelectActive] = useState(false);
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState<boolean>(false);

  useEffect(() => {
    setSelectedPatternId(track.selectedPatternId);
    setSelectedStepIndices([]);
    setSelectedStepIdx(null);
    setSelectedVariationId(null);
    setIsMultiSelectActive(false);
  }, [track.id, track.selectedPatternId]);

  const strokes = getStrokesForInstrument(inst.id, inst.type, lang, isLeftHanded);

  const handleClose = React.useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 750);
  }, [isClosing, onClose]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setMouseDownOnBackdrop(true);
    } else {
      setMouseDownOnBackdrop(false);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mouseDownOnBackdrop) {
      handleClose();
    }
    setMouseDownOnBackdrop(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
      if (onKeyDown) onKeyDown(e);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleClose, onKeyDown]);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div
        className="bg-[#f4ecd8] cordel-border-sm text-[#1a1a1a] flex flex-col relative overflow-hidden"
        style={{
          maxWidth: isMobile ? '100%' : '1600px',
          width: isMobile ? '98vw' : '96vw',
          maxHeight: isMobile ? 'calc(100dvh - 180px)' : 'calc(100vh - 160px)',
          boxShadow: '8px 8px 0px 0px #1a1a1a',
        }}
      >
        {isClosing && (
          <div className="absolute inset-0 bg-[#f4ecd8]/20 backdrop-blur-[0.5px] z-[99999] pointer-events-auto" />
        )}
        {/* ═══════════════════ HEADER BAR ═══════════════════ */}
        <div
          className="flex items-center gap-3 px-5 py-3 border-b-[3px] border-[#1a1a1a] shrink-0"
          style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
        >
          <img
            src={`${ASSETS_BASE_URL}${inst.iconImg}`}
            alt={inst.name}
            className="w-8 h-8 object-contain"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div className="flex items-center gap-2 mr-auto">
            {onNavigatePrev && (
              <button 
                onClick={onNavigatePrev} 
                className="w-6 h-6 flex items-center justify-center bg-[#1a1a1a]/20 hover:bg-[#1a1a1a]/40 rounded-full cursor-pointer transition-colors"
              >
                ◀
              </button>
            )}
            <span className="font-cactus font-bold text-lg tracking-wide">
              {inst.name}
            </span>
            {onNavigateNext && (
              <button 
                onClick={onNavigateNext} 
                className="w-6 h-6 flex items-center justify-center bg-[#1a1a1a]/20 hover:bg-[#1a1a1a]/40 rounded-full cursor-pointer transition-colors"
              >
                ▶
              </button>
            )}

            {/* Pitch Shift Controller for Vocal/Toada tracks */}
            {inst.type === 'voice' && (
              <div className="flex items-center gap-2 bg-[#f4ecd8] px-3 py-1.5 rounded border-[2px] border-[#1a1a1a] text-xs font-bold ml-6 select-none text-[#1a1a1a] shadow-[2px_2px_0px_0px_#1a1a1a]">
                <span>{lang === 'fr' ? 'Transposition :' : 'Transposição :'}</span>
                <button
                  onClick={() => sequencer.decrementVocalTransposeSteps()}
                  className="w-5 h-5 flex items-center justify-center bg-[#1a1a1a]/10 hover:bg-[#1a1a1a]/20 border border-[#1a1a1a]/20 rounded text-center cursor-pointer transition-colors font-bold text-sm"
                >
                  -
                </button>
                <span className="w-8 text-center font-cactus text-sm">
                  {sequencer.vocalTransposeSteps > 0 ? `+${sequencer.vocalTransposeSteps}` : sequencer.vocalTransposeSteps}
                </span>
                <button
                  onClick={() => sequencer.incrementVocalTransposeSteps()}
                  className="w-5 h-5 flex items-center justify-center bg-[#1a1a1a]/10 hover:bg-[#1a1a1a]/20 border border-[#1a1a1a]/20 rounded text-center cursor-pointer transition-colors font-bold text-sm"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Solo */}
          <button
            onClick={onSoloToggle}
            className={`w-8 h-8 cordel-border-sm cordel-button text-xs font-bold cursor-pointer transition-all flex items-center justify-center ${
              track.isSolo
                ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
            title="Solo"
          >
            S
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            disabled={isClosing}
            className="w-8 h-8 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold text-sm flex items-center justify-center hover:bg-[#1a1a1a] cursor-pointer transition-colors ml-2"
          >
            {isClosing ? (
              <svg className="w-5 h-5 animate-spin text-[#f4ecd8]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5 2.24-5 5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
              </svg>
            ) : (
              '✕'
            )}
          </button>
        </div>

        {/* ═══════════════════ BODY ═══════════════════ */}
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          
          {/* Main scrollable editor panel */}
          <div ref={containerRef} className="flex-1 md:overflow-y-auto p-3 md:p-5 flex flex-col gap-6" style={{ minWidth: 0, WebkitOverflowScrolling: 'touch' }}>
            <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
              <SortableContext items={patternIds} strategy={verticalListSortingStrategy}>
                {track.patterns.map((ptn, ptnIdx) => {
                  const isSelected = track.selectedPatternId === ptn.id;

                  return (
                    <SortablePatternWrapper key={ptn.id} id={ptn.id}>
                      {({ setNodeRef, style, attributes, listeners }: any) => (
                        <div
                          ref={(el) => {
                            setNodeRef(el);
                            if (el) {
                              patternDOMRefs.current.set(ptn.id, el);
                            } else {
                              patternDOMRefs.current.delete(ptn.id);
                            }
                          }}
                          data-pattern-card={ptn.id}
                          data-selected={isSelected}
                          className={`cordel-border-sm p-4 flex flex-col gap-3 transition-colors ${
                            isSelected ? 'bg-[#f4ecd8]' : 'bg-[#ece4d0]'
                          }`}
                          style={{
                            ...style,
                            boxShadow: isSelected ? '4px 4px 0px 0px #1a1a1a' : '2px 2px 0px 0px #bbb',
                            borderColor: isSelected ? '#1a1a1a' : '#999',
                            borderWidth: '2px',
                          }}
                        >
                          {/* Pattern Header */}
                          <div className="flex items-center gap-3 border-b-[2px] border-[#1a1a1a] pb-2">
                            {/* Reorder handle */}
                            {onReorderPatternsDnd && (
                              <div
                                {...attributes}
                                {...listeners}
                                className="flex items-center justify-center p-1 cursor-grab active:cursor-grabbing text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors touch-none"
                                title="Drag to reorder patterns"
                              >
                                <GripVertical size={16} />
                              </div>
                            )}
                            <input
                              type="radio"
                              checked={isSelected}
                              onChange={() => onSelectPattern(ptn.id)}
                              className="w-4 h-4 accent-[#1a1a1a] cursor-pointer"
                            />
                            {editingPatternId === ptn.id ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={() => handleSave(ptn.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSave(ptn.id);
                                  if (e.key === 'Escape') setEditingPatternId(null);
                                }}
                                className="font-cactus font-bold text-sm bg-transparent border-b border-[#1a1a1a] outline-none text-[#1a1a1a] px-1 py-0.5"
                                autoFocus
                                onFocus={(e) => e.target.select()}
                              />
                            ) : (
                              <span
                                className={`font-cactus font-bold cursor-pointer select-none ${
                                  isSelected ? 'text-[#1a1a1a] text-base' : 'text-[#666] text-sm'
                                }`}
                                onClick={() => onSelectPattern(ptn.id)}
                                onDoubleClick={() => {
                                  setEditingPatternId(ptn.id);
                                  setEditName(ptn.name || '');
                                }}
                                title={lang === 'fr' ? 'Double-cliquez pour renommer' : 'Double clique para renomear'}
                              >
                                {ptn.name ? ptn.name : `${lang === 'fr' ? 'Motif' : 'Padrão'} ${ptnIdx + 1}`}
                              </span>
                            )}

                            {editingPatternId !== ptn.id && isMobile && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPatternId(ptn.id);
                                  setEditName(ptn.name || '');
                                }}
                                className="text-xs opacity-60 hover:opacity-100 p-1 cursor-pointer flex items-center justify-center"
                                title={lang === 'fr' ? 'Renommer' : 'Renomear'}
                              >
                                 <XiloChisel size={10} />
                              </button>
                            )}

                            <span
                              ref={(el) => {
                                if (el) {
                                  badgeDOMRefs.current.set(ptn.id, el);
                                } else {
                                  badgeDOMRefs.current.delete(ptn.id);
                                }
                              }}
                              data-active-badge={ptn.id}
                              className="bg-[#8b2a1a] text-[#f4ecd8] text-[9px] uppercase px-1.5 py-0.5 cordel-border-sm font-bold flex items-center gap-1 animate-pulse select-none hidden"
                            >
                              ▶ {lang === 'fr' ? 'Actif' : 'Ativo'}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (soloPatternPlayId === ptn.id && soloPatternVariationId === 'ensemble') {
                                  onStopSoloPattern && onStopSoloPattern();
                                } else {
                                  onPlaySoloPattern && onPlaySoloPattern(ptn.id, 'ensemble');
                                }
                              }}
                              className={`p-1 rounded-sm transition-colors ml-2 ${
                                soloPatternPlayId === ptn.id && soloPatternVariationId === 'ensemble'
                                  ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                                  : 'text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
                              }`}
                              title={soloPatternPlayId === ptn.id && soloPatternVariationId === 'ensemble' ? (lang === 'fr' ? 'Arrêter la lecture' : 'Parar leitura') : (lang === 'fr' ? 'Écouter ce motif complet en solo (Base + Variations)' : 'Ouvir este padrão completo em solo')}
                            >
                              {soloPatternPlayId === ptn.id && soloPatternVariationId === 'ensemble' ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            </button>

                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={() => {
                                setSaveModalPatternId(ptn.id);
                                setSavePatternName(ptn.name || '');
                                setSavePatternFolder(existingFolders[0] || 'Général');
                              }}
                              className="p-1 rounded-sm transition-colors ml-4 text-[#1a1a1a] hover:bg-[#1a1a1a]/10"
                              title={lang === 'fr' ? 'Sauvegarder la phrase dans le catalogue' : 'Salvar o padrão no catálogo'}
                            >
                              💾
                            </button>

                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={() => {
                                setLoadModalPatternId(ptn.id);
                              }}
                              className="p-1 rounded-sm transition-colors ml-1 text-[#1a1a1a] hover:bg-[#1a1a1a]/10"
                              title={lang === 'fr' ? 'Ouvrir le catalogue' : 'Abrir o catálogo'}
                            >
                              📂
                            </button>

                            {/* Copy/Paste buttons */}
                            <div className="flex gap-1 ml-4">
                              <button
                                onClick={() => onCopyPattern && onCopyPattern(ptn)}
                                className="px-1.5 py-0.5 bg-[#eaddcf] text-[#1a1a1a] text-[10px] font-bold cordel-border-sm hover:bg-[#1a1a1a] hover:text-[#f4ecd8] cursor-pointer"
                                title={lang === 'fr' ? 'Copier le motif' : 'Copiar o padrão'}
                              >
                                📋 {lang === 'fr' ? 'Copier' : 'Copiar'}
                              </button>
                              <button
                                onClick={() => onPastePattern && onPastePattern(ptn.id)}
                                disabled={!canPaste}
                                className={`px-1.5 py-0.5 text-[10px] font-bold cordel-border-sm cursor-pointer ${
                                  canPaste 
                                    ? 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]' 
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                                }`}
                                title={lang === 'fr' ? 'Coller le motif copié' : 'Colar o padrão copiado'}
                              >
                                📥 {lang === 'fr' ? 'Coller' : 'Colar'}
                              </button>
                            </div>

                            {/* Steps selector */}
                            <div className="flex items-center gap-1.5 ml-auto">
                              <span className="text-[11px] font-bold uppercase">{t('stepsNum')}</span>
                              <select
                                value={ptn.steps}
                                onChange={(e) => onStepsChange(ptn.id, parseInt(e.target.value))}
                                className="bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm px-2 py-0.5 text-xs font-bold cursor-pointer outline-none font-cactus"
                              >
                                {STEP_OPTIONS.map((n) => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </div>

                            {/* Delete pattern */}
                            {track.patterns.length > 1 && (
                              <button
                                onClick={() => onDeletePattern(ptn.id)}
                                className="text-[#8b2a1a] font-bold text-xs px-2 py-1 cordel-border-sm cordel-button hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors cursor-pointer"
                              >
                                ✕ {lang === 'fr' ? 'Suppr.' : 'Excluir'}
                              </button>
                            )}
                          </div>

                          {/* Pattern Usage Info */}
                          {(() => {
                            const usage = getPatternUsage(ptn.id, track, allTracks, lang);
                            return (
                              <div className="flex flex-wrap items-center gap-2 text-[10px] bg-[#eaddcf]/30 p-1.5 px-2.5 rounded-sm border border-[#1a1a1a]/10 mb-2">
                                <span className="font-bold text-[#1a1a1a]/60 uppercase tracking-wider flex items-center gap-1.5 select-none">
                                  <XiloMegaphone size={12} className="text-[#1a1a1a]/60" />
                                  {lang === 'fr' ? 'Joué par :' : 'Tocado por :'}
                                </span>
                                {usage.length === 0 ? (
                                  <span className="inline-flex items-center gap-1 bg-[#8b2a1a]/5 text-[#8b2a1a]/85 px-2 py-0.5 rounded-sm text-[10px] border border-[#8b2a1a]/15 font-semibold">
                                    ⚠️ {lang === 'fr' ? 'Non utilisé dans le morceau' : 'Não utilizado na música'}
                                  </span>
                                ) : (
                                  usage.map((u, uIdx) => (
                                    <span 
                                      key={uIdx} 
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-medium border ${
                                        u.isMaster 
                                          ? 'bg-amber-50/40 border-amber-900/10 text-amber-900/80' 
                                          : 'bg-blue-50/40 border-blue-900/10 text-blue-900/80'
                                      }`}
                                    >
                                      <span className="font-bold opacity-90">{u.trackName}</span>
                                      <span className="opacity-60">({lang === 'fr' ? 'mesures' : 'compassos'} : {u.measures.join(', ')})</span>
                                    </span>
                                  ))
                                )}
                              </div>
                            );
                          })()}

                          {/* Interactive Step Grid */}
                          {/* Resolution header & Tuplet edit tools */}
                          {(() => {
                            const totalVarProb = (ptn.variations || [])
                              .filter(v => !v.playFirstTimeOnly)
                              .reduce((acc, v) => acc + v.probability, 0);
                            const baseProb = Math.max(0, 100 - totalVarProb);
                            return (
                              <div className="text-xs font-bold text-[#666] mb-2 flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-3">
                                  <span>{lang === 'fr' ? 'Probabilité de base (Base Track) :' : 'Probabilidade base (Pista Base) :'} {baseProb}%</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (soloPatternPlayId === ptn.id && soloPatternVariationId === 'base') {
                                        onStopSoloPattern && onStopSoloPattern();
                                      } else {
                                        onPlaySoloPattern && onPlaySoloPattern(ptn.id, 'base');
                                      }
                                    }}
                                    className={`p-1 rounded-sm transition-colors ${
                                      soloPatternPlayId === ptn.id && soloPatternVariationId === 'base'
                                        ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                                        : 'text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
                                    }`}
                                    title={soloPatternPlayId === ptn.id && soloPatternVariationId === 'base' ? (lang === 'fr' ? 'Arrêter la lecture' : 'Parar lecture') : (lang === 'fr' ? 'Écouter ce motif de base en solo (sans variations)' : 'Ouvir este padrão base em solo')}
                                  >
                                    {soloPatternPlayId === ptn.id && soloPatternVariationId === 'base' ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                  </button>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => setIsTupletEditMode(!isTupletEditMode)}
                                    className={`px-2 py-1 text-[10px] rounded-sm transition-colors border ${
                                      isTupletEditMode
                                        ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a]'
                                        : 'bg-transparent text-[#1a1a1a] border-[#1a1a1a]/20 hover:bg-[#1a1a1a]/5'
                                    }`}
                                    title={lang === 'fr' ? 'Éditer les divisions (Triolet, Sextolet...)' : 'Editar divisões (Tercina, Sextina...)'}
                                  >
                                    {lang === 'fr' ? '⚙️ Divisions (Triolets...)' : '⚙️ Divisões (Tercinas...)'}
                                  </button>
                                  {(ptn.variations?.length || 0) > 0 && totalVarProb > 100 && (
                                    <span className="text-[#8b2a1a] text-[10px]">⚠️ {lang === 'fr' ? 'Somme > 100%' : 'Soma > 100%'}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          <InstrumentPatternGrid
                            trackId={track.id}
                            pattern={ptn}
                            instrument={inst}
                            selectedStepIdx={selectedStepIdx}
                            selectedStepIndices={selectedStepIndices}
                            selectedVariationId={selectedVariationId}
                            isTupletEditMode={isTupletEditMode}
                            isMultiSelectActive={isMultiSelectActive}
                            noteSelectorTarget={noteSelectorTarget}
                            setNoteSelectorTarget={setNoteSelectorTarget}
                            setSelectedPatternId={setSelectedPatternId}
                            setSelectedStepIdx={setSelectedStepIdx}
                            setSelectedVariationId={setSelectedVariationId}
                            setSelectedStepIndices={setSelectedStepIndices}
                            setIsMultiSelectActive={setIsMultiSelectActive}
                            onStepTouchStart={onStepTouchStart}
                            onCopyPattern={onCopyPattern}
                            onPastePattern={onPastePattern}
                            canPaste={canPaste}
                          />

                          {/* Variations */}
                          <PatternVariationsEditor
                            lang={lang}
                            ptn={ptn}
                            inst={inst}
                            soloPatternPlayId={soloPatternPlayId}
                            soloPatternVariationId={soloPatternVariationId}
                            isTouchDevice={isTouchDevice}
                            isMultiSelectActive={isMultiSelectActive}
                            selectedStepIdx={selectedStepIdx}
                            selectedVariationId={selectedVariationId}
                            selectedStepIndices={selectedStepIndices}
                            onStopSoloPattern={onStopSoloPattern}
                            onPlaySoloPattern={onPlaySoloPattern}
                            onTogglePatternVariationFirstTimeOnly={onTogglePatternVariationFirstTimeOnly}
                            onUpdatePatternVariationProbability={onUpdatePatternVariationProbability}
                            onDeletePatternVariation={onDeletePatternVariation}
                            onVariationStepValueChange={onVariationStepValueChange}
                            onStepTouchStart={onStepTouchStart}
                            setSelectedPatternId={setSelectedPatternId}
                            setSelectedStepIdx={setSelectedStepIdx}
                            setSelectedVariationId={setSelectedVariationId}
                            setSelectedStepIndices={setSelectedStepIndices}
                            handleStepMouseDownMulti={() => {}}
                            getStepSwingPercent={() => 0}
                            onAddPatternVariation={onAddPatternVariation}
                          />

                          {/* Step Sculptor Panel for this pattern */}
                          {selectedPatternId === ptn.id && selectedStepIdx !== null && (
                            <InstrumentEffects
                              trackId={track.id}
                              pattern={ptn}
                              selectedStepIdx={selectedStepIdx}
                              selectedStepIndices={selectedStepIndices}
                              selectedVariationId={selectedVariationId}
                            />
                          )}
                        </div>
                      )}
                    </SortablePatternWrapper>
                  );
                })}
              </SortableContext>
            </DndContext>

            {/* Add pattern button */}
            <button
              onClick={onAddPattern}
              className="self-start bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm cordel-button px-4 py-2 font-cactus font-bold text-sm cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors"
            >
              + {lang === 'fr' ? 'Ajouter un motif' : 'Adicionar padrão'}
            </button>
          </div>

          {/* ─── Right sidebar: Stroke legend ─── */}
          <div className="border-t-[3px] md:border-t-0 md:border-l-[3px] border-[#1a1a1a] bg-[#ece4d0] p-4 shrink-0 flex flex-col gap-4 w-full md:w-[320px] md:overflow-y-auto">
            <div className="border-b-[2px] border-[#1a1a1a] pb-2">
              <h3 className="font-cactus font-bold text-sm uppercase tracking-wide">
                {t('legend')}
              </h3>
              <p className="text-[10px] text-[#666] mt-0.5">{inst.name}</p>
            </div>

            {/* Sculpting Legend */}
            <div className="bg-[#f4ecd8] cordel-border-sm p-2.5 text-[10px] flex flex-col gap-1.5 text-[#1a1a1a]">
              <p className="font-bold">🎛️ {lang === 'fr' ? 'Sculpture du son' : 'Escultura do som'}:</p>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-1 bg-green-600 shrink-0" />
                <span>{lang === 'fr' ? 'Volume du pas (0-100%)' : 'Volume do passo (0-100%)'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-1 bg-amber-500 shrink-0" />
                <span>
                  {inst.type === 'voice'
                    ? (lang === 'fr' 
                        ? 'Durée de la note (1 double croche par pas de 10%)' 
                        : 'Duração da nota (1 semicolcheia por passo de 10%)')
                    : (lang === 'fr' 
                        ? 'Résonance/Decay (10-100%)' 
                        : 'Ressonância/Decay (10-100%)')
                  }
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-1.5 bg-[#2980b9] shrink-0" />
                <span>
                  {lang === 'fr'
                    ? 'Micro-timing (Gauche: Avance, Droite: Retard)'
                    : 'Micro-timing (Esquerda: Avanço, Direita: Atraso)'}
                </span>
              </div>
              <p className="text-[9px] text-[#666] mt-0.5 leading-tight">
                {lang === 'fr' 
                  ? 'Cliquez sur un pas pour afficher ses curseurs sous le motif.' 
                  : 'Clique em um passo para exibir seus controles sob o padrão.'}
              </p>
            </div>

            {/* Voice-specific instructions */}
            {inst.type === 'voice' && (
              <div className="bg-[#f4ecd8] cordel-border-sm p-3 text-[10px] flex flex-col gap-2">
                <p className="font-bold text-xs border-b border-[#1a1a1a]/20 pb-1">
                  🎤 {inst.id === 'puxador' 
                    ? (lang === 'fr' ? 'Soliste (Puxador)' : 'Solista (Puxador)') 
                    : (lang === 'fr' ? 'Chœur (Coro)' : 'Coro')}
                </p>
                <p className="opacity-90">
                  {inst.id === 'puxador'
                    ? (lang === 'fr' 
                        ? 'Sur cette piste, vous écrivez uniquement le chant du Puxador (fond terracotta/sable).' 
                        : 'Nesta faixa, você escreve apenas o canto do Puxador (fundo terracota/areia).')
                    : (lang === 'fr' 
                        ? 'Sur cette piste, vous écrivez uniquement le chant du Coro (fond ciano).' 
                        : 'Nesta faixa, você escreve apenas o canto do Coro (fundo ciano).')
                  }
                </p>
                
                <div className="mt-1 flex flex-col gap-1">
                  <p className="font-bold uppercase tracking-wider text-[9px] text-[#666]">
                    {lang === 'fr' ? 'Couleurs des Notes (Newton) :' : 'Cores das Notas (Newton) :'}
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-0.5">
                    {Object.entries(NEWTON_NOTE_COLORS).map(([noteName, hexColor]) => {
                      const transposeSteps = sequencer.vocalTransposeSteps || 0;
                      let displayNote = noteName;
                      let displayColor = hexColor;

                      if (transposeSteps !== 0) {
                        try {
                          const transposed = Tone.Frequency(noteName + "4").transpose(transposeSteps).toNote();
                          const transposedLetter = transposed.replace(/\d+$/, '').toUpperCase();
                          displayNote = transposedLetter;
                          
                          const baseTransposedLetter = transposedLetter.charAt(0);
                          displayColor = NEWTON_NOTE_COLORS[baseTransposedLetter] || hexColor;
                        } catch (_) {}
                      }

                      const noteSolfeges: Record<string, string> = {
                        C: lang === 'fr' ? 'Do' : 'Dó',
                        D: 'Ré',
                        E: lang === 'fr' ? 'Mi' : 'Mi',
                        F: lang === 'fr' ? 'Fa' : 'Fá',
                        G: 'Sol',
                        A: lang === 'fr' ? 'La' : 'Lá',
                        B: 'Si'
                      };

                      const noteColors: Record<string, string> = {
                        C: lang === 'fr' ? 'Rouge' : 'Vermelho',
                        D: lang === 'fr' ? 'Terracotta' : 'Terracota',
                        E: lang === 'fr' ? 'Jaune' : 'Amarelo',
                        F: lang === 'fr' ? 'Vert' : 'Verde',
                        G: lang === 'fr' ? 'Bleu' : 'Azul',
                        A: lang === 'fr' ? 'Indigo' : 'Índigo',
                        B: lang === 'fr' ? 'Violet' : 'Violeta'
                      };

                      const baseLetter = displayNote.charAt(0).toUpperCase();
                      const solfege = noteSolfeges[baseLetter] || '';
                      const colorName = noteColors[baseLetter] || '';
                      const hasAccident = displayNote.includes('#');

                      const label = `${displayNote} (${solfege}${hasAccident ? '#' : ''} - ${colorName})`;

                      return (
                        <div key={noteName} className="flex items-center gap-1.5 font-sans">
                          <span 
                            className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" 
                            style={{ backgroundColor: displayColor }} 
                          />
                          <span className="font-medium text-[9px] text-[#1a1a1a]">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Bouton d'activation global MIDI Learn */}
            <div className="flex justify-between items-center gap-2 border-b border-black/10 pb-2">
              <button
                onClick={() => setMidiLearnActive(!isMidiLearnActive)}
                className={`w-full border-black border-2 px-3 py-1.5 active:scale-95 transition-all text-xs font-bold font-mono shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer flex items-center justify-center gap-1.5 ${
                  isMidiLearnActive 
                    ? 'bg-amber-500 text-black hover:bg-amber-600' 
                    : 'bg-[#f4ecd8] text-black hover:bg-[#ebdcb9]'
                }`}
              >
                <span>🎹</span>
                <span>
                  {lang === 'fr' ? 'Apprentissage MIDI :' : 'Aprendizado MIDI :'} {isMidiLearnActive ? (lang === 'fr' ? 'ACTIF' : 'ATIVO') : (lang === 'fr' ? 'INACTIF' : 'INATIVO')}
                </span>
              </button>
            </div>

            {/* Stroke list */}
            <div className="flex flex-col gap-2">
              {strokes.map((stroke, sIdx) => {
                const symbol = stroke.symbol;
                const activeStrokes = getActiveStrokesForTrack(track, allTracks);
                const isUsed = activeStrokes.includes(symbol);
                const forced = forcedStrokes[`${track.id}:${symbol}`];
                const isActive = forced !== undefined ? forced : isUsed;
                const isSelected = selectedStrokeMacro === symbol;

                const bgColor = inst.colors[stroke.colorKey] || '#666';
                let txtColor = inst.colors.text || '#f4ecd8';
                if (isDarkText(inst.id, stroke.colorKey)) {
                  txtColor = '#1a1a1a';
                }

                 const { avgVolume, avgDecay } = getStrokeAverages(symbol);
                 const isVoice = inst?.type === 'voice';
 
                 const isWaiting = waitingForMidiStroke && 
                   String(waitingForMidiStroke.trackId) === String(track.id) && 
                   waitingForMidiStroke.symbol === symbol;
 
                 // Find note associated with this track & symbol
                 let associatedNote: number | null = null;
                 for (const key in mappings) {
                   const m = mappings[key];
                   if (m && String(m.trackId) === String(track.id) && m.symbol === symbol) {
                     associatedNote = Number(key);
                     break;
                   }
                 }
 
                 return (
                   <div key={sIdx} className="flex flex-col border border-black/10 bg-black/[0.01] p-1.5 rounded-sm">
                     {/* Touche et Infos (Ligne interactive) */}
                     <div
                       onClick={() => setSelectedStrokeMacro(isSelected ? null : symbol)}
                       className={`flex items-center gap-2.5 cursor-pointer hover:bg-black/5 p-0.5 select-none transition-all ${
                         !isActive ? 'opacity-40 grayscale border-dashed border border-black/30' : ''
                       }`}
                       title={`${symbol} : ${stroke.label} (${isActive ? (lang === 'fr' ? 'Actif' : 'Ativo') : (lang === 'fr' ? 'Inactif' : 'Inativo')})`}
                     >
                       <div
                         onClick={(e) => {
                           e.stopPropagation();
                           if (isMidiLearnActive) {
                             setWaitingForMidiStroke({
                               trackId: String(trackId),
                               instrumentId: inst.id,
                               symbol
                             });
                           } else {
                             if (audioEngine) {
                               audioEngine.playNote(trackId, symbol, Tone.now(), 1.0, 1.0);
                             }
                           }
                         }}
                         data-midi-target={`${inst.id}-${symbol}`}
                         className={`flex items-center justify-center cordel-border-sm font-bold text-xs shrink-0 cursor-pointer active:scale-95 transition-transform duration-100 select-none hover:opacity-90 ${
                           isWaiting ? 'animate-pulse border-2 border-dashed !border-amber-600' : ''
                         }`}
                         style={{
                           width: '32px',
                           height: '32px',
                           backgroundColor: bgColor,
                           color: txtColor,
                           borderColor: isWaiting ? '#d35400' : '#1a1a1a',
                           borderStyle: isWaiting ? 'dashed' : (isActive ? 'solid' : 'dashed'),
                         }}
                       >
                         {symbol.length <= 2 ? symbol : symbol.charAt(0)}
                       </div>
 
                       <div className="flex flex-col min-w-0 flex-grow">
                         <div className="flex items-center gap-1.5 flex-wrap">
                           <span className="text-[11px] font-bold text-[#1a1a1a] leading-tight">{stroke.label}</span>
                           {associatedNote !== null && (
                             <span 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 removeMidiMapping(associatedNote!);
                               }}
                               className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-[#1a1a1a] text-[#f4ecd8] border border-black hover:bg-red-700 hover:text-white cursor-pointer transition-colors"
                               title={lang === 'fr' ? "Cliquez pour dissocier la note MIDI" : "Clique para desassociar a nota MIDI"}
                             >
                               <span>🎹 {midiNoteToName(associatedNote)}</span>
                               <span className="font-extrabold text-[9px] leading-none">×</span>
                             </span>
                           )}
                         </div>
                         <span className="text-[9px] text-[#666] leading-tight">
                           {lang === 'fr' ? 'Touche' : 'Tecla'}: {stroke.shortcut}
                         </span>
                       </div>

                      <span className="text-[9px] text-[#666] font-bold mr-1 shrink-0 select-none">
                        {isSelected ? '▲' : '▼'}
                      </span>
                    </div>

                    {/* Accordéon Tiroir Contextuel pour les réglages globaux */}
                    {isSelected && (
                      <div className="mt-2 border-t border-dashed border-[#1a1a1a]/30 pt-2 pb-1 px-1 flex flex-col gap-2.5 bg-[#ece4d0]/40">
                        <div className="flex justify-between items-center text-[9px] font-bold">
                          <span>🎛️ {lang === 'fr' ? 'MACRO :' : 'MACRO :'} [{symbol}]</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStrokeForcedState(`${track.id}:${symbol}`, !isActive);
                            }}
                            className={`px-1.5 py-0.5 border text-[8px] font-black uppercase tracking-wider cursor-pointer shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all select-none ${
                              isActive
                                ? 'bg-green-600 text-white border-green-700 hover:bg-green-700' 
                                : 'bg-red-700 text-white border-red-800 hover:bg-red-800'
                            }`}
                            title={lang === 'fr' 
                              ? 'Forcer l\'activation ou la désactivation de cette frappe'
                              : 'Forçar a ativação ou desativação desta batida'}
                          >
                            {isActive ? '● ACTIF' : '○ DÉSACTIVÉ'}
                          </button>
                        </div>

                        {/* Volume slider */}
                        <div className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[9px] font-bold">
                            <span>🔊 Volume Global :</span>
                            <span className={`vol-label-${symbol}`}>{avgVolume}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            defaultValue={avgVolume}
                            onInput={(e) => {
                              const target = e.currentTarget;
                              const label = target.parentElement?.querySelector(`.vol-label-${symbol}`);
                              if (label) label.textContent = `${target.value}%`;
                            }}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              const delta = val - avgVolume;
                              applyMacroVolumeDelta(symbol, delta, val);
                            }}
                            className="w-full accent-green-600 cursor-pointer h-1.5 bg-black/10"
                          />
                        </div>

                        {/* Decay slider */}
                        <div className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[9px] font-bold">
                            <span>⏳ {isVoice ? (lang === 'fr' ? 'Durée Globale :' : 'Duração Geral :') : (lang === 'fr' ? 'Decay Global :' : 'Decay Geral :')}</span>
                            <span className={`decay-label-${symbol}`}>{avgDecay}%</span>
                          </div>
                          <input 
                            type="range"
                            min="10"
                            max="100"
                            defaultValue={avgDecay}
                            onInput={(e) => {
                              const target = e.currentTarget;
                              const label = target.parentElement?.querySelector(`.decay-label-${symbol}`);
                              if (label) label.textContent = `${target.value}%`;
                            }}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              const delta = val - avgDecay;
                              applyMacroDecayDelta(symbol, delta, val);
                            }}
                            className="w-full accent-[#8b2a1a] cursor-pointer h-1.5 bg-black/10"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Keyboard navigation tips */}
            <div className="bg-[#f4ecd8] cordel-border-sm p-2.5 text-[10px] mt-auto flex flex-col gap-1">
              <p className="font-bold">⌨️ {lang === 'fr' ? 'Astuces' : 'Dicas'}:</p>
              <p>{lang === 'fr'
                ? 'Espace pour avancer et laisser un silence.'
                : 'Espaço para avançar e deixar um silêncio.'
              }</p>
              <p>{lang === 'fr'
                ? 'Flèches (←/→) pour naviguer.'
                : 'Setas (←/→) para navegar.'
              }</p>
            </div>
          </div>
        </div>
      </div>

      {/* Load Pattern Modal */}
      {loadModalPatternId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setLoadModalPatternId(null)}>
          <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b-2 border-[#1a1a1a] pb-2">
              <h3 className="font-cactus text-3xl font-bold text-[#1a1a1a]">
                {lang === 'fr' ? 'Catalogue - ' : 'Catálogo - '}{inst.name}
              </h3>
              <button onClick={() => setLoadModalPatternId(null)} className="text-[#1a1a1a] font-bold text-xl hover:text-[#8b2a1a]">
                ✕
              </button>
            </div>
            
            {existingFolders.length === 0 ? (
              <div className="text-center py-8 text-[#666] font-bold text-sm italic">
                {lang === 'fr' ? 'Aucune phrase sauvegardée pour cet instrument.' : 'Nenhum padrão salvo para este instrumento.'}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {existingFolders.map(folder => {
                  const isExpanded = expandedFolders[folder] ?? true;
                  const folderPatterns = existingLibraryPatterns.filter(p => p.folder === folder);
                  return (
                    <div key={folder} className="border border-[#1a1a1a] rounded-sm bg-[#eaddcf]">
                      <button 
                        onClick={() => toggleFolder(folder as string)}
                        className="w-full flex items-center justify-between p-3 bg-[#1a1a1a]/5 hover:bg-[#1a1a1a]/10 transition-colors font-bold text-[#1a1a1a] text-lg font-cactus text-left"
                      >
                        <span className="flex items-center gap-2">
                          {isExpanded ? '📂' : '📁'} {folder} <span className="text-xs opacity-60">({folderPatterns.length})</span>
                        </span>
                        <span>{isExpanded ? '▲' : '▼'}</span>
                      </button>
                      
                      {isExpanded && (
                        <div className="flex flex-col divide-y divide-[#1a1a1a]/20">
                          {folderPatterns.map(libPtn => (
                            <div key={libPtn.id} className="flex items-center justify-between p-3 hover:bg-white/50 transition-colors">
                              <div className="flex flex-col">
                                <span className="font-bold text-[#1a1a1a]">{libPtn.name}</span>
                                <span className="text-xs text-[#666]">{new Date(libPtn.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleLoadPatternFromLibrary(libPtn.id)}
                                  className="px-3 py-1 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-xs hover:bg-[#6b1e11] transition-colors cordel-border-sm"
                                >
                                  {lang === 'fr' ? 'Charger' : 'Carregar'}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(lang === 'fr' ? 'Supprimer définitivement cette phrase du catalogue ?' : 'Excluir permanentemente este padrão do catálogo?')) {
                                      try {
                                        const pId = libPtn.id;
                                        await deleteCloudPattern(pId);
                                        setCloudPatterns(prev => prev.filter(p => p.id !== pId));
                                      } catch (err) {
                                        console.error(err);
                                        alert(lang === 'fr' ? 'Erreur lors de la suppression.' : 'Erro ao excluir.');
                                      }
                                    }
                                  }}
                                  className="p-1 hover:bg-[#1a1a1a]/10 rounded transition-colors text-xl"
                                  title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Pattern Modal */}
      {saveModalPatternId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSaveModalPatternId(null)}>
          <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-6 max-w-sm w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)]" onClick={e => e.stopPropagation()}>
            <h3 className="font-cactus text-2xl font-bold text-[#1a1a1a] mb-4">
              {lang === 'fr' ? 'Sauvegarder dans le catalogue' : 'Salvar no catálogo'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-[#1a1a1a] mb-1">
                {lang === 'fr' ? 'Nom de la phrase' : 'Nome do padrão'}
              </label>
              <input
                type="text"
                value={savePatternName}
                onChange={(e) => setSavePatternName(e.target.value)}
                className="w-full bg-[#eaddcf] border border-[#1a1a1a] p-2 text-sm font-bold text-[#1a1a1a] outline-none focus:ring-2 focus:ring-[#8b2a1a]"
                placeholder={lang === 'fr' ? 'Ex: Groovy Break' : 'Ex: Groovy Break'}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-[#1a1a1a] mb-1">
                {lang === 'fr' ? 'Dossier / Répertoire' : 'Pasta / Diretório'}
              </label>
              <input
                type="text"
                list="folder-suggestions"
                value={savePatternFolder}
                onChange={(e) => setSavePatternFolder(e.target.value)}
                className="w-full bg-[#eaddcf] border border-[#1a1a1a] p-2 text-sm font-bold text-[#1a1a1a] outline-none focus:ring-2 focus:ring-[#8b2a1a]"
                placeholder={lang === 'fr' ? 'Ex: Général' : 'Ex: Geral'}
              />
              <datalist id="folder-suggestions">
                {existingFolders.map(folder => (
                  <option key={folder} value={folder} />
                ))}
              </datalist>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-[#1a1a1a] mb-1">
                {lang === 'fr' ? 'Visibilité' : 'Visibilidade'}
              </label>
              <select
                value={savePatternVisibility}
                onChange={(e) => setSavePatternVisibility(e.target.value as CatalogVisibility)}
                className="w-full bg-[#eaddcf] border border-[#1a1a1a] p-2 text-sm font-bold text-[#1a1a1a] outline-none focus:ring-2 focus:ring-[#8b2a1a]"
              >
                <option value="private">{lang === 'fr' ? 'Privé (Uniquement moi)' : 'Privado (Somente eu)'}</option>
                {userProfile?.role === 'mestre' && (
                  <option value="mestre_group">{lang === 'fr' ? 'Mon groupe' : 'Meu grupo'}</option>
                )}
                {userProfile?.role === 'admin' && (
                  <option value="admin_global">{lang === 'fr' ? 'Global (Tout le monde)' : 'Global (Todos)'}</option>
                )}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSaveModalPatternId(null)}
                className="px-4 py-2 border border-[#1a1a1a] text-[#1a1a1a] font-bold text-sm hover:bg-[#eaddcf] transition-colors"
                disabled={isSavingPattern}
              >
                {lang === 'fr' ? 'Annuler' : 'Cancelar'}
              </button>
              <button
                onClick={handleSavePatternToLibrary}
                disabled={!savePatternName.trim() || isSavingPattern}
                className="px-4 py-2 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-sm disabled:opacity-50 hover:bg-[#6b1e11] transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)]"
              >
                {isSavingPattern ? '...' : (lang === 'fr' ? 'Enregistrer' : 'Salvar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-[#8b2a1a] text-[#f4ecd8] font-cactus font-bold text-lg px-6 py-3 rounded-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] z-[100] animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Global Fixed Note Popover Selector */}
      {noteSelectorTarget && (() => {
        const rect = noteSelectorTarget.element.getBoundingClientRect();
        const popoverStyle = {
          position: 'fixed' as const,
          top: `${rect.bottom + 5}px`,
          left: `${Math.min(window.innerWidth - 250, Math.max(10, rect.left - 90))}px`,
          zIndex: 10000,
        };
        
        return (
          <div style={popoverStyle}>
            <MelodicNoteSelector
              currentValue={noteSelectorTarget.note}
              onSelect={(selectedNote) => {
                onVoiceNoteChange(noteSelectorTarget.patternId, noteSelectorTarget.stepIdx, selectedNote);
                onVoiceNoteBlur(noteSelectorTarget.patternId, noteSelectorTarget.stepIdx, selectedNote);
                setNoteSelectorTarget({
                  ...noteSelectorTarget,
                  note: selectedNote
                });
              }}
              onClose={() => setNoteSelectorTarget(null)}
              lang={lang === 'pt' ? 'pt' : 'fr'}
            />
          </div>
        );
      })()}
    </div>,
    document.body
  );
};

export const InstrumentDetailEditor = React.memo(InstrumentDetailEditorComponent, (prevProps, nextProps) => {
  if (prevProps.trackId !== nextProps.trackId) {
    return false;
  }

  const keys = Object.keys(prevProps) as Array<keyof InstrumentDetailEditorProps>;
  for (const key of keys) {
    if (key === 'trackId') continue;

    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  return true;
});
