/**
 * O Girador - Solo Mode Vocal Phrase Calculations
 */

import {
  PhraseBlockPatternLike,
  PhraseBlockInfo,
  getPatternStepsPerMeasure,
  buildInfo,
  getSpan
} from './vocalPhraseCore';

/** Position dans la phrase en mode solo / pré-écoute (compteur hors timeline). */
export function getSoloPhraseInfo(
  pattern: PhraseBlockPatternLike,
  soloMeasureCounter: number,
  beatsPerMeasure: number
): PhraseBlockInfo {
  const spm = getPatternStepsPerMeasure(pattern, beatsPerMeasure);
  const span = getSpan(pattern, spm);
  const relIdx = ((soloMeasureCounter % span) + span) % span;
  return buildInfo(pattern, spm, span, relIdx, 0);
}

/** Plus grande étendue (en mesures) parmi les motifs solo portant cet identifiant. */
export function getSoloPhraseSpan(
  tracks: ReadonlyArray<{ patterns?: ReadonlyArray<PhraseBlockPatternLike> }>,
  soloPatternId: number | string | null,
  beatsPerMeasure: number
): number {
  if (soloPatternId === null || soloPatternId === undefined) return 1;
  let maxSpan = 1;
  for (let t = 0; t < tracks.length; t++) {
    const patterns = tracks[t].patterns;
    if (!patterns) continue;
    for (let p = 0; p < patterns.length; p++) {
      const ptn = patterns[p];
      if (String(ptn.id) !== String(soloPatternId)) continue;
      const span = getSpan(ptn, getPatternStepsPerMeasure(ptn, beatsPerMeasure));
      if (span > maxSpan) maxSpan = span;
    }
  }
  return maxSpan;
}

/** Compteur de mesure de phrase du mode solo, avancé à chaque rebouclage d'une mesure. */
export function advanceSoloPhraseMeasure(
  current: number,
  tracks: ReadonlyArray<{ patterns?: ReadonlyArray<PhraseBlockPatternLike> }>,
  soloPatternId: number | string | null,
  beatsPerMeasure: number
): number {
  return (current + 1) % getSoloPhraseSpan(tracks, soloPatternId, beatsPerMeasure);
}
