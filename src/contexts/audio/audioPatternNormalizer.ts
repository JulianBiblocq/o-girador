import { Pattern } from '../../types';

export const sanitizeSculptValue = (raw: any, defaultVal: number): number | [number, number] => {
  if (Array.isArray(raw)) {
    const v0 = Number(raw[0]);
    const v1 = Number(raw[1]);
    return [isNaN(v0) ? defaultVal : v0, isNaN(v1) ? defaultVal : v1];
  }
  const val = Number(raw);
  return isNaN(val) ? defaultVal : val;
};

export function normalizePatternData(p: Pattern, targetMeasures: number): void {
  if (!p.notes) p.notes = Array(p.steps).fill('');
  if (!p.lyrics) p.lyrics = Array(p.steps).fill('');
  if (!p.activeSteps) p.activeSteps = Array(p.steps).fill(0);

  // Isolation absolue anacrouse vs mesure principale (anti-référence partagée)
  if (p.preRollActiveSteps && p.preRollActiveSteps === p.activeSteps) {
    p.preRollActiveSteps = [...p.preRollActiveSteps];
  }
  if (p.preRollLyrics && p.preRollLyrics === p.lyrics) {
    p.preRollLyrics = [...p.preRollLyrics];
  }
  if (p.preRollNotes && p.preRollNotes === p.notes) {
    p.preRollNotes = [...p.preRollNotes];
  }
  if (p.preRollVolumes && p.preRollVolumes === p.volumes) {
    p.preRollVolumes = [...p.preRollVolumes];
  }
  if (p.preRollDecays && p.preRollDecays === p.decays) {
    p.preRollDecays = [...p.preRollDecays];
  }

  // Assainissement de measureAssignments
  if (!p.measureAssignments) {
    p.measureAssignments = Array(targetMeasures).fill(false);
  } else if (!Array.isArray(p.measureAssignments)) {
    const rawObj = p.measureAssignments as any;
    const normalized = Array(targetMeasures).fill(false);
    Object.entries(rawObj).forEach(([k, v]) => {
      const mIdx = parseInt(k, 10);
      if (!isNaN(mIdx) && mIdx >= 0 && mIdx < targetMeasures) normalized[mIdx] = Boolean(v);
    });
    p.measureAssignments = normalized;
  } else if (p.measureAssignments.length > 0 && typeof p.measureAssignments[0] === 'number') {
    const numList = p.measureAssignments as unknown as number[];
    const normalized = Array(targetMeasures).fill(false);
    const isOneBased = numList.some(n => n === targetMeasures);
    numList.forEach(n => {
      const idx = isOneBased ? n - 1 : n;
      if (idx >= 0 && idx < targetMeasures) normalized[idx] = true;
    });
    p.measureAssignments = normalized;
  } else if (p.measureAssignments.length < targetMeasures) {
    const currentLen = p.measureAssignments.length;
    for (let i = currentLen; i < targetMeasures; i++) {
      p.measureAssignments.push(p.measureAssignments[0] || false);
    }
  } else if (p.measureAssignments.length > targetMeasures) {
    p.measureAssignments = p.measureAssignments.slice(0, targetMeasures);
  }

  // Normalisation vocalMode
  if (
    p.vocalMode === 'audio' ||
    p.vocalMode === 'recorded' ||
    (p.vocalClip && p.vocalMode !== 'synth') ||
    Boolean(p.vocalAudioData) ||
    Boolean(p.vocalAudioUrl)
  ) {
    p.vocalMode = 'micro';
  }

  // Volumes, Decays, Microtimings
  if (!p.volumes || p.volumes.length !== p.steps) {
    const existing = p.volumes || [];
    p.volumes = Array(p.steps).fill(80);
    for (let i = 0; i < Math.min(existing.length, p.steps); i++) p.volumes[i] = sanitizeSculptValue(existing[i], 80);
  } else {
    for (let i = 0; i < p.steps; i++) p.volumes[i] = sanitizeSculptValue(p.volumes[i], 80);
  }

  if (!p.decays || p.decays.length !== p.steps) {
    const existing = p.decays || [];
    p.decays = Array(p.steps).fill(100);
    for (let i = 0; i < Math.min(existing.length, p.steps); i++) p.decays[i] = sanitizeSculptValue(existing[i], 100);
  } else {
    for (let i = 0; i < p.steps; i++) p.decays[i] = sanitizeSculptValue(p.decays[i], 100);
  }

  if (!p.microtimings || p.microtimings.length !== p.steps) {
    const existing = p.microtimings || [];
    p.microtimings = Array(p.steps).fill(0);
    for (let i = 0; i < Math.min(existing.length, p.steps); i++) p.microtimings[i] = sanitizeSculptValue(existing[i], 0);
  } else {
    for (let i = 0; i < p.steps; i++) p.microtimings[i] = sanitizeSculptValue(p.microtimings[i], 0);
  }
}
