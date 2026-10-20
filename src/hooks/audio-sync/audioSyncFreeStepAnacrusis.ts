import * as Tone from 'tone';
import { Track, Pattern, GlobalSwing } from '../../types';
import { getEffectiveVolume } from '../../stores/useSequencerStore';
import { faderPositionToGain } from '../../utils/audioMath';
import { pushVisualHitTrigger } from '../../audio/visualTickBuffer';
import { getBalancoOffsetSec } from '../../utils/balancoUtils';
import { isVoiceHoldNote, isVoiceStepProlongation } from '../../utils/musicTheory';
import { capVoiceNoteSteps } from '../../utils/voiceNoteDuration';
import { noteToFrequency, getVoiceNoteStepsFromDecay, isVocalSamplePattern, isSamplePlaybackAllowed, getVocalBufferForPattern } from './vocalSampleHelpers';
import { playNativeVoiceSynth } from '../../audio/nativeSynths';
import { audioEngine } from './audioEngineNodes';

export interface FreeStepAnacrusisParams {
  track: Track;
  targetAnacrusisPat: Pattern | null;
  cellIdx: number;
  stepCount: number;
  singleStepSec: number;
  time: number;
  tracks: Track[];
  globalSwing: GlobalSwing;
  currentMeasureBpm: number;
  currentVocalMode: string;
  isDocHidden: boolean;
  isPreRolling: boolean;
  busChannels: Record<string | number, Tone.Channel>;
  channels: Record<string | number, Tone.Channel>;
}

export function evaluateFreeStepAnacrusis(p: FreeStepAnacrusisParams): void {
  const {
    track, targetAnacrusisPat, cellIdx, stepCount, singleStepSec,
    time, tracks, globalSwing, currentMeasureBpm, currentVocalMode,
    isDocHidden, isPreRolling, busChannels, channels
  } = p;

  if (!targetAnacrusisPat) return;
  const preRollState = targetAnacrusisPat.preRollActiveSteps?.[cellIdx];
  const isPreActive = preRollState !== undefined && preRollState !== null && preRollState !== 0 && preRollState !== '0';
  if (!isPreActive) return;

  const balancoOffsetSec = getBalancoOffsetSec({
    stepIdx: cellIdx,
    steps: stepCount,
    beatResolutions: targetAnacrusisPat.beatResolutions,
    track,
    pattern: targetAnacrusisPat,
    globalSwing,
    bpm: currentMeasureBpm,
    isPreRoll: true,
  });
  const preRollMicroVal = targetAnacrusisPat.preRollMicrotimings?.[cellIdx] ?? targetAnacrusisPat.microtimings?.[cellIdx] ?? 0;
  const preRollMicroPct = Array.isArray(preRollMicroVal) ? (preRollMicroVal[0] ?? 0) : (typeof preRollMicroVal === 'number' ? preRollMicroVal : 0);
  const microOffsetSec = (preRollMicroPct / 100) * singleStepSec * 0.5;
  const triggerTime = time + balancoOffsetSec + microOffsetSec;

  const isConnectedToBus = Boolean(track?.busId && busChannels[track.busId]);
  const trackVolPct = track ? (isConnectedToBus ? (track.volumeVal ?? 75) : getEffectiveVolume(tracks, track.id)) : 75;

  if (!isDocHidden && !isPreRolling) {
    const stateCode = typeof preRollState === 'number' ? preRollState : (typeof preRollState === 'string' ? (preRollState.charCodeAt(0) || 1) : 1);
    pushVisualHitTrigger(track.id, cellIdx, stateCode, triggerTime);
  }

  const anacrusisVocalBuf = getVocalBufferForPattern(track.id, targetAnacrusisPat);
  const allowAnacrusisSample = isSamplePlaybackAllowed(currentVocalMode);
  const anacrusisHasSample = Boolean(anacrusisVocalBuf && isVocalSamplePattern(targetAnacrusisPat) && allowAnacrusisSample);
  const allowAnacrusisSynth = currentVocalMode === 'synth' || currentVocalMode === 'both' || !anacrusisHasSample;

  if (allowAnacrusisSynth && trackVolPct > 3) {
    const preNote = targetAnacrusisPat.preRollNotes?.[cellIdx];
    const noteVal = typeof preNote === 'string' ? preNote.trim() : '';
    const preRollLyrics = targetAnacrusisPat.preRollLyrics || [];
    const preRollCurSyl = preRollLyrics[cellIdx];
    const prevActiveState = cellIdx > 0 ? targetAnacrusisPat.preRollActiveSteps?.[cellIdx - 1] : 0;
    const prevIsActive = prevActiveState !== undefined && prevActiveState !== null && prevActiveState !== 0 && prevActiveState !== '0';
    const prevRawNote = cellIdx > 0 ? (targetAnacrusisPat.preRollNotes?.[cellIdx - 1] || '') : '';
    const prevNoteVal = typeof prevRawNote === 'string' ? prevRawNote.trim() : '';

    const isProlongation = isVoiceStepProlongation(isPreActive, prevIsActive, noteVal, prevNoteVal, preRollCurSyl);
    if (!isProlongation && noteVal && !isVoiceHoldNote(noteVal)) {
      let spanSteps = 1;
      const preRollTotal = targetAnacrusisPat.preRollActiveSteps?.length || 16;
      let nextPreIdx = cellIdx + 1;
      while (nextPreIdx < preRollTotal) {
        const nextState = targetAnacrusisPat.preRollActiveSteps?.[nextPreIdx];
        const nextIsActive = nextState !== undefined && nextState !== null && nextState !== 0 && nextState !== '0';
        const nextRawNote = targetAnacrusisPat.preRollNotes?.[nextPreIdx];
        const nextNoteVal = typeof nextRawNote === 'string' ? nextRawNote.trim() : '';
        const nextSyl = preRollLyrics[nextPreIdx];
        if (isVoiceStepProlongation(nextIsActive, true, nextNoteVal, noteVal, nextSyl)) {
          spanSteps++;
          nextPreIdx++;
        } else break;
      }

      const decayVal = targetAnacrusisPat.preRollDecays?.[cellIdx] ?? 10;
      const decayNum = Array.isArray(decayVal) ? (decayVal[0] ?? 10) : (typeof decayVal === 'number' ? decayVal : 10);
      const numDecaySteps = getVoiceNoteStepsFromDecay(decayNum);
      const effectiveSteps = capVoiceNoteSteps({ spanSteps, decaySteps: numDecaySteps, activeSteps: targetAnacrusisPat.preRollActiveSteps, startIdx: cellIdx + spanSteps, totalSteps: preRollTotal });
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
  }
}
