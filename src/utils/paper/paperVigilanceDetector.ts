/**
 * Détecteur automatique de décalages et disparités de cellules au scan (< 110 lignes).
 */
import { VigilancePoint, usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { parsePupitreHeader } from './paperNomenclatureHelper';

export function detectRawBeatShiftDoubts(
  sectionName: string,
  lines: Array<{ role: string; beats: string[][] }>,
  expectedResolutions: number[] = [4, 4, 4, 4],
  totalSteps: number = 16
): Omit<VigilancePoint, 'id' | 'scoreId'>[] {
  const doubts: Omit<VigilancePoint, 'id' | 'scoreId'>[] = [];

  (lines || []).forEach((line) => {
    const rawRole = (line.role || '').trim().replace(/^\{+\s*/, '');
    const parsed = parsePupitreHeader(rawRole.toLowerCase() === 'ae' ? 'al' : rawRole);
    const targetCodes = parsed.targetCodes.length > 0 ? parsed.targetCodes : [rawRole.toLowerCase()];
    const primaryRole = targetCodes[0] || 'al';

    let runningStep = 0;
    let rawLineTotal = 0;
    let lineHasBeatDiscrepancy = false;

    (line.beats || []).forEach((beat, bIdx) => {
      const beatCells = Array.isArray(beat) ? beat : [beat];
      const expectedLen = expectedResolutions[bIdx] ?? (totalSteps >= 16 ? 4 : Math.floor(totalSteps / 4));
      rawLineTotal += beatCells.length;

      if (beatCells.length !== expectedLen) {
        lineHasBeatDiscrepancy = true;
        targetCodes.forEach((code) => {
          doubts.push({
            sectionName,
            roleKey: code,
            stepIndex: Math.min(runningStep, totalSteps - 1),
            reason: 'ocr_doubt',
          });
        });
      }
      runningStep += expectedLen;
    });

    // Disparité globale de fin de ligne (ex: 15 ou 17 cellules brutes avant normalisation à 16)
    if (!lineHasBeatDiscrepancy && rawLineTotal !== totalSteps) {
      targetCodes.forEach((code) => {
        doubts.push({
          sectionName,
          roleKey: code,
          stepIndex: Math.max(0, Math.min(rawLineTotal, totalSteps - 1)),
          reason: 'ocr_doubt',
        });
      });
    }
  });

  return doubts;
}

export function inspectAndRegisterRawScanDoubts(
  scoreId: string,
  sectionName: string,
  lines: Array<{ role: string; beats: string[][] }>,
  expectedResolutions: number[] = [4, 4, 4, 4],
  totalSteps: number = 16
): number {
  if (!scoreId || !lines || lines.length === 0) return 0;
  const doubts = detectRawBeatShiftDoubts(sectionName, lines, expectedResolutions, totalSteps);
  const store = usePaperVigilanceStore.getState();
  doubts.forEach((d) => {
    store.addPoint({
      scoreId,
      sectionName: d.sectionName,
      roleKey: d.roleKey,
      stepIndex: d.stepIndex,
      reason: 'ocr_doubt',
    });
  });
  return doubts.length;
}
