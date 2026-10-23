/**
 * Désambiguïsation infaillible Gonguê (Gg) vs Agbê (Ab) & normalisation OCR (< 110 lignes).
 */
import { PaperStepValue } from '../../types/paperWorkshop.types';

const GONGUE_SPECIFIC_CHARS = new Set(['G', 'g', 'A', 'a', '4', '6']);
const AGBE_SPECIFIC_CHARS = new Set(['D', 'd', 'E', 'e', 'S', 's', 'V', 'v']);
const CLAC_PROTECTED_ROLES = new Set(['al', 'mc', 'me', 'rp', 'cx', 'tr']);

function extractStrokeChars(val: any): string[] {
  if (val === 0 || val === '0' || val === '' || val === null || val === undefined) return [];
  if (Array.isArray(val)) return val.flatMap(extractStrokeChars);
  const s = String(val).trim();
  if (s.includes('/') || s.includes('|')) return s.split(/[/|]/).flatMap(extractStrokeChars);
  return [s];
}

export function normalizeGongueStep(s: string): string {
  if (s === 'C' || s === 'c' || s === '6') return 'G';
  if (s === '4') return 'A';
  return s;
}

export function normalizeAgbeStep(s: string): string {
  if (s === '5') return 'S';
  return s;
}

function normalizeStepValue(step: PaperStepValue, normalizer: (c: string) => string): PaperStepValue {
  if (typeof step === 'string') return normalizer(step);
  if (Array.isArray(step)) return step.map((sub) => (typeof sub === 'string' ? normalizer(sub) : sub)) as [string, string];
  return step;
}

export interface DisambiguatedLineResult {
  role: string;
  steps: PaperStepValue[];
  wasReclassified: boolean;
}

export function disambiguateRoleAndSteps(
  initialRole: string,
  rawSteps: PaperStepValue[],
  hasAgbeAlreadyInScore = false
): DisambiguatedLineResult {
  const code = (initialRole || '').toLowerCase().trim();
  const allChars = rawSteps.flatMap(extractStrokeChars);

  const hasGongue = allChars.some((c) => GONGUE_SPECIFIC_CHARS.has(c));
  const hasAgbe = allChars.some((c) => AGBE_SPECIFIC_CHARS.has(c) || c === '5');
  const hasClac = allChars.some((c) => c === 'C' || c === 'c');

  let finalRole = code;
  let wasReclassified = false;

  // Règle 1 : Redressement vers Gonguê (gg)
  // Exception absolue : ne jamais écraser une Alfaia ou Caixa qui n'utilise que du 'C' (clac de baguettes)
  const isProtectedRole = CLAC_PROTECTED_ROLES.has(code) || code === 'tb';
  if (hasGongue && !hasAgbe && !isProtectedRole) {
    if (finalRole !== 'gg') {
      finalRole = 'gg';
      wasReclassified = true;
    }
  } else if (!hasGongue && !hasAgbe && hasClac && (code === 'ab' || code === '')) {
    // Si étiqueté 'ab' ou inconnu avec uniquement des 'C', il s'agit d'une cloche mal lue
    finalRole = 'gg';
    wasReclassified = true;
  }

  // Règle 2 : Redressement vers Agbê (ab) si étiqueté 'gg' par erreur
  if (finalRole === 'gg' && hasAgbe && !hasGongue) {
    finalRole = hasAgbeAlreadyInScore ? 'cx' : 'ab';
    wasReclassified = true;
  }

  // Règle 3 : Normalisation OCR selon le rôle confirmé
  let normalizedSteps = [...rawSteps];
  if (finalRole === 'gg') {
    normalizedSteps = rawSteps.map((st) => normalizeStepValue(st, normalizeGongueStep));
  } else if (finalRole === 'ab') {
    normalizedSteps = rawSteps.map((st) => normalizeStepValue(st, normalizeAgbeStep));
  }

  return { role: finalRole, steps: normalizedSteps, wasReclassified };
}

export function disambiguatePatternSection(
  sectionMap: Partial<Record<string, PaperStepValue[]>>
): Partial<Record<string, PaperStepValue[]>> {
  const result: Partial<Record<string, PaperStepValue[]>> = {};
  const rolesInScore = Object.keys(sectionMap).map((k) => k.toLowerCase());
  const hasAb = rolesInScore.includes('ab');

  Object.entries(sectionMap).forEach(([roleKey, steps]) => {
    if (!Array.isArray(steps)) {
      result[roleKey] = steps;
      return;
    }
    const { role, steps: cleanSteps } = disambiguateRoleAndSteps(roleKey, steps, hasAb && roleKey.toLowerCase() !== 'ab');
    const targetRole = result[role] && role !== roleKey ? roleKey : role;
    result[targetRole] = cleanSteps;
  });

  return result;
}

export function disambiguateAllPresetPatterns(
  patterns: Record<string, Partial<Record<string, PaperStepValue[]>>>
): Record<string, Partial<Record<string, PaperStepValue[]>>> {
  const result: Record<string, Partial<Record<string, PaperStepValue[]>>> = {};
  Object.entries(patterns || {}).forEach(([secName, secMap]) => {
    result[secName] = disambiguatePatternSection(secMap || {});
  });
  return result;
}
