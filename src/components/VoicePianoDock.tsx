/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { playVoicePitchLive, releaseVoicePitchLive } from '../audio/vocalSynthService';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { Ear, Edit3, Eraser } from 'lucide-react';

interface VoicePianoDockProps {
  trackId: number;
  patternId: number;
  selectedStepIdx: number | null;
  setSelectedStepIdx: React.Dispatch<React.SetStateAction<number | null>>;
  selectedStepIsPreRoll: boolean;
  setSelectedStepIsPreRoll: React.Dispatch<React.SetStateAction<boolean>>;
  lang: string;
  patternSteps?: number;
}

// Définition mathématique exacte des 3 octaves (C3 à C6) : 22 blanches, 15 noires
interface WhiteKeyDef {
  note: string;
  octave: number;
  name: string;
  hasSharp: boolean;
  sharpNote?: string;
  isC: boolean;
}

const WHITE_KEYS: WhiteKeyDef[] = [
  // Octave 3
  { note: 'C3', octave: 3, name: 'C', hasSharp: true, sharpNote: 'C#3', isC: true },
  { note: 'D3', octave: 3, name: 'D', hasSharp: true, sharpNote: 'D#3', isC: false },
  { note: 'E3', octave: 3, name: 'E', hasSharp: false, isC: false },
  { note: 'F3', octave: 3, name: 'F', hasSharp: true, sharpNote: 'F#3', isC: false },
  { note: 'G3', octave: 3, name: 'G', hasSharp: true, sharpNote: 'G#3', isC: false },
  { note: 'A3', octave: 3, name: 'A', hasSharp: true, sharpNote: 'A#3', isC: false },
  { note: 'B3', octave: 3, name: 'B', hasSharp: false, isC: false },

  // Octave 4
  { note: 'C4', octave: 4, name: 'C', hasSharp: true, sharpNote: 'C#4', isC: true },
  { note: 'D4', octave: 4, name: 'D', hasSharp: true, sharpNote: 'D#4', isC: false },
  { note: 'E4', octave: 4, name: 'E', hasSharp: false, isC: false },
  { note: 'F4', octave: 4, name: 'F', hasSharp: true, sharpNote: 'F#4', isC: false },
  { note: 'G4', octave: 4, name: 'G', hasSharp: true, sharpNote: 'G#4', isC: false },
  { note: 'A4', octave: 4, name: 'A', hasSharp: true, sharpNote: 'A#4', isC: false },
  { note: 'B4', octave: 4, name: 'B', hasSharp: false, isC: false },

  // Octave 5
  { note: 'C5', octave: 5, name: 'C', hasSharp: true, sharpNote: 'C#5', isC: true },
  { note: 'D5', octave: 5, name: 'D', hasSharp: true, sharpNote: 'D#5', isC: false },
  { note: 'E5', octave: 5, name: 'E', hasSharp: false, isC: false },
  { note: 'F5', octave: 5, name: 'F', hasSharp: true, sharpNote: 'F#5', isC: false },
  { note: 'G5', octave: 5, name: 'G', hasSharp: true, sharpNote: 'G#5', isC: false },
  { note: 'A5', octave: 5, name: 'A', hasSharp: true, sharpNote: 'A#5', isC: false },
  { note: 'B5', octave: 5, name: 'B', hasSharp: false, isC: false },

  // Sommet : C6
  { note: 'C6', octave: 6, name: 'C', hasSharp: false, isC: true }
];

export const VoicePianoDock: React.FC<VoicePianoDockProps> = React.memo(({
  trackId,
  patternId,
  selectedStepIdx,
  setSelectedStepIdx,
  selectedStepIsPreRoll,
  setSelectedStepIsPreRoll,
  lang,
  patternSteps = 16
}) => {
  const sequencer = useSequencer();

  const voiceInputMode = useAudioStore(state => state.voiceInputMode);
  const setVoiceInputMode = useAudioStore(state => state.setVoiceInputMode);

  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const activeNotesRef = useRef<Set<string>>(new Set());
  const midiHighlightTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Écoute de l'événement MIDI externe pour illumination visuelle temps réel de la touche
  useEffect(() => {
    const handleMidiKey = (e: CustomEvent<{ note: string; active?: boolean }>) => {
      const note = e.detail?.note;
      if (!note) return;

      // Normaliser enharmonique si nécessaire (Db -> C#)
      const mappedNote = note.replace('Db', 'C#').replace('Eb', 'D#').replace('Gb', 'F#').replace('Ab', 'G#').replace('Bb', 'A#');

      if (e.detail?.active === false) {
        const existing = midiHighlightTimersRef.current.get(mappedNote);
        if (existing) clearTimeout(existing);
        midiHighlightTimersRef.current.delete(mappedNote);
        setActiveNotes(prev => {
          const next = new Set(prev);
          next.delete(mappedNote);
          return next;
        });
        return;
      }

      setActiveNotes(prev => {
        const next = new Set(prev);
        next.add(mappedNote);
        return next;
      });

      // Annuler timer existant si note répétée
      const existing = midiHighlightTimersRef.current.get(mappedNote);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        setActiveNotes(prev => {
          const next = new Set(prev);
          next.delete(mappedNote);
          return next;
        });
        midiHighlightTimersRef.current.delete(mappedNote);
      }, 300);

      midiHighlightTimersRef.current.set(mappedNote, timer);
    };

    window.addEventListener('o-girador-voice-key-active' as any, handleMidiKey as any);
    return () => {
      window.removeEventListener('o-girador-voice-key-active' as any, handleMidiKey as any);
      midiHighlightTimersRef.current.forEach(t => clearTimeout(t));
      midiHighlightTimersRef.current.clear();
    };
  }, []);

  // Résolution robuste du patternId effectif
  const getEffectivePatternId = useCallback(() => {
    if (patternId && patternId !== 0) return patternId;
    const tracks = useSequencerStore.getState().tracks;
    const t = tracks.find(tr => tr.id === trackId || String(tr.id) === String(trackId));
    return t?.selectedPatternId || t?.patterns?.[0]?.id || patternId;
  }, [patternId, trackId]);

  // Déclencheur PointerDown (Son + Écriture conditionnelle)
  const handleNoteDown = useCallback((note: string) => {
    // 1. Mise à jour visuelle immédiate de la touche pressée
    activeNotesRef.current.add(note);
    setActiveNotes(new Set(activeNotesRef.current));

    // 2. Déclenchement sonore garanti sans blocage
    playVoicePitchLive(note, 0.85);

    if (voiceInputMode === 'step') {
      // ✍️ Mode Saisie pas-à-pas : écriture dans la grille + avance dynamique
      const effectiveStep = selectedStepIdx !== null ? selectedStepIdx : 0;
      const effectivePreRoll = selectedStepIsPreRoll;
      const targetPatternId = getEffectivePatternId();

      if (effectivePreRoll) {
        sequencer.handleVoicePreRollNoteChange(trackId, targetPatternId, effectiveStep, note);
        sequencer.handleVoicePreRollNoteBlur(trackId, targetPatternId, effectiveStep, note);

        // Transition dynamique vers le pas suivant
        if (effectiveStep < patternSteps - 1) {
          setSelectedStepIdx(effectiveStep + 1);
          useSequencerStore.setState({ selectedStepIdx: effectiveStep + 1 } as any);
          window.dispatchEvent(new CustomEvent('focus-voice-step', {
            detail: { stepIdx: effectiveStep + 1, type: 'note', isInPreRoll: true }
          }));
        } else {
          // Fin de l'anacrouse atteinte : basculer au pas 0 de la mesure principale
          setSelectedStepIdx(0);
          setSelectedStepIsPreRoll(false);
          useSequencerStore.setState({ selectedStepIdx: 0 } as any);
          window.dispatchEvent(new CustomEvent('focus-voice-step', {
            detail: { stepIdx: 0, type: 'note', isInPreRoll: false }
          }));
        }
      } else {
        sequencer.handleVoiceNoteChange(trackId, targetPatternId, effectiveStep, note);
        sequencer.handleVoiceNoteBlur(trackId, targetPatternId, effectiveStep, note);

        const nextStep = (effectiveStep + 1) % patternSteps;
        setSelectedStepIdx(nextStep);
        useSequencerStore.setState({ selectedStepIdx: nextStep } as any);
        window.dispatchEvent(new CustomEvent('focus-voice-step', {
          detail: { stepIdx: nextStep, type: 'note', isInPreRoll: false }
        }));
      }
    }
  }, [voiceInputMode, selectedStepIdx, selectedStepIsPreRoll, getEffectivePatternId, sequencer, trackId, patternSteps, setSelectedStepIdx, setSelectedStepIsPreRoll]);

  // Déclencheur PointerUp / Leave (Relâchement sonore)
  const handleNoteUp = useCallback((note: string) => {
    activeNotesRef.current.delete(note);
    setActiveNotes(new Set(activeNotesRef.current));

    if (voiceInputMode === 'free') {
      releaseVoicePitchLive(note);
    } else {
      setTimeout(() => {
        releaseVoicePitchLive(note);
      }, 150);
    }
  }, [voiceInputMode]);

  // Effacer la note du pas sélectionné (Gomme / Silence)
  const handleClearCurrentStep = useCallback(() => {
    if (selectedStepIdx === null) return;
    const targetPatternId = getEffectivePatternId();
    if (selectedStepIsPreRoll) {
      sequencer.handleVoicePreRollNoteChange(trackId, targetPatternId, selectedStepIdx, '');
      sequencer.handleVoicePreRollNoteBlur(trackId, targetPatternId, selectedStepIdx, '');
    } else {
      sequencer.handleVoiceNoteChange(trackId, targetPatternId, selectedStepIdx, '');
      sequencer.handleVoiceNoteBlur(trackId, targetPatternId, selectedStepIdx, '');
    }
  }, [selectedStepIdx, selectedStepIsPreRoll, getEffectivePatternId, sequencer, trackId]);

  const isFr = lang === 'fr';

  return (
    <div className="w-full bg-[#f4ede2] border-t-[3px] border-[#1a1a1a] px-3 py-2 shrink-0 flex flex-col md:flex-row items-center justify-between gap-3 shadow-[0_-2px_6px_rgba(0,0,0,0.06)] z-30 select-none">
      {/* ─── Panneau de gauche : Commutateur de mode & Statut du pas ─── */}
      <div className="flex flex-row md:flex-col items-center md:items-start justify-between w-full md:w-auto shrink-0 gap-2 border-b md:border-b-0 md:border-r border-[#1a1a1a]/15 pb-2 md:pb-0 md:pr-3">
        {/* Toggle Mode Segmenté Cordel */}
        <div className="flex items-center gap-1 bg-[#ece4d0] p-1 rounded-md border border-[#1a1a1a]/20 shadow-xs">
          <button
            type="button"
            onClick={() => setVoiceInputMode('free')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              voiceInputMode === 'free'
                ? 'bg-[#2e7d32] text-[#fcf8ef] shadow-xs'
                : 'text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:bg-black/5'
            }`}
            title={isFr ? "Écoute libre : tester les notes sans modifier la partition" : "Escuta livre: testar notas sem alterar a partitura"}
          >
            <Ear className="w-3.5 h-3.5" />
            <span>{isFr ? 'Écoute libre' : 'Escuta livre'}</span>
          </button>

          <button
            type="button"
            onClick={() => setVoiceInputMode('step')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              voiceInputMode === 'step'
                ? 'bg-[#8b2a1a] text-[#fcf8ef] shadow-xs'
                : 'text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:bg-black/5'
            }`}
            title={isFr ? "Saisie pas-à-pas : inscrire la note et avancer au pas suivant" : "Entrada passo a passo: inserir a nota e avançar"}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isFr ? 'Saisie pas-à-pas' : 'Entrada passo'}</span>
          </button>
        </div>

        {/* Indicateur Pas actif & Bouton Gomme */}
        <div className="flex items-center gap-2 text-[10px] font-medium text-[#1a1a1a]/80">
          <span className="font-mono bg-[#ece4d0] px-1.5 py-0.5 rounded border border-[#1a1a1a]/15">
            {selectedStepIsPreRoll 
              ? (isFr ? '🎙️ Anacrouse' : '🎙️ Anacruse')
              : (isFr ? '🎼 Mesure' : '🎼 Compasso')
            } : <strong className="text-[#8b2a1a]">
              {selectedStepIdx !== null ? `Pas ${selectedStepIdx + 1}` : (isFr ? 'Aucun' : 'Nenhum')}
            </strong>
          </span>

          <button
            type="button"
            onClick={handleClearCurrentStep}
            disabled={selectedStepIdx === null}
            className="p-1 rounded bg-[#ece4d0] hover:bg-[#e2d5bd] text-[#8b2a1a] border border-[#1a1a1a]/20 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
            title={isFr ? "Effacer la note du pas sélectionné (Silence)" : "Limpar nota do passo selecionado (Pausa)"}
          >
            <Eraser className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ─── Clavier Piano Virtuel (3 octaves : C3 à C6) ─── */}
      <div className="relative flex-1 w-full min-w-0 h-[88px] sm:h-[96px] flex rounded-b-md overflow-hidden bg-[#1a1a1a] p-0.5 border-2 border-[#1a1a1a] shadow-inner select-none">
        {/* Touches blanches */}
        <div className="flex w-full h-full">
          {WHITE_KEYS.map((keyDef, idx) => {
            const isNoteActive = activeNotes.has(keyDef.note);

            return (
              <button
                key={keyDef.note}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleNoteDown(keyDef.note);
                }}
                onPointerUp={() => handleNoteUp(keyDef.note)}
                onPointerLeave={() => handleNoteUp(keyDef.note)}
                onPointerCancel={() => handleNoteUp(keyDef.note)}
                className={`relative flex-1 h-full border-r border-[#1a1a1a] last:border-r-0 rounded-b-[3px] flex flex-col justify-end items-center pb-1 transition-colors duration-75 cursor-pointer touch-none ${
                  isNoteActive
                    ? 'bg-[#e07a5f] text-white shadow-inner'
                    : 'bg-[#fcf8ef] hover:bg-[#f5ebd7] text-[#1a1a1a]/70 active:bg-[#e07a5f] active:text-white'
                }`}
                title={keyDef.note}
              >
                {/* Libellé gravé en bas de chaque Do (C) */}
                {keyDef.isC ? (
                  <span className="text-[9px] sm:text-[10px] font-black font-mono tracking-tighter opacity-90 pb-0.5">
                    {keyDef.note}
                  </span>
                ) : (
                  <span className="text-[7px] sm:text-[8px] font-mono opacity-30 pb-0.5 hidden sm:inline">
                    {keyDef.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Touches noires superposées (centrées à cheval sur les lignes mitoyennes des blanches) */}
        {WHITE_KEYS.map((keyDef, idx) => {
          if (!keyDef.hasSharp || !keyDef.sharpNote) return null;

          const sharpNote = keyDef.sharpNote;
          const isSharpActive = activeNotes.has(sharpNote);

          // Calcul géométrique précis : la touche noire fait 65% de la largeur d'une blanche, centrée à cheval
          // La touche blanche idx termine à ((idx + 1) / 22) * 100%
          const leftPercent = ((idx + 1) / 22) * 100;

          return (
            <button
              key={sharpNote}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNoteDown(sharpNote);
              }}
              onPointerUp={() => handleNoteUp(sharpNote)}
              onPointerLeave={() => handleNoteUp(sharpNote)}
              onPointerCancel={() => handleNoteUp(sharpNote)}
              style={{
                left: `${leftPercent}%`,
                width: 'calc(100% / 22 * 0.65)',
                transform: 'translateX(-50%)'
              }}
              className={`absolute top-0 h-[58%] z-20 rounded-b-[2px] border border-[#2d2d2d] cursor-pointer touch-none transition-colors duration-75 flex items-end justify-center pb-1 ${
                isSharpActive
                  ? 'bg-[#c25e38] text-white shadow-inner'
                  : 'bg-[#1a1a1a] hover:bg-[#2c2c2c] active:bg-[#c25e38] shadow-md'
              }`}
              title={sharpNote}
            >
              <span className="text-[6px] font-mono text-white/40 hidden sm:inline leading-none">
                #
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

VoicePianoDock.displayName = 'VoicePianoDock';
