/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
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
import { Pattern } from '../types';
import { VerticalTrackMixer } from './VerticalTrackMixer';
import { InstrumentDetailEditor } from './InstrumentDetailEditor';
import { i18n, instrumentsConfig } from '../data';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { meters, masterMeterNode } from '../hooks/useAudioSync';

interface ConsoleMixerProps {
  isMobile: boolean;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
}

const ConsoleMixerComponent: React.FC<ConsoleMixerProps> = ({
  isMobile,
  onStepTouchStart,
}) => {
  const sequencer = useSequencer();
  const audio = useAudio();

  const {
    lang,
    isLeftHanded = false,
    tracks,
    totalMeasures,
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
  } = sequencer;

  const {
    isPlaying,
    currentStepIndex,
    currentMeasure,
    maxTicksRef,
    soloPatternPlayId,
    soloPatternVariationId,
    handleStartSoloPattern,
    handleStopSoloPattern,
    activeKeyboardInstrumentId,
    setActiveKeyboardInstrumentId,
    handleTimeSigChange,
    masterVol, setMasterVol, masterEQ, setMasterEQ, masterCompressor, setMasterCompressor, reverbType, setReverbType,
    metroVolume, setMetroVolume, metroSound, setMetroSound, isMetroOn, setIsMetroOn, isSwingOn
  } = audio;

  const maxTicks = maxTicksRef.current;
  if (!tracks) return null;
  const onActiveInstrumentChange = setActiveKeyboardInstrumentId;
  const onMasterVolChange = setMasterVol;
  const onMasterEQChange = setMasterEQ;
  const onMasterCompressorChange = setMasterCompressor;

  const vuMeterRef = useRef<HTMLDivElement>(null);
  const dbTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;

    const updateMasterMeter = () => {
      const currentMeter = (window as any).masterMeterNode || masterMeterNode;
      
      if (currentMeter) {
        try {
          const valRaw = currentMeter.getValue();
          let db = -80;
          if (typeof valRaw === 'number') {
            db = valRaw;
          } else if (Array.isArray(valRaw)) {
            db = valRaw.length > 0 ? Math.max(...valRaw) : -80;
          } else if (valRaw instanceof Float32Array || (valRaw && typeof (valRaw as any).length === 'number')) {
            const arr = Array.from(valRaw as any) as number[];
            db = arr.length > 0 ? Math.max(...arr) : -80;
          }

          // Borner la valeur entre -80dB (silence) et +6dB (clip)
          const clampedDb = Math.max(-80, Math.min(6, db));

          // Mise à jour du texte
          if (dbTextRef.current) {
            dbTextRef.current.innerText = clampedDb <= -79 ? '-∞ dB' : `${Math.round(clampedDb)} dB`;
          }

          // Mise à jour de la jauge (Transformation en pourcentage où -80dB = 0% et 0dB = ~93%)
          if (vuMeterRef.current) {
            const percentage = Math.max(0, Math.min(100, ((clampedDb + 80) / 86) * 100));
            vuMeterRef.current.style.height = `${percentage}%`;
            vuMeterRef.current.style.width = '100%';
          }
        } catch (e) {
          console.error("Error reading master meter value:", e);
        }
      } else {
        if (dbTextRef.current) {
          dbTextRef.current.innerText = 'NO MTR';
        }
        if (vuMeterRef.current) {
          vuMeterRef.current.style.height = '0%';
        }
      }
      animationFrameId = requestAnimationFrame(updateMasterMeter);
    };

    animationFrameId = requestAnimationFrame(updateMasterMeter);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (vuMeterRef.current) {
        vuMeterRef.current.style.height = '0%';
      }
    };
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);

  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const editingTrack = tracks.find(t => t.id === editingTrackId);

  useEffect(() => {
    if (editingTrack) {
      const inst = instrumentsConfig[editingTrack.instrumentIdx];
      if (inst && inst.type !== 'voice' && onActiveInstrumentChange) {
        onActiveInstrumentChange(inst.id);
      }
    }
  }, [editingTrack, onActiveInstrumentChange]);

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
              // Found a vertically scrollable container, don't intercept
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
    sequencer.setTracks(prev => prev.map(t => t.id === trackId ? { ...t, selectedPatternId: patternId } : t));
  };

  const onPatternAssign = (trackId: number, patternId: number, measureIdx: number, val: boolean) => {
    sequencer.pushUndoState();
    sequencer.setTracks(prev => prev.map(t => {
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
    sequencer.setTracks(prev => prev.map(t => {
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
          beatResolutions: p.beatResolutions ? [...p.beatResolutions] : undefined,
        };
        return { ...t, patterns: [...t.patterns, newPattern], selectedPatternId: newPattern.id };
      }
      return t;
    }));
  };

  const onDeletePattern = (trackId: number, patternId: number) => {
    sequencer.pushUndoState();
    sequencer.setTracks(prev => prev.map(t => {
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
        const track = tracks.find(t => t.patterns.some(p => p.id === activePatternId));
        if (track && onReorderPatternsDnd) {
          const oldIndex = track.patterns.findIndex(p => p.id === activePatternId);
          const newIndex = track.patterns.findIndex(p => p.id === overPatternId);
          onReorderPatternsDnd(track.id, oldIndex, newIndex);
        }
      } else if (activeId.startsWith('track-') && overId.startsWith('track-')) {
        const activeTrackId = parseInt(activeId.replace('track-', ''), 10);
        const overTrackId = parseInt(overId.replace('track-', ''), 10);
        const oldIndex = tracks.findIndex(t => t.id === activeTrackId);
        const newIndex = tracks.findIndex(t => t.id === overTrackId);
        handleReorderTracksDnd(oldIndex, newIndex);
      }
    }
  };

  const trackIds = useMemo(() => tracks.map(t => `track-${t.id}`), [tracks]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div ref={scrollRef} className="flex-grow flex overflow-x-auto p-4 gap-4 custom-scrollbar">
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
          <SortableContext items={trackIds} strategy={horizontalListSortingStrategy}>
            {tracks.map((track, idx) => (
          <VerticalTrackMixer
            key={track.id}
            lang={lang}
            isLeftHanded={isLeftHanded}
            track={track}
            index={idx}
            totalTracks={tracks.length}
            meter={meters ? meters[instrumentsConfig[track.instrumentIdx].id] : undefined}
            soloPatternPlayId={soloPatternPlayId}
            activeVariationsRef={activeVariationsRef}
            onInstrumentChange={(i) => onInstrumentChange(track.id, i)}
            onMuteToggle={() => onMuteToggle(track.id)}
            onSoloToggle={() => onSoloToggle(track.id)}
            onHideToggle={() => onHideToggle(track.id)}
            onDelete={() => onDelete(track.id)}
            onVolumeChange={(val) => onVolumeChange(track.id, val)}
            onReverbChange={(val) => onReverbChange(track.id, val)}
            onPanChange={(val) => onPanChange(track.id, val)}
            onStepsChange={(pid, steps) => onStepsChange(track.id, pid, steps)}
            onStepValueChange={(pid, sIdx, val, lyrics, notes) => onStepValueChange(track.id, pid, sIdx, val, lyrics, notes)}
            onStepKeyDown={(pid, sIdx, k, cVal, el) => onStepKeyDown(track.id, pid, sIdx, k, cVal, el)}
            onVoiceTypeToggle={(pid, sIdx) => onVoiceTypeToggle(track.id, pid, sIdx)}
            onVoiceSylChange={(pid, sIdx, val) => onVoiceSylChange(track.id, pid, sIdx, val)}
            onVoiceNoteChange={(pid, sIdx, val) => onVoiceNoteChange(track.id, pid, sIdx, val)}
            onVoiceNoteBlur={(pid, sIdx, val) => onVoiceNoteBlur(track.id, pid, sIdx, val)}
            isPlaying={isPlaying}
            currentStepIndex={currentStepIndex}
            currentMeasure={currentMeasure}
            maxTicks={maxTicks}
            timeSig={timeSig}
            totalMeasures={totalMeasures}
            onSelectPattern={(pid) => onTrackSelectPattern(track.id, pid)}
            onPatternAssign={(pid, mIdx, val) => onPatternAssign(track.id, pid, mIdx, val)}
            onAddPattern={() => onAddPattern(track.id)}
            onDeletePattern={(pid) => onDeletePattern(track.id, pid)}
            onOpenDetailEditor={() => setEditingTrackId(track.id)}
            onStepTouchStart={onStepTouchStart}
            onCopyPattern={handleCopyPattern}
            onPastePattern={(pId) => handlePastePattern(track.id, pId)}
            onLoadLibraryPattern={(targetPtnId, libPattern) => handleLoadLibraryPattern(track.id, targetPtnId, libPattern)}
            canPaste={!!copiedPattern}
            onPatternNameChange={(pid, name) => onPatternNameChange && onPatternNameChange(track.id, pid, name)}
            onReorderPatternsDnd={(oldIdx, newIdx) => onReorderPatternsDnd && onReorderPatternsDnd(track.id, oldIdx, newIdx)}
          />
        ))}
          </SortableContext>
        </DndContext>

        {tracks.length > 0 && (
          <div 
            className="flex flex-col bg-[var(--cordel-bg)] cordel-border w-[160px] shrink-0 text-[var(--cordel-text)] overflow-hidden relative pb-4 transition-colors"
            style={{
              zIndex: 1,
              '--fader-thumb-bg': '#8b2a1a',
              '--fader-thumb-border': 'var(--cordel-border)',
            } as React.CSSProperties}
          >
            {/* Header / Title */}
            <div className="relative p-3 pb-1 flex justify-center items-center h-[52px] border-b-[3px] border-[var(--cordel-border)] bg-[var(--cordel-bg)]">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 object-contain" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3L4 21h16L12 3z" />
                  <line x1="12" y1="18" x2="16" y2="7" />
                  <circle cx="15" cy="9.5" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="18" r="1" fill="currentColor" />
                </svg>
                <span className="font-cactus font-bold text-sm tracking-wider">MÉTRONOME</span>
              </div>
            </div>

            {/* Middle Section (Sound Selection) */}
            <div className="relative z-10 flex-1 p-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar border-b-[3px] border-[var(--cordel-border)] bg-[#1a1a1a]/5">
              <div className="flex flex-col gap-1.5 border-b border-[var(--cordel-border)]/20 pb-2">
                <span className="text-[10px] font-cactus font-bold tracking-wider text-[var(--cordel-text)] opacity-80">
                  🎵 SON DU CLIC
                </span>
                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <input type="radio" name="metroSound" value="synth" checked={metroSound === 'synth'} onChange={(e) => setMetroSound(e.target.value as any)} className="accent-[#8b2a1a] w-3.5 h-3.5 cursor-pointer" />
                    <span className="font-bold text-[10px] group-hover:text-[#8b2a1a] transition-colors leading-none mt-0.5">Beep (Synth)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <input type="radio" name="metroSound" value="clave" checked={metroSound === 'clave'} onChange={(e) => setMetroSound(e.target.value as any)} className="accent-[#8b2a1a] w-3.5 h-3.5 cursor-pointer" />
                    <span className="font-bold text-[10px] group-hover:text-[#8b2a1a] transition-colors leading-none mt-0.5">Clave Bois</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <input type="radio" name="metroSound" value="cowbell" checked={metroSound === 'cowbell'} onChange={(e) => setMetroSound(e.target.value as any)} className="accent-[#8b2a1a] w-3.5 h-3.5 cursor-pointer" />
                    <span className="font-bold text-[10px] group-hover:text-[#8b2a1a] transition-colors leading-none mt-0.5">Cloche</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Bottom Fader */}
            <div className="relative z-10 p-4 pt-4 flex justify-around items-end h-[200px] gap-2">
              <div className="flex flex-col items-center gap-1.5 h-full w-full">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Volume</span>
                <div className="h-[145px] flex justify-center items-center relative w-12">
                  <div className="absolute top-0 bottom-0 w-1.5 bg-[var(--cordel-border)] rounded-none border-x border-[var(--cordel-bg)] pointer-events-none"></div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    orient="vertical"
                    value={metroVolume}
                    onChange={(e) => setMetroVolume(parseFloat(e.target.value))}
                    className="vertical-fader touch-none z-10 h-[130px] w-8 cursor-pointer"
                  />
                </div>
                <span className="text-[10px] font-bold text-[var(--cordel-text)] text-center leading-none">
                  {metroVolume}%
                </span>
              </div>
            </div>
          </div>
        )}

        {tracks.length > 0 && (
          <div 
            className="flex flex-col bg-[var(--cordel-bg)] cordel-border w-[160px] shrink-0 text-[var(--cordel-text)] overflow-hidden relative pb-4 transition-colors"
            style={{
              '--fader-thumb-bg': '#8b2a1a',
              '--fader-thumb-border': 'var(--cordel-border)',
            } as React.CSSProperties}
          >
            {/* Header / Title */}
            <div className="relative p-3 pb-1 flex justify-center items-center h-[52px] border-b-[3px] border-[var(--cordel-border)] bg-[var(--cordel-bg)]">
              <span className="font-cactus font-bold text-sm tracking-wider">👑 MASTER</span>
            </div>

            {/* Middle Section (EQ & Compressor Controls) */}
            <div className="relative z-10 flex-1 p-3 flex flex-col gap-3.5 overflow-y-auto custom-scrollbar border-b-[3px] border-[var(--cordel-border)] bg-[#1a1a1a]/5">
              
              {/* EQ 3-BANDES */}
              <div className="flex flex-col gap-1.5 border-b border-[var(--cordel-border)]/20 pb-2">
                <span className="text-[10px] font-cactus font-bold tracking-wider text-[var(--cordel-text)] opacity-80">
                  🎛️ EQ 3-Bandes
                </span>
                
                {/* Low Gain */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[8px] font-bold opacity-60">
                    <span>Grave / Low</span>
                    <span>{masterEQ.low > 0 ? '+' : ''}{masterEQ.low} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={masterEQ.low}
                    onChange={(e) => onMasterEQChange({ ...masterEQ, low: parseFloat(e.target.value) })}
                    className="w-full accent-green-700 h-1 bg-[#1a1a1a]/10 cursor-pointer"
                  />
                </div>

                {/* Mid Gain */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[8px] font-bold opacity-60">
                    <span>Médio / Mid</span>
                    <span>{masterEQ.mid > 0 ? '+' : ''}{masterEQ.mid} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={masterEQ.mid}
                    onChange={(e) => onMasterEQChange({ ...masterEQ, mid: parseFloat(e.target.value) })}
                    className="w-full accent-green-700 h-1 bg-[#1a1a1a]/10 cursor-pointer"
                  />
                </div>

                {/* High Gain */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[8px] font-bold opacity-60">
                    <span>Agudo / High</span>
                    <span>{masterEQ.high > 0 ? '+' : ''}{masterEQ.high} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={masterEQ.high}
                    onChange={(e) => onMasterEQChange({ ...masterEQ, high: parseFloat(e.target.value) })}
                    className="w-full accent-green-700 h-1 bg-[#1a1a1a]/10 cursor-pointer"
                  />
                </div>
              </div>

              {/* COMPRESSEUR */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-cactus font-bold tracking-wider text-[var(--cordel-text)] opacity-80">
                  🌀 Compressor
                </span>

                {/* Threshold */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[8px] font-bold opacity-60">
                    <span>Limiar / Threshold</span>
                    <span>{masterCompressor.threshold} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="0"
                    step="1"
                    value={masterCompressor.threshold}
                    onChange={(e) => onMasterCompressorChange({ ...masterCompressor, threshold: parseFloat(e.target.value) })}
                    className="w-full accent-green-700 h-1 bg-[#1a1a1a]/10 cursor-pointer"
                  />
                </div>

                {/* Ratio */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[8px] font-bold opacity-60">
                    <span>Ratio</span>
                    <span>{masterCompressor.ratio}:1</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={masterCompressor.ratio}
                    onChange={(e) => onMasterCompressorChange({ ...masterCompressor, ratio: parseFloat(e.target.value) })}
                    className="w-full accent-green-700 h-1 bg-[#1a1a1a]/10 cursor-pointer"
                  />
                </div>
              </div>

              {/* REVERB */}
              <div className="flex flex-col gap-1.5 border-t border-[var(--cordel-border)]/20 pt-2">
                <span className="text-[10px] font-cactus font-bold tracking-wider text-[var(--cordel-text)] opacity-80">
                  ⛪ Reverb
                </span>
                <select
                  value={reverbType}
                  onChange={(e) => setReverbType(e.target.value as any)}
                  className="bg-[#1a1a1a]/10 border border-[var(--cordel-border)]/20 text-[var(--cordel-text)] font-bold text-[10px] uppercase outline-none cursor-pointer w-full p-1"
                >
                  <option value="room" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">Sala (Room)</option>
                  <option value="studio" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">Estúdio (Studio)</option>
                  <option value="hall" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">Catedral (Hall)</option>
                </select>
              </div>
            </div>

            {/* Fader & VU Meter Section */}
            <div className="relative z-10 p-4 pt-4 flex justify-around items-end h-[200px] gap-2">
              {/* Volume Master Fader */}
              <div className="flex flex-col items-center gap-1.5 h-full">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Volume</span>
                <div className="h-[145px] flex justify-center items-center relative w-12">
                  <div className="absolute top-0 bottom-0 w-1.5 bg-[var(--cordel-border)] rounded-none border-x border-[var(--cordel-bg)] pointer-events-none"></div>
                  <input
                    type="range"
                    min="-40"
                    max="6"
                    step="0.5"
                    orient="vertical"
                    value={masterVol}
                    onChange={(e) => onMasterVolChange(parseFloat(e.target.value))}
                    className="vertical-fader touch-none z-10 h-[130px] w-8 cursor-pointer"
                  />
                </div>
                <span className="text-[10px] font-bold text-[var(--cordel-text)] text-center leading-none">
                  {masterVol === -40 ? 'Mute' : `${masterVol > 0 ? '+' : ''}${masterVol} dB`}
                </span>
              </div>

              {/* Master VU Meter */}
              <div className="flex flex-col items-center gap-1.5 h-full">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Meter</span>
                <div className="w-3.5 h-[145px] bg-[var(--cordel-bg)] cordel-border-sm relative overflow-hidden">
                  <div
                    ref={vuMeterRef}
                    id="meter-bar-master"
                    className="meter-vertical absolute bottom-0 left-0 right-0 bg-[#2ecc71] w-full"
                    style={{ height: '0%' }}
                  />
                </div>
                <div ref={dbTextRef} className="text-[8px] font-mono font-bold text-[var(--cordel-text)]/60 h-[15px] flex items-center justify-center">--</div>
              </div>
            </div>
          </div>
        )}

        {tracks.length === 0 && (
          <div className="m-auto text-[var(--cordel-text)] font-cactus font-bold text-2xl">
            Ajoutez un instrument pour commencer...
          </div>
        )}
      </div>

      {editingTrack && (
        <InstrumentDetailEditor
          isMobile={isMobile}
          lang={lang}
          isLeftHanded={isLeftHanded}
          track={editingTrack}
          onClose={() => setEditingTrackId(null)}
          soloPatternPlayId={soloPatternPlayId}
          soloPatternVariationId={soloPatternVariationId}
          onStepTouchStart={onStepTouchStart}
          onPlaySoloPattern={handleStartSoloPattern}
          onStopSoloPattern={handleStopSoloPattern}
          onStepValueChange={(pid, sIdx, val, lyrics, notes) => onStepValueChange(editingTrack.id, pid, sIdx, val, lyrics, notes)}
          onStepKeyDown={(pid, sIdx, k, cVal, el) => onStepKeyDown(editingTrack.id, pid, sIdx, k, cVal, el)}
          onStepsChange={(pid, steps) => onStepsChange(editingTrack.id, pid, steps)}
          onVoiceTypeToggle={(pid, sIdx) => onVoiceTypeToggle(editingTrack.id, pid, sIdx)}
          onVoiceSylChange={(pid, sIdx, val) => onVoiceSylChange(editingTrack.id, pid, sIdx, val)}
          onVoiceNoteChange={(pid, sIdx, val) => onVoiceNoteChange(editingTrack.id, pid, sIdx, val)}
          onVoiceNoteBlur={(pid, sIdx, val) => onVoiceNoteBlur(editingTrack.id, pid, sIdx, val)}
          onAddPattern={() => onAddPattern(editingTrack.id)}
          onDeletePattern={(pid) => onDeletePattern(editingTrack.id, pid)}
          onReorderPatternsDnd={(oldIdx, newIdx) => onReorderPatternsDnd && onReorderPatternsDnd(editingTrack.id, oldIdx, newIdx)}
          onAddPatternVariation={(pid) => onAddPatternVariation && onAddPatternVariation(editingTrack.id, pid)}
          onUpdatePatternVariationProbability={(pid, vid, prob) => onUpdatePatternVariationProbability && onUpdatePatternVariationProbability(editingTrack.id, pid, vid, prob)}
          onTogglePatternVariationFirstTimeOnly={(pid, vid, val) => onTogglePatternVariationFirstTimeOnly && onTogglePatternVariationFirstTimeOnly(editingTrack.id, pid, vid, val)}
          onVariationStepValueChange={(pid, vid, sIdx, val) => onVariationStepValueChange && onVariationStepValueChange(editingTrack.id, pid, vid, sIdx, val)}
          onVariationStepVolumeChange={(pid, vid, sIdx, val) => onVariationStepVolumeChange && onVariationStepVolumeChange(editingTrack.id, pid, vid, sIdx, val)}
          onVariationStepDecayChange={(pid, vid, sIdx, val) => onVariationStepDecayChange && onVariationStepDecayChange(editingTrack.id, pid, vid, sIdx, val)}
          onVariationStepMicrotimingChange={(pid, vid, sIdx, val) => onVariationStepMicrotimingChange && onVariationStepMicrotimingChange(editingTrack.id, pid, vid, sIdx, val)}
          onDeletePatternVariation={(pid, vid) => onDeletePatternVariation && onDeletePatternVariation(editingTrack.id, pid, vid)}
          onSelectPattern={(pid) => onTrackSelectPattern(editingTrack.id, pid)}
          onPatternAssign={(pid, mIdx, val) => onPatternAssign(editingTrack.id, pid, mIdx, val)}
          onVolumeChange={(val) => onVolumeChange(editingTrack.id, val)}
          onMuteToggle={() => onMuteToggle(editingTrack.id)}
          onSoloToggle={() => onSoloToggle(editingTrack.id)}
          onStepVolumeChange={(pid, sIdx, val) => onStepVolumeChange(editingTrack.id, pid, sIdx, val)}
          onStepDecayChange={(pid, sIdx, val) => onStepDecayChange(editingTrack.id, pid, sIdx, val)}
          onStepMicrotimingChange={(pid, sIdx, val) => onStepMicrotimingChange(editingTrack.id, pid, sIdx, val)}
          isSwingOn={isSwingOn}
          isPlaying={isPlaying}
          currentStepIndex={currentStepIndex}
          currentMeasure={currentMeasure}
          maxTicks={maxTicks}
          totalMeasures={totalMeasures}
          onCopyPattern={handleCopyPattern}
          onPastePattern={(pId) => handlePastePattern(editingTrack.id, pId)}
          onLoadLibraryPattern={(targetPtnId, libPattern) => handleLoadLibraryPattern(editingTrack.id, targetPtnId, libPattern)}
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
          onPatternNameChange={(pid, name) => onPatternNameChange && onPatternNameChange(editingTrack.id, pid, name)}
        />
      )}
    </div>
  );
};

export const ConsoleMixer = React.memo(ConsoleMixerComponent);
