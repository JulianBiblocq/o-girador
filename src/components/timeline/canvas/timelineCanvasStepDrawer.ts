import { SlaveFocusContext } from '../../../utils/slaveStepOpacityResolver';
import { resolveTimelineStepData } from '../TimelineStepPatternResolver';
import { TimelineCanvasTheme, getPatinatedColor, withHexAlpha } from './timelineCanvasThemeCache';

export function drawSilentHatchBlock(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  alpha: number, withDashedBorder: boolean, theme: TimelineCanvasTheme
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.diagonalHatchPattern || theme.cordelText;
  ctx.fillRect(x, y, w, h);
  if (withDashedBorder) {
    ctx.globalAlpha = Math.min(1, alpha * 3);
    ctx.strokeStyle = withHexAlpha(theme.cordelBorder, '4d');
    ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
  }
  ctx.restore();
}

function traceTrianglePath(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, upward: boolean
): void {
  ctx.beginPath();
  if (upward) { ctx.moveTo(x + w / 2, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); }
  else { ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w / 2, y + h); }
  ctx.closePath();
}

export function drawDetailedPercussionSteps(params: {
  ctx: CanvasRenderingContext2D; cellX: number; cellY: number; cellW: number; cellH: number;
  defaultBeats: number; beatRes: number[]; stepsInMeasure: number; relativeIdx: number;
  currentTrack: any; tracks: any[]; patternId: number; patternIdx: number; mIdx: number;
  instrumentIdx: number; isLeftHanded: boolean; isEcoMode: boolean;
  isLinkFolder: boolean; isSlave: boolean; isLinkMaster: boolean;
  parentBusTrackId?: number; masterTrackId?: number; slaveTrackIds?: number[]; hasChildOverrides?: boolean;
  measureTimeSigs?: Record<number, string>; timeSig?: string; focusCtx?: SlaveFocusContext;
  theme: TimelineCanvasTheme;
}): void {
  const { ctx, cellX, cellY, cellW, cellH, defaultBeats, beatRes, relativeIdx, theme } = params;
  const beatW = cellW / Math.max(1, defaultBeats);
  let sCursor = 0;

  for (let b = 0; b < defaultBeats; b++) {
    const res = beatRes[b] ?? 4, beatX = cellX + b * beatW, stepW = beatW / Math.max(1, res);
    const isTriplet = res === 3, isTuplet = isTriplet || res === 6;

    for (let i = 0; i < res; i++) {
      const stepX = beatX + i * stepW;
      if (i < res - 1) {
        ctx.fillStyle = withHexAlpha(theme.cordelBorder, '1a');
        ctx.fillRect(stepX + stepW - 0.5, cellY, 1, cellH);
      }
      const d = resolveTimelineStepData(
        params.currentTrack, params.tracks, (relativeIdx || 0) * 16 + sCursor + i, params.patternId,
        params.patternIdx, params.mIdx, params.instrumentIdx, params.isLeftHanded, params.isEcoMode,
        params.isLinkFolder, params.isSlave, params.isLinkMaster, params.parentBusTrackId,
        params.masterTrackId, params.slaveTrackIds, params.hasChildOverrides,
        params.measureTimeSigs, params.timeSig, params.focusCtx
      );
      const hasBg = d.isSplit || d.leftFillColor !== 'transparent';
      const upward = isTriplet || i % 2 === 0;
      if (!hasBg) {
        ctx.fillStyle = theme.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)';
        if (isTuplet) {
          const ts = Math.min(5, Math.max(2, stepW - 2));
          traceTrianglePath(ctx, stepX + (stepW - ts) / 2, cellY + (cellH - ts) / 2, ts, ts, upward);
          ctx.fill();
        } else ctx.fillRect(stepX + (stepW - 2) / 2, cellY + (cellH - 2) / 2, 2, 2);
        continue;
      }
      const baseS = isTuplet ? 11 : 10, rawS = d.leftIsAccent ? Math.round(baseS * 1.2) : baseS;
      const padW = Math.max(2, Math.min(rawS, stepW - 2)), padH = Math.max(2, Math.min(rawS, cellH - 4));
      const px = stepX + (stepW - padW) / 2, py = cellY + (cellH - padH) / 2;
      ctx.save();
      ctx.globalAlpha = d.stepOpacity ?? (d.renderCas === 4 ? 0.45 : 1.0);
      if (isTuplet) {
        traceTrianglePath(ctx, px + 1, py + 1, padW, padH, upward); ctx.fillStyle = theme.inkShadow; ctx.fill();
        traceTrianglePath(ctx, px, py, padW, padH, upward); ctx.fillStyle = getPatinatedColor(d.leftFillColor); ctx.fill();
        ctx.strokeStyle = theme.inkBorder; ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.fillStyle = theme.inkShadow; ctx.fillRect(px + 1, py + 1, padW, padH);
        if (d.isSplit) {
          const halfW = padW / 2;
          ctx.fillStyle = getPatinatedColor(d.leftFillColor); ctx.fillRect(px, py, halfW, padH);
          ctx.fillStyle = getPatinatedColor(d.rightFillColor); ctx.fillRect(px + halfW, py, padW - halfW, padH);
        } else {
          ctx.fillStyle = getPatinatedColor(d.leftFillColor); ctx.fillRect(px, py, padW, padH);
        }
        if (theme.woodGrainPattern) { ctx.fillStyle = theme.woodGrainPattern; ctx.fillRect(px, py, padW, padH); }
        ctx.strokeStyle = theme.inkBorder; ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, Math.max(0, padW - 1), Math.max(0, padH - 1));
        if (d.leftIsAccent && padW >= 5 && padH >= 5) {
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.strokeRect(px + 1.5, py + 1.5, Math.max(0, padW - 3), Math.max(0, padH - 3));
        }
      }
      ctx.restore();
    }
    sCursor += res;
    if (b < defaultBeats - 1) {
      ctx.fillStyle = withHexAlpha(theme.cordelBorder, '33');
      ctx.fillRect(beatX + beatW - 0.5, cellY, 1, cellH);
    }
  }
}
