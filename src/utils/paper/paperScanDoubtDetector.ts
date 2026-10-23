/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Détecteur automatique des doutes OCR/scan papier (< 75 lignes).
 */
import { PaperStepValue } from '../../types/paperWorkshop.types';
import { usePaperVigilanceStore, VigilancePoint } from '../../stores/usePaperVigilanceStore';

const VALID_CHAR_REGEX = /^[DdeEIBrRFfGgAaSsVvPpTtLl0·.\-/% ]$/;

export function isStepDoubtful(stepVal: PaperStepValue, confidence?: number): boolean {
  if (confidence !== undefined && confidence < 0.85) return true;
  if (stepVal === 0 || stepVal === '0' || stepVal === '·' || stepVal === '' || stepVal === null || stepVal === undefined) {
    return false;
  }
  if (Array.isArray(stepVal)) {
    return stepVal.some((sub) => isStepDoubtful(sub, confidence));
  }
  const str = String(stepVal).trim();
  if (str.includes('?') || str.includes('~') || str.includes('*')) return true;
  if (str.length === 1 && !VALID_CHAR_REGEX.test(str)) return true;
  return false;
}

export function detectDoubtPointsInPatterns(
  patterns: Record<string, Partial<Record<string, PaperStepValue[]>>>
): Omit<VigilancePoint, 'id' | 'scoreId'>[] {
  const result: Omit<VigilancePoint, 'id' | 'scoreId'>[] = [];
  Object.entries(patterns).forEach(([sectionName, pupitreMap]) => {
    Object.entries(pupitreMap || {}).forEach(([roleKey, steps]) => {
      if (!Array.isArray(steps)) return;
      steps.forEach((st, stepIndex) => {
        if (isStepDoubtful(st)) {
          result.push({
            sectionName,
            roleKey,
            stepIndex,
            reason: 'ocr_doubt',
          });
        }
      });
    });
  });
  return result;
}

export function scanAndRegisterDoubtPoints(
  scoreId: string,
  patterns: Record<string, Partial<Record<string, PaperStepValue[]>>>
): number {
  const doubts = detectDoubtPointsInPatterns(patterns);
  const store = usePaperVigilanceStore.getState();
  store.registerOcrDoubtsForScore(scoreId, doubts);
  return doubts.length;
}
