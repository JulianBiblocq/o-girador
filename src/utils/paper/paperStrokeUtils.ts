/**
 * Utilitaires de détection de frappes réelles pour la transcription papier (< 30 lignes).
 */

export const cloneStepValue = (s: any): any => {
  if (Array.isArray(s)) return [...s];
  return s === 0 ? 0 : s;
};

export const hasRealStrokes = (steps: unknown): boolean => {
  if (!Array.isArray(steps) || steps.length === 0) return false;
  return steps.some((s) => {
    if (Array.isArray(s)) {
      return s.some((sub) => sub && sub !== 0 && sub !== '0' && sub !== '.' && sub !== '-' && sub !== '');
    }
    return s && s !== 0 && s !== '0' && s !== '.' && s !== '-' && s !== '';
  });
};
