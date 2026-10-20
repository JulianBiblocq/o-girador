/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VoiceStepCellProps } from './voiceStepCellTypes';

export const areVoicePropsEqual = (prev: VoiceStepCellProps, next: VoiceStepCellProps): boolean => {
  const stateEqual = Array.isArray(prev.state) && Array.isArray(next.state)
    ? prev.state[0] === next.state[0] && prev.state[1] === next.state[1]
    : prev.state === next.state;

  return prev.i === next.i &&
         prev.steps === next.steps &&
         prev.trackId === next.trackId &&
         prev.patternId === next.patternId &&
         stateEqual &&
         prev.syl === next.syl &&
         prev.note === next.note &&
         prev.isSelected === next.isSelected &&
         prev.isMultiSelectActive === next.isMultiSelectActive &&
         prev.manualMicro === next.manualMicro &&
         prev.totalShift === next.totalShift &&
         prev.shiftPx === next.shiftPx &&
         prev.isLinked === next.isLinked &&
         prev.volume === next.volume &&
         prev.decay === next.decay &&
         prev.isPreRoll === next.isPreRoll &&
         prev.isInRange === next.isInRange &&
         prev.preRollLength === next.preRollLength &&
         prev.isProlongation === next.isProlongation &&
         prev.isFollowedByProlongation === next.isFollowedByProlongation &&
         prev.isFirstInBeat === next.isFirstInBeat;
};
