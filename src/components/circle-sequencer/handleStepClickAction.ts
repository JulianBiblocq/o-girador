/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pattern, InstrumentConfig, TrackGroup } from '../../types';
import { getNextStepValue } from '../../utils/instrumentStrokes';
import { getVisualStrokeSymbol } from '../../data';

export function handleStepClickAction(
  e: React.PointerEvent<HTMLCanvasElement>,
  ownerTrack: TrackGroup,
  activePattern: Pattern,
  stepIdx: number,
  inst: InstrumentConfig,
  currentVal: any,
  langPromptVoiceText: string,
  isLeftHanded: boolean,
  onStepChange: (trackId: number, patternId: number, stepIdx: number, newState: any, lyric?: string, note?: string) => void,
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number | [string, string],
    onSelect: (val: string | number | [string, string], merge?: boolean) => void,
    trackId: number,
    isSplit?: boolean
  ) => void
): void {
  if (inst.type === 'voice') {
    const currentNote = (activePattern.notes && activePattern.notes[stepIdx]) ? activePattern.notes[stepIdx] + ':' : '';
    const lyricPrompt = currentNote + (currentVal === 'P' ? '*' : '') + (activePattern.lyrics[stepIdx] || '');
    const typed = window.prompt(langPromptVoiceText, lyricPrompt);

    if (typed !== null) {
      const trimmed = typed.trim();
      if (trimmed === '') {
        onStepChange(ownerTrack.id, activePattern.id, stepIdx, 0, '', '');
      } else {
        let parsedNote = '';
        let parsedSyllable = trimmed;

        if (trimmed.includes(':')) {
          const parts = trimmed.split(':');
          parsedNote = parts[0].trim();
          parsedSyllable = parts[1].trim();
          if (/^[a-gA-G][#b]?$/.test(parsedNote)) {
            parsedNote += '4';
          }
        }

        let activeType = 'C';
        if (parsedSyllable.startsWith('*')) {
          activeType = 'P';
          parsedSyllable = parsedSyllable.substring(1).substring(0, 15);
        } else {
          parsedSyllable = parsedSyllable.substring(0, 15);
        }

        onStepChange(ownerTrack.id, activePattern.id, stepIdx, activeType, parsedSyllable, parsedNote.toUpperCase());
      }
    }
  } else {
    if (onStepTouchStart) {
      onStepTouchStart(
        e,
        activePattern.id,
        stepIdx,
        inst.id,
        currentVal,
        (nextVal) => {
          onStepChange(ownerTrack.id, activePattern.id, stepIdx, nextVal);
        },
        ownerTrack.id
      );
    } else {
      const visualVal = getVisualStrokeSymbol(currentVal, isLeftHanded, inst.id);
      const primaryVisualVal = Array.isArray(visualVal) ? visualVal[0] : visualVal;
      const nextVisualVal = getNextStepValue(inst.id, inst.type, primaryVisualVal);
      const nextSemanticVal = getVisualStrokeSymbol(nextVisualVal, isLeftHanded, inst.id);
      const primarySemanticVal = Array.isArray(nextSemanticVal) ? nextSemanticVal[0] : nextSemanticVal;
      onStepChange(ownerTrack.id, activePattern.id, stepIdx, primarySemanticVal);
    }
  }
}
