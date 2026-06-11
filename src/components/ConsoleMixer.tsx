import React, { useRef, useEffect, useState } from 'react';
import { TrackGroup, Language, Pattern } from '../types';
import { VerticalTrackMixer } from './VerticalTrackMixer';
import { InstrumentDetailEditor } from './InstrumentDetailEditor';
import { i18n } from '../data';

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
  masterVol: number;
  onMasterVolChange: (vol: number) => void;
  isEqOn: boolean;
  setIsEqOn: (on: boolean) => void;
  eqLow: number;
  setEqLow: (val: number) => void;
  eqMid: number;
  setEqMid: (val: number) => void;
  eqHigh: number;
  setEqHigh: (val: number) => void;
  isCompressorOn: boolean;
  setIsCompressorOn: (on: boolean) => void;
  compThreshold: number;
  setCompThreshold: (val: number) => void;
  compRatio: number;
  setCompRatio: (val: number) => void;
  compAttack: number;
  setCompAttack: (val: number) => void;
  compRelease: number;
  setCompRelease: (val: number) => void;
  isLimiterOn: boolean;
  setIsLimiterOn: (on: boolean) => void;
  limiterThreshold: number;
  setLimiterThreshold: (val: number) => void;
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
  masterVol,
  onMasterVolChange,
  isEqOn,
  setIsEqOn,
  eqLow,
  setEqLow,
  eqMid,
  setEqMid,
  eqHigh,
  setEqHigh,
  isCompressorOn,
  setIsCompressorOn,
  compThreshold,
  setCompThreshold,
  compRatio,
  setCompRatio,
  compAttack,
  setCompAttack,
  compRelease,
  setCompRelease,
  isLimiterOn,
  setIsLimiterOn,
  limiterThreshold,
  setLimiterThreshold,
}) => {
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

        {/* MASTER CHANNEL STRIP */}
        {tracks.length > 0 && (
          <div 
            className="flex flex-col bg-[var(--cordel-bg)] cordel-border w-[260px] shrink-0 text-[var(--cordel-text)] overflow-hidden relative pb-4 transition-colors"
            style={{
              '--fader-thumb-bg': '#8b2a1a',
              '--fader-thumb-border': 'var(--cordel-border)',
            } as React.CSSProperties}
          >
            {/* Header: Title */}
            <div className="relative p-3 pb-1 flex justify-center border-b-[3px] border-[var(--cordel-border)] bg-[var(--cordel-wood)] text-[var(--cordel-text)]">
              <span className="font-cactus font-bold text-base tracking-widest uppercase">
                MASTER
              </span>
            </div>

            {/* Content Container */}
            <div className="relative z-10 flex-1 p-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar border-b-[3px] border-[var(--cordel-border)]">
              

              {/* EFFECT 2: EQ3 (3-BAND EQ) */}
              <div className="bg-[var(--cordel-bg)] p-2 cordel-border-sm flex flex-col gap-1.5">
                <div className="flex justify-between items-center border-b border-[var(--cordel-border)]/20 pb-0.5">
                  <span className="font-cactus font-bold text-xs">
                    {t('eq')}
                  </span>
                  <button
                    onClick={() => setIsEqOn(!isEqOn)}
                    className={`px-1.5 py-0.5 text-[10px] font-bold cordel-border-sm ${
                      isEqOn 
                        ? 'bg-[var(--cordel-wood)] text-[var(--cordel-text)]' 
                        : 'bg-transparent text-[var(--cordel-text)]/60'
                    }`}
                  >
                    {isEqOn ? 'ON' : 'BYPASS'}
                  </button>
                </div>
                {isEqOn && (
                  <div className="flex flex-col gap-2 pt-0.5">
                    {/* Low gain */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[9px] opacity-80">
                        <span>{t('eqLow')}</span>
                        <span>{eqLow > 0 ? `+${eqLow}` : eqLow} dB</span>
                      </div>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        value={eqLow}
                        onChange={(e) => setEqLow(parseInt(e.target.value))}
                        className="w-full h-1 bg-[var(--cordel-text)] rounded outline-none cursor-pointer"
                        style={{ accentColor: 'var(--cordel-wood)' }}
                      />
                    </div>
                    {/* Mid gain */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[9px] opacity-80">
                        <span>{t('eqMid')}</span>
                        <span>{eqMid > 0 ? `+${eqMid}` : eqMid} dB</span>
                      </div>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        value={eqMid}
                        onChange={(e) => setEqMid(parseInt(e.target.value))}
                        className="w-full h-1 bg-[var(--cordel-text)] rounded outline-none cursor-pointer"
                        style={{ accentColor: 'var(--cordel-wood)' }}
                      />
                    </div>
                    {/* High gain */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[9px] opacity-80">
                        <span>{t('eqHigh')}</span>
                        <span>{eqHigh > 0 ? `+${eqHigh}` : eqHigh} dB</span>
                      </div>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        value={eqHigh}
                        onChange={(e) => setEqHigh(parseInt(e.target.value))}
                        className="w-full h-1 bg-[var(--cordel-text)] rounded outline-none cursor-pointer"
                        style={{ accentColor: 'var(--cordel-wood)' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* EFFECT 3: COMPRESSOR */}
              <div className="bg-[var(--cordel-bg)] p-2 cordel-border-sm flex flex-col gap-1.5">
                <div className="flex justify-between items-center border-b border-[var(--cordel-border)]/20 pb-0.5">
                  <span className="font-cactus font-bold text-xs">
                    {t('compressor')}
                  </span>
                  <button
                    onClick={() => setIsCompressorOn(!isCompressorOn)}
                    className={`px-1.5 py-0.5 text-[10px] font-bold cordel-border-sm ${
                      isCompressorOn 
                        ? 'bg-[var(--cordel-wood)] text-[var(--cordel-text)]' 
                        : 'bg-transparent text-[var(--cordel-text)]/60'
                    }`}
                  >
                    {isCompressorOn ? 'ON' : 'BYPASS'}
                  </button>
                </div>
                {isCompressorOn && (
                  <div className="flex flex-col gap-2 pt-0.5">
                    {/* Threshold */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[9px] opacity-80">
                        <span>{t('threshold')}</span>
                        <span>{compThreshold} dB</span>
                      </div>
                      <input
                        type="range"
                        min="-40"
                        max="0"
                        value={compThreshold}
                        onChange={(e) => setCompThreshold(parseInt(e.target.value))}
                        className="w-full h-1 bg-[var(--cordel-text)] rounded outline-none cursor-pointer"
                        style={{ accentColor: 'var(--cordel-wood)' }}
                      />
                    </div>
                    {/* Ratio */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[9px] opacity-80">
                        <span>{t('ratio')}</span>
                        <span>{compRatio}:1</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={compRatio}
                        onChange={(e) => setCompRatio(parseInt(e.target.value))}
                        className="w-full h-1 bg-[var(--cordel-text)] rounded outline-none cursor-pointer"
                        style={{ accentColor: 'var(--cordel-wood)' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* EFFECT 4: LIMITER */}
              <div className="bg-[var(--cordel-bg)] p-2 cordel-border-sm flex flex-col gap-1.5">
                <div className="flex justify-between items-center border-b border-[var(--cordel-border)]/20 pb-0.5">
                  <span className="font-cactus font-bold text-xs flex items-center gap-1">
                    {t('limiter')}
                    <span className="text-[8px] text-[var(--cordel-wood)] font-sans opacity-70">({t('recommendation')})</span>
                  </span>
                  <button
                    onClick={() => setIsLimiterOn(!isLimiterOn)}
                    className={`px-1.5 py-0.5 text-[10px] font-bold cordel-border-sm ${
                      isLimiterOn 
                        ? 'bg-[var(--cordel-wood)] text-[var(--cordel-text)]' 
                        : 'bg-transparent text-[var(--cordel-text)]/60'
                    }`}
                  >
                    {isLimiterOn ? 'ON' : 'BYPASS'}
                  </button>
                </div>
                {isLimiterOn && (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] opacity-80">
                      <span>{t('threshold')}</span>
                      <span>{limiterThreshold} dB</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="0"
                      value={limiterThreshold}
                      onChange={(e) => setLimiterThreshold(parseInt(e.target.value))}
                      className="w-full h-1 bg-[var(--cordel-text)] rounded outline-none cursor-pointer"
                      style={{ accentColor: 'var(--cordel-wood)' }}
                    />
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Section: Volume & LED VU Meter */}
            <div className="relative z-10 p-4 pt-4 flex justify-around items-end h-[200px] gap-3">
              
              {/* Master Volume Fader Column */}
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
                <span className="text-[10px] font-bold text-[var(--cordel-text)]">
                  {masterVol === -40 ? '-∞' : `${masterVol > 0 ? '+' : ''}${masterVol} dB`}
                </span>
              </div>

              {/* Master LED VU Meter */}
              <div className="flex flex-col items-center gap-1.5 h-full">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Meter</span>
                <div className="w-3.5 h-[145px] bg-[var(--cordel-bg)] cordel-border-sm relative overflow-hidden">
                  <div
                    id="meter-bar-master"
                    className="meter-vertical absolute bottom-0 left-0 right-0 bg-[var(--cordel-wood)] w-full transition-all duration-[0.05s]"
                    style={{ height: '0%' }}
                  />
                </div>
                <div className="h-[15px]" />
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
