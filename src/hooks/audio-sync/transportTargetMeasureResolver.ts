/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Résolution de la mesure cible et décision de décompte pré-roll (< 50 lignes).
 */

import { useTransportStore } from '../../stores/useTransportStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { checkStartingVocalAnacrusis } from './startingAnacrusisChecker';
import { Track } from '../../types';

export interface TargetMeasureResolution {
  targetM: number;
  shouldExecutePreRoll: boolean;
}

export function resolveTargetMeasureAndPreRoll(
  playOptions: { skipPreRoll?: boolean; forcePreRoll?: boolean; targetMeasure?: number } | undefined,
  currentMeasure: number,
  totalMeasures: number,
  startTracks: Track[],
  measureTimeSigs: Record<number, string>,
  soloPatternPlayId: number | null
): TargetMeasureResolution {
  const preRoll = useTransportStore.getState().preRollSettings;
  const audioStore = useAudioStore.getState();
  const armedTargetMeasure =
    audioStore.targetPatternId !== null && audioStore.targetMeasureIdx !== null
      ? audioStore.targetMeasureIdx
      : null;

  let targetM: number;
  let shouldSkipPreRoll = playOptions?.skipPreRoll;

  if (playOptions?.targetMeasure !== undefined) {
    targetM = playOptions.targetMeasure % (totalMeasures || 1);
  } else if (armedTargetMeasure !== null) {
    targetM = armedTargetMeasure >= 2 ? armedTargetMeasure - 2 : 0;
    shouldSkipPreRoll = armedTargetMeasure === 0 ? false : true;
  } else {
    targetM = currentMeasure % (totalMeasures || 1);
  }

  const hasVocalAnacrusisAtStart = checkStartingVocalAnacrusis(
    startTracks,
    targetM,
    measureTimeSigs,
    soloPatternPlayId
  );

  const forcePreRollForAnacrusis = hasVocalAnacrusisAtStart && !playOptions?.skipPreRoll;
  const shouldExecutePreRoll =
    (!shouldSkipPreRoll && ((preRoll && preRoll.enabled) || Boolean(playOptions?.forcePreRoll))) ||
    forcePreRollForAnacrusis;

  return { targetM, shouldExecutePreRoll };
}
