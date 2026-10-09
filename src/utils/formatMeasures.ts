/**
 * Transforme un tableau de numéros de mesures (ex: [1, 2, 3, 5, 7, 8, 9])
 * en chaîne synthétique de plages continues :
 * - FR : "m. 1-3, 5, 7-9"
 * - PT : "c. 1-3, 5, 7-9"
 */
export function formatMeasureRanges(measures: number[], lang: string = 'fr'): string {
  if (!measures || measures.length === 0) return '';
  const sorted = [...new Set(measures)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
    } else {
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = current;
      prev = current;
    }
  }

  const prefix = lang === 'fr' ? 'm. ' : 'c. ';
  return `${prefix}${ranges.join(', ')}`;
}
