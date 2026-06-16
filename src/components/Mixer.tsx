/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TrackGroup, Language } from '../types';
import { TrackMixer } from './TrackMixer';
import { i18n, instrumentsConfig } from '../data';

interface MixerProps {
  lang: Language;
  isLeftHanded?: boolean;
  tracks: TrackGroup[];
  meters?: { [id: string]: any };
  soloPatternPlayId?: number | null;
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
  onStepValueChange: (trackId: number, patternId: number, stepIdx: number | number[], val: string | string[], lyrics?: string[], notes?: string[]) => void;
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
  onReorderPatterns?: (trackId: number, patternId: number, direction: 'up' | 'down') => void;
}

const MixerComponent: React.FC<MixerProps> = ({
  lang,
  isLeftHanded = false,
  tracks,
  meters,
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
  onReorderPatterns,
}) => {
  const t = (key: string) => (i18n[lang] as any)[key] || key;

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
              onStepTouchStart={onStepTouchStart}
              onCopyPattern={onCopyPattern}
              onPastePattern={onPastePattern}
              canPaste={canPaste}
              onReorderPatterns={(patternId, direction) => onReorderPatterns && onReorderPatterns(track.id, patternId, direction)}
            />
          ))}
        </div>
      </div>


    </div>
  );
};

export const Mixer = React.memo(MixerComponent, (prevProps, nextProps) => {
  if (prevProps.isLeftPanelCollapsed && nextProps.isLeftPanelCollapsed) return true;

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

  const keys = Object.keys(prevProps) as Array<keyof MixerProps>;
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
