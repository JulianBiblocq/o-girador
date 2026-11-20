import { Pattern } from '../types';
import {
  getInstrumentFamily,
  normalizeInstrumentId,
  convertStepsToVocalRole,
} from './instrumentCompatibility';

export function cloneStepValue(v: any): string | number | [string, string] {
  if (Array.isArray(v)) {
    return [String(v[0] ?? '0'), String(v[1] ?? '0')];
  }
  return v === undefined || v === null || v === '' ? 0 : v;
}

export function normalizeStepForTargetInstrument(
  val: string | number | [string, string],
  targetInstId?: string
): string | number | [string, string] {
  const normId = normalizeInstrumentId(targetInstId);
  const isAlfaia = getInstrumentFamily(normId) === 'alfaias';
  if (!isAlfaia) return cloneStepValue(val);
  if (Array.isArray(val)) {
    return [
      val[0] === 'a' ? 'A' : String(val[0] ?? '0'),
      val[1] === 'a' ? 'A' : String(val[1] ?? '0'),
    ];
  }
  return val === 'a' ? 'A' : cloneStepValue(val);
}

export function normalizeStepsArrayForTarget(
  steps: (string | number | [string, string])[] | undefined,
  targetInstId?: string
): (string | number | [string, string])[] {
  if (!Array.isArray(steps)) return [];
  const normId = normalizeInstrumentId(targetInstId);
  const family = getInstrumentFamily(normId);
  if (family === 'voices') {
    const role: 'P' | 'C' = normId === 'coro' ? 'C' : 'P';
    return convertStepsToVocalRole(steps, role);
  }
  if (family === 'alfaias') {
    return steps.map((s) => normalizeStepForTargetInstrument(s, normId));
  }
  return steps.map((s) => cloneStepValue(s));
}

export function normalizePatternStepsForTarget<T extends Partial<Pattern>>(
  pattern: T,
  targetInstId?: string
): T {
  const normId = normalizeInstrumentId(targetInstId);
  const next: T = { ...pattern };
  if (Array.isArray(next.activeSteps)) {
    next.activeSteps = normalizeStepsArrayForTarget(next.activeSteps, normId);
  }
  if (Array.isArray(next.preRollActiveSteps)) {
    next.preRollActiveSteps = normalizeStepsArrayForTarget(next.preRollActiveSteps, normId);
  }
  if (Array.isArray(next.variations)) {
    next.variations = next.variations.map((v) => ({
      ...v,
      steps: Array.isArray(v.steps) ? (normalizeStepsArrayForTarget(v.steps, normId) as any) : v.steps,
    }));
  }
  return next;
}

export function getPasteDisabledReason(
  hasClipboard: boolean,
  isCompatible: boolean,
  lang: string,
  sourceLabel?: string,
  targetLabel?: string
): string | undefined {
  const isFr = lang === 'fr';
  if (!hasClipboard) {
    return isFr ? 'Presse-papier vide' : 'Área de transferência vazia';
  }
  if (!isCompatible) {
    const detail = sourceLabel && targetLabel ? ` (${sourceLabel} -> ${targetLabel})` : (sourceLabel ? ` (${sourceLabel})` : '');
    return isFr
      ? `Collage interdit : familles de frappes incompatibles${detail}`
      : `Colagem bloqueada: famílias de toques incompatíveis${detail}`;
  }
  return undefined;
}
