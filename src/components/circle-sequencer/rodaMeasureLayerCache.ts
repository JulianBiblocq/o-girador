/**
 * rodaMeasureLayerCache.ts — Pool circulaire 3 slots `[prev, curr, next]` + calque Toada (< 130 lignes).
 * - Rotation `O(1)` à `step === 0` (`0 ms` sur le Temps 1) et pré-rendu anticipé de `M+1` dès `r >= 0.32`.
 */
import { instrumentsConfig } from '../../data';
import { getLiveVariationRodaSnapshots } from '../../hooks/audio-sync/liveVariationLookaheadEngine';
import { isToadaBus, useSequencerStore } from '../../stores/useSequencerStore';
import { TrackGroup } from '../../types';
import { getRodaMeasureGeometry, normalizeTimeSig, resolveActiveBeatResolutions } from '../../utils/rodaTimeSigGeometry';
import { getPhysicalStepFromRatio, resolvePatternForMeasure } from './measurePatternHelpers';
import { renderTrackStepLayer } from './renderTrackStepLayer';
import { isRodaDrawableTrack } from './sortTracksByRodaOrder';

export interface MeasureCanvasSlot {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null; measureIdx: number; timeSig: string; key: string;
}

export interface RodaMeasureLayerPool {
  prev: MeasureCanvasSlot; curr: MeasureCanvasSlot; next: MeasureCanvasSlot; toada: MeasureCanvasSlot;
  hasToadaContent: boolean; lastCurrMeasureIdx: number;
}

function makeSlot(px: number): MeasureCanvasSlot {
  const canvas = document.createElement('canvas');
  canvas.width = px; canvas.height = px;
  return { canvas, ctx: canvas.getContext('2d'), measureIdx: -1, timeSig: '4/4', key: '' };
}

export function createRodaMeasureLayerPool(px: number): RodaMeasureLayerPool {
  return { prev: makeSlot(px), curr: makeSlot(px), next: makeSlot(px), toada: makeSlot(px), hasToadaContent: false, lastCurrMeasureIdx: -1 };
}

export function invalidateRodaMeasureLayerPool(p: RodaMeasureLayerPool): void {
  p.prev.key = ''; p.curr.key = ''; p.next.key = ''; p.toada.key = '';
}

export function disposeRodaMeasureLayerPool(p: RodaMeasureLayerPool): void {
  for (const s of [p.prev, p.curr, p.next, p.toada]) { s.key = ''; s.canvas.width = 0; s.canvas.height = 0; }
}

function buildVarSig(stepsMap: Record<number, any> | null | undefined, tracks: TrackGroup[]): string {
  if (!stepsMap) return 'base';
  let sig = '';
  for (let i = 0; i < tracks.length; i++) {
    const id = tracks[i].id, arr = stepsMap[id];
    if (arr) sig += `${id}:${arr.length}:${arr[0] ?? 0}:${arr[arr.length >> 1] ?? 0}:${arr[arr.length - 1] ?? 0};`;
  }
  return sig || 'base';
}

function renderSlot(
  slot: MeasureCanvasSlot, px: number, key: string, mIdx: number, sig: string,
  visTracks: TrackGroup[], rawTracks: TrackGroup[], border: string, wood: string, text: string,
  getLivePtnId: (t: TrackGroup) => number | null, liveRef: React.MutableRefObject<any>,
  stVal: any, pendingRef: React.MutableRefObject<number | null>, stepsMap: Record<number, any> | null | undefined,
  dScale: number, isEco: boolean, mode: 'percussion' | 'toada', ratio = -1
): void {
  if (slot.canvas.width !== px || slot.canvas.height !== px) { slot.canvas.width = px; slot.canvas.height = px; slot.key = ''; }
  if (slot.key === key || !slot.ctx) return;
  const c = slot.ctx, sf = px / 1200;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, px, px); c.setTransform(sf, 0, 0, sf, 0, 0);
  const snapRef = stepsMap ? ({ current: stepsMap } as React.MutableRefObject<any>) : undefined;
  renderTrackStepLayer(c, visTracks, rawTracks, border, wood, text, getLivePtnId, liveRef, stVal, pendingRef, snapRef, dScale, isEco, 600, 600, ratio, { skipRingsAndLabels: true, layerFilter: mode, explicitMeasureIdx: mIdx, staticOnly: true });
  c.setTransform(1, 0, 0, 1, 0, 0);
  slot.measureIdx = mIdx; slot.timeSig = sig; slot.key = key;
}

export function syncRodaMeasureLayerPool(p: {
  pool: RodaMeasureLayerPool; targetPx: number; measureIdx: number; nextMeasureIdx: number;
  prevMeasureIdx: number | null; hasPrevMeasure: boolean; isPlayheadActive: boolean; playheadRatio: number;
  visibleTracks: TrackGroup[]; rawTracks: TrackGroup[]; visSig: string; dynamicScale: number; isEco: boolean;
  themeBorder: string; themeWood: string; themeText: string; isDark: boolean;
  getLiveActivePatternId: (t: TrackGroup) => number | null; livePlaybackRef: React.MutableRefObject<any>;
  stateVal: any; pendingTargetMeasureRef: React.MutableRefObject<number | null>;
  activeVariationsRef?: React.MutableRefObject<{ [trackId: number]: any }>;
}): void {
  const { pool, targetPx: px, measureIdx: mIdx, nextMeasureIdx: nextM, prevMeasureIdx: prevM, hasPrevMeasure, isPlayheadActive, playheadRatio: r, visibleTracks: vis, rawTracks: raw, visSig, dynamicScale: ds, isEco, themeBorder: b, themeWood: w, themeText: t, isDark, getLiveActivePatternId: getPtn, livePlaybackRef: lRef, stateVal: sv, pendingTargetMeasureRef: pRef, activeVariationsRef: vRef } = p;
  const st = useSequencerStore.getState(), rodaTracks = vis.filter(isRodaDrawableTrack);
  const fSig = `${st.tracksVersion}|${visSig}|${sv.isLeftHanded ? 1 : 0}|${isEco ? 1 : 0}|${isDark ? 1 : 0}|${sv.soloPatternPlayId ?? ''}|${sv.soloPatternVariationId ?? ''}|${st.isFocusActive ? 1 : 0}:${st.focusTrackId ?? ''}:${st.referenceTrackId ?? ''}:${st.activeAoVivoTrackId ?? ''}:${st.editingTrackId ?? ''}:${st.mobileViewMode}`;

  if (pool.lastCurrMeasureIdx !== -1 && pool.lastCurrMeasureIdx !== mIdx && pool.next.measureIdx === mIdx && pool.next.key !== '') {
    const tmp = pool.prev; pool.prev = pool.curr; pool.curr = pool.next; pool.next = tmp; pool.next.key = '';
  }
  pool.lastCurrMeasureIdx = mIdx;

  const snaps = getLiveVariationRodaSnapshots(nextM);
  const currMap = isPlayheadActive ? (snaps.currentStepsByTrackId || vRef?.current) : undefined;
  const currSig = normalizeTimeSig(sv.measureTimeSigs?.[mIdx] || sv.timeSig || '4/4');
  renderSlot(pool.curr, px, `P|${px}|${mIdx}|${currSig}|${fSig}|${buildVarSig(currMap, rodaTracks)}`, mIdx, currSig, vis, raw, b, w, t, getPtn, lRef, sv, pRef, currMap, ds, isEco, 'percussion');

  if (isPlayheadActive && hasPrevMeasure && prevM !== null && r < 0.5) {
    const prevSig = normalizeTimeSig(sv.measureTimeSigs?.[prevM] || sv.timeSig || '4/4');
    if (prevSig === currSig) renderSlot(pool.prev, px, `P|${px}|${prevM}|${prevSig}|${fSig}|${buildVarSig(snaps.prevStepsByTrackId, rodaTracks)}`, prevM, prevSig, vis, raw, b, w, t, getPtn, lRef, sv, pRef, snaps.prevStepsByTrackId, ds, isEco, 'percussion');
  }
  if (isPlayheadActive && r >= 0.32) {
    const nextSig = normalizeTimeSig(sv.measureTimeSigs?.[nextM] || sv.timeSig || '4/4');
    if (nextSig === currSig) renderSlot(pool.next, px, `P|${px}|${nextM}|${nextSig}|${fSig}|${buildVarSig(snaps.nextStepsByTrackId, rodaTracks)}`, nextM, nextSig, vis, raw, b, w, t, getPtn, lRef, sv, pRef, snaps.nextStepsByTrackId, ds, isEco, 'percussion');
  }

  pool.hasToadaContent = rodaTracks.some((tr) => isToadaBus(tr) || instrumentsConfig[tr.instrumentIdx]?.type === 'voice');
  if (pool.hasToadaContent) {
    const pux = raw.find((tr) => instrumentsConfig[tr.instrumentIdx]?.id === 'puxador');
    const coro = raw.find((tr) => instrumentsConfig[tr.instrumentIdx]?.id === 'coro');
    const refPat = resolvePatternForMeasure(pux, mIdx, sv.soloPatternPlayId) || resolvePatternForMeasure(coro, mIdx, sv.soloPatternPlayId);
    const beatRes = resolveActiveBeatResolutions(currSig, refPat), totalS = beatRes.reduce((a, x) => a + x, 0);
    const cStep = isPlayheadActive && r >= 0 ? getPhysicalStepFromRatio(r, refPat, totalS, getRodaMeasureGeometry(currSig).beatsCount, beatRes) : -1;
    const inTail = cStep >= 0 && cStep < (beatRes[0] || 4) && sv.soloPatternPlayId == null;
    const tKey = `T|${px}|${mIdx}|${nextM}|${prevM ?? -1}|${inTail ? 1 : 0}|${currSig}|${fSig}|${buildVarSig(currMap, rodaTracks)}`;
    renderSlot(pool.toada, px, tKey, mIdx, currSig, vis, raw, b, w, t, getPtn, lRef, sv, pRef, currMap, ds, isEco, 'toada', inTail ? 0 : (isPlayheadActive ? 0.5 : -1));
  }
}
