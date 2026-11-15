/**
 * gridStepMutationHelpers.ts — Calculs purs d'édition et de gommage (pas simples et scindés [a, b]) (< 90 lignes).
 */
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Pattern } from '../../types';

export function readFreshStepState(
  trackId: number,
  patternId: number,
  variationId: string | null,
  idx: number
): { ptn?: Pattern; rawVal: string | number | [string, string] } {
  const track = useSequencerStore.getState().tracks.find((t) => t.id === trackId);
  const ptn = track?.patterns.find((p) => p.id === patternId);
  if (!ptn) return { rawVal: 0 };
  if (variationId) {
    const v = ptn.variations?.find((vr) => vr.id === variationId);
    return { ptn, rawVal: (v?.steps?.[idx] as any) ?? 0 };
  }
  return { ptn, rawVal: (ptn.activeSteps?.[idx] as any) ?? 0 };
}

export function computeErasedStepResult(
  rawVal: string | number | [string, string] | null | undefined,
  subIndex?: 0 | 1
): { changed: boolean; finalVal: string | number | [string, string]; nextSub: 0 | 1 | null } {
  if (rawVal === 0 || rawVal === '0' || rawVal === '' || rawVal == null) {
    return { changed: false, finalVal: 0, nextSub: null };
  }
  if (Array.isArray(rawVal) && subIndex !== undefined) {
    const curSub = String(rawVal[subIndex] ?? '0').trim();
    const otherSub = String(rawVal[subIndex === 0 ? 1 : 0] ?? '0').trim();
    if ((curSub === '0' || !curSub) && otherSub !== '0' && Boolean(otherSub)) {
      return { changed: false, finalVal: rawVal, nextSub: subIndex };
    }
    const arr: [string, string] = [String(rawVal[0] ?? '0'), String(rawVal[1] ?? '0')];
    arr[subIndex] = '0';
    if ((arr[0] === '0' || !arr[0]) && (arr[1] === '0' || !arr[1])) {
      return { changed: true, finalVal: 0, nextSub: null };
    }
    return { changed: true, finalVal: arr, nextSub: subIndex };
  }
  return { changed: true, finalVal: 0, nextSub: null };
}

export function computePaintedStepResult(
  rawVal: string | number | [string, string] | null | undefined,
  stroke: string | number,
  subIndex?: 0 | 1
): { changed: boolean; finalVal: string | number | [string, string]; nextSub: 0 | 1 | null; normTarget: string } {
  const normTarget = stroke === 0 || stroke === '0' ? '0' : String(stroke);
  if (Array.isArray(rawVal)) {
    const targetSub: 0 | 1 = subIndex ?? 0;
    if (String(rawVal[targetSub] ?? '0').trim() === normTarget) {
      return { changed: false, finalVal: rawVal, nextSub: targetSub, normTarget };
    }
    const arr: [string, string] = [String(rawVal[0] ?? '0'), String(rawVal[1] ?? '0')];
    arr[targetSub] = normTarget;
    return { changed: true, finalVal: arr, nextSub: targetSub, normTarget };
  }
  if (String(rawVal ?? '0').trim() === normTarget || ((rawVal === 0 || !rawVal) && normTarget === '0')) {
    return { changed: false, finalVal: normTarget === '0' ? 0 : normTarget, nextSub: null, normTarget };
  }
  return { changed: true, finalVal: normTarget === '0' ? 0 : normTarget, nextSub: null, normTarget };
}
