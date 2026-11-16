/**
 * vocalGrammarV2.ts — Noyau pur de la Grammaire Vocale Unifiée v2 (`grammarVersion: 2`) :
 * migration idempotente à la lecture `v1 -> v2`, élisions et pas MIDI/voix (< 145 lignes).
 */
import { parseVocalSlashTokens, parseWeldedDurationTokens } from './vocalDurationWeldParser';

export { parseVocalSlashTokens, parseWeldedDurationTokens };
export type { WeldedDurationEvent, VocalSlashParseResult } from './vocalDurationWeldParser';

export const VOCAL_GRAMMAR_VERSION = 2;
const APOSTROPHE_RE = /[\u2019\u2018\u02BC\u2032\u203F]/g;
const BEAT_TAG_RE = /\[(?:M(\d+)[•.:·])?(\d+(?:\.\d+)?|\+)\]/gi;

export const normalizeElisionApostrophes = (text = ''): string => (typeof text === 'string' ? text.replace(APOSTROPHE_RE, "'") : '');
export const isExplicitRestToken = (tok = ''): boolean => /^(?:0|𝄽|\[(?:silence|pause)\])$/i.test(String(tok || '').trim());
export const isProlongationToken = (tok = ''): boolean => /^(?:_|───)$/.test(String(tok || '').trim());
export const isKaraokeHiddenToken = (tok = ''): boolean => {
  const t = String(tok || '').trim();
  return !t || t === '-' || t === '_' || t === '───' || t === '0' || t === '𝄽';
};

function isGluedToLetter(line: string, pos: number, dir: -1 | 1): boolean {
  for (let i = pos + dir; i >= 0 && i < line.length; i += dir) {
    const ch = line[i];
    if (ch === '*' || ch === '_') continue;
    if (dir === -1 && (ch === ']' || ch === '>')) { const o = ch === ']' ? '[' : '<'; while (i >= 0 && line[i] !== o) i--; continue; }
    if (dir === 1 && (ch === '[' || ch === '<')) { const c = ch === '[' ? ']' : '>'; while (i < line.length && line[i] !== c) i++; continue; }
    return /\p{L}/u.test(ch);
  }
  return false;
}

function normalizeSingleV1Line(rawLine: string, mainSteps?: Array<{ active?: boolean }>, stepsPerBeat = 4): string {
  const slashInfo = parseVocalSlashTokens(normalizeElisionApostrophes(rawLine), { grammarVersion: 1 });
  const line = slashInfo.normalizedLine;
  if (!line.trim() || /^\s*\[(?:PAUSE|SILENCE)\b/i.test(line)) return line;
  const mask = line.replace(/<[^>]*>|\[[^\]]*\]/g, (m) => '\u0000'.repeat(m.length));
  if (!mask.includes('_')) return line;

  let firstLetter = -1, lastLetter = -1;
  for (let i = 0; i < mask.length; i++) if (/\p{L}/u.test(mask[i])) { if (firstLetter < 0) firstLetter = i; lastLetter = i; }
  const anchors: Array<{ idx: number; end: number; mIdx: number; beat: number }> = [];
  let m: RegExpExecArray | null, mIdx = 0, prevBeat: number | null = null, prevMTag: string | null = null;
  BEAT_TAG_RE.lastIndex = 0;
  while ((m = BEAT_TAG_RE.exec(line)) !== null) {
    const mTag = m[1] || null, beat: number = m[2] === '+' ? (prevBeat || 4) : parseFloat(m[2]);
    if (mTag !== null) { if (prevMTag !== null && mTag !== prevMTag) mIdx++; prevMTag = mTag; }
    else if (m[2] !== '+' && prevBeat !== null && beat <= prevBeat) mIdx++;
    if (m[2] !== '+') prevBeat = beat;
    anchors.push({ idx: m.index, end: m.index + m[0].length, mIdx, beat });
  }
  const measureHasLetters = new Map<number, boolean>();
  anchors.forEach((a, k) => {
    const seg = mask.slice(a.end, k + 1 < anchors.length ? anchors[k + 1].idx : line.length);
    if (/\p{L}/u.test(seg) || (k === 0 && /\p{L}/u.test(mask.slice(0, a.idx)))) measureHasLetters.set(a.mIdx, true);
  });

  const chars = line.split('');
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] !== '_') continue;
    const gluedL = isGluedToLetter(line, i, -1), gluedR = isGluedToLetter(line, i, 1);
    if (gluedL && gluedR) continue;
    const gov = [...anchors].reverse().find((a) => a.idx < i);
    const stepIdx = gov ? gov.mIdx * (stepsPerBeat * 4) + Math.max(0, Math.round((gov.beat - 1) * stepsPerBeat)) : -1;
    const packActive = mainSteps && stepIdx >= 0 && stepIdx < mainSteps.length ? mainSteps[stepIdx]?.active : undefined;
    if (packActive === false) { chars[i] = '0'; continue; }
    if (packActive === true && firstLetter >= 0 && i >= firstLetter) continue;
    if (firstLetter < 0 || (i < firstLetter && !(slashInfo.isLinkedMeasureLine && gluedR))) { chars[i] = '0'; continue; }
    if ((gov && !measureHasLetters.get(gov.mIdx) && !gluedL) || (i > lastLetter && !gluedL)) chars[i] = '0';
  }
  return chars.join('');
}

export function normalizeToadaTextV1ToV2(
  text: string,
  options: { grammarVersion?: number; mainSteps?: Array<{ active?: boolean }>; stepsPerBeat?: number } = {}
): string {
  if (!text || typeof text !== 'string') return '';
  if ((options.grammarVersion ?? 1) >= VOCAL_GRAMMAR_VERSION) return normalizeElisionApostrophes(text);
  return text.split(/\r?\n/).map((l) => normalizeSingleV1Line(l, options.mainSteps, options.stepsPerBeat ?? 4)).join('\n');
}

export function normalizeVocalStepsV1ToV2<T extends {
  active: boolean; note: string; midiNumber: number | null; syllable: string;
  isTie?: boolean; isMelisma?: boolean; syllableAttack?: boolean;
}>(steps: T[] = [], grammarVersion = 1): T[] {
  let lastPitch: string | null = null;
  return steps.map((s) => {
    const syl = normalizeElisionApostrophes(s.syllable || ''), trimmed = syl.trim();
    if (isExplicitRestToken(trimmed) || !s.active) {
      lastPitch = null;
      return { ...s, active: false, note: '', midiNumber: null, syllable: '', isTie: false, isMelisma: false, syllableAttack: false };
    }
    if ((grammarVersion < VOCAL_GRAMMAR_VERSION && (trimmed === '-' || trimmed === '~')) || trimmed === '_') {
      const pitchChanged = Boolean(lastPitch && s.note && s.note !== '───' && s.note !== lastPitch), sp = syl.endsWith(' ') ? ' ' : '';
      if (pitchChanged) { lastPitch = s.note; return { ...s, syllable: `_${sp}`, isTie: false, isMelisma: true, syllableAttack: false }; }
      return { ...s, note: '───', syllable: sp ? '─── ' : '', isTie: true, isMelisma: false, syllableAttack: false };
    }
    if (s.note && s.note !== '───') lastPitch = s.note;
    const isTie = Boolean(s.isTie || s.note === '───' || trimmed === '───');
    return { ...s, syllable: trimmed === '───' ? '' : syl, isTie, isMelisma: Boolean(s.isMelisma), syllableAttack: isTie || s.isMelisma ? false : (s.syllableAttack ?? Boolean(trimmed)) };
  });
}

export function normalizeSequencerVoiceArraysV1ToV2(
  lyrics: string[] = [], notes: string[] = [], steps: Array<number | string> = [], grammarVersion = 1
): { lyrics: string[]; notes: string[]; steps: Array<number | string> } {
  const outL = [...lyrics], outN = [...notes], outS = [...steps];
  let lastPitch = '', prevActive = false;
  for (let i = 0; i < outS.length; i++) {
    outL[i] = normalizeElisionApostrophes(outL[i] || '');
    const trimmed = outL[i].trim(), curN = (outN[i] || '').trim();
    if (isExplicitRestToken(trimmed) || !outS[i]) { outS[i] = 0; outN[i] = ''; outL[i] = ''; prevActive = false; lastPitch = ''; continue; }
    if (grammarVersion < VOCAL_GRAMMAR_VERSION && (trimmed === '-' || trimmed === '~')) {
      if (prevActive && lastPitch && curN && curN !== '───' && curN !== lastPitch) { outL[i] = outL[i].endsWith(' ') ? '_ ' : '_'; lastPitch = curN; }
      else { outN[i] = '───'; outL[i] = ''; }
    } else if (curN && curN !== '───') lastPitch = curN;
    prevActive = true;
  }
  return { lyrics: outL, notes: outN, steps: outS };
}

export function normalizeToadaGrammarV1ToV2<T = string>(
  input: T, options: { grammarVersion?: number; mainSteps?: Array<{ active?: boolean }>; stepsPerBeat?: number } = {}
): T {
  if (typeof input === 'string') return normalizeToadaTextV1ToV2(input, options) as unknown as T;
  if (!input || typeof input !== 'object') return input;
  const obj = input as Record<string, unknown>;
  const ver = Number(obj.grammarVersion ?? (obj.metadata as Record<string, unknown> | undefined)?.vocalGrammarVersion ?? options.grammarVersion ?? 1);
  const next: Record<string, unknown> = { ...obj, grammarVersion: VOCAL_GRAMMAR_VERSION };
  if (typeof obj.parolesOriginales === 'string') next.parolesOriginales = normalizeToadaTextV1ToV2(obj.parolesOriginales, { ...options, grammarVersion: ver });
  if (typeof obj.rawTxtCode === 'string') next.rawTxtCode = normalizeToadaTextV1ToV2(obj.rawTxtCode, { ...options, grammarVersion: ver });
  if (Array.isArray(obj.patterns)) {
    next.patterns = obj.patterns.map((p: Record<string, unknown>) => ({
      ...p,
      ...(Array.isArray(p.mainSteps) ? { mainSteps: normalizeVocalStepsV1ToV2(p.mainSteps as never[], ver) } : {}),
      ...(typeof p.rawLineCode === 'string' ? { rawLineCode: normalizeToadaTextV1ToV2(p.rawLineCode, { grammarVersion: ver, mainSteps: p.mainSteps as never[] }) } : {}),
    }));
  }
  return next as T;
}
