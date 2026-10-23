/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useAudioStore } from '../../stores/useAudioStore';

export function useCircleSequencerStoreData(isActive: boolean) {
  const store = useSequencerStore(useShallow(s => ({
    totalMeasures: s.totalMeasures,
    songSections: s.songSections,
    songMarkers: s.songMarkers,
    rodaTrackOrder: s.rodaTrackOrder,
    isLoopRegionActive: s.isLoopRegionActive,
    loopStartMeasure: s.loopStartMeasure,
    loopEndMeasure: s.loopEndMeasure,
    currentMeasure: isActive ? s.currentMeasure : 0,
    measureTimeSigs: s.measureTimeSigs,
    isLetraActive: s.isLetraActive,
    toggleLetraActive: s.toggleLetraActive,
  })));

  const transport = useTransportStore(useShallow(s => ({
    isMetroOn: s.isMetroOn,
    soloPatternPlayId: s.soloPatternPlayId,
  })));

  const audio = useAudioStore(useShallow(s => ({
    vocalMode: s.vocalMode,
    setVocalMode: s.setVocalMode,
  })));

  return { ...store, ...transport, ...audio };
}
