export interface ScheduledNote {
  instId: string;
  playerKey: string;
  baseGain: number;
  stepVolMultiplier: number;
  stepDecayMultiplier: number;
  isStrong: boolean;
  microtimingPct: number;
  stepsPerMeasure: number;
  trackId: number;
  circleStepIdx: number;
  state: string | number;
  isTuplet?: boolean;
}

export interface CompilerWorkerMessage {
  tracks: any[];
  totalMeasures: number;
  measureTimeSigs: string[];
  instConfig: any[];
  soloPatternPlayId: number | null;
}

const RANDOM_POOL_SIZE = 1000;
const randomPool = Array.from({ length: RANDOM_POOL_SIZE }, () => Math.random());
let randomPoolIdx = 0;

function nextRandom(): number {
  const val = randomPool[randomPoolIdx];
  randomPoolIdx = (randomPoolIdx + 1) % RANDOM_POOL_SIZE;
  return val;
}

const instrumentIds = ['caixa', 'tarol', 'marcante', 'meiao', 'repique', 'gongue', 'agbe', 'apito'];

function buildFlatMeasureSchedule(
  tracks: any[],
  measureIdx: number,
  timeSig: string,
  instConfig: any[],
  soloPatternPlayId: number | null,
  soloPatternVariationId: string | null,
  bpm: number,
  globalSwing: any,
  measureStartTime: number
): Float32Array {
  const parts = timeSig.split('/');
  const beats = parseInt(parts[0], 10);
  const beatUnit = parseInt(parts[1], 10);
  const maxTicks = beats * (96 / beatUnit);
  const tick96nSec = 2.5 / bpm;
  const stepDurationSec = tick96nSec * 6;

  const notesList: number[] = [];
  const hasSolo = tracks.some((t: any) => t.isSolo);
  const isSoloPlayActive = soloPatternPlayId !== null;

  tracks.forEach((track: any) => {
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

    if (isSoloPlayActive && soloPatternVariationId === 'base') {
      // Base phrase only
    } else if (isSoloPlayActive && soloPatternVariationId && soloPatternVariationId !== 'ensemble' && soloPatternVariationId !== 'base') {
      const matchedVariation = activePattern.variations?.find((v: any) => v.id === soloPatternVariationId);
      if (matchedVariation) {
        stepsToPlay = matchedVariation.steps;
        if (matchedVariation.volumes) effectiveVolumes = matchedVariation.volumes;
        if (matchedVariation.decays) effectiveDecays = matchedVariation.decays;
        if (matchedVariation.microtimings) effectiveMicrotimings = matchedVariation.microtimings;
      }
    } else if (
      (!isSoloPlayActive && activePattern.measureAllowVariations?.[measureIdx]) ||
      (isSoloPlayActive && soloPatternVariationId === 'ensemble')
    ) {
      if (activePattern.variations && activePattern.variations.length > 0) {
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
    }

    const stepCount = activePattern.steps;
    const ticksPerBeat = maxTicks / beats;
    const resArray = activePattern.beatResolutions || Array(beats).fill(stepCount / beats);

    let accumulatedTicks = 0;
    const stepTickMap: number[] = [];
    const stepIsTupletMap: boolean[] = [];

    for (let b = 0; b < beats; b++) {
      const res = resArray[b] || (stepCount / beats);
      const ticksPerStep = ticksPerBeat / res;
      for (let r = 0; r < res; r++) {
        stepTickMap.push(Math.round(accumulatedTicks + r * ticksPerStep));
        stepIsTupletMap.push(res === 3 || res === 6);
      }
      accumulatedTicks += ticksPerBeat;
    }

    for (let step = 0; step < stepCount; step++) {
      const state = stepsToPlay[step];
      if (!state || state === 0 || state === '0') continue;

      const tickIdx = stepTickMap[step] !== undefined ? stepTickMap[step] : Math.floor((step * maxTicks) / stepCount);
      let targetKey: string | null = typeof state === 'string' ? state : String(state);
      let isStrong = false;

      if (inst.type === 'gongue') {
        if (state === 'G' || state === 'A') { isStrong = true; }
      } else if (inst.id === 'caixa' || inst.id === 'tarol') {
        if (['D', 'E', 'R', 'r', 'X', 'F', 'C'].includes(state)) { isStrong = true; }
      } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
        if (['D', 'E', 'X', 'I', 'C'].includes(state)) { isStrong = true; }
      } else if (inst.id === 'agbe') {
        if (['D', 'E', 'S'].includes(state)) { isStrong = true; }
      } else {
        if (['D', 'E', 'P', 'T'].includes(state as string)) { isStrong = true; }
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
      let swingOffset = 0;
      let swingJitter = (nextRandom() * 0.06 - 0.03) * stepDurationSec;
      const globalMode = globalSwing ? globalSwing.mode : 'off';

      if (globalMode !== 'off') {
        const posInBeat = ((tickIdx / (maxTicks / 4)) % 1) * 4;
        const posInGroup = Math.round(posInBeat) % 4;

        if (globalMode === 'maracatu') {
          if (posInGroup === 0) {
            swingOffset = swingJitter;
          } else if (posInGroup === 1) {
            swingOffset = (0.04 * stepDurationSec) + swingJitter;
          } else if (posInGroup === 2) {
            const minimalJitter = (nextRandom() * 0.02 - 0.01) * stepDurationSec;
            swingOffset = (-0.144 * stepDurationSec) + minimalJitter;
          } else if (posInGroup === 3) {
            swingOffset = (-0.292 * stepDurationSec) + swingJitter;
          }
        } else if (globalMode === 'custom' && globalSwing.customOffsets) {
          const customOffsetPct = globalSwing.customOffsets[posInGroup] || 0;
          swingOffset = (customOffsetPct / 100) * stepDurationSec * 0.5 + swingJitter;
        }
      }

      const stepDurSec = tick96nSec * (maxTicks / stepCount);
      const microOffset = (microtimingPct / 100) * stepDurSec * 0.5;

      const tickTimeInMeasure = tickIdx * tick96nSec;
      const triggerTime = measureStartTime + tickTimeInMeasure + (isTuplet ? swingJitter : swingOffset) + microOffset;

      let vel = 1.0;
      if (globalMode !== 'off') {
        if (isTuplet) {
          vel = isStrong
            ? 0.8 + (nextRandom() * 0.1 - 0.05)
            : 0.5 + (nextRandom() * 0.1 - 0.05);
        } else {
          vel = isStrong
            ? 0.8 + (nextRandom() * 0.2 - 0.1)
            : 0.4 + (nextRandom() * 0.24 - 0.12);
        }
      }
      vel *= stepVolMultiplier;

      const instIdx = instrumentIds.indexOf(inst.id);
      const strokeCharCode = targetKey.charCodeAt(0);
      const decayPct = Math.round(stepDecayMultiplier * 100);
      const packedData = (track.id << 19) | (step << 14) | (strokeCharCode << 7) | decayPct;

      notesList.push(triggerTime, packedData, vel);
    }
  });

  const notesCount = notesList.length / 3;
  const indices = Array.from({ length: notesCount }, (_, i) => i);
  indices.sort((a, b) => notesList[a * 3] - notesList[b * 3]);

  const flatArray = new Float32Array(notesList.length);
  for (let i = 0; i < notesCount; i++) {
    const origIdx = indices[i];
    flatArray[i * 3] = notesList[origIdx * 3];
    flatArray[i * 3 + 1] = notesList[origIdx * 3 + 1];
    flatArray[i * 3 + 2] = notesList[origIdx * 3 + 2];
  }

  return flatArray;
}

function buildTickSchedule(
  tracks: any[],
  totalMeasures: number,
  measureTimeSigs: string[],
  instConfig: any[],
  soloPatternPlayId: number | null
): Map<number, Map<number, ScheduledNote[]>> {
  const schedule = new Map<number, Map<number, ScheduledNote[]>>();
  const hasSolo = tracks.some((t: any) => t.isSolo);
  const isSoloPlayActive = soloPatternPlayId !== null;

  for (let measureIdx = 0; measureIdx < totalMeasures; measureIdx++) {
    const timeSig = measureTimeSigs[measureIdx] || '4/4';
    const parts = timeSig.split('/');
    const beats = parseInt(parts[0], 10);
    const beatUnit = parseInt(parts[1], 10);
    const maxTicks = beats * (96 / beatUnit);
    const measureMap = new Map<number, ScheduledNote[]>();

    tracks.forEach((track: any) => {
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

      const stepCount = activePattern.steps;
      const ticksPerBeat = maxTicks / beats;
      const resArray = activePattern.beatResolutions || Array(beats).fill(stepCount / beats);
      
      const stepTickMap: number[] = [];
      const stepIsTupletMap: boolean[] = [];
      let accumulatedTicks = 0;
      
      for (let b = 0; b < beats; b++) {
        const res = resArray[b] || (stepCount / beats);
        const ticksPerStep = ticksPerBeat / res;
        for (let r = 0; r < res; r++) {
          stepTickMap.push(Math.round(accumulatedTicks + r * ticksPerStep));
          stepIsTupletMap.push(res === 3 || res === 6);
        }
        accumulatedTicks += ticksPerBeat;
      }

      for (let step = 0; step < stepCount; step++) {
        const state = activePattern.activeSteps[step];
        if (!state || state === 0 || state === '0') continue;

        const tickIdx = stepTickMap[step] !== undefined ? stepTickMap[step] : Math.floor((step * maxTicks) / stepCount);
        let targetKey: string | null = typeof state === 'string' ? state : String(state);
        let isStrong = false;

        if (inst.type === 'gongue') {
          if (state === 'G' || state === 'A') { isStrong = true; }
        } else if (inst.id === 'caixa' || inst.id === 'tarol') {
          if (['D', 'E', 'R', 'r', 'X', 'F', 'C'].includes(state)) { isStrong = true; }
        } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
          if (['D', 'E', 'X', 'I', 'C'].includes(state)) { isStrong = true; }
        } else if (inst.id === 'agbe') {
          if (['D', 'E', 'S'].includes(state)) { isStrong = true; }
        } else {
          if (['D', 'E', 'P', 'T'].includes(state as string)) { isStrong = true; }
        }

        if (!targetKey) continue;

        const baseVol = activePattern.volumes?.[step] ?? 80;
        const volVariation = (nextRandom() * 2 - 1) * (baseVol * 0.15);
        let finalVol = Math.max(0, Math.min(100, baseVol + volVariation));

        const stepVolMultiplier = finalVol / 100;
        const stepDecayMultiplier = (activePattern.decays?.[step] ?? 100) / 100;
        const microtimingPct = activePattern.microtimings?.[step] ?? 0;

        if (!measureMap.has(tickIdx)) measureMap.set(tickIdx, []);
        measureMap.get(tickIdx)!.push({
          instId: inst.id,
          playerKey: targetKey,
          baseGain: 1.0,
          stepVolMultiplier,
          stepDecayMultiplier,
          isStrong,
          microtimingPct,
          stepsPerMeasure: stepCount,
          trackId: track.id,
          circleStepIdx: step,
          state,
          isTuplet: stepIsTupletMap[step] || false,
        });
      }
    });

    schedule.set(measureIdx, measureMap);
  }
  return schedule;
}

self.onmessage = (e: MessageEvent<any>) => {
  try {
    const { action } = e.data;
    if (action === 'compileMeasure') {
      const {
        tracks,
        measureIdx,
        timeSig,
        instConfig,
        soloPatternPlayId,
        soloPatternVariationId,
        bpm,
        globalSwing,
        measureStartTime
      } = e.data;

      const flatArray = buildFlatMeasureSchedule(
        tracks,
        measureIdx,
        timeSig,
        instConfig,
        soloPatternPlayId,
        soloPatternVariationId,
        bpm,
        globalSwing,
        measureStartTime
      );

      // @ts-ignore
      self.postMessage({ success: true, action: 'compileMeasure', data: flatArray }, [flatArray.buffer]);
    } else {
      const { tracks, totalMeasures, measureTimeSigs, instConfig, soloPatternPlayId } = e.data;
      const scheduleMap = buildTickSchedule(tracks, totalMeasures, measureTimeSigs, instConfig, soloPatternPlayId);
      
      const serialized = Array.from(scheduleMap.entries()).map(([measureIdx, measureMap]) => {
        return [measureIdx, Array.from(measureMap.entries())];
      });

      self.postMessage({ success: true, data: serialized });
    }
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message });
  }
};
