/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrackMixer } from './TrackMixer';
import { InstrumentDetailEditor } from './InstrumentDetailEditor';
import { i18n, instrumentsConfig } from '../data';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { meters } from '../hooks/useAudioSync';
import { Pattern } from '../types';

interface MixerProps {
  isLeftPanelCollapsed: boolean;
  onToggleLeftPanel: () => void;
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
}

const MixerComponent: React.FC<MixerProps> = ({
  isLeftPanelCollapsed,
  onToggleLeftPanel,
  onStepTouchStart,
  onCopyPattern,
  onPastePattern,
  onLoadLibraryPattern,
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
    handleTrackMoveUp: onMoveUp,
    handleTrackMoveDown: onMoveDown,
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
    handleReorderPatterns: onReorderPatterns,
    handleDeletePatternVariation: onDeletePatternVariation,
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
  } = audio;

  const maxTicks = maxTicksRef.current;
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const [isTracksCollapsed, setIsTracksCollapsed] = React.useState(true);
  const [editingTrackId, setEditingTrackId] = React.useState<number | null>(null);

  if (isLeftPanelCollapsed) return null;
  if (!tracks) return null;

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
          variations: [],
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

  return (
    <div
      id="left-panel"
      className="w-[400px] min-w-[400px] h-full bg-gradient-to-b from-[#1c1815] to-[#120e0c] border-r-2 border-[#eaddcf] flex flex-col p-5 box-border z-10 transition-all duration-300 overflow-hidden"
    >
      <div className="flex justify-between items-center border-b border-[#333] pb-2.5 mb-4 shrink-0">
        <span className="font-cactus text-2xl text-[#eaddcf] tracking-widest uppercase font-medium">
          {t('mixer')}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTracksCollapsed(!isTracksCollapsed)}
            className="bg-transparent border border-[#444] px-2.5 py-1 text-sm font-extrabold cursor-pointer text-[#eaddcf] hover:bg-[#eaddcf] hover:text-black transition-colors"
            title={isTracksCollapsed ? "Déplier les pas" : "Replier les pas"}
          >
            {isTracksCollapsed ? '▼' : '▲'}
          </button>
          <button
            onClick={onToggleLeftPanel}
            className="bg-transparent border border-[#444] px-2.5 py-1 text-sm font-extrabold cursor-pointer text-[#eaddcf] hover:bg-[#eaddcf] hover:text-black transition-colors hidden md:block"
            title={t('toggleBtn')}
          >
            ◀
          </button>
        </div>
      </div>

      <div id="mixer-section" className="flex-grow overflow-y-auto pr-1">
        <div id="tracks-mixer-container" className="flex flex-col">
          {tracks.map((track, idx) => (
            <TrackMixer
              key={track.id}
              lang={lang}
              isLeftHanded={isLeftHanded}
              track={track}
              index={idx}
              totalTracks={tracks.length}
              meter={meters ? meters[instrumentsConfig[track.instrumentIdx].id] : undefined}
              soloPatternPlayId={soloPatternPlayId}
              onMoveUp={() => onMoveUp(track.id)}
              onMoveDown={() => onMoveDown(track.id)}
              onInstrumentChange={(val) => onInstrumentChange(track.id, val)}
              onMuteToggle={() => onMuteToggle(track.id)}
              onSoloToggle={() => onSoloToggle(track.id)}
              onHideToggle={() => onHideToggle(track.id)}
              onDelete={() => onDelete(track.id)}
              onPatternNameChange={(patternId, name) => onPatternNameChange && onPatternNameChange(track.id, patternId, name)}
              onAddPatternVariation={(patternId) => onAddPatternVariation && onAddPatternVariation(track.id, patternId)}
              onUpdatePatternVariationProbability={(patternId, varId, prob) => onUpdatePatternVariationProbability && onUpdatePatternVariationProbability(track.id, patternId, varId, prob)}
              onTogglePatternVariationFirstTimeOnly={(patternId, varId, val) => onTogglePatternVariationFirstTimeOnly && onTogglePatternVariationFirstTimeOnly(track.id, patternId, varId, val)}
              onVariationStepValueChange={(patternId, varId, stepIdx, val) => onVariationStepValueChange && onVariationStepValueChange(track.id, patternId, varId, stepIdx, val)}
              onVolumeChange={(val) => onVolumeChange(track.id, val)}
              onPanChange={(val) => onPanChange(track.id, val)}
              onStepsChange={(patternId, steps) => onStepsChange(track.id, patternId, steps)}
              onStepValueChange={(patternId, stepIdx, val, lyrics, notes) => onStepValueChange(track.id, patternId, stepIdx, val, lyrics, notes)}
              onStepKeyDown={(patternId, stepIdx, key, cVal, el) => onStepKeyDown(track.id, patternId, stepIdx, key, cVal, el)}
              onVoiceTypeToggle={(patternId, stepIdx) => onVoiceTypeToggle(track.id, patternId, stepIdx)}
              onVoiceSylChange={(patternId, stepIdx, val) => onVoiceSylChange(track.id, patternId, stepIdx, val)}
              onVoiceNoteChange={(patternId, stepIdx, val) => onVoiceNoteChange(track.id, patternId, stepIdx, val)}
              onVoiceNoteBlur={(patternId, stepIdx, val) => onVoiceNoteBlur(track.id, patternId, stepIdx, val)}
              isPlaying={isPlaying}
              currentStepIndex={currentStepIndex}
              maxTicks={maxTicks}
              timeSig={timeSig}
              totalMeasures={totalMeasures}
              onSelectPattern={(patternId) => onTrackSelectPattern(track.id, patternId)}
              onPatternAssign={(patternId, measureIdx, val) => onPatternAssign(track.id, patternId, measureIdx, val)}
              onAddPattern={() => onAddPattern(track.id)}
              onDeletePattern={(patternId) => onDeletePattern(track.id, patternId)}
              onOpenDetailEditor={() => setEditingTrackId(track.id)}
              onStepTouchStart={onStepTouchStart}
              onCopyPattern={handleCopyPattern}
              onPastePattern={() => handlePastePattern(track.id)}
              onLoadLibraryPattern={onLoadLibraryPattern ? (pId, lib) => onLoadLibraryPattern(track.id, pId, lib) : undefined}
              canPaste={!!copiedPattern}
              onReorderPatterns={(patternId, direction) => onReorderPatterns && onReorderPatterns(track.id, patternId, direction)}
              isCollapsed={isTracksCollapsed}
            />
          ))}
        </div>
      </div>

      {editingTrackId !== null && tracks.find(t => t.id === editingTrackId) && (
        <InstrumentDetailEditor
          isMobile={window.innerWidth <= 768}
          lang={lang}
          isLeftHanded={isLeftHanded}
          track={tracks.find(t => t.id === editingTrackId)!}
          onClose={() => setEditingTrackId(null)}
          soloPatternPlayId={soloPatternPlayId}
          soloPatternVariationId={soloPatternVariationId}
          onStepTouchStart={onStepTouchStart}
          onPlaySoloPattern={handleStartSoloPattern}
          onStopSoloPattern={handleStopSoloPattern}
          onStepValueChange={(pid, sIdx, val, lyrics, notes) => onStepValueChange(editingTrackId, pid, sIdx, val, lyrics, notes)}
          onStepKeyDown={(pid, sIdx, k, cVal, el) => onStepKeyDown(editingTrackId, pid, sIdx, k, cVal, el)}
          onStepsChange={(pid, steps) => onStepsChange(editingTrackId, pid, steps)}
          onVoiceTypeToggle={(pid, sIdx) => onVoiceTypeToggle(editingTrackId, pid, sIdx)}
          onVoiceSylChange={(pid, sIdx, val) => onVoiceSylChange(editingTrackId, pid, sIdx, val)}
          onVoiceNoteChange={(pid, sIdx, val) => onVoiceNoteChange(editingTrackId, pid, sIdx, val)}
          onVoiceNoteBlur={(pid, sIdx, val) => onVoiceNoteBlur(editingTrackId, pid, sIdx, val)}
          onAddPattern={() => onAddPattern(editingTrackId)}
          onDeletePattern={(pid) => onDeletePattern(editingTrackId, pid)}
          onReorderPatterns={(pid, direction) => onReorderPatterns && onReorderPatterns(editingTrackId, pid, direction)}
          onAddPatternVariation={(pid) => onAddPatternVariation && onAddPatternVariation(editingTrackId, pid)}
          onUpdatePatternVariationProbability={(pid, vid, prob) => onUpdatePatternVariationProbability && onUpdatePatternVariationProbability(editingTrackId, pid, vid, prob)}
          onTogglePatternVariationFirstTimeOnly={(pid, vid, val) => onTogglePatternVariationFirstTimeOnly && onTogglePatternVariationFirstTimeOnly(editingTrackId, pid, vid, val)}
          onVariationStepValueChange={(pid, vid, sIdx, val) => onVariationStepValueChange && onVariationStepValueChange(editingTrackId, pid, vid, sIdx, val)}
          onDeletePatternVariation={(pid, vid) => onDeletePatternVariation && onDeletePatternVariation(editingTrackId, pid, vid)}
          onSelectPattern={(pid) => onTrackSelectPattern(editingTrackId, pid)}
          onPatternAssign={(pid, mIdx, val) => onPatternAssign(editingTrackId, pid, mIdx, val)}
          onVolumeChange={(val) => onVolumeChange(editingTrackId, val)}
          onMuteToggle={() => onMuteToggle(editingTrackId)}
          onSoloToggle={() => onSoloToggle(editingTrackId)}
          isPlaying={isPlaying}
          currentStepIndex={currentStepIndex}
          currentMeasure={currentMeasure}
          maxTicks={maxTicks}
          totalMeasures={totalMeasures}
          onStepTouchStart={onStepTouchStart}
          onCopyPattern={handleCopyPattern}
          onPastePattern={() => handlePastePattern(editingTrackId)}
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
        />
      )}
    </div>
  );
};

export const Mixer = React.memo(MixerComponent, (prevProps, nextProps) => {
  if (prevProps.isLeftPanelCollapsed && nextProps.isLeftPanelCollapsed) return true;
  return prevProps.isLeftPanelCollapsed === nextProps.isLeftPanelCollapsed;
});
