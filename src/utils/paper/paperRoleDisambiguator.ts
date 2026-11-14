/**
 * Désambiguïsation infaillible Gonguê (Gg) vs Agbê (Ab) / Caixa (Cx) / Alfaia (Al) & normalisation OCR (< 128 lignes).
 * - Autorise `A`/`a` sur `cx`, `tr` et `al`/`mc`/`me`/`rp` sans reclassement parasite en `gg`.
 * - Verrouille formellement toute ligne déjà identifiée `cx`/`tr`/`al`/`mc`/`me`/`rp`/`tb`/`mi`/`ap` ou contenant `R/r/F/f/I/i`.
 */
import { PaperStepValue } from '../../types/paperWorkshop.types';

const STRICT_GONGUE_CHARS = new Set(['G', 'g', '4', '6']);
const SNARE_ALFAIA_ONLY_CHARS = new Set(['R', 'r', 'F', 'f', 'I', 'i']);
const AGBE_OR_DRUM_CHARS = new Set(['D', 'd', 'E', 'e', 'S', 's', 'V', 'v', '5']);
const PROTECTED_DRUM_ROLES = new Set(['al', 'mc', 'me', 'rp', 'cx', 'tr', 'tb', 'mi', 'ap']);

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

export function normalizeAlfaiaStep(s: string): string {
  if (s === 'a') return 'A';
  if (s.includes('/') || s.includes('|')) {
    return s.replace(/\ba\b/g, 'A');
  }
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
  const baseRole = code.replace(/[0-9]+$/, '');
  const allChars = rawSteps.flatMap(extractStrokeChars);

  const hasStrictGongue = allChars.some((c) => STRICT_GONGUE_CHARS.has(c));
  const hasSnareOrAlfaia = allChars.some((c) => SNARE_ALFAIA_ONLY_CHARS.has(c));
  const hasAgbe = allChars.some((c) => AGBE_OR_DRUM_CHARS.has(c));
  const hasClac = allChars.some((c) => c === 'C' || c === 'c');
  const isProtectedRole = PROTECTED_DRUM_ROLES.has(baseRole);

  let finalRole = code;
  let wasReclassified = false;

  // Règle 1 : Redressement vers Gonguê (gg) uniquement si rôle non protégé et zéro marqueur caisse/alfaia/agbê
  if (!isProtectedRole && !hasSnareOrAlfaia && !hasAgbe) {
    if (hasStrictGongue && finalRole !== 'gg') {
      finalRole = 'gg';
      wasReclassified = true;
    } else if (!hasStrictGongue && hasClac && (baseRole === 'ab' || baseRole === '')) {
      finalRole = 'gg';
      wasReclassified = true;
    }
  }

  // Règle 2 : Redressement hors Gonguê (gg) si étiqueté 'gg' par erreur OCR
  const finalBaseRole = finalRole.replace(/[0-9]+$/, '');
  if (finalBaseRole === 'gg' && !hasStrictGongue) {
    if (hasSnareOrAlfaia) {
      finalRole = allChars.some((c) => c === 'I' || c === 'i') ? 'al' : 'cx';
      wasReclassified = true;
    } else if (hasAgbe) {
      finalRole = hasAgbeAlreadyInScore ? 'cx' : 'ab';
      wasReclassified = true;
    }
  }

  // Règle 3 : Normalisation OCR selon le rôle confirmé (`a -> A` uniquement sur Alfaia, jamais sur Cx/Tr)
  const resolvedBase = finalRole.replace(/[0-9]+$/, '');
  let normalizedSteps = [...rawSteps];
  if (resolvedBase === 'gg') {
    normalizedSteps = rawSteps.map((st) => normalizeStepValue(st, normalizeGongueStep));
  } else if (resolvedBase === 'ab') {
    normalizedSteps = rawSteps.map((st) => normalizeStepValue(st, normalizeAgbeStep));
  } else if (['al', 'mc', 'me', 'rp'].includes(resolvedBase)) {
    normalizedSteps = rawSteps.map((st) => normalizeStepValue(st, normalizeAlfaiaStep));
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
