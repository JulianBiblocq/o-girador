import React, { useRef, useEffect, useState } from 'react';
import { TrackGroup, Language, Pattern } from '../types';
import { VerticalTrackMixer } from './VerticalTrackMixer';
import { InstrumentDetailEditor } from './InstrumentDetailEditor';

interface ConsoleMixerProps {
  lang: Language;
  tracks: TrackGroup[];
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onInstrumentChange: (trackId: number, instIdx: number) => void;
  onMuteToggle: (trackId: number) => void;
  onSoloToggle: (trackId: number) => void;
  onHideToggle: (trackId: number) => void;
  onDelete: (trackId: number) => void;
  onVolumeChange: (trackId: number, val: number) => void;
  onPanChange: (trackId: number, val: number) => void;
  onStepsChange: (trackId: number, patternId: number, steps: number) => void;
  onStepValueChange: (trackId: number, patternId: number, stepIdx: number, val: string) => void;
  onStepKeyDown: (trackId: number, patternId: number, stepIdx: number, key: string, currentVal: string, targetEl: HTMLInputElement) => void;
  onVoiceTypeToggle: (trackId: number, patternId: number, stepIdx: number) => void;
  onVoiceSylChange: (trackId: number, patternId: number, stepIdx: number, val: string) => void;
  onVoiceNoteChange: (trackId: number, patternId: number, stepIdx: number, val: string) => void;
  onVoiceNoteBlur: (trackId: number, patternId: number, stepIdx: number, val: string) => void;
  isPlaying: boolean;
  currentStepIndex: number;
  currentMeasure: number;
  maxTicks: number;
  timeSig: string;
  totalMeasures: number;
  onTrackSelectPattern: (trackId: number, patternId: number) => void;
  onPatternAssign: (trackId: number, patternId: number, measureIdx: number, val: boolean) => void;
  onAddPattern: (trackId: number) => void;
  onDeletePattern: (trackId: number, patternId: number) => void;
  onReverbChange: (trackId: number, val: number) => void;
  onStepVolumeChange: (trackId: number, patternId: number, stepIdx: number | number[], val: number) => void;
  onStepDecayChange: (trackId: number, patternId: number, stepIdx: number | number[], val: number) => void;
  onStepMicrotimingChange: (trackId: number, patternId: number, stepIdx: number | number[], val: number) => void;
  isSwingOn: boolean;
  isMobile: boolean;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  onCopyPattern: (pattern: any) => void;
  onPastePattern: (trackId: number, patternId: number) => void;
  canPaste: boolean;
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
}

export const ConsoleMixer: React.FC<ConsoleMixerProps> = ({
  isMobile,
  lang,
  tracks,
  onMoveUp,
  onMoveDown,
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
  currentStepIndex,
  currentMeasure,
  maxTicks,
  timeSig,
  totalMeasures,
  onTrackSelectPattern,
  onPatternAssign,
  onAddPattern,
  onDeletePattern,
  onReverbChange,
  onStepVolumeChange,
  onStepDecayChange,
  onStepMicrotimingChange,
  isSwingOn,
  onStepTouchStart,
  onCopyPattern,
  onPastePattern,
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
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);

  const editingTrack = tracks.find(t => t.id === editingTrackId);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        // Optionnel: On peut multiplier deltaY si on veut que le scroll aille plus vite
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div ref={scrollRef} className="flex-grow flex overflow-x-auto p-4 gap-4 custom-scrollbar">
        {tracks.map((track, idx) => (
          <VerticalTrackMixer
            key={track.id}
            lang={lang}
            track={track}
            index={idx}
            totalTracks={tracks.length}
            onMoveUp={() => onMoveUp(idx)}
            onMoveDown={() => onMoveDown(idx)}
            onInstrumentChange={(i) => onInstrumentChange(track.id, i)}
            onMuteToggle={() => onMuteToggle(track.id)}
            onSoloToggle={() => onSoloToggle(track.id)}
            onHideToggle={() => onHideToggle(track.id)}
            onDelete={() => onDelete(track.id)}
            onVolumeChange={(val) => onVolumeChange(track.id, val)}
            onReverbChange={(val) => onReverbChange(track.id, val)}
            onPanChange={(val) => onPanChange(track.id, val)}
            onStepsChange={(pid, steps) => onStepsChange(track.id, pid, steps)}
            onStepValueChange={(pid, sIdx, val) => onStepValueChange(track.id, pid, sIdx, val)}
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
            onCopyPattern={onCopyPattern}
            onPastePattern={onPastePattern}
            canPaste={canPaste}
          />
        ))}
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
          track={editingTrack}
          onClose={() => setEditingTrackId(null)}
          onStepValueChange={(pid, sIdx, val) => onStepValueChange(editingTrack.id, pid, sIdx, val)}
          onStepKeyDown={(pid, sIdx, k, cVal, el) => onStepKeyDown(editingTrack.id, pid, sIdx, k, cVal, el)}
          onStepsChange={(pid, steps) => onStepsChange(editingTrack.id, pid, steps)}
          onVoiceTypeToggle={(pid, sIdx) => onVoiceTypeToggle(editingTrack.id, pid, sIdx)}
          onVoiceSylChange={(pid, sIdx, val) => onVoiceSylChange(editingTrack.id, pid, sIdx, val)}
          onVoiceNoteChange={(pid, sIdx, val) => onVoiceNoteChange(editingTrack.id, pid, sIdx, val)}
          onVoiceNoteBlur={(pid, sIdx, val) => onVoiceNoteBlur(editingTrack.id, pid, sIdx, val)}
          onAddPattern={() => onAddPattern(editingTrack.id)}
          onDeletePattern={(pid) => onDeletePattern(editingTrack.id, pid)}
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
          onStepTouchStart={onStepTouchStart}
          onCopyPattern={onCopyPattern}
          onPastePattern={(pid) => onPastePattern(editingTrack.id, pid)}
          canPaste={canPaste}
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
        />
      )}
    </div>
  );
};
