import * as Tone from 'tone';
import { Track, Pattern, GlobalSwing } from '../../types';
import { instrumentsConfig } from '../../data';
import { getTrackFamilyIds, getEffectiveVolume, getEffectiveMuteState, useSequencerStore } from '../../stores/useSequencerStore';
import { hasActiveTrackAutomation } from '../../utils/automationDetectHelper';
import { pushVisualHitTrigger } from '../../audio/visualTickBuffer';
import { AudioEngine } from '../../AudioEngine';
import { computePercussionNoteSwing } from './percussionSwingHelper';
import { getLiveVariationAudioOverride } from './liveVariationLookaheadEngine';

export interface PercussionSchedulerParams {
  time: number; stepIdx: number; currentTicks: number; currentMeasureIdx: number;
  tick96nSec: number; swingJitter: number; globalMode: string; stepDurationSec: number;
  isDocHidden: boolean; tracks: Track[]; soloPatternPlayId: number | null;
  globalSwing: GlobalSwing; familyMuteSet: Set<string>; flatCompiledSchedule: Float64Array | null;
  flatArrayPointerRef: { current: number }; lastCompiledScheduleRef: { current: Float64Array | null };
  lastAbsoluteTickRef: { current: number }; currentMeasureStartTick: number;
  audioEngine: AudioEngine | null; busChannels: Record<string | number, Tone.Channel>;
}

function triggerPackedNote(
  packedData: number, velocity: number, microtimingPct: number,
  p: PercussionSchedulerParams, skipTrackIds?: Set<number>
): void {
  const { time, currentTicks, currentMeasureIdx, tick96nSec, swingJitter, globalMode, stepDurationSec, isDocHidden, tracks, soloPatternPlayId, globalSwing, familyMuteSet, audioEngine, busChannels } = p;
  const trackIdx = (packedData >> 22) & 0x3FF;
  const liveTrack = tracks[trackIdx];
  if (!liveTrack || (skipTrackIds && skipTrackIds.has(liveTrack.id))) return;

  const inst = instrumentsConfig[liveTrack.instrumentIdx];
  if (!inst) return;

  const circleStepIdx = (packedData >> 16) & 0x3F;
  const strokeCharCode = (packedData >> 9) & 0x7F;
  const decayPct = (packedData >> 2) & 0x7F;
  const isTuplet = ((packedData >> 1) & 1) === 1;

  const isConnectedToBus = Boolean(liveTrack.busId && busChannels[liveTrack.busId]);
  const trackVolPct = isConnectedToBus ? (liveTrack.volumeVal ?? 75) : getEffectiveVolume(tracks, liveTrack.id);
  const isMuted = soloPatternPlayId !== null ? false : getEffectiveMuteState(tracks, liveTrack.id);
  if (isMuted || (soloPatternPlayId === null && trackVolPct <= 3 && !hasActiveTrackAutomation(liveTrack, 'volume'))) return;

  const strokeSymbol = String.fromCharCode(strokeCharCode);
  const decayMultiplier = decayPct / 100;
  const patterns = liveTrack.patterns;
  let activePattern: Pattern | null = soloPatternPlayId !== null ? (patterns.find((pt) => String(pt.id) === String(soloPatternPlayId)) || null) : null;
  if (soloPatternPlayId !== null && !activePattern) {
    const soloTrack = tracks.find((t) => t.patterns?.some((pt) => String(pt.id) === String(soloPatternPlayId)));
    const soloPtn = soloTrack?.patterns?.find((pt) => String(pt.id) === String(soloPatternPlayId));
    if (soloPtn) {
      activePattern = patterns.find((pt) => pt.name === soloPtn.name) || null;
      const sIdx = soloTrack?.patterns?.findIndex((pt) => String(pt.id) === String(soloPatternPlayId));
      if (!activePattern && sIdx !== undefined && sIdx >= 0 && patterns[sIdx]) activePattern = patterns[sIdx];
    }
  }
  if (!activePattern) activePattern = patterns.find((pt) => pt.measureAssignments[currentMeasureIdx]) || null;

  const noteSwingOffset = computePercussionNoteSwing({
    activePattern, liveTrack, circleStepIdx, isTuplet, swingJitter, globalMode, globalSwing, stepDurationSec,
  });

  const stepCount = activePattern ? activePattern.steps : 16;
  const stepDurSec = tick96nSec * (currentTicks / stepCount);
  const microOffset = (microtimingPct / 100) * stepDurSec * 0.5;
  const triggerTime = time + noteSwingOffset + microOffset;

  const storeState = useSequencerStore.getState();
  let isTocarJuntoMuted = false;
  if (storeState.tocarJuntoActive && storeState.tocarJuntoIsMuted !== false && storeState.tocarJuntoTrackId !== null) {
    if (storeState.tocarJuntoMuteScope === 'family') {
      if (familyMuteSet.size === 0) {
        getTrackFamilyIds(storeState.tocarJuntoTrackId, tracks || storeState.tracks).forEach((id) => familyMuteSet.add(id));
      }
      isTocarJuntoMuted = familyMuteSet.has(String(liveTrack.id));
    } else {
      isTocarJuntoMuted = storeState.tocarJuntoTrackId === liveTrack.id;
    }
  }

  if (!isTocarJuntoMuted) {
    audioEngine?.playNote(liveTrack.id, strokeSymbol, triggerTime, velocity, decayMultiplier);
  }
  if (!isDocHidden && !storeState.isPreRolling && currentMeasureIdx >= 0) {
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
      triggerPackedNote(flatArray[ptr + 1], flatArray[ptr + 2], flatArray[ptr + 3], p, variedTrackIds);
    }
    ptr += 4;
  }
  flatArrayPointerRef.current = ptr;

  for (let vPtr = 0; vPtr < variationNotes.length; vPtr += 4) {
    if (variationNotes[vPtr] === currentAbsoluteTick) {
      triggerPackedNote(variationNotes[vPtr + 1], variationNotes[vPtr + 2], variationNotes[vPtr + 3], p);
    }
  }
}
