/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSequencerStore, isSequencerVisibleTrack } from '../stores/useSequencerStore';
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

const SortablePatternWrapper = ({ id, children, className, style: propStyle }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { ...propStyle, transform: CSS.Transform.toString(transform), transition };
  return children({ setNodeRef, style, attributes, listeners });
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
  const soloPatternPlayId = audio.soloPatternPlayId;
  const soloPatternVariationId = audio.soloPatternVariationId;
  const vocalCalibrationLatencyMs = useSequencerStore(state => state.vocalCalibrationLatencyMs);

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
    const tracksList = useSequencerStore.getState().tracks.filter(t => isSequencerVisibleTrack(t, useSequencerStore.getState().tracks));
    const idx = tracksList.findIndex(t => t.id === trackId);
    if (idx > 0) {
      setEditingTrackId(tracksList[idx - 1].id);
    }
  }, [trackId, setEditingTrackId]);

  const onNavigateNext = React.useCallback(() => {
    const tracksList = useSequencerStore.getState().tracks.filter(t => isSequencerVisibleTrack(t, useSequencerStore.getState().tracks));
    const idx = tracksList.findIndex(t => t.id === trackId);
    if (idx >= 0 && idx < tracksList.length - 1) {
      setEditingTrackId(tracksList[idx + 1].id);
    }
  }, [trackId, setEditingTrackId]);

  const onKeyDown = React.useCallback((e: any) => {
    const tracksList = useSequencerStore.getState().tracks.filter(t => isSequencerVisibleTrack(t, useSequencerStore.getState().tracks));
    const idx = tracksList.findIndex(t => t.id === trackId);
    if (e.key === 'ArrowDown') {
      if (idx >= 0 && idx < tracksList.length - 1) setEditingTrackId(tracksList[idx + 1].id);
    } else if (e.key === 'ArrowUp') {
      if (idx > 0) setEditingTrackId(tracksList[idx - 1].id);
    }
  }, [trackId, setEditingTrackId]);

  // Granular selection of only the current track to prevent parent-level render thrashing
  const track = useSequencerStore(
    React.useCallback(state => state.tracks.find(t => t.id === trackId), [trackId])
  );
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const inst = track ? instrumentsConfig[track.instrumentIdx] : { id: '', name: '', type: 'percussion', iconImg: '', colors: { text: '' }, mixerBg: '' };
  
  if (!track) return null;

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

    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number; measure: number; maxTicks: number; ratio?: number }>;
      if (customEvent.detail) {
        const { measure, step } = customEvent.detail;
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

    window.addEventListener('o-girador-tick', handleTick);
    return () => {
      window.removeEventListener('o-girador-tick', handleTick);
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
                                ✏️
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
                      const noteLabels: Record<string, string> = {
                        C: lang === 'fr' ? 'C (Do - Rouge)' : 'C (Dó - Vermelho)',
                        D: lang === 'fr' ? 'D (Ré - Terracotta)' : 'D (Ré - Terracota)',
                        E: lang === 'fr' ? 'E (Mi - Jaune)' : 'E (Mi - Amarelo)',
                        F: lang === 'fr' ? 'F (Fa - Vert)' : 'F (Fá - Verde)',
                        G: lang === 'fr' ? 'G (Sol - Bleu)' : 'G (Sol - Azul)',
                        A: lang === 'fr' ? 'A (La - Indigo)' : 'A (Lá - Índigo)',
                        B: lang === 'fr' ? 'B (Si - Violet)' : 'B (Si - Violeta)',
                      };
                      return (
                        <div key={noteName} className="flex items-center gap-1.5 font-sans">
                          <span 
                            className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" 
                            style={{ backgroundColor: hexColor }} 
                          />
                          <span className="font-medium text-[9px] text-[#1a1a1a]">{noteLabels[noteName] || noteName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Stroke list */}
            <div className="flex flex-col gap-2">
              {strokes.map((stroke, sIdx) => {
                const bgColor = inst.colors[stroke.colorKey] || '#666';
                let txtColor = inst.colors.text || '#f4ecd8';
                if (isDarkText(inst.id, stroke.colorKey)) {
                  txtColor = '#1a1a1a';
                }

                return (
                  <div key={sIdx} className="flex items-center gap-2.5">
                    <div
                      className="flex items-center justify-center cordel-border-sm font-bold text-xs shrink-0"
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: bgColor,
                        color: txtColor,
                        borderColor: '#1a1a1a',
                      }}
                    >
                      {stroke.symbol.length <= 2 ? stroke.symbol : stroke.symbol.charAt(0)}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-[#1a1a1a] leading-tight">{stroke.label}</span>
                      <span className="text-[9px] text-[#666] leading-tight">
                        {lang === 'fr' ? 'Touche' : 'Tecla'}: {stroke.shortcut}
                      </span>
                    </div>
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
