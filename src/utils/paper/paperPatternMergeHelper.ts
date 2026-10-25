/**
 * Fonctions pures pour la conversion et la fusion atomique d'un motif vision (< 120 lignes).
 */
import { PaperStepValue, PatternMetricOverride } from '../../types/paperWorkshop.types';
import { VisionSinglePatternData } from './paperVisionScanService';
import { parsePupitreHeader } from './paperNomenclatureHelper';
import { sanitizePatternSteps } from './paperScoreEngine';
import { detectMetricFromResolutions, detectMetricFromTotalSteps } from './paperMetricDetector';

export interface ProcessedVisionPattern {
  name: string;
  pupitreMap: Partial<Record<string, PaperStepValue[]>>;
  metricOverride: PatternMetricOverride;
  totalSteps: number;
}

export function cleanVisionStepCell(raw: any): PaperStepValue {
  if (raw === undefined || raw === null || raw === '' || raw === ' ' || raw === 0 || raw === '0') {
    return 0;
  }
  const s = String(Array.isArray(raw) ? raw[0] : raw).trim();
  if (s === '.' || s === '·' || s === '•' || s === '_') return 0;
  if (s === '-') return '-';
  if (Array.isArray(raw)) {
    return raw.length >= 2 ? [String(raw[0]).trim(), String(raw[1]).trim()] : (raw[0] ?? 0);
  }
  if (s.includes('/') || (s.includes('|') && s !== '||' && s !== '|')) {
    const parts = s.includes('/') ? s.split('/') : s.split('|');
    return [parts[0].trim() || '0', parts[1].trim() || '0'];
  }
  return s;
}

export function flattenBeatsToSteps(beats: string[][], fallbackSteps: number = 16): PaperStepValue[] {
  if (!beats || beats.length === 0) return Array(fallbackSteps).fill(0);
  const flattened: PaperStepValue[] = [];
  beats.forEach((b) => {
    if (Array.isArray(b)) {
      b.forEach((cell) => flattened.push(cleanVisionStepCell(cell)));
    } else {
      flattened.push(cleanVisionStepCell(b));
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
    let rawRole = (line.role || '').trim().replace(/^\{+\s*/, '');
    if (rawRole.toLowerCase() === 'ae') rawRole = 'al';
    const parsedHeader = parsePupitreHeader(rawRole);
    const targetCodes = parsedHeader.targetCodes.length > 0 ? parsedHeader.targetCodes : [rawRole.toLowerCase()];
    const steps = flattenBeatsToSteps(line.beats, totalSteps);

    targetCodes.forEach((code) => {
      if (code) pupitreMap[code] = steps;
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
