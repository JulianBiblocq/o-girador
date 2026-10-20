import * as Tone from 'tone';
import { Track, Pattern } from '../../types';
import { faderPositionToGain } from '../../utils/audioMath';
import { pushVisualHitTrigger } from '../../audio/visualTickBuffer';
import { isVoiceHoldNote, isVoiceStepProlongation } from '../../utils/musicTheory';
import { capVoiceNoteSteps } from '../../utils/voiceNoteDuration';
import { noteToFrequency, getVoiceNoteStepsFromDecay } from './vocalSampleHelpers';
import { playNativeVoiceSynth } from '../../audio/nativeSynths';
import { audioEngine } from './audioEngineNodes';
import { useSequencerStore } from '../../stores/useSequencerStore';

export function schedulePreRollSyllables(
  track: Track,
  activePattern: Pattern,
  runwayStartTime: number,
  runwayStepDurationSec: number,
  vocalVol: number,
  hasVocalSample: boolean,
  channels: Record<string | number, Tone.Channel>
): void {
  if (!activePattern.preRollActiveSteps) return;

  for (let s = 0; s < 16; s++) {
    const preRollState = activePattern.preRollActiveSteps[s];
    const isPreActive = preRollState !== undefined && preRollState !== null && preRollState !== 0 && preRollState !== '0';
    if (!isPreActive) continue;

    const stepTime = runwayStartTime + s * runwayStepDurationSec;
    if (!useSequencerStore.getState().isPreRolling) {
      const stateCode = typeof preRollState === 'number' ? preRollState : (typeof preRollState === 'string' ? (preRollState.charCodeAt(0) || 1) : 1);
      pushVisualHitTrigger(track.id, s, stateCode, stepTime);
    }

    if (!hasVocalSample && vocalVol > 0) {
      const preNote = activePattern.preRollNotes?.[s];
      const noteVal = typeof preNote === 'string' ? preNote.trim() : '';
      const preRollLyrics = activePattern.preRollLyrics || [];
      const curSyl = preRollLyrics[s];
      const prevActiveState = s > 0 ? activePattern.preRollActiveSteps?.[s - 1] : 0;
      const prevIsActive = prevActiveState !== undefined && prevActiveState !== null && prevActiveState !== 0 && prevActiveState !== '0';
      const prevRawNote = s > 0 ? (activePattern.preRollNotes?.[s - 1] || '') : '';
      const prevNoteVal = typeof prevRawNote === 'string' ? prevRawNote.trim() : '';

      const isProlongation = isVoiceStepProlongation(isPreActive, prevIsActive, noteVal, prevNoteVal, curSyl);
      if (!isProlongation && noteVal && !isVoiceHoldNote(noteVal)) {
        let spanSteps = 1;
        const preRollTotal = activePattern.preRollActiveSteps?.length || 16;
        let nextPreIdx = s + 1;
        while (nextPreIdx < preRollTotal) {
          const nextState = activePattern.preRollActiveSteps?.[nextPreIdx];
          const nextIsActive = nextState !== undefined && nextState !== null && nextState !== 0 && nextState !== '0';
          const nextRawNote = activePattern.preRollNotes?.[nextPreIdx];
          const nextNoteVal = typeof nextRawNote === 'string' ? nextRawNote.trim() : '';
          const nextSyl = preRollLyrics[nextPreIdx];
          if (isVoiceStepProlongation(nextIsActive, true, nextNoteVal, noteVal, nextSyl)) {
            spanSteps++;
            nextPreIdx++;
          } else break;
        }

        const decayVal = activePattern.preRollDecays?.[s] ?? 10;
        const decayNum = Array.isArray(decayVal) ? (decayVal[0] ?? 10) : (typeof decayVal === 'number' ? decayVal : 10);
        const numDecaySteps = getVoiceNoteStepsFromDecay(decayNum);
        const effectiveSteps = capVoiceNoteSteps({ spanSteps, decaySteps: numDecaySteps, activeSteps: activePattern.preRollActiveSteps, startIdx: s + spanSteps, totalSteps: preRollTotal });
        const durationSec = Math.max(0.05, effectiveSteps * runwayStepDurationSec * 0.95);
        const trackVolLinear = faderPositionToGain(vocalVol);
        const velocity = Math.max(0.2, Math.min(1.0, trackVolLinear));

        if (audioEngine) {
          audioEngine.triggerVoiceAttackRelease(noteVal, durationSec, stepTime, velocity, track.id);
        } else {
          const noteFreq = noteToFrequency(noteVal);
          playNativeVoiceSynth(noteFreq, stepTime, durationSec, trackVolLinear, channels[track.id]);
        }
      }
    }
  }
}
