/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSequencerStore } from '../stores/useSequencerStore';
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
import { i18n, instrumentsConfig, ASSETS_BASE_URL, isDarkText } from '../data';
import { useAuth } from '../contexts/AuthContext';
import { fetchCloudPatterns, savePatternToCloud, deleteCloudPattern } from '../cloudPatterns';
import { useGameData } from '../contexts/GameDataContext';
import { AudioFader } from './AudioFader';
import { useSequencer } from '../contexts/SequencerContext';
import { MelodicNoteSelector } from './MelodicNoteSelector';
import { VocalRecordingSection } from './instrument-editor/VocalRecordingSection';
import { PatternVariationsEditor } from './instrument-editor/PatternVariationsEditor';
import { InstrumentEffects } from './InstrumentEffects';
import { InstrumentPatternGrid } from './InstrumentPatternGrid';

const SortablePatternWrapper = ({ id, children, className, style: propStyle }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { ...propStyle, transform: CSS.Transform.toString(transform), transition };
  return children({ setNodeRef, style, attributes, listeners });
};

interface InstrumentDetailEditorProps {
  lang: Language;
  isLeftHanded?: boolean;
  trackId: number;
  onClose: () => void;
  onStepValueChange: (
    patternId: number,
    stepIdx: number | number[],
    val: string | string[],
    lyrics?: string[],
    notes?: string[]
  ) => void;
  onStepKeyDown: (patternId: number, stepIdx: number, key: string, currentVal: string, targetEl: HTMLInputElement) => void;
  onStepsChange: (patternId: number, steps: number) => void;
  onVoiceTypeToggle: (patternId: number, stepIdx: number) => void;
  onVoiceSylChange: (patternId: number, stepIdx: number, val: string) => void;
  onVoiceNoteChange: (patternId: number, stepIdx: number, val: string) => void;
  onVoiceNoteBlur: (patternId: number, stepIdx: number, val: string) => void;
  onAddPattern: () => void;
  onDeletePattern: (patternId: number) => void;
  onSelectPattern: (patternId: number) => void;
  onReorderPatternsDnd?: (oldIndex: number, newIndex: number) => void;
  onAddPatternVariation?: (patternId: number) => void;
  onUpdatePatternVariationProbability?: (patternId: number, variationId: string, probability: number) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  onTogglePatternVariationFirstTimeOnly?: (patternId: number, variationId: string, val: boolean) => void;
  onVariationStepValueChange?: (patternId: number, variationId: string, stepIdx: number | number[], val: string | string[]) => void;
  onDeletePatternVariation?: (patternId: number, variationId: string) => void;
  onPatternAssign: (patternId: number, measureIdx: number, val: boolean) => void;
  onVolumeChange: (val: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onStepVolumeChange: (patternId: number, stepIdx: number | number[], val: number) => void;
  onStepDecayChange: (patternId: number, stepIdx: number | number[], val: number) => void;
  onStepMicrotimingChange: (patternId: number, stepIdx: number | number[], val: number) => void;
  onVariationStepVolumeChange?: (patternId: number, variationId: string, stepIdx: number | number[], val: number) => void;
  onVariationStepDecayChange?: (patternId: number, variationId: string, stepIdx: number | number[], val: number) => void;
  onVariationStepMicrotimingChange?: (patternId: number, variationId: string, stepIdx: number | number[], val: number) => void;
  globalSwing: GlobalSwing;
  isPlaying: boolean;
  currentStepIndex: number;
  currentMeasure: number;
  maxTicks: number;
  totalMeasures: number;
  isMobile: boolean;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  onCopyPattern?: (pattern: any) => void;
  onPastePattern?: (patternId: number) => void;
  onLoadLibraryPattern?: (targetPatternId: number, libraryPattern: any) => void;
  canPaste?: boolean;
  isRecordingVocal?: boolean;
  recordingVocalPatternId?: number | null;
  recordedPatternIds?: number[];
  onStartVocalRecording?: (patternId: number) => void;
  onStopVocalRecording?: () => void;
  onVocalModeChange?: (patternId: number, mode: 'synth' | 'micro') => void;
  onDeleteVocalRecording?: (patternId: number) => void;
  onVocalLatencyChange?: (patternId: number, latencyMs: number) => void;
  audioDevices?: MediaDeviceInfo[];
  selectedAudioDeviceId?: string;
  onAudioDeviceChange?: (deviceId: string) => void;
  onImportVocalFile?: (patternId: number, file: File) => void;
  isVocalGuideEnabled?: boolean;
  onVocalGuideToggle?: (enabled: boolean) => void;
  onVocalBpmSyncToggle?: (patternId: number, sync: boolean) => void;
  onPatternNameChange?: (patternId: number, name: string) => void;
  soloPatternPlayId?: number | null;
  soloPatternVariationId?: string | null;
  onPlaySoloPattern?: (patternId: number, variationId?: string) => void;
  onStopSoloPattern?: () => void;
  runAutoCalibration?: () => Promise<number>;
  vocalCalibrationLatencyMs?: number;
}

const InstrumentDetailEditorComponent: React.FC<InstrumentDetailEditorProps> = ({
  lang,
  trackId,
  onClose,
  onStepsChange,
  onVoiceNoteChange,
  onVoiceNoteBlur,
  onAddPattern,
  onDeletePattern,
  onSelectPattern,
  onReorderPatternsDnd,
  onAddPatternVariation,
  onUpdatePatternVariationProbability,
  onTogglePatternVariationFirstTimeOnly,
  onVariationStepValueChange,
  onDeletePatternVariation,
  onPatternAssign,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  isPlaying,
  currentMeasure,
  isMobile,
  onStepTouchStart,
  onCopyPattern,
  onPastePattern,
  onLoadLibraryPattern,
  canPaste,
  isRecordingVocal = false,
  recordingVocalPatternId = null,
  recordedPatternIds = [],
  onStartVocalRecording,
  onStopVocalRecording,
  onVocalModeChange,
  onDeleteVocalRecording,
  onVocalLatencyChange,
  audioDevices = [],
  selectedAudioDeviceId = '',
  onAudioDeviceChange,
  onImportVocalFile,
  isVocalGuideEnabled = true,
  onVocalGuideToggle,
  onVocalBpmSyncToggle,
  onPatternNameChange,
  isLeftHanded = false,
  soloPatternPlayId,
  soloPatternVariationId,
  onPlaySoloPattern,
  onStopSoloPattern,
  onNavigatePrev,
  onNavigateNext,
  runAutoCalibration,
}) => {
  const { alertAsync } = useGameData();
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const inst = track ? instrumentsConfig[track.instrumentIdx] : { id: '', name: '', type: 'percussion', iconImg: '', colors: { text: '' }, mixerBg: '' };
  
  if (!track) return null;

  const [editingPatternId, setEditingPatternId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [liveMeasure, setLiveMeasure] = useState<number>(currentMeasure);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [noteSelectorTarget, setNoteSelectorTarget] = useState<{ patternId: number; stepIdx: number; note: string; element: HTMLElement } | null>(null);

  const handleAutoCalibrate = async () => {
    if (!runAutoCalibration) return;
    setIsCalibrating(true);
    try {
      const latency = await runAutoCalibration();
      await alertAsync(
        lang === 'fr' 
          ? `✅ Calibration réussie ! Latence matérielle mesurée et compensée à ${latency} ms.` 
          : `✅ Calibração bem-sucedida! Latência de hardware medida e compensada em ${latency} ms.`
      );
    } catch (err: any) {
      await alertAsync(
        lang === 'fr'
          ? `❌ Échec de la calibration : ${err.message || err}`
          : `❌ Falha na calibração: ${err.message || err}`
      );
    } finally {
      setIsCalibrating(false);
    }
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
      if (stopSoloRef.current) {
        stopSoloRef.current();
      }
    };
  }, []);

  useEffect(() => {
    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { measure } = customEvent.detail;
        setLiveMeasure((prev) => (prev !== measure ? measure : prev));
      }
    };
    window.addEventListener('o-girador-tick', handleTick);
    return () => {
      window.removeEventListener('o-girador-tick', handleTick);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      setLiveMeasure(currentMeasure);
    }
  }, [isPlaying, currentMeasure]);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setMouseDownOnBackdrop(true);
    } else {
      setMouseDownOnBackdrop(false);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mouseDownOnBackdrop) {
      onClose();
    }
    setMouseDownOnBackdrop(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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

          {/* Volume slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase opacity-70">Vol</span>
            <AudioFader
              type="range"
              min="0"
              max="100"
              audioTarget="trackVolume"
              trackId={track.id}
              value={track.volumeVal}
              onChange={(val) => onVolumeChange(val)}
              className="w-24 h-2 bg-[#1a1a1a] border border-[#f4ecd8] rounded-none outline-none cursor-pointer accent-[#f4ecd8]"
            />
            <span className="text-[11px] font-bold w-7 text-right">{track.volumeVal}</span>
          </div>

          {/* Mute */}
          <button
            onClick={onMuteToggle}
            className={`w-8 h-8 cordel-border-sm cordel-button text-xs font-bold cursor-pointer transition-all flex items-center justify-center ${
              track.isMute
                ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >
            M
          </button>

          {/* Solo */}
          <button
            onClick={onSoloToggle}
            className={`w-8 h-8 cordel-border-sm cordel-button text-xs font-bold cursor-pointer transition-all flex items-center justify-center ${
              track.isSolo
                ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >
            S
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold text-sm flex items-center justify-center hover:bg-[#1a1a1a] cursor-pointer transition-colors ml-2"
          >
            ✕
          </button>
        </div>

        {/* ═══════════════════ BODY ═══════════════════ */}
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          
          {/* Main scrollable editor panel */}
          <div className="flex-1 md:overflow-y-auto p-3 md:p-5 flex flex-col gap-6" style={{ minWidth: 0, WebkitOverflowScrolling: 'touch' }}>
            <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
              <SortableContext items={patternIds} strategy={verticalListSortingStrategy}>
                {track.patterns.map((ptn, ptnIdx) => {
                  const isSelected = track.selectedPatternId === ptn.id;
                  const livePattern = track.patterns.find(p => p.measureAssignments[liveMeasure]) || track.patterns[0];
                  const isCurrentPlaying = isPlaying && ptn.id === livePattern.id;

                  return (
                    <SortablePatternWrapper key={ptn.id} id={ptn.id}>
                      {({ setNodeRef, style, attributes, listeners }: any) => (
                        <div
                          ref={setNodeRef}
                          className={`cordel-border-sm p-4 flex flex-col gap-3 transition-colors ${
                            isSelected ? 'bg-[#f4ecd8]' : 'bg-[#ece4d0]'
                          }`}
                          style={{
                            ...style,
                            boxShadow: isCurrentPlaying ? '4px 4px 0px 0px #8b2a1a' : (isSelected ? '4px 4px 0px 0px #1a1a1a' : '2px 2px 0px 0px #bbb'),
                            borderColor: isCurrentPlaying ? '#8b2a1a' : (isSelected ? '#1a1a1a' : '#999'),
                            borderWidth: isCurrentPlaying ? '3px' : '2px',
                          }}
                        >
                          {/* Pattern Header */}
                          <div className="flex items-center gap-3 border-b-[2px] border-[#1a1a1a] pb-2">
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

                            {isCurrentPlaying && (
                              <span className="bg-[#8b2a1a] text-[#f4ecd8] text-[9px] uppercase px-1.5 py-0.5 cordel-border-sm font-bold flex items-center gap-1 animate-pulse select-none">
                                ▶ {lang === 'fr' ? 'Actif' : 'Ativo'}
                              </span>
                            )}

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

                            {/* Reorder handle */}
                            {onReorderPatternsDnd && (
                              <div
                                {...attributes}
                                {...listeners}
                                className="ml-2 flex items-center justify-center p-1 cursor-grab active:cursor-grabbing text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors touch-none"
                                title="Drag to reorder patterns"
                              >
                                <GripVertical size={16} />
                              </div>
                            )}

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

                          {/* Vocal recording controls (only for voice instruments) */}
                          <VocalRecordingSection
                            lang={lang}
                            ptn={ptn}
                            inst={inst}
                            selectedAudioDeviceId={selectedAudioDeviceId}
                            audioDevices={audioDevices}
                            isVocalGuideEnabled={isVocalGuideEnabled}
                            recordedPatternIds={recordedPatternIds}
                            isCalibrating={isCalibrating}
                            onVocalModeChange={onVocalModeChange}
                            onAudioDeviceChange={onAudioDeviceChange}
                            onVocalGuideToggle={onVocalGuideToggle}
                            onImportVocalFile={onImportVocalFile}
                            onDeleteVocalRecording={onDeleteVocalRecording}
                            onVocalLatencyChange={onVocalLatencyChange}
                            onVocalBpmSyncToggle={onVocalBpmSyncToggle}
                            onAutoCalibrate={handleAutoCalibrate}
                          />

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
          <div className="border-t-[3px] md:border-t-0 md:border-l-[3px] border-[#1a1a1a] bg-[#ece4d0] p-4 shrink-0 flex flex-col gap-4 w-full md:w-[240px] md:overflow-y-auto">
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
                <span>{lang === 'fr' ? 'Résonance/Decay (10-100%)' : 'Ressonância/Decay (10-100%)'}</span>
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
              <div className="bg-[#f4ecd8] cordel-border-sm p-2.5 text-[10px] flex flex-col gap-1">
                <p className="font-bold">🎤 {lang === 'fr' ? 'Voix / Chœur' : 'Voz / Coro'}</p>
                <p>{lang === 'fr'
                  ? 'Cliquez en haut de la case (PUX/CORO) pour changer qui chante.'
                  : 'Clique no topo da caixa (PUX/CORO) para alterar quem canta.'
                }</p>
                <p>{lang === 'fr'
                  ? 'Puxador: Orange (Aigu). Chœur: Cyan (Grave).'
                  : 'Puxador: Laranja (Agudo). Coro: Ciano (Grave).'
                }</p>
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
  const storeState = useSequencerStore.getState();
  const prevTrack = storeState.tracks.find(t => t.id === prevProps.trackId);
  const nextTrack = storeState.tracks.find(t => t.id === nextProps.trackId);

  const prevStepsSig = prevTrack?.patterns.map(p => {
    const prevStep = (prevProps.isPlaying && prevProps.currentStepIndex >= 0)
      ? Math.floor((prevProps.currentStepIndex / prevProps.maxTicks) * p.steps)
      : -1;
    return `${p.id}:${prevStep}`;
  }).join(',') || '';

  const nextStepsSig = nextTrack?.patterns.map(p => {
    const nextStep = (nextProps.isPlaying && nextProps.currentStepIndex >= 0)
      ? Math.floor((nextProps.currentStepIndex / nextProps.maxTicks) * p.steps)
      : -1;
    return `${p.id}:${nextStep}`;
  }).join(',') || '';

  if (prevStepsSig !== nextStepsSig) {
    return false;
  }

  if (prevProps.trackId !== nextProps.trackId) {
    return false;
  }

  const keys = Object.keys(prevProps) as Array<keyof InstrumentDetailEditorProps>;
  for (const key of keys) {
    if (key === 'trackId') continue;
    if (key === 'currentStepIndex' || key === 'currentMeasure') continue;

    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  return true;
});
