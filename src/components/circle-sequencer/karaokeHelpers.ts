
import { Pattern } from '../../types';
import { WordItem, SyllableItem } from './circleSequencerTypes';

export const patternWordsCache = new Map<string, WordItem[]>();

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

  const cacheKey = `${pattern.id}_${isAnacrusis ? 'pre' : 'main'}_${lyrics.join('|')}_${stepsCount}`;
  const cached = patternWordsCache.get(cacheKey);
  if (cached) return cached;

  if (patternWordsCache.size > 100) {
    patternWordsCache.clear();
  }

  const words: WordItem[] = [];
  let currentSyllables: SyllableItem[] = [];

  for (let s = 0; s < stepsCount; s++) {
    const isActive = activeSteps[s] !== undefined && activeSteps[s] !== null && activeSteps[s] !== 0 && activeSteps[s] !== '0';
    const rawText = lyrics[s];
    if (isActive && rawText && typeof rawText === 'string' && rawText.trim() !== '' && rawText.trim() !== '-') {
      const hasSpace = rawText.endsWith(' ') || rawText.endsWith('  ');
      const cleanText = rawText.trim().replace(/-$/, '');
      const note = notes?.[s]?.trim();

      currentSyllables.push({ step: s, cleanText, hasSpace, note });

      if (hasSpace || s === stepsCount - 1) {
        words.push({
          syllables: [...currentSyllables],
          fullWord: currentSyllables.map(item => item.cleanText).join(''),
          startStep: currentSyllables[0].step,
          endStep: s
        });
        currentSyllables = [];
      }
    }
  }

  if (currentSyllables.length > 0) {
    words.push({
      syllables: [...currentSyllables],
      fullWord: currentSyllables.map(item => item.cleanText).join(''),
      startStep: currentSyllables[0].step,
      endStep: currentSyllables[currentSyllables.length - 1].step
    });
  }

  patternWordsCache.set(cacheKey, words);
  return words;
}
