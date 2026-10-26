import * as Tone from 'tone';
import { Track, Pattern, GlobalSwing } from '../../types';
import { instrumentsConfig } from '../../data';
import { getTrackFamilyIds, getEffectiveVolume, getEffectiveMuteState } from '../../stores/useSequencerStore';
import { hasActiveTrackAutomation } from '../../utils/automationDetectHelper';
import { pushVisualHitTrigger } from '../../audio/visualTickBuffer';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { AudioEngine } from '../../AudioEngine';
import { computePercussionNoteSwing } from './percussionSwingHelper';

export interface PercussionSchedulerParams {
  time: number; stepIdx: number; currentTicks: number; currentMeasureIdx: number;
  tick96nSec: number; swingJitter: number; globalMode: string; stepDurationSec: number;
  isDocHidden: boolean; tracks: Track[]; soloPatternPlayId: number | null;
  globalSwing: GlobalSwing; familyMuteSet: Set<string>; flatCompiledSchedule: Float64Array | null;
  flatArrayPointerRef: { current: number }; lastCompiledScheduleRef: { current: Float64Array | null };
  lastAbsoluteTickRef: { current: number }; currentMeasureStartTick: number;
  audioEngine: AudioEngine | null; busChannels: Record<string | number, Tone.Channel>;
}

export function schedulePercussionNotes(p: PercussionSchedulerParams): void {
  const {
    time, stepIdx, currentTicks, currentMeasureIdx, tick96nSec, swingJitter, globalMode,
    stepDurationSec, isDocHidden, tracks, soloPatternPlayId, globalSwing, familyMuteSet,
    flatCompiledSchedule, flatArrayPointerRef, lastCompiledScheduleRef, lastAbsoluteTickRef,
    currentMeasureStartTick, audioEngine, busChannels
  } = p;

  const currentAbsoluteTick = currentMeasureStartTick + stepIdx;
  const flatArray = flatCompiledSchedule;
  if (!flatArray) return;

  const len = flatArray.length;
  let ptr = flatArrayPointerRef.current;

  if (flatArray !== lastCompiledScheduleRef.current || currentAbsoluteTick < lastAbsoluteTickRef.current || currentAbsoluteTick - lastAbsoluteTickRef.current > 5) {
    ptr = 0;
    while (ptr < len && flatArray[ptr] < currentAbsoluteTick) {
      ptr += 4;
    }
    lastCompiledScheduleRef.current = flatArray;
  }
  lastAbsoluteTickRef.current = currentAbsoluteTick;

  while (ptr < len) {
    const noteTick = flatArray[ptr];
    if (noteTick > currentAbsoluteTick) break;

    if (noteTick === currentAbsoluteTick) {
      const packedData = flatArray[ptr + 1];
      const velocity = flatArray[ptr + 2];
      const microtimingPct = flatArray[ptr + 3];

      const trackIdx = (packedData >> 22) & 0x3FF;
      const circleStepIdx = (packedData >> 16) & 0x3F;
      const strokeCharCode = (packedData >> 9) & 0x7F;
      const decayPct = (packedData >> 2) & 0x7F;
      const isTuplet = ((packedData >> 1) & 1) === 1;

      const liveTrack = tracks[trackIdx];
      if (liveTrack) {
        const inst = instrumentsConfig[liveTrack.instrumentIdx];
        if (inst) {
          const isConnectedToBus = Boolean(liveTrack.busId && busChannels[liveTrack.busId]);
          const trackVolPct = isConnectedToBus ? (liveTrack.volumeVal ?? 75) : getEffectiveVolume(tracks, liveTrack.id);
          const isMuted = soloPatternPlayId !== null ? false : getEffectiveMuteState(tracks, liveTrack.id);
          if (!isMuted && (trackVolPct > 3 || hasActiveTrackAutomation(liveTrack, 'volume'))) {
            const strokeSymbol = String.fromCharCode(strokeCharCode);
            const decayMultiplier = decayPct / 100;
            const patterns = liveTrack.patterns;
            let activePattern: Pattern | null = soloPatternPlayId !== null ? (patterns.find(p => String(p.id) === String(soloPatternPlayId)) || null) : null;
            if (soloPatternPlayId !== null && !activePattern) {
              const soloTrack = tracks.find(t => t.patterns?.some(p => String(p.id) === String(soloPatternPlayId)));
              const soloPtn = soloTrack?.patterns?.find(p => String(p.id) === String(soloPatternPlayId));
              if (soloPtn) {
                activePattern = patterns.find(p => p.name === soloPtn.name) || null;
                const sIdx = soloTrack?.patterns?.findIndex(p => String(p.id) === String(soloPatternPlayId));
                if (!activePattern && sIdx !== undefined && sIdx >= 0 && patterns[sIdx]) activePattern = patterns[sIdx];
              }
            }
            if (!activePattern) activePattern = patterns.find(p => p.measureAssignments[currentMeasureIdx]) || null;

            const noteSwingOffset = computePercussionNoteSwing({
              activePattern, liveTrack, circleStepIdx, isTuplet,
              swingJitter, globalMode, globalSwing, stepDurationSec
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
                  getTrackFamilyIds(storeState.tocarJuntoTrackId, tracks || storeState.tracks).forEach(id => familyMuteSet.add(id));
                }
                isTocarJuntoMuted = familyMuteSet.has(String(liveTrack.id));
              } else {
                isTocarJuntoMuted = (storeState.tocarJuntoTrackId === liveTrack.id);
              }
            }

            if (!isTocarJuntoMuted) {
              audioEngine?.playNote(liveTrack.id, strokeSymbol, triggerTime, velocity, decayMultiplier);
            }

            if (!isDocHidden) {
              const isPreRolling = useSequencerStore.getState().isPreRolling || currentMeasureIdx < 0;
              if (!isPreRolling) {
                pushVisualHitTrigger(liveTrack.id, circleStepIdx, strokeCharCode, triggerTime);
              }
            }
          }
        }
      }
    }
    ptr += 4;
  }
  flatArrayPointerRef.current = ptr;
}
