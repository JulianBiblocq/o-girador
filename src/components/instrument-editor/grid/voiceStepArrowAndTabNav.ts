/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VoiceKeyCtx } from './voiceStepClipboardAndEdit';

export function handleVoiceArrowAndTabNav(
  e: React.KeyboardEvent<HTMLInputElement>,
  field: 'syl' | 'note',
  ctx: VoiceKeyCtx
): void {
  const input = e.currentTarget;
  const { i, steps, isPreRoll, preRollLength, focusVoiceStep, onVoiceNav } = ctx;

  // 5. Touche ArrowLeft : si curseur au début (0) ou sélection globale
  if (e.key === 'ArrowLeft') {
    const selStart = input.selectionStart;
    const selEnd = input.selectionEnd;
    const valLen = input.value.length;
    if (selStart === 0 || (selStart === 0 && selEnd === valLen)) {
      e.preventDefault();
      e.stopPropagation();
      if (focusVoiceStep) focusVoiceStep(i - 1, field, isPreRoll);
      else onVoiceNav(input, 'ArrowLeft', field);
    }
    return;
  }

  // 6. Touche ArrowRight : si curseur à la fin ou sélection globale
  if (e.key === 'ArrowRight') {
    const selStart = input.selectionStart;
    const selEnd = input.selectionEnd;
    const valLen = input.value.length;
    if (selStart === valLen || (selStart === 0 && selEnd === valLen)) {
      e.preventDefault();
      e.stopPropagation();
      if (focusVoiceStep) focusVoiceStep(i + 1, field, isPreRoll);
      else onVoiceNav(input, 'ArrowRight', field);
    }
    return;
  }

  // 7. Navigation verticale ArrowDown / ArrowUp
  if (e.key === 'ArrowDown') {
    if ((i % 16) < 8) {
      const targetIdx = i + 8;
      if (targetIdx < steps) {
        e.preventDefault();
        e.stopPropagation();
        if (focusVoiceStep) focusVoiceStep(targetIdx, field, isPreRoll);
        else onVoiceNav(input, 'ArrowDown', field);
        return;
      }
    }
  }

  if (e.key === 'ArrowUp') {
    if ((i % 16) >= 8) {
      const targetIdx = i - 8;
      if (targetIdx >= 0) {
        e.preventDefault();
        e.stopPropagation();
        if (focusVoiceStep) focusVoiceStep(targetIdx, field, isPreRoll);
        else onVoiceNav(input, 'ArrowUp', field);
        return;
      }
    }
  }

  // 8. Touche Tab
  if (e.key === 'Tab') {
    e.preventDefault();
    e.stopPropagation();
    const preRollLen = preRollLength || 16;
    if (!e.shiftKey && isPreRoll && i >= preRollLen - 1) {
      if (focusVoiceStep) focusVoiceStep(0, field, false);
      return;
    }
    if (e.shiftKey && !isPreRoll && i === 0) {
      if (focusVoiceStep) focusVoiceStep(preRollLen - 1, field, true);
      return;
    }
    const targetIdx = e.shiftKey ? i - 1 : i + 1;
    if (focusVoiceStep) focusVoiceStep(targetIdx, field, isPreRoll);
    else onVoiceNav(input, e.shiftKey ? 'ArrowLeft' : 'ArrowRight', field);
    return;
  }

  // 9. Touche Enter
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    if (focusVoiceStep) focusVoiceStep(i + 1, field, isPreRoll);
    else onVoiceNav(input, 'ArrowRight', field);
  }
}
