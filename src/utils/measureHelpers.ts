import { SongSection } from '../types';

/**
 * Expands the base measures of a song taking into account song section repeat counts (multipliers).
 * Mimics the exact playback progression logic of the sequencer to generate a deterministic list of
 * base measure indices and their iteration number.
 */
export function getExpandedMeasures(totalMeasures: number, songSections: SongSection[]): { baseMeasure: number; iteration: number }[] {
  const expanded: { baseMeasure: number; iteration: number }[] = [];
  if (totalMeasures <= 0) return expanded;

  let current = 0;
  const iterations: Record<string, number> = {};
  let count = 0;
  const maxSafety = 5000; // Safe limit to prevent infinite loops in malformed data

  while (current < totalMeasures && count < maxSafety) {
    let activeSection: SongSection | null = null;
    if (songSections) {
      for (let i = 0; i < songSections.length; i++) {
        if (songSections[i].endMeasure === current) {
          activeSection = songSections[i];
          break;
        }
      }
    }

    let currentIteration = 1;
    if (activeSection) {
      const sectKey = activeSection.id;
      if (iterations[sectKey] === undefined) {
        iterations[sectKey] = 1;
      }
      currentIteration = iterations[sectKey];
    }

    expanded.push({ baseMeasure: current, iteration: currentIteration });
    count++;

    if (activeSection && currentIteration < (activeSection.repeatCount || 1)) {
      iterations[activeSection.id] = currentIteration + 1;
      current = activeSection.startMeasure;
    } else {
      if (activeSection) {
        iterations[activeSection.id] = 1;
      }
      current = current + 1;
    }
  }

  return expanded;
}
