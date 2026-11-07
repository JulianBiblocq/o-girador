/**
 * vocalSequencerPlayer.ts
 * Lecteur vocal Studio du séquenceur (Zéro GrainPlayer) :
 * - Moteur Hybride TD-PSOLA + Formants LPC + Consonnes 1:1 (`vocalPatternBufferCache`).
 * - Déclenchement natif `Tone.Player` (`playbackRate = 1.0`, `detune = 0`) selon :
 *   `when = slotMeasureT1Time + (effectiveTrimStart - effectiveT1Offset)` (< 140 lignes).
 */
import * as Tone from 'tone';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { faderPositionToGain } from '../../utils/audioMath';
import { resolveVocalPlaybackBuffer } from '../../utils/vocal/vocalPlaybackHelper';
import { resolveVocalOutputNode } from './vocalOutputNode';
import { VocalPlayerPool } from './vocalPlayerPool';
import { VocalTimingCalculator } from './vocalTimingCalculator';

export class VocalSequencerPlayer {
  public static async playPreview(
    patternId: number,
    time: number,
    onStop?: () => void,
    trackId?: string | number,
    loadRecordingFn?: (id: number) => Promise<Blob | null>
  ): Promise<void> {
    const store = useAudioStore.getState();
    const sequencerStore = useSequencerStore.getState();
    const voiceTrack = trackId
      ? sequencerStore.tracks.find((t) => String(t.id) === String(trackId))
      : sequencerStore.tracks.find((t) => t.patterns.some((p) => Number(p.id) === Number(patternId)));

    const canonicalKey = voiceTrack ? `${voiceTrack.id}_${patternId}` : String(patternId);
    let audioBuffer = store.vocalBuffers[canonicalKey] || store.vocalBuffers[patternId];
    if (!audioBuffer) {
      const blob = store.vocalBlobs[canonicalKey] || store.vocalBlobs[patternId] || (loadRecordingFn ? await loadRecordingFn(patternId) : null);
      if (!blob) return;
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;
        audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);
        store.setVocalBuffer(canonicalKey, audioBuffer);
      } catch (_) { return; }
    }

    const isCoro = voiceTrack ? instrumentsConfig[voiceTrack.instrumentIdx]?.id === 'coro' : false;
    const outputNode = resolveVocalOutputNode(voiceTrack?.id, isCoro);
    const trackVolPct = voiceTrack ? (voiceTrack.volumeVal ?? 75) : 75;
    const ptnRef = voiceTrack?.patterns.find((p) => Number(p.id) === Number(patternId));
    const anchorBpm = ptnRef ? VocalTimingCalculator.calculateAnchorBpm(ptnRef, sequencerStore) : sequencerStore.bpm;
    const timing = ptnRef
      ? VocalTimingCalculator.calculateTiming({ clip: ptnRef.vocalClip, ptnRef, voiceTrack, effectiveBpm: anchorBpm, measureStartTime: time, sequencerStore })
      : { triggerOffsetSec: 0, nudgeMs: 0, balancoOffset: 0, triggerTime: time, actualStartTime: time };
    const previewTime = time - timing.triggerOffsetSec - (timing.nudgeMs / 1000);
    this.scheduleVoicePlayback(voiceTrack?.id ?? 0, patternId, previewTime, anchorBpm, outputNode, trackVolPct, isCoro, onStop);
  }

  public static scheduleVoicePlayback(
    trackId: string | number,
    patternId: number | string,
    slotMeasureT1Time: number,
    currentBpm: number,
    outputNode: any,
    trackVolPct: number,
    isCoroTrack: boolean,
    onStop?: () => void
  ): any {
    const store = useAudioStore.getState();
    const sequencerStore = useSequencerStore.getState();
    const voiceTrack = sequencerStore.tracks.find((t) => String(t.id) === String(trackId));
    if (!voiceTrack) return null;

    const ptnRef = voiceTrack.patterns.find((p) => p && (
      p.id === patternId || String(p.id) === String(patternId) ||
      (!isNaN(Number(patternId)) && Number(p.id) === Number(patternId)) ||
      (p.vocalClip && (p.vocalClip.id === patternId || String(p.vocalClip.id) === String(patternId) || (!isNaN(Number(patternId)) && Number(p.vocalClip.id) === Number(patternId))))
    ));
    if (!ptnRef) return null;

    const clip = ptnRef.vocalClip;
    const patId = ptnRef.id;
    const canonicalKey = `${trackId}_${patId}`;
    const audioBuffer = store.vocalBuffers[canonicalKey] || store.vocalBuffers[patId] ||
      store.vocalBuffers[`${trackId}_${patternId}`] || store.vocalBuffers[patternId];
    if (!audioBuffer) return null;

    const anchorMeasureBpm = VocalTimingCalculator.calculateAnchorBpm(ptnRef, sequencerStore);
    const effectiveBpm = currentBpm || sequencerStore.bpm || anchorMeasureBpm;
    const recordedBpm = clip?.recordedBpm || clip?.sampleBpm || clip?.baseBpm || ptnRef.vocalBaseBpm || anchorMeasureBpm;
    const vocalTr = (ptnRef as any).vocalTransposeSteps ?? sequencerStore.vocalTransposeSteps ?? 0;

    const resolved = resolveVocalPlaybackBuffer(ptnRef, voiceTrack, effectiveBpm, recordedBpm, audioBuffer, store.vocalBuffers, vocalTr);
    const { buffer: activeAudioBuffer, effectiveTrimStart, effectiveTrimEnd, effectiveT1Offset } = resolved;

    const timing = VocalTimingCalculator.calculateTiming({ clip, ptnRef, voiceTrack, effectiveBpm, measureStartTime: slotMeasureT1Time, sequencerStore });
    const when = clip?.t1OffsetSec !== undefined
      ? slotMeasureT1Time + (effectiveTrimStart - effectiveT1Offset) + (timing.nudgeMs / 1000) + timing.balancoOffset
      : timing.triggerTime;

    const playerKey = resolved.variantKey ? `${canonicalKey}__${resolved.variantKey}` : canonicalKey;
    const activeEntry = VocalPlayerPool.getOrCreate(playerKey, activeAudioBuffer, outputNode, isCoroTrack, trackId, true);
    const { mainPlayer, mainGain } = activeEntry;

    mainPlayer.playbackRate = 1.0;
    if ('detune' in (mainPlayer as any)) (mainPlayer as any).detune = 0;
    mainPlayer.loop = false;

    const baseGainLinear = faderPositionToGain(trackVolPct);
    const trimStart = Math.max(0, effectiveTrimStart);
    const trimEnd = effectiveTrimEnd > trimStart && effectiveTrimEnd <= activeAudioBuffer.duration ? effectiveTrimEnd : activeAudioBuffer.duration;
    const playDuration = Math.max(0.05, trimEnd - trimStart);

    if (when >= 0) {
      mainGain.gain.setValueAtTime(baseGainLinear, when);
      mainPlayer.start(when, trimStart, playDuration);
    } else {
      const skipSec = Math.abs(when);
      const internalOffset = Math.min(trimStart + skipSec, Math.max(trimStart, trimEnd - 0.05));
      const remainingDuration = Math.max(0, trimEnd - internalOffset);
      if (remainingDuration <= 0) return null;
      mainGain.gain.setValueAtTime(baseGainLinear, 0);
      mainPlayer.start(0, internalOffset, remainingDuration);
    }

    mainPlayer.onstop = typeof onStop === 'function' ? () => { try { onStop(); } catch (_) {} } : () => {};

    return {
      mainPlayer, patternId: patId, hasTailBeat: Boolean(ptnRef.hasTailBeat || clip?.hasTailBeat),
      stop: () => {
        try { mainPlayer.onstop = () => {}; mainPlayer.stop(); } catch (_) {}
      }
    };
  }

  public static playSequencerVocal(
    trackId: string | number, patternId: number | string, measureStartTime: number, currentBpm: number,
    outputNode: any, trackVolPct: number, isCoroTrack: boolean, onStop?: () => void, _isDirectStep0: boolean = false
  ): any {
    return this.scheduleVoicePlayback(trackId, patternId, measureStartTime, currentBpm, outputNode, trackVolPct, isCoroTrack, onStop);
  }
}
