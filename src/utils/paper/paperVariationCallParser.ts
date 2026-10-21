/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Décodeur multi-variations '+ Var (1-2-5) instrument' pour conducteur papier (< 125 lignes).
 */
import { PaperStepValue } from '../../types/paperWorkshop.types';
import { findDictionarySection, findDictionaryVariation } from './paperRhythmDictionary';

export interface ParsedVariationCall {
  targetInstrument: string;
  rawInstrument: string;
  varIndices: number[];
}

export interface ParsedConductorToken {
  cleanSectionName: string;
  multiplier: number;
  variationCalls: ParsedVariationCall[];
}

export function normalizeInstrumentCode(raw: string): string {
  const s = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (s.startsWith('alf') || s === 'al' || s === 'mc' || s === 'marcante') return 'al';
  if (s === 'me' || s.startsWith('mei')) return 'me';
  if (s === 'rp' || s.startsWith('rep')) return 'rp';
  if (s.startsWith('cai') || s === 'cx') return 'cx';
  if (s.startsWith('tar') || s === 'tr') return 'tr';
  if (s.startsWith('gon') || s === 'gg') return 'gg';
  if (s.startsWith('agb') || s.startsWith('abe') || s === 'ab') return 'ab';
  if (s.startsWith('min') || s === 'mi') return 'mi';
  if (s.startsWith('tim') || s === 'tb') return 'tb';
  return s;
}

export function parseConductorVariationToken(token: string): ParsedConductorToken {
  let clean = token.trim();
  let multiplier = 1;

  // Extraction du multiplicateur : x4, *4, ×4
  const multMatch = clean.match(/^(.*?)\s*([xX*×])\s*(\d+)(.*)$/);
  if (multMatch) {
    multiplier = parseInt(multMatch[3], 10) || 1;
    clean = `${multMatch[1]} ${multMatch[4]}`.trim();
  }

  const variationCalls: ParsedVariationCall[] = [];
  // Regex globale pour capturer : + Var (1-2-5) alfaia
  const varRegex = /\+\s*var\s*\(([\d\s,-]+)\)\s*([a-zA-Z]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = varRegex.exec(clean)) !== null) {
    const rawIndices = match[1];
    const rawInst = match[2];
    const varIndices = rawIndices
      .split(/[\s,-]+/)
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    variationCalls.push({
      targetInstrument: normalizeInstrumentCode(rawInst),
      rawInstrument: rawInst,
      varIndices
    });
  }

  // Nettoyage de la chaîne pour extraire le nom pur de la section
  const cleanSectionName = clean.replace(/\+\s*var\s*\([\d\s,-]+\)\s*[a-zA-Z]+/gi, '').replace(/\s+/g, ' ').trim();

  return { cleanSectionName, multiplier, variationCalls };
}

export function resolveSectionFromDictionaryFallback(
  sectionName: string,
  variationCalls: ParsedVariationCall[] = []
): Record<string, PaperStepValue[]> | null {
  const dictItem = findDictionarySection(sectionName);
  if (!dictItem) return null;

  const result: Record<string, PaperStepValue[]> = {};
  Object.entries(dictItem.patterns).forEach(([k, steps]) => {
    result[k] = [...steps];
  });

  // Application des variations demandées aux pupitres cibles
  variationCalls.forEach(({ targetInstrument, varIndices }) => {
    const firstVarIdx = varIndices[0];
    if (firstVarIdx) {
      const varSteps = findDictionaryVariation(dictItem.name, targetInstrument, firstVarIdx);
      if (varSteps) {
        result[targetInstrument] = [...varSteps];
      }
    }
  });

  return result;
}
