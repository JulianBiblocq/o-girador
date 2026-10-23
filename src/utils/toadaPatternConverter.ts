/**
 * toadaPatternConverter.ts
 * Conversion d'un motif Toada exporté en Pattern Sequenciador canonique (< 115 lignes).
 */
import type { Pattern, VocalClipMeta } from '../types/store.types';

export function isStepActive(s: any): boolean {
  if (!s) return false;
  const hasValidNote = Boolean(s.note && s.note !== '0' && String(s.note).trim() !== '');
  const hasValidSyl = Boolean(s.syllable && String(s.syllable).trim() !== '');
  return Boolean(s.active || hasValidNote || hasValidSyl);
}

interface ConvertedSteps {
  activeSteps: any[];
  notes: string[];
  lyrics: string[];
  volumes: number[];
  decays: number[];
}

function processSteps(rawSteps: any[], count: number, roleSymbol: string): ConvertedSteps {
  const activeSteps: any[] = Array(count).fill(0);
  const notes: string[] = Array(count).fill('');
  const lyrics: string[] = Array(count).fill('');
  const volumes: number[] = Array(count).fill(80);
  const decays: number[] = Array(count).fill(10);

  let lastActivePitch = '';
  let attackHeadIdx = -1;
  let spanSteps = 0;

  const finalizeHold = () => {
    if (attackHeadIdx >= 0) {
      decays[attackHeadIdx] = Math.min(100, Math.max(10, spanSteps * 10));
      attackHeadIdx = -1;
      spanSteps = 0;
    }
  };

  for (let idx = 0; idx < count; idx++) {
    const s = rawSteps[idx];
    if (!s || !isStepActive(s)) {
      finalizeHold();
      lastActivePitch = '';
      continue;
    }

    const noteRaw = typeof s.note === 'string' ? s.note.trim() : '';
    const sylRaw = typeof s.syllable === 'string' ? s.syllable.trim() : '';
    const isHold =
      noteRaw === '───' ||
      noteRaw === '-' ||
      sylRaw === '───' ||
      (sylRaw === '-' && (!noteRaw || noteRaw === lastActivePitch));

    if (isHold) {
      activeSteps[idx] = roleSymbol;
      notes[idx] = lastActivePitch || 'C4';
      lyrics[idx] = '-';
      if (s.velocity !== undefined) volumes[idx] = s.velocity;
      if (attackHeadIdx >= 0) {
        spanSteps++;
      } else {
        attackHeadIdx = idx;
        spanSteps = 1;
      }
    } else {
      finalizeHold();
      const currentPitch = noteRaw && noteRaw !== '0' ? noteRaw : (lastActivePitch || 'C4');
      lastActivePitch = currentPitch;
      attackHeadIdx = idx;
      spanSteps = 1;
      activeSteps[idx] = roleSymbol;
      notes[idx] = currentPitch;
      lyrics[idx] = sylRaw || '-';
      if (s.velocity !== undefined) volumes[idx] = s.velocity;
    }
  }

  finalizeHold();
  return { activeSteps, notes, lyrics, volumes, decays };
}

export function convertToadaPattern(
  p: any,
  role: 'puxador' | 'coro',
  numId: number,
  effectiveBpm: number,
  totalMeasures: number,
  clipMeta?: VocalClipMeta,
  hasAudio: boolean = false,
  explicitHasAnacrusis?: boolean
): Pattern {
  const roleSymbol = role === 'coro' ? 'C' : 'P';
  const stepsCount = (p.measuresCount || 1) * 16;
  const hasAnacrusis = explicitHasAnacrusis !== undefined ? explicitHasAnacrusis : (p.hasAnacrusis !== undefined ? Boolean(p.hasAnacrusis) : true);
  let anacrusisRaw: any[] = hasAnacrusis ? (p.anacrusisSteps || []) : [];
  let mainRaw: any[] = p.mainSteps || [];
  if (hasAnacrusis && mainRaw.length >= stepsCount + 16 && anacrusisRaw.length === 0) {
    anacrusisRaw = mainRaw.slice(0, 16);
    mainRaw = mainRaw.slice(16, 16 + stepsCount);
  }

  const main = processSteps(mainRaw, stepsCount, roleSymbol);
  const pre = processSteps(anacrusisRaw, 16, roleSymbol);

  return {
    id: numId,
    name: p.name || (role === 'coro' ? 'Coro' : 'Puxador'),
    steps: stepsCount,
    activeSteps: main.activeSteps,
    notes: main.notes,
    lyrics: main.lyrics,
    volumes: main.volumes,
    decays: main.decays,
    measureAssignments: Array(totalMeasures).fill(false),
    vocalMode: hasAudio ? 'micro' : 'synth',
    vocalClip: clipMeta,
    vocalBpmSync: true,
    vocalBaseBpm: effectiveBpm,
    hasVocalAudio: hasAudio,
    preRollActiveSteps: pre.activeSteps,
    preRollNotes: pre.notes,
    preRollLyrics: pre.lyrics,
    preRollVolumes: pre.volumes,
    preRollDecays: pre.decays,
    hasAnacrusis,
  };
}

