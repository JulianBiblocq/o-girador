import { nextRandom } from './compilerRandom';
import { buildMeasureStepGrid } from './measureStepGridHelper';
import { resolveActivePattern, resolvePatternVariation } from './patternResolver';
import { attachCompiledTrackIds, extractCompiledTrackIds } from './compiledTrackIdResolver';
import { getRodaMeasureGeometry } from '../../utils/rodaTimeSigGeometry';
import { getVariationSculptArrays, isSpecificSoloVariationId } from '../../utils/soloVariationMatcher';
import {
  normalizeStrokeKey,
  computeStepVolume,
  computeStepDecay,
  computeStepMicrotiming,
  packNoteData,
} from './stepNotePacker';

export function buildFlatSongSchedule(
  tracks: any[],
  totalMeasures: number,
  measureTimeSigs: string[],
  instConfig: any[],
  soloPatternPlayId: number | null,
  soloPatternVariationId: string | null,
  isolateBaseOnly: boolean = false
): Float32Array {
  const notesList: number[] = [];
  const isSoloPlayActive = soloPatternPlayId !== null;
  let accumulatedTicks = 0;
  const lastPatternIdByTrack = new Map<number, number | null>();
  const effectiveTotalMeasures = isSoloPlayActive ? Math.max(totalMeasures, 2) : totalMeasures;

  for (let measureIdx = 0; measureIdx < effectiveTotalMeasures; measureIdx++) {
    const timeSig = measureTimeSigs[measureIdx] || measureTimeSigs[0] || '4/4';
    const maxTicks = getRodaMeasureGeometry(timeSig).maxTicks;

    tracks.forEach((track: any, trackIdx: number) => {
      if ((track.isBusFolder || track.isLinkFolder) && !track.isLinkMaster) return;
      const inst = instConfig[track.instrumentIdx];
      if (!inst || inst.type === 'voice') return;

      const activePattern = resolveActivePattern(track, tracks, measureIdx, isSoloPlayActive, soloPatternPlayId);
      if (!activePattern) {
        lastPatternIdByTrack.set(track.id, null);
        return;
      }

      const currentPlayCount = lastPatternIdByTrack.get(track.id) !== activePattern.id ? 0 : 1;
      lastPatternIdByTrack.set(track.id, activePattern.id);

      let stepsToPlay = activePattern.activeSteps;
      let effectiveVolumes = activePattern.volumes;
      let effectiveDecays = activePattern.decays;
      let effectiveMicrotimings = activePattern.microtimings;
      let effectiveBeatRes = activePattern.beatResolutions;

      const shouldUseStaticSoloVariation = Boolean(isSoloPlayActive && isSpecificSoloVariationId(soloPatternVariationId));
      const matchedVariation = shouldUseStaticSoloVariation
        ? resolvePatternVariation(
            activePattern, isSoloPlayActive, soloPatternPlayId, soloPatternVariationId,
            currentPlayCount, measureIdx, isolateBaseOnly, nextRandom, tracks
          )
        : null;
      if (matchedVariation) {
        const sculpt = getVariationSculptArrays(activePattern, matchedVariation);
        stepsToPlay = sculpt.steps;
        effectiveVolumes = sculpt.volumes;
        effectiveDecays = sculpt.decays;
        effectiveMicrotimings = sculpt.microtimings;
        effectiveBeatRes = sculpt.beatResolutions;
      }

      const { stepTickMap, stepIsTupletMap, effectiveStepCount, stepOffset } = buildMeasureStepGrid(
        timeSig, { ...activePattern, beatResolutions: effectiveBeatRes }, measureIdx
      );

      for (let step = 0; step < effectiveStepCount; step++) {
        const actualStep = stepOffset + step;
        const rawState = stepsToPlay[actualStep];
        if (!rawState || rawState === 0 || rawState === '0') continue;

        const tickIdx = stepTickMap[step];
        const stepDurationTicks = (step < effectiveStepCount - 1)
          ? (stepTickMap[step + 1] - stepTickMap[step])
          : (maxTicks - stepTickMap[step]);
        const statesToProcess = Array.isArray(rawState) ? rawState : [rawState];

        for (let strokeIndex = 0; strokeIndex < statesToProcess.length; strokeIndex++) {
          const targetKey = normalizeStrokeKey(inst, statesToProcess[strokeIndex]);
          if (!targetKey) continue;

          const stepVolMultiplier = computeStepVolume(effectiveVolumes?.[actualStep], strokeIndex, nextRandom, step);
          const stepDecayMultiplier = computeStepDecay(effectiveDecays?.[actualStep], strokeIndex);
          const microtimingPct = computeStepMicrotiming(effectiveMicrotimings?.[actualStep], strokeIndex);
          const isTuplet = stepIsTupletMap[step] || false;
          const subTickOffset = statesToProcess.length > 1
            ? Math.round((stepDurationTicks / statesToProcess.length) * strokeIndex) : 0;
          const absoluteTick = Math.round(accumulatedTicks + tickIdx + subTickOffset);

          const packedData = packNoteData(
            trackIdx, step, targetKey.charCodeAt(0),
            Math.round(stepDecayMultiplier * 100), isTuplet, strokeIndex > 0
          );
          notesList.push(absoluteTick, packedData, stepVolMultiplier, microtimingPct);
        }
      }
    });

    accumulatedTicks += maxTicks;
  }

  const notesCount = notesList.length / 4;
  const indices = Array.from({ length: notesCount }, (_, i) => i);
  indices.sort((a, b) => notesList[a * 4] - notesList[b * 4]);

  const flatArray = new Float32Array(notesList.length);
  for (let i = 0; i < notesCount; i++) {
    const origIdx = indices[i];
    flatArray[i * 4] = notesList[origIdx * 4];
    flatArray[i * 4 + 1] = notesList[origIdx * 4 + 1];
    flatArray[i * 4 + 2] = notesList[origIdx * 4 + 2];
    flatArray[i * 4 + 3] = notesList[origIdx * 4 + 3];
  }
  attachCompiledTrackIds(flatArray, extractCompiledTrackIds(tracks));
  return flatArray;
}
