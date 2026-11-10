import { instrumentsConfig } from '../../../data';
import { getEffectiveMuteState, getVisibleTimelineTrackIds, isToadaBus, isToadaChild } from '../../../stores/useSequencerStore';
import { getInstrumentPrimaryStrongColor } from '../../../utils/colorHelpers';
import { isSlaveTrack } from '../../../utils/trackMasterResolver';
import { resolveTimelineTrackMeasureData } from '../TimelineTrackToadaMirror';
import { drawTimelineTrackMeasureCell } from './timelineCanvasCellDrawer';
import { getTimelineCanvasTheme, withHexAlpha } from './timelineCanvasThemeCache';
import {
  AUTO_LANE_EXPANDED_HEIGHT, TRACK_ROW_HEIGHT, TimelineCanvasRenderParams,
  TimelineRowLayout, findVisibleMeasureRange,
} from './timelineCanvasTypes';

export function buildTimelineRowLayouts(params: {
  trackIds?: number[]; tracksMeta: any[]; rodaTrackOrder?: number[];
  expandedAutoIds?: number[]; autoHeightsMap?: Record<number, number>;
}): { rowLayouts: TimelineRowLayout[]; totalTracksH: number } {
  const { tracksMeta, rodaTrackOrder, expandedAutoIds = [], autoHeightsMap } = params;
  const ids = params.trackIds ?? getVisibleTimelineTrackIds({ tracks: tracksMeta as any, rodaTrackOrder });

  const rowLayouts: TimelineRowLayout[] = [];
  let currentTop = 0;

  for (let i = 0; i < ids.length; i++) {
    const trackId = ids[i], trackIndex = tracksMeta.findIndex((t) => t.id === trackId);
    if (trackIndex === -1) continue;
    const meta = tracksMeta[trackIndex], inst = instrumentsConfig[meta.instrumentIdx] || instrumentsConfig[0];
    const isToada = Boolean(isToadaBus(meta)), isToadaCh = Boolean(isToadaChild(meta, tracksMeta));
    const isLinkedSlave = Boolean(isSlaveTrack(meta, tracksMeta) && !isToadaCh);
    const isLinkFolder = Boolean(meta.isLinkFolder && !meta.isBusFolder);
    const isLinkMaster = Boolean(meta.isLinkMaster && !meta.isBusFolder && !isToadaCh);
    const parentBusTrackId = isLinkedSlave || isLinkMaster ? tracksMeta.find((p) => String(p.id) === String(meta.linkedToTrackId) && p.isLinkFolder)?.id : undefined;
    const masterTrackId = isLinkedSlave ? tracksMeta.find((t) => String(t.linkedToTrackId) === String(meta.linkedToTrackId) && t.isLinkMaster)?.id : undefined;
    const slaveTrackIds = isLinkFolder ? tracksMeta.filter((t) => String(t.linkedToTrackId) === String(meta.id) && !t.isBusFolder && !t.isLinkMaster).map((t) => t.id) : undefined;
    const isAutomationOpen = expandedAutoIds.includes(trackId);
    const autoHeight = isAutomationOpen ? (autoHeightsMap?.[trackId] ?? AUTO_LANE_EXPANDED_HEIGHT) : 0;
    const height = TRACK_ROW_HEIGHT, totalRowHeight = height + autoHeight;

    rowLayouts.push({
      trackId, trackIndex, top: currentTop, height, autoHeight, totalRowHeight, isAutomationOpen,
      isMuted: Boolean(getEffectiveMuteState(tracksMeta, trackId)), isToada, isLinkedSlave, isLinkFolder, isLinkMaster,
      parentBusTrackId, masterTrackId, slaveTrackIds,
      instMixerBg: getInstrumentPrimaryStrongColor(inst, meta), instColors: inst?.colors || {},
    });
    currentTop += totalRowHeight;
  }
  return { rowLayouts, totalTracksH: currentTop };
}

export function renderTimelineTracksCanvas(params: TimelineCanvasRenderParams): {
  mStart: number; mEnd: number; renderedRows: number; renderedCells: number;
} {
  const { ctx, canvasW, canvasH, dpr, scrollLeft, tracksScrollTop, baseMeasureW, liveMeasureW, totalMeasures, measureWidths, measureLeftPositions, rowLayouts, tracks, tracksMeta } = params;
  if (canvasW <= 0 || canvasH <= 0 || totalMeasures <= 0) return { mStart: 0, mEnd: -1, renderedRows: 0, renderedCells: 0 };

  const safeBase = baseMeasureW > 0 ? baseMeasureW : 120;
  const scale = (liveMeasureW > 0 ? liveMeasureW : safeBase) / safeBase;
  const isMacro = liveMeasureW < 140, isMinZoom = liveMeasureW <= 45;
  const { start: mStart, end: mEnd } = findVisibleMeasureRange(measureLeftPositions, measureWidths, safeBase, scale, totalMeasures, scrollLeft, canvasW);
  if (mEnd < mStart) return { mStart, mEnd, renderedRows: 0, renderedCells: 0 };

  const theme = getTimelineCanvasTheme();
  const puxTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador') || null;
  const coroTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro') || null;

  ctx.save();
  ctx.setTransform(dpr || 1, 0, 0, dpr || 1, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);

  let renderedRows = 0, renderedCells = 0;

  for (let r = 0; r < rowLayouts.length; r++) {
    const row = rowLayouts[r], drawY = row.top - tracksScrollTop;
    if (drawY + row.height <= 0) continue;
    if (drawY >= canvasH) break;
    renderedRows++;

    const trackMeta = tracksMeta[row.trackIndex] || tracksMeta.find((t) => t.id === row.trackId);
    const liveTrack = tracks.find((t) => t.id === row.trackId) || trackMeta;
    if (!trackMeta || !liveTrack) continue;
    const trackInst = instrumentsConfig[trackMeta.instrumentIdx] || instrumentsConfig[0];

    ctx.save();
    if (row.isMuted) ctx.globalAlpha = 0.4;

    for (let mIdx = mStart; mIdx <= mEnd; mIdx++) {
      const cellX = (measureLeftPositions[mIdx] ?? mIdx * safeBase) * scale - scrollLeft;
      const cellW = (measureWidths[mIdx] ?? safeBase) * scale;
      const m = resolveTimelineTrackMeasureData(mIdx, row.isToada, liveTrack, trackInst, row.trackIndex, tracksMeta, trackMeta, row.isLinkedSlave, puxTrack, coroTrack, tracks);
      const sec = (params.songSections || []).find((s) => mIdx >= s.startMeasure && mIdx <= s.endMeasure);
      const inLoop = params.loopStartMeasure !== null && params.loopEndMeasure !== null && mIdx >= params.loopStartMeasure && mIdx <= params.loopEndMeasure;
      const loopStatus = params.loopStartMeasure !== null && params.loopEndMeasure !== null ? (inLoop ? (params.isLoopRegionActive ? 'inside-active' : 'none') : params.isLoopRegionActive ? 'outside-active' : 'none') : 'none';
      const pIdx = m.activePattern && m.activeTrack?.patterns ? m.activeTrack.patterns.findIndex((p: any) => p.id === m.activePattern!.id) : -1;
      const effTrackId = row.isLinkedSlave ? trackMeta.id : m.currentTrackId;
      const isMulti = params.selectedTimelineCells.some((c) => c.trackId === effTrackId && c.mIdx === mIdx);
      const isActive = params.selectedTimelineCells.length === 0 && params.activeTimelineCell?.trackId === effTrackId && params.activeTimelineCell?.measureIdx === mIdx;
      const curInst = row.isLinkedSlave ? trackInst : (m.currentInst || trackInst);
      const hasChildOverrides = Boolean(trackMeta.isLinkFolder && tracksMeta.some((c) => String(c.linkedToTrackId) === String(trackMeta.id) && !c.isLinkFolder && c.patternOverrides?.[mIdx] !== undefined));

      drawTimelineTrackMeasureCell({
        ctx, cellX, cellY: drawY, cellW, cellH: row.height, mIdx, trackId: effTrackId,
        instrumentIdx: row.isLinkedSlave ? trackMeta.instrumentIdx : m.currentInstrumentIdx,
        patternId: m.activePattern?.id ?? -1, patternIdx: pIdx, spanMeasures: m.spanMeasures, relativeIdx: m.relativeIdx,
        beatResolutions: m.activePattern?.beatResolutions, timeSigStr: params.measureTimeSigs?.[mIdx] || params.timeSig || '4/4',
        sectionColor: sec?.color || '', isSectionStart: Boolean(sec && mIdx === sec.startMeasure), isSectionEnd: Boolean(sec && mIdx === sec.endMeasure),
        loopStatus, isMacro, isMinZoom, isSelectedCell: isMulti || isActive,
        isToada: row.isToada, isToadaComposite: m.isToadaComposite, toadaVocalBadges: m.toadaVocalBadges,
        isSilence: m.isSilence, isSlave: row.isLinkedSlave, isLinkFolder: row.isLinkFolder, isLinkMaster: row.isLinkMaster,
        parentBusTrackId: row.parentBusTrackId, masterTrackId: row.masterTrackId, slaveTrackIds: row.slaveTrackIds, hasChildOverrides,
        instId: curInst.id, instType: curInst.type, instMixerBg: getInstrumentPrimaryStrongColor(curInst, trackMeta),
        instColors: curInst.colors || row.instColors, activePatternName: m.isSilence ? (params.lang === 'fr' ? 'Silence' : 'Silêncio') : (m.activePattern?.name ?? null),
        sliceSteps: m.sliceSteps, variationsCount: m.activePattern?.variations?.length ?? 0,
        measureAllowVariations: m.activePattern?.measureAllowVariations?.[mIdx] ?? true,
        currentTrack: row.isLinkedSlave ? liveTrack : (m.activeTrack || liveTrack), tracks,
        isLeftHanded: params.isLeftHanded, isEcoMode: params.isEcoMode, lang: params.lang,
        measureTimeSigs: params.measureTimeSigs, timeSig: params.timeSig, focusCtx: params.focusCtx, theme,
      });
      renderedCells++;
    }
    ctx.restore();
    ctx.fillStyle = withHexAlpha(theme.cordelBorder, '33');
    ctx.fillRect(0, drawY + row.height - 1, canvasW, 1);
  }

  if (params.lassoRect && params.lassoRect.width > 0 && params.lassoRect.height > 0) {
    const { x, y, width, height } = params.lassoRect;
    ctx.save();
    ctx.fillStyle = 'rgba(139, 42, 26, 0.10)'; ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = theme.accentCrimson; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, width - 1), Math.max(0, height - 1));
    ctx.restore();
  }
  ctx.restore();
  return { mStart, mEnd, renderedRows, renderedCells };
}
