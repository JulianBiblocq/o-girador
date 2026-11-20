import { canTransferPatterns, normalizeInstrumentId } from '../../utils/instrumentCompatibility';
import { normalizeStepForTargetInstrument } from '../../utils/patternPasteNormalizer';

export const getGlobalClipboard = () => {
  if (typeof window !== 'undefined') return (window as any).__oGiradorRelativeClipboard || null;
  return null;
};

export function copyRelativeSteps(selectedStepIndices: number[], ptn: any, sourceInstId = '') {
  if (selectedStepIndices.length === 0) return;
  const sorted = [...selectedStepIndices].sort((a, b) => a - b);
  const baseIdx = sorted[0];
  const normSource = normalizeInstrumentId(sourceInstId || ptn?.sourceInstId || ptn?.instrumentId || '');
  const copiedSteps = sorted.map((idx) => ({
    offset: idx - baseIdx,
    val: ptn?.activeSteps?.[idx] ?? 0,
    lyric: ptn?.lyrics?.[idx] || '',
    note: ptn?.notes?.[idx] || '',
  }));
  if (typeof window !== 'undefined') {
    (window as any).__oGiradorRelativeClipboard = {
      sourceInstId: normSource,
      sourceInstrumentType: normSource,
      steps: copiedSteps,
    };
    window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
  }
}

export function pasteRelativeSteps(
  ptn: any,
  targetIdx: number,
  instrumentId: string,
  trackId: number,
  selectedVariationId: string | null,
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any) => void,
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any, lyrics?: any, notes?: any) => void,
  setSelectedStepIndices: (indices: number[]) => void
) {
  const globalClipboard = getGlobalClipboard();
  if (!globalClipboard || !Array.isArray(globalClipboard.steps)) return;
  if (!canTransferPatterns(globalClipboard, instrumentId)) return;

  const destIndices: number[] = [];
  const destValues: any[] = [];
  const destLyrics: string[] = [];
  const destNotes: string[] = [];

  const normInst = normalizeInstrumentId(instrumentId);
  const isPux = normInst === 'puxador';
  const isCoro = normInst === 'coro';
  const isDestVocal = isPux || isCoro;
  const targetRole = isPux ? 'P' : 'C';
  const sourceToReplace = isPux ? 'C' : 'P';

  globalClipboard.steps.forEach((item: any) => {
    const destIdx = targetIdx + item.offset;
    if (destIdx >= 0 && destIdx < ptn.steps) {
      destIndices.push(destIdx);
      let destVal = normalizeStepForTargetInstrument(item.val, normInst);
      if (isDestVocal) {
        if (Array.isArray(destVal)) destVal = destVal.map((v: string) => (v === sourceToReplace ? targetRole : v)) as [string, string];
        else if (destVal === sourceToReplace) destVal = targetRole;
      }
      destValues.push(destVal);
      destLyrics.push(item.lyric || '');
      destNotes.push(item.note || '');
    }
  });

  if (destIndices.length > 0) {
    if (selectedVariationId) handleVariationStepValueChange(trackId, ptn.id, selectedVariationId, destIndices, destValues);
    else handleTrackStepValueChange(trackId, ptn.id, destIndices, destValues, destLyrics, destNotes);
    setSelectedStepIndices([]);
  }
}
