import { SlaveFocusContext } from '../../../utils/slaveStepOpacityResolver';
import { TimelineCanvasTheme, withHexAlpha } from './timelineCanvasThemeCache';
import { TimelineMeasureHeaderBadgeBounds, computeMeasureHeaderBadgeBounds, resolveMeasureBeatSteps } from './timelineCanvasTypes';
import { drawDetailedPercussionSteps, drawSilentHatchBlock } from './timelineCanvasStepDrawer';
import { drawDetailedVoiceSteps, drawToadaCellBlock } from './timelineCanvasVoiceDrawer';

export { computeMeasureHeaderBadgeBounds };

function drawHeaderBadgeAndVarBtn(
  ctx: CanvasRenderingContext2D, bounds: TimelineMeasureHeaderBadgeBounds,
  toadaVocalBadges: { pPtnName?: string; cPtnName?: string } | undefined,
  relativeIdx: number, spanMeasures: number, activePatternName: string | null,
  isSelectedCell: boolean, hasChildOverrides: boolean, measureAllowVariations: boolean,
  lang: string, theme: TimelineCanvasTheme
): void {
  if (!bounds.hasBadge) return;
  const { badgeX, badgeY, badgeW, badgeH } = bounds;
  ctx.save();
  if (toadaVocalBadges) {
    let cx = badgeX;
    const drawPill = (tag: string, name: string, col: string, txtCol: string) => {
      const txt = relativeIdx > 0 ? `[${relativeIdx + 1}/${spanMeasures}]` : name;
      const pw = Math.min(72, Math.max(28, txt.length * 5 + 18));
      ctx.fillStyle = withHexAlpha(col, '30'); ctx.fillRect(cx, badgeY, pw, badgeH);
      ctx.strokeStyle = col; if (relativeIdx > 0) ctx.setLineDash([2, 2]);
      ctx.strokeRect(cx + 0.5, badgeY + 0.5, pw - 1, badgeH - 1); ctx.setLineDash([]);
      ctx.font = `bold 8px ${theme.fontCactus}`; ctx.textBaseline = 'middle';
      ctx.fillStyle = txtCol; ctx.fillText(tag, cx + 4, badgeY + badgeH / 2);
      ctx.fillStyle = theme.cordelText; ctx.fillText(txt, cx + 13, badgeY + badgeH / 2, pw - 16);
      cx += pw + 4;
    };
    if (toadaVocalBadges.pPtnName) drawPill('P', toadaVocalBadges.pPtnName, theme.accentCrimson, theme.puxText);
    if (toadaVocalBadges.cPtnName && cx < badgeX + badgeW) drawPill('C', toadaVocalBadges.cPtnName, theme.coroTeal, theme.coroText);
  } else {
    ctx.fillStyle = withHexAlpha(theme.cordelBg, isSelectedCell ? 'ff' : 'd9'); ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.strokeStyle = isSelectedCell ? theme.accentCrimson : withHexAlpha(theme.cordelBorder, relativeIdx > 0 ? '66' : '38');
    ctx.lineWidth = isSelectedCell ? 1.5 : 1;
    if (relativeIdx > 0 && !isSelectedCell) ctx.setLineDash([3, 2]);
    ctx.strokeRect(badgeX + 0.5, badgeY + 0.5, badgeW - 1, badgeH - 1); ctx.setLineDash([]);
    const rawTxt = relativeIdx > 0 ? `[${relativeIdx + 1}/${spanMeasures}]` : (activePatternName || (lang === 'fr' ? 'Silence' : 'Silêncio'));
    ctx.fillStyle = theme.cordelText; ctx.font = `bold 9px ${theme.fontCactus}`; ctx.textBaseline = 'middle';
    ctx.fillText(rawTxt.toUpperCase(), badgeX + 5, badgeY + badgeH / 2 + 0.5, Math.max(10, badgeW - 16));
    if (hasChildOverrides) { ctx.fillStyle = '#f59e0b'; ctx.fillRect(badgeX + badgeW - 15, badgeY + 7, 4, 4); }
    ctx.fillStyle = withHexAlpha(theme.cordelText, '80'); ctx.font = `7px ${theme.fontSans}`;
    ctx.fillText('▼', badgeX + badgeW - 9, badgeY + badgeH / 2 + 0.5);
  }
  if (bounds.hasVarBtn) {
    const { varBtnX, varBtnY, varBtnW, varBtnH } = bounds;
    ctx.fillStyle = measureAllowVariations ? '#f1c40f' : '#2a2a2a'; ctx.fillRect(varBtnX, varBtnY, varBtnW, varBtnH);
    ctx.strokeStyle = measureAllowVariations ? '#ca8a04' : 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(varBtnX + 0.5, varBtnY + 0.5, varBtnW - 1, varBtnH - 1);
    ctx.fillStyle = measureAllowVariations ? '#111111' : '#f4ecd8';
    ctx.fillRect(varBtnX + 5, varBtnY + 6, 2, 2); ctx.fillRect(varBtnX + 8, varBtnY + 9, 2, 2); ctx.fillRect(varBtnX + 11, varBtnY + 12, 2, 2);
  }
  ctx.restore();
}

export function drawTimelineTrackMeasureCell(params: {
  ctx: CanvasRenderingContext2D; cellX: number; cellY: number; cellW: number; cellH: number;
  mIdx: number; trackId: number; instrumentIdx: number; patternId: number; patternIdx: number;
  spanMeasures: number; relativeIdx: number; beatResolutions?: number[]; timeSigStr: string;
  sectionColor: string; isSectionStart: boolean; isSectionEnd: boolean;
  loopStatus: 'inside-active' | 'outside-active' | 'none';
  isMacro: boolean; isMinZoom: boolean; isSelectedCell: boolean;
  isToada: boolean; isToadaComposite: boolean; toadaVocalBadges?: { pPtnName?: string; cPtnName?: string };
  isSilence: boolean; isSlave: boolean; isLinkFolder: boolean; isLinkMaster: boolean;
  parentBusTrackId?: number; masterTrackId?: number; slaveTrackIds?: number[]; hasChildOverrides: boolean;
  instId: string; instType: string; instMixerBg: string; instColors: Record<string, string>;
  activePatternName: string | null; sliceSteps?: any[]; variationsCount: number; measureAllowVariations: boolean;
  currentTrack: any; tracks: any[]; isLeftHanded: boolean; isEcoMode: boolean; lang: string;
  measureTimeSigs?: Record<number, string>; timeSig?: string; focusCtx?: SlaveFocusContext;
  theme: TimelineCanvasTheme;
}): void {
  const { ctx, cellX, cellY, cellW, cellH, mIdx, patternId, relativeIdx, spanMeasures, theme } = params;
  const { defaultBeats, beatRes, stepsInMeasure } = resolveMeasureBeatSteps(params.timeSigStr, params.beatResolutions);

  if (params.sectionColor) {
    ctx.fillStyle = withHexAlpha(params.sectionColor, '18'); ctx.fillRect(cellX, cellY, cellW, cellH);
    if (params.isSectionStart) { ctx.fillStyle = params.sectionColor; ctx.fillRect(cellX, cellY, 2, cellH); }
    if (params.isSectionEnd) { ctx.fillStyle = params.sectionColor; ctx.fillRect(cellX + cellW - 2, cellY, 2, cellH); }
  }
  if (params.loopStatus === 'inside-active') { ctx.fillStyle = 'rgba(37, 99, 235, 0.04)'; ctx.fillRect(cellX, cellY, cellW, cellH); }
  else if (params.loopStatus === 'outside-active') { ctx.fillStyle = theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'; ctx.fillRect(cellX, cellY, cellW, cellH); }

  const borderCol = params.instColors?.['D'] || params.instColors?.['E'] || theme.cordelBorder;
  const tintHex = params.instMixerBg || borderCol || theme.accentCrimson;

  if (params.isMacro) {
    const bx = cellX + 3, by = cellY + 3, bw = Math.max(2, cellW - 6), bh = Math.max(2, cellH - 6);
    if (params.isToada) {
      drawToadaCellBlock(ctx, bx, by, bw, bh, patternId, params.isToadaComposite, params.toadaVocalBadges, relativeIdx, spanMeasures, true, params.isMinZoom, theme);
    } else if (patternId === -1 || params.isSilence) {
      drawSilentHatchBlock(ctx, bx, by, bw, bh, 0.06, true, theme);
    } else {
      ctx.fillStyle = withHexAlpha(params.instMixerBg || '#1a1a1a', 'cc'); ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = withHexAlpha(borderCol, '40'); ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
      ctx.fillStyle = relativeIdx > 0 ? withHexAlpha(borderCol, '60') : borderCol; ctx.fillRect(bx, by, relativeIdx > 0 ? 1 : 3, bh);
      const steps = params.sliceSteps?.slice(0, stepsInMeasure) || [];
      let dotX = bx + (params.isMinZoom ? 4 : 6);
      const dotY = params.isMinZoom ? by + bh / 2 - 2 : by + bh - 7;
      ctx.save(); ctx.globalAlpha = params.isMinZoom ? 0.9 : 0.45;
      for (let s = 0; s < steps.length && dotX + 5 <= bx + bw - 2; s++) {
        const v = steps[s];
        if (!v || v === 0 || v === '0') continue;
        ctx.fillStyle = params.instColors?.[Array.isArray(v) ? String(v[0] ?? 'D') : String(v)] || '#111111';
        ctx.fillRect(dotX, dotY, 4, 4); dotX += 6;
      }
      ctx.restore();
      if (!params.isMinZoom && bw >= 22) {
        const title = relativeIdx > 0 ? `[${relativeIdx + 1}/${spanMeasures}]` : (params.activePatternName || '');
        ctx.fillStyle = theme.cordelText; ctx.font = `bold 9px ${theme.fontCactus}`; ctx.textBaseline = 'top';
        ctx.fillText(title.toUpperCase(), bx + 6, by + 4, Math.max(8, bw - 16));
      }
    }
  } else {
    if (params.isToada || patternId === -1 || params.isSilence) {
      drawToadaCellBlock(ctx, cellX, cellY, cellW, cellH, params.isSilence ? -1 : patternId, params.isToadaComposite, params.toadaVocalBadges, relativeIdx, spanMeasures, false, false, theme);
    } else {
      ctx.fillStyle = withHexAlpha(tintHex, '2e'); ctx.fillRect(cellX, cellY, cellW, cellH);
      ctx.strokeStyle = withHexAlpha(tintHex, '4d'); ctx.lineWidth = 1; ctx.strokeRect(cellX + 0.5, cellY + 0.5, Math.max(0, cellW - 1), Math.max(0, cellH - 1));
      ctx.fillStyle = withHexAlpha(tintHex, '80'); ctx.fillRect(cellX, cellY, relativeIdx > 0 ? 1 : 2, cellH);
      const isVoice = params.instType === 'voice' || params.instId === 'puxador' || params.instId === 'coro';
      if (isVoice) drawDetailedVoiceSteps({ ...params, defaultBeats, beatRes, stepsInMeasure });
      else drawDetailedPercussionSteps({ ...params, defaultBeats, beatRes, stepsInMeasure });
    }
    const badgeBounds = computeMeasureHeaderBadgeBounds({ cellX, cellY, cellW, isMacro: false, isToada: params.isToada, patternId, activePatternName: params.activePatternName, relativeIdx, spanMeasures, toadaVocalBadges: params.toadaVocalBadges, instType: params.instType, instId: params.instId, variationsCount: params.variationsCount, lang: params.lang });
    drawHeaderBadgeAndVarBtn(ctx, badgeBounds, params.toadaVocalBadges, relativeIdx, spanMeasures, params.activePatternName, params.isSelectedCell, params.hasChildOverrides, params.measureAllowVariations, params.lang, theme);
  }
  const is4th = (mIdx + 1) % 4 === 0;
  ctx.fillStyle = is4th ? 'rgba(59, 130, 246, 0.4)' : withHexAlpha(theme.cordelBorder, '33');
  ctx.fillRect(cellX + cellW - (is4th ? 1.5 : 1), cellY, is4th ? 1.5 : 1, cellH);
  if (params.isSelectedCell) {
    ctx.fillStyle = 'rgba(139, 42, 26, 0.08)'; ctx.fillRect(cellX, cellY, cellW, cellH);
    ctx.strokeStyle = theme.accentCrimson; ctx.lineWidth = 2; ctx.strokeRect(cellX + 1, cellY + 1, Math.max(0, cellW - 2), Math.max(0, cellH - 2));
    ctx.fillStyle = theme.accentCrimson;
    ctx.beginPath(); ctx.moveTo(cellX + cellW, cellY); ctx.lineTo(cellX + cellW - 10, cellY); ctx.lineTo(cellX + cellW, cellY + 10); ctx.closePath(); ctx.fill();
  }
}
