import React, { useState, useRef, useEffect, useMemo } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '@/src/ToneLoader';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}
import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TrackGroup, Language, Pattern } from '../types';
import { i18n, instrumentsConfig, ASSETS_BASE_URL, isDarkText, getVisualStrokeSymbol, NEWTON_NOTE_COLORS } from '../data';
import { getNextStepValue } from '../utils/instrumentStrokes';
import { CompactPatternRenderer } from './CompactPatternRenderer';
import { useSequencerStore, isToadaBus } from '../stores/useSequencerStore';
import { useTransportStore } from '../stores/useTransportStore';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';
import { useAudioStore } from '../stores/useAudioStore';

const getGlobalClipboard = () => {
  if (typeof window !== 'undefined') {
    return (window as any).__oGiradorRelativeClipboard || null;
  }
  return null;
};

interface TrackMixerProps {
  trackId: number;
  index: number;
  totalTracks: number;
  onOpenDetailEditor: (trackId: number) => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  isCollapsed?: boolean;
  isActive?: boolean;
}


const TrackMixerComponent: React.FC<TrackMixerProps> = ({
  trackId,
  index,
  totalTracks,
  onOpenDetailEditor,
  onStepTouchStart,
  isCollapsed = false,
  isActive = true,
}) => {
  const sequencer = useSequencer();
  const [focusedVoiceNoteStep, setFocusedVoiceNoteStep] = useState<number | null>(null);
  const audio = useAudio();

  const lang = useSequencerStore(state => state.lang);
  const isLeftHanded = useSequencerStore(state => state.isLeftHanded);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const activeAoVivoTrackId = useSequencerStore(state => state.activeAoVivoTrackId);
  const setActiveAoVivoTrackId = useSequencerStore(state => state.setActiveAoVivoTrackId);
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const tracks = useSequencerStore(state => state.tracks);
  const isMaster = useSequencerStore(state => state.tracks.some(t => String(t.linkedToTrackId) === String(trackId)));
  const hasSolo = useSequencerStore(state => state.tracks.some(t => t.isSolo));

  const soloPatternPlayId = useTransportStore(state => state.soloPatternPlayId);
  const { isPlaying, maxTicksRef } = audio;
  const maxTicks = maxTicksRef.current;
  const { activeVariationsRef, copiedPattern, handleCopyPattern, handlePastePattern, timeSig } = sequencer;

  const canPaste = !!copiedPattern;



  // Local Actions mapped directly to Zustand and Context
  const onInstrumentChange = (instIdx: number) => {
    useSequencerStore.getState().handleTrackInstrumentIdxChange(trackId, instIdx);
  };
  const onMuteToggle = () => {
    useSequencerStore.getState().handleTrackMuteToggle(trackId);
  };
  const onSoloToggle = () => {
    useSequencerStore.getState().handleTrackSoloToggle(trackId);
  };
  const onHideToggle = () => {
    useSequencerStore.getState().handleTrackHideToggle(trackId);
  };
  const onDelete = () => {
    useSequencerStore.getState().handleTrackDelete(trackId);
  };
  const onVolumeChange = (val: number) => {
    useSequencerStore.getState().handleTrackVolumeChange(trackId, val);
  };
  const onPanChange = (val: number) => {
    useSequencerStore.getState().handleTrackPanChange(trackId, val);
  };
  const onStepsChange = (patternId: number, steps: number) => {
    useSequencerStore.getState().handleTrackStepsChange(effectiveTrack.id, patternId, steps);
  };
  const onStepValueChange = (patternId: number, stepIdx: number | number[], val: string | string[], lyrics?: string[], notes?: string[]) => {
    sequencer.handleTrackStepValueChange(effectiveTrack.id, patternId, stepIdx, val, lyrics, notes);
  };
  const onStepKeyDown = (patternId: number, stepIdx: number, key: string, currentVal: string, targetEl: HTMLInputElement) => {
    sequencer.handleTrackStepKeyDown(effectiveTrack.id, patternId, stepIdx, key, currentVal, targetEl);
  };
  const onVoiceTypeToggle = (patternId: number, stepIdx: number) => {
    sequencer.handleVoiceTypeToggle(effectiveTrack.id, patternId, stepIdx);
  };
  const onVoiceSylChange = (patternId: number, stepIdx: number, val: string) => {
    sequencer.handleVoiceSylChange(effectiveTrack.id, patternId, stepIdx, val);
  };
  const onVoiceNoteChange = (patternId: number, stepIdx: number, val: string) => {
    sequencer.handleVoiceNoteChange(effectiveTrack.id, patternId, stepIdx, val);
  };
  const onVoiceNoteBlur = (patternId: number, stepIdx: number, val: string) => {
    sequencer.handleVoiceNoteBlur(effectiveTrack.id, patternId, stepIdx, val);
  };
  const onPatternNameChange = (patternId: number, name: string) => {
    sequencer.handlePatternNameChange(effectiveTrack.id, patternId, name);
  };
  const onAddPatternVariation = (patternId: number) => {
    sequencer.handleAddPatternVariation && sequencer.handleAddPatternVariation(effectiveTrack.id, patternId);
  };
  const onUpdatePatternVariationProbability = (patternId: number, variationId: string, probability: number) => {
    sequencer.handleUpdatePatternVariationProbability && sequencer.handleUpdatePatternVariationProbability(effectiveTrack.id, patternId, variationId, probability);
  };
  const onTogglePatternVariationFirstTimeOnly = (patternId: number, variationId: string, val: boolean) => {
    sequencer.handleTogglePatternVariationFirstTimeOnly && sequencer.handleTogglePatternVariationFirstTimeOnly(effectiveTrack.id, patternId, variationId, val);
  };
  const onVariationStepValueChange = (patternId: number, variationId: string, stepIdx: number | number[], val: string | string[]) => {
    sequencer.handleVariationStepValueChange && sequencer.handleVariationStepValueChange(effectiveTrack.id, patternId, variationId, stepIdx, val);
  };
  const onDeletePatternVariation = (patternId: number, variationId: string) => {
    sequencer.handleDeletePatternVariation && sequencer.handleDeletePatternVariation(effectiveTrack.id, patternId, variationId);
  };
  const onStepVolumeChange = (patternId: number, stepIdx: number | number[], val: number) => {
    useSequencerStore.getState().handleTrackStepVolumeChange(effectiveTrack.id, patternId, stepIdx, val);
  };
  const onStepDecayChange = (patternId: number, stepIdx: number | number[], val: number) => {
    sequencer.handleTrackStepDecayChange && sequencer.handleTrackStepDecayChange(effectiveTrack.id, patternId, stepIdx, val);
  };
  const onStepMicrotimingChange = (patternId: number, stepIdx: number | number[], val: number) => {
    sequencer.handleTrackStepMicrotimingChange && sequencer.handleTrackStepMicrotimingChange(effectiveTrack.id, patternId, stepIdx, val);
  };
  const onVariationStepVolumeChange = (patternId: number, variationId: string, stepIdx: number | number[], val: number) => {
    sequencer.handleVariationStepVolumeChange && sequencer.handleVariationStepVolumeChange(effectiveTrack.id, patternId, variationId, stepIdx, val);
  };
  const onVariationStepDecayChange = (patternId: number, variationId: string, stepIdx: number | number[], val: number) => {
    sequencer.handleVariationStepDecayChange && sequencer.handleVariationStepDecayChange(effectiveTrack.id, patternId, variationId, stepIdx, val);
  };
  const onVariationStepMicrotimingChange = (patternId: number, variationId: string, stepIdx: number | number[], val: number) => {
    sequencer.handleVariationStepMicrotimingChange && sequencer.handleVariationStepMicrotimingChange(effectiveTrack.id, patternId, variationId, stepIdx, val);
  };
  const onSelectPattern = (patternId: number) => {
    useSequencerStore.getState().setTracks(prev => prev.map(t => t.id === effectiveTrack.id ? { ...t, selectedPatternId: patternId } : t));
  };
  const onPatternAssign = (patternId: number, measureIdx: number, val: boolean) => {
    sequencer.pushUndoState();
    useSequencerStore.getState().setTracks(prev => prev.map(t => {
      if (t.id === effectiveTrack.id) {
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
  const onAddPattern = () => {
    sequencer.pushUndoState();
    useSequencerStore.getState().setTracks(prev => prev.map(t => {
      if (t.id === effectiveTrack.id) {
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
          variations: [],
        };
        return { ...t, patterns: [...t.patterns, newPattern], selectedPatternId: newPattern.id };
      }
      return t;
    }));
  };
  const onDeletePattern = (patternId: number) => {
    sequencer.pushUndoState();
    useSequencerStore.getState().setTracks(prev => prev.map(t => {
      if (t.id === effectiveTrack.id && t.patterns.length > 1) {
        const nextPatterns = t.patterns.filter(p => p.id !== patternId);
        const nextSelected = t.selectedPatternId === patternId ? nextPatterns[0].id : t.selectedPatternId;
        return { ...t, patterns: nextPatterns, selectedPatternId: nextSelected };
      }
      return t;
    }));
  };
  const onCopyPattern = (pat?: Pattern) => {
    const target = pat || activePattern;
    if (target) {
      sequencer.handleCopyPattern && sequencer.handleCopyPattern(target);
    }
  };
  const onPastePattern = (patternId: number) => {
    sequencer.handlePastePattern(effectiveTrack.id, patternId);
  };
  const onReorderPatternsDnd = (oldIdx: number, newIdx: number) => {
    sequencer.handleReorderPatternsDnd && sequencer.handleReorderPatternsDnd(trackId, oldIdx, newIdx);
  };
  const onOpenDetailEditorClick = () => {
    onOpenDetailEditor(trackId);
  };
  const [instDropdownOpen, setInstDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isMouseDownRef = useRef(false);
  const paintValueRef = useRef<string | number>(0);
  
  // DOM Micro-optimization: Map to store references to step inputs to avoid document.querySelectorAll in ticks
  const cellRefs = useRef<Map<number, HTMLElement[]>>(new Map());
  const registerCellRef = (index: number, el: HTMLElement | null) => {
    if (el) {
      if (!cellRefs.current.has(index)) cellRefs.current.set(index, []);
      if (!cellRefs.current.get(index)!.includes(el)) {
        cellRefs.current.get(index)!.push(el);
      }
    }
  };

  const [liveMeasure, setLiveMeasure] = useState<number>(-1);
  const lastMeasureRef = useRef<number>(-1);
  const lastRatioRef = useRef<number>(-1);

  // Touch Multi-selection State & Refs
  const [isMultiSelectActive, setIsMultiSelectActive] = useState(false);
  const [selectedStepIndices, setSelectedStepIndices] = useState<number[]>([]);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isSelectingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const initialTouchIndexRef = useRef<number | null>(null);
  const [hasClipboard, setHasClipboard] = useState(false);
  const wasSelectedRef = useRef(false);

  const isToada = track ? isToadaBus(track) : false;

  const activeChildTrack = useMemo(() => {
    if (!isToada) return null;
    const pux = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
    const coro = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
    
    const globalSelectedId = useAudioStore.getState().selectedVocalPatternId;
    if (globalSelectedId) {
      if (pux && pux.patterns.some(p => p.id === globalSelectedId)) return pux;
      if (coro && coro.patterns.some(p => p.id === globalSelectedId)) return coro;
    }
    
    const measure = liveMeasure >= 0 ? liveMeasure : useSequencerStore.getState().currentMeasure;
    const coroPtn = coro?.patterns.find(p => p.measureAssignments[measure]);
    if (coroPtn) return coro;
    
    const puxPtn = pux?.patterns.find(p => p.measureAssignments[measure]);
    if (puxPtn) return pux;
    
    return coro || pux || null;
  }, [isToada, tracks, liveMeasure]);

  const effectiveTrack = isToada ? (activeChildTrack || track) : track;
  const inst = effectiveTrack ? instrumentsConfig[effectiveTrack.instrumentIdx] : null;

  const slaves = tracks.filter(t => String(t.linkedToTrackId) === String(trackId));
  const getPluralName = (name: string) => {
    if (name.includes('Alfaia')) return 'Alfaias';
    if (name === 'Caixa') return 'Caixas';
    if (name === 'Tarol') return 'Tarols';
    if (name === 'Agbê') return 'Agbês';
    if (name === 'Mineiro') return 'Mineiros';
    if (name === 'Gonguê') return 'Gonguês';
    return name + 's';
  };
  const linkedSlavesTooltip = isMaster && inst
    ? `${lang === 'fr' ? 'Lié' : 'Vinculado'} : ${inst.name.replace('Alfaia ', '')} et ${slaves.map(s => instrumentsConfig[s.instrumentIdx]?.name.replace('Alfaia ', '')).join(', ')}`
    : undefined;
  const displayName = isToada
    ? 'Toada'
    : (inst ? (isMaster ? `🔗 ${getPluralName(inst.name)}` : inst.name) : 'Instrument');

  const isAoVivo = track ? activeAoVivoTrackId === track.id : false;
  const toggleAoVivo = () => {
    if (!track) return;
    if (useSequencerStore.getState().isEcoMode) {
      alert("Mode Éco activé : Les animations d'instruments (AoVivo) ont été désactivées pour préserver les performances de la tablette.");
      return;
    }
    setActiveAoVivoTrackId(isAoVivo ? null : track.id);
  };

  const liveActivePatternId = (() => {
    if (!effectiveTrack) return '';
    if (liveMeasure >= 0) {
      if (soloPatternPlayId !== undefined && soloPatternPlayId !== null) {
        const hasSoloPattern = effectiveTrack.patterns.some(p => p.id === soloPatternPlayId);
        if (hasSoloPattern) return soloPatternPlayId;
      }
      const assignedPattern = effectiveTrack.patterns.find(p => p.measureAssignments[liveMeasure]);
      return assignedPattern ? assignedPattern.id : effectiveTrack.selectedPatternId;
    }
    return effectiveTrack.selectedPatternId;
  })();

  const activePattern = effectiveTrack ? effectiveTrack.patterns.find(p => p.id === liveActivePatternId) || effectiveTrack.patterns[0] : null;

  const activateElement = (el: HTMLElement) => {
    const type = el.getAttribute('data-step-type');
    if (type === 'voice') {
      el.classList.remove('border-[#1a1a1a]');
      el.classList.add('border-[#8b2a1a]');
    } else if (type === 'sampler') {
      el.classList.remove('bg-[#f4ecd8]', 'text-[#1a1a1a]');
      el.classList.add('bg-[#1a1a1a]', 'text-[#f4ecd8]', 'border-[#1a1a1a]', 'scale-105');
      el.style.backgroundColor = '';
      el.style.borderColor = '';
      el.style.color = '';
    }
  };

  const deactivateElement = (el: HTMLElement) => {
    const type = el.getAttribute('data-step-type');
    if (type === 'voice') {
      el.classList.remove('border-[#8b2a1a]');
      el.classList.add('border-[#1a1a1a]');
    } else if (type === 'sampler') {
      el.classList.remove('bg-[#1a1a1a]', 'text-[#f4ecd8]', 'border-[#1a1a1a]', 'scale-105');
      const isValZero = el.getAttribute('data-val-zero') === 'true';
      if (isValZero) {
        el.classList.add('bg-[#f4ecd8]', 'text-[#1a1a1a]');
      } else {
        el.style.backgroundColor = el.getAttribute('data-bg-color') || '';
        el.style.borderColor = el.getAttribute('data-border-color') || '';
        el.style.color = el.getAttribute('data-text-color') || '';
      }
    }
  };

  const trackRef = useRef(track);
  trackRef.current = track;

  const soloPatternPlayIdRef = useRef(soloPatternPlayId);
  soloPatternPlayIdRef.current = soloPatternPlayId;

  const activateElementRef = useRef(activateElement);
  activateElementRef.current = activateElement;

  const deactivateElementRef = useRef(deactivateElement);
  deactivateElementRef.current = deactivateElement;

  // Event-based VU meters do not need a requestAnimationFrame loop, they are animated directly in handleTick

  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const handleStart = (e: React.MouseEvent | React.TouchEvent, stepIdx: number, currentVal: string | number) => {
    if (!inst || !activePattern) return;
    if ('shiftKey' in e && e.shiftKey) return;
    const visualVal = getVisualStrokeSymbol(currentVal, isLeftHanded, inst.id);
    if (onStepTouchStart) {
      if (e.type === 'touchstart') {
        onStepTouchStart(e, activePattern.id, stepIdx, inst.id, visualVal, (newVal) => {
          onStepValueChange(activePattern.id, stepIdx, newVal);
        });
      } else {
        if ('button' in e && e.button !== 0) return;
        onStepTouchStart(e, activePattern.id, stepIdx, inst.id, visualVal, (newVal) => {
          onStepValueChange(activePattern.id, stepIdx, newVal);
        });
      }
    }
  };

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setInstDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  // Visual current step logic is handled purely by the DOM bypass in handleTick
  const currentStep = -1;

  useEffect(() => {
    setHasClipboard(!!getGlobalClipboard());
    const handleChanged = () => {
      setHasClipboard(!!getGlobalClipboard());
    };
    window.addEventListener('oGiradorClipboardChanged', handleChanged);
    return () => window.removeEventListener('oGiradorClipboardChanged', handleChanged);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (!activePattern || !inst) return;
      if (isMultiSelectActive && isSelectingRef.current) {
        isSelectingRef.current = false;
        if (!hasDraggedRef.current && initialTouchIndexRef.current !== null) {
          const tappedIdx = initialTouchIndexRef.current;
          if (wasSelectedRef.current) {
            const stepVal = activePattern.activeSteps[tappedIdx];
            if (onStepTouchStart) {
              onStepTouchStart(e as any, activePattern.id, tappedIdx, inst.id, stepVal, (newVal) => {
                onStepValueChange(activePattern.id, selectedStepIndices, newVal);
                setSelectedStepIndices([]);
              });
            }
          }
        }
      }
      isMouseDownRef.current = false;
      isSelectingRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isMultiSelectActive, selectedStepIndices, activePattern?.id, activePattern?.activeSteps, inst?.id, onStepTouchStart, onStepValueChange]);

  useEffect(() => {
    if (!isMultiSelectActive || selectedStepIndices.length === 0 || !activePattern) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((window as any).oGiradorDetailEditorOpen) return;
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') &&
        !(document.activeElement as HTMLInputElement).readOnly
      ) {
        return;
      }

      const key = e.key;

      if (key === 'Delete' || key === 'Backspace' || key === '0') {
        e.preventDefault();
        onStepValueChange(activePattern.id, selectedStepIndices, '0');
        setSelectedStepIndices([]);
        return;
      }

      if (key.length === 1 && /^[a-zA-Z0-9]$/.test(key)) {
        e.preventDefault();
        onStepValueChange(activePattern.id, selectedStepIndices, key);
        setSelectedStepIndices([]);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isMultiSelectActive, selectedStepIndices, activePattern?.id, onStepValueChange]);

  // Listen to CustomEvent 'o-girador-tick' to highlight step cells dynamically (Bypass React)
  useEffect(() => {
    if (!isActive) {
      if (lastMeasureRef.current !== -1) {
        lastMeasureRef.current = -1;
        setLiveMeasure(-1);
      }
      return;
    }

    let activeElements: HTMLElement[] = [];

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number; time?: number }) => {
      const { step, measure, maxTicks, ratio = step / maxTicks } = detail;
      const isEco = useSequencerStore.getState().isEcoMode;
      
      if (step < 0) {
        if (lastMeasureRef.current !== -1) {
          lastMeasureRef.current = -1;
          setLiveMeasure(-1);
        }
        lastRatioRef.current = -1;
        activeElements.forEach(el => {
          deactivateElementRef.current(el);
        });
        activeElements = [];
        return;
      }

      lastRatioRef.current = ratio;

      if (measure !== lastMeasureRef.current) {
        lastMeasureRef.current = measure;
        setLiveMeasure(prev => (prev !== measure ? measure : prev));
      }

      // Resolve the live active pattern dynamically inside the tick listener to avoid stale closure issues
      const getLivePatternForMeasure = (m: number) => {
        const currentTrack = trackRef.current;
        if (!currentTrack) return null;
        const currentSoloPatternPlayId = soloPatternPlayIdRef.current;
        if (currentSoloPatternPlayId !== undefined && currentSoloPatternPlayId !== null) {
          const hasSoloPattern = currentTrack.patterns.some(p => p.id === currentSoloPatternPlayId);
          if (hasSoloPattern) {
            return currentTrack.patterns.find(p => p.id === currentSoloPatternPlayId);
          }
        }
        return currentTrack.patterns.find(p => p.measureAssignments[m]);
      };

      const currentLivePattern = getLivePatternForMeasure(measure);

      if (!currentLivePattern) {
        // Deactivate old active elements and keep VU meter at 0%
        activeElements.forEach(el => {
          deactivateElementRef.current(el);
        });
        activeElements = [];
        return;
      }

      // Calculate track-specific step index using the ratio sent by the audio engine
      const stepsCount = currentLivePattern.steps;
      const targetStep = Math.floor(ratio * stepsCount);

      // Check if target step has changed to avoid redundant DOM queries
      const currentActiveIndex = activeElements.length > 0 ? Number(activeElements[0].getAttribute('data-step-index')) : -1;
      if (targetStep === currentActiveIndex) {
        return;
      }

      // Deactivate old active elements
      activeElements.forEach(el => {
        deactivateElementRef.current(el);
      });
      activeElements = [];

      if (isEco) return;

      // Find and activate the new active elements for this track
      const activeStepElements = cellRefs.current.get(targetStep) || [];

      activeStepElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        activateElementRef.current(htmlEl);
        activeElements.push(htmlEl);
      });
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
      activeElements.forEach(el => {
        deactivateElementRef.current(el);
      });
    };
  }, [isActive]);

  // Post-render highlight to prevent visual flicker during pattern transitions
  useEffect(() => {
    if (lastRatioRef.current >= 0 && activePattern) {
      const stepsCount = activePattern.steps;
      const targetStep = Math.floor(lastRatioRef.current * stepsCount);
      const activeStepElements = cellRefs.current.get(targetStep) || [];
      activeStepElements.forEach(el => {
        activateElement(el as HTMLElement);
      });
    }
  }, [activePattern?.id, track?.id]);

  // Synchronize the visually active pattern selection index in parent state during playback
  useEffect(() => {
    if (isPlaying && liveMeasure >= 0 && track) {
      const livePattern = (() => {
        if (soloPatternPlayId !== undefined && soloPatternPlayId !== null) {
          const hasSoloPattern = track.patterns.some(p => p.id === soloPatternPlayId);
          if (hasSoloPattern) {
            return track.patterns.find(p => p.id === soloPatternPlayId) || track.patterns[0];
          }
        }
        return track.patterns.find(p => p.measureAssignments[liveMeasure]) || track.patterns[0];
      })();

      if (livePattern && livePattern.id !== track.selectedPatternId) {
        onSelectPattern(livePattern.id);
      }
    }
  }, [liveMeasure, isPlaying, track?.patterns, track?.selectedPatternId, soloPatternPlayId, onSelectPattern]);

  const handleVoiceNav = (el: HTMLInputElement, key: string, type: 'syl' | 'note') => {
    if (key === 'Tab') return;
    const parentContainer = el.closest('.step-boxes');
    if (!parentContainer) return;

    const cards = Array.from(parentContainer.querySelectorAll('.v-card'));
    const currentCard = el.closest('.v-card');
    if (!currentCard) return;

    const idx = cards.indexOf(currentCard);

    if ((key === 'ArrowRight' || key === 'Enter') && idx < cards.length - 1) {
      const nextCard = cards[idx + 1] as HTMLElement;
      const input = nextCard.querySelector(type === 'syl' ? '.v-syl' : '.v-note') as HTMLInputElement;
      input?.focus();
      input?.select();
    } else if (key === 'ArrowLeft' && idx > 0) {
      const prevCard = cards[idx - 1] as HTMLElement;
      const input = prevCard.querySelector(type === 'syl' ? '.v-syl' : '.v-note') as HTMLInputElement;
      input?.focus();
      input?.select();
    }
  };

  const handleStepTouchStartMulti = (e: React.TouchEvent, index: number) => {
    if (!isMultiSelectActive) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    isSelectingRef.current = true;
    hasDraggedRef.current = false;
    initialTouchIndexRef.current = index;
  };

  const handleGridTouchMove = (e: React.TouchEvent) => {
    if (!isMultiSelectActive || !isSelectingRef.current || !touchStartPos.current) return;

    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (e.cancelable) {
        e.preventDefault();
      }
      if (Math.abs(dx) > 10) {
        hasDraggedRef.current = true;
      }

      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element) {
        const stepInput = element.closest('[data-track-id][data-step-index]');
        if (stepInput) {
          const trackIdAttr = stepInput.getAttribute('data-track-id');
          const stepIdxAttr = stepInput.getAttribute('data-step-index');

          if (trackIdAttr === String(track.id) && stepIdxAttr !== null) {
            const stepIdx = parseInt(stepIdxAttr, 10);
            setSelectedStepIndices(prev => {
              if (prev.includes(stepIdx)) return prev;
              return [...prev, stepIdx];
            });
          }
        }
      }
    }
  };

  const handleGridTouchEnd = (e: React.TouchEvent) => {
    if (!isMultiSelectActive || !isSelectingRef.current) return;
    isSelectingRef.current = false;

    if (!hasDraggedRef.current && initialTouchIndexRef.current !== null) {
      const tappedIdx = initialTouchIndexRef.current;
      if (selectedStepIndices.includes(tappedIdx) && selectedStepIndices.length > 0) {
        const stepVal = activePattern.activeSteps[tappedIdx];
        if (onStepTouchStart) {
          const stepEl = cellRefs.current.get(tappedIdx)?.[0];
          if (stepEl) {
            const rect = stepEl.getBoundingClientRect();
            onStepTouchStart(e, activePattern.id, tappedIdx, inst.id, stepVal, (newVal) => {
              onStepValueChange(activePattern.id, selectedStepIndices, newVal);
              setSelectedStepIndices([]);
            });
          }
        }
      } else {
        setSelectedStepIndices(prev => {
          if (prev.includes(tappedIdx)) {
            return prev.filter(idx => idx !== tappedIdx);
          } else {
            return [...prev, tappedIdx];
          }
        });
      }
    }

    touchStartPos.current = null;
    initialTouchIndexRef.current = null;
  };

  const handleCopyRelative = () => {
    if (selectedStepIndices.length === 0) return;
    const sorted = [...selectedStepIndices].sort((a, b) => a - b);
    const baseIdx = sorted[0];
    const copiedSteps = sorted.map(idx => ({
      offset: idx - baseIdx,
      val: activePattern.activeSteps[idx],
      lyric: activePattern.lyrics?.[idx] || '',
      note: activePattern.notes?.[idx] || '',
    }));
    if (typeof window !== 'undefined') {
      (window as any).__oGiradorRelativeClipboard = { steps: copiedSteps };
      window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
    }
  };

  const handlePasteRelative = (targetIdx: number) => {
    const globalClipboard = getGlobalClipboard();
    if (!globalClipboard) return;
    const destIndices: number[] = [];
    const destValues: string[] = [];
    const destLyrics: string[] = [];
    const destNotes: string[] = [];

    globalClipboard.steps.forEach((item: any) => {
      const destIdx = targetIdx + item.offset;
      if (destIdx >= 0 && destIdx < activePattern.steps) {
        destIndices.push(destIdx);
        destValues.push(String(item.val));
        destLyrics.push(item.lyric || '');
        destNotes.push(item.note || '');
      }
    });

    if (destIndices.length > 0) {
      onStepValueChange(activePattern.id, destIndices, destValues, destLyrics, destNotes);
      setSelectedStepIndices([]);
    }
  };

  const handleStepMouseDownMulti = (e: React.MouseEvent, index: number) => {
    if (!isMultiSelectActive) return;
    if (e.button !== 0) return;
    isSelectingRef.current = true;
    hasDraggedRef.current = false;
    initialTouchIndexRef.current = index;

    const wasSel = selectedStepIndices.includes(index);
    wasSelectedRef.current = wasSel;

    if (!wasSel) {
      setSelectedStepIndices(prev => [...prev, index]);
    }
  };

  const handleStepMouseEnterMulti = (index: number) => {
    if (!isMultiSelectActive || !isSelectingRef.current) return;
    hasDraggedRef.current = true;
    setSelectedStepIndices(prev => {
      if (prev.includes(index)) return prev;
      return [...prev, index];
    });
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: track ? `track-${track.id}` : 'track-temp' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!track || !inst || !activePattern) return null;

  return (
    <div
      ref={setNodeRef}
      className={`cordel-border p-3 flex flex-col relative transition-all duration-300 bg-[var(--cordel-bg)] w-full ${
        isCollapsed ? 'py-1 border-x-0 border-t-0 border-b-2 min-h-[56px] justify-center' : 'pb-2 min-h-[130px]'
      }`}
      style={{
        ...style,
        zIndex: instDropdownOpen ? 9999 : 10,
        '--cordel-bg': '#f4ecd8',
        '--cordel-text': '#1a1a1a',
        '--cordel-border': '#1a1a1a',
        '--fader-thumb-bg': '#8b2a1a',
        '--fader-thumb-border': '#1a1a1a',
      } as React.CSSProperties}
    >

      <div className={`flex justify-between items-center ${isCollapsed ? '' : 'mb-2'} relative ${instDropdownOpen ? 'z-[9999]' : 'z-[2]'}`}>
        <div className="flex items-center gap-2">
          <div
            {...(inst.id !== 'apito' ? attributes : {})}
            {...(inst.id !== 'apito' ? listeners : {})}
            className={`mr-2 transition-colors p-1 touch-none flex-shrink-0 ${
              inst.id === 'apito' 
                ? 'opacity-0 pointer-events-none' 
                : 'cursor-grab active:cursor-grabbing text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)]'
            }`}
            title={inst.id !== 'apito' ? "Drag to reorder" : undefined}
          >
            <GripVertical size={16} />
          </div>

          <div className="relative flex items-center" ref={dropdownRef}>
            <button
              onClick={() => setInstDropdownOpen(!instDropdownOpen)}
              className="flex items-center justify-between gap-1.5 cordel-border-sm cordel-button px-1.5 py-0.5 text-[11px] cursor-pointer transition-colors w-[110px] sm:w-[120px]"
              style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
              title={linkedSlavesTooltip}
            >
              <img
                src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                alt={inst.name}
                className="w-4 h-4 object-contain flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-cactus font-bold text-center leading-[1.1] flex-1">
                {index + 1}. {displayName.split(' ')[0]}
                {displayName.indexOf(' ') !== -1 && <><br/>{displayName.substring(displayName.indexOf(' ') + 1)}</>}
              </span>
              <span className="text-[8px] flex-shrink-0">▼</span>
            </button>

            {onOpenDetailEditor && !track.isBusFolder && (
              <button
                onClick={onOpenDetailEditorClick}
                className="ml-1 flex items-center justify-center w-[22px] h-[22px] cordel-border-sm cordel-button text-[10px] cursor-pointer transition-colors bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
                title={lang === 'pt' ? 'Editor detalhado' : 'Éditeur détaillé'}
              >
                ✏️
              </button>
            )}

            {track.isBusFolder && !isToada && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  useSequencerStore.getState().handleToggleFoldBus(String(track.id));
                }}
                className="ml-1 flex items-center justify-center w-[22px] h-[22px] cordel-border-sm cordel-button text-[10px] cursor-pointer transition-colors bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-xs"
                title={track.isFolded ? (lang === 'fr' ? 'Déplier' : 'Desdobrar') : (lang === 'fr' ? 'Plier' : 'Dobrar')}
              >
                {track.isFolded ? '▼' : '▲'}
              </button>
            )}

            {instDropdownOpen && (
              <div className="absolute top-7 left-0 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-shadow min-w-[180px] max-h-[220px] overflow-y-auto z-[99]">
                {instrumentsConfig.map((opt, oIdx) => (
                  <div
                    key={oIdx}
                    onClick={() => {
                      onInstrumentChange(oIdx);
                      setInstDropdownOpen(false);
                    }}
                    className="flex items-center gap-3.5 px-3 py-2 cursor-pointer text-xs font-bold border-b border-[var(--cordel-border)]/30 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
                  >
                    <img
                      src={`${ASSETS_BASE_URL}${opt.iconImg}`}
                      alt={opt.name}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span>{opt.name}</span>
                  </div>
                ))}
                <div
                  onClick={() => {
                    onDelete();
                    setInstDropdownOpen(false);
                  }}
                  className="flex items-center gap-3.5 px-3 py-2 cursor-pointer text-xs font-bold text-[#8b2a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8]"
                >
                  <span className="w-5 text-center">✕</span>
                  <span>{lang === 'fr' ? 'Supprimer la piste' : lang === 'pt' ? 'Excluir pista' : 'Delete track'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1.5">
          <button 
            onClick={(e) => { e.stopPropagation(); onMuteToggle(); }} 
            className={`w-6 h-6 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
              (track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >M</button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSoloToggle(); }} 
            className={`w-6 h-6 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
              track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >S</button>
          
          {inst.id !== 'apito' && (
            <button
              onClick={toggleAoVivo}
              className={`w-6 h-6 cordel-border-sm cordel-button font-bold cursor-pointer transition-all flex items-center justify-center ${
                isAoVivo ? 'bg-[#27ae60] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
              }`}
              title={inst.type === 'voice' ? (lang === 'fr' ? 'Karaoké (Live)' : 'Karaokê (Ao Vivo)') : "Ao Vivo (Live POV)"}
            >
              {inst.type === 'voice' ? (
                <span className="text-xs leading-none">🎤</span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M11 22 L5 6" />
                  <circle cx="4" cy="3" r="2.5" fill="currentColor" />
                  <path d="M13 22 L19 6" />
                  <circle cx="20" cy="3" r="2.5" fill="currentColor" />
                </svg>
              )}
            </button>
          )}

          {inst.id !== 'apito' && (
            <button
              onClick={onHideToggle}
              className={`w-6 h-6 cordel-border-sm cordel-button text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center ${
                track.isHidden ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
              }`}
              title="Ocultar pista"
            >
              {track.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}

          {inst.id === 'apito' && (
            <>
              <div className="w-6 h-6 pointer-events-none"></div>
              <div className="w-6 h-6 pointer-events-none"></div>
            </>
          )}
        </div>
      </div>



      <div className="flex gap-2 items-start relative z-[2] w-full">
        {!isCollapsed && (track.isBusFolder && !isToada ? (
          <div className="w-full flex-grow py-3.5 px-4 border border-[var(--cordel-border)]/20 rounded bg-[var(--cordel-bg)]/40 text-[var(--cordel-text)]/70 font-cactus text-sm font-bold tracking-wider text-center uppercase select-none animate-fade-in">
            🎚️ {track.customName || 'Bus'} Master
          </div>
        ) : (() => {
          const activePlayingSteps = activePattern.activeSteps;
          return isTouchDevice || window.innerWidth <= 1024 ? (
          /* ── MOBILE TOUCH LAYOUT: Grid 8 per line with grouping and multi-select ── */
          <div className="flex flex-col gap-2 w-full select-none">
            {inst.type === 'voice' ? (
              <div 
                className="step-boxes grid gap-y-2 gap-x-1 w-full items-center justify-start animate-fade-in"
                style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) 12px repeat(4, minmax(0, 1fr))' }}
                id={`voice-boxes-${track.id}`}
                onTouchMove={handleGridTouchMove}
                onTouchEnd={handleGridTouchEnd}
              >
                {(Array.from({ length: activePattern.steps }) as any[]).reduce((acc: React.ReactNode[], _, i) => {
                  if (i > 0 && i % 4 === 0 && i % 8 !== 0) {
                    acc.push(<div key={`spacer-${i}`} />);
                  }

                  const state = activePlayingSteps[i];
                  const isActive = state !== 0 && state !== '';
                  const isPux = state === 'P';
                  const voiceInst = instrumentsConfig.find(c => c.id === (isPux ? 'puxador' : 'coro')) || { color: '#f4ecd8' };
                  const cardBg = isActive ? voiceInst.color : 'transparent';
                  const syl = activePattern.lyrics?.[i] || '';
                  const note = activePattern.notes?.[i] || '';

                  const isSelected = selectedStepIndices.includes(i);
                  const noteLetter = note ? note.charAt(0).toUpperCase() : '';
                  const noteColor = noteLetter ? (NEWTON_NOTE_COLORS[noteLetter] || '#1a1a1a') : '#1a1a1a';

                  acc.push(
                    <div
                      key={i}
                      className={`v-card flex flex-col w-full cordel-border-sm overflow-hidden ${
                        currentStep === i 
                          ? 'border-[#8b2a1a]' 
                          : isSelected
                            ? 'border-[#f1c40f] bg-[#f1c40f]/20 shadow-[0_0_8px_#f1c40f]'
                            : 'border-[#1a1a1a]'
                      }`}
                      style={{ backgroundColor: cardBg }}
                      data-track-id={track.id}
                      data-step-index={i}
                      ref={(el) => registerCellRef(i, el)}
                      data-step-type="voice"
                      onTouchStart={(e) => {
                        if (isMultiSelectActive) {
                          handleStepTouchStartMulti(e, i);
                        }
                      }}
                    >
                      <input
                        type="text"
                        value={syl}
                        readOnly={isMultiSelectActive}
                        onChange={(e) => onVoiceSylChange(activePattern.id, i, e.target.value)}
                        placeholder="-"
                        className="v-syl w-full text-center text-xs font-bold py-1 bg-transparent border-0 border-b border-[#1a1a1a]/30 text-black focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'syl');
                          } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
                            handleVoiceNav(e.target as HTMLInputElement, e.key, 'syl');
                          }
                        }}
                      />

                      <div className="relative w-full h-[24px] flex items-center justify-center cursor-pointer hover:bg-black/5">
                        <input
                          type="text"
                          value={note}
                          readOnly={isMultiSelectActive}
                          onChange={(e) => onVoiceNoteChange(activePattern.id, i, e.target.value)}
                          onBlur={(e) => {
                            onVoiceNoteBlur(activePattern.id, i, e.target.value);
                            setFocusedVoiceNoteStep(null);
                          }}
                          placeholder="Ex:C4"
                          className={`v-note w-full h-full text-center text-[10px] py-1 bg-transparent border-0 uppercase outline-none transition-opacity ${
                            focusedVoiceNoteStep === i ? 'opacity-100 z-10 text-black font-bold' : 'opacity-0 z-0'
                          }`}
                          onFocus={(e) => {
                            if (!isMultiSelectActive) {
                              setFocusedVoiceNoteStep(i);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'note');
                            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
                              handleVoiceNav(e.target as HTMLInputElement, e.key, 'note');
                            }
                          }}
                        />
                        {focusedVoiceNoteStep !== i && (
                          <span 
                            className="absolute inset-0 flex items-center justify-center text-xs font-black tracking-wide pointer-events-none"
                            style={{ color: noteColor, textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)' }}
                          >
                            {noteLetter || '-'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                  return acc;
                }, [] as React.ReactNode[])}
              </div>
            ) : (
              <div
                id={`step-boxes-${track.id}`}
                onTouchMove={handleGridTouchMove}
                onTouchEnd={handleGridTouchEnd}
                className="w-full step-boxes"
              >
                <CompactPatternRenderer
                  pattern={{...activePattern, activeSteps: activePlayingSteps}}
                  inst={inst}
                  isLeftHanded={isLeftHanded}
                  isEditable={true}
                  isFluid={true}
                  className="w-full mb-0"
                  isLinkFolder={track.isLinkFolder}
                  tracks={tracks}
                  trackId={String(track.id)}
                  readOnly={isTouchDevice || isMultiSelectActive}
                  currentStep={currentStep}
                  selectedStepIndices={selectedStepIndices}
                  registerStepRef={(stepIdx, el) => registerCellRef(stepIdx, el)}
                  onStepValueChange={(stepIdx, val) => onStepValueChange(activePattern.id, stepIdx, val)}
                  onStepClick={(e, stepIdx, val) => {
                    if (isMultiSelectActive) {
                      if (e.type === 'touchstart') {
                        handleStepTouchStartMulti(e as unknown as React.TouchEvent, stepIdx);
                      } else if (e.type === 'mousedown') {
                        handleStepMouseDownMulti(e as unknown as React.MouseEvent, stepIdx);
                      }
                    } else {
                      if (e.type === 'touchstart') e.preventDefault();
                      handleStart(e, stepIdx, val);
                    }
                  }}
                  onStepShiftClick={(e, stepIdx, val) => {
                    isMouseDownRef.current = true;
                    const visualVal = getVisualStrokeSymbol(val, isLeftHanded, inst.id);
                    const nextVisualVal = getNextStepValue(inst.id, inst.type, visualVal);
                    const nextSemanticVal = getVisualStrokeSymbol(nextVisualVal, isLeftHanded, inst.id);
                    paintValueRef.current = nextSemanticVal;
                    onStepValueChange(activePattern.id, stepIdx, String(nextSemanticVal));
                  }}
                  onStepMouseEnter={(stepIdx) => {
                    if (isMouseDownRef.current) {
                      onStepValueChange(activePattern.id, stepIdx, String(paintValueRef.current));
                    }
                    if (isMultiSelectActive) {
                      handleStepMouseEnterMulti(stepIdx);
                    }
                  }}
                  onStepKeyDown={(e, stepIdx, val) => {
                    if (e.key === 'Tab' || e.key === 'Enter') e.preventDefault();
                    
                    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
                    if (isCtrlOrMeta && e.key.toLowerCase() === 'c') {
                      e.preventDefault();
                      onCopyPattern && onCopyPattern(activePattern);
                      return;
                    }
                    if (isCtrlOrMeta && e.key.toLowerCase() === 'v') {
                      e.preventDefault();
                      if (canPaste) {
                        onPastePattern && onPastePattern(activePattern.id);
                      }
                      return;
                    }
                    if (e.key === 'Delete' || e.key === 'Backspace' || e.key === ' ') {
                      e.preventDefault();
                      onStepValueChange(activePattern.id, stepIdx, '0');
                      if (e.key === 'Backspace') {
                        const inputEl = e.currentTarget as HTMLInputElement;
                        onStepKeyDown(activePattern.id, stepIdx, e.key, '', inputEl);
                      }
                      return;
                    }

                    const inputEl = e.currentTarget as HTMLInputElement;
                    onStepKeyDown(activePattern.id, stepIdx, e.key, inputEl.value, inputEl);
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          /* ── DESKTOP GRID LAYOUT: Double Rows ── */
          <div className="flex flex-col gap-2 w-full select-none">
            {inst.type === 'voice' ? (
              <div 
                className="grid grid-cols-8 gap-1.5 w-full flex-grow step-boxes animate-fade-in" 
                id={`voice-boxes-${track.id}`}
                onTouchMove={handleGridTouchMove}
                onTouchEnd={handleGridTouchEnd}
              >
                {Array.from({ length: activePattern.steps }).map((_, i) => {
                  const state = activePlayingSteps[i];
                  const isActive = state !== 0 && state !== '';
                  const isPux = state === 'P';
                  const voiceInst = instrumentsConfig.find(c => c.id === (isPux ? 'puxador' : 'coro')) || { color: '#f4ecd8' };
                  const cardBg = isActive ? voiceInst.color : 'transparent';
                  const syl = activePattern.lyrics?.[i] || '';
                  const note = activePattern.notes?.[i] || '';

                  const isSelected = selectedStepIndices.includes(i);
                  const noteLetter = note ? note.charAt(0).toUpperCase() : '';
                  const noteColor = noteLetter ? (NEWTON_NOTE_COLORS[noteLetter] || '#1a1a1a') : '#1a1a1a';

                  return (
                    <div
                      key={i}
                      className={`v-card flex flex-col w-full cordel-border-sm overflow-hidden ${
                        currentStep === i 
                          ? 'border-[#8b2a1a]' 
                          : isSelected
                            ? 'border-[#f1c40f] bg-[#f1c40f]/20 shadow-[0_0_8px_#f1c40f]'
                            : 'border-[#1a1a1a]'
                      }`}
                      style={{ backgroundColor: cardBg }}
                      data-track-id={track.id}
                      data-step-index={i}
                      ref={(el) => registerCellRef(i, el)}
                      data-step-type="voice"
                      onTouchStart={(e) => {
                        if (isMultiSelectActive) {
                          handleStepTouchStartMulti(e, i);
                        }
                      }}
                      onMouseDown={(e) => {
                        if (isMultiSelectActive) {
                          handleStepMouseDownMulti(e, i);
                        }
                      }}
                      onMouseEnter={() => {
                        if (isMultiSelectActive) {
                          handleStepMouseEnterMulti(i);
                        }
                      }}
                    >
                      <input
                        type="text"
                        value={syl}
                        readOnly={isMultiSelectActive}
                        onChange={(e) => onVoiceSylChange(activePattern.id, i, e.target.value)}
                        placeholder="-"
                        className="v-syl w-full text-center text-xs font-bold py-1 bg-transparent border-0 border-b border-[#1a1a1a]/30 text-black focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'syl');
                          } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
                            handleVoiceNav(e.target as HTMLInputElement, e.key, 'syl');
                          }
                        }}
                      />

                      <div className="relative w-full h-[24px] flex items-center justify-center cursor-pointer hover:bg-black/5">
                        <input
                          type="text"
                          value={note}
                          readOnly={isMultiSelectActive}
                          onChange={(e) => onVoiceNoteChange(activePattern.id, i, e.target.value)}
                          onBlur={(e) => {
                            onVoiceNoteBlur(activePattern.id, i, e.target.value);
                            setFocusedVoiceNoteStep(null);
                          }}
                          placeholder="Ex:C4"
                          className={`v-note w-full h-full text-center text-[10px] py-1 bg-transparent border-0 uppercase outline-none transition-opacity ${
                            focusedVoiceNoteStep === i ? 'opacity-100 z-10 text-black font-bold' : 'opacity-0 z-0'
                          }`}
                          onFocus={(e) => {
                            if (!isMultiSelectActive) {
                              setFocusedVoiceNoteStep(i);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'note');
                            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
                              handleVoiceNav(e.target as HTMLInputElement, e.key, 'note');
                            }
                          }}
                        />
                        {focusedVoiceNoteStep !== i && (
                          <span 
                            className="absolute inset-0 flex items-center justify-center text-xs font-black tracking-wide pointer-events-none"
                            style={{ color: noteColor, textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)' }}
                          >
                            {noteLetter || '-'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                id={`step-boxes-${track.id}`}
                onTouchMove={handleGridTouchMove}
                onTouchEnd={handleGridTouchEnd}
                className="w-full flex-grow step-boxes"
              >
                <CompactPatternRenderer
                  pattern={{...activePattern, activeSteps: activePlayingSteps}}
                  inst={inst}
                  isLeftHanded={isLeftHanded}
                  isEditable={true}
                  isFluid={true}
                  className="w-full mb-0"
                  isLinkFolder={track.isLinkFolder}
                  tracks={tracks}
                  trackId={String(track.id)}
                  readOnly={isTouchDevice || isMultiSelectActive}
                  currentStep={currentStep}
                  selectedStepIndices={selectedStepIndices}
                  registerStepRef={(stepIdx, el) => registerCellRef(stepIdx, el)}
                  onStepValueChange={(stepIdx, val) => onStepValueChange(activePattern.id, stepIdx, val)}
                  onStepClick={(e, stepIdx, val) => {
                    if (isMultiSelectActive) {
                      if (e.type === 'touchstart') {
                        handleStepTouchStartMulti(e as unknown as React.TouchEvent, stepIdx);
                      } else if (e.type === 'mousedown') {
                        handleStepMouseDownMulti(e as unknown as React.MouseEvent, stepIdx);
                      }
                    } else {
                      if (e.type === 'touchstart') e.preventDefault();
                      handleStart(e, stepIdx, val);
                    }
                  }}
                  onStepShiftClick={(e, stepIdx, val) => {
                    isMouseDownRef.current = true;
                    const visualVal = getVisualStrokeSymbol(val, isLeftHanded, inst.id);
                    const nextVisualVal = getNextStepValue(inst.id, inst.type, visualVal);
                    const nextSemanticVal = getVisualStrokeSymbol(nextVisualVal, isLeftHanded, inst.id);
                    paintValueRef.current = nextSemanticVal;
                    onStepValueChange(activePattern.id, stepIdx, String(nextSemanticVal));
                  }}
                  onStepMouseEnter={(stepIdx) => {
                    if (isMouseDownRef.current) {
                      onStepValueChange(activePattern.id, stepIdx, String(paintValueRef.current));
                    }
                    if (isMultiSelectActive) {
                      handleStepMouseEnterMulti(stepIdx);
                    }
                  }}
                  onStepKeyDown={(e, stepIdx, val) => {
                    if (e.key === 'Tab' || e.key === 'Enter') e.preventDefault();
                    
                    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
                    if (isCtrlOrMeta && e.key.toLowerCase() === 'c') {
                      e.preventDefault();
                      onCopyPattern && onCopyPattern(activePattern);
                      return;
                    }
                    if (isCtrlOrMeta && e.key.toLowerCase() === 'v') {
                      e.preventDefault();
                      if (canPaste) {
                        onPastePattern && onPastePattern(activePattern.id);
                      }
                      return;
                    }
                    if (e.key === 'Delete' || e.key === 'Backspace' || e.key === ' ') {
                      e.preventDefault();
                      onStepValueChange(activePattern.id, stepIdx, '0');
                      if (e.key === 'Backspace') {
                        const inputEl = e.currentTarget as HTMLInputElement;
                        onStepKeyDown(activePattern.id, stepIdx, e.key, '', inputEl);
                      }
                      return;
                    }

                    const inputEl = e.currentTarget as HTMLInputElement;
                    onStepKeyDown(activePattern.id, stepIdx, e.key, inputEl.value, inputEl);
                  }}
                />
              </div>
            )}
          </div>
        ); })())}
      </div>
    </div>
  );
};

export const TrackMixer = React.memo(TrackMixerComponent, (prevProps, nextProps) => {

  if (prevProps.trackId !== nextProps.trackId) {
    return false;
  }

  const keys = Object.keys(prevProps) as Array<keyof TrackMixerProps>;
  for (const key of keys) {
    if (typeof prevProps[key] === 'function') continue;
    if (key === 'trackId') continue;
    if ((key as string) === 'currentStepIndex') continue;

    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  return true;
});
