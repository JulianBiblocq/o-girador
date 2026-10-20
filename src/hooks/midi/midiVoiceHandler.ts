import * as Tone from 'tone';
import { audioEngine } from '../useAudioSync';
import { playVoicePitchLive, releaseVoicePitchLive } from '../../audio/vocalSynthService';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { instrumentsConfig } from '../../data';
import { writeVoiceStepAndAdvance } from './midiVoiceStepWriter';

export interface MidiVoiceHoldRefs {
  midiHoldTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  midiRepeatIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
  currentHeldNoteRef: React.MutableRefObject<number | null>;
  tracksBeforeHoldRef: React.MutableRefObject<any[] | null>;
}

let lastVoiceStepInputTime = 0;
let lastVoiceStepNote = -1;

export function handleMidiVoiceEvent(
  note: number,
  velocity: number,
  isNoteOn: boolean,
  isNoteOff: boolean,
  activeTrack: any,
  holdRefs: MidiVoiceHoldRefs
): boolean {
  const { midiHoldTimeoutRef, midiRepeatIntervalRef, currentHeldNoteRef, tracksBeforeHoldRef } = holdRefs;
  const instId = instrumentsConfig[activeTrack?.instrumentIdx ?? -1]?.id;
  const isCoro = instId === 'coro' || String(activeTrack?.id).toLowerCase().includes('coro') || activeTrack?.customName?.toLowerCase().includes('coro');
  const voiceSymbol: 'P' | 'C' = isCoro ? 'C' : 'P';
  const noteName = Tone.Frequency(note, 'midi').toNote();

  if (isNoteOff) {
    if (currentHeldNoteRef.current === note || currentHeldNoteRef.current !== null) {
      if (midiHoldTimeoutRef.current) { clearTimeout(midiHoldTimeoutRef.current); midiHoldTimeoutRef.current = null; }
      if (midiRepeatIntervalRef.current) { clearInterval(midiRepeatIntervalRef.current); midiRepeatIntervalRef.current = null; }
      currentHeldNoteRef.current = null;
      if (tracksBeforeHoldRef.current) {
        useSequencerStore.getState().pushUndoState(tracksBeforeHoldRef.current);
        tracksBeforeHoldRef.current = null;
      }
    }
    if (audioEngine) audioEngine.releaseVoicePitch(noteName);
    releaseVoicePitchLive(noteName);
    window.dispatchEvent(new CustomEvent('o-girador-voice-key-active', { detail: { note: noteName, active: false } }));
    return true;
  }

  if (isNoteOn && velocity > 0) {
    if (midiHoldTimeoutRef.current) { clearTimeout(midiHoldTimeoutRef.current); midiHoldTimeoutRef.current = null; }
    if (midiRepeatIntervalRef.current) { clearInterval(midiRepeatIntervalRef.current); midiRepeatIntervalRef.current = null; }
    if (tracksBeforeHoldRef.current) {
      useSequencerStore.getState().pushUndoState(tracksBeforeHoldRef.current);
      tracksBeforeHoldRef.current = null;
    }

    if (audioEngine) audioEngine.triggerVoicePitch(noteName, velocity / 127.0);
    else playVoicePitchLive(noteName, velocity / 127.0);
    window.dispatchEvent(new CustomEvent('o-girador-voice-key-active', { detail: { note: noteName, active: true } }));

    const voiceInputMode = useAudioStore.getState().voiceInputMode || 'free';
    if (voiceInputMode === 'free') return true;

    const seqStore = useSequencerStore.getState();
    if (seqStore.selectedStepIdx === null || seqStore.selectedStepIdx === undefined) {
      useSequencerStore.setState({ selectedStepIdx: 0, selectedStepIsPreRoll: false, selectedSubIndex: null, selectedStepRange: null });
    }

    const now = Date.now();
    if ((now - lastVoiceStepInputTime) < 45) return true;
    lastVoiceStepNote = note;
    lastVoiceStepInputTime = now;

    tracksBeforeHoldRef.current = useSequencerStore.getState().tracks;
    currentHeldNoteRef.current = note;

    if (!seqStore.isPatternRecording) {
      writeVoiceStepAndAdvance(noteName);
      midiHoldTimeoutRef.current = setTimeout(() => {
        if (currentHeldNoteRef.current === note) {
          midiRepeatIntervalRef.current = setInterval(() => {
            if (currentHeldNoteRef.current === note) writeVoiceStepAndAdvance(noteName);
            else if (midiRepeatIntervalRef.current) { clearInterval(midiRepeatIntervalRef.current); midiRepeatIntervalRef.current = null; }
          }, 450);
        }
      }, 400);
    }

    if (seqStore.isPatternRecording && seqStore.armedPatternId !== null && seqStore.armedTrackId !== null) {
      const armedTrack = seqStore.tracks.find(t => t.id === seqStore.armedTrackId);
      const armedPattern = armedTrack?.patterns.find(p => p.id === seqStore.armedPatternId);
      if (armedTrack && armedPattern) {
        const stepsCount = armedPattern.steps || 16;
        const ppq = Tone.Transport.PPQ || 192;
        const patternTicks = stepsCount * (ppq / 4);
        const currentTick = Math.max(0, Tone.Transport.ticks) % patternTicks;
        const targetStep = (Math.round(currentTick / (patternTicks / stepsCount)) % stepsCount + stepsCount) % stepsCount;

        seqStore.setTracks((prev: any[]) => prev.map(t => {
          if (t.id === seqStore.armedTrackId) {
            return {
              ...t,
              patterns: t.patterns.map((p: any) => {
                if (p.id === seqStore.armedPatternId) {
                  const notes = [...(p.notes || Array(p.steps).fill(''))];
                  notes[targetStep] = noteName;
                  const activeSteps = [...(p.activeSteps || Array(p.steps).fill(0))];
                  const wrongRole = voiceSymbol === 'P' ? 'C' : 'P';
                  if (!activeSteps[targetStep] || activeSteps[targetStep] === '0' || activeSteps[targetStep] === 0 || activeSteps[targetStep] === wrongRole) {
                    activeSteps[targetStep] = voiceSymbol;
                  }
                  return { ...p, notes, activeSteps };
                }
                return p;
              })
            };
          }
          return t;
        }));

        const cellElements = document.querySelectorAll<HTMLElement>(`[data-pattern-id="${seqStore.armedPatternId}"][data-step-index="${targetStep}"]`);
        cellElements.forEach(cellEl => {
          cellEl.animate([{ transform: 'scale(1.25)', filter: 'brightness(1.8)', opacity: 1 }, { transform: 'scale(1)', filter: 'brightness(1)', opacity: 1 }], { duration: 160, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
        });
      }
    }
    return true;
  }
  return false;
}
