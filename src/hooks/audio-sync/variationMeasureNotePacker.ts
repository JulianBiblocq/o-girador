import { Track, Pattern, PatternVariation } from '../../types';
import { instrumentsConfig } from '../../data';
import { buildMeasureStepGrid } from '../../workers/compiler/measureStepGridHelper';
import { getVariationSculptArrays } from '../../utils/soloVariationMatcher';
import {
  normalizeStrokeKey,
  computeStepVolume,
  computeStepDecay,
  computeStepMicrotiming,
  packNoteData,
} from '../../workers/compiler/stepNotePacker';
import { attachCompiledTrackIds, extractCompiledTrackIds } from '../../workers/compiler/compiledTrackIdResolver';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';

export function buildMeasureVariationNotes(params: {
  tracks: Track[];
  measureIdx: number;
  measureStartTick: number;
  timeSig: string;
  variedPatternsByTrackId: Map<number, { pattern: Pattern; variation: PatternVariation }>;
}): number[] {
  const { tracks, measureIdx, measureStartTick, timeSig, variedPatternsByTrackId } = params;
  if (variedPatternsByTrackId.size === 0) return [];

  const notesList: number[] = [];

  tracks.forEach((track, trackIdx) => {
    const entry = variedPatternsByTrackId.get(track.id);
    if (!entry) return;
    const inst = instrumentsConfig[track.instrumentIdx];
    if (!inst || inst.type === 'voice') return;

    const { pattern: activePattern, variation } = entry;
    const {
      steps: stepsToPlay,
      volumes: effectiveVolumes,
      decays: effectiveDecays,
      microtimings: effectiveMicrotimings,
      beatResolutions: effectiveBeatRes,
    } = getVariationSculptArrays(activePattern, variation);

    const { stepTickMap, stepIsTupletMap, stepIsBeatHeadMap, effectiveStepCount, stepOffset, maxTicks } = buildMeasureStepGrid(
      timeSig || '4/4',
      { ...activePattern, beatResolutions: effectiveBeatRes },
      measureIdx,
      (m) => resolveActivePattern(track, tracks, m, false, null)?.id === activePattern.id
    );

    for (let step = 0; step < effectiveStepCount; step++) {
      const actualStep = stepOffset + step;
      const rawState = stepsToPlay[actualStep];
      if (!rawState || rawState === 0 || rawState === '0') continue;

      const tickIdx = stepTickMap[step];
      const stepDurationTicks =
        step < effectiveStepCount - 1 ? stepTickMap[step + 1] - stepTickMap[step] : maxTicks - stepTickMap[step];
      const statesToProcess = Array.isArray(rawState) ? rawState : [rawState];

      for (let strokeIndex = 0; strokeIndex < statesToProcess.length; strokeIndex++) {
        const targetKey = normalizeStrokeKey(inst, statesToProcess[strokeIndex]);
        if (!targetKey) continue;

        const stepVolMultiplier = computeStepVolume(effectiveVolumes?.[actualStep], strokeIndex, Math.random, step, stepIsBeatHeadMap[step]);
        const stepDecayMultiplier = computeStepDecay(effectiveDecays?.[actualStep], strokeIndex);
        const microtimingPct = computeStepMicrotiming(effectiveMicrotimings?.[actualStep], strokeIndex);

        const isTuplet = stepIsTupletMap[step] || false;
        const subTickOffset =
          statesToProcess.length > 1 ? Math.round((stepDurationTicks / statesToProcess.length) * strokeIndex) : 0;
        const absoluteTick = Math.round(measureStartTick + tickIdx + subTickOffset);

        const packedData = packNoteData(
          trackIdx,
          step,
          targetKey.charCodeAt(0),
          Math.round(stepDecayMultiplier * 100),
          isTuplet,
          strokeIndex > 0
        );
        notesList.push(absoluteTick, packedData, stepVolMultiplier, microtimingPct);
      }
    }
  });

  attachCompiledTrackIds(notesList, extractCompiledTrackIds(tracks));
  return notesList;
}
