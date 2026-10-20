import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { audioEngine } from './useAudioSync';
import { useMidiStore } from '../stores/useMidiStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudio } from '../contexts/AudioContext';
import { useSequencer } from '../contexts/SequencerContext';
import { clearAllMidiDebounceTimers } from './midi/midiDebounce';
import { detectVoiceContext } from './midi/midiContextUtils';
import { handleMidiVoiceEvent, MidiVoiceHoldRefs } from './midi/midiVoiceHandler';
import { handleMidiPitchBendFaders } from './midi/midiPitchBendFaders';
import { handleMcuCommand } from './midi/midiMcuSystemCommands';
import { handleMidiContinuousCc } from './midi/midiContinuousCc';
import { handleMidiTransportAction } from './midi/midiTransportHandler';
import { handleMidiPercussionNote } from './midi/midiPercussionHandler';
import { setupWebMidiAccess } from './midi/midiAccessManager';

let lastRealtimeTime = 0;

export const useMidiController = () => {
  const audio = useAudio();
  const sequencer = useSequencer();

  const audioRef = useRef(audio);
  audioRef.current = audio;
  const sequencerRef = useRef(sequencer);
  sequencerRef.current = sequencer;

  const midiHoldTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const midiRepeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentHeldNoteRef = useRef<number | null>(null);
  const tracksBeforeHoldRef = useRef<any[] | null>(null);

  useEffect(() => {
    const onMIDIMessage = (event: Event) => {
      const midiEvent = event as MIDIMessageEvent;
      if (!midiEvent.data) return;

      const [status, note, velocity] = midiEvent.data;

      // Interception MIDI Real-Time (Universels)
      if (status === 0xFA || status === 0xFB) {
        const now = Date.now();
        if (now - lastRealtimeTime < 250) return;
        lastRealtimeTime = now;
        audioRef.current.handleTogglePlay();
        return;
      }
      if (status === 0xFC) {
        const now = Date.now();
        if (now - lastRealtimeTime < 250) return;
        lastRealtimeTime = now;
        audioRef.current.handleStop();
        return;
      }

      const messageType = status & 0xf0;
      const isNoteOn = messageType === 0x90;
      const isNoteOff = messageType === 0x80 || (isNoteOn && velocity === 0);
      const isCC = messageType === 0xb0;
      const isPitchBend = messageType === 0xe0;

      const seqStore = useSequencerStore.getState();
      const { isVoiceContext, activeTrack } = detectVoiceContext(seqStore);

      const holdRefs: MidiVoiceHoldRefs = {
        midiHoldTimeoutRef,
        midiRepeatIntervalRef,
        currentHeldNoteRef,
        tracksBeforeHoldRef
      };

      // 1. Branche vocale prioritaire
      if (isVoiceContext && (isNoteOn || isNoteOff)) {
        if (handleMidiVoiceEvent(note, velocity, isNoteOn, isNoteOff, activeTrack, holdRefs)) return;
      }

      // 2. Faders Pitch Bend MCU (0xE0..0xE8)
      if (isPitchBend) {
        if (handleMidiPitchBendFaders(status, note, velocity, audioRef.current)) return;
      }

      // 3. Commandes MCU & navigation banques
      if (handleMcuCommand(note, velocity, isNoteOn, messageType, audioRef.current, sequencerRef.current)) return;

      // 4. Transport Learn & Actions
      const state = useMidiStore.getState();
      if (handleMidiTransportAction(note, velocity, isNoteOn, isCC, state, audioRef.current, sequencerRef.current)) return;

      // 5. MIDI CC continus (faders 73-80, pan 16-23)
      if (isCC) {
        if (handleMidiContinuousCc(status, note, velocity, audioRef.current)) return;
      }

      // 6. MIDI Learn percussion stroke
      if (isNoteOn && velocity > 0 && state.isMidiLearnActive && state.waitingForMidiStroke) {
        const target = state.waitingForMidiStroke;
        state.addMidiMapping(note, target);
        state.setWaitingForMidiStroke(null);
        if (audioEngine) audioEngine.playNote(target.trackId, target.symbol, Tone.now(), 1.0, 1.0);
        return;
      }

      // 7. Mode percussion
      if (isNoteOff || isVoiceContext) return;
      if (isNoteOn && velocity > 0) {
        const target = state.mappings[note];
        handleMidiPercussionNote(note, velocity, target, seqStore);
      }
    };

    const cleanupMidiAccess = setupWebMidiAccess(onMIDIMessage);

    return () => {
      cleanupMidiAccess();
      clearAllMidiDebounceTimers();
      if (midiHoldTimeoutRef.current) { clearTimeout(midiHoldTimeoutRef.current); midiHoldTimeoutRef.current = null; }
      if (midiRepeatIntervalRef.current) { clearInterval(midiRepeatIntervalRef.current); midiRepeatIntervalRef.current = null; }
      currentHeldNoteRef.current = null;
      tracksBeforeHoldRef.current = null;
    };
  }, []);
};
