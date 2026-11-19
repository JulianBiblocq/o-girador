import * as Tone from 'tone';
import { Track, Pattern, GlobalSwing } from '../../types';
import { instrumentsConfig } from '../../data';
import { getEffectiveMuteState, useSequencerStore } from '../../stores/useSequencerStore';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { isTrackMutedByPracticeMode } from '../../utils/practiceAudioMuteGuard';
import { resolveVocalPhraseInfo } from '../../utils/vocalPhraseBlock';
import { evaluateIncomingAnacrusis } from './audioSyncVocalAnacrusis';
import { evaluateSilentMeasurePreRollSyllables } from './audioSyncSilentMeasureVocal';
import { evaluateActiveVocalPattern } from './audioSyncActivePatternEvaluator';
import { audioEngine } from './audioEngineNodes';

export interface VocalEvaluatorParams {
  tracks: Track[];
  stepIdx: number;
  currentTicks: number;
  time: number;
  currentMeasureLocal: number;
  totalMeasures: number;
  soloPatternPlayId: number | null;
  soloPatternVariationId: string | null;
  soloLoopCycle: number;
  soloPhraseMeasure: number;
  isLoopRegionActive: boolean;
  loopStart: number | null;
  loopEnd: number | null;
  measureTimeSigs: Record<number, string>;
  globalSwing: GlobalSwing;
  isDocHidden: boolean;
  mutedVoiceTracks: Set<string | number>;
  anticipatedMeasures: Set<string>;
  activeSequencerVocals: Map<string, any>;
  trackInputs: Record<string | number, Tone.Gain>;
  channels: Record<string | number, Tone.Channel>;
  busChannels: Record<string | number, Tone.Channel>;
  masterVolumeNode: Tone.Volume | null;
}

export function evaluateVocalTracks(p: VocalEvaluatorParams): void {
  const {
    tracks, stepIdx, currentTicks, time, currentMeasureLocal, totalMeasures,
    soloPatternPlayId, soloPatternVariationId, soloLoopCycle, soloPhraseMeasure,
    isLoopRegionActive, loopStart, loopEnd, measureTimeSigs, globalSwing,
    isDocHidden, mutedVoiceTracks, anticipatedMeasures, activeSequencerVocals,
    trackInputs, channels, busChannels, masterVolumeNode
  } = p;

  const seqState = useSequencerStore.getState();
  const numTracks = tracks.length;
  for (let trackIdx = 0; trackIdx < numTracks; trackIdx++) {
    const track = tracks[trackIdx];
    const inst = instrumentsConfig[track.instrumentIdx];
    if (!inst || inst.type !== 'voice' || track.isBusFolder || track.id === 999901 || String(track.id) === '999901') continue;

    const patterns = track.patterns;
    const isSolo = soloPatternPlayId !== null;
    const canPlay = isSolo
      ? patterns.some((pat) => String(pat.id) === String(soloPatternPlayId))
      : !getEffectiveMuteState(tracks, track.id) && !isTrackMutedByPracticeMode(track.id, tracks, seqState);

    if (!canPlay) {
      if (!mutedVoiceTracks.has(track.id)) {
        mutedVoiceTracks.add(track.id);
        audioEngine?.releaseVoicesForTrack(track.id);
      }
    } else if (mutedVoiceTracks.size > 0) {
      mutedVoiceTracks.delete(track.id);
    }

    let nextMeasureLocal: number;
    if (isSolo) nextMeasureLocal = 0;
    else if (isLoopRegionActive && loopEnd !== null && currentMeasureLocal === loopEnd) nextMeasureLocal = loopStart !== null ? loopStart : 0;
    else nextMeasureLocal = (currentMeasureLocal + 1) % (totalMeasures || 1);

    const rawNextPattern = isSolo
      ? (track.patterns.find((pt) => String(pt.id) === String(soloPatternPlayId)) || null)
      : track.patterns.find((pt) => pt.measureAssignments[nextMeasureLocal]);
    const nextPhrase = rawNextPattern ? resolveVocalPhraseInfo({
      pattern: rawNextPattern, measureIdx: nextMeasureLocal,
      beatsPerMeasure: getBeatsPerMeasure(measureTimeSigs[nextMeasureLocal] || '4/4'),
      isSolo, soloMeasureCounter: soloPhraseMeasure + 1,
    }) : null;
    const nextPattern = (rawNextPattern && nextPhrase && nextPhrase.isBlockStart) ? rawNextPattern : null;

    if (canPlay) {
      evaluateIncomingAnacrusis({
        track, nextPattern, nextMeasureLocal, stepIdx, currentTicks,
        time, tracks, totalMeasures, measureTimeSigs, anticipatedMeasures,
        activeSequencerVocals, trackInputs, channels, busChannels
      });
    }

    const activePattern: Pattern | null = isSolo
      ? (patterns.find((pt) => String(pt.id) === String(soloPatternPlayId)) || null)
      : (patterns.find((pt) => pt.measureAssignments[currentMeasureLocal]) || null);

    if (!activePattern) {
      const currentKey = `${track.id}_m${currentMeasureLocal}`;
      if (stepIdx >= 4 && anticipatedMeasures.has(currentKey)) anticipatedMeasures.delete(currentKey);
      if (canPlay && nextPattern && nextPattern.preRollActiveSteps) {
        evaluateSilentMeasurePreRollSyllables({
          track, nextPattern, nextPhrase, currentMeasureLocal, stepIdx,
          currentTicks, time, tracks, measureTimeSigs, globalSwing,
          isDocHidden, currentMeasureIdx: currentMeasureLocal, busChannels, channels
        });
      }
      continue;
    }

    evaluateActiveVocalPattern({
      track, activePattern, nextPattern, canPlay, isSolo, soloPatternPlayId,
      soloPatternVariationId, soloLoopCycle, soloPhraseMeasure,
      currentMeasureLocal, stepIdx, currentTicks, time, tracks,
      measureTimeSigs, globalSwing, isDocHidden, anticipatedMeasures,
      activeSequencerVocals, trackInputs, channels, busChannels, masterVolumeNode
    });
  }
}
