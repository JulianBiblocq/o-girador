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
import { useAudioStore } from '../stores/useAudioStore';
import { getBusColor, getContrastColor } from '../utils/colorHelpers';
import { DragNumberBox } from './DragNumberBox';
import { HorizontalPanFader } from './HorizontalPanFader';
import { PanKnob } from './PanKnob';
import { getNextStepValue } from '../utils/instrumentStrokes';
import { CompactPatternRenderer } from './CompactPatternRenderer';
import { VisualOnlyTimeline } from './VisualOnlyTimeline';
import { MixerVolumeFader } from './MixerVolumeFader';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { VUMeter } from './VUMeter';
import { reverbSends, distortionSends, subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';
import { MixerKnob } from './MixerKnob';
import { MixerSlantedDivider } from './MixerSlantedDivider';
import { eqNodes } from '../audio/effectsChain';
import { XiloChisel } from './XiloIcons';

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
  busPosition?: 'first' | 'middle' | 'last' | 'none';
  isPlaying?: boolean;
  isLeftHanded?: boolean;
  isCompact?: boolean;
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
  busPosition = 'none',
  isCompact = false,
}) => {
  const sequencer = useSequencer();
  const audio = useAudio();
  const chorusDensity = useAudioStore(state => state.chorusDensity);
  const setChorusDensity = useAudioStore(state => state.setChorusDensity);



  const lang = useSequencerStore(state => state.lang);
  const isLeftHanded = useSequencerStore(state => state.isLeftHanded);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const hasSolo = useSequencerStore(state => state.tracks.some(t => t.isSolo));

  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const tracks = useSequencerStore(state => state.tracks);

  const currentInst = track ? instrumentsConfig[track.instrumentIdx] : null;
  const eligibleTracks = currentInst ? tracks.filter(t => {
    if (t.isBusFolder) return false;
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
  const displayName = track?.customName || (currentInst ? (isMaster ? `🔗 ${getPluralName(currentInst.name)}` : currentInst.name) : 'Instrument');

  const { isPlaying, maxTicksRef, soloPatternPlayIdRef } = audio;
  const maxTicks = maxTicksRef.current;

  const [instDropdownOpen, setInstDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [editingPatternId, setEditingPatternId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameVal, setNameVal] = useState<string>(track?.customName || '');
  useEffect(() => {
    if (track?.customName) {
      setNameVal(track.customName);
    }
  }, [track?.customName]);

  const [activePatternId, setActivePatternId] = useState<number | null>(track?.selectedPatternId);
  const activePatternIdRef = useRef<number | null>(track?.selectedPatternId ?? null);
  useEffect(() => {
    activePatternIdRef.current = activePatternId;
  }, [activePatternId]);

  const [heightCategory, setHeightCategory] = useState<'large' | 'medium' | 'tight' | 'short'>('large');
  const [openPanels, setOpenPanels] = useState({ eq: true, fx: true, pan: true, fader: true });

  useEffect(() => {
    const handleResize = () => {
      const h = window.innerHeight;
      let newCat: 'large' | 'medium' | 'tight' | 'short' = 'large';
      if (h < 680) newCat = 'short';
      else if (h < 760) newCat = 'tight';
      else if (h < 880) newCat = 'medium';
      
      setHeightCategory(prev => {
        if (prev !== newCat) {
          // Cross-boundary transitions: apply adaptive default panel configurations
          if (newCat === 'large') {
            setOpenPanels({ eq: true, fx: true, pan: true, fader: true });
          } else if (newCat === 'medium') {
            setOpenPanels({ eq: true, fx: true, pan: true, fader: true });
          } else if (newCat === 'tight') {
            setOpenPanels({ eq: true, fx: false, pan: false, fader: true });
          } else if (newCat === 'short') {
            setOpenPanels({ eq: false, fx: true, pan: true, fader: true });
          }
        }
        return newCat;
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const togglePanel = (panelName: keyof typeof openPanels) => {
    setOpenPanels(prev => {
      const nextVal = !prev[panelName];
      
      // If we are on large or medium screen, toggle independently
      if (heightCategory === 'large' || heightCategory === 'medium') {
        return { ...prev, [panelName]: nextVal };
      }
      
      // Mutual exclusion logic for tight or short screens
      if (nextVal) {
        if (panelName === 'eq') {
          // Opening EQ: close FX and PAN
          return { ...prev, eq: true, fx: false, pan: false };
        } else if (panelName === 'fx' || panelName === 'pan') {
          // Opening FX or PAN: close EQ
          return { ...prev, [panelName]: true, eq: false };
        }
      } else {
        // Closing a panel
        if (panelName === 'eq') {
          // Closing EQ: automatically reopen FX and PAN to fill vertical space!
          return { ...prev, eq: false, fx: true, pan: true };
        }
      }
      return { ...prev, [panelName]: nextVal };
    });
  };
  const lastMeasureRef = useRef<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const trackRef = useRef(track);
  useEffect(() => {
    trackRef.current = track;
  }, [track]);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!isActive) {
      if (lastMeasureRef.current !== -1) {
        lastMeasureRef.current = -1;
      }
      return;
    }

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number; time?: number }) => {
      const { step, measure } = detail;
      
      const currentTrack = trackRef.current;
      if (!currentTrack) return;

      if (step < 0) {
        if (lastMeasureRef.current !== -1) {
          lastMeasureRef.current = -1;
        }
        return;
      }
      if (measure !== lastMeasureRef.current) {
        lastMeasureRef.current = measure;
        
        if (isPlayingRef.current) {
          const soloPatternPlayId = soloPatternPlayIdRef?.current;
          const livePatternId = (() => {
            if (soloPatternPlayId !== undefined && soloPatternPlayId !== null) {
              const hasSoloPattern = currentTrack?.patterns?.some(p => p.id === soloPatternPlayId);
              if (hasSoloPattern) return soloPatternPlayId;
            }
            const assignedPattern = currentTrack?.patterns?.find(p => p?.measureAssignments?.[measure]);
            return assignedPattern ? assignedPattern.id : null;
          })();

          if (activePatternIdRef.current !== livePatternId) {
            setActivePatternId(livePatternId);
            if (livePatternId !== null) {
              setTimeout(() => {
                onSelectPattern(livePatternId);
              }, 0);
            }
          }
        }
      }
    };
    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isPlaying) {
      setActivePatternId(track?.selectedPatternId ?? null);
      lastMeasureRef.current = -1;
    }
  }, [isPlaying, track?.selectedPatternId]);

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

  const handleRenameSubmit = () => {
    if (nameVal.trim()) {
      useSequencerStore.getState().setTracks(prev => prev.map(t => t.id === trackId ? { ...t, customName: nameVal.trim() } : t));
    }
    setIsEditingName(false);
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
    useSequencerStore.getState().setTrackPan(trackId, val);
  };
  const onReverbChange = (val: number) => {
    useSequencerStore.getState().setTrackFxSend(trackId, 'reverb', val);
  };
  const onDistortionChange = (val: number) => {
    useSequencerStore.getState().setTrackFxSend(trackId, 'distortion', val);
  };
  const handleReverbAudioDrag = React.useCallback((val: number) => {
    const sendNode = reverbSends[trackId];
    if (sendNode) {
      const gain = Math.max(0.00001, val / 100);
      const targetDb = val === 0 ? -Infinity : (40 * Math.log10(gain));
      try {
        sendNode.gain.value = targetDb;
      } catch (_) {}
    }
  }, [trackId]);
  const handleDistortionAudioDrag = React.useCallback((val: number) => {
    const sendNode = distortionSends[trackId];
    if (sendNode) {
      const gain = Math.max(0.00001, val / 100);
      const targetDb = val === 0 ? -Infinity : (40 * Math.log10(gain));
      try {
        sendNode.gain.value = targetDb;
      } catch (_) {}
    }
  }, [trackId]);
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
          name: lang === 'fr' ? `Motif ${(t.patterns?.length ?? 0) + 1}` : `Padrão ${(t.patterns?.length ?? 0) + 1}`,
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

  const liveActivePatternId = activePatternId;

  const activePattern = track?.patterns?.find(p => p.id === liveActivePatternId) || track?.patterns?.[0];

  // Guard activePattern: only guard for regular tracks (non-bus, non-linked)
  const isBusFolder = !!(track?.isBusFolder);
  const isLinked = !!(track?.linkedToTrackId);
  const needsPatterns = !isBusFolder && !isLinked;
  
  if (needsPatterns && !activePattern) return null;

  const currentStep = -1;

  // Calcul du style de groupe
  const groupStyle: React.CSSProperties = {
    marginRight: (busPosition === 'none' || busPosition === 'last') ? '16px' : '0px'
  };
  if (busPosition !== 'none' && (track.busId || track.isLinkFolder)) {
    const targetBusId = track.busId || String(track.id);
    const busColor = getBusColor(targetBusId, tracks, instrumentsConfig);
    const cleanHex = busColor.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 139;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 42;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 26;
    // Plus de contraste : le maître de liaison a 0.14, les enfants de bus ont 0.02
    const bgAlpha = `rgba(${r}, ${g}, ${b}, ${track.isLinkFolder ? 0.14 : 0.02})`;

    groupStyle.backgroundColor = bgAlpha;
    groupStyle.borderTop = `3px solid ${busColor}`;
    groupStyle.borderBottom = `3px solid ${busColor}`;

    if (busPosition === 'first') {
      groupStyle.borderLeft = `3px solid ${busColor}`;
      groupStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
    } else if (busPosition === 'middle') {
      groupStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
      groupStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
    } else if (busPosition === 'last') {
      groupStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
      groupStyle.borderRight = `3px solid ${busColor}`;
    }
  } else if (track.isLinkFolder && busPosition === 'none') {
    const targetBusId = String(track.id);
    const busColor = getBusColor(targetBusId, tracks, instrumentsConfig);
    const cleanHex = busColor.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 139;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 42;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 26;
    const bgAlpha = `rgba(${r}, ${g}, ${b}, 0.12)`;

    groupStyle.backgroundColor = bgAlpha;
    groupStyle.borderTop = `3px double ${busColor}`;
    groupStyle.borderBottom = `3px double ${busColor}`;
    groupStyle.borderLeft = `3px double ${busColor}`;
    groupStyle.borderRight = `3px double ${busColor}`;
  }

  const faderColor = track.isLinkFolder 
    ? getBusColor(String(track.id), tracks, instrumentsConfig) 
    : (inst.color || '#8b2a1a');

  const faderTextColor = getContrastColor(faderColor);

  if (isCompact) {
    const hasOuterBorder = busPosition === 'none';
    const hasGroupBorder = busPosition !== 'none' && (track.isLinkFolder || track.busId);
    const borderThicknessTop = (hasOuterBorder || hasGroupBorder) ? 3 : 0;
    const borderThicknessBottom = (hasOuterBorder || hasGroupBorder) ? 3 : 0;
    const paddingTop = 3 - borderThicknessTop;
    const paddingBottom = 3 - borderThicknessBottom;

    return (
      <div 
        ref={setNodeRef}
        className={`flex flex-col bg-[var(--cordel-bg)] w-[115px] h-full justify-between shrink-0 text-[var(--cordel-text)] overflow-hidden relative transition-all duration-300 ${
          hasSolo ? (track.isSolo ? 'bg-[var(--cordel-border)]/5 shadow-[0_0_15px_rgba(0,0,0,0.15)] z-25' : 'opacity-50') : 
          (track.isMute ? 'opacity-60 bg-black/5 dark:bg-white/5' : 'opacity-100')
        } ${busPosition === 'none' ? 'cordel-border' : ''}`}
        style={{
          ...style,
          ...groupStyle,
          paddingTop: `${paddingTop}px`,
          paddingBottom: `${12 + paddingBottom}px`,
          zIndex: instDropdownOpen ? 30 : 1,
          '--fader-thumb-bg': faderColor,
          '--fader-thumb-border': 'var(--cordel-border)',
        } as React.CSSProperties}
      >
        {/* Niveau 6 (Tout en haut) : En-tête */}
        <div 
          className="relative p-1.5 pb-1 flex flex-col gap-1 border-b-[3px] border-[var(--cordel-border)] h-[76px] shrink-0 justify-between w-full"
          style={{ zIndex: instDropdownOpen ? 40 : 10 }}
        >
          {/* Outils */}
          <div className="flex justify-between items-center w-full">
            <div 
              {...attributes}
              {...listeners}
              className="flex items-center justify-center p-1 cursor-grab active:cursor-grabbing text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)] transition-colors touch-none"
              title="Drag to reorder"
            >
              <GripHorizontal size={14} />
            </div>
            <button
              onClick={() => onOpenDetailEditor(trackId)}
              className="w-5 h-5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors text-[9px]"
              title={track?.isLinkFolder ? (lang === 'fr' ? 'Éditer les patterns du groupe' : 'Editar padrões do groupe') : 'Éditeur détaillé'}
            >
              <XiloChisel size={9} />
            </button>
            <button 
              onClick={onDelete} 
              className="w-5 h-5 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[#f4ecd8] text-[9px]"
              title={track?.isLinkFolder ? (lang === 'fr' ? 'Supprimer le groupe' : 'Excluir o grupo') : 'Supprimer la piste'}
            >
              ✕
            </button>
          </div>

          {/* Instrument Selector / Dropdown Trigger */}
          <div className="relative flex items-center w-full" ref={dropdownRef}>
            {track?.isLinkFolder ? (
              isEditingName ? (
                <input
                  type="text"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  className="font-cactus font-bold text-[9px] bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm px-1 py-0.5 flex-1 outline-none w-full"
                  autoFocus
                />
              ) : (
                <div 
                  onClick={() => useSequencerStore.getState().handleToggleFoldBus(String(trackId))}
                  className="flex items-center gap-1 bg-[var(--cordel-text)] text-[var(--cordel-bg)] cordel-border-sm px-1 py-1 cursor-pointer hover:bg-[var(--cordel-bg)] hover:text-[var(--cordel-text)] transition-colors w-full justify-center font-bold text-[9px]"
                >
                  <span className="font-cactus truncate">{track.isFolded ? '▼' : '▶'} {track.customName || 'Bus'}</span>
                </div>
              )
            ) : (
              <div 
                onClick={() => setInstDropdownOpen(!instDropdownOpen)} 
                className="flex items-center gap-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button px-1 py-1 cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors w-full justify-center"
                title={linkedSlavesTooltip || displayName}
              >
                <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-4 h-4 object-contain flex-shrink-0" />
                <span className="font-cactus font-bold text-[9px] truncate">{displayName}</span>
              </div>
            )}

            {instDropdownOpen && (
              <div className="absolute top-7 left-0 right-0 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-shadow max-h-[250px] overflow-y-auto z-[99] w-[180px] custom-scrollbar">
                <div className="text-[9px] uppercase opacity-60 font-bold px-2 py-1 bg-[var(--cordel-text)]/5 border-b border-[var(--cordel-border)]/20">
                  {lang === 'fr' ? 'Changer d\'instrument' : 'Mudar instrumento'}
                </div>
                {instrumentsConfig.map((opt, oIdx) => (
                  <div 
                    key={oIdx} 
                    onClick={() => { onInstrumentChange(oIdx); setInstDropdownOpen(false); }} 
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-[10px] font-bold"
                  >
                    <img src={`${ASSETS_BASE_URL}${opt.iconImg}`} alt={opt.name} className="w-4 h-4 object-contain" />
                    <span className="font-cactus">{opt.name}</span>
                  </div>
                ))}
                
                {/* Liaison de partition */}
                <div className="text-[9px] uppercase opacity-60 font-bold px-2 py-1 bg-[var(--cordel-text)]/5 border-t border-b border-[var(--cordel-border)]/20 mt-1">
                  🔗 {lang === 'fr' ? 'Liaison' : 'Vínculo'}
                </div>
                {track.linkedToTrackId ? (
                  <div 
                    onClick={() => {
                      useSequencerStore.getState().handleLinkTrack(trackId, null);
                      setInstDropdownOpen(false);
                    }}
                    className="px-2 py-1.5 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-[10px] font-bold text-[#8b2a1a]"
                  >
                    ✕ {lang === 'fr' ? 'Délier' : 'Remover'}
                  </div>
                ) : (
                  <>
                    <div 
                      onClick={() => {
                        const isAlfaia = currentInst?.name.toLowerCase().includes('alfaia');
                        const defaultName = isAlfaia ? 'ALFAIAS' : `${currentInst?.name.toUpperCase()}S`;
                        const name = prompt(lang === 'fr' ? 'Nom du groupe :' : 'Nome do grupo:', defaultName);
                        if (name) {
                          useSequencerStore.getState().handleCreateLinkGroup(trackId, name);
                        }
                        setInstDropdownOpen(false);
                      }}
                      className="px-2 py-1.5 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-[10px] font-bold text-blue-600"
                    >
                      🔗 {lang === 'fr' ? 'Créer maître' : 'Criar mestre'}
                    </div>
                    {eligibleTracks.length > 0 ? (
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
                            className="px-2 py-1.5 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-[10px] font-bold truncate"
                          >
                            🔗 {shortName} ({tOptIndex + 1})
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-2 py-1 text-[8px] italic text-[var(--cordel-text)]/60">
                        {lang === 'fr' ? 'Aucun compatible' : 'Nenhum compatível'}
                      </div>
                    )}
                  </>
                )}

                {/* Audio Bussing */}
                <div className="text-[9px] uppercase opacity-60 font-bold px-2 py-1 bg-[var(--cordel-text)]/5 border-t border-b border-[var(--cordel-border)]/20 mt-1 flex items-center gap-1">
                  <span>{lang === 'fr' ? 'Bus' : 'Bus'}</span>
                </div>
                <div
                  onClick={() => {
                    const busName = window.prompt(lang === 'fr' ? 'Nom du groupe :' : 'Nome do groupe:', 'Alfaias');
                    if (busName && busName.trim()) {
                      useSequencerStore.getState().handleCreateBus(trackId, busName.trim());
                    }
                    setInstDropdownOpen(false);
                  }}
                  className="px-2 py-1.5 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-[10px] font-bold text-green-700 flex items-center gap-1"
                >
                  <span>{lang === 'fr' ? 'Créer un groupe' : 'Criar um groupe'}</span>
                </div>
                {track.busId && (
                  <div
                    onClick={() => {
                      useSequencerStore.getState().handleAssignToBus(trackId, null);
                      setInstDropdownOpen(false);
                    }}
                    className="px-2 py-1.5 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-[10px] font-bold text-[#8b2a1a]"
                  >
                    ✕ {lang === 'fr' ? 'Quitter le groupe' : 'Sair do groupe'}
                  </div>
                )}
                {tracks.filter(t => t.isBusFolder && t.id !== trackId).map((bus) => {
                  const busIdx = tracks.findIndex(t => t.id === bus.id);
                  return (
                    <div
                      key={bus.id}
                      onClick={() => {
                        useSequencerStore.getState().handleAssignToBus(trackId, String(bus.id));
                        setInstDropdownOpen(false);
                      }}
                      className={`px-2 py-1.5 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-[10px] font-bold truncate ${
                        String(track.busId) === String(bus.id) ? 'bg-[var(--cordel-text)]/10' : ''
                      }`}
                    >
                      <span>{bus.customName || 'Bus'} ({busIdx + 1})</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Inner Controls Stack (Responsive / Elastic Vertical Layout) */}
        <div className="flex-1 flex flex-col p-1.5 gap-1.5 justify-start items-center w-full min-h-0 overflow-hidden">
          
          {/* Section EQ */}
          {heightCategory !== 'large' && !openPanels.eq ? (
            <button 
              onClick={() => togglePanel('eq')}
              className="w-full flex items-center justify-between px-1 py-1 bg-[var(--cordel-border)]/10 hover:bg-[var(--cordel-border)]/20 border-y border-[var(--cordel-border)]/30 transition-colors cursor-pointer shrink-0"
            >
              <span className="text-[10px] font-bold tracking-wider text-[var(--cordel-text)]">EQ</span>
              <span className="text-[9px] text-[var(--cordel-text)]/40 font-bold">▶</span>
            </button>
          ) : (
            <div className="w-full flex flex-col shrink-0">
              {(() => {
                if (!track) return null;
                const lowCut = track.lowCut ?? false;
                const eq = track.eqBands ?? {
                  low: { f: 100, g: 0 },
                  mid: { f: 1000, g: 0, q: 'wide' },
                  high: { f: 8000, g: 0 }
                };

                const isEQModified = eq.low.g !== 0 || eq.low.f !== 100 ||
                                    eq.mid.g !== 0 || eq.mid.f !== 1000 ||
                                    eq.high.g !== 0 || eq.high.f !== 8000;

                const handleLowCutToggle = () => {
                  useSequencerStore.getState().handleTrackLowCutToggle(trackId);
                };

                const handleEQChange = (bands: Partial<typeof eq>) => {
                  useSequencerStore.getState().handleTrackEQChange(trackId, bands);
                };

                const handleEQReset = () => {
                  if (isEQModified) {
                    useSequencerStore.getState().handleTrackEQReset(trackId);
                  }
                };

                // Real-time audio update handlers (Zero Render Thrashing)
                const handleHFAudioDrag = (val: number) => {
                  const node = eqNodes[trackId];
                  if (node) {
                    try { node.high.frequency.value = val; } catch (_) {}
                  }
                };
                const handleHGAudioDrag = (val: number) => {
                  const node = eqNodes[trackId];
                  if (node) {
                    try { node.high.gain.value = val; } catch (_) {}
                  }
                };
                const handleMFAudioDrag = (val: number) => {
                  const node = eqNodes[trackId];
                  if (node) {
                    try { node.mid.frequency.value = val; } catch (_) {}
                  }
                };
                const handleMGAudioDrag = (val: number) => {
                  const node = eqNodes[trackId];
                  if (node) {
                    try { node.mid.gain.value = val; } catch (_) {}
                  }
                };
                const handleLFAudioDrag = (val: number) => {
                  const node = eqNodes[trackId];
                  if (node) {
                    try { node.low.frequency.value = val; } catch (_) {}
                  }
                };
                const handleLGAudioDrag = (val: number) => {
                  const node = eqNodes[trackId];
                  if (node) {
                    try { node.low.gain.value = val; } catch (_) {}
                  }
                };

                return (
                  <div className="w-full flex flex-col gap-1 shrink px-0.5">
                    {/* Reset button row */}
                    <div className="flex justify-end w-full">
                      <button
                        onClick={handleEQReset}
                        className={`w-5 h-5 flex items-center justify-center cordel-border-sm transition-colors rounded-sm ${
                          isEQModified 
                            ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a] hover:opacity-90' 
                            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]/30 border-[var(--cordel-border)]/20 cursor-default opacity-55'
                        }`}
                        title="Reset EQ"
                        disabled={!isEQModified}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.73-.73" />
                        </svg>
                      </button>
                    </div>

                    {/* HF / HG in diagonal */}
                    <div className="flex justify-between w-full items-start">
                      <MixerKnob 
                        label="HF" 
                        min={4000} 
                        max={16000} 
                        step={100} 
                        value={eq.high.f} 
                        unit="Hz" 
                        size={30}
                        color="#3d8b85"
                        onChange={(v) => handleEQChange({ high: { f: v, g: eq.high.g } })} 
                        onAudioDrag={handleHFAudioDrag}
                      />
                      <div className="pt-2">
                        <MixerKnob 
                          label="HG" 
                          min={-15} 
                          max={15} 
                          step={1} 
                          value={eq.high.g} 
                          unit="dB" 
                          size={30}
                          isGain={true}
                          onChange={(v) => handleEQChange({ high: { f: eq.high.f, g: v } })} 
                          onAudioDrag={handleHGAudioDrag}
                        />
                      </div>
                    </div>

                    <MixerSlantedDivider />

                    {/* MF / MG in diagonal, Q button under MF */}
                    <div className="flex justify-between w-full items-start">
                      <div className="flex flex-col items-center gap-1.5">
                        <MixerKnob 
                          label="MF" 
                          min={250} 
                          max={4000} 
                          step={50} 
                          value={eq.mid.f} 
                          unit="Hz" 
                          size={30}
                          color="#d4af37"
                          onChange={(v) => handleEQChange({ mid: { f: v, g: eq.mid.g, q: eq.mid.q } })} 
                          onAudioDrag={handleMFAudioDrag}
                        />
                        <div className="flex flex-col items-center">
                          <button 
                            onClick={() => handleEQChange({ mid: { ...eq.mid, q: eq.mid.q === 'narrow' ? 'wide' : 'narrow' } })}
                            className={`w-6 h-3.5 text-[7px] font-black cordel-border-sm flex items-center justify-center transition-colors rounded-sm ${
                              eq.mid.q === 'narrow' ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
                            }`}
                          >
                            {eq.mid.q === 'narrow' ? 'N' : 'W'}
                          </button>
                          <span className="text-[5.5px] font-black opacity-40 uppercase tracking-wide mt-0.5">Q</span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <MixerKnob 
                          label="MG" 
                          min={-15} 
                          max={15} 
                          step={1} 
                          value={eq.mid.g} 
                          unit="dB" 
                          size={30}
                          isGain={true}
                          onChange={(v) => handleEQChange({ mid: { f: eq.mid.f, g: v, q: eq.mid.q } })} 
                          onAudioDrag={handleMGAudioDrag}
                        />
                      </div>
                    </div>

                    <MixerSlantedDivider />

                    {/* LF / LG in diagonal */}
                    <div className="flex justify-between w-full items-start">
                      <MixerKnob 
                        label="LF" 
                        min={50} 
                        max={250} 
                        step={5} 
                        value={eq.low.f} 
                        unit="Hz" 
                        size={30}
                        color="#8b2a1a"
                        onChange={(v) => handleEQChange({ low: { f: v, g: eq.low.g } })} 
                        onAudioDrag={handleLFAudioDrag}
                      />
                      <div className="pt-2">
                        <MixerKnob 
                          label="LG" 
                          min={-15} 
                          max={15} 
                          step={1} 
                          value={eq.low.g} 
                          unit="dB" 
                          size={30}
                          isGain={true}
                          onChange={(v) => handleEQChange({ low: { f: eq.low.f, g: v } })} 
                          onAudioDrag={handleLGAudioDrag}
                        />
                      </div>
                    </div>

                    <MixerSlantedDivider />

                    {/* Low-Cut Button Row */}
                    <div className="flex justify-between w-full items-center">
                      <button 
                        onClick={handleLowCutToggle}
                        className={`w-6 h-6 cordel-border-sm flex items-center justify-center p-0.5 transition-colors rounded-sm ${
                          lowCut ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
                        }`}
                        title="Low Cut 80Hz"
                      >
                        <svg width="16" height="12" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-95 pointer-events-none">
                          <path d="M 2 14 L 10 3 L 22 3" />
                        </svg>
                      </button>
                      <span className="text-[6.5px] font-black opacity-35 uppercase tracking-widest pr-2 select-none">80Hz</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Section FX */}
          {heightCategory !== 'large' && !openPanels.fx ? (
            <button 
              onClick={() => togglePanel('fx')}
              className="w-full flex items-center justify-between px-1 py-1 bg-[var(--cordel-border)]/10 hover:bg-[var(--cordel-border)]/20 border-y border-[var(--cordel-border)]/30 transition-colors cursor-pointer shrink-0"
            >
              <span className="text-[10px] font-bold tracking-wider text-[var(--cordel-text)]">
                FX <span className="text-[8px] font-normal opacity-60 ml-1">D:{track.fxSends?.distortion ?? 0}% R:{track.fxSends?.reverb ?? track.reverbVal ?? 0}%</span>
              </span>
              <span className="text-[9px] text-[var(--cordel-text)]/40 font-bold">▶</span>
            </button>
          ) : (
            <div className="w-full flex flex-col gap-1.5 px-0.5 shrink-0">
              <DragNumberBox 
                label="Dst" 
                value={track.fxSends?.distortion ?? 0} 
                onChange={onDistortionChange}
                onAudioDrag={handleDistortionAudioDrag}
                className="w-full text-[8px] px-1 py-0.5 shrink"
              />
              <DragNumberBox 
                label="Rev" 
                value={track.fxSends?.reverb ?? track.reverbVal ?? 0} 
                onChange={onReverbChange}
                onAudioDrag={handleReverbAudioDrag}
                className="w-full text-[8px] px-1 py-0.5 shrink"
              />
            </div>
          )}

          {/* Section PAN */}
          {heightCategory !== 'large' && !openPanels.pan ? (
            <button 
              onClick={() => togglePanel('pan')}
              className="w-full flex items-center justify-between px-1 py-1 bg-[var(--cordel-border)]/10 hover:bg-[var(--cordel-border)]/20 border-y border-[var(--cordel-border)]/30 transition-colors cursor-pointer shrink-0"
            >
              <span className="text-[10px] font-bold tracking-wider text-[var(--cordel-text)]">
                PAN <span className="text-[8px] font-normal opacity-60 ml-1">({(() => {
                  const panVal = track.pan ?? track.panVal ?? 0;
                  return panVal === 0 ? 'C' : (panVal < 0 ? `L${Math.abs(panVal)}` : `R${panVal}`);
                })()})</span>
              </span>
              <span className="text-[9px] text-[var(--cordel-text)]/40 font-bold">▶</span>
            </button>
          ) : (
            <div className="w-full flex flex-col items-center shrink-0">
              {/* Optional divider line if previous section is open */}
              {(heightCategory === 'large' || openPanels.fx) && (
                <div className="w-full border-t border-[var(--cordel-border)]/20 my-0.5 shrink-0" />
              )}
              <div className="flex justify-center w-full">
                <PanKnob 
                  trackId={trackId}
                  value={track.pan ?? track.panVal ?? 0} 
                  onChange={onPanChange}
                  label="PAN"
                  showLabels={false}
                />
              </div>
            </div>
          )}

          {/* Section VOL */}
          {heightCategory !== 'large' && !openPanels.fader ? (
            <button 
              onClick={() => togglePanel('fader')}
              className="w-full flex items-center justify-between px-1 py-1 bg-[var(--cordel-border)]/10 hover:bg-[var(--cordel-border)]/20 border-y border-[var(--cordel-border)]/30 transition-colors cursor-pointer shrink-0"
            >
              <span className="text-[10px] font-bold tracking-wider text-[var(--cordel-text)]">
                VOL <span className="text-[8px] font-normal opacity-60 ml-1">{Math.round(track.volumeVal)}dB</span>
              </span>
              <span className="text-[9px] text-[var(--cordel-text)]/40 font-bold">▶</span>
            </button>
          ) : (
            <div className="w-full flex flex-col flex-grow min-h-[60px] overflow-hidden">
              <div className="flex-grow flex-1 min-h-[60px] h-auto flex justify-center gap-2 items-stretch w-full py-1.5 overflow-hidden">
                <div className="flex flex-col items-center flex-1 h-full min-w-0">
                  <MixerVolumeFader
                    trackId={trackId}
                    value={track.volumeVal}
                    onChange={onVolumeChange}
                    faderColor={faderColor}
                    textColor={faderTextColor}
                  />
                </div>
                <div className="flex flex-col items-center w-5 h-full justify-center">
                  <VUMeter
                    trackId={trackId}
                    instrumentId={inst.id}
                    isPlaying={isPlaying && isActive}
                    isActive={isActive}
                    orientation="vertical"
                    className="w-2 h-full bg-[var(--cordel-bg)] cordel-border-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Niveau 1 (Tout en bas) : Mute & Solo - fixed size */}
          <div className="flex gap-1.5 w-full justify-center shrink-0 border-t border-[var(--cordel-border)]/20 pt-1.5">
            <button 
              onClick={(e) => { e.stopPropagation(); onMuteToggle(); }} 
              className={`flex-1 h-7 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${
                (track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
              }`}
              title="Mute"
            >
              M
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onSoloToggle(); }} 
              className={`flex-1 h-7 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${
                track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
              }`}
              title="Solo"
            >
              S
            </button>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col bg-[var(--cordel-bg)] w-[210px] shrink-0 text-[var(--cordel-text)] overflow-hidden relative pb-4 transition-all duration-300 ${
        hasSolo ? (track.isSolo ? 'bg-[var(--cordel-border)]/5 shadow-[0_0_15px_rgba(0,0,0,0.15)] z-25' : 'opacity-50') : 
        (track.isMute ? 'opacity-60 bg-black/5 dark:bg-white/5' : 'opacity-100')
      } ${busPosition === 'none' ? 'cordel-border' : ''}`}
      style={{
        ...style,
        ...groupStyle,
        zIndex: instDropdownOpen ? 30 : 1,
        '--fader-thumb-bg': faderColor,
        '--fader-thumb-border': 'var(--cordel-border)',
      } as React.CSSProperties}
    >
      <div 
        className="relative p-2 pb-1.5 flex flex-col gap-1.5 border-b-[3px] border-[var(--cordel-border)] h-[82px] shrink-0 flex flex-col justify-between"
        style={{ zIndex: instDropdownOpen ? 40 : 10 }}
      >
        {/* Ligne 1 : Outils */}
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-1.5">
            <div 
              {...attributes}
              {...listeners}
              className="flex items-center justify-center p-1 cursor-grab active:cursor-grabbing text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)] transition-colors touch-none"
              title="Drag to reorder"
            >
              <GripHorizontal size={18} />
            </div>
            <button
              onClick={() => onOpenDetailEditor(trackId)}
              className="w-7 h-7 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors text-xs"
              title={track?.isLinkFolder ? (lang === 'fr' ? 'Éditer les patterns du groupe' : 'Editar padrões do grupo') : 'Éditeur détaillé'}
            >
              <XiloChisel size={11} />
            </button>
          </div>
          <button 
            onClick={onDelete} 
            className="w-7 h-7 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[#f4ecd8] text-xs"
            title={track?.isLinkFolder ? (lang === 'fr' ? 'Supprimer le groupe' : 'Excluir o grupo') : 'Supprimer la piste'}
          >
            ✕
          </button>
        </div>

        {/* Ligne 2 : Sélection de l'instrument ou renommage de bus de liaison */}
        <div className="relative flex items-center w-full" ref={dropdownRef}>
          {track?.isLinkFolder ? (
            isEditingName ? (
              <input
                type="text"
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="font-cactus font-bold text-xs bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm px-2 py-1 flex-1 outline-none w-full"
                autoFocus
              />
            ) : (
              <div 
                onClick={() => useSequencerStore.getState().handleToggleFoldBus(String(trackId))}
                className="flex items-center gap-2 bg-[var(--cordel-text)] text-[var(--cordel-bg)] cordel-border-sm px-2 py-1.5 cursor-pointer hover:bg-[var(--cordel-bg)] hover:text-[var(--cordel-text)] transition-colors w-full justify-between font-bold"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] flex-shrink-0 font-sans font-bold select-none opacity-80">
                    {track.isFolded ? '▼' : '▶'}
                  </span>
                  <span className="font-cactus text-xs truncate">🔗 {index + 1}. {track.customName || 'Bus'}</span>
                </div>
              </div>
            )
          ) : (
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
          )}

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
                <>
                  <div 
                    onClick={() => {
                      const isAlfaia = currentInst?.name.toLowerCase().includes('alfaia');
                      const defaultName = isAlfaia ? 'ALFAIAS' : `${currentInst?.name.toUpperCase()}S`;
                      const name = prompt(lang === 'fr' ? 'Nom du groupe de partition liée :' : 'Nome do grupo de partitura vinculada:', defaultName);
                      if (name) {
                        useSequencerStore.getState().handleCreateLinkGroup(trackId, name);
                      }
                      setInstDropdownOpen(false);
                    }}
                    className="px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-xs font-bold text-blue-600 dark:text-blue-400"
                  >
                    🔗 {lang === 'fr' ? 'Créer groupe (Maître)' : 'Criar grupo (Mestre)'}
                  </div>
                  {eligibleTracks.length > 0 ? (
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
                  )}
                </>
              )}

              {/* Section Audio Bussing */}
              <div className="text-[10px] uppercase opacity-60 font-bold px-3 py-1 bg-[var(--cordel-text)]/5 border-t border-b border-[var(--cordel-border)]/20 mt-1 flex items-center gap-1.5">
                <img 
                  src={`${ASSETS_BASE_URL}icones/bus.svg`} 
                  alt="" 
                  className="w-3.5 h-3.5 object-contain filter invert-[var(--cordel-invert)] dark:invert-0 shrink-0" 
                />
                <span>{lang === 'fr' ? 'Bus / Groupes' : 'Bus / Grupos'}</span>
              </div>

              {/* Option 1: Créer un groupe avec cet instrument */}
              <div
                onClick={() => {
                  const busName = window.prompt(lang === 'fr' ? 'Nom du groupe :' : 'Nome do grupo:', 'Alfaias');
                  if (busName && busName.trim()) {
                    useSequencerStore.getState().handleCreateBus(trackId, busName.trim());
                  }
                  setInstDropdownOpen(false);
                }}
                className="px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1.5"
              >
                <img 
                  src={`${ASSETS_BASE_URL}icones/bus.svg`} 
                  alt="" 
                  className="w-3.5 h-3.5 object-contain filter invert-[var(--cordel-invert)] dark:invert-0 shrink-0" 
                />
                <span>{lang === 'fr' ? 'Créer un groupe avec cet instrument' : 'Criar um grupo com este instrumento'}</span>
              </div>

              {/* Option 2: Quitter le Bus s'il y est affecté */}
              {track.busId && (
                <div
                  onClick={() => {
                    useSequencerStore.getState().handleAssignToBus(trackId, null);
                    setInstDropdownOpen(false);
                  }}
                  className="px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-xs font-bold text-[#8b2a1a]"
                >
                  ✕ {lang === 'fr' ? 'Quitter le Bus/Groupe' : 'Sair do Bus/Grupo'}
                </div>
              )}

              {/* Option 3: Liste des Bus existants à rejoindre */}
              {tracks.filter(t => t.isBusFolder && t.id !== trackId).map((bus) => {
                const busIdx = tracks.findIndex(t => t.id === bus.id);
                return (
                  <div
                    key={bus.id}
                    onClick={() => {
                      useSequencerStore.getState().handleAssignToBus(trackId, String(bus.id));
                      setInstDropdownOpen(false);
                    }}
                    className={`px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-xs font-bold truncate flex items-center gap-1.5 ${
                      String(track.busId) === String(bus.id) ? 'bg-[var(--cordel-text)]/10' : ''
                    }`}
                  >
                    <img 
                      src={`${ASSETS_BASE_URL}icones/bus.svg`} 
                      alt="" 
                      className="w-3.5 h-3.5 object-contain filter invert-[var(--cordel-invert)] dark:invert-0 shrink-0" 
                    />
                    <span className="truncate">{bus.customName || 'Bus'} ({busIdx + 1})</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Editor Section */}
      {activePattern && (
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
            <button onClick={onAddPattern} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] px-2 py-0.5 cordel-border-sm cordel-button text-[10px] font-bold hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]">
              {lang === 'fr' ? '+ Motif' : '+ Padrão'}
            </button>
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
                              <XiloChisel size={10} />
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
      )}

      {/* Visual Only Timeline (Fixed above faders, no longer scrollable) */}
      {activePattern && (
        <div className="h-[48px] px-4 py-2 bg-[var(--cordel-bg)] border-b-[3px] border-[var(--cordel-border)] z-10 shrink-0 flex items-center justify-center">
        <VisualOnlyTimeline
          trackId={trackId}
          steps={activePattern.steps}
          activeSteps={liveActivePatternId === null ? Array(activePattern.steps).fill(0) : (activePattern.activeSteps || [])}
          instrumentIdx={track.instrumentIdx}
          isPlaying={isPlaying && liveActivePatternId !== null}
          isLeftHanded={isLeftHanded}
        />
      </div>
      )}

      {/* Fader & Mute/Solo Section (Bottom) */}
      {/* Fader & Mute/Solo Section (Bottom) */}
      <div className="relative z-10 p-3 pt-2.5 pb-1 flex flex-col h-[200px] justify-between gap-1.5 w-full">
        {/* Ligne 1 (Panoramique) : HorizontalPanFader tout en haut */}
        <HorizontalPanFader 
          value={track.pan ?? track.panVal ?? 0} 
          onChange={onPanChange}
          className="w-full shrink-0 h-4"
          lang={lang}
        />

        {currentInst?.id === 'coro' && (
          <DragNumberBox 
            label="Coro" 
            value={Math.round(chorusDensity * 100)} 
            onChange={(val) => setChorusDensity(val / 100)}
            onAudioDrag={(val) => setChorusDensity(val / 100)}
            className="absolute left-3 bottom-[32px] w-[65px] !px-1 text-[8px]"
          />
        )}

        {/* Zone Inférieure (Mixage) : 3 colonnes horizontales regroupées au centre */}
        <div className="flex justify-center items-center w-full flex-grow gap-5 pt-1.5">
          {/* Colonne de gauche : Bouton Mute [M] au-dessus de Solo [S] */}
          {/* Colonne de gauche : Bouton Mute [M] au-dessus de Solo [S] */}
          <div className="flex flex-col gap-2 justify-center items-center w-7 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); onMuteToggle(); }} 
              className={`w-7 h-7 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${
                (track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
              }`}
            >M</button>
            <button 
              onClick={(e) => { e.stopPropagation(); onSoloToggle(); }} 
              className={`w-7 h-7 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${
                track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
              }`}
            >S</button>
          </div>

          {/* Colonne centrale : Fader vertical de volume (Ghost Input à haute performance) */}
          <div className="flex flex-col items-center w-10 h-[115px] shrink-0">
            <MixerVolumeFader
              trackId={trackId}
              value={track.volumeVal}
              onChange={onVolumeChange}
              faderColor={faderColor}
              textColor={faderTextColor}
              height={115}
            />
          </div>

          {/* Colonne de droite : VU-mètre vertical élargi, sans label Meter */}
          <div className="flex flex-col items-center w-7 shrink-0">
            <div className="h-[115px] flex justify-center items-center relative w-7">
              <VUMeter
                trackId={trackId}
                instrumentId={inst.id}
                isPlaying={isPlaying && isActive}
                isActive={isActive}
                orientation="vertical"
                className="w-3 h-[99px] bg-[var(--cordel-bg)] cordel-border-sm"
              />
            </div>
          </div>
        </div>

        {/* Ligne 3 (Effets) : Effet Coro si piste Coro, puis Réverb et Distorsion */}
        {/* Ligne 3 (Effets) : Deux DragNumberBox côte à côte tout en bas */}
        <div className="flex gap-2 w-full shrink-0">
          <DragNumberBox 
            label="Rev" 
            value={track.fxSends?.reverb ?? track.reverbVal ?? 0} 
            onChange={onReverbChange}
            onAudioDrag={handleReverbAudioDrag}
            className="flex-1"
          />
          <DragNumberBox 
            label="Dst" 
            value={track.fxSends?.distortion ?? 0} 
            onChange={onDistortionChange}
            onAudioDrag={handleDistortionAudioDrag}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};

export const MixerChannel = React.memo(MixerChannelComponent);
