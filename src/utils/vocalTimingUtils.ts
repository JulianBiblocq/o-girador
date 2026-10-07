/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utilitaires purs de découpage rythmique et de synchronisation temporelle
 * pour les pistes vocales (Toada, Puxador, Coro) avec support complet des divisions (Triolets, Doubles-croches...).
 */

export interface VocalBeatGroup {
  beatIndex: number;
  steps: number[];
  resolution: number;
}

export interface VocalMeasureGroups {
  measureIndex: number;
  groups: VocalBeatGroup[];
}

export interface VocalStepTickMatch {
  step: number;
  beatIndex: number;
  stepInBeat: number;
  stepsInBeat: number;
  singleStepSec: number;
  triggerTick: number;
}

/**
 * Découpe les pas d'une mesure ou d'un motif vocal en groupes par temps de pulsation.
 */
export function getVocalMeasureGroups(
  totalSteps: number,
  beatResolutions?: number[] | null,
  beatsPerMeasure: number = 4
): VocalMeasureGroups[] {
  const beats = Math.max(1, Math.round(beatsPerMeasure) || 4);
  const resArray = Array.isArray(beatResolutions) && beatResolutions.length >= beats
    ? beatResolutions.slice(0, beats)
    : Array(beats).fill(4);

  const stepsPerMeasure = resArray.reduce((sum, r) => sum + (r > 0 ? r : 4), 0);
  const numMeasures = Math.max(1, Math.round((totalSteps || stepsPerMeasure) / stepsPerMeasure));

  const measures: VocalMeasureGroups[] = [];
  let accumulatedStep = 0;

  for (let m = 0; m < numMeasures; m++) {
    const groups: VocalBeatGroup[] = [];
    for (let b = 0; b < beats; b++) {
      const res = resArray[b] > 0 ? resArray[b] : 4;
      const stepIndices: number[] = [];
      for (let s = 0; s < res; s++) {
        if (accumulatedStep < totalSteps) {
          stepIndices.push(accumulatedStep);
          accumulatedStep++;
        }
      }
      groups.push({
        beatIndex: b,
        steps: stepIndices,
        resolution: res,
      });
    }
    measures.push({
      measureIndex: m,
      groups,
    });
  }

  return measures;
}

/**
 * Construit une table de correspondance Tick -> Pas pour une mesure vocale.
 * Permet un calage déterministe au 1/3 de temps strict en triolets ou 1/4 en binaire, sans dérive.
 */
export function getVocalStepTickMap(
  beatResolutions: number[] | undefined | null,
  beatsPerMeasure: number,
  totalTicks: number,
  bpm: number
): Map<number, VocalStepTickMatch> {
  const map = new Map<number, VocalStepTickMatch>();
  const beats = Math.max(1, Math.round(beatsPerMeasure) || 4);
  const resArray = Array.isArray(beatResolutions) && beatResolutions.length >= beats
    ? beatResolutions.slice(0, beats)
    : Array(beats).fill(4);

  const ticksPerBeat = totalTicks / beats;
  const safeBpm = isNaN(bpm) || bpm <= 0 ? 100 : bpm;
  const beatDurationSec = 60 / safeBpm;

  let accumulatedStep = 0;

  for (let b = 0; b < beats; b++) {
    const res = resArray[b] > 0 ? resArray[b] : 4;
    const ticksPerStep = ticksPerBeat / res;
    const singleStepSec = beatDurationSec / res;

    for (let r = 0; r < res; r++) {
      const triggerTick = Math.round(b * ticksPerBeat + r * ticksPerStep);
      map.set(triggerTick, {
        step: accumulatedStep,
        beatIndex: b,
        stepInBeat: r,
        stepsInBeat: res,
        singleStepSec,
        triggerTick,
      });
      accumulatedStep++;
    }
  }

  return map;
}

/**
 * Recherche si le tick courant (0..totalTicks-1) correspond au déclenchement d'un pas vocal.
 * Retourne le pas local (0..stepsPerMeasure-1) et les paramètres temporels de ce pas, ou null si hors-pas.
 */
export function matchVocalStepAtTick(
  tick: number,
  beatResolutions: number[] | undefined | null,
  beatsPerMeasure: number,
  totalTicks: number,
  bpm: number
): { localCell: number; singleStepSec: number; stepsInBeat: number } | null {
  const beats = Math.max(1, Math.round(beatsPerMeasure) || 4);
  const resArray = Array.isArray(beatResolutions) && beatResolutions.length >= beats
    ? beatResolutions
    : null;

  // Chemin rapide : si pas de divisions spécifiques (binaire standard homogène), division directe
  if (!resArray) {
    const defaultSteps = beats * 4;
    const ticksPerStep = totalTicks / defaultSteps;
    if (tick % ticksPerStep === 0) {
      const localCell = Math.floor(tick / ticksPerStep);
      const safeBpm = isNaN(bpm) || bpm <= 0 ? 100 : bpm;
      const singleStepSec = (60 / safeBpm) / 4;
      return { localCell, singleStepSec, stepsInBeat: 4 };
    }
    return null;
  }

  // Résolutions dynamiques (Triolets, Sextolets, etc.)
  const ticksPerBeat = totalTicks / beats;
  const safeBpm = isNaN(bpm) || bpm <= 0 ? 100 : bpm;
  const beatDurationSec = 60 / safeBpm;

  let accumulatedStep = 0;
  for (let b = 0; b < beats; b++) {
    const res = resArray[b] > 0 ? resArray[b] : 4;
    const ticksPerStep = ticksPerBeat / res;

    // Vérifier si le tick se situe dans ce temps
    const beatStartTick = Math.round(b * ticksPerBeat);
    const beatEndTick = Math.round((b + 1) * ticksPerBeat);

    if (tick >= beatStartTick && tick < beatEndTick) {
      for (let r = 0; r < res; r++) {
        const stepTick = Math.round(beatStartTick + r * ticksPerStep);
        if (tick === stepTick) {
          const singleStepSec = beatDurationSec / res;
          return {
            localCell: accumulatedStep + r,
            singleStepSec,
            stepsInBeat: res,
          };
        }
      }
      return null;
    }
    accumulatedStep += res;
  }

  return null;
}

/**
 * Clampe un index de pas sélectionné dans les bornes valides [0, totalSteps - 1].
 */
export function clampStepIndex(stepIdx: number | null | undefined, totalSteps: number): number | null {
  if (stepIdx === null || stepIdx === undefined) return null;
  if (totalSteps <= 0) return 0;
  return Math.max(0, Math.min(stepIdx, totalSteps - 1));
}

/**
 * Redimensionne un tableau de pas en épissant / insérant des valeurs sur le temps ciblé.
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
      if (startIndex + i < copy.length) {
        replacement[i] = copy[startIndex + i];
      }
    }
  }
  copy.splice(startIndex, oldR, ...replacement);
  return copy;
}

/**
 * Modifie la résolution d'un temps spécifique sur un motif donné.
 */
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

  if (beatIndex >= currentRes.length) {
    return { updatedPattern: pattern, targetSteps: pattern.steps || 16 };
  }

  const oldRes = currentRes[beatIndex];
  if (oldRes === newResolution) {
    return { updatedPattern: pattern, targetSteps: pattern.steps || 16 };
  }

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
    // Anacrouse / Pre-roll alignement
    preRollActiveSteps: pattern.preRollActiveSteps
      ? spliceStepArray(pattern.preRollActiveSteps, 0, startIndex, oldRes, newResolution)
      : undefined,
    preRollLyrics: pattern.preRollLyrics
      ? spliceStepArray(pattern.preRollLyrics, '', startIndex, oldRes, newResolution)
      : undefined,
    preRollNotes: pattern.preRollNotes
      ? spliceStepArray(pattern.preRollNotes, '', startIndex, oldRes, newResolution)
      : undefined,
    preRollVolumes: pattern.preRollVolumes
      ? spliceStepArray(pattern.preRollVolumes, 80, startIndex, oldRes, newResolution)
      : undefined,
    preRollDecays: pattern.preRollDecays
      ? spliceStepArray(pattern.preRollDecays, 100, startIndex, oldRes, newResolution)
      : undefined,
  };

  return { updatedPattern, targetSteps };
}

/**
 * Modifie la résolution de TOUS les temps de la mesure d'un coup (ex. passage global en triolets 12 pas ou doubles-croches 16 pas).
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
    // Anacrouse / Pre-roll alignement
    preRollActiveSteps: pattern.preRollActiveSteps ? reindexArray(pattern.preRollActiveSteps, 0) as (string | number)[] : undefined,
    preRollLyrics: pattern.preRollLyrics ? reindexArray(pattern.preRollLyrics, '') : undefined,
    preRollNotes: pattern.preRollNotes ? reindexArray(pattern.preRollNotes, '') : undefined,
    preRollVolumes: pattern.preRollVolumes ? reindexArray(pattern.preRollVolumes, 80) : undefined,
    preRollDecays: pattern.preRollDecays ? reindexArray(pattern.preRollDecays, 100) : undefined,
  };

  return { updatedPattern, targetSteps };
}

