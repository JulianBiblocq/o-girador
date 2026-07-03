import React, { useState, useRef, useEffect } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '@/src/ToneLoader';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}
import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TrackGroup, Language, Pattern } from '../types';
import { i18n, instrumentsConfig, ASSETS_BASE_URL, isDarkText, getVisualStrokeSymbol } from '../data';
import { getNextStepValue } from './InstrumentDetailEditor';
import { CompactPatternRenderer } from './CompactPatternRenderer';
import { useSequencerStore } from '../stores/useSequencerStore';


const getGlobalClipboard = () => {
  if (typeof window !== 'undefined') {
    return (window as any).__oGiradorRelativeClipboard || null;
  }
  return null;
};

interface TrackMixerProps {
  lang: Language;
  isLeftHanded?: boolean;
  trackId: number;
  index: number;
  totalTracks: number;
  onInstrumentChange: (instIdx: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onHideToggle: () => void;
  onDelete: () => void;
  onVolumeChange: (val: number) => void;
  onPanChange: (val: number) => void;
  onStepsChange: (patternId: number, steps: number) => void;
  onStepValueChange: (patternId: number, stepIdx: number | number[], val: string | string[], lyrics?: string[], notes?: string[]) => void;
  onStepKeyDown: (patternId: number, stepIdx: number, key: string, currentVal: string, targetEl: HTMLInputElement) => void;
  onVoiceTypeToggle: (patternId: number, stepIdx: number) => void;
  onVoiceSylChange: (patternId: number, stepIdx: number, val: string) => void;
  onVoiceNoteChange: (patternId: number, stepIdx: number, val: string) => void;
  onVoiceNoteBlur: (patternId: number, stepIdx: number, val: string) => void;
  isPlaying: boolean;
  maxTicks: number;
  timeSig: string;
  totalMeasures: number;
  onSelectPattern: (patternId: number) => void;
  onPatternAssign: (patternId: number, measureIdx: number, val: boolean) => void;
  onAddPattern: () => void;
  onDeletePattern: (patternId: number) => void;
  onOpenDetailEditor?: () => void;
  onPatternNameChange?: (patternId: number, name: string) => void;
  onAddPatternVariation?: (patternId: number) => void;
  onUpdatePatternVariationProbability?: (patternId: number, variationId: string, probability: number) => void;
  onTogglePatternVariationFirstTimeOnly?: (patternId: number, variationId: string, val: boolean) => void;
  onVariationStepValueChange?: (patternId: number, variationId: string, stepIdx: number | number[], val: string | string[]) => void;
  onReorderPatterns?: (patternId: number, direction: 'up' | 'down') => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
    onCopyPattern?: (pattern: Pattern) => void;
  onPastePattern?: (patternId: number) => void;
  canPaste?: boolean;
  meter?: any;
  soloPatternPlayId?: number | null;
  isCollapsed?: boolean;
  activeAoVivoTrackId: number | null;
  setActiveAoVivoTrackId: (id: number | null) => void;
  activeVariationsRef?: React.MutableRefObject<Record<number, (string | number)[]>>;
}

const TrackMixerComponent: React.FC<TrackMixerProps> = ({
  lang,
  isLeftHanded = false,
  trackId,
  index,
  totalTracks,
  onInstrumentChange,
  onMuteToggle,
  onSoloToggle,
  onHideToggle,
  onDelete,
  onVolumeChange,
  onPanChange,
  onStepsChange,
  onStepValueChange,
  onStepKeyDown,
  onVoiceTypeToggle,
  onVoiceSylChange,
  onVoiceNoteChange,
  onVoiceNoteBlur,
  isPlaying,
  maxTicks,
  timeSig,
  totalMeasures,
  onSelectPattern,
  onPatternAssign,
  onAddPattern,
  onDeletePattern,
  onOpenDetailEditor,
  onPatternNameChange,
  onAddPatternVariation,
  onUpdatePatternVariationProbability,
  onTogglePatternVariationFirstTimeOnly,
  onVariationStepValueChange,
  onReorderPatterns,
  onStepTouchStart,
  onCopyPattern,
  onPastePattern,
  canPaste,
  meter,
  soloPatternPlayId,
  isCollapsed = false,
  activeAoVivoTrackId,
  setActiveAoVivoTrackId,
  activeVariationsRef,
}) => {
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const hasSolo = useSequencerStore(state => state.tracks.some(t => t.isSolo));
  const [instDropdownOpen, setInstDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isMouseDownRef = useRef(false);
  const paintValueRef = useRef<string | number>(0);

  const vuMeterRef = useRef<HTMLDivElement>(null);
  
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
  const lastVuStepRef = useRef<number>(-1);

  // Touch Multi-selection State & Refs
  const [isMultiSelectActive, setIsMultiSelectActive] = useState(false);
  const [selectedStepIndices, setSelectedStepIndices] = useState<number[]>([]);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isSelectingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const initialTouchIndexRef = useRef<number | null>(null);
  const [hasClipboard, setHasClipboard] = useState(false);
  const wasSelectedRef = useRef(false);

  const isAoVivo = track ? activeAoVivoTrackId === track.id : false;
  const toggleAoVivo = () => {
    if (!track) return;
    if ((window as any).oGiradorEcoMode) {
      alert("Mode Éco activé : Les animations d'instruments (AoVivo) ont été désactivées pour préserver les performances de la tablette.");
      return;
    }
    setActiveAoVivoTrackId(isAoVivo ? null : track.id);
  };

  const liveActivePatternId = (() => {
    if (!track) return '';
    if (liveMeasure >= 0) {
      if (soloPatternPlayId !== undefined && soloPatternPlayId !== null) {
        const hasSoloPattern = track.patterns.some(p => p.id === soloPatternPlayId);
        if (hasSoloPattern) return soloPatternPlayId;
      }
      const assignedPattern = track.patterns.find(p => p.measureAssignments[liveMeasure]);
      return assignedPattern ? assignedPattern.id : track.selectedPatternId;
    }
    return track.selectedPatternId;
  })();

  const activePattern = track ? track.patterns.find(p => p.id === liveActivePatternId) || track.patterns[0] : null;

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

  // Event-based VU meters do not need a requestAnimationFrame loop, they are animated directly in handleTick

  const inst = track ? instrumentsConfig[track.instrumentIdx] : null;
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
  }, [isMultiSelectActive, selectedStepIndices, activePattern.id, activePattern.activeSteps, inst.id, onStepTouchStart, onStepValueChange]);

  useEffect(() => {
    if (!isMultiSelectActive || selectedStepIndices.length === 0) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
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
  }, [isMultiSelectActive, selectedStepIndices, activePattern.id, onStepValueChange]);

  // Listen to CustomEvent 'o-girador-tick' to highlight step cells dynamically (Bypass React)
  useEffect(() => {
    let activeElements: HTMLElement[] = [];

    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number; measure: number; maxTicks: number; ratio?: number; time?: number }>;
      const { step, measure, maxTicks, ratio = step / maxTicks } = customEvent.detail;
      const isEco = (window as any).oGiradorEcoMode;
      
      if (step < 0) {
        if (lastMeasureRef.current !== -1) {
          lastMeasureRef.current = -1;
          setLiveMeasure(-1);
        }
        lastRatioRef.current = -1;
        lastVuStepRef.current = -1;
        activeElements.forEach(el => {
          deactivateElement(el);
        });
        activeElements = [];
        if (vuMeterRef.current) {
          vuMeterRef.current.style.transition = 'none';
          vuMeterRef.current.style.width = '0%';
        }
        return;
      }

      lastRatioRef.current = ratio;

      if (measure !== lastMeasureRef.current) {
        lastMeasureRef.current = measure;
        setLiveMeasure(prev => (prev !== measure ? measure : prev));
      }

      // Resolve the live active pattern dynamically inside the tick listener to avoid stale closure issues
      const getLivePatternForMeasure = (m: number) => {
        if (soloPatternPlayId !== undefined && soloPatternPlayId !== null) {
          const hasSoloPattern = track.patterns.some(p => p.id === soloPatternPlayId);
          if (hasSoloPattern) {
            return track.patterns.find(p => p.id === soloPatternPlayId);
          }
        }
        return track.patterns.find(p => p.measureAssignments[m]);
      };

      const currentLivePattern = getLivePatternForMeasure(measure);

      if (!currentLivePattern) {
        // Deactivate old active elements and keep VU meter at 0%
        activeElements.forEach(el => {
          deactivateElement(el);
        });
        activeElements = [];
        lastVuStepRef.current = -1;
        return;
      }

      // Calculate track-specific step index using the ratio sent by the audio engine
      const stepsCount = currentLivePattern.steps;
      const targetStep = Math.floor(ratio * stepsCount);

      // Edge trigger VU fader width update on step transitions
      if (targetStep !== lastVuStepRef.current) {
        lastVuStepRef.current = targetStep;
        if (!track.isMute && !isEco) {
          const val = currentLivePattern.activeSteps[targetStep];
          const isHit = val !== undefined && val !== 0 && val !== '0' && val !== '';
          if (isHit && vuMeterRef.current) {
            vuMeterRef.current.style.transition = 'none';
            vuMeterRef.current.style.width = `${track.volumeVal ?? 100}%`;
            void vuMeterRef.current.offsetHeight; // force reflow
            requestAnimationFrame(() => {
              if (vuMeterRef.current) {
                vuMeterRef.current.style.transition = 'width 1.5s ease-out';
                vuMeterRef.current.style.width = '0%';
              }
            });
          }
        }
      }

      // Check if target step has changed to avoid redundant DOM queries
      const currentActiveIndex = activeElements.length > 0 ? Number(activeElements[0].getAttribute('data-step-index')) : -1;
      if (targetStep === currentActiveIndex) {
        return;
      }

      // Deactivate old active elements
      activeElements.forEach(el => {
        deactivateElement(el);
      });
      activeElements = [];

      if (isEco) return;

      // Find and activate the new active elements for this track
      const activeStepElements = cellRefs.current.get(targetStep) || [];

      activeStepElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        activateElement(htmlEl);
        activeElements.push(htmlEl);
      });
    };

    window.addEventListener('o-girador-tick', handleTick);
    return () => {
      window.removeEventListener('o-girador-tick', handleTick);
      activeElements.forEach(el => {
        deactivateElement(el);
      });
    };
  }, [track, soloPatternPlayId]);

  // Post-render highlight to prevent visual flicker during pattern transitions
  useEffect(() => {
    if (lastRatioRef.current >= 0) {
      const stepsCount = activePattern.steps;
      const targetStep = Math.floor(lastRatioRef.current * stepsCount);
      const activeStepElements = cellRefs.current.get(targetStep) || [];
      activeStepElements.forEach(el => {
        activateElement(el as HTMLElement);
      });
    }
  }, [activePattern.id, track.id]);

  // Synchronize the visually active pattern selection index in parent state during playback
  useEffect(() => {
    if (isPlaying && liveMeasure >= 0) {
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
  }, [liveMeasure, isPlaying, track.patterns, track.selectedPatternId, soloPatternPlayId, onSelectPattern]);

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
  } = useSortable({ id: `track-${track.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!track || !inst || !activePattern) return null;

  return (
    <div
      ref={setNodeRef}
      className={`cordel-border p-3 flex flex-col relative transition-all duration-300 bg-[var(--cordel-bg)] w-full ${
        hasSolo ? (track.isSolo ? '' : 'opacity-50') : 
        (track.isMute ? 'opacity-60 bg-opacity-80' : '')
      } ${isCollapsed ? 'py-1 border-x-0 border-t-0 border-b-2 min-h-[56px]' : 'min-h-[130px]'}`}
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

      <div className={`flex justify-between items-start ${isCollapsed ? '' : 'mb-2'} relative ${instDropdownOpen ? 'z-[9999]' : 'z-[2]'}`}>
        <div className="flex items-start gap-2">
          <div
            {...(inst.id !== 'apito' ? attributes : {})}
            {...(inst.id !== 'apito' ? listeners : {})}
            className={`mr-2 transition-colors p-1 touch-none flex-shrink-0 mt-1 ${
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
                {index + 1}. {inst.name.split(' ')[0]}
                {inst.name.indexOf(' ') !== -1 && <><br/>{inst.name.substring(inst.name.indexOf(' ') + 1)}</>}
              </span>
              <span className="text-[8px] flex-shrink-0">▼</span>
            </button>

            {onOpenDetailEditor && (
              <button
                onClick={onOpenDetailEditor}
                className="ml-1 flex items-center justify-center w-[22px] h-[22px] cordel-border-sm cordel-button text-[10px] cursor-pointer transition-colors bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
                title={lang === 'pt' ? 'Editor detalhado' : 'Éditeur détaillé'}
              >
                ✏️
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
            onClick={(e) => { e.stopPropagation(); onMuteToggle(track.id); }} 
            className={`w-6 h-6 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
              (track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >M</button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSoloToggle(track.id); }} 
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
              title={inst.id === 'voice' ? (lang === 'fr' ? 'Karaoké (Live)' : 'Karaokê (Ao Vivo)') : "Ao Vivo (Live POV)"}
            >
              {inst.id === 'voice' ? (
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
        {!isCollapsed && (() => {
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
                {Array.from({ length: activePattern.steps }).reduce((acc: React.ReactNode[], _, i) => {
                  if (i > 0 && i % 4 === 0 && i % 8 !== 0) {
                    acc.push(<div key={`spacer-${i}`} />);
                  }

                  const state = activePlayingSteps[i];
                  const isActive = state !== 0;
                  const isPux = state === 'P';
                  const syl = activePattern.lyrics?.[i] || '';
                  const note = activePattern.notes?.[i] || '';

                  const typeText = isActive ? (isPux ? 'PUX' : 'CORO') : '---';
                  const typeClass = isActive ? '' : 'bg-transparent text-[#666] cursor-default';
                  const typeStyle = isActive ? { backgroundColor: isPux ? inst.colors['P'] : inst.colors['C'], color: '#1a1a1a' } : {};

                  const isSelected = selectedStepIndices.includes(i);

                  acc.push(
                    <div
                      key={i}
                      className={`v-card flex flex-col w-full bg-[#f4ecd8] cordel-border-sm overflow-hidden ${
                        currentStep === i 
                          ? 'border-[#8b2a1a]' 
                          : isSelected
                            ? 'border-[#f1c40f] bg-[#f1c40f]/20 shadow-[0_0_8px_#f1c40f]'
                            : 'border-[#1a1a1a]'
                      }`}
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
                      <div
                        onClick={() => {
                          if (!isMultiSelectActive) {
                            onVoiceTypeToggle(activePattern.id, i);
                          }
                        }}
                        className={`text-[9px] font-bold text-center py-0.5 cursor-pointer select-none uppercase ${typeClass}`}
                        style={typeStyle}
                      >
                        {typeText}
                      </div>
                      
                      <input
                        type="text"
                        value={syl}
                        readOnly={isMultiSelectActive}
                        onChange={(e) => onVoiceSylChange(activePattern.id, i, e.target.value)}
                        placeholder="-"
                        className="v-syl w-full text-center text-xs font-bold py-1 bg-transparent border-0 border-b border-[#1a1a1a]/30 text-[#1a1a1a] focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'syl');
                          } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
                            handleVoiceNav(e.target as HTMLInputElement, e.key, 'syl');
                          }
                        }}
                      />

                      <input
                        type="text"
                        value={note}
                        readOnly={isMultiSelectActive}
                        onChange={(e) => onVoiceNoteChange(activePattern.id, i, e.target.value)}
                        onBlur={(e) => onVoiceNoteBlur(activePattern.id, i, e.target.value)}
                        placeholder="Ex:C4"
                        className="v-note w-full text-center text-[10px] py-1 bg-transparent border-0 text-[#1a1a1a] uppercase focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'note');
                          } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
                            handleVoiceNav(e.target as HTMLInputElement, e.key, 'note');
                          }
                        }}
                      />
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
                  className="w-full mb-2"
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
                className="grid grid-cols-4 gap-1.5 w-full flex-grow step-boxes" 
                id={`voice-boxes-${track.id}`}
                onTouchMove={handleGridTouchMove}
                onTouchEnd={handleGridTouchEnd}
              >
                {Array.from({ length: activePattern.steps }).map((_, i) => {
                  const state = activePlayingSteps[i];
                  const isActive = state !== 0;
                  const isPux = state === 'P';
                  const syl = activePattern.lyrics?.[i] || '';
                  const note = activePattern.notes?.[i] || '';

                  const typeText = isActive ? (isPux ? 'PUX' : 'CORO') : '---';
                  const typeClass = isActive ? '' : 'bg-transparent text-[#666] cursor-default';
                  const typeStyle = isActive ? { backgroundColor: isPux ? inst.colors['P'] : inst.colors['C'], color: '#1a1a1a' } : {};

                  const isSelected = selectedStepIndices.includes(i);

                  return (
                    <div
                      key={i}
                      className={`v-card flex flex-col w-12 bg-[#f4ecd8] cordel-border-sm overflow-hidden ${
                        currentStep === i 
                          ? 'border-[#8b2a1a]' 
                          : isSelected
                            ? 'border-[#f1c40f] bg-[#f1c40f]/20 shadow-[0_0_8px_#f1c40f]'
                            : 'border-[#1a1a1a]'
                      }`}
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
                      <div
                        onClick={() => {
                          if (!isMultiSelectActive) {
                            onVoiceTypeToggle(activePattern.id, i);
                          }
                        }}
                        className={`text-[9px] font-bold text-center py-0.5 cursor-pointer select-none uppercase ${typeClass}`}
                        style={typeStyle}
                      >
                        {typeText}
                      </div>
                      
                      <input
                        type="text"
                        value={syl}
                        readOnly={isMultiSelectActive}
                        onChange={(e) => onVoiceSylChange(activePattern.id, i, e.target.value)}
                        placeholder="-"
                        className="v-syl w-full text-center text-xs font-bold py-1 bg-transparent border-0 border-b border-[#1a1a1a]/30 text-[#1a1a1a] focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'syl');
                          } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
                            handleVoiceNav(e.target as HTMLInputElement, e.key, 'syl');
                          }
                        }}
                      />

                      <input
                        type="text"
                        value={note}
                        readOnly={isMultiSelectActive}
                        onChange={(e) => onVoiceNoteChange(activePattern.id, i, e.target.value)}
                        onBlur={(e) => onVoiceNoteBlur(activePattern.id, i, e.target.value)}
                        placeholder="Ex:C4"
                        className="v-note w-full text-center text-[10px] py-1 bg-transparent border-0 text-[#1a1a1a] uppercase focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'note');
                          } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
                            handleVoiceNav(e.target as HTMLInputElement, e.key, 'note');
                          }
                        }}
                      />
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
                  className="w-full mb-2"
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
        ); })()}
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
    if (key === 'trackId') continue;
    if (key === 'currentStepIndex') continue;

    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  return true;
});
