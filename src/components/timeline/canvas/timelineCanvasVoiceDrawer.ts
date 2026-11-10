import { NEWTON_NOTE_COLORS } from '../../../data';
import { SlaveFocusContext } from '../../../utils/slaveStepOpacityResolver';
import { resolveTimelineStepData, TimelineStepData } from '../TimelineStepPatternResolver';
import { TimelineCanvasTheme, getPatinatedColor, withHexAlpha } from './timelineCanvasThemeCache';
import { drawSilentHatchBlock } from './timelineCanvasStepDrawer';

export function drawToadaCellBlock(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  patternId: number, isToadaComposite: boolean,
  toadaVocalBadges: { pPtnName?: string; cPtnName?: string } | undefined,
  relativeIdx: number, spanMeasures: number, isMacro: boolean, isMinZoom: boolean,
  theme: TimelineCanvasTheme
): void {
  if (patternId === -1) {
    drawSilentHatchBlock(ctx, x, y, w, h, isMacro ? 0.06 : 0.15, isMacro, theme);
    return;
  }
  ctx.save();
  if (isToadaComposite) {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, 'rgba(139, 42, 26, 0.45)'); grad.addColorStop(0.5, 'rgba(139, 42, 26, 0.45)');
    grad.addColorStop(0.5, 'rgba(0, 131, 143, 0.45)'); grad.addColorStop(1, 'rgba(0, 131, 143, 0.45)');
    ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(139, 42, 26, 0.38)'; ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
    ctx.fillStyle = theme.accentCrimson; ctx.fillRect(x, y, 3, h);
    ctx.fillStyle = theme.coroTeal; ctx.fillRect(Math.max(x, x + w - 3), y, 3, h);
  } else {
    const isPux = Boolean(toadaVocalBadges?.pPtnName);
    ctx.fillStyle = isPux ? 'rgba(139, 42, 26, 0.35)' : 'rgba(0, 131, 143, 0.35)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = isPux ? 'rgba(139, 42, 26, 0.5)' : 'rgba(0, 131, 143, 0.5)'; ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
    ctx.fillStyle = isPux ? theme.accentCrimson : theme.coroTeal; ctx.fillRect(x, y, 3, h);
  }
  if (isMacro && !isMinZoom && toadaVocalBadges) {
    ctx.font = `bold 8px ${theme.fontCactus}`; ctx.textBaseline = 'middle';
    const midY = y + h / 2, suffix = relativeIdx > 0 ? `[${relativeIdx + 1}/${spanMeasures}]` : '';
    let curX = x + 6;
    if (toadaVocalBadges.pPtnName) {
      const pTxt = `[P] ${suffix || toadaVocalBadges.pPtnName}`;
      ctx.fillStyle = theme.puxText; ctx.fillText(pTxt, curX, midY, Math.max(12, w * 0.45));
      curX += Math.min(w * 0.48, pTxt.length * 4.8 + 4);
    }
    if (toadaVocalBadges.pPtnName && toadaVocalBadges.cPtnName && curX < x + w - 14) {
      ctx.fillStyle = withHexAlpha(theme.cordelText, '80'); ctx.fillText('·', curX, midY); curX += 5;
    }
    if (toadaVocalBadges.cPtnName && curX < x + w - 8) {
      ctx.fillStyle = theme.coroText; ctx.fillText(`[C] ${suffix || toadaVocalBadges.cPtnName}`, curX, midY, Math.max(10, x + w - curX - 4));
    }
  }
  ctx.restore();
}

export function drawDetailedVoiceSteps(params: {
  ctx: CanvasRenderingContext2D; cellX: number; cellY: number; cellW: number; cellH: number;
  defaultBeats: number; beatRes: number[]; stepsInMeasure: number; relativeIdx: number;
  currentTrack: any; tracks: any[]; patternId: number; patternIdx: number; mIdx: number;
  instrumentIdx: number; isLeftHanded: boolean; isEcoMode: boolean;
  isLinkFolder: boolean; isSlave: boolean; isLinkMaster: boolean;
  parentBusTrackId?: number; masterTrackId?: number; slaveTrackIds?: number[]; hasChildOverrides?: boolean;
  measureTimeSigs?: Record<number, string>; timeSig?: string; focusCtx?: SlaveFocusContext;
  theme: TimelineCanvasTheme;
}): void {
  const { ctx, cellX, cellY, cellW, cellH, defaultBeats, beatRes, stepsInMeasure, relativeIdx, theme } = params;
  const beatW = cellW / Math.max(1, defaultBeats);
  const stepGeoms: Array<{ x: number; w: number; isTuplet: boolean; data: TimelineStepData }> = [];
  let sCursor = 0;

  for (let b = 0; b < defaultBeats; b++) {
    const res = beatRes[b] ?? 4, beatX = cellX + b * beatW, stepW = beatW / Math.max(1, res);
    for (let i = 0; i < res; i++) {
      const data = resolveTimelineStepData(
        params.currentTrack, params.tracks, (relativeIdx || 0) * 16 + sCursor + i, params.patternId,
        params.patternIdx, params.mIdx, params.instrumentIdx, params.isLeftHanded, params.isEcoMode,
        params.isLinkFolder, params.isSlave, params.isLinkMaster, params.parentBusTrackId,
        params.masterTrackId, params.slaveTrackIds, params.hasChildOverrides,
        params.measureTimeSigs, params.timeSig, params.focusCtx
      );
      stepGeoms.push({ x: beatX + i * stepW, w: stepW, isTuplet: res === 3 || res === 6, data });
    }
    sCursor += res;
    if (b < defaultBeats - 1) {
      ctx.fillStyle = withHexAlpha(theme.cordelBorder, '33'); ctx.fillRect(beatX + beatW - 0.5, cellY, 1, cellH);
    }
  }

  for (let idx = 0; idx < stepGeoms.length && idx < stepsInMeasure; ) {
    const cur = stepGeoms[idx], d = cur.data;
    const active = d.val !== 0 && d.val !== '' && d.val !== '0' && d.val !== '-';
    if (!d.isFollowedByProlongation && idx < stepGeoms.length - 1) {
      ctx.fillStyle = withHexAlpha(theme.cordelBorder, '1a'); ctx.fillRect(cur.x + cur.w - 0.5, cellY, 1, cellH);
    }
    if (!active) {
      const dotS = cur.isTuplet ? 5 : 2;
      ctx.fillStyle = theme.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)';
      ctx.fillRect(cur.x + (cur.w - dotS) / 2, cellY + (cellH - dotS) / 2, dotS, dotS);
      idx++; continue;
    }
    let endIdx = idx;
    while (endIdx + 1 < stepGeoms.length && stepGeoms[endIdx].data.isFollowedByProlongation) endIdx++;
    const rx = cur.x + 1, rw = Math.max(2, stepGeoms[endIdx].x + stepGeoms[endIdx].w - cur.x - 2), rh = 14, ry = cellY + (cellH - rh) / 2;
    const noteLetter = d.note ? d.note.charAt(0).toUpperCase() : '';
    const fillHex = getPatinatedColor((noteLetter && NEWTON_NOTE_COLORS[noteLetter as keyof typeof NEWTON_NOTE_COLORS]) || d.voiceColor || '#c25e38');
    ctx.save(); ctx.globalAlpha = d.stepOpacity ?? 1.0;
    ctx.fillStyle = theme.inkShadow; ctx.fillRect(rx + 1, ry + 1, rw, rh);
    ctx.fillStyle = fillHex; ctx.fillRect(rx, ry, rw, rh);
    if (theme.woodGrainPattern) { ctx.fillStyle = theme.woodGrainPattern; ctx.fillRect(rx, ry, rw, rh); }
    ctx.strokeStyle = theme.inkBorder; ctx.lineWidth = 1; ctx.strokeRect(rx + 0.5, ry + 0.5, Math.max(0, rw - 1), Math.max(0, rh - 1));
    ctx.fillStyle = '#ffffff'; ctx.font = `bold 8px ${theme.fontSans}`; ctx.textBaseline = 'middle';
    ctx.fillText(d.syl || d.note || (d.isPux ? 'P' : 'C'), rx + 2, ry + rh / 2 + 0.5, Math.max(4, rw - 4));
    for (let k = idx + 1; k <= endIdx; k++) {
      if (stepGeoms[k].w >= 8) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = `6px ${theme.fontMono}`;
        ctx.fillText('──', stepGeoms[k].x + 2, ry + rh / 2, Math.max(4, stepGeoms[k].w - 3));
      }
    }
    ctx.restore();
    idx = endIdx + 1;
  }
}
