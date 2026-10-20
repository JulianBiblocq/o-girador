/**
 * O Girador - Vocal All Beats Resolution Resizer
 */

export function resizePatternAllBeatsResolution(
  pattern: any,
  newResolution: number,
  timeSig: string = '4/4'
): { updatedPattern: any; targetSteps: number } {
  let inferredBeats = 4;
  if (timeSig === '3/4') inferredBeats = 3;
  if (timeSig === '2/4' || timeSig === '6/8') inferredBeats = 2;
  if (timeSig === '12/8') inferredBeats = 4;

  const beats = pattern.beatResolutions?.length || inferredBeats;
  const currentRes = Array.isArray(pattern.beatResolutions) && pattern.beatResolutions.length >= beats
    ? pattern.beatResolutions
    : Array(beats).fill(4);

  const nextRes = Array(beats).fill(newResolution);
  const targetSteps = beats * newResolution;

  const reindexArray = <T>(arr: T[] | undefined, defaultVal: T, resetForTuplet: boolean = false): T[] | undefined => {
    if (!arr) return undefined;
    const result: T[] = [];
    let oldStepAcc = 0;
    for (let b = 0; b < beats; b++) {
      const oldR = currentRes[b] || 4;
      for (let s = 0; s < newResolution; s++) {
        if (!resetForTuplet && s < oldR && (oldStepAcc + s) < arr.length) {
          result.push(arr[oldStepAcc + s]);
        } else {
          result.push(defaultVal);
        }
      }
      oldStepAcc += oldR;
    }
    return result;
  };

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
    activeSteps: reindexArray(pattern.activeSteps, 0) as (string | number)[],
    lyrics: reindexArray(pLyrics, ''),
    notes: reindexArray(pNotes, ''),
    volumes: reindexArray(pVolumes, 80),
    decays: reindexArray(pDecays, 100),
    microtimings: reindexArray(pMicro, 0, isTuplet),
    preRollActiveSteps: pattern.preRollActiveSteps ? reindexArray(pattern.preRollActiveSteps, 0) as (string | number)[] : undefined,
    preRollLyrics: pattern.preRollLyrics ? reindexArray(pattern.preRollLyrics, '') : undefined,
    preRollNotes: pattern.preRollNotes ? reindexArray(pattern.preRollNotes, '') : undefined,
    preRollVolumes: pattern.preRollVolumes ? reindexArray(pattern.preRollVolumes, 80) : undefined,
    preRollDecays: pattern.preRollDecays ? reindexArray(pattern.preRollDecays, 100) : undefined,
  };

  return { updatedPattern, targetSteps };
}
