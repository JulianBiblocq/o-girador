import { SongSection } from '../types';

export interface ExpandedMeasureOptions {
  isLoopRegionActive?: boolean;
  loopStartMeasure?: number | null;
  loopEndMeasure?: number | null;
  loopMode?: 'infinite' | number;
}

/**
 * Expands the base measures of a song taking into account:
 * 1. Loop region with finite repeat count (unrolled timeline for export)
 * 2. Song section repeat counts (multipliers)
 * Mimics the exact playback progression logic of the sequencer to generate a deterministic list of
 * base measure indices and their iteration number.
 */
export function getExpandedMeasures(
  totalMeasures: number, 
  songSections: SongSection[] = [],
  options?: ExpandedMeasureOptions
): { baseMeasure: number; iteration: number }[] {
  const expanded: { baseMeasure: number; iteration: number }[] = [];
  if (totalMeasures <= 0) return expanded;

  // 1. Unrolled timeline for loop region if active with a finite repeat count (e.g. 3x)
  if (
    options?.isLoopRegionActive &&
    typeof options?.loopMode === 'number' &&
    options.loopMode > 0 &&
    options.loopStartMeasure !== null &&
    options.loopStartMeasure !== undefined &&
    options.loopEndMeasure !== null &&
    options.loopEndMeasure !== undefined
  ) {
    const loopStart = Math.max(0, Math.min(options.loopStartMeasure, options.loopEndMeasure));
    const loopEnd = Math.min(totalMeasures - 1, Math.max(options.loopStartMeasure, options.loopEndMeasure));

    if (loopStart <= loopEnd) {
      // Intro: [0 ... loopStart - 1] (skipped if loopStart === 0)
      for (let m = 0; m < loopStart; m++) {
        expanded.push({ baseMeasure: m, iteration: 1 });
      }

      // Loop iterations: loopMode times [loopStart ... loopEnd]
      for (let iter = 1; iter <= options.loopMode; iter++) {
        for (let m = loopStart; m <= loopEnd; m++) {
          expanded.push({ baseMeasure: m, iteration: iter });
        }
      }

      // Outro: [loopEnd + 1 ... totalMeasures - 1] (skipped if loopEnd === totalMeasures - 1)
      for (let m = loopEnd + 1; m < totalMeasures; m++) {
        expanded.push({ baseMeasure: m, iteration: 1 });
      }

      return expanded;
    }
  }

  // 2. Standard linear progression with song section repeats
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

    if (activeSection) {
      iterations[activeSection.id] = 1;
    }
    current = current + 1;
  }

  return expanded;
}
