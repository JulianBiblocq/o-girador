import * as Tone from 'tone';
import { Track, GlobalSwing } from '../../types';
import { instrumentsConfig } from '../../data';
import { getEffectiveMuteState, useSequencerStore } from '../../stores/useSequencerStore';
import { pushVisualHitTrigger } from '../../audio/visualTickBuffer';
import { AudioEngine } from '../../AudioEngine';
import { resolveFallbackApitoHoldSpec } from '../../audio/barulho/apitoFallbackHoldResolver';
import { isApitoSustainSymbol } from '../../audio/barulho/apitoBreathCutPlanner';
import { isTrackCoveredInWorkletHorizon } from '../../audio/worklet/horizon/percussionHorizonPusher';
import { computePercussionNoteSwing, resolveActivePatternForMeasure } from './percussionSwingHelper';
import { getLiveVariationAudioOverride } from './liveVariationLookaheadEngine';
import { resolveTrackFromPackedData } from '../../workers/compiler/compiledTrackIdResolver';
import { getRodaStepDurationTicks } from '../../utils/rodaTimeSigGeometry';
import { isTrackMutedByPracticeMode } from '../../utils/practiceAudioMuteGuard';

export interface PercussionSchedulerParams {
  time: number; stepIdx: number; currentTicks: number; currentMeasureIdx: number; currentTimeSig?: string;
  tick96nSec: number; swingJitter: number; globalMode: string; stepDurationSec: number;
  isDocHidden: boolean; tracks: Track[]; soloPatternPlayId: number | null;
  globalSwing: GlobalSwing; familyMuteSet: Set<string>; flatCompiledSchedule: Float64Array | null;
  flatArrayPointerRef: { current: number }; lastCompiledScheduleRef: { current: Float64Array | null };
  lastAbsoluteTickRef: { current: number }; currentMeasureStartTick: number;
  audioEngine: AudioEngine | null; busChannels: Record<string | number, Tone.Channel>;
}

function triggerPackedNote(
  packedData: number, velocity: number, microtimingPct: number,
  p: PercussionSchedulerParams, sourceSchedule: object | null, skipTrackIds?: Set<number>
): void {
  const { time, currentMeasureIdx, currentTimeSig = '4/4', tick96nSec, swingJitter, globalMode, isDocHidden, tracks, soloPatternPlayId, globalSwing, familyMuteSet, audioEngine } = p;
  const liveTrack = resolveTrackFromPackedData(packedData, tracks, sourceSchedule);
  if (!liveTrack || (skipTrackIds && skipTrackIds.has(liveTrack.id))) return;

  const inst = instrumentsConfig[liveTrack.instrumentIdx];
  if (!inst) return;

  const circleStepIdx = (packedData >> 16) & 0x3F;
  const strokeCharCode = (packedData >> 9) & 0x7F;
  const decayPct = (packedData >> 2) & 0x7F;
  const isTuplet = ((packedData >> 1) & 1) === 1;

  const isMuted = soloPatternPlayId !== null ? false : getEffectiveMuteState(tracks, liveTrack.id);
  if (isMuted) return;

  const strokeSymbol = String.fromCharCode(strokeCharCode);
  const decayMultiplier = decayPct / 100;
  const activePattern = resolveActivePatternForMeasure(liveTrack, tracks, currentMeasureIdx, soloPatternPlayId);
  const stepDurSec = tick96nSec * getRodaStepDurationTicks(currentTimeSig, activePattern, circleStepIdx);

  const noteSwingOffset = computePercussionNoteSwing({
    activePattern, liveTrack, circleStepIdx, isTuplet, swingJitter, globalMode, globalSwing,
    stepDurationSec: stepDurSec,
    balancoAdherence: audioEngine ? audioEngine.getTrackBalancoAdherence(liveTrack.id) : 1.0,
    baseStepAudioSec: time,
    timeSig: currentTimeSig,
  });

  const microOffset = (microtimingPct / 100) * stepDurSec * 0.5;
  const triggerTime = time + noteSwingOffset + microOffset;
  const nowSec = audioEngine ? audioEngine.getCurrentTime() : 0;
  const isPastCatchupHit = Boolean(audioEngine && triggerTime < nowSec - 0.015);

  const storeState = useSequencerStore.getState();
  const isPracticeMuted = soloPatternPlayId !== null ? false : isTrackMutedByPracticeMode(liveTrack.id, tracks || storeState.tracks, storeState, familyMuteSet);

  if (!isPracticeMuted && !isPastCatchupHit) {
    const isCoveredByWorklet = Boolean(
      audioEngine?.isTrackRoutedToWorklet(liveTrack.id, inst.id) &&
      isTrackCoveredInWorkletHorizon(currentMeasureIdx, liveTrack.id)
    );
    if (isCoveredByWorklet) {
      if (inst.id === 'apito' && strokeSymbol !== '/' && strokeSymbol !== '.') {
        Tone.Draw?.schedule?.(() => {
          window.dispatchEvent(new CustomEvent('o-girador-apito-shake'));
        }, triggerTime);
      }
    } else {
      let maxBarulhoDurSec: number | undefined;
      if (inst.id === 'apito' && isApitoSustainSymbol(strokeSymbol)) {
        const spec = resolveFallbackApitoHoldSpec(activePattern?.activeSteps, circleStepIdx, stepDurSec);
        maxBarulhoDurSec = spec.fadeOutSec <= 0.0125 ? -spec.holdDurSec : spec.holdDurSec;
      }
      audioEngine?.playNote(liveTrack.id, strokeSymbol, triggerTime, velocity, decayMultiplier, false, maxBarulhoDurSec);
    }
  }
  if (!isDocHidden && !storeState.isPreRolling && currentMeasureIdx >= 0 && !isPastCatchupHit) {
    pushVisualHitTrigger(liveTrack.id, circleStepIdx, strokeCharCode, triggerTime);
  }
}

export function schedulePercussionNotes(p: PercussionSchedulerParams): void {
  const { stepIdx, flatCompiledSchedule, flatArrayPointerRef, lastCompiledScheduleRef, lastAbsoluteTickRef, currentMeasureStartTick } = p;
  const currentAbsoluteTick = currentMeasureStartTick + stepIdx;
  const flatArray = flatCompiledSchedule;
  if (!flatArray) return;

  const { variedTrackIds, variationNotes } = getLiveVariationAudioOverride();
  const len = flatArray.length;
  let ptr = flatArrayPointerRef.current;

  if (flatArray !== lastCompiledScheduleRef.current || currentAbsoluteTick < lastAbsoluteTickRef.current || currentAbsoluteTick - lastAbsoluteTickRef.current > 5) {
    ptr = 0;
    while (ptr < len && flatArray[ptr] < currentAbsoluteTick) ptr += 4;
    lastCompiledScheduleRef.current = flatArray;
  }
  lastAbsoluteTickRef.current = currentAbsoluteTick;

  while (ptr < len) {
    const noteTick = flatArray[ptr];
    if (noteTick > currentAbsoluteTick) break;
    if (noteTick === currentAbsoluteTick) {
      triggerPackedNote(flatArray[ptr + 1], flatArray[ptr + 2], flatArray[ptr + 3], p, flatArray, variedTrackIds);
    }
    ptr += 4;
  }
  flatArrayPointerRef.current = ptr;

  for (let vPtr = 0; vPtr < variationNotes.length; vPtr += 4) {
    if (variationNotes[vPtr] === currentAbsoluteTick) {
      triggerPackedNote(variationNotes[vPtr + 1], variationNotes[vPtr + 2], variationNotes[vPtr + 3], p, variationNotes as any);
    }
  }
}
