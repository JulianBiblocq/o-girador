/**
 * O Girador - Empreinte déterministe & Validation d'intégrité du cache PCM IndexedDB (< 125 lignes)
 * - Calcule une signature FNV-1a 32 bits déterministe par chemin canonique `.ogg` (banque active + révision `.ogg/.m4a`).
 * - Vérifie la cohérence stricte `version` / `sampleRate` / `sampleHash` / `numberOfChannels` / `length` / `pcmHash`.
 */

import { instrumentAudioConfigs } from '../data/audioConfig';
import { GENERATED_SAMPLE_REVISIONS } from '../data/generatedSampleRevisions';
import { STUDIO_BANK_ENABLED } from '../universes/maracatu/instruments/studioBankRegistry';
import { normalizeCanonicalSampleKey } from './engine/sampleFetchUtils';

let cachedBankDescriptorMap: Map<string, string> | null = null;
const sampleRevisionOverrides = new Map<string, string>();

export function fnv1a32Hex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function getBankDescriptorMap(): Map<string, string> {
  if (cachedBankDescriptorMap) return cachedBankDescriptorMap;
  const map = new Map<string, string>();
  const studioFlagsSig = Object.entries(STUDIO_BANK_ENABLED)
    .map(([k, v]) => `${k}:${v ? 1 : 0}`)
    .sort()
    .join(',');
  for (const cfg of instrumentAudioConfigs) {
    const cfgPrefix = `${cfg.id}|s:${cfg.calibratedStudioBank ? 1 : 0}|m:${cfg.macroPitch ?? 1}|${studioFlagsSig}`;
    for (const stroke of cfg.strokes) {
      const strokeDesc = `${cfgPrefix}|${stroke.symbol}|g:${stroke.baseGain ?? 1}|b:${stroke.isBarulho ? 1 : 0}`;
      for (const file of stroke.files) {
        const canonical = normalizeCanonicalSampleKey(file);
        const prev = map.get(canonical);
        map.set(canonical, prev ? `${prev};${strokeDesc}` : strokeDesc);
      }
    }
  }
  cachedBankDescriptorMap = map;
  return map;
}

export function setSampleRevisionOverride(rawPath: string, revision: string | null): void {
  const key = normalizeCanonicalSampleKey(rawPath);
  if (revision === null) sampleRevisionOverrides.delete(key);
  else sampleRevisionOverrides.set(key, revision);
}

export function registerSampleManifestRevisions(manifest: Record<string, string>): void {
  for (const [rawPath, rev] of Object.entries(manifest)) {
    if (typeof rev === 'string' && rev.length > 0) {
      sampleRevisionOverrides.set(normalizeCanonicalSampleKey(rawPath), rev);
    }
  }
}

export function clearSampleRevisionOverrides(): void {
  sampleRevisionOverrides.clear();
}

export function getSampleRevisionTag(rawPath: string): string | null {
  const canonicalPath = normalizeCanonicalSampleKey(rawPath);
  return sampleRevisionOverrides.get(canonicalPath) ?? GENERATED_SAMPLE_REVISIONS[canonicalPath] ?? null;
}

export function computeExpectedSampleHash(rawPath: string, cacheVersion: number): string {
  const canonicalPath = normalizeCanonicalSampleKey(rawPath);
  const bankDesc = getBankDescriptorMap().get(canonicalPath) ?? 'custom';
  const revOverride = getSampleRevisionTag(canonicalPath) ?? 'r0';
  return fnv1a32Hex(`v${cacheVersion}|${canonicalPath}|${bankDesc}|${revOverride}`);
}

export function computePcmContentHash(channels: Float32Array[], sampleRate: number, length: number): string {
  let hash = 0x811c9dc5;
  const mixInt = (v: number) => {
    hash ^= v | 0;
    hash = Math.imul(hash, 0x01000193);
  };
  mixInt(channels.length);
  mixInt(sampleRate);
  mixInt(length);
  for (let c = 0; c < channels.length; c++) {
    const ch = channels[c];
    if (!ch || ch.length === 0) continue;
    const step = Math.max(1, Math.floor(ch.length / 16));
    for (let i = 0, count = 0; i < ch.length && count < 16; i += step, count++) {
      mixInt(Math.round((ch[i] || 0) * 32767));
    }
    mixInt(Math.round((ch[ch.length - 1] || 0) * 32767));
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function isCachedPcmSampleValid(
  entry: any,
  canonicalPath: string,
  expectedSampleRate: number,
  expectedVersion: number
): boolean {
  if (!entry || typeof entry !== 'object') return false;
  if (entry.version !== expectedVersion) return false;
  if (typeof entry.id !== 'string' || !entry.id.startsWith(`v${expectedVersion}_`)) return false;
  if (normalizeCanonicalSampleKey(String(entry.path || '')) !== canonicalPath) return false;
  if (entry.sampleRate !== expectedSampleRate || !(expectedSampleRate > 0)) return false;
  if (entry.sampleHash !== computeExpectedSampleHash(canonicalPath, expectedVersion)) return false;
  if (!Number.isInteger(entry.numberOfChannels) || entry.numberOfChannels < 1) return false;
  if (!Number.isInteger(entry.length) || entry.length <= 0) return false;
  if (!Array.isArray(entry.channels) || entry.channels.length !== entry.numberOfChannels) return false;
  for (let c = 0; c < entry.numberOfChannels; c++) {
    const ch = entry.channels[c];
    if (!ch || typeof ch.length !== 'number' || ch.length !== entry.length) return false;
  }
  if (entry.pcmHash && entry.pcmHash !== computePcmContentHash(entry.channels, entry.sampleRate, entry.length)) {
    return false;
  }
  return true;
}
