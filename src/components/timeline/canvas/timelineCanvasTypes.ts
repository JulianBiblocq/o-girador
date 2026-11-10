import { SlaveFocusContext } from '../../../utils/slaveStepOpacityResolver';

export const TRACK_ROW_HEIGHT = 40;
export const AUTO_LANE_EXPANDED_HEIGHT = 81;
export const AUTO_LANE_COLLAPSED_HEIGHT = 31;

export type TimelineHitZone = 'variation-toggle' | 'pattern-badge' | 'cell';

export interface TimelineHitResult {
  trackId: number; trackIndex: number; measureIdx: number;
  stepIdx: number; actualStepIdx: number; stepsInMeasure: number;
  patternId: number; patternIdx: number; relativeIdx: number; spanMeasures: number;
  zone: TimelineHitZone; isToada: boolean; isSilence: boolean;
  instId: string; instType: string; allowedStrokes: string[];
  measureAllowVariations: boolean; variationsCount: number;
  cellX: number; cellY: number; cellW: number; cellH: number; relCellX: number;
  anchorRect: DOMRect;
}

export interface TimelineLassoRect {
  x: number; y: number; width: number; height: number;
}

export interface TimelineRowLayout {
  trackId: number; trackIndex: number; top: number; height: number;
  autoHeight: number; totalRowHeight: number; isAutomationOpen: boolean;
  isMuted: boolean; isToada: boolean; isLinkedSlave: boolean;
  isLinkFolder: boolean; isLinkMaster: boolean;
  parentBusTrackId?: number; masterTrackId?: number; slaveTrackIds?: number[];
  instMixerBg: string; instColors: Record<string, string>;
}

export interface TimelineMeasureHeaderBadgeBounds {
  hasBadge: boolean; badgeX: number; badgeY: number; badgeW: number; badgeH: number;
  hasVarBtn: boolean; varBtnX: number; varBtnY: number; varBtnW: number; varBtnH: number;
}

export interface TimelineCanvasRenderParams {
  ctx: CanvasRenderingContext2D; canvasW: number; canvasH: number; dpr: number;
  scrollLeft: number; tracksScrollTop: number; baseMeasureW: number; liveMeasureW: number;
  totalMeasures: number; measureWidths: number[]; measureLeftPositions: number[];
  rowLayouts: TimelineRowLayout[]; tracks: any[]; tracksMeta: any[];
  timeSig: string; measureTimeSigs?: Record<number, string>;
  songSections?: Array<{ id?: string | number; name?: string; startMeasure: number; endMeasure: number; color: string }>;
  loopStartMeasure: number | null; loopEndMeasure: number | null; isLoopRegionActive: boolean;
  selectedTimelineCells: Array<{ trackId: number; mIdx: number }>;
  activeTimelineCell: { trackId: number; measureIdx: number } | null;
  hoveredCell?: { trackId: number; mIdx: number; zone?: string } | null;
  lassoRect?: TimelineLassoRect | null;
  isLeftHanded: boolean; isEcoMode: boolean; isPanningActive: boolean;
  lang: string; focusCtx?: SlaveFocusContext;
}

export function findVisibleMeasureRange(
  measureLeftPositions: number[], measureWidths: number[], baseMeasureW: number,
  scale: number, totalMeasures: number, scrollLeft: number, canvasW: number
): { start: number; end: number } {
  if (totalMeasures <= 0 || canvasW <= 0) return { start: 0, end: -1 };
  const safeBase = baseMeasureW > 0 ? baseMeasureW : 120;
  const safeScale = scale > 0 ? scale : 1;
  const viewRight = scrollLeft + canvasW;

  let lo = 0, hi = totalMeasures - 1, start = totalMeasures;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const leftPx = (measureLeftPositions[mid] ?? mid * safeBase) * safeScale;
    const widthPx = (measureWidths[mid] ?? safeBase) * safeScale;
    if (leftPx + widthPx > scrollLeft) { start = mid; hi = mid - 1; }
    else { lo = mid + 1; }
  }
  if (start >= totalMeasures) return { start: 0, end: -1 };

  lo = start; hi = totalMeasures - 1;
  let end = start - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const leftPx = (measureLeftPositions[mid] ?? mid * safeBase) * safeScale;
    if (leftPx < viewRight) { end = mid; lo = mid + 1; }
    else { hi = mid - 1; }
  }
  return { start, end };
}

export function resolveMeasureBeatSteps(timeSigStr: string, beatResolutions?: number[]): {
  defaultBeats: number; beatRes: number[]; stepsInMeasure: number;
} {
  const defaultBeats =
    timeSigStr === '2/4' || timeSigStr === '6/8' ? 2 : timeSigStr === '3/4' ? 3 : (parseInt(timeSigStr.split('/')[0], 10) || 4);
  const beatRes = beatResolutions && beatResolutions.length >= defaultBeats ? beatResolutions : Array(defaultBeats).fill(4);
  let stepsInMeasure = 0;
  for (let b = 0; b < defaultBeats; b++) stepsInMeasure += beatRes[b] ?? 4;
  return { defaultBeats, beatRes, stepsInMeasure };
}

export function computeMeasureHeaderBadgeBounds(params: {
  cellX: number; cellY: number; cellW: number; isMacro: boolean; isToada: boolean;
  patternId: number; activePatternName: string | null; relativeIdx: number; spanMeasures: number;
  toadaVocalBadges?: { pPtnName?: string; cPtnName?: string };
  instType: string; instId: string; variationsCount: number; lang: string;
}): TimelineMeasureHeaderBadgeBounds {
  const { cellX, cellY, cellW, isMacro, isToada, patternId, activePatternName, relativeIdx, spanMeasures, toadaVocalBadges, instType, instId, variationsCount, lang } = params;
  if (isMacro || (isToada && patternId === -1) || cellW < 24) {
    return { hasBadge: false, badgeX: 0, badgeY: 0, badgeW: 0, badgeH: 0, hasVarBtn: false, varBtnX: 0, varBtnY: 0, varBtnW: 0, varBtnH: 0 };
  }
  const badgeX = cellX + 4, badgeY = cellY + 4, badgeH = 20;
  let estW = 54;
  if (toadaVocalBadges) {
    const pLen = toadaVocalBadges.pPtnName ? Math.min(60, toadaVocalBadges.pPtnName.length * 5.2 + 18) : 0;
    const cLen = toadaVocalBadges.cPtnName ? Math.min(60, toadaVocalBadges.cPtnName.length * 5.2 + 18) : 0;
    estW = Math.max(36, pLen + cLen + (pLen && cLen ? 4 : 0));
  } else {
    const txt = relativeIdx > 0 ? `[${relativeIdx + 1}/${spanMeasures}]` : (activePatternName || (lang === 'fr' ? 'Silence' : 'Silêncio'));
    estW = Math.min(125, Math.max(44, txt.length * 5.8 + 20));
  }
  const badgeW = Math.max(24, Math.min(estW, cellW - 8));
  const hasVarBtn = !isToada && patternId !== -1 && instType !== 'voice' && instId !== 'apito' && variationsCount > 0 && (badgeW + 28 <= cellW);
  return { hasBadge: true, badgeX, badgeY, badgeW, badgeH, hasVarBtn, varBtnX: badgeX + badgeW + 4, varBtnY: badgeY, varBtnW: 18, varBtnH: 20 };
}
