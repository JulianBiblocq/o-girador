import { GlobalSwing, Pattern, TrackGroup } from '../../types';
import { instrumentsConfig, getVisualStrokeSymbol, isDarkText } from '../../data';
import { applyCordelInkedPatina, getInstrumentPrimaryStrongColor, getContrastColor } from '../../utils/colorHelpers';
import { computeStepBalancoPercent } from '../../utils/balancoUtils';
import {
  computeMeasurePatternStepOffset,
  getRodaMeasureGeometry,
  resolveActiveBeatResolutions,
} from '../../utils/rodaTimeSigGeometry';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import { areStepValuesEqual, isStepValueActive } from '../../utils/slaveStepOpacityResolver';
import { getLiveVariationRodaSnapshots } from '../../hooks/audio-sync/liveVariationLookaheadEngine';
import { useBalancoStore } from '../../stores/useBalancoStore';
import { FocusBrickStepModel, FocusMeasureStepsModel } from './focusBalancoTypes';

const hasAnyStroke = (steps?: unknown[]): boolean =>
  Boolean(steps?.some((s) => isStepValueActive(s)));

export function resolveFocusMeasureSteps(params: {
  focusTrack: TrackGroup | null | undefined;
  tracks: TrackGroup[];
  measureIdx: number;
  timeSig: string;
  measureTimeSigs?: Record<number, string>;
  soloPatternPlayId: number | null;
  globalSwing: GlobalSwing;
  isLeftHanded: boolean;
  isPlaying: boolean;
  lang: string;
}): FocusMeasureStepsModel {
  const { focusTrack, tracks, measureIdx, timeSig, measureTimeSigs, soloPatternPlayId, globalSwing, isLeftHanded, isPlaying, lang } = params;
  const sigStr = String(measureTimeSigs?.[measureIdx] || timeSig || '4/4');
  const geom = getRodaMeasureGeometry(sigStr);
  if (!focusTrack) {
    return {
      trackId: null, trackName: lang === 'pt' ? 'Instrumento' : 'Instrument',
      primaryColor: 'var(--cordel-accent)', contrastColor: 'var(--cordel-on-accent)',
      socketStrokeColor: 'var(--cordel-accent)',
      timeSig: sigStr, beatsCount: geom.beatsCount, stepCount: geom.defaultSteps,
      presetName: 'Maracatu', nominalIntensityPct: 100, steps: [],
    };
  }

  const inst = instrumentsConfig[focusTrack.instrumentIdx];
  const primaryColor = getInstrumentPrimaryStrongColor(inst, focusTrack);
  const contrastColor = getContrastColor(primaryColor);
  const isLightPrimary = contrastColor.toLowerCase() === '#1a1a1a';
  const socketStrokeColor = isLightPrimary
    ? `color-mix(in srgb, ${primaryColor} 62%, var(--cordel-ink-dark))`
    : primaryColor;
  const rawName = focusTrack.customName || inst?.name || 'Instrument';
  const trackName = rawName.replace(/\s*\([^)]*\)/g, '').replace(/^\d+[\.\s\-]+/, '').trim();

  const isSolo = soloPatternPlayId !== null;
  const isSlave = isSlaveTrack(focusTrack, tracks);
  const masterTrack = isSlave ? resolveMasterTrack(focusTrack.id, tracks) : undefined;
  const ownPattern = resolveActivePattern(focusTrack, tracks, measureIdx, isSolo, soloPatternPlayId) as Pattern | null;
  const masterPattern = masterTrack ? (resolveActivePattern(masterTrack, tracks, measureIdx, isSolo, soloPatternPlayId) as Pattern | null) : null;
  const explicitMuteOverride = isSlave && focusTrack.patternOverrides?.[measureIdx] === null;
  const activePattern = explicitMuteOverride ? null : ((ownPattern && hasAnyStroke(ownPattern.activeSteps)) ? ownPattern : (masterPattern ?? ownPattern));

  const beatsCount = geom.beatsCount;
  const beatRes = resolveActiveBeatResolutions(sigStr, activePattern);
  const stepCount = beatRes.reduce((acc, r) => acc + r, 0);

  const liveSnap = getLiveVariationRodaSnapshots();
  let playedSteps: any[] = activePattern?.activeSteps || [];
  let effectiveMicros = activePattern?.microtimings;

  if (activePattern && !explicitMuteOverride) {
    if (isPlaying) {
      const liveForFocus = liveSnap.currentStepsByTrackId?.[focusTrack.id];
      const liveForMaster = (isSlave && masterTrack && !hasAnyStroke(ownPattern?.activeSteps)) ? liveSnap.currentStepsByTrackId?.[masterTrack.id] : undefined;
      const chosenLive = (liveForFocus && hasAnyStroke(liveForFocus)) ? liveForFocus : (liveForMaster ?? liveForFocus);
      if (chosenLive) {
        playedSteps = chosenLive;
        const matchedVar = activePattern.variations?.find((v) => v.steps === chosenLive);
        if (matchedVar?.microtimings) effectiveMicros = matchedVar.microtimings;
      }
    } else {
      const isBlockEntry = measureIdx === 0 || !activePattern.measureAssignments?.[measureIdx - 1];
      const firstVar = isBlockEntry ? activePattern.variations?.find((v) => v.playFirstTimeOnly) : undefined;
      if (firstVar) {
        playedSteps = firstVar.steps;
        if (firstVar.microtimings) effectiveMicros = firstVar.microtimings;
      }
    }
  }

  const stepOffset = computeMeasurePatternStepOffset(activePattern, stepCount, measureIdx);
  const balancoTrack = (isSlave && focusTrack.balancoPresetId === undefined && focusTrack.balancoAmount === undefined && masterTrack) ? masterTrack : focusTrack;
  const tAmt = balancoTrack.balancoAmount ?? balancoTrack.swingIntensity ?? 100;
  const pAmt = activePattern?.balancoAmount ?? activePattern?.swingIntensity ?? 100;
  const gAmt = globalSwing?.mode === 'off' ? 0 : (globalSwing?.swingIntensity ?? 100);
  const nominalIntensityPct = Math.round((tAmt / 100) * (pAmt / 100) * (gAmt / 100) * 100);
  const presetId = activePattern?.balancoPresetId || balancoTrack.balancoPresetId || (globalSwing?.mode === 'maracatu' ? 'maracatu-trad' : undefined);
  const presetName = globalSwing?.mode === 'off' ? '0%' : (useBalancoStore.getState().resolvePreset(presetId)?.name || 'Maracatu');

  const steps: FocusBrickStepModel[] = [];
  let cursor = 0;
  for (let b = 0; b < beatsCount; b++) {
    const res = beatRes[b];
    for (let s = 0; s < res; s++) {
      const idx = cursor + s, actualIdx = stepOffset + idx;
      const rawVal = playedSteps[actualIdx] ?? 0, baseVal = activePattern?.activeSteps?.[actualIdx] ?? 0;
      const isActive = isStepValueActive(rawVal), isSplit = Array.isArray(rawVal) && rawVal.length === 2;
      const rawMicro = effectiveMicros?.[actualIdx] ?? 0;
      const manualMicroPct = Array.isArray(rawMicro) ? (rawMicro[0] ?? 0) : (typeof rawMicro === 'number' ? rawMicro : 0);
      const nominalBalancoPct = idx === 0 ? 0 : computeStepBalancoPercent({
        stepIdx: idx, steps: stepCount, beatResolutions: beatRes, timeSig: sigStr, track: balancoTrack, pattern: activePattern, globalSwing,
      });

      const resolveSymVisual = (subRaw: any) => {
        if (!isStepValueActive(subRaw) || !inst) return { sym: '', bg: primaryColor, txt: contrastColor };
        const vis = String(getVisualStrokeSymbol(subRaw, isLeftHanded, inst.id));
        const bg = applyCordelInkedPatina(inst.colors?.[vis] || primaryColor);
        const txt = isDarkText(inst.id, String(subRaw), bg) ? 'var(--cordel-ink-dark)' : 'var(--cordel-parchment-bg)';
        return { sym: vis, bg, txt };
      };
      const leftVis = resolveSymVisual(isSplit ? rawVal[0] : rawVal);
      const rightVis = isSplit ? resolveSymVisual(rawVal[1]) : { sym: '', bg: primaryColor, txt: contrastColor };

      steps.push({
        stepIdx: idx, beatIdx: b, subIdx: s, isBeatStart: s === 0, isActive, isSplit,
        isVariationStep: isActive && !areStepValuesEqual(rawVal, baseVal),
        displaySymbol: leftVis.sym, fillColor: leftVis.bg, textColor: leftVis.txt,
        rightSymbol: rightVis.sym, rightFillColor: rightVis.bg, rightTextColor: rightVis.txt,
        nominalBalancoPct, manualMicroPct, baseNormPos: (b + s / Math.max(1, res)) / Math.max(1, beatsCount),
      });
    }
    cursor += res;
  }

  return { trackId: focusTrack.id, trackName, primaryColor, contrastColor, socketStrokeColor, timeSig: sigStr, beatsCount, stepCount, presetName, nominalIntensityPct, steps };
}
