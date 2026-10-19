/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Moteur de décodage des partitions papier et séquences Cordel (< 145 lignes).
 */
import { PaperStepValue, PupitreCode } from '../../types/paperWorkshop.types';

export const parseStepValue = (raw: any): PaperStepValue => {
  if (raw === undefined || raw === null || raw === '' || raw === ' ' || raw === '-' || raw === 0 || raw === '0') {
    return 0;
  }
  if (Array.isArray(raw)) {
    return raw.length >= 2 ? [String(raw[0]).trim(), String(raw[1]).trim()] : (raw[0] ?? 0);
  }
  const s = String(raw).trim();
  if (s.includes('/') || s.includes('|')) {
    const parts = s.includes('/') ? s.split('/') : s.split('|');
    return [parts[0].trim() || '0', parts[1].trim() || '0'];
  }
  return s;
};

export const sanitizePatternSteps = (rawSteps: any[], targetLength = 16): PaperStepValue[] => {
  const result: PaperStepValue[] = [];
  for (let i = 0; i < rawSteps.length; i++) {
    const s = String(rawSteps[i]).trim();
    if (s === '||' || s === '|' || s === 'END') break; // Troncature nette à la double barre
    result.push(parseStepValue(rawSteps[i]));
  }
  while (result.length < targetLength) result.push(0);
  return result.slice(0, targetLength);
};

export const resolveSectionPatterns = (
  sectionPatterns: Partial<Record<PupitreCode, any>>,
  basePatterns: Partial<Record<PupitreCode, PaperStepValue[]>> = {},
  targetLength = 16
): Partial<Record<PupitreCode, PaperStepValue[]>> => {
  const resolved: Partial<Record<PupitreCode, PaperStepValue[]>> = {};
  for (const [key, val] of Object.entries(sectionPatterns)) {
    const pCode = key as PupitreCode;
    if (!val) continue;
    if (typeof val === 'string' && (val.toLowerCase() === 'base' || val.toLowerCase() === 'idem')) {
      resolved[pCode] = basePatterns[pCode] ? [...basePatterns[pCode]!] : Array(targetLength).fill(0);
    } else if (Array.isArray(val) && val.length === 1 && typeof val[0] === 'string' && (val[0].toLowerCase() === 'base' || val[0].toLowerCase() === 'idem')) {
      resolved[pCode] = basePatterns[pCode] ? [...basePatterns[pCode]!] : Array(targetLength).fill(0);
    } else if (Array.isArray(val)) {
      resolved[pCode] = sanitizePatternSteps(val, targetLength);
    }
  }
  return resolved;
};

export const expandSequenceString = (seqStr: string): string[] => {
  let cleaned = seqStr.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  // Dérouler les blocs de reprise ||: A | B :|| xN (Convention A : xN = N passages au total)
  const repeatRegex = /\|\|:\s*(.*?)\s*:\|\|\s*(?:x(\d+))?/gi;
  cleaned = cleaned.replace(repeatRegex, (_, body, repeatStr) => {
    const times = repeatStr ? parseInt(repeatStr, 10) : 2;
    const bodyTrimmed = body.trim();
    return Array(times).fill(bodyTrimmed).join(' | ');
  });

  const tokens = cleaned.split(/[|,\n]/).map((t) => t.trim()).filter(Boolean);
  const result: string[] = [];

  for (const token of tokens) {
    const multMatch = token.match(/^(.*?)\s*[xX*](\d+)$/);
    if (multMatch) {
      const name = multMatch[1].trim();
      const count = parseInt(multMatch[2], 10) || 1;
      for (let i = 0; i < count; i++) result.push(name);
    } else {
      result.push(token);
    }
  }

  return result;
};
