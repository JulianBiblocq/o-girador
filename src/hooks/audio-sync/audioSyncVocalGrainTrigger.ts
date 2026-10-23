import * as Tone from 'tone';
import { Track, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { getEffectiveVolume, isToadaBus } from '../../stores/useSequencerStore';
import { isVocalSamplePattern, isSamplePlaybackAllowed, getVocalBufferForPattern } from './vocalSampleHelpers';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { busInputs } from './audioEngineNodes';

export interface VocalGrainTriggerParams {
  track: Track;
  activePattern: Pattern;
  currentKey: string;
  stepIdx: number;
  time: number;
  tracks: Track[];
  currentMeasureLocal: number;
  soloPatternPlayId: number | null;
  anticipatedMeasures: Set<string>;
  activeSequencerVocals: Map<string, any>;
  phrase: any;
  trackInputs: Record<string | number, Tone.Gain>;
  channels: Record<string | number, Tone.Channel>;
  busChannels: Record<string | number, Tone.Channel>;
  masterVolumeNode: Tone.Volume | null;
}

export function triggerVocalGrainAtStep0(p: VocalGrainTriggerParams): void {
  const {
    track, activePattern, currentKey, stepIdx, time, tracks,
    currentMeasureLocal, soloPatternPlayId, anticipatedMeasures,
    activeSequencerVocals, phrase, trackInputs, channels,
    busChannels, masterVolumeNode
  } = p;

  const vocalBuf = getVocalBufferForPattern(track.id, activePattern);
  const currentVocalMode = useAudioStore.getState().vocalMode;
  const allowSamplePlayback = isSamplePlaybackAllowed(currentVocalMode);
  const hasVocalSample = Boolean(vocalBuf && isVocalSamplePattern(activePattern) && allowSamplePlayback);

  const isAlreadyAnticipated = anticipatedMeasures.has(currentKey);
  const canStartSampleHere = phrase.isBlockStart && (phrase.span > 1 || !activeSequencerVocals.has(currentKey));

  if (!hasVocalSample || stepIdx !== 0 || isAlreadyAnticipated || !canStartSampleHere) return;

  activeSequencerVocals.forEach((handle, key) => {
    if (key.startsWith(`${track.id}_`) && key !== currentKey) {
      try { handle.stop(); } catch (_) {}
      activeSequencerVocals.delete(key);
    }
  });

  const toadaTrack = tracks.find(trk => isToadaBus(trk));
  const outputNode = trackInputs[track.id] || channels[track.id] || (toadaTrack && (busInputs[toadaTrack.id] || busChannels[toadaTrack.id])) || masterVolumeNode;
  const voiceInst = instrumentsConfig[track.instrumentIdx];
  const isCoroTrack = voiceInst?.id === 'coro';
  const isConnectedToBus = Boolean(track.busId && busChannels[track.busId]);
  let vocalVol = isConnectedToBus ? (track.volumeVal ?? 75) : getEffectiveVolume(tracks, track.id);
  const isSoloTrack = (soloPatternPlayId !== null) && track.patterns.some(pat => String(pat.id) === String(soloPatternPlayId));
  if (isSoloTrack && vocalVol <= 3) {
    vocalVol = 75;
  }
  const currentBpm = useSequencerStore.getState().measureBpms[currentMeasureLocal] || useSequencerStore.getState().bpm;

  const handle = vocalEngineService.playSequencerVocal(
    track.id,
    activePattern.id,
    time,
    currentBpm,
    outputNode,
    vocalVol,
    isCoroTrack,
    () => { activeSequencerVocals.delete(currentKey); },
    true
  );
  if (handle) {
    activeSequencerVocals.set(currentKey, handle);
  }
}
