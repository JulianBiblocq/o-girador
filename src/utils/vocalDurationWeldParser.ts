/**
 * vocalDurationWeldParser.ts
 * Priorité lexicale stricte du slash `/` et parseur de durées soudées (Grammaire Vocale v2).
 * Module pur sans dépendance React ni Web Audio (< 145 lignes).
 */

export interface WeldedDurationEvent {
  raw: string;
  isWelded: boolean;
  parts: number[];
  totalSubdivisions: number;
  index: number;
}

export interface VocalSlashParseResult {
  normalizedLine: string;
  lineWithoutLinkPrefix: string;
  signatures: string[];
  invalidBareSignatures: string[];
  hasInvalidBareSignature: boolean;
  slashChords: string[];
  isLinkedMeasureLine: boolean;
  weldedDurations: WeldedDurationEvent[];
}

const EXPLICIT_SIG_RE = /\[sig:(\d{1,2}\/\d{1,2})\]/gi;
const BARE_SIG_RE = /\[(\d{1,2}\/\d{1,2})\]/g;
const SLASH_CHORD_RE = /\[([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|b5|#5|b9|#9|#11|b13)*\/[A-G][#b]?)\]/g;
const ANY_BRACKET_RE = /\[[^\]]*\]/g;
const LEADING_DIRECTIVES_RE = /^(?:\s*\[(?:sig:\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2}|sim|nosim)\]\s*)*/i;
const LINKED_PREFIX_RE = /^(\s*\*{0,3}\s*)\/(\s*\*{0,3})/;

const maskSpan = (len: number): string => '\u0000'.repeat(len);

export function parseWeldedDurationTokens(durationInput: string, weldedOnly = false): WeldedDurationEvent[] {
  if (!durationInput || typeof durationInput !== 'string') return [];
  const events: WeldedDurationEvent[] = [];
  const re = weldedOnly
    ? /(?<![\p{L}\w/.])(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)+)(?![\p{L}\w/.])/gu
    : /(?<![\p{L}\w/.])(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)*)(?![\p{L}\w/.])/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(durationInput)) !== null) {
    const raw = m[1];
    const parts = raw.split('/').map((n) => Number(n));
    if (parts.some((n) => !Number.isFinite(n) || n <= 0)) continue;
    events.push({
      raw,
      isWelded: parts.length > 1,
      parts,
      totalSubdivisions: parts.reduce((acc, n) => acc + n, 0),
      index: m.index,
    });
  }
  return events;
}

export function parseVocalSlashTokens(
  rawLine: string,
  options: { grammarVersion?: number } = {}
): VocalSlashParseResult {
  const grammarVersion = options.grammarVersion ?? 2;
  const signatures: string[] = [];
  const invalidBareSignatures: string[] = [];
  const slashChords: string[] = [];
  if (!rawLine || typeof rawLine !== 'string') {
    return {
      normalizedLine: '',
      lineWithoutLinkPrefix: '',
      signatures,
      invalidBareSignatures,
      hasInvalidBareSignature: false,
      slashChords,
      isLinkedMeasureLine: false,
      weldedDurations: [],
    };
  }

  let normalizedLine = rawLine;
  let masked = rawLine.replace(EXPLICIT_SIG_RE, (full, sig: string) => {
    signatures.push(sig);
    return maskSpan(full.length);
  });

  if (grammarVersion < 2) {
    normalizedLine = normalizedLine.replace(BARE_SIG_RE, '[sig:$1]');
    masked = masked.replace(BARE_SIG_RE, (full, sig: string) => {
      signatures.push(sig);
      return maskSpan(full.length);
    });
  } else {
    masked = masked.replace(BARE_SIG_RE, (full) => {
      invalidBareSignatures.push(full);
      return maskSpan(full.length);
    });
  }

  masked = masked.replace(SLASH_CHORD_RE, (full, chord: string) => {
    slashChords.push(chord);
    return maskSpan(full.length);
  });

  const dirMatch = normalizedLine.match(LEADING_DIRECTIVES_RE);
  const dirLen = dirMatch ? dirMatch[0].length : 0;
  const afterDir = normalizedLine.slice(dirLen);
  const linkMatch = afterDir.match(LINKED_PREFIX_RE);
  const isLinkedMeasureLine = Boolean(linkMatch);
  const lineWithoutLinkPrefix = linkMatch
    ? `${normalizedLine.slice(0, dirLen)}${afterDir.replace(LINKED_PREFIX_RE, '$1$2')}`
    : normalizedLine;

  if (linkMatch) {
    const slashOffset = dirLen + linkMatch[1].length;
    masked = `${masked.slice(0, slashOffset)}\u0000${masked.slice(slashOffset + 1)}`;
  }

  masked = masked.replace(ANY_BRACKET_RE, (full) => maskSpan(full.length));
  const weldedDurations = parseWeldedDurationTokens(masked, true);

  return {
    normalizedLine,
    lineWithoutLinkPrefix,
    signatures,
    invalidBareSignatures,
    hasInvalidBareSignature: invalidBareSignatures.length > 0,
    slashChords,
    isLinkedMeasureLine,
    weldedDurations,
  };
}
