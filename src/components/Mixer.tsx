/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TrackGroup, Language } from '../types';
import { TrackMixer } from './TrackMixer';
import { i18n } from '../data';

interface MixerProps {
  lang: Language;
  tracks: TrackGroup[];
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onInstrumentChange: (id: number, instIdx: number) => void;
  onMuteToggle: (id: number) => void;
  onSoloToggle: (id: number) => void;
  onHideToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onVolumeChange: (id: number, val: number) => void;
  onPanChange: (id: number, val: number) => void;
  onStepsChange: (trackId: number, patternId: number, steps: number) => void;
  onStepValueChange: (trackId: number, patternId: number, stepIdx: number, val: string) => void;
  onStepKeyDown: (trackId: number, patternId: number, stepIdx: number, key: string, currentVal: string, targetEl: HTMLInputElement) => void;
  onVoiceTypeToggle: (trackId: number, patternId: number, stepIdx: number) => void;
  onVoiceSylChange: (trackId: number, patternId: number, stepIdx: number, val: string) => void;
  onVoiceNoteChange: (trackId: number, patternId: number, stepIdx: number, val: string) => void;
  onVoiceNoteBlur: (trackId: number, patternId: number, stepIdx: number, val: string) => void;
  isPlaying: boolean;
  currentStepIndex: number;
  maxTicks: number;
  timeSig: string;
  isLeftPanelCollapsed: boolean;
  onToggleLeftPanel: () => void;
  totalMeasures: number;
  onTrackSelectPattern: (trackId: number, patternId: number) => void;
  onPatternAssign: (trackId: number, patternId: number, measureIdx: number, val: boolean) => void;
  onAddPattern: (trackId: number) => void;
  onDeletePattern: (trackId: number, patternId: number) => void;
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

export const Mixer: React.FC<MixerProps> = ({
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
  maxTicks,
  timeSig,
  isLeftPanelCollapsed,
  onToggleLeftPanel,
  totalMeasures,
  onTrackSelectPattern,
  onPatternAssign,
  onAddPattern,
  onDeletePattern,
  onStepTouchStart,
  onCopyPattern,
  onPastePattern,
  canPaste,
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
  const t = (key: string) => (i18n[lang] as any)[key] || key;
  const [isMasterFxExpanded, setIsMasterFxExpanded] = useState(false);

  if (isLeftPanelCollapsed) return null;

  return (
    <div
      id="left-panel"
      className="w-[400px] min-w-[400px] h-full bg-gradient-to-b from-[#1c1815] to-[#120e0c] border-r-2 border-[#eaddcf] flex flex-col p-5 box-border z-10 transition-all duration-300 overflow-hidden"
    >
      <div className="flex justify-between items-center border-b border-[#333] pb-2.5 mb-4 shrink-0">
        <span className="font-cactus text-2xl text-[#eaddcf] tracking-widest uppercase font-medium">
          {t('mixer')}
        </span>
        <button
          onClick={onToggleLeftPanel}
          className="bg-transparent border border-[#444] px-2.5 py-1 text-sm font-extrabold cursor-pointer text-[#eaddcf] hover:bg-[#eaddcf] hover:text-black transition-colors hidden md:block"
          title={t('toggleBtn')}
        >
          ◀
        </button>
      </div>

      <div id="mixer-section" className="flex-grow overflow-y-auto pr-1">
        <div id="tracks-mixer-container" className="flex flex-col">
          {tracks.map((track, idx) => (
            <TrackMixer
              key={track.id}
              lang={lang}
              track={track}
              index={idx}
              totalTracks={tracks.length}
              onMoveUp={() => onMoveUp(track.id)}
              onMoveDown={() => onMoveDown(track.id)}
              onInstrumentChange={(val) => onInstrumentChange(track.id, val)}
              onMuteToggle={() => onMuteToggle(track.id)}
              onSoloToggle={() => onSoloToggle(track.id)}
              onHideToggle={() => onHideToggle(track.id)}
              onDelete={() => onDelete(track.id)}
              onVolumeChange={(val) => onVolumeChange(track.id, val)}
              onPanChange={(val) => onPanChange(track.id, val)}
              onStepsChange={(patternId, steps) => onStepsChange(track.id, patternId, steps)}
              onStepValueChange={(patternId, stepIdx, val) => onStepValueChange(track.id, patternId, stepIdx, val)}
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
              onStepTouchStart={onStepTouchStart}
              onCopyPattern={onCopyPattern}
              onPastePattern={onPastePattern}
              canPaste={canPaste}
            />
          ))}
        </div>
      </div>

      {/* MASTER FX PANEL */}
      {tracks.length > 0 && (
        <div className="mt-4 border-t border-[#333] pt-4 shrink-0">
          <div 
            onClick={() => setIsMasterFxExpanded(!isMasterFxExpanded)}
            className="flex justify-between items-center bg-[#1a1a1a] p-2.5 cordel-border-sm cursor-pointer hover:bg-[#222] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-cactus font-bold text-sm text-[#eaddcf] tracking-wider">
                {t('masterFx')}
              </span>
              {/* Quick indicators of what's active */}
              <div className="flex gap-1">
                {isEqOn && <span className="text-[9px] bg-[var(--cordel-wood)] text-white px-1 font-bold">EQ</span>}
                {isCompressorOn && <span className="text-[9px] bg-[var(--cordel-wood)] text-white px-1 font-bold">CP</span>}
                {isLimiterOn && <span className="text-[9px] bg-[var(--cordel-wood)] text-white px-1 font-bold">LM</span>}
              </div>
            </div>
            <span className="text-[#eaddcf] text-xs font-bold">
              {isMasterFxExpanded ? '▼' : '▲'}
            </span>
          </div>

          {isMasterFxExpanded ? (
            <div className="mt-2.5 bg-[#14100e] p-3 cordel-border-sm flex flex-col gap-3 max-h-[260px] overflow-y-auto custom-scrollbar">
              
              {/* Volume & VU Meter Row */}
              <div className="flex items-center gap-3 bg-[#1c1815] p-2 cordel-border-sm">
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-[#eaddcf] opacity-80">
                    <span className="font-bold">Master Vol</span>
                    <span>{masterVol === -40 ? '-∞' : `${masterVol > 0 ? '+' : ''}${masterVol} dB`}</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="6"
                    step="0.5"
                    value={masterVol}
                    onChange={(e) => onMasterVolChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-[var(--cordel-text)] rounded outline-none cursor-pointer"
                    style={{ accentColor: 'var(--cordel-wood)' }}
                  />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[8px] text-[#eaddcf]/60 uppercase font-bold">Meter</span>
                  <div className="w-16 h-3 bg-black cordel-border-sm relative overflow-hidden">
                    <div 
                      id="meter-bar-master-horizontal" 
                      className="absolute left-0 top-0 bottom-0 bg-[var(--cordel-wood)] transition-all duration-[0.05s]"
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>
              </div>


              {/* EQ */}
              <div className="bg-[#1c1815] p-2 cordel-border-sm flex flex-col gap-1.5">
                <div className="flex justify-between items-center border-b border-[#333] pb-1">
                  <span className="font-cactus font-bold text-xs text-[#eaddcf]">{t('eq')}</span>
                  <button 
                    onClick={() => setIsEqOn(!isEqOn)}
                    className={`px-1.5 py-0.5 text-[9px] font-bold cordel-border-sm ${isEqOn ? 'bg-[var(--cordel-wood)] text-white' : 'bg-transparent text-[#eaddcf]/50'}`}
                  >
                    {isEqOn ? 'ON' : 'BYPASS'}
                  </button>
                </div>
                {isEqOn && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[9px] text-[#eaddcf]/80">
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
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[9px] text-[#eaddcf]/80">
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
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[9px] text-[#eaddcf]/80">
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

              {/* Compressor */}
              <div className="bg-[#1c1815] p-2 cordel-border-sm flex flex-col gap-1.5">
                <div className="flex justify-between items-center border-b border-[#333] pb-1">
                  <span className="font-cactus font-bold text-xs text-[#eaddcf]">{t('compressor')}</span>
                  <button 
                    onClick={() => setIsCompressorOn(!isCompressorOn)}
                    className={`px-1.5 py-0.5 text-[9px] font-bold cordel-border-sm ${isCompressorOn ? 'bg-[var(--cordel-wood)] text-white' : 'bg-transparent text-[#eaddcf]/50'}`}
                  >
                    {isCompressorOn ? 'ON' : 'BYPASS'}
                  </button>
                </div>
                {isCompressorOn && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[9px] text-[#eaddcf]/80">
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
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[9px] text-[#eaddcf]/80">
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

              {/* Limiter */}
              <div className="bg-[#1c1815] p-2 cordel-border-sm flex flex-col gap-1.5">
                <div className="flex justify-between items-center border-b border-[#333] pb-1">
                  <span className="font-cactus font-bold text-xs text-[#eaddcf]">
                    {t('limiter')}
                    <span className="text-[8px] text-[var(--cordel-wood)] font-sans opacity-70 ml-1">({t('recommendation')})</span>
                  </span>
                  <button 
                    onClick={() => setIsLimiterOn(!isLimiterOn)}
                    className={`px-1.5 py-0.5 text-[9px] font-bold cordel-border-sm ${isLimiterOn ? 'bg-[var(--cordel-wood)] text-white' : 'bg-transparent text-[#eaddcf]/50'}`}
                  >
                    {isLimiterOn ? 'ON' : 'BYPASS'}
                  </button>
                </div>
                {isLimiterOn && (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] text-[#eaddcf]/80">
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
          ) : (
            /* Collapsed simple fader section */
            <div className="mt-2 bg-[#14100e] p-2.5 cordel-border-sm flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] text-[#eaddcf]/60 uppercase font-bold shrink-0">Vol</span>
                <input
                  type="range"
                  min="-40"
                  max="6"
                  step="0.5"
                  value={masterVol}
                  onChange={(e) => onMasterVolChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[var(--cordel-text)] rounded outline-none cursor-pointer"
                  style={{ accentColor: 'var(--cordel-wood)' }}
                />
              </div>
              <div className="w-12 h-2.5 bg-black cordel-border-sm relative overflow-hidden shrink-0">
                <div 
                  id="meter-bar-master-horizontal-mini" 
                  className="absolute left-0 top-0 bottom-0 bg-[var(--cordel-wood)] transition-all duration-[0.05s]"
                  style={{ width: '0%' }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
