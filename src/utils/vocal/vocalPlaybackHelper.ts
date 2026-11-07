/**
 * vocalPlaybackHelper.ts
 * Résolution du buffer vocal optimal (déclinaisons de vitesse 75%/88%/100% + hauteur),
 * lecture directe à `transpositionSemitones === pack.transpositionSemitones`,
 * et bascule formantique LPC si la hauteur est modifiée dans Sequenciador (< 85 lignes).
 */
import { selectBestVocalVariant } from './vocalVariantSelector';
import { getOrCreateFormantShiftedAudioBuffer } from './formantBufferShifter';
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
  const packBaseSt = Number(ptnRef.packTranspositionSemitones ?? ptnRef.vocalClip?.packTranspositionSemitones ?? 0);
  const relativeTransposeSt = vocalTransposeSteps - packBaseSt;
  const tuningSemitones = (voiceTrack.tuning || 0) + relativeTransposeSt;

  if (availableKeys && availableKeys.length > 0) {
    const variantRes = selectBestVocalVariant(
      availableKeys,
      effectiveBpm,
      clipSampleBpm,
      tuningSemitones
    );

    const trackKey = `${voiceTrack.id}_${ptnRef.id}__${variantRes.bestKey}`;
    const directKey = `${ptnRef.id}__${variantRes.bestKey}`;
    let variantBuf = vocalBuffers[trackKey] || vocalBuffers[directKey];

    if (variantBuf) {
      const residualSt = Math.round(variantRes.residualDetuneCents / 100);
      let finalDetune = variantRes.residualDetuneCents;
      if (residualSt !== 0) {
        const formantKey = `${trackKey}__formant_${residualSt}`;
        variantBuf = getOrCreateFormantShiftedAudioBuffer(variantBuf, residualSt, formantKey, vocalBuffers);
        finalDetune = 0;
      }
      return {
        buffer: variantBuf,
        playbackRate: variantRes.residualPlaybackRate,
        detuneCents: finalDetune,
        isVariant: true,
        variantKey: residualSt !== 0 ? `${variantRes.bestKey}_f${residualSt}` : variantRes.bestKey,
      };
    }
  }

  const rate = clipSampleBpm ? effectiveBpm / clipSampleBpm : 1.0;
  const isPure = Math.abs(rate - 1.0) < 0.001;
  const playbackRate = isPure ? 1.0 : (Number.isFinite(rate) && rate > 0 ? rate : 1.0);

  if (Math.abs(tuningSemitones) >= 0.5) {
    const formantKey = `${voiceTrack.id}_${ptnRef.id}__formant_${tuningSemitones}`;
    const shiftedBuf = getOrCreateFormantShiftedAudioBuffer(baseAudioBuffer, tuningSemitones, formantKey, vocalBuffers);
    return {
      buffer: shiftedBuf,
      playbackRate,
      detuneCents: 0,
      isVariant: true,
      variantKey: `formant_${tuningSemitones}`,
    };
  }

  return {
    buffer: baseAudioBuffer,
    playbackRate,
    detuneCents: tuningSemitones * 100,
    isVariant: false,
  };
}
