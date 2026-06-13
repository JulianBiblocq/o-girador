import React, { useRef, useEffect, useState } from 'react';
import { TrackGroup, Language, Pattern } from '../types';
import { VerticalTrackMixer } from './VerticalTrackMixer';
import { InstrumentDetailEditor } from './InstrumentDetailEditor';
import { i18n, instrumentsConfig } from '../data';

interface ConsoleMixerProps {
  lang: Language;
  tracks: TrackGroup[];
  meters?: { [id: string]: any };
  masterMeter?: any;
  soloPatternPlayId?: number | null;
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
  onReorderPatterns?: (trackId: number, patternId: number, direction: 'up' | 'down') => void;
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
  onVocalBpmSyncToggle?: (patternId: number, sync: boolean) => void;
  masterVol: number;
  onMasterVolChange: (vol: number) => void;
  masterEQ: { low: number; mid: number; high: number };
  onMasterEQChange: (eq: { low: number; mid: number; high: number }) => void;
  masterCompressor: { threshold: number; ratio: number };
  onMasterCompressorChange: (comp: { threshold: number; ratio: number }) => void;
  onPatternNameChange?: (trackId: number, patternId: number, name: string) => void;
}

const ConsoleMixerComponent: React.FC<ConsoleMixerProps> = ({
  isMobile,
  lang,
  tracks,
  meters,
  masterMeter,
  soloPatternPlayId,
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
  onReorderPatterns,
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
  onVocalBpmSyncToggle,
  masterVol,
  onMasterVolChange,
  masterEQ,
  onMasterEQChange,
  masterCompressor,
  onMasterCompressorChange,
  onPatternNameChange,
}) => {
  const vuMeterRef = useRef<HTMLDivElement>(null);
  const dbTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;

    const updateMasterMeter = () => {
      const currentMeter = (window as any).masterMeterNode || masterMeter;
      
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
  }, [masterMeter]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);

  const t = (key: string) => (i18n[lang] as any)[key] || key;

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
            meter={meters ? meters[instrumentsConfig[track.instrumentIdx].id] : undefined}
            soloPatternPlayId={soloPatternPlayId}
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
            onPatternNameChange={(pid, name) => onPatternNameChange && onPatternNameChange(track.id, pid, name)}
            onReorderPatterns={(pid, direction) => onReorderPatterns && onReorderPatterns(track.id, pid, direction)}
          />
        ))}

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
                    <span>{lang === 'fr' ? 'Grave / Low' : 'Grave / Low'}</span>
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
                    <span>{lang === 'fr' ? 'Médium / Mid' : 'Médio / Mid'}</span>
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
                    <span>{lang === 'fr' ? 'Aigu / High' : 'Agudo / High'}</span>
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
                    <span>{lang === 'fr' ? 'Seuil / Threshold' : 'Limiar / Threshold'}</span>
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
                    className="vertical-fader z-10 h-[130px] w-8 cursor-pointer"
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
          onReorderPatterns={(pid, direction) => onReorderPatterns && onReorderPatterns(editingTrack.id, pid, direction)}
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
          onVocalBpmSyncToggle={onVocalBpmSyncToggle}
          onPatternNameChange={(pid, name) => onPatternNameChange && onPatternNameChange(editingTrack.id, pid, name)}
        />
      )}
    </div>
  );
};

export const ConsoleMixer = React.memo(ConsoleMixerComponent, (prevProps, nextProps) => {
  const getVisualSteps = (props: any) => {
    return props.tracks
      .map((t: any) => {
        const activePattern = t.patterns.find((p: any) => p.id === t.selectedPatternId) || t.patterns[0];
        if (!activePattern) return '-1';
        const currentStep = (props.isPlaying && props.currentStepIndex >= 0)
          ? Math.floor((props.currentStepIndex / props.maxTicks) * activePattern.steps)
          : -1;
        return `${t.id}:${currentStep}`;
      })
      .join(',');
  };

  const prevVisualSteps = getVisualSteps(prevProps);
  const nextVisualSteps = getVisualSteps(nextProps);

  if (prevVisualSteps !== nextVisualSteps) {
    return false;
  }

  const keys = Object.keys(prevProps) as Array<keyof ConsoleMixerProps>;
  for (const key of keys) {
    if (typeof prevProps[key] === 'function') {
      continue;
    }
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  return true;
});
