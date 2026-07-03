const RANDOM_POOL_SIZE = 1000;
const randomPool = Array.from({ length: RANDOM_POOL_SIZE }, () => Math.random());
let randomPoolIdx = 0;

function nextRandom(): number {
  const val = randomPool[randomPoolIdx];
  randomPoolIdx = (randomPoolIdx + 1) % RANDOM_POOL_SIZE;
  return val;
}

const instrumentIds = ['caixa', 'tarol', 'marcante', 'meiao', 'repique', 'gongue', 'agbe', 'apito'];

function buildFlatSongSchedule(
  tracks: any[],
  totalMeasures: number,
  measureTimeSigs: string[],
  instConfig: any[],
  soloPatternPlayId: number | null
): Float32Array {
  const notesList: number[] = [];
  const hasSolo = tracks.some((t: any) => t.isSolo);
  const isSoloPlayActive = soloPatternPlayId !== null;

  let accumulatedTicks = 0;

  for (let measureIdx = 0; measureIdx < totalMeasures; measureIdx++) {
    const timeSig = measureTimeSigs[measureIdx] || '4/4';
    const parts = timeSig.split('/');
    const beats = parseInt(parts[0], 10);
    const beatUnit = parseInt(parts[1], 10);
    const maxTicks = beats * (96 / beatUnit);

    tracks.forEach((track: any, trackIdx: number) => {
      const inst = instConfig[track.instrumentIdx];
      if (!inst || inst.type === 'voice') return;

      let activePattern: any = null;
      let canPlay = false;

      if (isSoloPlayActive) {
        const isTargetSoloTrack = track.patterns.some((p: any) => p.id === soloPatternPlayId);
        if (isTargetSoloTrack) {
          activePattern = track.patterns.find((p: any) => p.id === soloPatternPlayId);
          canPlay = true;
        }
      } else {
        activePattern = track.patterns.find((p: any) => p.measureAssignments[measureIdx]);
        canPlay = hasSolo ? track.isSolo : !track.isMute;
      }

      if (!activePattern || !canPlay) return;

      let stepsToPlay = activePattern.activeSteps;
      let effectiveVolumes = activePattern.volumes;
      let effectiveDecays = activePattern.decays;
      let effectiveMicrotimings = activePattern.microtimings;

      // Resolve variations for this measure
      if (activePattern.variations && activePattern.variations.length > 0 && activePattern.measureAllowVariations?.[measureIdx]) {
        const validVariations = activePattern.variations.filter((v: any) => !v.playFirstTimeOnly);
        if (validVariations.length > 0) {
          const rand = nextRandom() * 100;
          let sum = 0;
          let matchedVariation = null;
          for (const variation of validVariations) {
            if (rand >= sum && rand < sum + variation.probability) {
              matchedVariation = variation;
              break;
            }
            sum += variation.probability;
          }
          if (matchedVariation) {
            stepsToPlay = matchedVariation.steps;
            if (matchedVariation.volumes) effectiveVolumes = matchedVariation.volumes;
            if (matchedVariation.decays) effectiveDecays = matchedVariation.decays;
            if (matchedVariation.microtimings) effectiveMicrotimings = matchedVariation.microtimings;
          }
        }
      }

      const stepCount = activePattern.steps;
      const ticksPerBeat = maxTicks / beats;
      const resArray = activePattern.beatResolutions || Array(beats).fill(stepCount / beats);

      let stepTickAccum = 0;
      const stepTickMap: number[] = [];
      const stepIsTupletMap: boolean[] = [];

      for (let b = 0; b < beats; b++) {
        const res = resArray[b] || (stepCount / beats);
        const ticksPerStep = ticksPerBeat / res;
        for (let r = 0; r < res; r++) {
          stepTickMap.push(Math.round(stepTickAccum + r * ticksPerStep));
          stepIsTupletMap.push(res === 3 || res === 6);
        }
        stepTickAccum += ticksPerBeat;
      }

      for (let step = 0; step < stepCount; step++) {
        const state = stepsToPlay[step];
        if (!state || state === 0 || state === '0') continue;

        const tickIdx = stepTickMap[step] !== undefined ? stepTickMap[step] : Math.floor((step * maxTicks) / stepCount);
        let targetKey: string | null = typeof state === 'string' ? state : String(state);
        let isStrong = false;

        if (inst.type === 'gongue') {
          if (state === 'G' || state === 'A') isStrong = true;
        } else if (inst.id === 'caixa' || inst.id === 'tarol') {
          if (['D', 'E', 'R', 'r', 'X', 'F', 'C'].includes(state)) isStrong = true;
        } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
          if (['D', 'E', 'X', 'I', 'C'].includes(state)) isStrong = true;
        } else if (inst.id === 'agbe') {
          if (['D', 'E', 'S'].includes(state)) isStrong = true;
        } else {
          if (['D', 'E', 'P', 'T'].includes(state as string)) isStrong = true;
        }

        if (!targetKey) continue;

        // Normalization of legacy symbols
        if (['marcante', 'meiao', 'repique', 'caixa', 'tarol'].includes(inst.id)) {
          if (targetKey === 't' || targetKey === 'T') targetKey = 'B';
          else if (targetKey === 'C') targetKey = 'c';
        } else if (inst.id === 'agbe' || inst.id === 'gongue') {
          if (targetKey === 't') targetKey = 'B';
        }

        const baseVol = effectiveVolumes?.[step] ?? 80;
        const volVariation = (nextRandom() * 2 - 1) * (baseVol * 0.15);
        let finalVol = Math.max(0, Math.min(100, baseVol + volVariation));

        const stepVolMultiplier = finalVol / 100;
        const stepDecayMultiplier = (effectiveDecays?.[step] ?? 100) / 100;
        const microtimingPct = effectiveMicrotimings?.[step] ?? 0;

        const isTuplet = stepIsTupletMap[step] || false;
        const absoluteTick = accumulatedTicks + tickIdx;

        // Pack data: trackIdx (3 bits), circleStepIdx (5 bits), strokeCharCode (7 bits), decayPct (7 bits), isTuplet (1 bit)
        const strokeCharCode = targetKey.charCodeAt(0);
        const decayPct = Math.round(stepDecayMultiplier * 100);
        const isTupletBit = isTuplet ? 1 : 0;
        const packedData = (trackIdx << 20) | (step << 15) | (strokeCharCode << 8) | (decayPct << 1) | isTupletBit;

        notesList.push(absoluteTick, packedData, stepVolMultiplier, microtimingPct);
      }
    });

    accumulatedTicks += maxTicks;
  }

  // Sort notesList by absoluteTick (first element of each group of 4)
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

self.onmessage = (e: MessageEvent<any>) => {
  try {
    const { action, tracks, totalMeasures, measureTimeSigs, instConfig, soloPatternPlayId } = e.data;
    if (action === 'compileSong') {
      const flatArray = buildFlatSongSchedule(
        tracks,
        totalMeasures,
        measureTimeSigs,
        instConfig,
        soloPatternPlayId
      );
      // @ts-ignore
      self.postMessage({ success: true, action: 'compileSong', data: flatArray }, [flatArray.buffer]);
    }
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message });
  }
};
