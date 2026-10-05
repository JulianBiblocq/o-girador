import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { audioEngine } from './useAudioSync';
import { useMidiStore, MidiTarget, TransportAction } from '../stores/useMidiStore';
import { useSequencerStore, selectTracksMeta, getDisplayedMixerTracks, isToadaChild } from '../stores/useSequencerStore';
import { useTransportStore } from '../stores/useTransportStore';
import { useAudioStore } from '../stores/useAudioStore';
import { channels, busChannels, masterVolumeNode } from '../audio/effectsChain';
import { useAudio } from '../contexts/AudioContext';
import { useSequencer } from '../contexts/SequencerContext';
import { instrumentsConfig } from '../data';
import { getStrokesForInstrument } from '../utils/instrumentStrokes';
import { playVoicePitchLive, releaseVoicePitchLive } from '../audio/vocalSynthService';

/* CPU / Audio justification: This MIDI event listener runs outside the React render cycle (bypass).
   Upon receiving MIDI Note On, Pitch Bend, or CC messages:
   - Audio bypass: directly updates Tone.js Channel / Gain nodes without latency or React overhead.
   - Visual bypass: dispatches targeted custom DOM events ('midi-fader-move', 'midi-pan-move') 
     manipulating element styles directly (60 FPS, Zero Render Thrashing).
   - State persistence: debounced at 50 ms before writing into global Zustand stores.
   - MCU DAW commands: notes 80 (Save), 81 (Undo), 88 (Punch), 89 (Metro) cut off immediately. */
let lastTransportActionTime = 0;
let lastVoiceStepInputTime = 0;
let lastVoiceStepNote = -1;
let lastStepUndoTime = 0;
const volumeDebounceTimers = new Map<number | 'master', any>();
const panDebounceTimers = new Map<number, any>();

function debouncedSaveVolume(trackId: number | 'master', val: number, audio: any) {
  const existing = volumeDebounceTimers.get(trackId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    volumeDebounceTimers.delete(trackId);
    if (trackId === 'master') {
      const db = val === 0 ? -40 : -40 + (val / 100) * 46;
      audio.setMasterVol(db);
    } else {
      useSequencerStore.getState().handleTrackVolumeChange(trackId, val);
    }
  }, 50);
  volumeDebounceTimers.set(trackId, timer);
}

function debouncedSavePan(trackId: number, val: number) {
  const existing = panDebounceTimers.get(trackId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    panDebounceTimers.delete(trackId);
    useSequencerStore.getState().setTrackPan(trackId, val);
  }, 50);
  panDebounceTimers.set(trackId, timer);
}

const isVoiceTrack = (t?: any): boolean => {
  if (!t) return false;
  const inst = instrumentsConfig[t.instrumentIdx];
  return (
    t.id === 'toada' ||
    t.id === 'puxador' ||
    t.id === 'coro' ||
    t.type === 'voice' ||
    inst?.type === 'voice' ||
    inst?.id === 'puxador' ||
    inst?.id === 'coro' ||
    inst?.id === 'toada' ||
    t.customName === 'Toada' ||
    t.customName === 'Puxador' ||
    t.customName === 'Coro'
  );
};

export const useMidiController = () => {
  const audio = useAudio();
  const sequencer = useSequencer();

  const audioRef = useRef(audio);
  audioRef.current = audio;
  const sequencerRef = useRef(sequencer);
  sequencerRef.current = sequencer;

  // Références de temporisation pour la prolongation de note MIDI par maintien (Hold-to-Extend)
  const midiHoldTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const midiRepeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentHeldNoteRef = useRef<number | null>(null);
  const tracksBeforeHoldRef = useRef<any[] | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.requestMIDIAccess) {
      return;
    }

    let midiAccess: MIDIAccess | null = null;
    const activeInputs = new Set<MIDIInput>();

    /**
     * Écrit la note vocale sur le pas courant et avance le curseur au pas suivant.
     * Consigne 1 : Continuité sonore sans réattaque - aucun appel audio n'est déclenché ici.
     */
    const writeVoiceStepAndAdvance = (targetNoteName: string) => {
      const seqStore = useSequencerStore.getState();
      const editingTrackId = (seqStore as any).editingTrackId;
      const editingTrack = seqStore.tracks.find(t => t.id === editingTrackId);

      let activeTrack = editingTrack && isVoiceTrack(editingTrack)
        ? editingTrack
        : seqStore.tracks.find(t => isVoiceTrack(t));

      // --- Résolution précise de la piste et du motif vocal cible ---
      let targetTrack: any = null;
      let targetPattern: any = null;

      // 1. Priorité DOM : élément actif ou cellule focalisée portant data-pattern-id
      if (typeof document !== 'undefined') {
        const activeEl = document.activeElement;
        const focusedCell = activeEl?.closest('[data-pattern-id]');
        const activePatternId = focusedCell?.getAttribute('data-pattern-id');
        const activeTrackId = focusedCell?.getAttribute('data-track-id');
        if (activePatternId) {
          targetTrack = seqStore.tracks.find(t => (activeTrackId && String(t.id) === String(activeTrackId)) || t.patterns.some(p => String(p.id) === String(activePatternId)));
          targetPattern = targetTrack?.patterns.find((p: any) => String(p.id) === String(activePatternId));
        }

        // 2. Priorité DOM : cellule vocale sélectionnée
        if (!targetPattern) {
          const selectedStepCell = document.querySelector<HTMLElement>('[data-step-type="voice"][data-selected="true"]');
          if (selectedStepCell) {
            const pId = selectedStepCell.getAttribute('data-pattern-id');
            const tId = selectedStepCell.getAttribute('data-track-id');
            if (pId) {
              targetTrack = seqStore.tracks.find(t => (tId && String(t.id) === String(tId)) || t.patterns.some(p => String(p.id) === String(pId)));
              targetPattern = targetTrack?.patterns.find((p: any) => String(p.id) === String(pId));
            }
          }
        }

        // 3. Priorité DOM : carte de motif active/sélectionnée
        if (!targetPattern) {
          const activeDomCard = document.querySelector<HTMLElement>('[data-pattern-card][data-selected="true"]');
          if (activeDomCard) {
            const pId = activeDomCard.getAttribute('data-pattern-card');
            if (pId) {
              targetTrack = seqStore.tracks.find(t => t.patterns.some(p => String(p.id) === String(pId)));
              targetPattern = targetTrack?.patterns.find((p: any) => String(p.id) === String(pId));
            }
          }
        }
      }

      // 4. Contexte d'édition : editingTrackId (priorise selectedPatternId)
      if (!targetPattern && editingTrackId !== null && editingTrackId !== undefined) {
        const trk = seqStore.tracks.find(t => t.id === editingTrackId || String(t.id) === String(editingTrackId));
        if (trk) {
          if (trk.patterns && trk.patterns.length > 0) {
            targetTrack = trk;
            targetPattern = trk.patterns.find((p: any) => p.id === trk.selectedPatternId);
          } else {
            const children = seqStore.tracks.filter(t => String(t.busId) === String(trk.id) || isToadaChild(t, seqStore.tracks));
            for (const child of children) {
              if (child.patterns && child.patterns.length > 0) {
                targetTrack = child;
                targetPattern = child.patterns.find((p: any) => p.id === child.selectedPatternId);
                if (targetPattern) break;
              }
            }
          }
        }
      }

      // 5. AudioStore : selectedVocalPatternId
      if (!targetPattern) {
        const vocalPtnId = useAudioStore.getState().selectedVocalPatternId;
        if (vocalPtnId) {
          targetTrack = seqStore.tracks.find(t => t.patterns.some(p => p.id === vocalPtnId || String(p.id) === String(vocalPtnId)));
          targetPattern = targetTrack?.patterns.find((p: any) => p.id === vocalPtnId || String(p.id) === String(vocalPtnId));
        }
      }

      // 6. Repli sécurisé : uniquement si selectedPatternId ou premier motif de la piste ciblée
      if (!targetPattern && targetTrack && targetTrack.patterns && targetTrack.patterns.length > 0) {
        targetPattern = targetTrack.patterns.find((p: any) => p.id === targetTrack.selectedPatternId) || targetTrack.patterns[0];
      }

      if (!targetPattern && activeTrack) {
        if (activeTrack.patterns && activeTrack.patterns.length > 0) {
          targetTrack = activeTrack;
          targetPattern = activeTrack.patterns.find((p: any) => p.id === activeTrack.selectedPatternId) || activeTrack.patterns[0];
        } else {
          const children = seqStore.tracks.filter(t => String(t.busId) === String(activeTrack.id) || isToadaChild(t, seqStore.tracks));
          for (const child of children) {
            if (child.patterns && child.patterns.length > 0) {
              targetTrack = child;
              targetPattern = child.patterns.find((p: any) => p.id === child.selectedPatternId) || child.patterns[0];
              break;
            }
          }
        }
      }

      if (!targetTrack || !targetPattern) return;

      const targetInstId = instrumentsConfig[targetTrack?.instrumentIdx ?? -1]?.id;
      const isTargetCoro = targetInstId === 'coro' || String(targetTrack?.id).toLowerCase().includes('coro') || targetTrack?.customName?.toLowerCase().includes('coro');
      const effectiveVoiceSymbol: 'P' | 'C' = isTargetCoro ? 'C' : 'P';

      const patternSteps = targetPattern.steps || 16;
      let currentStepIdx = (seqStore.selectedStepIdx !== null && seqStore.selectedStepIdx !== undefined)
        ? seqStore.selectedStepIdx
        : 0;
      let isInPreRoll = Boolean(seqStore.selectedStepIsPreRoll);

      if (seqStore.selectedStepIdx === null || seqStore.selectedStepIdx === undefined) {
        currentStepIdx = 0;
        isInPreRoll = false;
        useSequencerStore.setState({
          selectedStepIdx: 0,
          selectedStepIsPreRoll: false,
          selectedSubIndex: null
        });
      }

      // Consigne 1 : Écriture pure sans réattaque sonore
      if (isInPreRoll) {
        const preRollNotes = [...(targetPattern.preRollNotes || Array(patternSteps).fill(''))];
        while (preRollNotes.length < patternSteps) preRollNotes.push('');
        preRollNotes[currentStepIdx] = targetNoteName;

        const preRollActiveSteps = [...(targetPattern.preRollActiveSteps || Array(patternSteps).fill('0'))];
        while (preRollActiveSteps.length < patternSteps) preRollActiveSteps.push('0');
        if (!preRollActiveSteps[currentStepIdx] || preRollActiveSteps[currentStepIdx] === 0 || preRollActiveSteps[currentStepIdx] === '0') {
          preRollActiveSteps[currentStepIdx] = effectiveVoiceSymbol;
        }

        const preRollLyrics = [...(targetPattern.preRollLyrics || Array(patternSteps).fill(''))];
        while (preRollLyrics.length < patternSteps) preRollLyrics.push('');

        const preRollDecays = targetPattern.preRollDecays ? [...targetPattern.preRollDecays] : Array(patternSteps).fill(10);
        while (preRollDecays.length < patternSteps) preRollDecays.push(10);

        const preRollVolumes = targetPattern.preRollVolumes ? [...targetPattern.preRollVolumes] : Array(patternSteps).fill(100);
        while (preRollVolumes.length < patternSteps) preRollVolumes.push(100);

        seqStore.setTracks(prev => prev.map(t => {
          if (t.id === targetTrack.id || String(t.id) === String(targetTrack.id)) {
            return {
              ...t,
              patterns: t.patterns.map(p => {
                if (p.id === targetPattern.id || String(p.id) === String(targetPattern.id)) {
                  return { ...p, preRollNotes, preRollActiveSteps, preRollLyrics, preRollDecays, preRollVolumes };
                }
                return p;
              })
            };
          }
          return t;
        }));
      } else {
        const notes = [...(targetPattern.notes || Array(patternSteps).fill(''))];
        while (notes.length < patternSteps) notes.push('');
        notes[currentStepIdx] = targetNoteName;

        const activeSteps = [...(targetPattern.activeSteps || Array(patternSteps).fill('0'))];
        while (activeSteps.length < patternSteps) activeSteps.push('0');
        if (!activeSteps[currentStepIdx] || activeSteps[currentStepIdx] === 0 || activeSteps[currentStepIdx] === '0') {
          activeSteps[currentStepIdx] = effectiveVoiceSymbol;
        }

        const lyrics = [...(targetPattern.lyrics || Array(patternSteps).fill(''))];
        while (lyrics.length < patternSteps) lyrics.push('');

        seqStore.setTracks(prev => prev.map(t => {
          if (t.id === targetTrack.id || String(t.id) === String(targetTrack.id)) {
            return {
              ...t,
              patterns: t.patterns.map(p => {
                if (p.id === targetPattern.id || String(p.id) === String(targetPattern.id)) {
                  return { ...p, notes, activeSteps, lyrics };
                }
                return p;
              })
            };
          }
          return t;
        }));
      }

      // Déplacement automatique de la sélection vers le pas suivant
      let nextStepIdx = 0;
      let nextIsInPreRoll = false;
      const timeSig = (targetPattern as any).timeSignature || seqStore.metadata?.ritmo || '4/4';
      const preRollStepsCount = targetPattern.preRollActiveSteps?.length || (timeSig === '12/8' ? 12 : 16);

      if (isInPreRoll) {
        if (currentStepIdx < preRollStepsCount - 1) {
          nextStepIdx = currentStepIdx + 1;
          nextIsInPreRoll = true;
        } else {
          nextStepIdx = 0;
          nextIsInPreRoll = false;
        }
      } else {
        nextStepIdx = (currentStepIdx + 1) % patternSteps;
        nextIsInPreRoll = false;
      }

      // Mise à jour synchrone de l'index dans le store global
      useSequencerStore.setState({
        selectedStepIdx: nextStepIdx,
        selectedStepIsPreRoll: nextIsInPreRoll,
        selectedSubIndex: null,
        selectedStepRange: null
      });

      // Animation WAAPI sur la cellule jouée (Zero Layout Thrashing, GPU prioritaire)
      try {
        const currentCard = document.querySelector<HTMLElement>(
          `[data-step-type="voice"][data-pattern-id="${targetPattern.id}"][data-step-index="${currentStepIdx}"]`
        ) || document.querySelector<HTMLElement>(
          `[data-step-type="voice"][data-step-index="${currentStepIdx}"]`
        );
        if (currentCard) {
          currentCard.animate([
            { transform: 'scale(1.08)', filter: 'brightness(1.3)' },
            { transform: 'scale(1)', filter: 'brightness(1)' }
          ], {
            duration: 180,
            easing: 'ease-out'
          });
        }
      } catch (_) {}

      // Émettre l'événement custom focus-voice-step pour prise en charge visuelle globale
      window.dispatchEvent(new CustomEvent('focus-voice-step', {
        detail: { stepIdx: nextStepIdx, type: 'note', isInPreRoll: nextIsInPreRoll, patternId: targetPattern.id }
      }));

      // Synchroniser visuellement l'input s'il est présent dans le DOM
      try {
        const patternContainer = document.querySelector(`[data-pattern-card="${targetPattern.id}"]`)
          || document.querySelector(`[id="detail-voice-${targetTrack.id}-${targetPattern.id}"]`);
        const container = nextIsInPreRoll
          ? patternContainer?.querySelector('.pre-roll-section')
          : (patternContainer?.querySelector('.main-measure-section') || patternContainer);
        const nextCard = container?.querySelector<HTMLElement>(`[data-step-type="voice"][data-step-index="${nextStepIdx}"]`)
          || document.querySelector<HTMLElement>(`[data-step-type="voice"][data-pattern-id="${targetPattern.id}"][data-step-index="${nextStepIdx}"]`)
          || document.querySelector<HTMLElement>(`[data-step-type="voice"][data-step-index="${nextStepIdx}"]`);
        if (nextCard) {
          const nextInput = nextCard.querySelector('.v-note') as HTMLInputElement | null;
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
          }
        }
      } catch (_) {}
    };

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

        audioRef.current.handleTogglePlay();
        return;
      }
      if (status === 0xFC) {
        const now = Date.now();
        if (now - lastTransportActionTime < 250) return;
        lastTransportActionTime = now;

        audioRef.current.handleStop();
        return;
      }

      const messageType = status & 0xf0;
      const isNoteOn = messageType === 0x90;
      const isNoteOff = messageType === 0x80 || (isNoteOn && velocity === 0);
      const isCC = messageType === 0xb0;
      const isPitchBend = messageType === 0xe0;

      // --- VÉRIFICATION DU CONTEXTE VOCAL (Priorité absolue) ---
      const seqStore = useSequencerStore.getState();
      const editingTrackId = (seqStore as any).editingTrackId;
      const editingTrack = seqStore.tracks.find(t => t.id === editingTrackId);
      const isEditingVoice = isVoiceTrack(editingTrack);

      const state = useMidiStore.getState();
      const target = state.mappings[note];

      let trackIdToPlay: number | string | null = null;
      let activeTrack: any = null;

      if (isEditingVoice && editingTrack) {
        trackIdToPlay = editingTrack.id;
        activeTrack = editingTrack;
      } else {
        trackIdToPlay = target ? target.trackId : seqStore.armedTrackId;
        if (trackIdToPlay === null && editingTrackId !== undefined && editingTrackId !== null) {
          trackIdToPlay = editingTrackId;
        }
        activeTrack = seqStore.tracks.find(t => t.id === trackIdToPlay) || seqStore.tracks.find(t => isVoiceTrack(t));
      }

      const isVoice = isVoiceTrack(activeTrack);

      // --- BRANCHE VOCALE ULTRA-PRIORITAIRE (Bypass MCU & Zero-Latency) ---
      if (isVoice && (isNoteOn || isNoteOff)) {
        const instId = instrumentsConfig[activeTrack?.instrumentIdx ?? -1]?.id;
        const isCoro = instId === 'coro' || String(activeTrack?.id).toLowerCase().includes('coro') || activeTrack?.customName?.toLowerCase().includes('coro');
        const voiceSymbol: 'P' | 'C' = isCoro ? 'C' : 'P';
        const noteName = Tone.Frequency(note, 'midi').toNote();

        // A. Relâchement (Note Off ou Note On avec velocity = 0)
        if (isNoteOff) {
          // Annulation des timers de maintien Hold-to-Extend si c'est la note tenue (ou toute note)
          if (currentHeldNoteRef.current === note || currentHeldNoteRef.current !== null) {
            if (midiHoldTimeoutRef.current) {
              clearTimeout(midiHoldTimeoutRef.current);
              midiHoldTimeoutRef.current = null;
            }
            if (midiRepeatIntervalRef.current) {
              clearInterval(midiRepeatIntervalRef.current);
              midiRepeatIntervalRef.current = null;
            }
            currentHeldNoteRef.current = null;

            // Consigne 2 : Groupement Undo atomique : pushUndoState() lors du noteOff
            if (tracksBeforeHoldRef.current) {
              useSequencerStore.getState().pushUndoState(tracksBeforeHoldRef.current);
              tracksBeforeHoldRef.current = null;
            }
          }

          releaseVoicePitchLive(noteName);
          window.dispatchEvent(new CustomEvent('o-girador-voice-key-active', { detail: { note: noteName, active: false } }));
          return;
        }

        // B. Attaque (Note On avec velocity > 0)
        if (isNoteOn && velocity > 0) {
          // Consigne 3 : Protection Legato (annuler immédiatement tout timer en cours de la note précédente)
          if (midiHoldTimeoutRef.current) {
            clearTimeout(midiHoldTimeoutRef.current);
            midiHoldTimeoutRef.current = null;
          }
          if (midiRepeatIntervalRef.current) {
            clearInterval(midiRepeatIntervalRef.current);
            midiRepeatIntervalRef.current = null;
          }
          if (tracksBeforeHoldRef.current) {
            useSequencerStore.getState().pushUndoState(tracksBeforeHoldRef.current);
            tracksBeforeHoldRef.current = null;
          }

          // 1. Déclenchement sonore immédiat garanti (Zero Latence, Zero Throttle)
          playVoicePitchLive(noteName, velocity / 127.0);
          window.dispatchEvent(new CustomEvent('o-girador-voice-key-active', { detail: { note: noteName, active: true } }));

          // Si l'utilisateur est en mode 'free' (jeu libre sans écriture pas-à-pas)
          const voiceInputMode = useAudioStore.getState().voiceInputMode || 'free';
          if (voiceInputMode === 'free') {
            return;
          }

          // Initialisation automatique au pas 0 de la mesure active si aucun pas n'est formellement sélectionné
          if (seqStore.selectedStepIdx === null || seqStore.selectedStepIdx === undefined) {
            useSequencerStore.setState({
              selectedStepIdx: 0,
              selectedStepIsPreRoll: false,
              selectedSubIndex: null,
              selectedStepRange: null
            });
          }

          // Anti-rebond matériel sur le pas-à-pas (seuil 45 ms entre deux frappes)
          const now = Date.now();
          if ((now - lastVoiceStepInputTime) < 45) {
            return;
          }
          lastVoiceStepNote = note;
          lastVoiceStepInputTime = now;

          // Mémoriser l'état des pistes avant frappe pour le snapshot Undo atomique au noteOff
          tracksBeforeHoldRef.current = useSequencerStore.getState().tracks;
          currentHeldNoteRef.current = note;

          // 2. Écriture du pas-à-pas vocal (hors enregistrement live en lecture)
          if (!seqStore.isPatternRecording) {
            // Écriture immédiate du pas 1 (sans réattaque sonore)
            writeVoiceStepAndAdvance(noteName);

            // Armement du maintien Hold-to-Extend (400 ms de délai initial, puis cadence 450 ms)
            midiHoldTimeoutRef.current = setTimeout(() => {
              if (currentHeldNoteRef.current === note) {
                midiRepeatIntervalRef.current = setInterval(() => {
                  if (currentHeldNoteRef.current === note) {
                    // Consigne 1 : writeVoiceStepAndAdvance n'appelle aucun son, le son résonne en continu
                    writeVoiceStepAndAdvance(noteName);
                  } else {
                    if (midiRepeatIntervalRef.current) {
                      clearInterval(midiRepeatIntervalRef.current);
                      midiRepeatIntervalRef.current = null;
                    }
                  }
                }, 450);
              }
            }, 400);
          }

          // 3. Enregistrement en direct pendant la lecture
          if (seqStore.isPatternRecording && seqStore.armedPatternId !== null && seqStore.armedTrackId !== null) {
            const armedTrack = seqStore.tracks.find(t => t.id === seqStore.armedTrackId);
            const armedPattern = armedTrack?.patterns.find(p => p.id === seqStore.armedPatternId);
            if (armedTrack && armedPattern) {
              const stepsCount = armedPattern.steps || 16;
              const ppq = Tone.Transport.PPQ || 192;
              const patternTicks = stepsCount * (ppq / 4);
              const currentTick = Math.max(0, Tone.Transport.ticks) % patternTicks;
              const targetStep = (Math.round(currentTick / (patternTicks / stepsCount)) % stepsCount + stepsCount) % stepsCount;

              seqStore.setTracks(prev => prev.map(t => {
                if (t.id === seqStore.armedTrackId) {
                  return {
                    ...t,
                    patterns: t.patterns.map(p => {
                      if (p.id === seqStore.armedPatternId) {
                        const notes = [...(p.notes || Array(p.steps).fill(''))];
                        notes[targetStep] = noteName;
                        const activeSteps = [...(p.activeSteps || Array(p.steps).fill(0))];
                        // 🛡️ Étanchéité vocale : forcer le rôle correct (vide OU mauvais rôle)
                        const wrongRole3 = voiceSymbol === 'P' ? 'C' : 'P';
                        if (!activeSteps[targetStep] || activeSteps[targetStep] === '0' || activeSteps[targetStep] === 0 || activeSteps[targetStep] === wrongRole3) {
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

              // Animation WAAPI sans re-render React
              const cellElements = document.querySelectorAll<HTMLElement>(
                `[data-pattern-id="${seqStore.armedPatternId}"][data-step-index="${targetStep}"]`
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
          }

          return;
        }
      }

      // --- 1. FADERS MCU MULTICANAUX (PITCH BEND 0xE0..0xE8) ---
      if (isPitchBend) {
        const channel = status & 0x0f;
        const raw14 = (velocity << 7) | note;
        const norm0to1 = Math.max(0, Math.min(1, raw14 / 16383));
        const volumeVal = Math.round(norm0to1 * 100);

        if (channel >= 0 && channel <= 7) {
          const tracksMeta = selectTracksMeta(useSequencerStore.getState());
          const displayedTracks = getDisplayedMixerTracks(tracksMeta);
          const bankOffset = useSequencerStore.getState().mixerBankOffset || 0;
          const targetTrack = displayedTracks[bankOffset + channel];
          if (!targetTrack) return;
          const targetTrackId = targetTrack.id;

          // 1. Audio bypass immédiat
          const channelNode = channels[targetTrackId] || busChannels[targetTrackId];
          if (channelNode) {
            const gain = Math.max(0.00001, volumeVal / 100);
            const db = volumeVal === 0 ? -Infinity : Tone.gainToDb(gain);
            channelNode.volume.rampTo(db, 0.02);
          }

          // 2. DOM Direct bypass (Zero Render Thrashing 60 FPS)
          window.dispatchEvent(new CustomEvent('midi-fader-move', {
            detail: { targetId: targetTrackId, val: volumeVal }
          }));

          // 3. Persistance débouncée (50 ms)
          debouncedSaveVolume(targetTrackId, volumeVal, audioRef.current);
          return;
        } else if (channel === 8) {
          // Master Fader (Canal 8 en MCU)
          // 1. Audio bypass immédiat
          if (masterVolumeNode && masterVolumeNode.gain) {
            const db = volumeVal === 0 ? -Infinity : -40 + (volumeVal / 100) * 46;
            const gain = Tone.dbToGain(db);
            masterVolumeNode.gain.rampTo(gain, 0.02);
          }

          // 2. DOM Direct bypass (Zero Render Thrashing 60 FPS)
          window.dispatchEvent(new CustomEvent('midi-fader-move', {
            detail: { targetId: 'master', val: volumeVal }
          }));

          // 3. Persistance débouncée (50 ms)
          debouncedSaveVolume('master', volumeVal, audioRef.current);
          return;
        }
      }

      // Anti-rebond : couper systématiquement les événements Note Off ou Note On à vélocité 0 pour les touches de transport & banques
      const mcuAllNotes = [46, 47, 48, 49, 80, 81, 86, 88, 89, 91, 92, 93, 94, 95];
      if ((messageType === 0x80 || (isNoteOn && velocity === 0)) && mcuAllNotes.includes(note)) {
        return;
      }

      // --- 2. COMMANDES SYSTÈME MCU (Mackie Control Universal) ---
      if (isNoteOn && velocity > 0) {
        if (mcuAllNotes.includes(note)) {
          const now = Date.now();
          if (now - lastTransportActionTime < 250) return;
          lastTransportActionTime = now;

          switch (note) {
            case 48: // Track Left (Part 2 / prev tranche)
              useSequencerStore.getState().shiftMixerBank(-1);
              return;
            case 49: // Track Right (Part 1 / next tranche)
              useSequencerStore.getState().shiftMixerBank(1);
              return;
            case 46: // Bank Left (-8)
              useSequencerStore.getState().shiftMixerBank(-8);
              return;
            case 47: // Bank Right / Bank Jump (+8)
              useSequencerStore.getState().jumpMixerBank8();
              return;
            case 80: // Save
              window.dispatchEvent(new CustomEvent('open-save-modal'));
              return;
            case 81: // Undo
              if (typeof useSequencerStore.getState().handleUndo === 'function') {
                useSequencerStore.getState().handleUndo();
              } else if (sequencerRef.current && typeof sequencerRef.current.handleUndo === 'function') {
                sequencerRef.current.handleUndo();
              }
              return;
            case 88: { // Punch / Pre-roll
              const cur = useTransportStore.getState().preRollSettings;
              useTransportStore.getState().setPreRollSettings({ enabled: !cur?.enabled });
              return;
            }
            case 89: { // Metro / Click
              const cur = useTransportStore.getState().isMetroOn;
              useTransportStore.getState().setIsMetroOn(!cur);
              return;
            }
            case 94: // Play
              audioRef.current.handleTogglePlay();
              return;
            case 93: // Stop
              audioRef.current.handleStop();
              return;
            case 95: { // Record
              const seq = useSequencerStore.getState();
              if (seq.armedPatternId !== null) {
                seq.togglePatternRecording();
              } else {
                audioRef.current.handleAudioRecordingToggle();
              }
              return;
            }
            case 92: { // Fast Forward / Next Measure
              const current = useSequencerStore.getState().currentMeasure;
              const total = useSequencerStore.getState().totalMeasures;
              const nextIdx = (current + 1) % (total || 1);
              audioRef.current.handleTimelineNavigate(nextIdx, 0, 16);
              return;
            }
            case 91: { // Rewind / Prev Measure
              const current = useSequencerStore.getState().currentMeasure;
              const total = useSequencerStore.getState().totalMeasures;
              const prevIdx = (current - 1 + total) % (total || 1);
              audioRef.current.handleTimelineNavigate(prevIdx, 0, 16);
              return;
            }
            case 86: // Loop
              if (sequencerRef.current && typeof sequencerRef.current.setIsLooping === 'function') {
                sequencerRef.current.setIsLooping(!sequencerRef.current.isLooping);
              }
              return;
          }
        }
      }

      // 1. Check if waiting for transport learn (accepts Note/CC and any value, even 0 or 127)
      if (state.waitingForTransportAction && (isNoteOn || isCC)) {
        const action = state.waitingForTransportAction;
        state.addTransportMapping(action, { type: isCC ? 'cc' : 'note', number: note });
        state.setWaitingForTransportAction(null);
        return;
      }

      // --- 3. CONTRÔLE CONTINU DU MIXEUR (FADERS & KNOBS MIDI CC) ---
      if (isCC) {
        // Navigation banques en CC (touches 46, 47, 48, 49) avec anti-rebond
        if ([46, 47, 48, 49].includes(note)) {
          if (velocity === 0) return;
          const now = Date.now();
          if (now - lastTransportActionTime < 250) return;
          lastTransportActionTime = now;

          if (note === 48) {
            useSequencerStore.getState().shiftMixerBank(-1);
          } else if (note === 49) {
            useSequencerStore.getState().shiftMixerBank(1);
          } else if (note === 46) {
            useSequencerStore.getState().shiftMixerBank(-8);
          } else if (note === 47) {
            useSequencerStore.getState().jumpMixerBank8();
          }
          return;
        }

        // A. Faders de volume (CC 73 à 80 pour tranches 1 à 8, CC 81/82/83/85 ou CC 7 canal 8 pour Master)
        let faderIdx: number | 'master' | null = null;
        if (note >= 73 && note <= 80) {
          faderIdx = note - 73;
        } else if (note === 7) {
          const ch = status & 0x0f;
          if (ch <= 7) faderIdx = ch;
          else if (ch === 8) faderIdx = 'master';
        } else if (note === 81 || note === 82 || note === 83 || note === 85) {
          faderIdx = 'master';
        }

        if (faderIdx !== null) {
          const norm0to1 = Math.max(0, Math.min(1, velocity / 127));
          const volumeVal = Math.round(norm0to1 * 100);

          if (typeof faderIdx === 'number') {
            const tracksMeta = selectTracksMeta(useSequencerStore.getState());
            const displayedTracks = getDisplayedMixerTracks(tracksMeta);
            const bankOffset = useSequencerStore.getState().mixerBankOffset || 0;
            const targetTrack = displayedTracks[bankOffset + faderIdx];
            if (!targetTrack) return;
            const targetTrackId = targetTrack.id;

            // 1. Audio bypass immédiat
            const channelNode = channels[targetTrackId] || busChannels[targetTrackId];
            if (channelNode) {
              const gain = Math.max(0.00001, volumeVal / 100);
              const db = volumeVal === 0 ? -Infinity : Tone.gainToDb(gain);
              channelNode.volume.rampTo(db, 0.02);
            }

            // 2. DOM Direct bypass (Zero Render Thrashing 60 FPS)
            window.dispatchEvent(new CustomEvent('midi-fader-move', {
              detail: { targetId: targetTrackId, val: volumeVal }
            }));

            // 3. Persistance débouncée (50 ms)
            debouncedSaveVolume(targetTrackId, volumeVal, audioRef.current);
            return;
          } else if (faderIdx === 'master') {
            // Master Fader
            if (masterVolumeNode && masterVolumeNode.gain) {
              const db = volumeVal === 0 ? -Infinity : -40 + (volumeVal / 100) * 46;
              const gain = Tone.dbToGain(db);
              masterVolumeNode.gain.rampTo(gain, 0.02);
            }

            window.dispatchEvent(new CustomEvent('midi-fader-move', {
              detail: { targetId: 'master', val: volumeVal }
            }));

            debouncedSaveVolume('master', volumeVal, audioRef.current);
            return;
          }
        }

        // B. Potentiomètres (Knobs) 1 à 8 (CC 16 à 23) -> Panoramique
        if (note >= 16 && note <= 23) {
          const knobIdx = note - 16;
          const tracksMeta = selectTracksMeta(useSequencerStore.getState());
          const displayedTracks = getDisplayedMixerTracks(tracksMeta);
          const bankOffset = useSequencerStore.getState().mixerBankOffset || 0;
          const targetTrack = displayedTracks[bankOffset + knobIdx];
          if (!targetTrack) return;
          const targetTrackId = targetTrack.id;

          const currentTrack = useSequencerStore.getState().tracks.find(t => t.id === targetTrackId);
          const currentPan = currentTrack?.panVal ?? currentTrack?.pan ?? 0;

          let newPan = currentPan;
          if ((velocity >= 1 && velocity <= 15) || (velocity >= 65 && velocity <= 79)) {
            // Mode relatif MCU (data2 < 64 = droite, data2 > 64 = gauche via delta = data2 - 64)
            const delta = velocity > 64 ? -(velocity - 64) : velocity;
            newPan = Math.max(-100, Math.min(100, currentPan + delta * 3));
          } else {
            // Repli transparent mode absolu (0..127 -> -100..+100)
            newPan = Math.round((velocity / 127) * 200 - 100);
          }

          // 1. Audio bypass immédiat
          const channelNode = channels[targetTrackId] || busChannels[targetTrackId];
          if (channelNode) {
            channelNode.pan.rampTo(newPan / 100, 0.02);
          }

          // 2. DOM Direct bypass (Zero Render Thrashing 60 FPS)
          window.dispatchEvent(new CustomEvent('midi-pan-move', {
            detail: { targetId: targetTrackId, val: newPan }
          }));

          // 3. Persistance débouncée (50 ms)
          debouncedSavePan(targetTrackId, newPan);
          return;
        }
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
              audioRef.current.handleTogglePlay();
              break;
            case 'stop':
              audioRef.current.handleStop();
              break;
            case 'record': {
              const seq = useSequencerStore.getState();
              if (seq.armedPatternId !== null) {
                seq.togglePatternRecording();
              } else {
                audioRef.current.handleAudioRecordingToggle();
              }
              break;
            }
            case 'loop':
              if (sequencerRef.current && typeof sequencerRef.current.setIsLooping === 'function') {
                sequencerRef.current.setIsLooping(!sequencerRef.current.isLooping);
              }
              break;
            case 'nextMeasure': {
              const current = useSequencerStore.getState().currentMeasure;
              const total = useSequencerStore.getState().totalMeasures;
              const nextIdx = (current + 1) % (total || 1);
              audioRef.current.handleTimelineNavigate(nextIdx, 0, 16);
              break;
            }
            case 'prevMeasure': {
              const current = useSequencerStore.getState().currentMeasure;
              const total = useSequencerStore.getState().totalMeasures;
              const prevIdx = (current - 1 + total) % (total || 1);
              audioRef.current.handleTimelineNavigate(prevIdx, 0, 16);
              break;
            }
          }
        }
        return; // Always return to block transport signals from triggering instrument sounds
      }

      // 4. Live Mode: Percussion notes (Note On & Note Off)
      if (isNoteOff) {
        return;
      }

      if (isNoteOn && velocity > 0) {
        const { isPatternRecording, armedPatternId, armedTrackId, updatePatternStep, tracks, lang, isLeftHanded } = seqStore;
        let strokeChar = target?.symbol;

        const effectiveTrackId = (target ? target.trackId : null) ?? editingTrackId ?? armedTrackId;
        const targetTrack = tracks.find(t => t.id === effectiveTrackId);

        if (!strokeChar && targetTrack) {
          const inst = instrumentsConfig[targetTrack.instrumentIdx];
          if (inst) {
            const strokes = getStrokesForInstrument(inst.id, inst.type, lang || 'fr', isLeftHanded || false);
            if (strokes.length > 0) {
              const strokeIndex = (note % strokes.length + strokes.length) % strokes.length;
              strokeChar = strokes[strokeIndex]?.symbol || strokes[0]?.symbol || 'D';
            }
          }
        }
        if (!strokeChar) strokeChar = 'D';

        let trackIdToPlay: number | string | null = targetTrack?.id ?? target?.trackId ?? armedTrackId ?? editingTrackId;

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

        // 2. Condition d'enregistrement en direct pendant la lecture
        if (isPatternRecording && armedPatternId !== null && armedTrackId !== null) {
          const armedTrack = tracks.find(t => t.id === armedTrackId);
          const armedPattern = armedTrack?.patterns.find(p => p.id === armedPatternId);
          if (!armedTrack || !armedPattern) {
            return;
          }

          const stepsCount = armedPattern.steps || 16;
          const ppq = Tone.Transport.PPQ || 192;
          const patternTicks = stepsCount * (ppq / 4);
          const currentTick = Math.max(0, Tone.Transport.ticks) % patternTicks;
          const targetStep = (Math.round(currentTick / (patternTicks / stepsCount)) % stepsCount + stepsCount) % stepsCount;

          const currentVal = armedPattern.activeSteps?.[targetStep];
          let finalVal: string | number | [string, string] = strokeChar;

          if (currentVal && currentVal !== 0 && currentVal !== '0') {
            if (Array.isArray(currentVal)) {
              finalVal = [currentVal[0], strokeChar];
            } else if (typeof currentVal === 'string') {
              if (currentVal !== strokeChar) {
                finalVal = [currentVal, strokeChar];
              } else {
                finalVal = strokeChar;
              }
            }
          }

          updatePatternStep(armedTrackId, armedPatternId, targetStep, finalVal);

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
          return;
        }

        // 3. Consigne C : Saisie Pas-à-pas percussive hors lecture (InstrumentDetailEditor ouvert avec pas actif)
        const currentStepIdx = seqStore.selectedStepIdx;
        if (!isPatternRecording && currentStepIdx !== null && currentStepIdx !== undefined && targetTrack) {
          const targetPatternId = targetTrack.selectedPatternId || targetTrack.patterns?.[0]?.id;
          const targetPattern = targetTrack.patterns.find(p => p.id === targetPatternId);
          if (!targetPatternId || !targetPattern) {
            return;
          }

          // Snapshot Undo (groupement de phrase 1500 ms)
          const now = Date.now();
          if (now - lastStepUndoTime > 1500) {
            seqStore.pushUndoState();
            lastStepUndoTime = now;
          }

          // Gestion fine du pas scindé et de selectedSubIndex
          const currentVal = targetPattern.activeSteps?.[currentStepIdx];
          const selectedSubIndex = seqStore.selectedSubIndex;
          let finalVal: string | number | [string, string] = strokeChar;

          if (Array.isArray(currentVal)) {
            if (selectedSubIndex === 1) {
              finalVal = [currentVal[0] || '0', strokeChar];
            } else {
              finalVal = [strokeChar, currentVal[1] || '0'];
            }
          } else {
            finalVal = strokeChar;
          }

          updatePatternStep(targetTrack.id, targetPatternId, currentStepIdx, finalVal);

          // Flash visuel GPU-Only via WAAPI
          const cellElements = document.querySelectorAll<HTMLElement>(
            `[data-pattern-id="${targetPatternId}"][data-step-index="${currentStepIdx}"]`
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

          // Avancement automatique métrique
          const patternSteps = targetPattern.steps || 16;
          let nextStepIdx = currentStepIdx;
          let nextSubIndex: 0 | 1 | null = null;

          if (Array.isArray(currentVal) && selectedSubIndex === 0) {
            nextSubIndex = 1;
            nextStepIdx = currentStepIdx;
          } else {
            nextStepIdx = (currentStepIdx + 1) % patternSteps;
            const nextStepVal = targetPattern.activeSteps?.[nextStepIdx];
            nextSubIndex = Array.isArray(nextStepVal) ? 0 : null;
          }

          useSequencerStore.setState({
            selectedStepIdx: nextStepIdx,
            selectedSubIndex: nextSubIndex
          });

          window.dispatchEvent(new CustomEvent('focus-percussion-step', {
            detail: { stepIdx: nextStepIdx, subIndex: nextSubIndex }
          }));

          try {
            const nextInput = document.querySelector<HTMLInputElement>(
              nextSubIndex !== null
                ? `[data-pattern-id="${targetPatternId}"][data-step-index="${nextStepIdx}"][data-sub-index="${nextSubIndex}"]`
                : `input[data-pattern-id="${targetPatternId}"][data-step-index="${nextStepIdx}"]`
            );
            if (nextInput) {
              nextInput.focus();
              if (nextInput.select) nextInput.select();
            }
          } catch (_) {}
        }
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
      if (port && port.type === 'input' && midiAccess) {
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

    // Support des tests E2E / simulation d'événements MIDI programmés
    const handleSimulatedMidiMessage = (e: Event) => {
      const customEvt = e as CustomEvent<{ data: number[] | Uint8Array }>;
      if (customEvt.detail && customEvt.detail.data) {
        onMIDIMessage({ data: new Uint8Array(customEvt.detail.data) } as any);
      }
    };
    window.addEventListener('o-girador-simulate-midi', handleSimulatedMidiMessage);
    (window as any).__oGiradorSimulateMidi = (status: number, note: number, velocity: number) => {
      onMIDIMessage({ data: new Uint8Array([status, note, velocity]) } as any);
    };

    // Cleanup on unmount
    return () => {
      window.removeEventListener('o-girador-simulate-midi', handleSimulatedMidiMessage);
      delete (window as any).__oGiradorSimulateMidi;
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
      volumeDebounceTimers.forEach(t => clearTimeout(t));
      volumeDebounceTimers.clear();
      panDebounceTimers.forEach(t => clearTimeout(t));
      panDebounceTimers.clear();
      if (midiHoldTimeoutRef.current) {
        clearTimeout(midiHoldTimeoutRef.current);
        midiHoldTimeoutRef.current = null;
      }
      if (midiRepeatIntervalRef.current) {
        clearInterval(midiRepeatIntervalRef.current);
        midiRepeatIntervalRef.current = null;
      }
      currentHeldNoteRef.current = null;
      tracksBeforeHoldRef.current = null;
    };
  }, []);
};
