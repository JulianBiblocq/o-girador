/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Moteur de décodage des partitions papier et séquences Cordel (< 140 lignes).
 */
import { PaperStepValue } from '../../types/paperWorkshop.types';
import { parsePupitreHeader } from './paperNomenclatureHelper';

export const parseStepValue = (raw: any): PaperStepValue => {
  if (raw === undefined || raw === null || raw === '' || raw === ' ' || raw === '-' || raw === 0 || raw === '0') {
    return 0;
  }
  if (Array.isArray(raw)) {
    return raw.length >= 2 ? [String(raw[0]).trim(), String(raw[1]).trim()] : (raw[0] ?? 0);
  }
  const s = String(raw).trim();
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
    const isBaseKeyword = (typeof val === 'string' && /^(base|idem)$/i.test(val.trim())) ||
      (Array.isArray(val) && val.length === 1 && typeof val[0] === 'string' && /^(base|idem)$/i.test(val[0].trim()));

    if (isBaseKeyword) {
      for (const t of targets) {
        resolved[t] = basePatterns[t] ? [...basePatterns[t]!] : Array(targetLength).fill(0);
        lastMasterSteps = resolved[t]!;
      }
      continue;
    }

    if (Array.isArray(val)) {
      const sanitized = sanitizePatternSteps(val, targetLength);
      if (parsed.isVariation) {
        // Héritage automatique des cases vides depuis la ligne maîtresse au-dessus
        const childSteps = sanitized.map((st, idx) => (st === 0 || st === '0' ? (lastMasterSteps[idx] ?? 0) : st));
        for (const t of targets) resolved[t] = childSteps;
      } else {
        lastMasterSteps = sanitized;
        for (const t of targets) resolved[t] = sanitized;
      }
    }
  }
  return resolved;
};

export const expandSequenceString = (seqStr: string): string[] => {
  let cleaned = seqStr.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  // Dérouler les crochets : [ A | B ] x2
  cleaned = cleaned.replace(/\[\s*(.*?)\s*\]\s*(?:[xX*×](\d+))?/gi, (_, body, repeatStr) => {
    const times = repeatStr ? parseInt(repeatStr, 10) : 1;
    return Array(times).fill(body.trim()).join(' | ');
  });

  // Dérouler les reprises ||: A | B :|| xN
  cleaned = cleaned.replace(/\|\|:\s*(.*?)\s*:\|\|\s*(?:[xX*×](\d+))?/gi, (_, body, repeatStr) => {
    const times = repeatStr ? parseInt(repeatStr, 10) : 2;
    return Array(times).fill(body.trim()).join(' | ');
  });

  const tokens = cleaned.split(/[|,\n]/).map((t) => t.trim()).filter(Boolean);
  const result: string[] = [];

  for (const token of tokens) {
    const multMatch = token.match(/^(.*?)\s*([xX*×])\s*(\d+)$/);
    if (multMatch) {
      const name = multMatch[1].trim();
      const count = parseInt(multMatch[3], 10) || 1;
      for (let i = 0; i < count; i++) result.push(name);
    } else {
      result.push(token);
    }
  }
  return result;
};
