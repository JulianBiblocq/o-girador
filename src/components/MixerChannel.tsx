/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, GripHorizontal, GripVertical } from 'lucide-react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSequencerStore } from '../stores/useSequencerStore';
import { Pattern, TrackGroup } from '../types';
import { i18n, instrumentsConfig, ASSETS_BASE_URL, isDarkText, getVisualStrokeSymbol } from '../data';
import { PanKnob } from './PanKnob';
import { getNextStepValue } from '../utils/instrumentStrokes';
import { CompactPatternRenderer } from './CompactPatternRenderer';
import { AudioFader } from './AudioFader';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';

const SortablePatternWrapper = ({ id, children, className, style: propStyle }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { ...propStyle, transform: CSS.Transform.toString(transform), transition };
  return children({ setNodeRef, style, attributes, listeners });
};

interface MixerChannelProps {
  track: TrackGroup;
  index: number;
  onOpenDetailEditor: () => void;
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
}

const MixerChannelComponent: React.FC<MixerChannelProps> = ({
  track,
  index,
  onOpenDetailEditor,
  onStepTouchStart,
  onCopyPattern,
  onPastePattern,
  canPaste,
}) => {
  const sequencer = useSequencer();
  const audio = useAudio();

  const lang = useSequencerStore(state => state.lang);
  const isLeftHanded = useSequencerStore(state => state.isLeftHanded);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const activeAoVivoTrackId = useSequencerStore(state => state.activeAoVivoTrackId);
  const setActiveAoVivoTrackId = useSequencerStore(state => state.setActiveAoVivoTrackId);
  const hasSolo = useSequencerStore(state => state.tracks.some(t => t.isSolo));

  const { isPlaying, maxTicksRef, soloPatternPlayIdRef } = audio;
  const maxTicks = maxTicksRef.current;

  const [instDropdownOpen, setInstDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [editingPatternId, setEditingPatternId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>('');

  const vuMeterRef = useRef<HTMLDivElement>(null);
  const [liveMeasure, setLiveMeasure] = useState<number>(-1);
  const lastMeasureRef = useRef<number>(-1);
  const lastVuStepRef = useRef<number>(-1);
  const activeVuAnimRef = useRef<Animation | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trackRef = useRef(track);
  useEffect(() => {
    trackRef.current = track;
  }, [track]);

  const liveActivePatternId = (() => {
    const soloPatternPlayId = soloPatternPlayIdRef?.current;
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

  const activePattern = track.patterns.find(p => p.id === liveActivePatternId) || track.patterns[0];

  const onInstrumentChange = (instIdx: number) => {
    useSequencerStore.getState().handleTrackInstrumentIdxChange(track.id, instIdx);
  };
  const onMuteToggle = () => {
    useSequencerStore.getState().handleTrackMuteToggle(track.id);
  };
  const onSoloToggle = () => {
    useSequencerStore.getState().handleTrackSoloToggle(track.id);
  };
  const onHideToggle = () => {
    useSequencerStore.getState().handleTrackHideToggle(track.id);
  };
  const onDelete = () => {
    useSequencerStore.getState().handleTrackDelete(track.id);
  };
  const onVolumeChange = (val: number) => {
    useSequencerStore.getState().handleTrackVolumeChange(track.id, val);
  };
  const onPanChange = (val: number) => {
    useSequencerStore.getState().handleTrackPanChange(track.id, val);
  };
  const onReverbChange = (val: number) => {
    useSequencer().handleTrackReverbChange(track.id, val);
  };
  const onStepsChange = (patternId: number, steps: number) => {
    useSequencer().handleTrackStepsChange(track.id, patternId, steps);
  };
  const onStepValueChange = (patternId: number, stepIdx: number | number[], val: string | string[], lyrics?: string[], notes?: string[]) => {
    sequencer.handleTrackStepValueChange(track.id, patternId, stepIdx, val, lyrics, notes);
  };
  const onVoiceTypeToggle = (patternId: number, stepIdx: number) => {
    sequencer.handleVoiceTypeToggle(track.id, patternId, stepIdx);
  };
  const onVoiceSylChange = (patternId: number, stepIdx: number, val: string) => {
    sequencer.handleVoiceSylChange(track.id, patternId, stepIdx, val);
  };
  const onVoiceNoteChange = (patternId: number, stepIdx: number, val: string) => {
    sequencer.handleVoiceNoteChange(track.id, patternId, stepIdx, val);
  };
  const onVoiceNoteBlur = (patternId: number, stepIdx: number, val: string) => {
    sequencer.handleVoiceNoteBlur(track.id, patternId, stepIdx, val);
  };
  const onSelectPattern = (patternId: number) => {
    useSequencerStore.getState().setTracks(prev => prev.map(t => t.id === track.id ? { ...t, selectedPatternId: patternId } : t));
  };
  const onPatternAssign = (patternId: number, measureIdx: number, val: boolean) => {
    sequencer.pushUndoState();
    useSequencerStore.getState().setTracks(prev => prev.map(t => {
      if (t.id === track.id) {
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
      if (t.id === track.id) {
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
      if (t.id === track.id && t.patterns.length > 1) {
        const nextPatterns = t.patterns.filter(p => p.id !== patternId);
        const nextSelected = t.selectedPatternId === patternId ? nextPatterns[0].id : t.selectedPatternId;
        return { ...t, patterns: nextPatterns, selectedPatternId: nextSelected };
      }
      return t;
    }));
  };
  const onReorderPatternsDnd = (oldIdx: number, newIdx: number) => {
    sequencer.handleReorderPatternsDnd && sequencer.handleReorderPatternsDnd(track.id, oldIdx, newIdx);
  };
  const onPatternNameChange = (patternId: number, name: string) => {
    sequencer.handlePatternNameChange(track.id, patternId, name);
  };

  useEffect(() => {
    let activeElements: HTMLElement[] = [];
    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number; measure: number; maxTicks: number; ratio?: number; time?: number }>;
      const { step, measure, maxTicks, ratio = step / maxTicks } = customEvent.detail;
      
      const currentTrack = trackRef.current;
      if (!currentTrack) return;

      if (step < 0) {
        if (lastMeasureRef.current !== -1) {
          lastMeasureRef.current = -1;
          setLiveMeasure(-1);
        }
        lastVuStepRef.current = -1;
        if (vuMeterRef.current) {
          vuMeterRef.current.getAnimations().forEach(anim => anim.cancel());
          vuMeterRef.current.style.transform = 'scaleY(0)';
          activeVuAnimRef.current = null;
        }
        return;
      }
      if (measure !== lastMeasureRef.current) {
        lastMeasureRef.current = measure;
        setLiveMeasure(prev => (prev !== measure ? measure : prev));
      }

      const getLivePatternForMeasure = (m: number) => {
        const soloPatternPlayId = soloPatternPlayIdRef?.current;
        if (soloPatternPlayId !== undefined && soloPatternPlayId !== null) {
          const hasSoloPattern = currentTrack.patterns.some(p => p.id === soloPatternPlayId);
          if (hasSoloPattern) {
            return currentTrack.patterns.find(p => p.id === soloPatternPlayId);
          }
        }
        return currentTrack.patterns.find(p => p.measureAssignments[m]);
      };

      const currentLivePattern = getLivePatternForMeasure(measure);

      if (!currentLivePattern) {
        lastVuStepRef.current = -1;
        if (vuMeterRef.current) {
          vuMeterRef.current.getAnimations().forEach(anim => anim.cancel());
          vuMeterRef.current.style.transform = 'scaleY(0)';
          activeVuAnimRef.current = null;
        }
        return;
      }

      const stepsCount = currentLivePattern.steps;
      const targetStep = Math.floor(ratio * stepsCount);

      if (targetStep !== lastVuStepRef.current) {
        lastVuStepRef.current = targetStep;
        if (!currentTrack.isMute) {
          const val = currentLivePattern.activeSteps[targetStep];
          const isHit = val !== undefined && val !== 0 && val !== '0' && val !== '';
          if (isHit && vuMeterRef.current) {
            const peakScale = (currentTrack.volumeVal ?? 100) / 100;
            activeVuAnimRef.current?.cancel();
            activeVuAnimRef.current = vuMeterRef.current.animate([
              { transform: `scaleY(${peakScale})` },
              { transform: 'scaleY(0)' }
            ], {
              duration: 1500,
              easing: 'ease-out',
              fill: 'forwards'
            });
          }
        }
      }

      const isEco = (window as any).oGiradorEcoMode;
      if (isEco) return;

      const currentActiveIndex = activeElements.length > 0 ? Number(activeElements[0].getAttribute('data-v-step')) : -1;
      if (targetStep === currentActiveIndex) {
        return;
      }

      activeElements.forEach(el => {
        el.classList.remove('border-[#8b2a1a]');
        el.classList.add('border-[var(--cordel-border)]');
      });
      activeElements = [];

      if (containerRef.current) {
        const newEl = containerRef.current.querySelector(`[data-v-step="${targetStep}"]`) as HTMLElement;
        if (newEl) {
          newEl.classList.remove('border-[var(--cordel-border)]');
          newEl.classList.add('border-[#8b2a1a]');
          activeElements.push(newEl);
        }
      }
    };
    window.addEventListener('o-girador-tick', handleTick);
    return () => {
      window.removeEventListener('o-girador-tick', handleTick);
      activeElements.forEach(el => {
        el.classList.remove('border-[#8b2a1a]');
        el.classList.add('border-[var(--cordel-border)]');
      });
    };
  }, []);

  useEffect(() => {
    if (isPlaying && liveMeasure >= 0) {
      const currentTrack = trackRef.current;
      if (!currentTrack) return;
      
      const soloPatternPlayId = soloPatternPlayIdRef?.current;
      const livePattern = (() => {
        if (soloPatternPlayId !== undefined && soloPatternPlayId !== null) {
          const hasSoloPattern = currentTrack.patterns.some(p => p.id === soloPatternPlayId);
          if (hasSoloPattern) {
            return currentTrack.patterns.find(p => p.id === soloPatternPlayId) || currentTrack.patterns[0];
          }
        }
        return currentTrack.patterns.find(p => p.measureAssignments[liveMeasure]) || currentTrack.patterns[0];
      })();

      if (livePattern && livePattern.id !== currentTrack.selectedPatternId) {
        onSelectPattern(livePattern.id);
      }
    }
  }, [liveMeasure, isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setLiveMeasure(-1);
    }
  }, [isPlaying]);

  const handleSave = (patternId: number) => {
    onPatternNameChange(patternId, editName);
    setEditingPatternId(null);
  };

  const isMouseDownRef = useRef(false);
  const paintValueRef = useRef<string | number>(0);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isMouseDownRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const inst = instrumentsConfig[track.instrumentIdx];
  const t = (key: string) => (i18n[lang] as any)[key] || key;
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const handleStart = (e: React.MouseEvent | React.TouchEvent, stepIdx: number, currentVal: string | number) => {
    if ('shiftKey' in e && e.shiftKey) return;
    const visualVal = getVisualStrokeSymbol(currentVal, isLeftHanded, inst.id);
    if (onStepTouchStart) {
      onStepTouchStart(e, activePattern.id, stepIdx, inst.id, visualVal, (newVal) => {
        onStepValueChange(activePattern.id, stepIdx, newVal);
      });
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

  const isAoVivo = activeAoVivoTrackId === track.id;
  const toggleAoVivo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAoVivo) {
      setActiveAoVivoTrackId(null);
    } else {
      setActiveAoVivoTrackId(track.id);
    }
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

  const isSelected = activeAoVivoTrackId === track.id;
  const currentStep = -1;

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col bg-[var(--cordel-bg)] cordel-border w-[340px] shrink-0 text-[var(--cordel-text)] overflow-hidden relative pb-4 transition-all duration-300 ${
        hasSolo ? (track.isSolo ? 'bg-[var(--cordel-border)]/5 shadow-[0_0_15px_rgba(0,0,0,0.15)] z-25' : 'opacity-50') : 
        (track.isMute ? 'opacity-60 bg-black/5 dark:bg-white/5' : 'opacity-100')
      } ${isSelected ? 'shadow-[0_0_15px_rgba(0,0,0,0.2)] z-10 bg-[var(--cordel-border)]/5' : ''}`}
      style={{
        ...style,
        zIndex: instDropdownOpen ? 30 : (isSelected ? 10 : 1),
        '--fader-thumb-bg': '#8b2a1a',
        '--fader-thumb-border': 'var(--cordel-border)',
      } as React.CSSProperties}
    >
      <div 
        className="relative p-3 pb-1 flex justify-between border-b-[3px] border-[var(--cordel-border)]"
        style={{ zIndex: instDropdownOpen ? 40 : 10 }}
      >
        <div className="flex gap-2 items-center">
          {inst.id !== 'apito' && (
            <div 
              {...attributes}
              {...listeners}
              className="flex items-center justify-center p-1 cursor-grab active:cursor-grabbing text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)] transition-colors touch-none"
              title="Drag to reorder"
            >
              <GripHorizontal size={20} />
            </div>
          )}
          
          <div className="relative flex items-center gap-1.5" ref={dropdownRef}>
            <div onClick={() => setInstDropdownOpen(!instDropdownOpen)} className="flex items-center gap-2 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button px-2 py-1 cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors">
              <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-6 h-6 object-contain" />
              <span className="font-cactus font-bold text-sm">{index + 1}. {inst.name}</span>
            </div>
            
            <button
              onClick={onOpenDetailEditor}
              className="w-8 h-8 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors"
              title="Éditeur détaillé"
            >
              ✏️
            </button>

            {instDropdownOpen && (
              <div className="absolute top-10 left-0 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-shadow min-w-[200px] max-h-[300px] overflow-y-auto z-[99]">
                {instrumentsConfig.map((opt, oIdx) => (
                  <div key={oIdx} onClick={() => { onInstrumentChange(oIdx); setInstDropdownOpen(false); }} className="flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]">
                    <img src={`${ASSETS_BASE_URL}${opt.iconImg}`} alt={opt.name} className="w-6 h-6 object-contain" />
                    <span className="font-cactus font-bold">{opt.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 items-center">
          <button 
            onClick={toggleAoVivo}
            className={`w-7 h-7 cordel-border-sm cordel-button font-bold cursor-pointer transition-all flex items-center justify-center ${
              isAoVivo ? 'bg-[#27ae60] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
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

          <button
            onClick={onHideToggle}
            className={`w-7 h-7 cordel-border-sm cordel-button text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center ${
              track.isHidden ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
            title="Ocultar pista"
          >
            {track.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          <button onClick={onDelete} className="w-7 h-7 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[#f4ecd8]">✕</button>
        </div>
      </div>

      {/* Editor Section */}
      <div className="relative z-10 flex-1 p-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar border-b-[3px] border-[var(--cordel-border)]">
        
        {/* Padrões Grid */}
        <div className="bg-[var(--cordel-bg)] p-2 cordel-border-sm flex flex-col gap-2">
          <div className="flex justify-between items-center border-b-2 border-[var(--cordel-border)] pb-1 mb-1">
            <span className="font-cactus font-bold text-sm">Padrões</span>
            <div className="flex gap-1">
              <button
                onClick={() => onCopyPattern && onCopyPattern(activePattern)}
                className="px-1.5 py-0.5 bg-[#eaddcf] text-[#1a1a1a] text-[10px] font-bold cordel-border-sm hover:bg-[#1a1a1a] hover:text-[#f4ecd8] cursor-pointer"
                title="Copier le motif actif"
              >
                📋 Copier
              </button>
              <button
                onClick={() => onPastePattern && onPastePattern(activePattern.id)}
                disabled={!canPaste}
                className={`px-1.5 py-0.5 text-[10px] font-bold cordel-border-sm cursor-pointer ${
                  canPaste 
                    ? 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                }`}
                title="Coller le motif copié"
              >
                📥 Coller
              </button>
            </div>
            <button onClick={onAddPattern} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] px-2 py-0.5 cordel-border-sm cordel-button text-[10px] font-bold hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]">+ Padrão</button>
          </div>
          
          <div className="flex flex-col gap-2">
            <SortableContext items={track.patterns.map(p => `pattern-${p.id}`)} strategy={verticalListSortingStrategy}>
              {track.patterns.map((ptn, idx) => {
                const activeMeasures = ptn.measureAssignments
                  .map((assigned, mIdx) => assigned ? mIdx + 1 : null)
                  .filter(m => m !== null);
                
                const assignedText = activeMeasures.length > 0 
                  ? activeMeasures.join(', ')
                  : (lang === 'pt' ? 'Sem compasso' : 'Aucune mesure');

                const isEditing = editingPatternId === ptn.id;

                return (
                  <SortablePatternWrapper key={ptn.id} id={`pattern-${ptn.id}`}>
                    {({ setNodeRef: setPatternNodeRef, style: patternStyle, attributes: patternAttributes, listeners: patternListeners }: any) => (
                      <div ref={setPatternNodeRef} style={patternStyle} className="flex flex-col gap-1 pb-1 last:pb-0 border-b border-[var(--cordel-border)]/20 last:border-b-0">
                        <div className="flex items-center gap-2 min-h-[28px]">
                          <input type="radio" checked={liveActivePatternId === ptn.id} onChange={() => onSelectPattern(ptn.id)} aria-label={ptn.name || `${lang === 'fr' ? 'Motif' : 'Padrão'} ${idx + 1}`} className="w-4 h-4 accent-[var(--cordel-border)] cursor-pointer" />
                          
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onBlur={() => handleSave(ptn.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave(ptn.id);
                                if (e.key === 'Escape') setEditingPatternId(null);
                              }}
                              className="font-cactus font-bold text-xs bg-transparent border-b border-[var(--cordel-border)] outline-none text-[var(--cordel-text)] px-1 py-0.5 flex-1 min-w-0"
                              autoFocus
                              onFocus={(e) => e.target.select()}
                            />
                          ) : (
                            <span 
                              className={`font-cactus font-bold cursor-pointer flex-1 truncate select-none ${
                                liveActivePatternId === ptn.id 
                                  ? 'text-[var(--cordel-text)] text-sm' 
                                  : 'text-[var(--cordel-text)]/60 text-xs'
                              }`} 
                              onClick={() => onSelectPattern(ptn.id)}
                              onDoubleClick={() => {
                                setEditingPatternId(ptn.id);
                                setEditName(ptn.name || '');
                              }}
                              title={lang === 'fr' ? 'Double-cliquez pour renommer' : 'Double clique para renomear'}
                            >
                              {ptn.name ? ptn.name : `${lang === 'fr' ? 'Motif' : 'Padrão'} ${idx + 1}`}
                            </span>
                          )}

                          {!isEditing && isTouchDevice && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPatternId(ptn.id);
                                setEditName(ptn.name || '');
                              }}
                              className="text-xs opacity-60 hover:opacity-100 p-1 cursor-pointer flex items-center justify-center flex-shrink-0"
                              title={lang === 'fr' ? 'Renommer' : 'Renomear'}
                            >
                              ✏️
                            </button>
                          )}

                          {!isEditing && (
                            <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                              {track.patterns.length > 1 && (
                                <div
                                  {...patternAttributes}
                                  {...patternListeners}
                                  className="cursor-grab active:cursor-grabbing text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)] px-1 touch-none"
                                  title="Drag to reorder"
                                >
                                  <GripVertical size={14} />
                                </div>
                              )}
                              {track.patterns.length > 1 && (
                                <button 
                                  onClick={() => onDeletePattern(ptn.id)} 
                                  className="text-[#8b2a1a] text-xs px-1 font-bold hover:underline cursor-pointer"
                                  title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Measure assignment details */}
                        <div className="text-[10px] text-[var(--cordel-text)]/60 font-bold ml-6 mb-1">
                          {lang === 'pt' ? 'Compassos: ' : 'Mesures: '} {assignedText}
                        </div>
                        
                        {/* Assign measure checkboxes */}
                        <div className="flex flex-wrap gap-1.5 ml-6 pb-2">
                          {Array.from({ length: totalMeasures }).map((_, mIdx) => {
                            const isAssigned = ptn.measureAssignments[mIdx];
                            return (
                              <label key={mIdx} className="flex items-center gap-1 cursor-pointer text-[10px] font-bold select-none">
                                <input 
                                  type="checkbox" 
                                  checked={isAssigned} 
                                  onChange={(e) => onPatternAssign(ptn.id, mIdx, e.target.checked)}
                                  className="w-3.5 h-3.5 accent-[#8b2a1a] cursor-pointer"
                                />
                                <span>{mIdx + 1}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </SortablePatternWrapper>
                );
              })}
            </SortableContext>
          </div>
        </div>

        {/* Steps Editor */}
        <div className="bg-[var(--cordel-bg)] p-2 cordel-border-sm flex flex-col gap-2">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-xs">{t('stepsNum')}</span>
            <input type="number" min="2" max="32" value={activePattern.steps} onChange={(e) => onStepsChange(activePattern.id, parseInt(e.target.value) || 4)} className="w-12 bg-transparent border-b-2 border-[var(--cordel-border)] text-center font-bold font-cactus outline-none text-[var(--cordel-text)]" />
          </div>
          
          <div className="flex gap-2 items-start w-full">
            {(() => {
              const activePlayingSteps = activePattern.activeSteps;
              return inst.type === 'voice' ? (
                <div ref={containerRef} className="grid grid-cols-4 gap-1.5 w-full step-boxes">
                  {Array.from({ length: activePattern.steps }).map((_, i) => {
                    const state = activePlayingSteps[i];
                    const isActive = state !== 0;
                    const isPux = state === 'P';
                    const syl = activePattern.lyrics?.[i] || '';
                    const note = activePattern.notes?.[i] || '';
                    const typeText = isActive ? (isPux ? 'PUX' : 'CORO') : '---';
                    const typeClass = isActive ? '' : 'bg-transparent text-[var(--cordel-text)]/40';
                    const typeStyle = isActive ? { backgroundColor: isPux ? inst.colors['P'] : inst.colors['C'], color: '#1a1a1a' } : {};

                    return (
                      <div key={i} className={`v-card flex flex-col bg-[var(--cordel-bg)] cordel-border-sm overflow-hidden border-[var(--cordel-border)]`} data-v-step={i}>
                        <div onClick={() => onVoiceTypeToggle(activePattern.id, i)} className={`text-[9px] font-bold text-center py-0.5 cursor-pointer select-none uppercase ${typeClass}`} style={typeStyle}>{typeText}</div>
                        <input type="text" value={syl} onChange={(e) => onVoiceSylChange(activePattern.id, i, e.target.value)} placeholder="-" className="v-syl w-full text-center text-xs font-bold py-1 bg-transparent border-b border-[var(--cordel-border)]/30 text-[var(--cordel-text)] outline-none" onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'syl'); } else if (['ArrowRight','ArrowLeft','Enter'].includes(e.key)) handleVoiceNav(e.target as HTMLInputElement, e.key, 'syl'); }} />
                        <input type="text" value={note} onChange={(e) => onVoiceNoteChange(activePattern.id, i, e.target.value)} onBlur={(e) => onVoiceNoteBlur(activePattern.id, i, e.target.value)} placeholder="C4" className="v-note w-full text-center text-[10px] py-1 bg-transparent text-[var(--cordel-text)] uppercase outline-none" onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'note'); } else if (['ArrowRight','ArrowLeft','Enter'].includes(e.key)) handleVoiceNav(e.target as HTMLInputElement, e.key, 'note'); }} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <CompactPatternRenderer
                  pattern={{...activePattern, activeSteps: activePlayingSteps}}
                  inst={inst}
                  isLeftHanded={isLeftHanded}
                  isEditable={true}
                  isFluid={true}
                  className="w-full mb-2"
                  currentStep={currentStep}
                  onStepValueChange={(stepIdx, val) => onStepValueChange(activePattern.id, stepIdx, val)}
                  onStepClick={(e, stepIdx, val) => {
                    if (e.type === 'touchstart') {
                      handleStart(e as React.TouchEvent, stepIdx, val);
                    } else {
                      handleStart(e as React.MouseEvent, stepIdx, val);
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
                />
              );
            })()}
          </div>
        </div>
      </div>

      {/* Fader & Mute/Solo Section (Bottom) */}
      <div className="relative z-10 p-4 pt-4 flex justify-between items-end h-[200px] gap-2">
        {/* Buttons Column */}
        <div className="flex flex-col gap-2 justify-end h-full pb-1">
          <PanKnob trackId={track.id} value={track.panVal || 0} onChange={onPanChange} label="Pan" />
          <div className="h-1" />
          <button 
            onClick={(e) => { e.stopPropagation(); onMuteToggle(); }} 
            className={`w-9 h-9 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
              (track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
          >M</button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSoloToggle(); }} 
            className={`w-9 h-9 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
              track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
          >S</button>
        </div>

        {/* Volume Fader Column */}
        <div className="flex flex-col items-center gap-1.5 h-full">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Volume</span>
          <div className="h-[145px] flex justify-center items-center relative w-12">
            {/* Fader Slot */}
            <div className="absolute top-0 bottom-0 w-1.5 bg-[var(--cordel-border)] rounded-none border-x border-[var(--cordel-bg)] pointer-events-none"></div>
            <AudioFader
              type="range"
              min="0"
              max="100"
              orient="vertical"
              audioTarget="trackVolume"
              trackId={track.id}
              value={track.volumeVal}
              onChange={(val) => onVolumeChange(val)}
              className="vertical-fader touch-none z-10 h-[130px] w-8 cursor-pointer"
            />
          </div>
          <span className="text-[10px] font-bold text-[var(--cordel-text)]">{track.volumeVal}</span>
        </div>

        {/* Reverb Fader Column */}
        <div className="flex flex-col items-center gap-1.5 h-full">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Reverb</span>
          <div className="h-[145px] flex justify-center items-center relative w-12">
            {/* Fader Slot */}
            <div className="absolute top-0 bottom-0 w-1.5 bg-[var(--cordel-border)] rounded-none border-x border-[var(--cordel-bg)] pointer-events-none"></div>
            <AudioFader
              type="range"
              min="0"
              max="100"
              orient="vertical"
              audioTarget="trackReverb"
              trackId={track.id}
              value={track.reverbVal || 0}
              onChange={(val) => onReverbChange(val)}
              className="vertical-fader touch-none z-10 h-[130px] w-8 cursor-pointer"
            />
          </div>
          <span className="text-[10px] font-bold text-[var(--cordel-text)]">{track.reverbVal || 0}</span>
        </div>

        {/* LED Meter */}
        <div className="flex flex-col items-center gap-1.5 h-full">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Meter</span>
          <div className="w-3 h-[145px] bg-[var(--cordel-bg)] cordel-border-sm relative overflow-hidden">
            <div
              ref={vuMeterRef}
              id={`meter-bar-${track.id}`}
              className="meter-vertical absolute bottom-0 left-0 right-0 bg-[var(--cordel-border)] w-full"
              style={{ height: '100%', transform: 'scaleY(0)', transformOrigin: 'bottom', transition: 'none' }}
            />
          </div>
          <div className="h-[15px]" />
        </div>
      </div>
    </div>
  );
};

const arePatternsEqual = (p1: Pattern[], p2: Pattern[]) => {
  if (p1.length !== p2.length) return false;
  for (let i = 0; i < p1.length; i++) {
    const a = p1[i];
    const b = p2[i];
    if (a.id !== b.id || a.steps !== b.steps || a.name !== b.name) return false;
    
    if (a.measureAssignments.length !== b.measureAssignments.length) return false;
    for (let j = 0; j < a.measureAssignments.length; j++) {
      if (a.measureAssignments[j] !== b.measureAssignments[j]) return false;
    }

    if (a.activeSteps.length !== b.activeSteps.length) return false;
    for (let j = 0; j < a.activeSteps.length; j++) {
      if (a.activeSteps[j] !== b.activeSteps[j]) return false;
    }

    const lyricsA = a.lyrics || [];
    const lyricsB = b.lyrics || [];
    if (lyricsA.length !== lyricsB.length) return false;
    for (let j = 0; j < lyricsA.length; j++) {
      if (lyricsA[j] !== lyricsB[j]) return false;
    }

    const notesA = a.notes || [];
    const notesB = b.notes || [];
    if (notesA.length !== notesB.length) return false;
    for (let j = 0; j < notesA.length; j++) {
      if (notesA[j] !== notesB[j]) return false;
    }
  }
  return true;
};

const areEqualProps = (prev: MixerChannelProps, next: MixerChannelProps) => {
  if (prev.index !== next.index) return false;
  if (prev.track.id !== next.track.id) return false;
  if (prev.track.volumeVal !== next.track.volumeVal) return false;
  if (prev.track.panVal !== next.track.panVal) return false;
  if (prev.track.reverbVal !== next.track.reverbVal) return false;
  if (prev.track.isMute !== next.track.isMute) return false;
  if (prev.track.isSolo !== next.track.isSolo) return false;
  if (prev.track.isHidden !== next.track.isHidden) return false;
  if (prev.track.selectedPatternId !== next.track.selectedPatternId) return false;
  if (prev.track.instrumentIdx !== next.track.instrumentIdx) return false;
  
  return arePatternsEqual(prev.track.patterns, next.track.patterns);
};

export const MixerChannel = React.memo(MixerChannelComponent, areEqualProps);
