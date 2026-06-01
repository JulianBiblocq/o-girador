/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Circle, Language } from '../types';
import { TrackMixer } from './TrackMixer';
import { i18n } from '../data';

interface MixerProps {
  lang: Language;
  circles: Circle[];
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onInstrumentChange: (id: number, instIdx: number) => void;
  onMuteToggle: (id: number) => void;
  onSoloToggle: (id: number) => void;
  onHideToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onVolumeChange: (id: number, val: number) => void;
  onStepsChange: (id: number, steps: number) => void;
  onRepeatsChange: (id: number, repeats: number) => void;
  onStepValueChange: (id: number, stepIdx: number, val: string) => void;
  onStepKeyDown: (id: number, stepIdx: number, key: string, currentVal: string, targetEl: HTMLInputElement) => void;
  onVoiceTypeToggle: (id: number, stepIdx: number) => void;
  onVoiceSylChange: (id: number, stepIdx: number, val: string) => void;
  onVoiceNoteChange: (id: number, stepIdx: number, val: string) => void;
  onVoiceNoteBlur: (id: number, stepIdx: number, val: string) => void;
  isPlaying: boolean;
  currentStepIndex: number;
  maxTicks: number;
  timeSig: string;
  isLeftPanelCollapsed: boolean;
  onToggleLeftPanel: () => void;
}

export const Mixer: React.FC<MixerProps> = ({
  lang,
  circles,
  onMoveUp,
  onMoveDown,
  onInstrumentChange,
  onMuteToggle,
  onSoloToggle,
  onHideToggle,
  onDelete,
  onVolumeChange,
  onStepsChange,
  onRepeatsChange,
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
          className="bg-transparent border border-[#444] px-2.5 py-1 text-sm font-extrabold cursor-pointer text-[#eaddcf] hover:bg-[#eaddcf] hover:text-black transition-colors"
          title={t('toggleBtn')}
        >
          ◀
        </button>
      </div>

      <div id="mixer-section" className="flex-grow overflow-y-auto pr-1">
        <div id="tracks-mixer-container" className="flex flex-col">
          {circles.map((circle, idx) => (
            <TrackMixer
              key={circle.id}
              lang={lang}
              circle={circle}
              index={idx}
              totalCircles={circles.length}
              onMoveUp={() => onMoveUp(circle.id)}
              onMoveDown={() => onMoveDown(circle.id)}
              onInstrumentChange={(val) => onInstrumentChange(circle.id, val)}
              onMuteToggle={() => onMuteToggle(circle.id)}
              onSoloToggle={() => onSoloToggle(circle.id)}
              onHideToggle={() => onHideToggle(circle.id)}
              onDelete={() => onDelete(circle.id)}
              onVolumeChange={(val) => onVolumeChange(circle.id, val)}
              onStepsChange={(steps) => onStepsChange(circle.id, steps)}
              onRepeatsChange={(repeats) => onRepeatsChange(circle.id, repeats)}
              onStepValueChange={(stepIdx, val) => onStepValueChange(circle.id, stepIdx, val)}
              onStepKeyDown={(stepIdx, key, cVal, el) => onStepKeyDown(circle.id, stepIdx, key, cVal, el)}
              onVoiceTypeToggle={(stepIdx) => onVoiceTypeToggle(circle.id, stepIdx)}
              onVoiceSylChange={(stepIdx, val) => onVoiceSylChange(circle.id, stepIdx, val)}
              onVoiceNoteChange={(stepIdx, val) => onVoiceNoteChange(circle.id, stepIdx, val)}
              onVoiceNoteBlur={(stepIdx, val) => onVoiceNoteBlur(circle.id, stepIdx, val)}
              isPlaying={isPlaying}
              currentStepIndex={currentStepIndex}
              maxTicks={maxTicks}
              timeSig={timeSig}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
