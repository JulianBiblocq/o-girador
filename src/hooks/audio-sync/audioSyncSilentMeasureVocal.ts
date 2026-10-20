import * as Tone from 'tone';
import { Track, Pattern, GlobalSwing } from '../../types';
import { getEffectiveVolume } from '../../stores/useSequencerStore';
import { faderPositionToGain } from '../../utils/audioMath';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { isVocalSamplePattern, getVocalBufferForPattern, noteToFrequency } from './vocalSampleHelpers';
import { pushVisualHitTrigger } from '../../audio/visualTickBuffer';
import { matchVocalStepAtTick } from '../../utils/vocalTimingUtils';
import { getBalancoOffsetSec } from '../../utils/balancoUtils';
import { isVoiceHoldNote, isVoiceStepProlongation } from '../../utils/musicTheory';
import { capVoiceNoteSteps } from '../../utils/voiceNoteDuration';
import { playNativeVoiceSynth } from '../../audio/nativeSynths';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { audioEngine } from './audioEngineNodes';

export interface SilentMeasureVocalParams {
  track: Track;
  nextPattern: Pattern;
  nextPhrase: any;
  currentMeasureLocal: number;
  stepIdx: number;
  currentTicks: number;
  time: number;
  tracks: Track[];
  measureTimeSigs: Record<number, string>;
  globalSwing: GlobalSwing;
  isDocHidden: boolean;
  currentMeasureIdx: number;
  busChannels: Record<string | number, Tone.Channel>;
  channels: Record<string | number, Tone.Channel>;
}

export function evaluateSilentMeasurePreRollSyllables(p: SilentMeasureVocalParams): void {
  const {
    track, nextPattern, nextPhrase, currentMeasureLocal, stepIdx,
    currentTicks, time, tracks, measureTimeSigs, globalSwing,
    isDocHidden, currentMeasureIdx, busChannels, channels
  } = p;

  if (!nextPattern.preRollActiveSteps) return;

  const preBeats = getBeatsPerMeasure(measureTimeSigs[currentMeasureLocal] || '4/4');
  const currentMeasureBpm = useSequencerStore.getState().measureBpms[currentMeasureLocal] || useSequencerStore.getState().bpm;
  const preStepMatch = matchVocalStepAtTick(stepIdx, nextPattern.beatResolutions, preBeats, currentTicks, currentMeasureBpm);
  if (preStepMatch === null) return;

  const cellIdx = preStepMatch.localCell;
  const preRollState = nextPattern.preRollActiveSteps[cellIdx];
  const isPreActive = preRollState !== undefined && preRollState !== null && preRollState !== 0 && preRollState !== '0';
  if (!isPreActive) return;

  const balancoOffsetSec = getBalancoOffsetSec({
    stepIdx: cellIdx,
    steps: nextPhrase ? nextPhrase.cellsPerMeasure : (nextPattern.steps || 16),
    beatResolutions: nextPattern.beatResolutions,
    track,
    pattern: nextPattern,
    globalSwing,
    bpm: currentMeasureBpm,
    isPreRoll: true,
  });
  const preRollMicroVal = nextPattern.preRollMicrotimings?.[cellIdx] ?? nextPattern.microtimings?.[cellIdx] ?? 0;
  const preRollMicroPct = Array.isArray(preRollMicroVal) ? (preRollMicroVal[0] ?? 0) : (typeof preRollMicroVal === 'number' ? preRollMicroVal : 0);
  const stepDurSec = preStepMatch.singleStepSec;
  const microOffsetSec = (preRollMicroPct / 100) * stepDurSec * 0.5;
  const triggerTime = time + balancoOffsetSec + microOffsetSec;

  const isConnectedToBus = Boolean(track?.busId && busChannels[track.busId]);
  const trackVolPct = track ? (isConnectedToBus ? (track.volumeVal ?? 75) : getEffectiveVolume(tracks, track.id)) : 75;

  if (!isDocHidden) {
    const isPreRolling = useSequencerStore.getState().isPreRolling || currentMeasureIdx < 0;
    if (!isPreRolling) {
      const stateCode = typeof preRollState === 'number' ? preRollState : (typeof preRollState === 'string' ? (preRollState.charCodeAt(0) || 1) : 1);
      pushVisualHitTrigger(track.id, cellIdx, stateCode, triggerTime);
    }
  }

  const anacrusisVocalBuf = getVocalBufferForPattern(track.id, nextPattern);
  const anacrusisHasSample = Boolean(anacrusisVocalBuf && isVocalSamplePattern(nextPattern));
  if (anacrusisHasSample || trackVolPct <= 3) return;

  const preNote = nextPattern.preRollNotes?.[cellIdx];
  const noteVal = typeof preNote === 'string' ? preNote.trim() : '';
  const preRollLyrics = nextPattern.preRollLyrics || [];
  const preRollCurSyl = preRollLyrics[cellIdx];
  const prevActiveState = cellIdx > 0 ? nextPattern.preRollActiveSteps?.[cellIdx - 1] : 0;
  const prevIsActive = prevActiveState !== undefined && prevActiveState !== null && prevActiveState !== 0 && prevActiveState !== '0';
  const prevRawNote = cellIdx > 0 ? (nextPattern.preRollNotes?.[cellIdx - 1] || '') : '';
  const prevNoteVal = typeof prevRawNote === 'string' ? prevRawNote.trim() : '';

  const isProlongation = isVoiceStepProlongation(isPreActive, prevIsActive, noteVal, prevNoteVal, preRollCurSyl);
  if (isProlongation || !noteVal || isVoiceHoldNote(noteVal)) return;

  let spanSteps = 1;
  const preRollTotal = nextPattern.preRollActiveSteps?.length || 16;
  let nextPreIdx = cellIdx + 1;
  while (nextPreIdx < preRollTotal) {
    const nextState = nextPattern.preRollActiveSteps?.[nextPreIdx];
    const nextIsActive = nextState !== undefined && nextState !== null && nextState !== 0 && nextState !== '0';
    const nextRawNote = nextPattern.preRollNotes?.[nextPreIdx];
    const nextNoteVal = typeof nextRawNote === 'string' ? nextRawNote.trim() : '';
    const nextSyl = preRollLyrics[nextPreIdx];
    if (isVoiceStepProlongation(nextIsActive, true, nextNoteVal, noteVal, nextSyl)) {
      spanSteps++;
      nextPreIdx++;
    } else break;
  }

  const decayVal = nextPattern.preRollDecays?.[cellIdx] ?? 10;
  const decayNum = Array.isArray(decayVal) ? (decayVal[0] ?? 10) : (typeof decayVal === 'number' ? decayVal : 10);
  const numDecaySteps = (decayNum / 100) * 16;
  const effectiveSteps = capVoiceNoteSteps({ spanSteps, decaySteps: numDecaySteps, activeSteps: nextPattern.preRollActiveSteps, startIdx: cellIdx + spanSteps, totalSteps: preRollTotal });
  const durationSec = Math.max(0.05, effectiveSteps * stepDurSec * 0.95);
  const trackVolLinear = faderPositionToGain(trackVolPct);
  const velocity = Math.max(0.2, Math.min(1.0, trackVolLinear));

  if (audioEngine) {
    audioEngine.triggerVoiceAttackRelease(noteVal, durationSec, triggerTime, velocity, track.id);
  } else {
    const noteFreq = noteToFrequency(noteVal);
    playNativeVoiceSynth(noteFreq, triggerTime, durationSec, trackVolLinear, channels[track.id]);
  }
}
