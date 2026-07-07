/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal, GripVertical } from 'lucide-react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSequencerStore } from '../stores/useSequencerStore';
import { Pattern, TrackGroup } from '../types';
import { i18n, instrumentsConfig, ASSETS_BASE_URL, isDarkText, getVisualStrokeSymbol } from '../data';
import { PanKnob } from './PanKnob';
import { getNextStepValue } from '../utils/instrumentStrokes';
import { CompactPatternRenderer } from './CompactPatternRenderer';
import { VisualOnlyTimeline } from './VisualOnlyTimeline';
import { AudioFader } from './AudioFader';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { VUMeter } from './VUMeter';

const SortablePatternWrapper = ({ id, children, className, style: propStyle }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { ...propStyle, transform: CSS.Transform.toString(transform), transition };
  return children({ setNodeRef, style, attributes, listeners });
};

interface MixerChannelProps {
  trackId: number;
  index: number;
  onOpenDetailEditor: (trackId: number) => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  onCopyPattern?: (pattern: Pattern) => void;
  onPastePattern?: (trackId: number, patternId: number) => void;
  canPaste?: boolean;
  isActive?: boolean;
}

const MixerChannelComponent: React.FC<MixerChannelProps> = ({
  trackId,
  index,
  onOpenDetailEditor,
  onStepTouchStart,
  onCopyPattern,
  onPastePattern,
  canPaste,
  isActive = true,
}) => {
  const sequencer = useSequencer();
  const audio = useAudio();

  const lang = useSequencerStore(state => state.lang);
  const isLeftHanded = useSequencerStore(state => state.isLeftHanded);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const hasSolo = useSequencerStore(state => state.tracks.some(t => t.isSolo));

  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const tracks = useSequencerStore(state => state.tracks);

  const currentInst = track ? instrumentsConfig[track.instrumentIdx] : null;
  const eligibleTracks = currentInst ? tracks.filter(t => {
    if (t.id === trackId) return false;
    if (t.linkedToTrackId && String(t.linkedToTrackId) === String(trackId)) return false;
    
    const optInst = instrumentsConfig[t.instrumentIdx];
    if (!optInst) return false;
    
    if (currentInst.id === optInst.id) return true;
    const isAlfaiaA = currentInst.path?.startsWith('Alfaia');
    const isAlfaiaB = optInst.path?.startsWith('Alfaia');
    if (isAlfaiaA && isAlfaiaB) return true;
    const isCaixaA = currentInst.id === 'caixa' || currentInst.id === 'tarol';
    const isCaixaB = optInst.id === 'caixa' || optInst.id === 'tarol';
    if (isCaixaA && isCaixaB) return true;
    const isShakeA = currentInst.type === 'shake';
    const isShakeB = optInst.type === 'shake';
    if (isShakeA && isShakeB) return true;
    
    return false;
  }) : [];

  const slaves = tracks.filter(t => String(t.linkedToTrackId) === String(trackId));
  const isMaster = slaves.length > 0;
  const getPluralName = (name: string) => {
    if (name.includes('Alfaia')) return 'Alfaias';
    if (name === 'Caixa') return 'Caixas';
    if (name === 'Tarol') return 'Tarols';
    if (name === 'Agbê') return 'Agbês';
    if (name === 'Mineiro') return 'Mineiros';
    if (name === 'Gonguê') return 'Gonguês';
    return name + 's';
  };
  const linkedSlavesTooltip = isMaster 
    ? `${lang === 'fr' ? 'Lié' : 'Vinculado'} : ${currentInst?.name.replace('Alfaia ', '')} et ${slaves.map(s => instrumentsConfig[s.instrumentIdx]?.name.replace('Alfaia ', '')).join(', ')}`
    : undefined;
  const displayName = currentInst ? (isMaster ? `🔗 ${getPluralName(currentInst.name)}` : currentInst.name) : 'Instrument';

  const { isPlaying, maxTicksRef, soloPatternPlayIdRef } = audio;
  const maxTicks = maxTicksRef.current;

  const [instDropdownOpen, setInstDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [editingPatternId, setEditingPatternId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>('');

  const [liveMeasure, setLiveMeasure] = useState<number>(-1);
  const lastMeasureRef = useRef<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const trackRef = useRef(track);
  useEffect(() => {
    trackRef.current = track;
  }, [track]);

  useEffect(() => {
    if (!isActive) {
      if (lastMeasureRef.current !== -1) {
        lastMeasureRef.current = -1;
        setLiveMeasure(-1);
      }
      return;
    }

    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number; measure: number; maxTicks: number; ratio?: number; time?: number }>;
      const { step, measure } = customEvent.detail;
      
      const currentTrack = trackRef.current;
      if (!currentTrack) return;

      if (step < 0) {
        if (lastMeasureRef.current !== -1) {
          lastMeasureRef.current = -1;
          setLiveMeasure(-1);
        }
        return;
      }
      if (measure !== lastMeasureRef.current) {
        lastMeasureRef.current = measure;
        setLiveMeasure(prev => (prev !== measure ? measure : prev));
      }
    };
    window.addEventListener('o-girador-tick', handleTick);
    return () => {
      window.removeEventListener('o-girador-tick', handleTick);
    };
  }, [isActive]);

  useEffect(() => {
    if (isPlaying && liveMeasure >= 0) {
      const currentTrack = trackRef.current;
      if (!currentTrack) return;
      
      const soloPatternPlayId = soloPatternPlayIdRef?.current;
      const livePattern = (() => {
        if (soloPatternPlayId !== undefined && soloPatternPlayId !== null) {
          const hasSoloPattern = currentTrack?.patterns?.some(p => p.id === soloPatternPlayId);
          if (hasSoloPattern) {
            return currentTrack?.patterns?.find(p => p.id === soloPatternPlayId) || currentTrack?.patterns?.[0];
          }
        }
        return currentTrack?.patterns?.find(p => p?.measureAssignments?.[liveMeasure]) || currentTrack?.patterns?.[0];
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

  const isMouseDownRef = useRef(false);
  const paintValueRef = useRef<string | number>(0);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isMouseDownRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setInstDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: `track-${trackId}` });

  // Guard Clauses for store states
  if (!track) return null;

  const inst = instrumentsConfig[track.instrumentIdx];
  if (!inst) return null;

  const handleSave = (patternId: number) => {
    onPatternNameChange(patternId, editName);
    setEditingPatternId(null);
  };

  const t = (key: string) => (i18n[lang] as any)[key] || key;
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const handleStart = (e: React.MouseEvent | React.TouchEvent, stepIdx: number, currentVal: string | number) => {
    if ('shiftKey' in e && e.shiftKey) return;
    const visualVal = getVisualStrokeSymbol(currentVal, isLeftHanded, inst.id);
    if (onStepTouchStart && activePattern) {
      onStepTouchStart(e, activePattern.id, stepIdx, inst.id, visualVal, (newVal) => {
        onStepValueChange(activePattern.id, stepIdx, newVal);
      });
    }
  };

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

  const onInstrumentChange = (instIdx: number) => {
    useSequencerStore.getState().handleTrackInstrumentIdxChange(trackId, instIdx);
  };
  const onMuteToggle = () => {
    useSequencerStore.getState().handleTrackMuteToggle(trackId);
  };
  const onSoloToggle = () => {
    useSequencerStore.getState().handleTrackSoloToggle(trackId);
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
  const onReverbChange = (val: number) => {
    sequencer.handleTrackReverbChange(trackId, val);
  };
  const onStepsChange = (patternId: number, steps: number) => {
    sequencer.handleTrackStepsChange(trackId, patternId, steps);
  };
  const onStepValueChange = (patternId: number, stepIdx: number | number[], val: string | string[], lyrics?: string[], notes?: string[]) => {
    sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, val, lyrics, notes);
  };
  const onVoiceTypeToggle = (patternId: number, stepIdx: number) => {
    sequencer.handleVoiceTypeToggle(trackId, patternId, stepIdx);
  };
  const onVoiceSylChange = (patternId: number, stepIdx: number, val: string) => {
    sequencer.handleVoiceSylChange(trackId, patternId, stepIdx, val);
  };
  const onVoiceNoteChange = (patternId: number, stepIdx: number, val: string) => {
    sequencer.handleVoiceNoteChange(trackId, patternId, stepIdx, val);
  };
  const onVoiceNoteBlur = (patternId: number, stepIdx: number, val: string) => {
    sequencer.handleVoiceNoteBlur(trackId, patternId, stepIdx, val);
  };
  const onSelectPattern = (patternId: number) => {
    useSequencerStore.getState().setTracks(prev => prev.map(t => t.id === trackId ? { ...t, selectedPatternId: patternId } : t));
  };

  const onAddPattern = () => {
    sequencer.pushUndoState();
    useSequencerStore.getState().setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const p = t.patterns?.[0];
        const stepsCount = p?.steps ?? 16;
        const newPattern: Pattern = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          name: `Padrão ${(t.patterns?.length ?? 0) + 1}`,
          steps: stepsCount,
          activeSteps: Array(stepsCount).fill(0),
          lyrics: Array(stepsCount).fill(''),
          notes: Array(stepsCount).fill(''),
          measureAssignments: Array(totalMeasures).fill(false),
          volumes: Array(stepsCount).fill(80),
          decays: Array(stepsCount).fill(100),
          microtimings: Array(stepsCount).fill(0),
          variations: [],
        };
        return { ...t, patterns: [...(t.patterns || []), newPattern], selectedPatternId: newPattern.id };
      }
      return t;
    }));
  };
  const onDeletePattern = (patternId: number) => {
    sequencer.pushUndoState();
    useSequencerStore.getState().setTracks(prev => prev.map(t => {
      if (t.id === trackId && t.patterns && t.patterns.length > 1) {
        const nextPatterns = t.patterns.filter(p => p.id !== patternId);
        const nextSelected = t.selectedPatternId === patternId ? (nextPatterns[0]?.id ?? t.selectedPatternId) : t.selectedPatternId;
        return { ...t, patterns: nextPatterns, selectedPatternId: nextSelected };
      }
      return t;
    }));
  };
  const onReorderPatternsDnd = (oldIdx: number, newIdx: number) => {
    sequencer.handleReorderPatternsDnd && sequencer.handleReorderPatternsDnd(trackId, oldIdx, newIdx);
  };
  const onPatternNameChange = (patternId: number, name: string) => {
    sequencer.handlePatternNameChange(trackId, patternId, name);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const liveActivePatternId = (() => {
    const soloPatternPlayId = soloPatternPlayIdRef?.current;
    if (liveMeasure >= 0) {
      if (soloPatternPlayId !== undefined && soloPatternPlayId !== null) {
        const hasSoloPattern = track?.patterns?.some(p => p.id === soloPatternPlayId);
        if (hasSoloPattern) return soloPatternPlayId;
      }
      const assignedPattern = track?.patterns?.find(p => p?.measureAssignments?.[liveMeasure]);
      return assignedPattern ? assignedPattern.id : track?.selectedPatternId;
    }
    return track?.selectedPatternId;
  })();

  const activePattern = track?.patterns?.find(p => p.id === liveActivePatternId) || track?.patterns?.[0];

  // Guard activePattern
  if (!activePattern) return null;

  const currentStep = -1;

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col bg-[var(--cordel-bg)] cordel-border w-[210px] shrink-0 text-[var(--cordel-text)] overflow-hidden relative pb-4 transition-all duration-300 ${
        hasSolo ? (track.isSolo ? 'bg-[var(--cordel-border)]/5 shadow-[0_0_15px_rgba(0,0,0,0.15)] z-25' : 'opacity-50') : 
        (track.isMute ? 'opacity-60 bg-black/5 dark:bg-white/5' : 'opacity-100')
      }`}
      style={{
        ...style,
        zIndex: instDropdownOpen ? 30 : 1,
        '--fader-thumb-bg': '#8b2a1a',
        '--fader-thumb-border': 'var(--cordel-border)',
      } as React.CSSProperties}
    >
      <div 
        className="relative p-2 pb-1.5 flex flex-col gap-1.5 border-b-[3px] border-[var(--cordel-border)]"
        style={{ zIndex: instDropdownOpen ? 40 : 10 }}
      >
        {/* Ligne 1 : Outils */}
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-1.5">
            {inst.id !== 'apito' && (
              <div 
                {...attributes}
                {...listeners}
                className="flex items-center justify-center p-1 cursor-grab active:cursor-grabbing text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)] transition-colors touch-none"
                title="Drag to reorder"
              >
                <GripHorizontal size={18} />
              </div>
            )}
            <button
              onClick={() => onOpenDetailEditor(trackId)}
              className="w-7 h-7 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors text-xs"
              title="Éditeur détaillé"
            >
              ✏️
            </button>
          </div>
          <button 
            onClick={onDelete} 
            className="w-7 h-7 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[#f4ecd8] text-xs"
            title="Supprimer la piste"
          >
            ✕
          </button>
        </div>

        {/* Ligne 2 : Sélection de l'instrument */}
        <div className="relative flex items-center w-full" ref={dropdownRef}>
          <div 
            onClick={() => setInstDropdownOpen(!instDropdownOpen)} 
            className="flex items-center gap-2 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button px-2 py-1.5 cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors w-full justify-between"
            title={linkedSlavesTooltip}
          >
            <div className="flex items-center gap-2 truncate">
              <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-5 h-5 object-contain flex-shrink-0" />
              <span className="font-cactus font-bold text-xs truncate">{index + 1}. {displayName}</span>
            </div>
            <span className="text-[8px] flex-shrink-0 opacity-60">▼</span>
          </div>

          {instDropdownOpen && (
            <div className="absolute top-9 left-0 right-0 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-shadow max-h-[300px] overflow-y-auto z-[99] w-full custom-scrollbar">
              <div className="text-[10px] uppercase opacity-60 font-bold px-3 py-1 bg-[var(--cordel-text)]/5 border-b border-[var(--cordel-border)]/20">
                {lang === 'fr' ? 'Changer d\'instrument' : 'Mudar instrumento'}
              </div>
              {instrumentsConfig.map((opt, oIdx) => (
                <div 
                  key={oIdx} 
                  onClick={() => { onInstrumentChange(oIdx); setInstDropdownOpen(false); }} 
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-xs font-bold"
                >
                  <img src={`${ASSETS_BASE_URL}${opt.iconImg}`} alt={opt.name} className="w-5 h-5 object-contain" />
                  <span className="font-cactus">{opt.name}</span>
                </div>
              ))}
              
              {/* Section Liaison */}
              <div className="text-[10px] uppercase opacity-60 font-bold px-3 py-1 bg-[var(--cordel-text)]/5 border-t border-b border-[var(--cordel-border)]/20 mt-1">
                🔗 {lang === 'fr' ? 'Liaison de partition' : 'Vínculo de partitura'}
              </div>
              
              {track.linkedToTrackId ? (
                <div 
                  onClick={() => {
                    useSequencerStore.getState().handleLinkTrack(trackId, null);
                    setInstDropdownOpen(false);
                  }}
                  className="px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-xs font-bold text-[#8b2a1a]"
                >
                  ✕ {lang === 'fr' ? 'Délier la piste' : 'Remover vínculo'}
                </div>
              ) : (
                eligibleTracks.length > 0 ? (
                  eligibleTracks.map((tOpt) => {
                    const tOptInst = instrumentsConfig[tOpt.instrumentIdx];
                    const tOptIndex = tracks.findIndex(t => t.id === tOpt.id);
                    const shortName = tOptInst.name.replace('Alfaia ', '');
                    return (
                      <div
                        key={tOpt.id}
                        onClick={() => {
                          useSequencerStore.getState().handleLinkTrack(trackId, String(tOpt.id));
                          setInstDropdownOpen(false);
                        }}
                        className="px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-xs font-bold truncate"
                      >
                        🔗 {shortName} ({tOptIndex + 1})
                      </div>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-[10px] italic text-[var(--cordel-text)]/60">
                    {lang === 'fr' ? 'Aucune piste compatible' : 'Nenhuma pista compatível'}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Editor Section */}
      <div className="relative z-10 flex-1 p-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar border-b-[3px] border-[var(--cordel-border)]">
        
        {/* Padrões Grid */}
        <div className="bg-[var(--cordel-bg)] p-2 cordel-border-sm flex flex-col gap-2">
          <div className="flex justify-between items-center border-b-2 border-[var(--cordel-border)] pb-1 mb-1 sticky top-[-9px] bg-[var(--cordel-bg)] z-10 pt-2">
            <div className="flex gap-1">
              <button
                onClick={() => onCopyPattern && onCopyPattern(activePattern)}
                className="w-6 h-6 flex items-center justify-center bg-[#eaddcf] text-[#1a1a1a] text-xs font-bold cordel-border-sm hover:bg-[#1a1a1a] hover:text-[#f4ecd8] cursor-pointer"
                title="Copier le motif actif"
              >
                📋
              </button>
              <button
                onClick={() => onPastePattern && onPastePattern(trackId, activePattern.id)}
                disabled={!canPaste}
                className={`w-6 h-6 flex items-center justify-center text-xs font-bold cordel-border-sm cursor-pointer ${
                  canPaste 
                    ? 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                }`}
                title="Coller le motif copié"
              >
                📥
              </button>
            </div>
            <button onClick={onAddPattern} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] px-2 py-0.5 cordel-border-sm cordel-button text-[10px] font-bold hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]">+ Padrão</button>
          </div>
          
          <div className="flex flex-col gap-2">
            <SortableContext items={track?.patterns?.map(p => `pattern-${p.id}`) || []} strategy={verticalListSortingStrategy}>
              {track?.patterns?.map((ptn, idx) => {
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
                                  ? 'text-[var(--cordel-text)] text-xs' 
                                  : 'text-[var(--cordel-text)]/60 text-[10px]'
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
                              {(track?.patterns?.length ?? 0) > 1 && (
                                <div
                                  {...patternAttributes}
                                  {...patternListeners}
                                  className="cursor-grab active:cursor-grabbing text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)] px-1 touch-none"
                                  title="Drag to reorder"
                                >
                                  <GripVertical size={14} />
                                </div>
                              )}
                              {(track?.patterns?.length ?? 0) > 1 && (
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
                      </div>
                    )}
                  </SortablePatternWrapper>
                );
              })}
            </SortableContext>
          </div>
        </div>

      </div>

      {/* Visual Only Timeline (Fixed above faders, no longer scrollable) */}
      <div className="px-4 py-2 bg-[var(--cordel-bg)] border-b-[3px] border-[var(--cordel-border)] z-10 shrink-0">
        <VisualOnlyTimeline
          trackId={trackId}
          steps={activePattern.steps}
          activeSteps={activePattern.activeSteps || []}
          instrumentIdx={track.instrumentIdx}
          isPlaying={isPlaying}
          isLeftHanded={isLeftHanded}
        />
      </div>

      {/* Fader & Mute/Solo Section (Bottom) */}
      <div className="relative z-10 p-3 pt-4 flex justify-between items-end h-[200px] gap-2">
        {/* Column 1: Pan & Buttons Column */}
        <div className="flex flex-col gap-2 justify-end h-full pb-1 items-center w-11 shrink-0">
          <PanKnob trackId={trackId} value={track.panVal || 0} onChange={onPanChange} label="Pan" />
          <div className="h-0.5" />
          <button 
            onClick={(e) => { e.stopPropagation(); onMuteToggle(); }} 
            className={`w-8 h-8 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
              (track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
          >M</button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSoloToggle(); }} 
            className={`w-8 h-8 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
              track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
          >S</button>
        </div>

        {/* Volume Fader Column */}
        <div className="flex flex-col items-center gap-1.5 h-full">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Volume</span>
          <div className="h-[145px] flex justify-center items-center relative w-10">
            {/* Fader Slot */}
            <div className="absolute top-0 bottom-0 w-1.5 bg-[var(--cordel-border)] rounded-none border-x border-[var(--cordel-bg)] pointer-events-none"></div>
            <AudioFader
              type="range"
              min="0"
              max="100"
              orient="vertical"
              audioTarget="trackVolume"
              trackId={trackId}
              value={track.volumeVal}
              onChange={(val) => onVolumeChange(val)}
              className="vertical-fader touch-none z-10 h-[130px] w-6 cursor-pointer"
            />
          </div>
          <span className="text-[10px] font-bold text-[var(--cordel-text)] fader-val-label">{track.volumeVal}</span>
        </div>

        {/* Reverb Fader Column */}
        <div className="flex flex-col items-center gap-1.5 h-full">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Reverb</span>
          <div className="h-[145px] flex justify-center items-center relative w-8">
            {/* Fader Slot */}
            <div className="absolute top-0 bottom-0 w-1 bg-[var(--cordel-border)] rounded-none pointer-events-none"></div>
            <AudioFader
              type="range"
              min="0"
              max="100"
              orient="vertical"
              audioTarget="trackReverb"
              trackId={trackId}
              value={track.reverbVal || 0}
              onChange={(val) => onReverbChange(val)}
              className="vertical-fader touch-none z-10 h-[130px] w-4 cursor-pointer fader-reverb"
            />
          </div>
          <span className="text-[10px] font-bold text-[var(--cordel-text)] fader-val-label">{track.reverbVal || 0}</span>
        </div>

        {/* LED Meter */}
        <div className="flex flex-col items-center gap-1.5 h-full">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Meter</span>
          <VUMeter
            instrumentId={inst.id}
            isPlaying={isPlaying && isActive}
            isActive={isActive}
            orientation="vertical"
            className="w-2.5 h-[145px] bg-[var(--cordel-bg)] cordel-border-sm"
          />
          <div className="h-[15px]" />
        </div>
      </div>
    </div>
  );
};

export const MixerChannel = React.memo(MixerChannelComponent);
