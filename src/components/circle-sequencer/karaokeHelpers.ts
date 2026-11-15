import type { Pattern } from '../../types';
import type { WordItem, SyllableItem } from './circleSequencerTypes';
import { cleanVoiceSyllableForDisplay, isKaraokeHiddenToken } from '../../utils/musicTheory';

export const patternWordsCache = new Map<string, WordItem[]>();

function isHoldOrMelismaToken(trimmed: string): boolean {
  return trimmed === '───' || trimmed === '_' || trimmed === '—' || trimmed === '~' || trimmed === '-';
}

export function getPatternWords(
  pattern: Pattern | undefined | null,
  isAnacrusis: boolean,
  totalSteps: number = 16
): WordItem[] {
  if (!pattern) return [];
  const lyrics = isAnacrusis ? pattern.preRollLyrics : pattern.lyrics;
  const activeSteps = isAnacrusis ? pattern.preRollActiveSteps : pattern.activeSteps;
  const notes = isAnacrusis ? pattern.preRollNotes : pattern.notes;
  const stepsCount = isAnacrusis
    ? (pattern.preRollActiveSteps ? pattern.preRollActiveSteps.length : (pattern.steps || totalSteps))
    : (pattern.steps || totalSteps);

  if (!lyrics || !activeSteps) return [];

  const cacheKey = `${pattern.id}_${isAnacrusis ? 'pre' : 'main'}_${lyrics.join('|')}_${activeSteps.join(',')}_${stepsCount}`;
  const cached = patternWordsCache.get(cacheKey);
  if (cached) return cached;
  if (patternWordsCache.size > 100) patternWordsCache.clear();

  const words: WordItem[] = [];
  let currentSyllables: SyllableItem[] = [];
  let lastCurrentStep = 0;

  const flushCurrent = (endStep: number) => {
    if (currentSyllables.length === 0) return;
    words.push({
      syllables: [...currentSyllables],
      fullWord: currentSyllables.map((item) => item.cleanText).join(''),
      startStep: currentSyllables[0].step,
      endStep,
    });
    currentSyllables = [];
  };

  for (let s = 0; s < stepsCount; s++) {
    const isActive = activeSteps[s] !== undefined && activeSteps[s] !== null && activeSteps[s] !== 0 && activeSteps[s] !== '0';
    const rawText = lyrics[s];
    if (!isActive || typeof rawText !== 'string') continue;
    const trimmed = rawText.trim();
    const hasSpace = rawText.endsWith(' ');

    if (isHoldOrMelismaToken(trimmed)) {
      if (currentSyllables.length > 0) {
        lastCurrentStep = s;
        if (hasSpace || s === stepsCount - 1) {
          currentSyllables[currentSyllables.length - 1].hasSpace = hasSpace;
          flushCurrent(s);
        }
      } else if (words.length > 0) {
        words[words.length - 1].endStep = s;
      }
      continue;
    }

    if (isKaraokeHiddenToken(trimmed)) continue;
    const cleanText = cleanVoiceSyllableForDisplay(rawText);
    if (!cleanText) continue;
    const note = pattern.ignoreMelodyPitch ? undefined : notes?.[s]?.trim();
    currentSyllables.push({ step: s, cleanText, hasSpace, note });
    lastCurrentStep = s;

    if (hasSpace || s === stepsCount - 1) flushCurrent(s);
  }

  flushCurrent(lastCurrentStep);
  patternWordsCache.set(cacheKey, words);
  return words;
}
