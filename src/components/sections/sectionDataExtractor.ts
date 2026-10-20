/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SongSection, SavedSectionData, Pattern } from '../../types';

export function extractSectionData(section: SongSection, storeState: any): SavedSectionData {
  const numMeasures = section.endMeasure - section.startMeasure + 1;
  const start = section.startMeasure;
  const end = section.endMeasure;

  const timeSigs = storeState.measureTimeSigs.slice(start, end + 1);
  const vols = storeState.measureVols.slice(start, end + 1);
  const volTransitions = storeState.measureVolTransitions.slice(start, end + 1);
  const signals = storeState.measureSignals.slice(start, end + 1);

  const sectionTracks = storeState.tracks.map((t: any) => {
    const sectionPatterns = t.patterns.map((p: any) => {
      if (!p.measureAssignments) return null;
      const isAssigned = p.measureAssignments.slice(start, end + 1).some((v: boolean) => v);
      if (!isAssigned) return null;
      const newAssignments = p.measureAssignments.slice(start, end + 1);
      return { ...p, measureAssignments: newAssignments };
    }).filter(Boolean) as Pattern[];

    return {
      instrumentIdx: t.instrumentIdx,
      isMute: t.isMute,
      isSolo: t.isSolo,
      volumeVal: t.volumeVal,
      reverbVal: t.reverbVal,
      panVal: t.panVal,
      swingIntensity: t.swingIntensity,
      patterns: sectionPatterns,
    };
  }).filter((t: any) => t.patterns.length > 0);

  return { numMeasures, timeSigs, vols, volTransitions, signals, tracks: sectionTracks };
}
