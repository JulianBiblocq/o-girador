/**
 * O Girador - Cascade de Résolution des Clés Vocales & Parcours Récursif des Pistes (< 120 lignes)
 * - Cascade stricte : `1. ${trackId}_${patternId}` -> `2. Number(patternId) / String(patternId)` -> `3. vocalClip.id (Number / String)`.
 * - Exclusion stricte du bus conteneur passif `isToadaBus` tout en parcourant récursivement pistes et sous-pistes.
 */

import { instrumentsConfig } from '../../data';
import { isToadaBus } from '../../stores/helpers/trackVisibilityHelpers';

export interface VocalLookupContext {
  trackId?: string | number;
  patternId?: number | string;
  vocalClipId?: number | string;
}

export interface EligibleVocalTarget {
  track: any;
  pattern: any;
  canonicalKey: string;
}

const VOCAL_ROLE_IDS = new Set(['toada', 'voice', 'puxador', 'coro']);

function pushNumberThenString(out: Array<number | string>, seen: Set<string>, raw: unknown): void {
  if (raw === undefined || raw === null) return;
  const str = String(raw).trim();
  if (!str) return;
  if (!str.includes('_')) {
    const num = Number(str);
    if (Number.isFinite(num)) {
      const numToken = `n:${num}`;
      if (!seen.has(numToken)) {
        seen.add(numToken);
        out.push(num);
      }
    }
  }
  const strToken = `s:${str}`;
  if (!seen.has(strToken)) {
    seen.add(strToken);
    out.push(str);
  }
}

export function buildVocalRecordingCandidateKeys(
  keyOrPatternId: number | string,
  ctx?: VocalLookupContext
): Array<number | string> {
  const out: Array<number | string> = [];
  const seen = new Set<string>();
  const pushExact = (k: number | string) => {
    const token = typeof k === 'number' ? `n:${k}` : `s:${k}`;
    if (!seen.has(token)) { seen.add(token); out.push(k); }
  };

  const explicitTrackId = ctx?.trackId;
  const rawPatId = ctx?.patternId !== undefined ? ctx.patternId : keyOrPatternId;

  if (explicitTrackId !== undefined && explicitTrackId !== null && String(explicitTrackId) !== '') {
    pushExact(`${explicitTrackId}_${rawPatId}`);
    pushNumberThenString(out, seen, rawPatId);
  } else {
    const keyStr = String(keyOrPatternId);
    const sepIdx = keyStr.indexOf('_');
    if (sepIdx > 0 && sepIdx < keyStr.length - 1) {
      pushExact(keyStr);
      pushNumberThenString(out, seen, keyStr.slice(sepIdx + 1));
    } else {
      pushNumberThenString(out, seen, keyOrPatternId);
    }
  }

  if (ctx?.vocalClipId !== undefined && ctx.vocalClipId !== null && String(ctx.vocalClipId).trim() !== '') {
    pushNumberThenString(out, seen, ctx.vocalClipId);
    if (explicitTrackId !== undefined && explicitTrackId !== null && String(explicitTrackId) !== '') {
      pushExact(`${explicitTrackId}_${ctx.vocalClipId}`);
    }
  }
  return out;
}

export function isPassiveToadaBusContainer(track: any): boolean {
  if (!track || typeof track !== 'object') return false;
  return Boolean(isToadaBus(track) || track.isBusFolder || track.isLinkFolder || track.isToadaBus);
}

export function isEligibleVocalPattern(pattern: any): boolean {
  if (!pattern || typeof pattern !== 'object') return false;
  return Boolean(
    pattern.vocalMode === 'micro' ||
    pattern.vocalMode === 'recorded' ||
    pattern.vocalMode === 'audio' ||
    pattern.vocalClip ||
    pattern.hasVocalAudio ||
    pattern.vocalAudioData ||
    pattern.vocalAudioUrl
  );
}

export function isEligibleVocalTrack(track: any): boolean {
  if (!track || typeof track !== 'object' || isPassiveToadaBusContainer(track)) return false;
  const inst = typeof track.instrumentIdx === 'number' ? instrumentsConfig[track.instrumentIdx] : undefined;
  const instType = String(inst?.type || track.instrumentType || track.type || '').toLowerCase();
  const instRole = String(inst?.id || track.instrumentId || track.role || '').toLowerCase();
  if (instType === 'voice' || VOCAL_ROLE_IDS.has(instRole)) return true;
  return Array.isArray(track.patterns) && track.patterns.some(isEligibleVocalPattern);
}

export function collectEligibleVocalTargets(rawTracks: any[]): EligibleVocalTarget[] {
  const targets: EligibleVocalTarget[] = [];
  const visitedTracks = new Set<any>();
  const visitedKeys = new Set<string>();

  const walk = (list: any[]) => {
    if (!Array.isArray(list)) return;
    for (const t of list) {
      if (!t || typeof t !== 'object' || visitedTracks.has(t)) continue;
      visitedTracks.add(t);
      if (!isPassiveToadaBusContainer(t) && isEligibleVocalTrack(t) && Array.isArray(t.patterns)) {
        for (const p of t.patterns) {
          if (!isEligibleVocalPattern(p) || p.id === undefined || p.id === null) continue;
          const canonicalKey = `${t.id}_${p.id}`;
          if (!visitedKeys.has(canonicalKey)) {
            visitedKeys.add(canonicalKey);
            targets.push({ track: t, pattern: p, canonicalKey });
          }
        }
      }
      if (Array.isArray(t.subTracks)) walk(t.subTracks);
      if (Array.isArray(t.tracks)) walk(t.tracks);
    }
  };

  walk(rawTracks);
  return targets;
}

export function computeVocalTargetsSignature(targets: EligibleVocalTarget[]): string {
  return targets
    .map(({ track, pattern, canonicalKey }) =>
      `${canonicalKey}:${pattern.vocalClip?.id ?? ''}:${pattern.hasVocalAudio ? 1 : 0}:${pattern.vocalAudioUrl ? 1 : 0}:${pattern.vocalAudioData ? 1 : 0}:${track.instrumentIdx ?? ''}`
    )
    .join('|');
}
