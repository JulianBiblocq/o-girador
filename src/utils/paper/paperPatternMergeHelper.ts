/**
 * Fonctions pures pour la conversion et la fusion atomique d'un motif vision (< 120 lignes).
 */
import { PaperStepValue, PatternMetricOverride } from '../../types/paperWorkshop.types';
import { VisionSinglePatternData } from './paperVisionScanService';
import { parsePupitreHeader } from './paperNomenclatureHelper';
import { parseStepValue, sanitizePatternSteps } from './paperScoreEngine';
import { detectMetricFromResolutions, detectMetricFromTotalSteps } from './paperMetricDetector';

export interface ProcessedVisionPattern {
  name: string;
  pupitreMap: Partial<Record<string, PaperStepValue[]>>;
  metricOverride: PatternMetricOverride;
  totalSteps: number;
}

export function flattenBeatsToSteps(beats: string[][], fallbackSteps: number = 16): PaperStepValue[] {
  if (!beats || beats.length === 0) return Array(fallbackSteps).fill(0);
  const flattened: any[] = [];
  beats.forEach((b) => {
    if (Array.isArray(b)) {
      b.forEach((cell) => flattened.push(parseStepValue(cell)));
    } else {
      flattened.push(parseStepValue(b));
    }
  });
  return sanitizePatternSteps(flattened, flattened.length || fallbackSteps);
}

export function processVisionPatternData(
  data: VisionSinglePatternData,
  fallbackTimeSig: string = '4/4'
): ProcessedVisionPattern {
  const resolutions = data.beatResolutions || [4, 4, 4, 4];
  const detected = resolutions.length > 0
    ? detectMetricFromResolutions(resolutions, fallbackTimeSig)
    : detectMetricFromTotalSteps(data.totalSteps || 16, fallbackTimeSig);

  const totalSteps = detected.steps || 16;
  const pupitreMap: Partial<Record<string, PaperStepValue[]>> = {};

  (data.lines || []).forEach((line) => {
    const parsedHeader = parsePupitreHeader(line.role);
    const targetCodes = parsedHeader.targetCodes.length > 0 ? parsedHeader.targetCodes : [line.role.toLowerCase()];
    const steps = flattenBeatsToSteps(line.beats, totalSteps);

    targetCodes.forEach((code) => {
      pupitreMap[code] = steps;
    });
  });

  const metricOverride: PatternMetricOverride = {
    timeSignature: detected.timeSignature,
    steps: totalSteps,
    beatResolutions: detected.beatResolutions,
    isLocked: true,
  };

  return {
    name: data.name || 'Motif',
    pupitreMap,
    metricOverride,
    totalSteps,
  };
}
