import * as Tone from 'tone';
import { Track, Pattern, GlobalSwing } from '../../types';
import { getEffectiveVolume } from '../../stores/useSequencerStore';
import { faderPositionToGain } from '../../utils/audioMath';
import { pushVisualHitTrigger } from '../../audio/visualTickBuffer';
import { getBalancoOffsetSec } from '../../utils/balancoUtils';
import { isVoiceHoldNote, isVoiceStepProlongation } from '../../utils/musicTheory';
import { capVoiceNoteSteps } from '../../utils/voiceNoteDuration';
import { noteToFrequency, getVoiceNoteStepsFromDecay } from './vocalSampleHelpers';
import { playNativeVoiceSynth } from '../../audio/nativeSynths';
import { audioEngine } from './audioEngineNodes';

export interface ActiveVoiceStepParams {
  track: Track;
  effectivePattern: Pattern;
  cellIdx: number;
  localCell: number;
  singleStepSec: number;
  phrase: any;
  time: number;
  tracks: Track[];
  soloPatternPlayId: number | null;
  globalSwing: GlobalSwing;
  currentMeasureBpm: number;
  currentVocalMode: string;
  hasVocalSample: boolean;
  isDocHidden: boolean;
  busChannels: Record<string | number, Tone.Channel>;
  channels: Record<string | number, Tone.Channel>;
}

export function playActiveVoiceStep(p: ActiveVoiceStepParams): void {
  const {
    track, effectivePattern, cellIdx, localCell, singleStepSec,
    phrase, time, tracks, soloPatternPlayId, globalSwing,
    currentMeasureBpm, currentVocalMode, hasVocalSample,
    isDocHidden, busChannels, channels
  } = p;

  const state = effectivePattern.activeSteps[cellIdx];
  const balancoOffsetSec = localCell === 0 ? 0 : getBalancoOffsetSec({
    stepIdx: localCell,
    steps: phrase.cellsPerMeasure,
    beatResolutions: effectivePattern.beatResolutions,
    track,
    pattern: effectivePattern,
    globalSwing,
    bpm: currentMeasureBpm,
    isPreRoll: false,
  });

  const microVal = effectivePattern.microtimings?.[cellIdx] ?? 0;
  const microPct = Array.isArray(microVal) ? (microVal[0] ?? 0) : (typeof microVal === 'number' ? microVal : 0);
  const microOffsetSec = (microPct / 100) * singleStepSec * 0.5;
  const triggerTime = time + balancoOffsetSec + microOffsetSec;

  const isSoloTrack = (soloPatternPlayId !== null) && track.patterns.some(pat => String(pat.id) === String(soloPatternPlayId));
  const isConnectedToBus = Boolean(track?.busId && busChannels[track.busId]);
  let trackVolPct = track ? (isConnectedToBus ? (track.volumeVal ?? 75) : getEffectiveVolume(tracks, track.id)) : 75;
  if (isSoloTrack && trackVolPct <= 3) trackVolPct = 75;

  const rawNote = effectivePattern.notes?.[cellIdx];
  const noteVal = typeof rawNote === 'string' ? rawNote.trim() : '';
  const lyrics = effectivePattern.lyrics || [];
  const curSyl = lyrics[cellIdx];

  const preRollTotal = effectivePattern.preRollActiveSteps?.length || 0;
  const lastPreRollIdx = preRollTotal - 1;
  const prevActiveState = cellIdx > 0
    ? effectivePattern.activeSteps[cellIdx - 1]
    : (preRollTotal > 0 ? effectivePattern.preRollActiveSteps?.[lastPreRollIdx] : 0);
  const prevIsActive = prevActiveState !== undefined && prevActiveState !== null && prevActiveState !== 0 && prevActiveState !== '0';
  const prevRawNote = cellIdx > 0
    ? effectivePattern.notes?.[cellIdx - 1]
    : (preRollTotal > 0 ? (effectivePattern.preRollNotes?.[lastPreRollIdx] || '') : '');
  const prevNoteVal = typeof prevRawNote === 'string' ? prevRawNote.trim() : '';

  const isProlongation = isVoiceStepProlongation(true, prevIsActive, noteVal, prevNoteVal, curSyl);
  const allowSynthPlayback = currentVocalMode === 'synth' || currentVocalMode === 'both' || !hasVocalSample;

  if (allowSynthPlayback && trackVolPct > 3 && !isProlongation && noteVal && !isVoiceHoldNote(noteVal)) {
    let spanSteps = 1;
    const stepCount = effectivePattern.steps;
    let nextIdx = cellIdx + 1;
    while (nextIdx < stepCount) {
      const nextState = effectivePattern.activeSteps[nextIdx];
      const nextIsActive = nextState !== undefined && nextState !== null && nextState !== 0 && nextState !== '0';
      const nextRawNote = effectivePattern.notes?.[nextIdx];
      const nextNoteVal = typeof nextRawNote === 'string' ? nextRawNote.trim() : '';
      const nextSyl = lyrics[nextIdx];
      if (isVoiceStepProlongation(nextIsActive, true, nextNoteVal, noteVal, nextSyl)) {
        spanSteps++;
        nextIdx++;
      } else break;
    }

    const decayVal = effectivePattern.decays?.[cellIdx] ?? 10;
    const decayNum = Array.isArray(decayVal) ? (decayVal[0] ?? 10) : (typeof decayVal === 'number' ? decayVal : 10);
    const numDecaySteps = getVoiceNoteStepsFromDecay(decayNum);
    const effectiveSteps = capVoiceNoteSteps({ spanSteps, decaySteps: numDecaySteps, activeSteps: effectivePattern.activeSteps, startIdx: cellIdx + spanSteps, totalSteps: stepCount });
    const durationSec = Math.max(0.05, effectiveSteps * singleStepSec * 0.95);
    const trackVolLinear = faderPositionToGain(trackVolPct);
    const velocity = Math.max(0.2, Math.min(1.0, trackVolLinear));

    if (audioEngine) {
      audioEngine.triggerVoiceAttackRelease(noteVal, durationSec, triggerTime, velocity, track.id);
    } else {
      const noteFreq = noteToFrequency(noteVal);
      playNativeVoiceSynth(noteFreq, triggerTime, durationSec, trackVolLinear, channels[track.id]);
    }
  }

  if (!isDocHidden) {
    const stateCode = typeof state === 'number' ? state : (typeof state === 'string' ? (state.charCodeAt(0) || 1) : (state[0] ? (state[0].charCodeAt(0) || 1) : 1));
    pushVisualHitTrigger(track.id, cellIdx, stateCode, triggerTime);
  }
}
