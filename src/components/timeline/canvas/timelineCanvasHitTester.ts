import { instrumentsConfig } from '../../../data';
import { resolveTimelineTrackMeasureData } from '../TimelineTrackToadaMirror';
import {
  TimelineHitResult, TimelineHitZone, TimelineRowLayout,
  computeMeasureHeaderBadgeBounds, findVisibleMeasureRange, resolveMeasureBeatSteps,
} from './timelineCanvasTypes';

export interface TimelineCanvasHitTestParams {
  clientX: number; clientY: number;
  cachedContainerRect: { left: number; top: number; width: number; height: number };
  headerOffsetX?: number; scrollLeft: number; tracksScrollTop: number;
  baseMeasureW: number; liveMeasureW: number; totalMeasures: number;
  measureWidths: number[]; measureLeftPositions: number[];
  rowLayouts: TimelineRowLayout[]; tracks: any[]; tracksMeta: any[];
  timeSig: string; measureTimeSigs?: Record<number, string>; lang: string;
}

function makeAnchorRect(left: number, top: number, width: number, height: number): DOMRect {
  return { x: left, y: top, width, height, top, left, right: left + width, bottom: top + height, toJSON() { return this; } } as DOMRect;
}

export function resolveTimelineCanvasHit(params: TimelineCanvasHitTestParams): TimelineHitResult | null {
  const { clientX, clientY, cachedContainerRect, headerOffsetX = 0, scrollLeft, tracksScrollTop, baseMeasureW, liveMeasureW, totalMeasures, measureWidths, measureLeftPositions, rowLayouts, tracks, tracksMeta } = params;
  if (totalMeasures <= 0 || rowLayouts.length === 0) return null;

  const canvasX = clientX - cachedContainerRect.left - headerOffsetX;
  const canvasY = clientY - cachedContainerRect.top;
  if (canvasX < 0 || canvasY < 0 || canvasX > cachedContainerRect.width || canvasY > cachedContainerRect.height) return null;

  const worldX = canvasX + scrollLeft, worldY = canvasY + tracksScrollTop;

  let rLo = 0, rHi = rowLayouts.length - 1, hitRow: TimelineRowLayout | null = null;
  while (rLo <= rHi) {
    const mid = (rLo + rHi) >>> 1, candidate = rowLayouts[mid];
    if (worldY < candidate.top) rHi = mid - 1;
    else if (worldY >= candidate.top + candidate.totalRowHeight) rLo = mid + 1;
    else { hitRow = candidate; break; }
  }
  if (!hitRow || worldY >= hitRow.top + hitRow.height) return null;

  const safeBase = baseMeasureW > 0 ? baseMeasureW : 120;
  const scale = (liveMeasureW > 0 ? liveMeasureW : safeBase) / safeBase;

  let mLo = 0, mHi = totalMeasures - 1, measureIdx = -1;
  while (mLo <= mHi) {
    const mid = (mLo + mHi) >>> 1;
    const leftPx = (measureLeftPositions[mid] ?? mid * safeBase) * scale;
    const widthPx = (measureWidths[mid] ?? safeBase) * scale;
    if (worldX < leftPx) mHi = mid - 1;
    else if (worldX >= leftPx + widthPx) mLo = mid + 1;
    else { measureIdx = mid; break; }
  }
  if (measureIdx < 0) return null;

  const cellWorldLeft = (measureLeftPositions[measureIdx] ?? measureIdx * safeBase) * scale;
  const cellW = (measureWidths[measureIdx] ?? safeBase) * scale, cellH = hitRow.height;
  const cellX = cellWorldLeft - scrollLeft, cellY = hitRow.top - tracksScrollTop;
  const relCellX = Math.max(0, Math.min(cellW, worldX - cellWorldLeft));

  const trackMeta = tracksMeta[hitRow.trackIndex] || tracksMeta.find((t) => t.id === hitRow.trackId);
  const liveTrack = tracks.find((t) => t.id === hitRow.trackId) || trackMeta;
  if (!trackMeta || !liveTrack) return null;
  const trackInst = instrumentsConfig[trackMeta.instrumentIdx] || instrumentsConfig[0];
  const puxTrack = hitRow.isToada ? (tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador') || null) : null;
  const coroTrack = hitRow.isToada ? (tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro') || null) : null;

  const m = resolveTimelineTrackMeasureData(measureIdx, hitRow.isToada, liveTrack, trackInst, hitRow.trackIndex, tracksMeta, trackMeta, hitRow.isLinkedSlave, puxTrack, coroTrack, tracks);
  const effTrackId = hitRow.isLinkedSlave ? trackMeta.id : m.currentTrackId;
  const curInst = hitRow.isLinkedSlave ? trackInst : (m.currentInst || trackInst);
  const patternId = m.activePattern?.id ?? -1;
  const patternIdx = m.activePattern && m.activeTrack?.patterns ? m.activeTrack.patterns.findIndex((p: any) => p.id === m.activePattern!.id) : -1;
  const variationsCount = m.activePattern?.variations?.length ?? 0;
  const measureAllowVariations = m.activePattern?.measureAllowVariations?.[measureIdx] ?? true;
  const activePatternName = m.isSilence ? (params.lang === 'fr' ? 'Silence' : 'Silêncio') : (m.activePattern?.name ?? null);
  const isMacro = liveMeasureW < 140, isMinZoom = liveMeasureW <= 45;

  let zone: TimelineHitZone = 'cell';
  if (!isMacro) {
    const b = computeMeasureHeaderBadgeBounds({ cellX, cellY, cellW, isMacro: false, isToada: hitRow.isToada, patternId, activePatternName, relativeIdx: m.relativeIdx, spanMeasures: m.spanMeasures, toadaVocalBadges: m.toadaVocalBadges, instType: curInst.type, instId: curInst.id, variationsCount, lang: params.lang });
    if (b.hasVarBtn && canvasX >= b.varBtnX && canvasX <= b.varBtnX + b.varBtnW && canvasY >= b.varBtnY && canvasY <= b.varBtnY + b.varBtnH) zone = 'variation-toggle';
    else if (b.hasBadge && !hitRow.isToada && canvasX >= b.badgeX && canvasX <= b.badgeX + b.badgeW && canvasY >= b.badgeY && canvasY <= b.badgeY + b.badgeH) zone = 'pattern-badge';
  } else if (!isMinZoom && !hitRow.isToada && relCellX >= Math.max(0, cellW - 24)) {
    zone = 'pattern-badge';
  }

  const timeSigStr = params.measureTimeSigs?.[measureIdx] || params.timeSig || '4/4';
  const { defaultBeats, beatRes, stepsInMeasure } = resolveMeasureBeatSteps(timeSigStr, m.activePattern?.beatResolutions);
  const beatW = cellW / Math.max(1, defaultBeats);
  const bIdx = Math.min(defaultBeats - 1, Math.max(0, Math.floor(relCellX / Math.max(0.001, beatW))));
  const res = beatRes[bIdx] ?? 4;
  let stepIdx = Math.min(res - 1, Math.max(0, Math.floor(((relCellX - bIdx * beatW) / Math.max(0.001, beatW)) * res)));
  for (let b = 0; b < bIdx; b++) stepIdx += beatRes[b] ?? 4;

  return {
    trackId: effTrackId, trackIndex: hitRow.trackIndex, measureIdx,
    stepIdx, actualStepIdx: (m.relativeIdx || 0) * 16 + stepIdx, stepsInMeasure,
    patternId, patternIdx, relativeIdx: m.relativeIdx, spanMeasures: m.spanMeasures,
    zone, isToada: hitRow.isToada, isSilence: m.isSilence,
    instId: curInst.id, instType: curInst.type, allowedStrokes: Object.keys(curInst.colors || {}),
    measureAllowVariations, variationsCount, cellX, cellY, cellW, cellH, relCellX,
    anchorRect: makeAnchorRect(cachedContainerRect.left + headerOffsetX + cellX, cachedContainerRect.top + cellY, cellW, cellH),
  };
}

export function computeLassoSelectedCells(params: {
  worldStartX: number; worldStartY: number; worldEndX: number; worldEndY: number;
  rowLayouts: TimelineRowLayout[]; measureLeftPositions: number[]; measureWidths: number[];
  baseMeasureW: number; liveMeasureW: number; totalMeasures: number;
  additive?: boolean; initialCells?: Array<{ trackId: number; mIdx: number }>;
}): Array<{ trackId: number; mIdx: number }> {
  const { worldStartX, worldStartY, worldEndX, worldEndY, rowLayouts, measureLeftPositions, measureWidths, baseMeasureW, liveMeasureW, totalMeasures, additive = false, initialCells = [] } = params;
  const minX = Math.min(worldStartX, worldEndX), maxX = Math.max(worldStartX, worldEndX);
  const minY = Math.min(worldStartY, worldEndY), maxY = Math.max(worldStartY, worldEndY);
  const safeBase = baseMeasureW > 0 ? baseMeasureW : 120;
  const scale = (liveMeasureW > 0 ? liveMeasureW : safeBase) / safeBase;
  const { start, end } = findVisibleMeasureRange(measureLeftPositions, measureWidths, safeBase, scale, totalMeasures, minX, Math.max(1, maxX - minX));

  const out: Array<{ trackId: number; mIdx: number }> = additive ? [...initialCells] : [];
  const seen = new Set<string>(out.map((c) => `${c.trackId}:${c.mIdx}`));
  if (end < start) return out;

  for (let r = 0; r < rowLayouts.length; r++) {
    const row = rowLayouts[r];
    if (row.isToada || row.top + row.height < minY || row.top > maxY) continue;
    for (let m = start; m <= end; m++) {
      const key = `${row.trackId}:${m}`;
      if (!seen.has(key)) { seen.add(key); out.push({ trackId: row.trackId, mIdx: m }); }
    }
  }
  return out;
}
