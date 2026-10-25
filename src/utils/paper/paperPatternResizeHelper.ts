/**
 * Fonctions pures de redimensionnement non destructif de pas et scission (< 75 lignes).
 */
import { PaperStepValue } from '../../types/paperWorkshop.types';

export const PRESET_METRICS = [
  { id: '4/4_16', label: '4/4 Binaire (16 pas)', sig: '4/4', steps: 16, res: [4, 4, 4, 4] },
  { id: '2/4_8', label: '2/4 Binaire (8 pas)', sig: '2/4', steps: 8, res: [4, 4] },
  { id: '3/4_12', label: '3/4 Binaire (12 pas)', sig: '3/4', steps: 12, res: [4, 4, 4] },
  { id: '6/8_6', label: '6/8 Ternaire (6 pas)', sig: '6/8', steps: 6, res: [3, 3] },
  { id: '12/8_12', label: '12/8 Ternaire (12 pas)', sig: '12/8', steps: 12, res: [3, 3, 3, 3] },
  { id: '4/4_24', label: '4/4 Sextolets (24 pas)', sig: '4/4', steps: 24, res: [6, 6, 6, 6] },
  { id: '4/4_20', label: '4/4 Mixte Tremer (20 pas)', sig: '4/4', steps: 20, res: [6, 6, 4, 4] },
  { id: '4/4_32', label: '4/4 Deux Mesures (32 pas)', sig: '4/4', steps: 32, res: [4, 4, 4, 4, 4, 4, 4, 4] },
];

export function isNonEmptyStep(val: PaperStepValue | undefined): boolean {
  if (val === undefined || val === null || val === 0 || val === '0' || val === '.') return false;
  if (typeof val === 'string' && val.trim() === '') return false;
  return true;
}

export function resizeStepArray(
  steps: PaperStepValue[] | undefined,
  targetSteps: number
): PaperStepValue[] {
  const current = Array.isArray(steps) ? steps : [];
  const result: PaperStepValue[] = Array(targetSteps).fill(0);
  for (let i = 0; i < Math.min(current.length, targetSteps); i++) {
    result[i] = current[i];
  }
  return result;
}

export function hasNotesInSecondHalf(
  steps: PaperStepValue[] | undefined,
  cutoff = 8
): boolean {
  if (!Array.isArray(steps) || steps.length <= cutoff) return false;
  for (let i = cutoff; i < steps.length; i++) {
    if (isNonEmptyStep(steps[i])) return true;
  }
  return false;
}

export function hasPatternNotesInSecondHalf(
  pupitreMap: Partial<Record<string, PaperStepValue[]>> | undefined,
  cutoff = 8
): boolean {
  if (!pupitreMap) return false;
  return Object.values(pupitreMap).some((arr) => hasNotesInSecondHalf(arr, cutoff));
}

export function splitPupitreMapIntoTwo(
  pupitreMap: Partial<Record<string, PaperStepValue[]>>,
  splitAt = 8
): [Partial<Record<string, PaperStepValue[]>>, Partial<Record<string, PaperStepValue[]>>] {
  const part1: Partial<Record<string, PaperStepValue[]>> = {};
  const part2: Partial<Record<string, PaperStepValue[]>> = {};

  Object.entries(pupitreMap).forEach(([role, arr]) => {
    if (!Array.isArray(arr)) {
      part1[role] = arr;
      part2[role] = arr;
      return;
    }
    part1[role] = arr.slice(0, splitAt);
    while (part1[role]!.length < splitAt) part1[role]!.push(0);

    part2[role] = arr.slice(splitAt, splitAt * 2);
    while (part2[role]!.length < splitAt) part2[role]!.push(0);
  });

  return [part1, part2];
}
