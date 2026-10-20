/**
 * O Girador - Vocal Phrase Block Resolution Orchestrator
 */

import {
  PhraseBlockPatternLike,
  PhraseBlockInfo,
  getPatternStepsPerMeasure,
  getPhraseBlockInfo
} from './vocal/vocalPhraseCore';
import {
  getSoloPhraseInfo,
  getSoloPhraseSpan,
  advanceSoloPhraseMeasure
} from './vocal/soloPhraseUtils';

export type { PhraseBlockPatternLike, PhraseBlockInfo };
export {
  getPatternStepsPerMeasure,
  getPhraseBlockInfo,
  getSoloPhraseInfo,
  getSoloPhraseSpan,
  advanceSoloPhraseMeasure
};

export interface ResolveVocalPhraseParams {
  pattern: PhraseBlockPatternLike;
  measureIdx: number;
  beatsPerMeasure: number;
  isSolo: boolean;
  soloMeasureCounter: number;
}

/** Point d'entrée unique du moteur : timeline ou solo selon le contexte. */
export function resolveVocalPhraseInfo(p: ResolveVocalPhraseParams): PhraseBlockInfo {
  return p.isSolo
    ? getSoloPhraseInfo(p.pattern, p.soloMeasureCounter, p.beatsPerMeasure)
    : getPhraseBlockInfo(p.pattern, p.measureIdx, p.beatsPerMeasure);
}

/** Vrai si `measureIdx` ouvre un bloc de phrase. */
export function isPhraseBlockStart(
  pattern: PhraseBlockPatternLike,
  measureIdx: number,
  beatsPerMeasure: number,
  isSolo: boolean = false
): boolean {
  return resolveVocalPhraseInfo({ pattern, measureIdx, beatsPerMeasure, isSolo, soloMeasureCounter: 0 }).isBlockStart;
}
