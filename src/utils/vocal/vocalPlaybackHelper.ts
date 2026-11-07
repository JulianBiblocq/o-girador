/**
 * vocalPlaybackHelper.ts
 * Résolution du buffer vocal Studio pour Sequenciador :
 * - Un seul fichier `.wav` HD par pattern (clé canonique `${trackId}_${patternId}`).
 * - Court-circuit 0 calcul si `Math.round(currentBpm) === Math.round(recordedBpm)` et `pitchShiftSemitones === 0`.
 * - Sinon, récupération depuis le cache DSP (`${trackId}_${patternId}__dsp_${Math.round(currentBpm)}_${vocalTransposeSteps}`)
 *   pré-chauffé en Web Worker (`vocalDsp.worker.ts`) sans jamais bloquer le Main Thread UI.
 * - Lecture pure via `Tone.Player` (`AudioBufferSourceNode`) à `playbackRate = 1.0` et `detuneCents = 0` (< 115 lignes).
 */
import type { Pattern, Track } from '../../types';
import {
  type VocalPatternDspCacheEntry,
  buildVocalDspCacheKey,
  computeScaledPatternTiming,
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
  effectiveTrimStart: number;
  effectiveTrimEnd: number;
  effectiveT1Offset: number;
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
  vocalBuffers: Record<string | number, AudioBuffer>,
  vocalTransposeSteps: number = 0
): ResolvedVocalPlayback {
  const clip = ptnRef.vocalClip;
  const recordedBpm = Number(clip?.recordedBpm || clipSampleBpm || ptnRef.vocalBaseBpm || effectiveBpm || 88);
  const currentBpm = Number(effectiveBpm || recordedBpm || 88);
  const packTranspositionSt = Number(ptnRef.packTranspositionSemitones ?? clip?.packTranspositionSemitones ?? 0);
  const trackTuningSt = Math.round((voiceTrack.tuning ?? 0) * 12);
  const targetTranspositionSt = Math.round(Number(vocalTransposeSteps || 0) + trackTuningSt);
  const pitchShiftSemitones = targetTranspositionSt - Math.round(packTranspositionSt);

  const canonicalPatternKey = `${voiceTrack.id}_${ptnRef.id}`;
  const timingMeta = {
    t1OffsetSec: clip?.t1OffsetSec,
    trimStartSec: clip?.trimStartSec,
    trimEndSec: clip?.trimEndSec,
  };

  // Court-circuit 0 calcul : BPM identique et aucune transposition relative
  if (Math.round(currentBpm) === Math.round(recordedBpm) && pitchShiftSemitones === 0) {
    const rawStart = Math.max(0, Number(clip?.trimStartSec ?? 0));
    const rawEnd = Number(clip?.trimEndSec) > rawStart ? Number(clip?.trimEndSec) : baseAudioBuffer.duration;
    const rawT1 = Number(clip?.t1OffsetSec ?? 0);
    const identityKey = buildVocalDspCacheKey(canonicalPatternKey, currentBpm, targetTranspositionSt);
    const identityEntry: VocalPatternDspCacheEntry = {
      cacheKey: identityKey, audioBuffer: baseAudioBuffer, alpha: 1.0, recordedBpm, liveBpm: currentBpm,
      transpositionSemitones: targetTranspositionSt, deltaSemitones: 0,
      scaledT1OffsetSec: rawT1, scaledTrimStartSec: rawStart, scaledTrimEndSec: rawEnd,
    };
    return {
      buffer: baseAudioBuffer, playbackRate: 1.0, detuneCents: 0, isVariant: false, variantKey: identityKey,
      alpha: 1.0, effectiveTrimStart: rawStart, effectiveTrimEnd: rawEnd, effectiveT1Offset: rawT1,
      scaledT1OffsetSec: rawT1, scaledTrimStartSec: rawStart, scaledTrimEndSec: rawEnd, dspEntry: identityEntry,
    };
  }

  let dspEntry =
    getCachedVocalPatternDspEntry(canonicalPatternKey, currentBpm, targetTranspositionSt) ||
    getCachedVocalPatternDspEntry(ptnRef.id, currentBpm, targetTranspositionSt);

  if (!dspEntry) {
    if (typeof Worker !== 'undefined' && typeof window !== 'undefined') {
      // Environnement navigateur : interdiction de bloquer le Main Thread UI -> lancement Worker asynchrone
      void requestVocalPatternDspAsync(
        canonicalPatternKey, baseAudioBuffer, recordedBpm, currentBpm,
        targetTranspositionSt, packTranspositionSt, timingMeta,
        (readyEntry) => { if (vocalBuffers) vocalBuffers[readyEntry.cacheKey] = readyEntry.audioBuffer; }
      );
      const scaled = computeScaledPatternTiming({ ...timingMeta, recordedBpm }, currentBpm, 0, baseAudioBuffer.duration);
      const pendingKey = buildVocalDspCacheKey(canonicalPatternKey, currentBpm, targetTranspositionSt);
      const prewarmedBuf = vocalBuffers?.[pendingKey] || baseAudioBuffer;
      dspEntry = {
        cacheKey: pendingKey, audioBuffer: prewarmedBuf, alpha: scaled.alpha, recordedBpm, liveBpm: currentBpm,
        transpositionSemitones: targetTranspositionSt, deltaSemitones: pitchShiftSemitones,
        scaledT1OffsetSec: scaled.scaledT1OffsetSec, scaledTrimStartSec: scaled.scaledTrimStartSec,
        scaledTrimEndSec: Math.min(prewarmedBuf.duration, scaled.scaledTrimEndSec),
      };
    } else {
      dspEntry = getOrComputeVocalPatternDspSync(
        canonicalPatternKey, baseAudioBuffer, recordedBpm, currentBpm,
        targetTranspositionSt, packTranspositionSt, timingMeta
      );
    }
  }

  if (vocalBuffers && dspEntry.audioBuffer) {
    vocalBuffers[dspEntry.cacheKey] = dspEntry.audioBuffer;
  }

  return {
    buffer: dspEntry.audioBuffer,
    playbackRate: 1.0,
    detuneCents: 0,
    isVariant: true,
    variantKey: dspEntry.cacheKey,
    alpha: dspEntry.alpha,
    effectiveTrimStart: dspEntry.scaledTrimStartSec,
    effectiveTrimEnd: dspEntry.scaledTrimEndSec,
    effectiveT1Offset: dspEntry.scaledT1OffsetSec,
    scaledT1OffsetSec: dspEntry.scaledT1OffsetSec,
    scaledTrimStartSec: dspEntry.scaledTrimStartSec,
    scaledTrimEndSec: dspEntry.scaledTrimEndSec,
    dspEntry,
  };
}
