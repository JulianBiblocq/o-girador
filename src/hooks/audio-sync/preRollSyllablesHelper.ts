import * as Tone from 'tone';
import { Track, Pattern } from '../../types';
import { faderPositionToGain } from '../../utils/audioMath';
import { pushVisualHitTrigger } from '../../audio/visualTickBuffer';
import {
  isVoiceHoldNote,
  isVoiceStepProlongation,
  isVoiceMelismaStep,
  resolveEffectiveVoicePitch,
} from '../../utils/musicTheory';
import { capVoiceNoteSteps } from '../../utils/voiceNoteDuration';
import { noteToFrequency, getVoiceNoteStepsFromDecay } from './vocalSampleHelpers';
import { scanVoiceLegatoChain } from './voiceLegatoChainScanner';
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
  const preRollTotal = activePattern.preRollActiveSteps.length || 16;

  for (let s = 0; s < 16; s++) {
    const preRollState = activePattern.preRollActiveSteps[s];
    const isPreActive = preRollState !== undefined && preRollState !== null && preRollState !== 0 && preRollState !== '0';
    if (!isPreActive) continue;

    const stepTime = runwayStartTime + s * runwayStepDurationSec;
    if (!useSequencerStore.getState().isPreRolling) {
      const stateCode = typeof preRollState === 'number' ? preRollState : (typeof preRollState === 'string' ? (preRollState.charCodeAt(0) || 1) : 1);
      pushVisualHitTrigger(track.id, s, stateCode, stepTime);
    }

    const isPitchIgnored = Boolean(activePattern.ignoreMelodyPitch || useSequencerStore.getState().metadata?.ignoreMelodyPitch);
    if (!isPitchIgnored && !hasVocalSample && vocalVol > 0) {
      const preNote = activePattern.preRollNotes?.[s];
      const noteVal = typeof preNote === 'string' ? preNote.trim() : '';
      const preRollLyrics = activePattern.preRollLyrics || [];
      const curSyl = preRollLyrics[s];
      const prevActiveState = s > 0 ? activePattern.preRollActiveSteps?.[s - 1] : 0;
      const prevIsActive = prevActiveState !== undefined && prevActiveState !== null && prevActiveState !== 0 && prevActiveState !== '0';
      const prevEffectivePitch = s > 0
        ? resolveEffectiveVoicePitch(activePattern.preRollNotes, activePattern.preRollActiveSteps, s - 1)
        : '';

      const isProlongation = isVoiceStepProlongation(isPreActive, prevIsActive, noteVal, prevEffectivePitch, curSyl);
      const isMelisma = Boolean(prevEffectivePitch) && isVoiceMelismaStep(isPreActive, s > 0 && prevIsActive, noteVal, prevEffectivePitch, curSyl);
      if (!isProlongation && !isMelisma && noteVal && !isVoiceHoldNote(noteVal)) {
        const { spanSteps, melismaGlides } = scanVoiceLegatoChain(
          activePattern.preRollActiveSteps, activePattern.preRollNotes, preRollLyrics, s, preRollTotal, noteVal, runwayStepDurationSec
        );
        const decayVal = activePattern.preRollDecays?.[s] ?? 10;
        const decayNum = Array.isArray(decayVal) ? (decayVal[0] ?? 10) : (typeof decayVal === 'number' ? decayVal : 10);
        const numDecaySteps = getVoiceNoteStepsFromDecay(decayNum);
        const effectiveSteps = capVoiceNoteSteps({ spanSteps, decaySteps: numDecaySteps, activeSteps: activePattern.preRollActiveSteps, startIdx: s + spanSteps, totalSteps: preRollTotal });
        const durationSec = Math.max(0.05, effectiveSteps * runwayStepDurationSec * 0.95);
        const trackVolLinear = faderPositionToGain(vocalVol);
        const velocity = Math.max(0.2, Math.min(1.0, trackVolLinear));

        if (audioEngine) {
          audioEngine.triggerVoiceAttackRelease(noteVal, durationSec, stepTime, velocity, track.id, melismaGlides);
        } else {
          const noteFreq = noteToFrequency(noteVal);
          playNativeVoiceSynth(noteFreq, stepTime, durationSec, trackVolLinear, channels[track.id], melismaGlides);
        }
      }
    }
  }
}
