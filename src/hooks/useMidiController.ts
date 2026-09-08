import { useEffect } from 'react';
import * as Tone from 'tone';
import { audioEngine } from './useAudioSync';
import { useMidiStore, MidiTarget, TransportAction } from '../stores/useMidiStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudio } from '../contexts/AudioContext';
import { useSequencer } from '../contexts/SequencerContext';
import { instrumentsConfig } from '../data';
import { getStrokesForInstrument } from '../utils/instrumentStrokes';

/* CPU / Audio justification: This MIDI event listener runs outside the React render cycle (bypass).
   Upon receiving MIDI Note On or CC messages, it accesses `useMidiStore.getState()` directly to fetch mappings and state,
   and fires the Tone.js sample preview using `audioEngine.playNote(..., Tone.now())` or controls the Transport bar.
   It also runs visual flash animations via GPU (WAAPI) directly targeting DOM nodes.
   This guarantees zero React render cycles, preserving 60 FPS live play and preventing audio thread latency/jitter. */
let lastTransportActionTime = 0;

export const useMidiController = () => {
  const audio = useAudio();
  const sequencer = useSequencer();

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.requestMIDIAccess) {

      return;
    }

    let midiAccess: MIDIAccess | null = null;
    const activeInputs = new Set<MIDIInput>();

    // Central high-performance MIDI message handler
    const onMIDIMessage = (event: Event) => {
      const midiEvent = event as MIDIMessageEvent;
      if (!midiEvent.data) return;

      const [status, note, velocity] = midiEvent.data;

      // Interception MIDI Real-Time (Universels, pas de canal MIDI)
      if (status === 0xFA || status === 0xFB) {
        const now = Date.now();
        if (now - lastTransportActionTime < 250) return;
        lastTransportActionTime = now;

        audio.handleTogglePlay();
        return;
      }
      if (status === 0xFC) {
        const now = Date.now();
        if (now - lastTransportActionTime < 250) return;
        lastTransportActionTime = now;

        audio.handleStop();
        return;
      }

      const messageType = status & 0xf0;
      const isNoteOn = messageType === 0x90;
      const isCC = messageType === 0xb0;

      // --- INTERCEPTEUR AUTO MCU (Mackie Control Universal) ---
      if (isNoteOn && velocity > 0) {
        const mcuNotes = [86, 91, 92, 93, 94, 95];
        if (mcuNotes.includes(note)) {
          const now = Date.now();
          if (now - lastTransportActionTime < 250) return;
          lastTransportActionTime = now;

          switch (note) {
            case 94: // Play
              audio.handleTogglePlay();
              return;
            case 93: // Stop
              audio.handleStop();
              return;
            case 95: { // Record
              const seq = useSequencerStore.getState();
              if (seq.armedPatternId !== null) {
                seq.togglePatternRecording();
              } else {
                audio.handleAudioRecordingToggle();
              }
              return;
            }
            case 92: { // Fast Forward / Next Measure
              const current = useSequencerStore.getState().currentMeasure;
              const total = useSequencerStore.getState().totalMeasures;
              const nextIdx = (current + 1) % (total || 1);
              audio.handleTimelineNavigate(nextIdx, 0, 16);
              return;
            }
            case 91: { // Rewind / Prev Measure
              const current = useSequencerStore.getState().currentMeasure;
              const total = useSequencerStore.getState().totalMeasures;
              const prevIdx = (current - 1 + total) % (total || 1);
              audio.handleTimelineNavigate(prevIdx, 0, 16);
              return;
            }
            case 86: // Loop
              if (sequencer && typeof sequencer.setIsLooping === 'function') {
                sequencer.setIsLooping(!sequencer.isLooping);
              }
              return;
          }
        }
      }

      const state = useMidiStore.getState();

      // 1. Check if waiting for transport learn (accepts Note/CC and any value, even 0 or 127)
      if (state.waitingForTransportAction && (isNoteOn || isCC)) {
        const action = state.waitingForTransportAction;
        state.addTransportMapping(action, { type: isCC ? 'cc' : 'note', number: note });
        state.setWaitingForTransportAction(null);
        return;
      }

      // 2. Check if waiting for midi stroke learn (only Note On, velocity > 0)
      if (isNoteOn && velocity > 0 && state.isMidiLearnActive && state.waitingForMidiStroke) {
        const target = state.waitingForMidiStroke;
        state.addMidiMapping(note, target);
        state.setWaitingForMidiStroke(null);
        if (audioEngine) {
          audioEngine.playNote(target.trackId, target.symbol, Tone.now(), 1.0, 1.0);
        }
        return;
      }

      // 3. Live Mode: Transport actions (Priority Interception)
      let matchedAction: TransportAction | null = null;
      for (const actionKey in state.transportMappings) {
        const mapping = state.transportMappings[actionKey as TransportAction];
        if (
          mapping &&
          mapping.type === (isCC ? 'cc' : 'note') &&
          mapping.number === note
        ) {
          matchedAction = actionKey as TransportAction;
          break;
        }
      }

      if (matchedAction) {
        // For transport buttons, we only trigger on press/activation (velocity > 0)
        if (velocity > 0) {
          const now = Date.now();
          if (now - lastTransportActionTime < 250) return;
          lastTransportActionTime = now;

          switch (matchedAction) {
            case 'play':
              audio.handleTogglePlay();
              break;
            case 'stop':
              audio.handleStop();
              break;
            case 'record': {
              const seq = useSequencerStore.getState();
              if (seq.armedPatternId !== null) {
                seq.togglePatternRecording();
              } else {
                audio.handleAudioRecordingToggle();
              }
              break;
            }
            case 'loop':
              if (sequencer && typeof sequencer.setIsLooping === 'function') {
                sequencer.setIsLooping(!sequencer.isLooping);
              }
              break;
            case 'nextMeasure': {
              const current = useSequencerStore.getState().currentMeasure;
              const total = useSequencerStore.getState().totalMeasures;
              const nextIdx = (current + 1) % (total || 1);
              audio.handleTimelineNavigate(nextIdx, 0, 16);
              break;
            }
            case 'prevMeasure': {
              const current = useSequencerStore.getState().currentMeasure;
              const total = useSequencerStore.getState().totalMeasures;
              const prevIdx = (current - 1 + total) % (total || 1);
              audio.handleTimelineNavigate(prevIdx, 0, 16);
              break;
            }
          }
        }
        return; // Always return to block transport signals from triggering instrument sounds
      }

      // 4. Live Mode: Instrument notes (only Note On, velocity > 0)
      if (isNoteOn && velocity > 0) {
        const seqStore = useSequencerStore.getState();
        const { isPatternRecording, armedPatternId, armedTrackId, updatePatternStep, tracks, lang, isLeftHanded } = seqStore;
        const target = state.mappings[note];

        // Résolution du symbole/frappe
        let strokeChar = target?.symbol;
        let trackIdToPlay: number | string | null = target ? target.trackId : armedTrackId;

        if (!strokeChar && armedTrackId !== null) {
          const armedTrack = tracks.find(t => t.id === armedTrackId);
          if (armedTrack) {
            const inst = instrumentsConfig[armedTrack.instrumentIdx];
            if (inst) {
              const strokes = getStrokesForInstrument(inst.id, inst.type, lang || 'fr', isLeftHanded || false);
              if (strokes.length > 0) {
                const strokeIndex = (note % strokes.length + strokes.length) % strokes.length;
                strokeChar = strokes[strokeIndex]?.symbol || strokes[0]?.symbol || 'D';
              }
            }
          }
        }
        if (!strokeChar) strokeChar = 'D';

        // 1. Bypass Audio Zéro-Latence : Déclenchement sonore immédiat via audioEngine.playNote() avant tout traitement
        if (audioEngine && trackIdToPlay !== null) {
          audioEngine.playNote(
            trackIdToPlay,
            strokeChar,
            Tone.now(),
            velocity / 127.0, // Normalisation de la vélocité [0.0, 1.0]
            1.0 // Multiplicateur de decay par défaut
          );

          // Animation GPU-only via WAAPI sur cibles statiques de frappe
          if (target) {
            const domElements = document.querySelectorAll(`[data-midi-target="${target.instrumentId}-${target.symbol}"]`);
            domElements.forEach(el => {
              (el as HTMLElement).animate([
                { opacity: 1, transform: 'scale(1)' },
                { opacity: 0.4, transform: 'scale(0.85)' },
                { opacity: 1, transform: 'scale(1)' }
              ], { duration: 120, easing: 'ease-out' });
            });
          }
        }

        // 2. Condition d'écriture : si !isPatternRecording || armedPatternId === null || armedTrackId === null, stopper là
        if (!isPatternRecording || armedPatternId === null || armedTrackId === null) {
          return;
        }

        const armedTrack = tracks.find(t => t.id === armedTrackId);
        const armedPattern = armedTrack?.patterns.find(p => p.id === armedPatternId);
        if (!armedTrack || !armedPattern) {
          return;
        }

        const stepsCount = armedPattern.steps || 16;

        // 3. Calcul de quantification à la volée
        const ppq = Tone.Transport.PPQ || 192;
        const patternTicks = stepsCount * (ppq / 4);
        const currentTick = Math.max(0, Tone.Transport.ticks) % patternTicks;
        const targetStep = (Math.round(currentTick / (patternTicks / stepsCount)) % stepsCount + stepsCount) % stepsCount;

        // 5. Gestion Overdub (surimpression)
        const currentVal = armedPattern.activeSteps?.[targetStep];
        let finalVal: string | number | [string, string] = strokeChar;

        if (currentVal && currentVal !== 0 && currentVal !== '0') {
          if (Array.isArray(currentVal)) {
            // Pas déjà scindé : mise à jour de la 2ème note
            finalVal = [currentVal[0], strokeChar];
          } else if (typeof currentVal === 'string') {
            if (currentVal !== strokeChar) {
              // Fusionner en pas scindé [existant, newChar]
              finalVal = [currentVal, strokeChar];
            } else {
              finalVal = strokeChar;
            }
          }
        }

        // 6. Écriture immuable dans le store Zustand
        updatePatternStep(armedTrackId, armedPatternId, targetStep, finalVal);

        // 7. Flash visuel GPU-Only via WAAPI (sans re-render React)
        const cellElements = document.querySelectorAll<HTMLElement>(
          `[data-pattern-id="${armedPatternId}"][data-step-index="${targetStep}"]`
        );
        cellElements.forEach(cellEl => {
          cellEl.animate([
            { transform: 'scale(1.25)', filter: 'brightness(1.8)', opacity: 1 },
            { transform: 'scale(1)', filter: 'brightness(1)', opacity: 1 }
          ], {
            duration: 160,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
          });
        });
      }
    };

    // Attach listeners to all inputs
    const setupInputs = (access: MIDIAccess) => {
      // Clean up previous listeners
      activeInputs.forEach((input) => {
        try {
          input.onmidimessage = null;
        } catch (_) {}
      });
      activeInputs.clear();

      // Hook up all available inputs
      access.inputs.forEach((input) => {
        input.onmidimessage = onMIDIMessage;
        activeInputs.add(input);
      });
    };

    // Handle connection / disconnection events
    const onStateChange = (event: Event) => {
      const port = (event as MIDIConnectionEvent).port;
      if (port.type === 'input' && midiAccess) {
        setupInputs(midiAccess);
      }
    };

    // Initialize Web MIDI Access
    navigator.requestMIDIAccess({ sysex: false }).then(
      (access) => {
        midiAccess = access;
        setupInputs(access);
        access.onstatechange = onStateChange;
      },
      (err) => {
        console.error('Failed to get MIDI access', err);
      }
    );

    // Cleanup on unmount
    return () => {
      if (midiAccess) {
        midiAccess.onstatechange = null;
        midiAccess.inputs.forEach((input) => {
          try {
            input.onmidimessage = null; // Nettoyage absolu au démontage
          } catch (_) {}
        });
      }
      activeInputs.forEach((input) => {
        try {
          input.onmidimessage = null;
        } catch (_) {}
      });
    };
  }, [audio, sequencer]);
};
