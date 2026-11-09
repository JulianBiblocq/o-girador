import { Track, Pattern, PatternVariation } from '../../types';
import { instrumentsConfig } from '../../data';
import {
  normalizeStrokeKey,
  computeStepVolume,
  computeStepDecay,
  computeStepMicrotiming,
  packNoteData,
} from '../../workers/compiler/stepNotePacker';

export function buildMeasureVariationNotes(params: {
  tracks: Track[];
  measureIdx: number;
  measureStartTick: number;
  timeSig: string;
  variedPatternsByTrackId: Map<number, { pattern: Pattern; variation: PatternVariation }>;
}): number[] {
  const { tracks, measureIdx, measureStartTick, timeSig, variedPatternsByTrackId } = params;
  if (variedPatternsByTrackId.size === 0) return [];

  const [beatsStr, beatUnitStr] = (timeSig || '4/4').split('/');
  const beats = parseInt(beatsStr, 10) || 4;
  const beatUnit = parseInt(beatUnitStr, 10) || 4;
  const maxTicks = beats * (96 / beatUnit);
  const ticksPerBeat = maxTicks / beats;

  const notesList: number[] = [];

  tracks.forEach((track, trackIdx) => {
    const entry = variedPatternsByTrackId.get(track.id);
    if (!entry) return;
    const inst = instrumentsConfig[track.instrumentIdx];
    if (!inst || inst.type === 'voice') return;

    const { pattern: activePattern, variation } = entry;
    const stepsToPlay = variation.steps || activePattern.activeSteps;
    const effectiveVolumes = variation.volumes || activePattern.volumes;
    const effectiveDecays = variation.decays || activePattern.decays;
    const effectiveMicrotimings = variation.microtimings || activePattern.microtimings;

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
      const stepDurationTicks =
        step < effectiveStepCount - 1 ? stepTickMap[step + 1] - stepTickMap[step] : maxTicks - stepTickMap[step];
      const statesToProcess = Array.isArray(rawState) ? rawState : [rawState];

      for (let strokeIndex = 0; strokeIndex < statesToProcess.length; strokeIndex++) {
        const targetKey = normalizeStrokeKey(inst, statesToProcess[strokeIndex]);
        if (!targetKey) continue;

        const stepVolMultiplier = computeStepVolume(effectiveVolumes?.[actualStep], strokeIndex, Math.random);
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

  return notesList;
}

