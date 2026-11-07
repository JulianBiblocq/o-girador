/**
 * vocalPlaybackHelper.ts
 * Résolution du buffer vocal Studio pour Sequenciador :
 * - Un seul fichier `.wav` HD par pattern (exporté par Cantador en `troupeKey`).
 * - Moteur Hybride TD-PSOLA + Formants LPC + Consonnes 1:1 (`vocalPatternBufferCache.ts`).
 * - Lecture native via `AudioBufferSourceNode` / `Tone.Player` à `playbackRate = 1.0` et `detuneCents = 0` (< 95 lignes).
 */
import type { Pattern, Track } from '../../types';
import {
  type VocalPatternDspCacheEntry,
  getCachedVocalPatternDspEntry,
  getOrComputeVocalPatternDspSync,
  requestVocalPatternDspAsync,
} from '../../audio/vocalDsp/vocalPatternBufferCache';

export interface ResolvedVocalPlayback {
  buffer: AudioBuffer;
  playbackRate: number;
  detuneCents: number;
  isVariant: boolean;
  variantKey?: string;
  alpha: number;
  scaledT1OffsetSec: number;
  scaledTrimStartSec: number;
  scaledTrimEndSec: number;
  dspEntry: VocalPatternDspCacheEntry;
}

export function resolveVocalPlaybackBuffer(
  ptnRef: Pattern,
  voiceTrack: Track,
  effectiveBpm: number,
  clipSampleBpm: number,
  baseAudioBuffer: AudioBuffer,
  _vocalBuffers: Record<string | number, AudioBuffer>,
  vocalTransposeSteps: number = 0
): ResolvedVocalPlayback {
  const clip = ptnRef.vocalClip;
  const recordedBpm = Number(clip?.recordedBpm || clipSampleBpm || effectiveBpm || 88);
  const liveBpm = Number(effectiveBpm || recordedBpm || 88);
  const packTranspositionSt = Number(ptnRef.packTranspositionSemitones ?? clip?.packTranspositionSemitones ?? 0);
  const trackTuningSt = (voiceTrack.tuning ?? 0) * 12;
  const targetTranspositionSt = Number(vocalTransposeSteps || 0) + trackTuningSt;

  const timingMeta = {
    t1OffsetSec: clip?.t1OffsetSec,
    trimStartSec: clip?.trimStartSec,
    trimEndSec: clip?.trimEndSec,
  };

  let dspEntry = getCachedVocalPatternDspEntry(ptnRef.id, liveBpm, targetTranspositionSt);
  if (!dspEntry) {
    dspEntry = getOrComputeVocalPatternDspSync(
      ptnRef.id,
      baseAudioBuffer,
      recordedBpm,
      liveBpm,
      targetTranspositionSt,
      packTranspositionSt,
      timingMeta
    );
    void requestVocalPatternDspAsync(
      ptnRef.id,
      baseAudioBuffer,
      recordedBpm,
      liveBpm,
      targetTranspositionSt,
      packTranspositionSt,
      timingMeta
    );
  }

  return {
    buffer: dspEntry.audioBuffer,
    playbackRate: 1.0,
    detuneCents: 0,
    isVariant: dspEntry.alpha !== 1.0 || dspEntry.deltaSemitones !== 0,
    variantKey: dspEntry.cacheKey,
    alpha: dspEntry.alpha,
    scaledT1OffsetSec: dspEntry.scaledT1OffsetSec,
    scaledTrimStartSec: dspEntry.scaledTrimStartSec,
    scaledTrimEndSec: dspEntry.scaledTrimEndSec,
    dspEntry,
  };
}
