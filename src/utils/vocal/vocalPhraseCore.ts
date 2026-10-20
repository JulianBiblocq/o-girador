/**
 * O Girador - Core Vocal Phrase Block Definitions & Calculations
 */

export interface PhraseBlockPatternLike {
  id?: number | string;
  steps?: number;
  measureAssignments?: { [idx: number]: boolean | undefined } | null;
  beatResolutions?: number[];
}

export interface PhraseBlockInfo {
  span: number;
  blockStartMeasure: number;
  relIdx: number;
  isBlockStart: boolean;
  stepsPerMeasure: number;
  cellsPerMeasure: number;
  stepOffset: number;
}

export function getPatternStepsPerMeasure(pattern: PhraseBlockPatternLike, beatsPerMeasure: number): number {
  const beats = Math.max(1, Math.round(beatsPerMeasure) || 4);
  const res = pattern.beatResolutions;
  if (Array.isArray(res) && res.length >= beats) {
    let sum = 0;
    for (let b = 0; b < beats; b++) sum += res[b] > 0 ? res[b] : 4;
    return sum;
  }
  return beats * 4;
}

export function buildInfo(
  pattern: PhraseBlockPatternLike,
  spm: number,
  span: number,
  relIdx: number,
  blockStartMeasure: number
): PhraseBlockInfo {
  return {
    span,
    blockStartMeasure,
    relIdx,
    isBlockStart: relIdx === 0,
    stepsPerMeasure: spm,
    cellsPerMeasure: span > 1 ? spm : (pattern.steps || 16),
    stepOffset: relIdx * spm,
  };
}

export function getSpan(pattern: PhraseBlockPatternLike, spm: number): number {
  return Math.max(1, Math.round((pattern.steps || spm) / spm));
}

export function getPhraseBlockInfo(
  pattern: PhraseBlockPatternLike,
  measureIdx: number,
  beatsPerMeasure: number
): PhraseBlockInfo {
  const spm = getPatternStepsPerMeasure(pattern, beatsPerMeasure);
  const span = getSpan(pattern, spm);
  if (span === 1) return buildInfo(pattern, spm, 1, 0, measureIdx);

  const assignments = pattern.measureAssignments;
  let startM = measureIdx;
  while (startM > 0 && assignments && assignments[startM - 1]) startM--;
  const relIdx = (measureIdx - startM) % span;
  return buildInfo(pattern, spm, span, relIdx, measureIdx - relIdx);
}
