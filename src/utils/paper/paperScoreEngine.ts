/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Moteur de décodage des partitions papier et intégration séquences (< 115 lignes).
 */
import { PaperStepValue } from '../../types/paperWorkshop.types';
import { parsePupitreHeader } from './paperNomenclatureHelper';
import { expandSequenceTokens } from './paperSequenceExpander';

export { expandSequenceTokens, expandSequenceTokens as expandSequenceString };

export const parseStepValue = (raw: any): PaperStepValue => {
  if (raw === undefined || raw === null || raw === '' || raw === ' ' || raw === 0 || raw === '0') {
    return 0;
  }
  const s = String(Array.isArray(raw) ? raw[0] : raw).trim();
  if (s === '-') return '-'; // Tiret de silence forcé
  if (Array.isArray(raw)) {
    return raw.length >= 2 ? [String(raw[0]).trim(), String(raw[1]).trim()] : (raw[0] ?? 0);
  }
  if (s.includes('/') || (s.includes('|') && s !== '||' && s !== '|')) {
    const parts = s.includes('/') ? s.split('/') : s.split('|');
    return [parts[0].trim() || '0', parts[1].trim() || '0'];
  }
  return s;
};

export const sanitizePatternSteps = (rawSteps: any[], targetLength = 16): PaperStepValue[] => {
  const result: PaperStepValue[] = [];
  for (let i = 0; i < rawSteps.length; i++) {
    const s = String(rawSteps[i]).trim();
    if (s === '...' || s === '…') {
      while (result.length < targetLength) result.push(0);
      break;
    }
    if (s === '||' || s === 'END') break; // Troncature nette à la double barre
    result.push(parseStepValue(rawSteps[i]));
  }
  while (result.length < targetLength) result.push(0);
  return result.slice(0, targetLength);
};

export const parseLineMultiplier = (label: string): { cleanLabel: string; multiplier: number } => {
  const m = label.match(/^(.*?)\s*([xX*×])\s*(\d+)\s*$/);
  if (!m) return { cleanLabel: label.trim(), multiplier: 1 };
  return { cleanLabel: m[1].trim(), multiplier: parseInt(m[3], 10) || 1 };
};

export const resolveSectionPatterns = (
  sectionPatterns: Partial<Record<string, any>> | Array<{ header: string; steps: any[] }>,
  basePatterns: Partial<Record<string, PaperStepValue[]>> = {},
  targetLength = 16
): Partial<Record<string, PaperStepValue[]>> => {
  const resolved: Partial<Record<string, PaperStepValue[]>> = {};
  let lastMasterSteps: PaperStepValue[] = Array(targetLength).fill(0);

  const entries: Array<{ rawKey: string; val: any }> = Array.isArray(sectionPatterns)
    ? sectionPatterns.map((l) => ({ rawKey: l.header, val: l.steps }))
    : Object.entries(sectionPatterns).map(([k, v]) => ({ rawKey: k, val: v }));

  for (const { rawKey, val } of entries) {
    if (!val) continue;
    const { cleanLabel } = parseLineMultiplier(rawKey);
    const parsed = parsePupitreHeader(cleanLabel);
    const targets = parsed.targetCodes.length > 0 ? parsed.targetCodes : [cleanLabel.toLowerCase()];

    // Gestion du mot-clé Base / Idem
    const isBase = (typeof val === 'string' && /^(base|idem|%)$/i.test(val.trim())) ||
      (Array.isArray(val) && val.length === 1 && typeof val[0] === 'string' && /^(base|idem|%)$/i.test(val[0].trim()));

    if (isBase) {
      for (const t of targets) {
        resolved[t] = basePatterns[t] ? [...basePatterns[t]!] : Array(targetLength).fill(0);
        lastMasterSteps = resolved[t]!;
      }
      continue;
    }

    if (Array.isArray(val)) {
      const sanitized = sanitizePatternSteps(val, targetLength);
      if (parsed.isVariation) {
        // Règle du Temps Vide vs Tiret (-) sur sous-ligne de variation
        const childSteps: PaperStepValue[] = [];
        for (let beat = 0; beat < targetLength / 4; beat++) {
          const beatSlice = sanitized.slice(beat * 4, beat * 4 + 4);
          const isEntireBeatEmpty = beatSlice.every((st) => st === 0);

          if (isEntireBeatEmpty) {
            // Recopie automatique du temps de la ligne maîtresse
            for (let s = 0; s < 4; s++) childSteps.push(lastMasterSteps[beat * 4 + s] ?? 0);
          } else {
            // Traitement case par case : tiret '-' = vrai silence (0), sinon valeur
            for (let s = 0; s < 4; s++) {
              const val = beatSlice[s];
              childSteps.push(val === '-' ? 0 : (val === 0 ? (lastMasterSteps[beat * 4 + s] ?? 0) : val));
            }
          }
        }
        for (const t of targets) resolved[t] = childSteps;
      } else {
        const cleanMaster = sanitized.map((s) => (s === '-' ? 0 : s));
        lastMasterSteps = cleanMaster;
        for (const t of targets) resolved[t] = cleanMaster;
      }
    }
  }
  return resolved;
};
