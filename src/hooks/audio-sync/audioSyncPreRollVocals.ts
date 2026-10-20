import * as Tone from 'tone';
import { Track } from '../../types';
import { instrumentsConfig } from '../../data';
import { getEffectiveVolume } from '../../stores/useSequencerStore';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { isPhraseBlockStart } from '../../utils/vocalPhraseBlock';
import { isVocalSamplePattern, isSamplePlaybackAllowed, getVocalBufferForPattern } from './vocalSampleHelpers';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { schedulePreRollSyllables } from './preRollSyllablesHelper';
import { useAudioStore } from '../../stores/useAudioStore';

export interface PreRollVocalsParams {
  startTracks: Track[];
  targetM: number;
  scheduledMusicStartTime: number;
  measureCycleDurationSec: number;
  targetBpm: number;
  soloPatternPlayId: number | null;
  measureTimeSigs: Record<number, string>;
  anticipatedMeasures: Set<string>;
  activeSequencerVocals: Map<string, any>;
  trackInputs: Record<string | number, Tone.Gain>;
  channels: Record<string | number, Tone.Channel>;
  busChannels: Record<string | number, Tone.Channel>;
}

export function schedulePreRollVocals(p: PreRollVocalsParams): void {
  const {
    startTracks, targetM, scheduledMusicStartTime, measureCycleDurationSec,
    targetBpm, soloPatternPlayId, measureTimeSigs, anticipatedMeasures,
    activeSequencerVocals, trackInputs, channels, busChannels
  } = p;

  const runwayStartTime = scheduledMusicStartTime - measureCycleDurationSec;
  const runwayStepDurationSec = measureCycleDurationSec / 16;

  for (let tIdx = 0; tIdx < startTracks.length; tIdx++) {
    const track = startTracks[tIdx];
    const inst = instrumentsConfig[track.instrumentIdx];
    if (!inst || inst.type !== 'voice') continue;

    const activePattern = track.patterns.find(pat => pat.measureAssignments[targetM]);
    if (!activePattern) continue;
    if (!isPhraseBlockStart(activePattern, targetM, getBeatsPerMeasure(measureTimeSigs[targetM] || '4/4'), soloPatternPlayId !== null)) continue;

    const isSolo = soloPatternPlayId !== null;
    const canPlay = isSolo
      ? String(activePattern.id) === String(soloPatternPlayId)
      : (startTracks.some(t => t.isSolo) ? track.isSolo : !track.isMute);
    if (!canPlay) continue;

    const vocalBuf = getVocalBufferForPattern(track.id, activePattern);
    const allowSamplePlayback = isSamplePlaybackAllowed(useAudioStore.getState().vocalMode);
    const hasVocalSample = Boolean(vocalBuf && isVocalSamplePattern(activePattern) && allowSamplePlayback);
    const clip = activePattern.vocalClip;
    const isClipAnacrusis = clip?.startOffsetSec !== undefined
      ? (clip.startOffsetSec < -0.02)
      : Boolean(((clip?.anacrusisSec ?? 0) > 0.02) || ((clip?.anacrusisBeats ?? 0) > 0.02));
    const hasSampleAnacrusis = Boolean(hasVocalSample && isClipAnacrusis);

    const outputNode = trackInputs[track.id] || channels[track.id] || Tone.Destination;
    const isCoroTrack = inst.id === 'coro';
    const isConnectedToBus = Boolean(track.busId && busChannels[track.busId]);
    const vocalVol = isConnectedToBus ? (track.volumeVal ?? 75) : getEffectiveVolume(startTracks, track.id);

    const preRollKey = `${track.id}_m${targetM}`;
    if (hasSampleAnacrusis && !activeSequencerVocals.has(preRollKey)) {
      anticipatedMeasures.add(preRollKey);
      const handle = vocalEngineService.playSequencerVocal(
        track.id,
        activePattern.id,
        scheduledMusicStartTime,
        targetBpm,
        outputNode,
        vocalVol,
        isCoroTrack,
        () => { activeSequencerVocals.delete(preRollKey); },
        false
      );
      if (handle) activeSequencerVocals.set(preRollKey, handle);
    }

    schedulePreRollSyllables(
      track, activePattern, runwayStartTime, runwayStepDurationSec,
      vocalVol, hasVocalSample, channels
    );
  }
}
