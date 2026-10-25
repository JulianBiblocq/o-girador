/**
 * Détection des doutes de nommage de section et calcul des candidats (< 90 lignes).
 */
import { parseConductorVariationToken } from './paperVariationCallParser';

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export function findSectionNameCandidates(rawName: string, knownSectionNames: string[]): string[] {
  const parsed = parseConductorVariationToken(rawName);
  const base = parsed.cleanSectionName || rawName.trim();
  const nBase = norm(base);
  if (!nBase || nBase === 'silence' || nBase === 'pausa') return [];
  if (knownSectionNames.some((k) => norm(k) === nBase)) return [];

  const baseWords = nBase.split(/\s+/).filter(Boolean);
  const scored: Array<{ name: string; score: number }> = [];

  knownSectionNames.forEach((known) => {
    const nKnown = norm(known);
    if (!nKnown || nKnown === 'silence') return;
    let score = 0;
    const knownWords = nKnown.split(/\s+/).filter(Boolean);
    const allWordsIncluded = baseWords.length > 0 && baseWords.every((w) => knownWords.includes(w) || nKnown.includes(w));

    if (allWordsIncluded || nKnown.includes(nBase)) score = 100;
    else if (nKnown.startsWith(nBase) || nBase.startsWith(nKnown)) score = 85;
    else {
      const dist = levenshtein(nBase, nKnown);
      const maxAllowed = Math.max(2, Math.floor(nBase.length * 0.35));
      if (dist <= maxAllowed) score = 70 - dist * 10;
    }
    if (score > 0) scored.push({ name: known, score });
  });

  scored.sort((a, b) => b.score - a.score);
  return Array.from(new Set(scored.map((s) => s.name)));
}

export function evaluateSectionDoubt(tokenOrName: string, knownSectionNames: string[]) {
  const parsed = parseConductorVariationToken(tokenOrName);
  const baseName = parsed.cleanSectionName || tokenOrName.trim();
  const nBase = norm(baseName);
  const isExact = knownSectionNames.some((k) => norm(k) === nBase);
  const hasDoubt = Boolean(nBase && !isExact && nBase !== 'silence' && nBase !== 'pausa');
  const candidates = hasDoubt ? findSectionNameCandidates(baseName, knownSectionNames) : [];

  return {
    hasDoubt,
    baseName,
    rawName: tokenOrName,
    variationSuffix: parsed.variationSuffix || '',
    candidates,
  };
}

export function resolveWithPreservedSuffix(newBaseName: string, originalTokenOrName: string): string {
  const parsed = parseConductorVariationToken(originalTokenOrName);
  return parsed.variationSuffix ? `${newBaseName} ${parsed.variationSuffix}` : newBaseName;
}
