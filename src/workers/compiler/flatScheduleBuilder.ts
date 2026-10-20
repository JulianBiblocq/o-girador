import { nextRandom } from './compilerRandom';
import { resolveActivePattern, resolvePatternVariation } from './patternResolver';
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
  const patternPlayCounts = new Map<string, number>();
  const effectiveTotalMeasures = isSoloPlayActive ? Math.max(totalMeasures, 2) : totalMeasures;

  for (let measureIdx = 0; measureIdx < effectiveTotalMeasures; measureIdx++) {
    const timeSig = measureTimeSigs[measureIdx] || measureTimeSigs[0] || '4/4';
    const [beatsStr, beatUnitStr] = timeSig.split('/');
    const beats = parseInt(beatsStr, 10);
    const beatUnit = parseInt(beatUnitStr, 10);
    const maxTicks = beats * (96 / beatUnit);

    tracks.forEach((track: any, trackIdx: number) => {
      if (track.isBusFolder) return;
      const inst = instConfig[track.instrumentIdx];
      if (!inst || inst.type === 'voice') return;

      const activePattern = resolveActivePattern(track, tracks, measureIdx, isSoloPlayActive, soloPatternPlayId);
      if (!activePattern) return;

      const trackPatternKey = `${track.id}-${activePattern.id}`;
      const currentPlayCount = patternPlayCounts.get(trackPatternKey) || 0;
      patternPlayCounts.set(trackPatternKey, currentPlayCount + 1);

      let stepsToPlay = activePattern.activeSteps;
      let effectiveVolumes = activePattern.volumes;
      let effectiveDecays = activePattern.decays;
      let effectiveMicrotimings = activePattern.microtimings;

      const matchedVariation = resolvePatternVariation(
        activePattern, isSoloPlayActive, soloPatternPlayId, soloPatternVariationId,
        currentPlayCount, measureIdx, isolateBaseOnly, nextRandom
      );
      if (matchedVariation) {
        stepsToPlay = matchedVariation.steps;
        if (matchedVariation.volumes) effectiveVolumes = matchedVariation.volumes;
        if (matchedVariation.decays) effectiveDecays = matchedVariation.decays;
        if (matchedVariation.microtimings) effectiveMicrotimings = matchedVariation.microtimings;
      }

      const ticksPerBeat = maxTicks / beats;
      const resArray = activePattern.beatResolutions || Array(beats).fill(4);
      let stepTickAccum = 0;
      const stepTickMap: number[] = [];
      const stepIsTupletMap: boolean[] = [];

      for (let b = 0; b < beats; b++) {
        const res = resArray[b] || 4;
        const ticksPerStep = ticksPerBeat / res;
        for (let r = 0; r < res; r++) {
          stepTickMap.push(Math.round(stepTickAccum + r * ticksPerStep));
          stepIsTupletMap.push(res === 3 || res === 6);
        }
        stepTickAccum += ticksPerBeat;
      }

      const effectiveStepCount = stepTickMap.length;
      const stepsPerMeasure = beats * 4;
      const patternSpan = Math.max(1, Math.round((activePattern.steps || stepsPerMeasure) / stepsPerMeasure));
      let stepOffset = 0;
      if (patternSpan > 1) {
        let startM = measureIdx;
        while (startM > 0 && activePattern.measureAssignments?.[startM - 1] === true) startM--;
        stepOffset = ((measureIdx - startM) % patternSpan) * stepsPerMeasure;
      }

      for (let step = 0; step < effectiveStepCount; step++) {
        const actualStep = stepOffset + step;
        const rawState = stepsToPlay[actualStep];
        if (!rawState || rawState === 0 || rawState === '0') continue;

        const tickIdx = stepTickMap[step];
        const stepDurationTicks = (step < effectiveStepCount - 1) ? (stepTickMap[step + 1] - stepTickMap[step]) : (maxTicks - stepTickMap[step]);
        const statesToProcess = Array.isArray(rawState) ? rawState : [rawState];

        for (let strokeIndex = 0; strokeIndex < statesToProcess.length; strokeIndex++) {
          const targetKey = normalizeStrokeKey(inst, statesToProcess[strokeIndex]);
          if (!targetKey) continue;

          const stepVolMultiplier = computeStepVolume(effectiveVolumes?.[actualStep], strokeIndex, nextRandom);
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
  return flatArray;
}
