/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pattern, InstrumentConfig } from '../../types';
import { isVoiceStepProlongation } from '../../utils/musicTheory';
import { extractSeparateVoiceStep } from './extractSeparateVoiceStep';
import { extractLegacyVoiceStep } from './extractLegacyVoiceStep';

export interface VoiceStepData {
  active: boolean;
  note: string;
  syl: string;
  isProlongation: boolean;
  isAnacrusis: boolean;
}

export function extractVoiceSteps(
  effectiveStepCount: number,
  hasSeparateVoiceTracks: boolean,
  puxPattern: Pattern | null,
  coroPattern: Pattern | null,
  nextPuxPattern: Pattern | null,
  nextCoroPattern: Pattern | null,
  activePattern: Pattern | null,
  currentInst: InstrumentConfig,
  puxPlayingSteps: any,
  coroPlayingSteps: any,
  activePlayingSteps: any,
  soloPlayId: number | null | undefined
): { puxSteps: VoiceStepData[]; coroSteps: VoiceStepData[] } {
  const puxSteps: VoiceStepData[] = [];
  const coroSteps: VoiceStepData[] = [];

  for (let i = 0; i < effectiveStepCount; i++) {
    const { pActive, pNote, pSyl, pAnacrusis, cActive, cNote, cSyl, cAnacrusis } = hasSeparateVoiceTracks
      ? extractSeparateVoiceStep(
          i,
          effectiveStepCount,
          puxPattern,
          coroPattern,
          nextPuxPattern,
          nextCoroPattern,
          puxPlayingSteps,
          coroPlayingSteps,
          soloPlayId
        )
      : extractLegacyVoiceStep(
          i,
          effectiveStepCount,
          puxPattern,
          coroPattern,
          activePattern,
          nextPuxPattern,
          nextCoroPattern,
          currentInst,
          activePlayingSteps,
          soloPlayId
        );

    const prevPActive = i > 0 && puxSteps[i - 1].active;
    const prevPNote = i > 0 ? puxSteps[i - 1].note : '';
    const isPProlongation = isVoiceStepProlongation(pActive, prevPActive, pNote, prevPNote, pSyl);
    puxSteps.push({ active: pActive, note: pNote, syl: pSyl, isProlongation: isPProlongation, isAnacrusis: pAnacrusis });

    const prevCActive = i > 0 && coroSteps[i - 1].active;
    const prevCNote = i > 0 ? coroSteps[i - 1].note : '';
    const isCProlongation = isVoiceStepProlongation(cActive, prevCActive, cNote, prevCNote, cSyl);
    coroSteps.push({ active: cActive, note: cNote, syl: cSyl, isProlongation: isCProlongation, isAnacrusis: cAnacrusis });
  }

  return { puxSteps, coroSteps };
}
