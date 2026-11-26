/**
 * drawRodaRingsAndLabels.ts — Dessin statique des anneaux pointillés (`drawTrackRing`) et des noms à 12h
 * hors fondu de mesure (`bgCanvas`), garantissant 0 scintillement au passage du balai 6h (< 105 lignes).
 */
import { instrumentsConfig } from '../../data';
import { getEffectiveMuteState, isToadaBus } from '../../stores/useSequencerStore';
import { Pattern, TrackGroup } from '../../types';
import {
  computeMeasurePatternStepOffset, computeRodaStepAngles, resolveActiveBeatResolutions,
} from '../../utils/rodaTimeSigGeometry';
import { resolveEffectivePatternStepsForSoloOrLive } from '../../utils/soloVariationMatcher';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { drawTrackRing } from './drawTrackRings';
import { resolvePatternForMeasure } from './measurePatternHelpers';
import { isRodaDrawableTrack } from './sortTracksByRodaOrder';

export function resolveRodaRingHasNotesAndLabel(
  track: TrackGroup, allTracks: TrackGroup[], measureIdx: number, activeTimeSig: string,
  soloId: number | null, soloVarId: string | null, activeVariationsMap: Record<number, any> | undefined,
  isPlayheadActive: boolean, getLiveActivePatternId: (t: TrackGroup) => number | null
): { hasAnyNotes: boolean; label: string; firstStepAngle: number } {
  const inst = instrumentsConfig[track.instrumentIdx];
  const isToada = isToadaBus(track);
  const isVoice = isToada || inst?.type === 'voice';

  if (isVoice) {
    const pux = isToada ? allTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador') : (inst?.id !== 'coro' ? track : undefined);
    const coro = isToada ? allTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro') : (inst?.id === 'coro' ? track : undefined);
    const puxPat = resolvePatternForMeasure(pux, measureIdx, soloId);
    const coroPat = resolvePatternForMeasure(coro, measureIdx, soloId);
    const refPat = puxPat || coroPat;
    const angles = computeRodaStepAngles(activeTimeSig, resolveActiveBeatResolutions(activeTimeSig, refPat));
    const isPause = !puxPat && !coroPat;
    const label = isPause ? 'Baque' : (track.customName || inst?.name || (isToada ? 'Toada' : 'Voix'));
    return { hasAnyNotes: !isPause, label, firstStepAngle: angles[0] ?? -Math.PI / 2 };
  }

  let activePattern = resolveActivePattern(track, allTracks, measureIdx, soloId !== null, soloId) as Pattern | null;
  const fallbackId = getLiveActivePatternId(track);
  if (!activePattern && fallbackId !== null) activePattern = track.patterns.find((p) => p.id === fallbackId) ?? null;

  const canVary = Boolean(isPlayheadActive && activePattern?.variations?.length && (soloId !== null || activePattern.measureAllowVariations?.[measureIdx] !== false));
  const { steps: rawSteps, beatResolutions: varBeatRes } = resolveEffectivePatternStepsForSoloOrLive({
    pattern: activePattern, trackId: track.id, tracks: allTracks, soloPatternPlayId: soloId,
    soloPatternVariationId: soloVarId, liveStepsMap: activeVariationsMap, canUseLiveVariation: canVary,
  });
  const beatRes = resolveActiveBeatResolutions(activeTimeSig, activePattern ? { ...activePattern, beatResolutions: varBeatRes } : null);
  const stepAngles = computeRodaStepAngles(activeTimeSig, beatRes), count = stepAngles.length;
  const pred = soloId !== null ? undefined : (m: number) => resolveActivePattern(track, allTracks, m, false, null)?.id === activePattern?.id;
  const offset = computeMeasurePatternStepOffset(activePattern, count, measureIdx, pred);
  const slice = rawSteps && offset > 0 ? rawSteps.slice(offset, offset + count) : rawSteps;
  const hasAnyNotes = Boolean(slice && slice.slice(0, count).some((s: any) => s !== 0 && s !== '0' && s !== ''));
  const nPlayers = track.sectionPlayers?.length ?? 0;
  const label = `${track.customName || inst?.name || ''}${nPlayers > 1 ? ` ×${nPlayers}` : ''}`;
  return { hasAnyNotes, label, firstStepAngle: stepAngles[0] ?? -Math.PI / 2 };
}

export function buildRodaRingsLayerSignature(
  visibleTracks: TrackGroup[], allTracks: TrackGroup[], measureIdx: number, activeTimeSig: string,
  soloId: number | null, soloVarId: string | null, activeVariationsMap: Record<number, any> | undefined,
  isPlayheadActive: boolean, isEco: boolean, getLiveActivePatternId: (t: TrackGroup) => number | null
): string {
  const rodaTracks = visibleTracks.filter(isRodaDrawableTrack);
  if (rodaTracks.length === 0) return 'empty';
  let sig = `${rodaTracks.length}|${isEco ? 1 : 0}`;
  for (let i = 0; i < rodaTracks.length; i++) {
    const t = rodaTracks[i];
    const info = resolveRodaRingHasNotesAndLabel(t, allTracks, measureIdx, activeTimeSig, soloId, soloVarId, activeVariationsMap, isPlayheadActive, getLiveActivePatternId);
    const muted = soloId == null && getEffectiveMuteState(allTracks, t.id) ? 1 : 0;
    sig += `;${t.id}:${info.hasAnyNotes ? 1 : 0}:${muted}:${t.isSolo ? 1 : 0}:${info.label}`;
  }
  return sig;
}

export function drawRodaRingsAndLabels(
  ctx: CanvasRenderingContext2D, visibleTracks: TrackGroup[], allTracks: TrackGroup[],
  measureIdx: number, activeTimeSig: string, soloId: number | null, soloVarId: string | null,
  activeVariationsMap: Record<number, any> | undefined, isPlayheadActive: boolean, isEco: boolean,
  centerX: number, centerY: number, themeBorder: string, themeText: string,
  getLiveActivePatternId: (t: TrackGroup) => number | null
): void {
  const rodaTracks = visibleTracks.filter(isRodaDrawableTrack), totalRings = rodaTracks.length;
  for (let i = 0; i < totalRings; i++) {
    const track = rodaTracks[i];
    const { hasAnyNotes, label, firstStepAngle } = resolveRodaRingHasNotesAndLabel(
      track, allTracks, measureIdx, activeTimeSig, soloId, soloVarId, activeVariationsMap, isPlayheadActive, getLiveActivePatternId
    );
    const tRad = drawTrackRing(ctx, track, i, totalRings, centerX, centerY, allTracks, themeBorder, hasAnyNotes);
    if (!isEco && label) {
      const x0 = centerX + Math.cos(firstStepAngle) * tRad, y0 = centerY + Math.sin(firstStepAngle) * tRad;
      const isMuted = soloId == null && getEffectiveMuteState(allTracks, track.id);
      ctx.save();
      ctx.globalAlpha = isMuted ? 0.26 : 1.0;
      ctx.fillStyle = themeText;
      ctx.font = 'bold 10px serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, x0 + 20, y0 + 3);
      ctx.restore();
    }
  }
}
