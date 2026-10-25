/**
 * Décodeur multi-variations '+ Var' avec pourcentages explicites (< 120 lignes).
 */
import { PaperStepValue } from '../../types/paperWorkshop.types';
import { findDictionarySection, findDictionaryVariation } from './paperRhythmDictionary';

export interface ParsedVariationCall {
  targetInstrument: string;
  rawInstrument: string;
  varIndices: number[];
  probability?: number;
  rawClause?: string;
}

export interface ParsedConductorToken {
  cleanSectionName: string;
  multiplier: number;
  variationCalls: ParsedVariationCall[];
  variationSuffix?: string;
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

  // Extraction du multiplicateur avant ou après : x8, *8, ×8
  const multMatch = clean.match(/^(.*?)\s*([xX*×])\s*(\d+)(.*)$/);
  if (multMatch) {
    multiplier = parseInt(multMatch[3], 10) || 1;
    clean = `${multMatch[1]} ${multMatch[4]}`.replace(/\s+/g, ' ').trim();
  }

  const variationCalls: ParsedVariationCall[] = [];
  const suffixParts: string[] = [];
  const varRegex = /\+\s*var\b([^+*xX×]*)/gi;
  let match: RegExpExecArray | null;

  while ((match = varRegex.exec(clean)) !== null) {
    const rawClause = match[0].trim();
    suffixParts.push(rawClause);
    const body = match[1].trim();

    // Pourcentage explicite (ex: 100%, 30%)
    const probMatch = body.match(/(\d+)\s*%/);
    const probability = probMatch ? Math.max(0, Math.min(100, parseInt(probMatch[1], 10))) : undefined;

    // Indices numériques entre parenthèses (ex: (1-2-5))
    const parenMatch = body.match(/\(([\d\s,-]+)\)/);
    const varIndices = parenMatch
      ? parenMatch[1].split(/[\s,-]+/).map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n) && n > 0)
      : [];

    // Reste textuel pour les instruments cibles
    const cleanBody = body.replace(/\d+\s*%/g, '').replace(/\([\d\s,-]+\)/g, '').replace(/[(),]/g, ' ').trim();
    const instTokens = cleanBody.split(/\s+/).filter(Boolean);

    if (instTokens.length > 0) {
      instTokens.forEach((inst) => {
        variationCalls.push({
          targetInstrument: normalizeInstrumentCode(inst),
          rawInstrument: inst,
          varIndices,
          probability,
          rawClause,
        });
      });
    } else {
      variationCalls.push({
        targetInstrument: '',
        rawInstrument: '',
        varIndices,
        probability,
        rawClause,
      });
    }
  }

  const cleanSectionName = clean.replace(/\+\s*var\b[^+]*/gi, '').replace(/\s+/g, ' ').trim();
  const variationSuffix = suffixParts.join(' ').trim();

  return { cleanSectionName, multiplier, variationCalls, variationSuffix };
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
    const firstVarIdx = varIndices[0] || 1;
    if (firstVarIdx && targetInstrument) {
      const varSteps = findDictionaryVariation(dictItem.name, targetInstrument, firstVarIdx);
      if (varSteps) {
        result[targetInstrument] = [...varSteps];
      }
    }
  });

  return result;
}
