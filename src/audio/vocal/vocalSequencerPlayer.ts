/**
 * O Girador - Vocal Sequencer Player & Preview Dispatcher
 */

import * as Tone from 'tone';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { faderPositionToGain } from '../../utils/audioMath';
import { resolveVocalPlaybackBuffer } from '../../utils/vocal/vocalPlaybackHelper';
import { resolveVocalOutputNode } from './vocalOutputNode';
import { VocalPlayerPool } from './vocalPlayerPool';
import { VocalOldPlayerFade } from './vocalOldPlayerFade';
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
      ? sequencerStore.tracks.find(t => String(t.id) === String(trackId))
      : sequencerStore.tracks.find(t => t.patterns.some(p => Number(p.id) === Number(patternId)));

    const compositeKey = voiceTrack ? `${voiceTrack.id}_${patternId}` : String(patternId);
    let audioBuffer = store.vocalBuffers[compositeKey] || store.vocalBuffers[patternId];
    if (!audioBuffer) {
      const blob = store.vocalBlobs[compositeKey] || store.vocalBlobs[patternId] || (loadRecordingFn ? await loadRecordingFn(patternId) : null);
      if (!blob) return;
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;
        audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);
        store.setVocalBuffer(compositeKey, audioBuffer);
        store.setVocalBuffer(patternId, audioBuffer);
      } catch (_) { return; }
    }

    const isCoro = voiceTrack ? instrumentsConfig[voiceTrack.instrumentIdx]?.id === 'coro' : false;
    const outputNode = resolveVocalOutputNode(voiceTrack?.id, isCoro);
    const trackVolPct = voiceTrack ? (voiceTrack.volumeVal ?? 75) : 75;
    const ptnRef = voiceTrack?.patterns.find(p => Number(p.id) === Number(patternId));
    const anchorBpm = ptnRef ? VocalTimingCalculator.calculateAnchorBpm(ptnRef, sequencerStore) : sequencerStore.bpm;

    const timing = ptnRef ? VocalTimingCalculator.calculateTiming({
      clip: ptnRef.vocalClip, ptnRef, voiceTrack, effectiveBpm: anchorBpm, measureStartTime: time, sequencerStore
    }) : { triggerOffsetSec: 0, nudgeMs: 0, balancoOffset: 0, triggerTime: time, actualStartTime: time };

    const previewTime = time - timing.triggerOffsetSec - (timing.nudgeMs / 1000);
    this.playSequencerVocal(voiceTrack?.id ?? 0, patternId, previewTime, anchorBpm, outputNode, trackVolPct, isCoro, onStop);
  }

  public static playSequencerVocal(
    trackId: string | number,
    patternId: number | string,
    measureStartTime: number,
    currentBpm: number,
    outputNode: any,
    trackVolPct: number,
    isCoroTrack: boolean,
    onStop?: () => void,
    isDirectStep0: boolean = false
  ): any {
    const store = useAudioStore.getState();
    const sequencerStore = useSequencerStore.getState();
    const voiceTrack = sequencerStore.tracks.find(t => String(t.id) === String(trackId));
    if (!voiceTrack) return null;

    const ptnRef = voiceTrack.patterns.find(p => p && (
      p.id === patternId || String(p.id) === String(patternId) ||
      (!isNaN(Number(patternId)) && Number(p.id) === Number(patternId)) ||
      (p.vocalClip && (p.vocalClip.id === patternId || String(p.vocalClip.id) === String(patternId) || (!isNaN(Number(patternId)) && Number(p.vocalClip.id) === Number(patternId))))
    ));
    if (!ptnRef) return null;

    const clip = ptnRef.vocalClip;
    const patId = ptnRef.id;
    const clipId = clip?.id;
    const audioBuffer = store.vocalBuffers[`${trackId}_${patId}`] || store.vocalBuffers[patId] ||
      (clipId ? store.vocalBuffers[`${trackId}_${clipId}`] || store.vocalBuffers[clipId] : undefined) ||
      store.vocalBuffers[`${trackId}_${patternId}`] || store.vocalBuffers[patternId];
    if (!audioBuffer) return null;

    const compositeKey = `${trackId}_${patId}`;
    const anchorMeasureBpm = VocalTimingCalculator.calculateAnchorBpm(ptnRef, sequencerStore);
    const effectiveBpm = currentBpm || anchorMeasureBpm;
    const clipSampleBpm = clip?.sampleBpm || clip?.baseBpm || ptnRef.vocalBaseBpm || anchorMeasureBpm;

    const resolved = resolveVocalPlaybackBuffer(ptnRef, voiceTrack, effectiveBpm, clipSampleBpm, audioBuffer, store.vocalBuffers);
    const { buffer: activeAudioBuffer, playbackRate, detuneCents: residualDetuneCents, isVariant } = resolved;
    const isPurePlayback = !isVariant && Math.abs(playbackRate - 1.0) < 0.001;

    const timing = VocalTimingCalculator.calculateTiming({ clip, ptnRef, voiceTrack, effectiveBpm, measureStartTime, sequencerStore });
    VocalOldPlayerFade.fadeAndDispose(trackId, timing.actualStartTime);

    const playerKey = isVariant ? `${compositeKey}__${resolved.variantKey}` : compositeKey;
    const activeEntry = VocalPlayerPool.getOrCreate(playerKey, activeAudioBuffer, outputNode, isCoroTrack, trackId, isPurePlayback);
    const { mainPlayer, mainGain } = activeEntry;

    mainPlayer.playbackRate = playbackRate;
    if (activeEntry.grainPlayer) {
      activeEntry.grainPlayer.playbackRate = playbackRate;
      try { (activeEntry.grainPlayer as any).detune = residualDetuneCents; } catch (_) {}
    }
    try { (mainPlayer as any).detune = residualDetuneCents; } catch (_) {}
    mainPlayer.loop = false;
    if (!isPurePlayback) (mainPlayer as any).fadeIn = 0;

    const baseGainLinear = faderPositionToGain(trackVolPct);
    const usefulSec = (clip?.trimEndSec && clip.trimEndSec > 0 && clip.trimEndSec < activeAudioBuffer.duration) ? clip.trimEndSec : activeAudioBuffer.duration;
    const playDuration = usefulSec / playbackRate;

    if (timing.triggerTime >= 0) {
      mainGain.gain.setValueAtTime(baseGainLinear, timing.triggerTime);
      mainPlayer.start(timing.triggerTime, 0, playDuration);
    } else {
      const internalBufferOffset = Math.min(Math.abs(timing.triggerTime) * playbackRate, Math.max(0, usefulSec - 0.05));
      const remainingDuration = Math.max(0, usefulSec - internalBufferOffset);
      if (remainingDuration <= 0) return null;
      mainGain.gain.setValueAtTime(baseGainLinear, 0);
      mainPlayer.start(0, internalBufferOffset, remainingDuration / playbackRate);
    }

    mainPlayer.onstop = typeof onStop === 'function' ? () => { try { onStop(); } catch (_) {} } : () => {};

    return {
      mainPlayer,
      stop: () => {
        try {
          mainPlayer.onstop = () => {}; mainPlayer.stop();
          if (activeEntry.directPlayer) { activeEntry.directPlayer.onstop = () => {}; activeEntry.directPlayer.stop(); }
          if (activeEntry.grainPlayer) { activeEntry.grainPlayer.onstop = () => {}; activeEntry.grainPlayer.stop(); }
        } catch (_) {}
      }
    };
  }
}
