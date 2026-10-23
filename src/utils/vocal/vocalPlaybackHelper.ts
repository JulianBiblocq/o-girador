/**
 * vocalPlaybackHelper.ts
 * Résolution du buffer vocal optimal (déclinaisons anti-distorsion)
 * et calcul du playbackRate et detune résiduels (< 80 lignes).
 */
import { selectBestVocalVariant } from './vocalVariantSelector';
import type { Pattern, TrackGroup } from '../../types/store.types';

export interface ResolvedVocalPlayback {
  buffer: AudioBuffer;
  playbackRate: number;
  detuneCents: number;
  isVariant: boolean;
  variantKey?: string;
}

export function resolveVocalPlaybackBuffer(
  ptnRef: Pattern,
  voiceTrack: TrackGroup,
  effectiveBpm: number,
  clipSampleBpm: number,
  baseAudioBuffer: AudioBuffer,
  vocalBuffers: Record<string | number, AudioBuffer>,
  vocalTransposeSteps: number = 0
): ResolvedVocalPlayback {
  const availableKeys = ptnRef.vocalVariantKeys || ptnRef.vocalClip?.variantKeys;
  const tuningSemitones = (voiceTrack.tuning || 0) + vocalTransposeSteps;

  if (availableKeys && availableKeys.length > 0) {
    const variantRes = selectBestVocalVariant(
      availableKeys,
      effectiveBpm,
      clipSampleBpm,
      tuningSemitones
    );

    const trackKey = `${voiceTrack.id}_${ptnRef.id}__${variantRes.bestKey}`;
    const directKey = `${ptnRef.id}__${variantRes.bestKey}`;
    const variantBuf = vocalBuffers[trackKey] || vocalBuffers[directKey];

    if (variantBuf) {
      return {
        buffer: variantBuf,
        playbackRate: variantRes.residualPlaybackRate,
        detuneCents: variantRes.residualDetuneCents,
        isVariant: true,
        variantKey: variantRes.bestKey,
      };
    }
  }

  // Comportement standard (sample de base original)
  const rate = clipSampleBpm ? effectiveBpm / clipSampleBpm : 1.0;
  const isPure = Math.abs(rate - 1.0) < 0.001;
  const playbackRate = isPure ? 1.0 : (Number.isFinite(rate) && rate > 0 ? rate : 1.0);
  const detuneCents = tuningSemitones * 100;

  return {
    buffer: baseAudioBuffer,
    playbackRate,
    detuneCents,
    isVariant: false,
  };
}
