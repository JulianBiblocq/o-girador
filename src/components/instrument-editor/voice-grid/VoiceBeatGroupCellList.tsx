
import React from 'react';
import { Pattern, StepSculptValue } from '../../../types';
import { isVoiceStepProlongation } from '../../../utils/musicTheory';
import { VoiceStepCell } from '../grid/VoiceStepCell';

const getSculptNumber = (val: StepSculptValue | undefined, fallback = 100): number => {
  if (val === undefined) return fallback;
  if (Array.isArray(val)) return val[0] ?? fallback;
  return typeof val === 'number' ? val : fallback;
};

interface VoiceBeatGroupCellListProps {
  groupItem: { beatIndex: number; steps: number[]; resolution: number };
  measureIndex: number;
  pattern: Pattern;
  trackId: number;
  lang: string;
  isTupletEditMode: boolean;
  selectedPatternId: number | null;
  selectedStepIdx: number | null;
  selectedStepIsPreRoll?: boolean | null;
  selectedStepRange: any;
  isMultiSelectActive: boolean;
  preRollLengthComputed: number;
  swingOffsets: Float32Array | number[];
  isStepInRange: (range: any, cellIsPreRoll: boolean, cellStep: number, preRollCount: number) => boolean;
  onBeatResolutionChange: (patternId: number, beatIndex: number, newResolution: number) => void;
  handleVoiceStepClear: (trackId: number, patternId: number, index: number, isPreRoll?: boolean) => void;
  handleVoiceTouchStart: (e: React.TouchEvent<HTMLDivElement>, index: number) => void;
  handleVoiceMouseDown: (e: React.MouseEvent<HTMLDivElement>, index: number) => void;
  handleVoiceMouseEnter: (index: number, e?: React.MouseEvent) => void;
  handleVoiceTypeToggle: (trackId: number, patternId: number, index: number) => void;
  handleVoiceSylChange: (trackId: number, patternId: number, index: number, value: string) => void;
  handleVoiceNoteChange: (trackId: number, patternId: number, index: number, value: string) => void;
  handleVoiceNoteBlur: (trackId: number, patternId: number, index: number, value: string) => void;
  handleVoiceFocusStep: (index: number, isPreRoll?: boolean) => void;
  handleVoiceContextMenu: (e: React.MouseEvent<any>, index: number, isPreRoll?: boolean) => void;
  handleSelectStepForSculpt: (index: number) => void;
  handleVoiceNav: (target: HTMLInputElement, key: string, field: 'syl' | 'note') => void;
  focusVoiceStep?: (stepIdx: number, type?: 'note' | 'syl', forceInPreRoll?: boolean) => void;
}

export const VoiceBeatGroupCellList: React.FC<VoiceBeatGroupCellListProps> = React.memo((props) => {
  const {
    groupItem, measureIndex: m, pattern, trackId, lang, isTupletEditMode, selectedPatternId,
    selectedStepIdx, selectedStepIsPreRoll, selectedStepRange, isMultiSelectActive,
    preRollLengthComputed, swingOffsets, isStepInRange, onBeatResolutionChange,
    handleVoiceStepClear, handleVoiceTouchStart, handleVoiceMouseDown, handleVoiceMouseEnter,
    handleVoiceTypeToggle, handleVoiceSylChange, handleVoiceNoteChange, handleVoiceNoteBlur,
    handleVoiceFocusStep, handleVoiceContextMenu, handleSelectStepForSculpt, handleVoiceNav, focusVoiceStep,
  } = props;

  const beatIdx = groupItem.beatIndex;
  const groupSteps = groupItem.steps;
  const currentRes = groupItem.resolution;

  return (
    <div key={`beat-group-${m}-${beatIdx}`} className="flex-1 min-w-0 flex flex-col gap-1">
      <div className="flex items-center justify-between px-1 text-[9px] font-bold text-[#1a1a1a]/50 select-none">
        <span className="tracking-wide">
          {lang === 'fr' ? `T${beatIdx + 1}` : `T${beatIdx + 1}`}
          <span className="text-[8px] font-normal ml-0.5 opacity-70">({groupSteps.length}p)</span>
        </span>
        {isTupletEditMode && (
          <select
            value={currentRes}
            onChange={(e) => onBeatResolutionChange(pattern.id, beatIdx, parseInt(e.target.value, 10))}
            className="text-[9px] bg-[#ece4d0] border border-[#1a1a1a]/20 rounded-xs outline-none px-0.5 py-0 font-bold cursor-pointer hover:bg-[#ece4d0]/80 transition-colors"
          >
            <option value="3">3 (Triolet)</option>
            <option value="4">4 (D.Croche)</option>
            <option value="6">6 (Sextolet)</option>
            <option value="8">8 (Fusa)</option>
          </select>
        )}
      </div>

      <div className="flex gap-1 sm:gap-2 justify-between p-1 bg-[#ece4d0]/40 border border-[#1a1a1a]/10 rounded-sm">
        {groupSteps.map((i, indexInGroup) => {
          const state = pattern?.activeSteps?.[i];
          const syl = pattern?.lyrics?.[i] || '';
          const note = pattern?.notes?.[i] || '';
          const isSelected = selectedPatternId === pattern.id && selectedStepIdx === i && Boolean(selectedStepIsPreRoll) === false;
          const isStepActive = (val: any) => val !== undefined && val !== null && val !== 0 && val !== '0';
          const curActive = isStepActive(state);
          const curNoteTrim = (note || '').trim();
          const prevActive = i > 0 ? isStepActive(pattern?.activeSteps?.[i - 1]) : false;
          const prevNote = i > 0 ? (pattern?.notes?.[i - 1] || '').trim() : '';
          const nextActive = i < (pattern?.steps ?? 16) - 1 ? isStepActive(pattern?.activeSteps?.[i + 1]) : false;
          const nextNote = i < (pattern?.steps ?? 16) - 1 ? (pattern?.notes?.[i + 1] || '').trim() : '';
          const nextSyl = i < (pattern?.steps ?? 16) - 1 ? (pattern?.lyrics?.[i + 1] || '').trim() : '';

          const isProlongation = isVoiceStepProlongation(curActive, prevActive, curNoteTrim, prevNote, syl);
          const isFollowedByProlongation = isVoiceStepProlongation(nextActive, curActive, nextNote, curNoteTrim, nextSyl);
          const manualMicro = pattern?.microtimings?.[i] ?? 0;
          const totalShift = Math.max(-100, Math.min(100, getSculptNumber(manualMicro, 0) + ((swingOffsets as any)?.[i] || 0)));
          const isLinked = Boolean(syl && !syl.endsWith(' ') && i < (pattern?.steps ?? 16) - 1 && (pattern?.lyrics?.[i + 1] || '').trim() !== '');

          return (
            <VoiceStepCell
              key={`voice-step-${i}`} i={i} steps={pattern?.steps ?? 16} trackId={trackId} patternId={pattern.id}
              state={state} syl={syl} note={note} isSelected={isSelected}
              isInRange={isStepInRange(selectedStepRange, false, i, preRollLengthComputed)} preRollLength={preRollLengthComputed}
              isMultiSelectActive={isMultiSelectActive} manualMicro={manualMicro} totalShift={totalShift}
              shiftPx={(totalShift / 100) * 8} isLinked={isLinked} volume={pattern.volumes?.[i] ?? 80} decay={pattern.decays?.[i] ?? 10}
              isProlongation={isProlongation} isFollowedByProlongation={isFollowedByProlongation} isFirstInBeat={indexInGroup === 0}
              onVoiceStepClear={handleVoiceStepClear} onTouchStart={handleVoiceTouchStart} onMouseDown={handleVoiceMouseDown}
              onMouseEnter={handleVoiceMouseEnter} onVoiceTypeToggle={handleVoiceTypeToggle} onVoiceSylChange={handleVoiceSylChange}
              onVoiceNoteChange={handleVoiceNoteChange} onVoiceNoteBlur={handleVoiceNoteBlur} onFocusStep={(idx) => handleVoiceFocusStep(idx, false)}
              onContextMenu={(e) => handleVoiceContextMenu(e, i, false)} onSelectForSculpt={handleSelectStepForSculpt}
              onVoiceNav={handleVoiceNav} focusVoiceStep={focusVoiceStep}
            />
          );
        })}
      </div>
    </div>
  );
});

VoiceBeatGroupCellList.displayName = 'VoiceBeatGroupCellList';
