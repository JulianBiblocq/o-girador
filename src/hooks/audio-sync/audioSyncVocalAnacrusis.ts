import * as Tone from 'tone';
import { Track, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { getEffectiveVolume } from '../../stores/useSequencerStore';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { isVocalSamplePattern, isSamplePlaybackAllowed, getVocalBufferForPattern } from './vocalSampleHelpers';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';

export interface VocalAnacrusisParams {
  track: Track;
  nextPattern: Pattern | null;
  nextMeasureLocal: number;
  stepIdx: number;
  currentTicks: number;
  time: number;
  tracks: Track[];
  totalMeasures: number;
  measureTimeSigs: Record<number, string>;
  anticipatedMeasures: Set<string>;
  activeSequencerVocals: Map<string, any>;
  trackInputs: Record<string | number, Tone.Gain>;
  channels: Record<string | number, Tone.Channel>;
  busChannels: Record<string | number, Tone.Channel>;
}

export function evaluateIncomingAnacrusis(p: VocalAnacrusisParams): void {
  const {
    track, nextPattern, nextMeasureLocal, stepIdx, currentTicks,
    time, tracks, totalMeasures, measureTimeSigs, anticipatedMeasures,
    activeSequencerVocals, trackInputs, channels, busChannels
  } = p;

  if (!nextPattern) return;
  const targetKey = `${track.id}_m${nextMeasureLocal}`;
  if (anticipatedMeasures.has(targetKey)) return;

  const nextVocalBuf = getVocalBufferForPattern(track.id, nextPattern);
  const currentVocalMode = useAudioStore.getState().vocalMode;
  const allowSamplePlayback = isSamplePlaybackAllowed(currentVocalMode);
  const nextHasVocal = Boolean(nextVocalBuf && isVocalSamplePattern(nextPattern) && allowSamplePlayback);
  if (!nextHasVocal) return;

  const seqState = useSequencerStore.getState();
  const nextBpm = seqState.measureBpms[nextMeasureLocal] || seqState.bpm || 88;
  const nextClip = nextPattern.vocalClip;
  const recordedBpm = Number(nextClip?.recordedBpm || nextClip?.sampleBpm || nextClip?.baseBpm || nextPattern.vocalBaseBpm || nextBpm);
  const tempoRatio = nextBpm > 0 ? (recordedBpm / nextBpm) : 1;

  const triggerOffsetSec = nextClip?.t1OffsetSec !== undefined
    ? (Number(nextClip.trimStartSec ?? 0) - Number(nextClip.t1OffsetSec)) * tempoRatio
    : (nextClip?.startOffsetSec !== undefined
      ? Number(nextClip.startOffsetSec) * tempoRatio
      : -(Number(nextClip?.anacrusisSec || 0) * tempoRatio));

  const isClipAnacrusis = triggerOffsetSec < -0.02 || Boolean((nextClip?.anacrusisBeats || 0) > 0.02);
  if (!isClipAnacrusis) return;

  const currentTimeSig = measureTimeSigs[nextMeasureLocal % (totalMeasures || 1)] || '4/4';
  const currentBeats = getBeatsPerMeasure(currentTimeSig);
  const currentMeasureDurationSec = (currentBeats * 60) / nextBpm;
  const remainingTicks = currentTicks - stepIdx;
  const remainingDurationSec = (remainingTicks / currentTicks) * currentMeasureDurationSec;
  const nextMeasureStartTime = time + remainingDurationSec;
  const expectedWhen = nextMeasureStartTime + triggerOffsetSec;

  // Planification Lookahead au plus près de l'attaque d'anacrouse (pour capter tout changement de BPM/Tonalité jusqu'au dernier instant)
  const isSecondHalf = stepIdx >= Math.floor(currentTicks / 2);
  if (expectedWhen > time + 0.35 && !isSecondHalf) return;

  const outputNode = trackInputs[track.id] || channels[track.id] || Tone.Destination;
  const voiceInst = instrumentsConfig[track.instrumentIdx];
  const isCoroTrack = voiceInst?.id === 'coro';
  const isConnectedToBus = Boolean(track.busId && busChannels[track.busId]);
  const vocalVol = isConnectedToBus ? (track.volumeVal ?? 75) : getEffectiveVolume(tracks, track.id);

  anticipatedMeasures.add(targetKey);

  const handle = vocalEngineService.playSequencerVocal(
    track.id,
    nextPattern.id,
    nextMeasureStartTime,
    nextBpm,
    outputNode,
    vocalVol,
    isCoroTrack,
    () => { activeSequencerVocals.delete(targetKey); },
    false
  );
  if (handle) {
    activeSequencerVocals.set(targetKey, handle);
  }
}
