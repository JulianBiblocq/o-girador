/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useRef, useEffect, lazy, Suspense } from 'react';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TrackMixer } from './TrackMixer';
const InstrumentDetailEditor = lazy(() => import('./InstrumentDetailEditor').then(m => ({ default: m.InstrumentDetailEditor })));
import { i18n, instrumentsConfig, ASSETS_BASE_URL } from '../data';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { meters } from '../hooks/useAudioSync';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { Pattern } from '../types';

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

interface MixerProps {
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  onCopyPattern?: (pattern: Pattern) => void;
  onPastePattern?: (trackId: number) => void;
  onLoadLibraryPattern?: (trackId: number, targetPatternId: number, libPattern: any) => void;
  visible?: boolean;
}

const MixerComponent: React.FC<MixerProps> = ({
  onStepTouchStart,
  onCopyPattern,
  onPastePattern,
  onLoadLibraryPattern,
  visible = true,
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
    handleReorderTracksDnd,
    handleTrackInstrumentIdxChange: onInstrumentChange,
    handleTrackMuteToggle: onMuteToggle,
    handleTrackSoloToggle: onSoloToggle,
    handleTrackHideToggle: onHideToggle,
    handleTrackDelete: onDelete,
    handlePatternNameChange: onPatternNameChange,
    handleAddPatternVariation: onAddPatternVariation,
    handleUpdatePatternVariationProbability: onUpdatePatternVariationProbability,
    handleTogglePatternVariationFirstTimeOnly: onTogglePatternVariationFirstTimeOnly,
    handleVariationStepValueChange: onVariationStepValueChange,
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
    handleDeletePatternVariation: onDeletePatternVariation,
    handleTrackStepVolumeChange: onStepVolumeChange,
    handleTrackStepDecayChange: onStepDecayChange,
    handleTrackStepMicrotimingChange: onStepMicrotimingChange,
    handleVariationStepVolumeChange: onVariationStepVolumeChange,
    handleVariationStepDecayChange: onVariationStepDecayChange,
    handleVariationStepMicrotimingChange: onVariationStepMicrotimingChange,
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
    activeAoVivoTrackId,
    setActiveAoVivoTrackId,
    activeVariationsRef,
    runAutoCalibration,
    vocalCalibrationLatencyMs,
  } = sequencer;

  const [isTracksCollapsed, setIsTracksCollapsed] = React.useState(true);
  const [editingTrackId, setEditingTrackId] = React.useState<number | null>(null);

  const trackList = useSequencerStore(useShallow(state => state.tracks.map(t => getCachedTrack(t.id, t.isHidden, t.isSolo, t.isMute))));
  const trackIdsNumbers = trackList.map(t => t.id);

  const isEditingTrackValid = useSequencerStore(state => state.tracks.some(t => t.id === editingTrackId));
  const setTracks = useSequencerStore(state => state.setTracks);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);

  const {
    isPlaying,
    maxTicksRef,
    soloPatternPlayId,
    soloPatternVariationId,
    handleStartSoloPattern,
    handleStopSoloPattern,
  } = audio;


  const maxTicks = maxTicksRef.current;
  const t = (key: string) => (i18n[lang] as any)[key] || key;
  const onOpenDetailEditor = React.useCallback((id: number) => {
    setEditingTrackId(id);
  }, []);
  const [addDropOpen, setAddDropOpen] = useState(false);
  const addDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addDropRef.current && !addDropRef.current.contains(e.target as Node)) {
        setAddDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        const tracksList = useSequencerStore.getState().tracks;
        const oldIndex = tracksList.findIndex(t => t.id === activeTrackId);
        const newIndex = tracksList.findIndex(t => t.id === overTrackId);
        handleReorderTracksDnd(oldIndex, newIndex);
      }
    }
  };

  const trackIds = useMemo(() => trackIdsNumbers.map(id => `track-${id}`), [trackIdsNumbers]);

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

  return (
    <div
      id="left-panel"
      className="w-[400px] min-w-[400px] h-full bg-gradient-to-b from-[#1c1815] to-[#120e0c] border-r-2 border-[#eaddcf] flex flex-col p-5 box-border z-10 transition-all duration-300 overflow-hidden"
    >
      <div className="border-b border-[#333] pb-2.5 mb-4 shrink-0 w-full flex items-center gap-2">
        <div className="relative flex-1" ref={addDropRef}>
          <button
            onClick={() => setAddDropOpen(!addDropOpen)}
            className="w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button px-3 py-2 text-xs font-bold font-cactus uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
          >
            ➕ {t('addInst')}
          </button>
          {addDropOpen && (
            <div className="absolute top-10 left-0 w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] shadow-[4px_4px_0_var(--cordel-border)] max-h-none z-[100]">
              {instrumentsConfig.map((inst, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    sequencer.handleAddTrackInstrument(idx, useSequencerStore.getState().currentMeasure);
                    setAddDropOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] border-b border-[var(--cordel-border)] cursor-pointer"
                >
                  <img
                    src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                    alt={inst.name}
                    className="w-5 h-5 object-contain filter invert opacity-80"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span>{inst.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setIsTracksCollapsed(!isTracksCollapsed)}
          className="bg-transparent border border-[#444] px-3 py-2 text-sm font-extrabold cursor-pointer text-[#eaddcf] hover:bg-[#eaddcf] hover:text-black transition-colors"
          title={isTracksCollapsed ? "Déplier les pas" : "Replier les pas"}
        >
          {isTracksCollapsed ? '▼' : '▲'}
        </button>
      </div>

      <div id="mixer-section" className="flex-grow overflow-y-auto pr-1">
        <div id="tracks-mixer-container" className="flex flex-col gap-3">
          <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
            <SortableContext items={trackIds} strategy={verticalListSortingStrategy}>
              {trackIdsNumbers.map((trackId, idx) => (
                <TrackMixer
                  key={trackId}
                  trackId={trackId}
                  index={idx}
                  totalTracks={trackIdsNumbers.length}
                  isCollapsed={isTracksCollapsed}
                  onOpenDetailEditor={onOpenDetailEditor}
                  onStepTouchStart={onStepTouchStart}
                  visible={visible}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {editingTrackId !== null && isEditingTrackValid && (
        <Suspense fallback={null}>
          <InstrumentDetailEditor
          isMobile={window.innerWidth <= 768}
          lang={lang}
          isLeftHanded={isLeftHanded}
          trackId={editingTrackId}
          onClose={() => setEditingTrackId(null)}
          onNavigatePrev={() => {
            const tracksList = useSequencerStore.getState().tracks;
            const idx = tracksList.findIndex(t => t.id === editingTrackId);
            if (idx > 0) setEditingTrackId(tracksList[idx - 1].id);
          }}
          onNavigateNext={() => {
            const tracksList = useSequencerStore.getState().tracks;
            const idx = tracksList.findIndex(t => t.id === editingTrackId);
            if (idx >= 0 && idx < tracksList.length - 1) setEditingTrackId(tracksList[idx + 1].id);
          }}
          onKeyDown={(e) => {
            const tracksList = useSequencerStore.getState().tracks;
            const idx = tracksList.findIndex(t => t.id === editingTrackId);
            if (e.key === 'ArrowDown') {
              if (idx >= 0 && idx < tracksList.length - 1) setEditingTrackId(tracksList[idx + 1].id);
            } else if (e.key === 'ArrowUp') {
              if (idx > 0) setEditingTrackId(tracksList[idx - 1].id);
            }
          }}
          soloPatternPlayId={soloPatternPlayId}
          soloPatternVariationId={soloPatternVariationId}
          onStepTouchStart={onStepTouchStart}
          onPlaySoloPattern={handleStartSoloPattern}
          onStopSoloPattern={handleStopSoloPattern}
          onStepValueChange={(pid, sIdx, val, lyrics, notes) => {
            // console.log("3️⃣ MIXER : Ordre reçu, transmission à Zustand. Track:", editingTrackId);
            onStepValueChange(editingTrackId, pid, sIdx, val, lyrics, notes);
          }}
          onStepKeyDown={(pid, sIdx, k, cVal, el) => onStepKeyDown(editingTrackId, pid, sIdx, k, cVal, el)}
          onStepsChange={(pid, steps) => onStepsChange(editingTrackId, pid, steps)}
          onVoiceTypeToggle={(pid, sIdx) => onVoiceTypeToggle(editingTrackId, pid, sIdx)}
          onVoiceSylChange={(pid, sIdx, val) => onVoiceSylChange(editingTrackId, pid, sIdx, val)}
          onVoiceNoteChange={(pid, sIdx, val) => onVoiceNoteChange(editingTrackId, pid, sIdx, val)}
          onVoiceNoteBlur={(pid, sIdx, val) => onVoiceNoteBlur(editingTrackId, pid, sIdx, val)}
          onAddPattern={() => onAddPattern(editingTrackId)}
          onDeletePattern={(pid) => onDeletePattern(editingTrackId, pid)}
          onReorderPatternsDnd={(oldIdx, newIdx) => onReorderPatternsDnd && onReorderPatternsDnd(editingTrackId, oldIdx, newIdx)}
          onAddPatternVariation={(pid) => onAddPatternVariation && onAddPatternVariation(editingTrackId, pid)}
          onUpdatePatternVariationProbability={(pid, vid, prob) => onUpdatePatternVariationProbability && onUpdatePatternVariationProbability(editingTrackId, pid, vid, prob)}
          onTogglePatternVariationFirstTimeOnly={(pid, vid, val) => onTogglePatternVariationFirstTimeOnly && onTogglePatternVariationFirstTimeOnly(editingTrackId, pid, vid, val)}
          onVariationStepValueChange={(pid, vid, sIdx, val) => onVariationStepValueChange && onVariationStepValueChange(editingTrackId, pid, vid, sIdx, val)}
          onDeletePatternVariation={(pid, vid) => onDeletePatternVariation && onDeletePatternVariation(editingTrackId, pid, vid)}
          onStepVolumeChange={(pid, sIdx, val) => onStepVolumeChange && onStepVolumeChange(editingTrackId, pid, sIdx, val)}
          onStepDecayChange={(pid, sIdx, val) => onStepDecayChange && onStepDecayChange(editingTrackId, pid, sIdx, val)}
          onStepMicrotimingChange={(pid, sIdx, val) => onStepMicrotimingChange && onStepMicrotimingChange(editingTrackId, pid, sIdx, val)}
          onVariationStepVolumeChange={(pid, vid, sIdx, val) => onVariationStepVolumeChange && onVariationStepVolumeChange(editingTrackId, pid, vid, sIdx, val)}
          onVariationStepDecayChange={(pid, vid, sIdx, val) => onVariationStepDecayChange && onVariationStepDecayChange(editingTrackId, pid, vid, sIdx, val)}
          onVariationStepMicrotimingChange={(pid, vid, sIdx, val) => onVariationStepMicrotimingChange && onVariationStepMicrotimingChange(editingTrackId, pid, vid, sIdx, val)}
          onSelectPattern={(pid) => onTrackSelectPattern(editingTrackId, pid)}
          onPatternAssign={(pid, mIdx, val) => onPatternAssign(editingTrackId, pid, mIdx, val)}
          onVolumeChange={(val) => onVolumeChange(editingTrackId, val)}
          onMuteToggle={() => onMuteToggle(editingTrackId)}
          onSoloToggle={() => onSoloToggle(editingTrackId)}
          globalSwing={audio.globalSwing}
          isPlaying={isPlaying}
          currentMeasure={useSequencerStore.getState().currentMeasure}
          maxTicks={maxTicks}
          totalMeasures={totalMeasures}
          onCopyPattern={handleCopyPattern}
          onPastePattern={(pId) => handlePastePattern(editingTrackId, pId)}
          onLoadLibraryPattern={onLoadLibraryPattern ? (targetPtnId, libPattern) => onLoadLibraryPattern(editingTrackId, targetPtnId, libPattern) : undefined}
          canPaste={!!copiedPattern}
          isRecordingVocal={isRecordingVocal}
          recordingVocalPatternId={recordingVocalPatternId}
          recordedPatternIds={recordedPatternIds}
          onStartVocalRecording={onStartVocalRecording}
          onStopVocalRecording={onStopVocalRecording}
          onVocalModeChange={onVocalModeChange}
          onDeleteVocalRecording={onDeleteVocalRecording}
          onVocalLatencyChange={onVocalLatencyChange}
          audioDevices={audioDevices}
          selectedAudioDeviceId={selectedAudioDeviceId}
          onAudioDeviceChange={onAudioDeviceChange}
          onImportVocalFile={onImportVocalFile}
          isVocalGuideEnabled={isVocalGuideEnabled}
          onVocalGuideToggle={onVocalGuideToggle}
          onVocalBpmSyncToggle={onVocalBpmSyncToggle}
          onPatternNameChange={(pid, name) => onPatternNameChange && onPatternNameChange(editingTrackId, pid, name)}
          runAutoCalibration={runAutoCalibration}
          vocalCalibrationLatencyMs={vocalCalibrationLatencyMs}
        />
        </Suspense>
      )}
    </div>
  );
};

export const Mixer = React.memo(MixerComponent);
