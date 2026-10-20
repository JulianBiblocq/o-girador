import * as Tone from 'tone';
import { Track, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { getEffectiveVolume } from '../../stores/useSequencerStore';
import { faderPositionToGain } from '../../utils/audioMath';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { isVocalSamplePattern, isSamplePlaybackAllowed, getVocalBufferForPattern, noteToFrequency } from './vocalSampleHelpers';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { pushVisualHitTrigger } from '../../audio/visualTickBuffer';
import { matchVocalStepAtTick } from '../../utils/vocalTimingUtils';
import { getBalancoOffsetSec } from '../../utils/balancoUtils';
import { isVoiceHoldNote, isVoiceStepProlongation } from '../../utils/musicTheory';
import { capVoiceNoteSteps } from '../../utils/voiceNoteDuration';
import { playNativeVoiceSynth } from '../../audio/nativeSynths';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { audioEngine } from './audioEngineNodes';

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

  const isSecondHalf = stepIdx >= Math.floor(currentTicks / 2);
  if (!nextPattern || !isSecondHalf) return;

  const nextVocalBuf = getVocalBufferForPattern(track.id, nextPattern);
  const currentVocalMode = useAudioStore.getState().vocalMode;
  const allowSamplePlayback = isSamplePlaybackAllowed(currentVocalMode);
  const nextHasVocal = Boolean(nextVocalBuf && isVocalSamplePattern(nextPattern) && allowSamplePlayback);
  const nextClip = nextPattern.vocalClip;
  const isClipAnacrusis = nextClip?.startOffsetSec !== undefined
    ? (nextClip.startOffsetSec < -0.02)
    : Boolean((nextClip?.anacrusisSec || 0) > 0.02 || (nextClip?.anacrusisBeats || 0) > 0.02);

  const targetKey = `${track.id}_m${nextMeasureLocal}`;
  if (!nextHasVocal || !isClipAnacrusis || anticipatedMeasures.has(targetKey)) return;

  const outputNode = trackInputs[track.id] || channels[track.id] || Tone.Destination;
  const voiceInst = instrumentsConfig[track.instrumentIdx];
  const isCoroTrack = voiceInst?.id === 'coro';
  const isConnectedToBus = Boolean(track.busId && busChannels[track.busId]);
  const vocalVol = isConnectedToBus ? (track.volumeVal ?? 75) : getEffectiveVolume(tracks, track.id);
  const nextBpm = useSequencerStore.getState().measureBpms[nextMeasureLocal] || useSequencerStore.getState().bpm;
  const currentTimeSig = measureTimeSigs[nextMeasureLocal % (totalMeasures || 1)] || '4/4';
  const currentBeats = getBeatsPerMeasure(currentTimeSig);
  const currentMeasureBpm = useSequencerStore.getState().measureBpms[nextMeasureLocal] || useSequencerStore.getState().bpm;
  const currentMeasureDurationSec = (currentBeats * 60) / currentMeasureBpm;

  const remainingTicks = currentTicks - stepIdx;
  const remainingDurationSec = (remainingTicks / currentTicks) * currentMeasureDurationSec;
  const nextMeasureStartTime = time + remainingDurationSec;

  anticipatedMeasures.add(targetKey);

  activeSequencerVocals.forEach((handle, key) => {
    if (key.startsWith(`${track.id}_`) && key !== targetKey) {
      try { handle.stop(); } catch (_) {}
      activeSequencerVocals.delete(key);
    }
  });

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
