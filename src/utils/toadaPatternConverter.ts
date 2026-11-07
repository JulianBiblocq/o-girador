/**
 * toadaPatternConverter.ts
 * Conversion d'un motif Toada exporté en Pattern Sequenciador canonique (< 138 lignes).
 * Supporte `ignoreMelodyPitch` (mode Rythme seul : coupe les notes mais préserve les arcs de tenue `───`)
 * et empêche le débordement de fin (`hasTailBeat: true`, +1T) de gonfler `measuresCount`.
 */
import type { Pattern, VocalClipMeta } from '../types/store.types';

export function isStepActive(s: any): boolean {
  if (!s) return false;
  const noteRaw = typeof s.note === 'string' ? s.note.trim() : '';
  const rawSylVal = s.syllable ?? s.lyricSyllable;
  const sylRaw = typeof rawSylVal === 'string' ? rawSylVal.trim() : '';
  const isExplicitTie = Boolean(s.isTie) || noteRaw === '───' || sylRaw === '───';
  if (s.active === false && !isExplicitTie) return false;
  if (s.midiNumber === null && !isExplicitTie && s.active !== true) return false;
  const hasValidNote = Boolean(noteRaw && noteRaw !== '0' && noteRaw !== '𝄽');
  const hasValidSyl = Boolean(sylRaw && sylRaw !== '' && sylRaw !== '_' && sylRaw !== '𝄽');
  return Boolean(s.active || isExplicitTie || hasValidNote || hasValidSyl);
}

interface ConvertedSteps {
  activeSteps: any[]; notes: string[]; lyrics: string[]; volumes: number[]; decays: number[];
}

function processSteps(rawSteps: any[], count: number, roleSymbol: string, ignoreMelodyPitch = false): ConvertedSteps {
  const activeSteps: any[] = Array(count).fill(0), notes: string[] = Array(count).fill('');
  const lyrics: string[] = Array(count).fill(''), volumes: number[] = Array(count).fill(80), decays: number[] = Array(count).fill(10);
  let lastActivePitch = '', attackHeadIdx = -1, spanSteps = 0;

  const finalizeHold = () => {
    if (attackHeadIdx >= 0) {
      decays[attackHeadIdx] = Math.min(100, Math.max(10, spanSteps * 10));
      attackHeadIdx = -1; spanSteps = 0;
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
    const rawSylVal = s.syllable ?? s.lyricSyllable;
    const sylRaw = typeof rawSylVal === 'string' ? rawSylVal.trim() : '';
    const isHold =
      Boolean(s.isTie) ||
      noteRaw === '───' ||
      noteRaw === '-' ||
      sylRaw === '───' ||
      (sylRaw === '-' && (!noteRaw || noteRaw === lastActivePitch));

    if (isHold) {
      if (!lastActivePitch && (!noteRaw || noteRaw === '───' || noteRaw === '-' || noteRaw === '0')) {
        finalizeHold();
        continue;
      }
      const holdPitch = lastActivePitch || noteRaw || 'C4';
      lastActivePitch = holdPitch;
      activeSteps[idx] = roleSymbol;
      notes[idx] = ignoreMelodyPitch ? '───' : holdPitch;
      lyrics[idx] = '───';
      if (s.velocity !== undefined) volumes[idx] = s.velocity;
      if (attackHeadIdx >= 0) spanSteps++;
      else { attackHeadIdx = idx; spanSteps = 1; }
    } else {
      finalizeHold();
      const currentPitch = noteRaw && noteRaw !== '0' && noteRaw !== '───' ? noteRaw : (lastActivePitch || 'C4');
      lastActivePitch = currentPitch;
      attackHeadIdx = idx;
      spanSteps = 1;
      activeSteps[idx] = roleSymbol;
      notes[idx] = ignoreMelodyPitch ? '' : currentPitch;
      lyrics[idx] = (sylRaw && sylRaw !== '_') ? sylRaw : '-';
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
  explicitHasAnacrusis?: boolean,
  explicitIgnoreMelodyPitch?: boolean
): Pattern {
  const roleSymbol = role === 'coro' ? 'C' : 'P';
  const ignoreMelodyPitch = explicitIgnoreMelodyPitch !== undefined ? explicitIgnoreMelodyPitch : Boolean(p.ignoreMelodyPitch);
  const stepsCount = Math.max(1, Number(p.measuresCount) || 1) * 16;
  const hasAnacrusis = explicitHasAnacrusis !== undefined ? explicitHasAnacrusis : (p.hasAnacrusis !== undefined ? Boolean(p.hasAnacrusis) : true);
  let anacrusisRaw: any[] = hasAnacrusis ? (p.anacrusisSteps || []) : [];
  let mainRaw: any[] = p.mainSteps || [];
  if (hasAnacrusis && mainRaw.length >= stepsCount + 16 && anacrusisRaw.length === 0) {
    anacrusisRaw = mainRaw.slice(0, 16);
    mainRaw = mainRaw.slice(16, 16 + stepsCount);
  } else if (mainRaw.length > stepsCount) {
    // Le débordement +1T (chute sur le Temps 1 suivant) ne gonfle jamais le nombre de mesures du pattern
    mainRaw = mainRaw.slice(0, stepsCount);
  }

  const main = processSteps(mainRaw, stepsCount, roleSymbol, ignoreMelodyPitch);
  const pre = processSteps(anacrusisRaw, 16, roleSymbol, ignoreMelodyPitch);

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
    ignoreMelodyPitch,
    hasTailBeat: Boolean(p.hasTailBeat || p.exitBeat === 1),
    packTranspositionSemitones: Number(p.transpositionSemitones ?? 0),
    preRollActiveSteps: pre.activeSteps,
    preRollNotes: pre.notes,
    preRollLyrics: pre.lyrics,
    preRollVolumes: pre.volumes,
    preRollDecays: pre.decays,
    hasAnacrusis,
  };
}
