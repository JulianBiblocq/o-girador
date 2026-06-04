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
  onStepVolumeChange: (trackId: number, patternId: number, stepIdx: number, val: number) => void;
  onStepDecayChange: (trackId: number, patternId: number, stepIdx: number, val: number) => void;
  onStepMicrotimingChange: (trackId: number, patternId: number, stepIdx: number, val: number) => void;
  reverbType: 'room' | 'studio' | 'hall';
  onReverbTypeChange: (type: 'room' | 'studio' | 'hall') => void;
  isSwingOn: boolean;
}

export const ConsoleMixer: React.FC<ConsoleMixerProps> = ({
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
  reverbType,
  onReverbTypeChange,
  isSwingOn,
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
      {/* ConsoleMixer Header / Global Effects Selector */}
      <div className="bg-[var(--cordel-bg)] border-b-[3px] border-[var(--cordel-border)] px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎛️</span>
          <span className="font-cactus font-bold text-lg tracking-wide uppercase text-[var(--cordel-text)]">
            Console de Mixagem
          </span>
        </div>

        {/* Global Reverb Choice Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase text-[var(--cordel-text)]/75">
            {lang === 'fr' ? 'Type de Réverbération' : 'Tipo de Reverberação'}:
          </span>
          <div className="flex gap-1.5">
            {[
              { id: 'room', label: lang === 'fr' ? 'Sala' : 'Sala' },
              { id: 'studio', label: lang === 'fr' ? 'Studio' : 'Estúdio' },
              { id: 'hall', label: lang === 'fr' ? 'Cathédrale' : 'Catedral' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => onReverbTypeChange(opt.id as any)}
                className={`px-3 py-1 text-xs font-cactus font-bold cordel-border-sm cordel-button cursor-pointer transition-colors ${
                  reverbType === opt.id
                    ? 'bg-[var(--cordel-border)] text-[var(--cordel-bg)]'
                    : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

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
        />
      )}
    </div>
  );
};
