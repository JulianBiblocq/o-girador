/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pattern } from '../../types';

const isStepValActive = (val: any) =>
  val !== 0 && val !== '0' && val !== '' && val !== undefined && val !== null && val !== '-';

export function extractSeparateVoiceStep(
  i: number,
  effectiveStepCount: number,
  puxPattern: Pattern | null,
  coroPattern: Pattern | null,
  nextPuxPattern: Pattern | null,
  nextCoroPattern: Pattern | null,
  puxPlayingSteps: any,
  coroPlayingSteps: any,
  soloPlayId: number | null | undefined
): { pActive: boolean; pNote: string; pSyl: string; pAnacrusis: boolean; cActive: boolean; cNote: string; cSyl: string; cAnacrusis: boolean } {
  let pActive = false;
  let pNote = '';
  let pSyl = '';
  let pAnacrusis = false;

  let cActive = false;
  let cNote = '';
  let cSyl = '';
  let cAnacrusis = false;

  if (puxPattern && puxPlayingSteps && isStepValActive(puxPlayingSteps[i])) {
    pActive = true;
    pNote = (puxPattern.notes?.[i] || '').trim();
    pSyl = (puxPattern.lyrics?.[i] || '').trim();
  }
  if (coroPattern && coroPlayingSteps && isStepValActive(coroPlayingSteps[i])) {
    cActive = true;
    cNote = (coroPattern.notes?.[i] || '').trim();
    cSyl = (coroPattern.lyrics?.[i] || '').trim();
  }

  if (soloPlayId !== undefined && soloPlayId !== null) {
    if (!pActive && isStepValActive(puxPattern?.preRollActiveSteps?.[i])) {
      pActive = true;
      pNote = (puxPattern?.preRollNotes?.[i] || '').trim();
      pSyl = (puxPattern?.preRollLyrics?.[i] || '').trim();
      pAnacrusis = true;
    }
    if (!cActive && isStepValActive(coroPattern?.preRollActiveSteps?.[i])) {
      cActive = true;
      cNote = (coroPattern?.preRollNotes?.[i] || '').trim();
      cSyl = (coroPattern?.preRollLyrics?.[i] || '').trim();
      cAnacrusis = true;
    }
  } else {
    const isPickupWindow = i >= effectiveStepCount - 4;
    if (isPickupWindow && !pActive && !cActive) {
      if (isStepValActive(nextPuxPattern?.preRollActiveSteps?.[i])) {
        pActive = true;
        pNote = (nextPuxPattern?.preRollNotes?.[i] || '').trim();
        pSyl = (nextPuxPattern?.preRollLyrics?.[i] || '').trim();
        pAnacrusis = true;
      }
      if (isStepValActive(nextCoroPattern?.preRollActiveSteps?.[i])) {
        cActive = true;
        cNote = (nextCoroPattern?.preRollNotes?.[i] || '').trim();
        cSyl = (nextCoroPattern?.preRollLyrics?.[i] || '').trim();
        cAnacrusis = true;
      }
    }
  }

  return { pActive, pNote, pSyl, pAnacrusis, cActive, cNote, cSyl, cAnacrusis };
}
