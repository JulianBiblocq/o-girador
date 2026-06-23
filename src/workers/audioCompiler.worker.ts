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

self.onmessage = (e: MessageEvent<CompilerWorkerMessage>) => {
  try {
    const { tracks, totalMeasures, measureTimeSigs, instConfig, soloPatternPlayId } = e.data;
    const scheduleMap = buildTickSchedule(tracks, totalMeasures, measureTimeSigs, instConfig, soloPatternPlayId);
    
    // Serialization de la Map pour le postMessage
    const serialized = Array.from(scheduleMap.entries()).map(([measureIdx, measureMap]) => {
      return [measureIdx, Array.from(measureMap.entries())];
    });

    self.postMessage({ success: true, data: serialized });
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message });
  }
};
