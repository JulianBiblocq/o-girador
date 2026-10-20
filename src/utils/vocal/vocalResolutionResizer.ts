/**
 * O Girador - Vocal Beat Resolution Resizer
 */

function spliceStepArray<T>(
  arr: T[] | undefined,
  defaultVal: T,
  startIndex: number,
  oldR: number,
  newR: number,
  dontCopy: boolean = false
): T[] | undefined {
  if (!arr) return undefined;
  const copy = [...arr];
  const replacement = Array(newR).fill(defaultVal);
  if (!dontCopy) {
    for (let i = 0; i < Math.min(oldR, newR); i++) {
      if (startIndex + i < copy.length) replacement[i] = copy[startIndex + i];
    }
  }
  copy.splice(startIndex, oldR, ...replacement);
  return copy;
}

export function resizePatternBeatResolution(
  pattern: any,
  beatIndex: number,
  newResolution: number,
  timeSig: string = '4/4'
): { updatedPattern: any; targetSteps: number } {
  let inferredBeats = 4;
  if (timeSig === '3/4') inferredBeats = 3;
  if (timeSig === '2/4' || timeSig === '6/8') inferredBeats = 2;
  if (timeSig === '12/8') inferredBeats = 4;

  let currentRes = pattern.beatResolutions;
  if (!currentRes || !Array.isArray(currentRes) || currentRes.length === 0) {
    let stepsPerBeat = Math.floor((pattern.steps || 16) / inferredBeats);
    if (stepsPerBeat === 0) stepsPerBeat = 4;
    currentRes = Array(inferredBeats).fill(stepsPerBeat);
    const total = currentRes.reduce((a: number, b: number) => a + b, 0);
    if (total !== pattern.steps) {
      currentRes[currentRes.length - 1] += ((pattern.steps || 16) - total);
    }
  }

  if (beatIndex >= currentRes.length || currentRes[beatIndex] === newResolution) {
    return { updatedPattern: pattern, targetSteps: pattern.steps || 16 };
  }

  const oldRes = currentRes[beatIndex];
  const nextRes = [...currentRes];
  nextRes[beatIndex] = newResolution;
  const targetSteps = (pattern.steps || 16) - oldRes + newResolution;
  const startIndex = currentRes.slice(0, beatIndex).reduce((sum: number, val: number) => sum + val, 0);

  const pVolumes = pattern.volumes || Array(pattern.steps || 16).fill(80);
  const pDecays = pattern.decays || Array(pattern.steps || 16).fill(100);
  const pMicro = pattern.microtimings || Array(pattern.steps || 16).fill(0);
  const pLyrics = pattern.lyrics || Array(pattern.steps || 16).fill('');
  const pNotes = pattern.notes || Array(pattern.steps || 16).fill('');
  const isTuplet = newResolution === 3 || newResolution === 6;

  const updatedPattern = {
    ...pattern,
    steps: targetSteps,
    beatResolutions: nextRes,
    activeSteps: spliceStepArray(pattern.activeSteps, 0, startIndex, oldRes, newResolution) as (string | number)[],
    lyrics: spliceStepArray(pLyrics, '', startIndex, oldRes, newResolution),
    notes: spliceStepArray(pNotes, '', startIndex, oldRes, newResolution),
    volumes: spliceStepArray(pVolumes, 80, startIndex, oldRes, newResolution),
    decays: spliceStepArray(pDecays, 100, startIndex, oldRes, newResolution),
    microtimings: spliceStepArray(pMicro, 0, startIndex, oldRes, newResolution, isTuplet),
    preRollActiveSteps: pattern.preRollActiveSteps ? spliceStepArray(pattern.preRollActiveSteps, 0, startIndex, oldRes, newResolution) : undefined,
    preRollLyrics: pattern.preRollLyrics ? spliceStepArray(pattern.preRollLyrics, '', startIndex, oldRes, newResolution) : undefined,
    preRollNotes: pattern.preRollNotes ? spliceStepArray(pattern.preRollNotes, '', startIndex, oldRes, newResolution) : undefined,
    preRollVolumes: pattern.preRollVolumes ? spliceStepArray(pattern.preRollVolumes, 80, startIndex, oldRes, newResolution) : undefined,
    preRollDecays: pattern.preRollDecays ? spliceStepArray(pattern.preRollDecays, 100, startIndex, oldRes, newResolution) : undefined,
  };

  return { updatedPattern, targetSteps };
}
