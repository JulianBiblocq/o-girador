import * as Tone from 'tone';
import { Track, Pattern, GlobalSwing } from '../../types';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { resolveVocalPhraseInfo } from '../../utils/vocalPhraseBlock';
import { matchVocalStepAtTick } from '../../utils/vocalTimingUtils';
import { triggerVocalGrainAtStep0 } from './audioSyncVocalGrainTrigger';
import { playActiveVoiceStep } from './audioSyncActiveVoiceStep';
import { evaluateFreeStepAnacrusis } from './audioSyncFreeStepAnacrusis';
import { isVocalSamplePattern, isSamplePlaybackAllowed, getVocalBufferForPattern } from './vocalSampleHelpers';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';

export interface ActivePatternEvaluatorParams {
  track: Track;
  activePattern: Pattern;
  nextPattern: Pattern | null;
  canPlay: boolean;
  isSolo: boolean;
  soloPatternPlayId: number | null;
  soloPatternVariationId: string | null;
  soloLoopCycle: number;
  soloPhraseMeasure: number;
  currentMeasureLocal: number;
  stepIdx: number;
  currentTicks: number;
  time: number;
  tracks: Track[];
  measureTimeSigs: Record<number, string>;
  globalSwing: GlobalSwing;
  isDocHidden: boolean;
  anticipatedMeasures: Set<string>;
  activeSequencerVocals: Map<string, any>;
  trackInputs: Record<string | number, Tone.Gain>;
  channels: Record<string | number, Tone.Channel>;
  busChannels: Record<string | number, Tone.Channel>;
  masterVolumeNode: Tone.Volume | null;
}

export function evaluateActiveVocalPattern(p: ActivePatternEvaluatorParams): void {
  const {
    track, activePattern, nextPattern, canPlay, isSolo, soloPatternPlayId,
    soloPatternVariationId, soloLoopCycle, soloPhraseMeasure,
    currentMeasureLocal, stepIdx, currentTicks, time, tracks,
    measureTimeSigs, globalSwing, isDocHidden, anticipatedMeasures,
    activeSequencerVocals, trackInputs, channels, busChannels, masterVolumeNode
  } = p;

  const phrase = resolveVocalPhraseInfo({
    pattern: activePattern,
    measureIdx: currentMeasureLocal,
    beatsPerMeasure: getBeatsPerMeasure(measureTimeSigs[currentMeasureLocal] || '4/4'),
    isSolo,
    soloMeasureCounter: soloPhraseMeasure,
  });
  const currentKey = `${track.id}_m${phrase.blockStartMeasure}`;

  if (isSolo && stepIdx === 0 && phrase.isBlockStart) {
    anticipatedMeasures.delete(currentKey);
    activeSequencerVocals.delete(currentKey);
  }
  if (stepIdx >= 4 && anticipatedMeasures.has(currentKey)) {
    anticipatedMeasures.delete(currentKey);
  }

  if (!canPlay) {
    activeSequencerVocals.forEach((handle, key) => {
      if (key.startsWith(`${track.id}_`)) {
        try { handle.stop(); } catch (_) {}
        activeSequencerVocals.delete(key);
      }
    });
    return;
  }

  triggerVocalGrainAtStep0({
    track, activePattern, currentKey, stepIdx, time, tracks,
    currentMeasureLocal, soloPatternPlayId, anticipatedMeasures,
    activeSequencerVocals, phrase, trackInputs, channels,
    busChannels, masterVolumeNode
  });

  let effectivePatternForSteps: Pattern = activePattern;
  if (isSolo && activePattern.variations) {
    let matchedVar: any = null;
    if (soloPatternVariationId && soloPatternVariationId !== 'base' && soloPatternVariationId !== 'ensemble') {
      matchedVar = activePattern.variations.find(v => v.id === soloPatternVariationId);
    } else if (soloPatternVariationId !== 'base' && soloLoopCycle === 0) {
      matchedVar = activePattern.variations.find(v => v.playFirstTimeOnly);
    }
    if (matchedVar) {
      effectivePatternForSteps = {
        ...activePattern,
        activeSteps: matchedVar.steps || matchedVar.activeSteps || activePattern.activeSteps,
        notes: matchedVar.notes || activePattern.notes,
        lyrics: matchedVar.lyrics || activePattern.lyrics,
        decays: matchedVar.decays || activePattern.decays,
        volumes: matchedVar.volumes || activePattern.volumes,
        microtimings: matchedVar.microtimings || activePattern.microtimings,
        beatResolutions: matchedVar.beatResolutions || activePattern.beatResolutions,
      };
    }
  }

  const beatsInMeasure = getBeatsPerMeasure(measureTimeSigs[currentMeasureLocal] || '4/4');
  const currentMeasureBpm = useSequencerStore.getState().measureBpms[currentMeasureLocal] || useSequencerStore.getState().bpm;
  const vocalStepMatch = matchVocalStepAtTick(stepIdx, effectivePatternForSteps.beatResolutions, beatsInMeasure, currentTicks, currentMeasureBpm);
  if (vocalStepMatch === null) return;

  const localCell = vocalStepMatch.localCell;
  const singleStepSec = vocalStepMatch.singleStepSec;
  const cellIdx = phrase.stepOffset + localCell;
  const state = effectivePatternForSteps.activeSteps[cellIdx];
  const isActive = state !== undefined && state !== null && state !== 0 && state !== '0';

  const currentVocalMode = useAudioStore.getState().vocalMode;
  const vocalBuf = getVocalBufferForPattern(track.id, activePattern);
  const allowSamplePlayback = isSamplePlaybackAllowed(currentVocalMode);
  const hasVocalSample = Boolean(vocalBuf && isVocalSamplePattern(activePattern) && allowSamplePlayback);

  if (isActive) {
    playActiveVoiceStep({
      track, effectivePattern: effectivePatternForSteps, cellIdx, localCell,
      singleStepSec, phrase, time, tracks, soloPatternPlayId, globalSwing,
      currentMeasureBpm, currentVocalMode, hasVocalSample, isDocHidden,
      busChannels, channels
    });
  } else {
    const isPreRolling = useSequencerStore.getState().isPreRolling || currentMeasureLocal < 0;
    evaluateFreeStepAnacrusis({
      track, targetAnacrusisPat: nextPattern || null, cellIdx: localCell,
      stepCount: phrase.cellsPerMeasure, singleStepSec, time, tracks,
      globalSwing, currentMeasureBpm, currentVocalMode, isDocHidden,
      isPreRolling, busChannels, channels
    });
  }
}
