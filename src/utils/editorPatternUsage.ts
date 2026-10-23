
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig } from '../data';
import { getExpandedMeasures } from './measureHelpers';

export interface PatternUsageItem {
  trackName: string;
  trackId: number;
  isMaster: boolean;
  measures: number[];
}

export const getPatternUsage = (
  patternId: number,
  parentBusTrack: any,
  allTracks: any[],
  lang: string
): PatternUsageItem[] => {
  const pattern = parentBusTrack?.patterns?.find((p: any) => p.id === patternId);
  if (!pattern || !pattern.measureAssignments) return [];

  const totalMeasures = pattern.measureAssignments.length;
  const songSections = useSequencerStore.getState().songSections;
  const expanded = getExpandedMeasures(totalMeasures, songSections);

  const vizMeasuresMap: Record<number, number[]> = {};
  expanded.forEach((item, index) => {
    if (!vizMeasuresMap[item.baseMeasure]) vizMeasuresMap[item.baseMeasure] = [];
    vizMeasuresMap[item.baseMeasure].push(index + 1);
  });

  const usage: PatternUsageItem[] = [];

  if (!parentBusTrack.isLinkFolder) {
    const measures: number[] = [];
    for (let m = 0; m < totalMeasures; m++) {
      if (pattern.measureAssignments[m]) measures.push(...(vizMeasuresMap[m] || [m + 1]));
    }
    measures.sort((a, b) => a - b);
    if (measures.length > 0) {
      usage.push({
        trackName: parentBusTrack.customName || instrumentsConfig[parentBusTrack.instrumentIdx]?.name || 'Instrument',
        trackId: parentBusTrack.id,
        isMaster: true,
        measures,
      });
    }
    return usage;
  }

  const masterTrack = allTracks.find((t) => String(t.linkedToTrackId) === String(parentBusTrack.id) && t.isLinkMaster);
  const slaveTracks = allTracks.filter((t) => String(t.linkedToTrackId) === String(parentBusTrack.id) && !t.isLinkFolder && !t.isLinkMaster);

  if (masterTrack) {
    const masterMeasures: number[] = [];
    for (let m = 0; m < totalMeasures; m++) {
      if (pattern.measureAssignments[m]) masterMeasures.push(...(vizMeasuresMap[m] || [m + 1]));
    }
    masterMeasures.sort((a, b) => a - b);
    if (masterMeasures.length > 0) {
      usage.push({
        trackName: masterTrack.customName || instrumentsConfig[masterTrack.instrumentIdx]?.name || 'Master',
        trackId: masterTrack.id,
        isMaster: true,
        measures: masterMeasures,
      });
    }
  }

  slaveTracks.forEach((slave) => {
    const slaveMeasures: number[] = [];
    for (let m = 0; m < totalMeasures; m++) {
      const override = slave.patternOverrides?.[m];
      if (override === patternId || (override === undefined && pattern.measureAssignments[m])) {
        slaveMeasures.push(...(vizMeasuresMap[m] || [m + 1]));
      }
    }
    slaveMeasures.sort((a, b) => a - b);
    if (slaveMeasures.length > 0) {
      usage.push({
        trackName: slave.customName || instrumentsConfig[slave.instrumentIdx]?.name || (lang === 'fr' ? 'Esclave' : 'Escravo'),
        trackId: slave.id,
        isMaster: false,
        measures: slaveMeasures,
      });
    }
  });

  return usage;
};
