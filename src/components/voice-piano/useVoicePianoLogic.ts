/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { playVoicePitchLive, releaseVoicePitchLive } from '../../audio/vocalSynthService';
import { useSequencer } from '../../contexts/SequencerContext';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { VoicePianoDockProps } from './voicePianoTypes';
import { useVoiceMidiListener } from './useVoiceMidiListener';

export function useVoicePianoLogic(props: VoicePianoDockProps) {
  const {
    trackId, patternId, selectedStepIdx, setSelectedStepIdx,
    selectedStepIsPreRoll, setSelectedStepIsPreRoll, patternSteps = 16,
  } = props;

  const sequencer = useSequencer();
  const voiceInputMode = useAudioStore((state) => state.voiceInputMode);
  const setVoiceInputMode = useAudioStore((state) => state.setVoiceInputMode);
  const { activeNotes, setActiveNotes, activeNotesRef } = useVoiceMidiListener();

  const getEffectivePatternId = useCallback(() => {
    if (patternId && patternId !== 0) return patternId;
    const tracks = useSequencerStore.getState().tracks;
    const t = tracks.find((tr) => tr.id === trackId || String(tr.id) === String(trackId));
    return t?.selectedPatternId || t?.patterns?.[0]?.id || patternId;
  }, [patternId, trackId]);

  const handleNoteDown = useCallback((note: string) => {
    activeNotesRef.current.add(note);
    setActiveNotes(new Set(activeNotesRef.current));
    playVoicePitchLive(note, 0.85);

    if (voiceInputMode === 'step') {
      const effectiveStep = selectedStepIdx !== null ? selectedStepIdx : 0;
      const targetPatternId = getEffectivePatternId();

      if (selectedStepIsPreRoll) {
        sequencer.handleVoicePreRollNoteChange(trackId, targetPatternId, effectiveStep, note);
        sequencer.handleVoicePreRollNoteBlur(trackId, targetPatternId, effectiveStep, note);
        if (effectiveStep < patternSteps - 1) {
          setSelectedStepIdx(effectiveStep + 1);
          useSequencerStore.setState({ selectedStepIdx: effectiveStep + 1 } as any);
          window.dispatchEvent(new CustomEvent('focus-voice-step', { detail: { stepIdx: effectiveStep + 1, type: 'note', isInPreRoll: true } }));
        } else {
          setSelectedStepIdx(0);
          setSelectedStepIsPreRoll(false);
          useSequencerStore.setState({ selectedStepIdx: 0 } as any);
          window.dispatchEvent(new CustomEvent('focus-voice-step', { detail: { stepIdx: 0, type: 'note', isInPreRoll: false } }));
        }
      } else {
        sequencer.handleVoiceNoteChange(trackId, targetPatternId, effectiveStep, note);
        sequencer.handleVoiceNoteBlur(trackId, targetPatternId, effectiveStep, note);
        const nextStep = (effectiveStep + 1) % patternSteps;
        setSelectedStepIdx(nextStep);
        useSequencerStore.setState({ selectedStepIdx: nextStep } as any);
        window.dispatchEvent(new CustomEvent('focus-voice-step', { detail: { stepIdx: nextStep, type: 'note', isInPreRoll: false } }));
      }
    }
  }, [voiceInputMode, selectedStepIdx, selectedStepIsPreRoll, getEffectivePatternId, sequencer, trackId, patternSteps, setSelectedStepIdx, setSelectedStepIsPreRoll, setActiveNotes, activeNotesRef]);

  const handleNoteUp = useCallback((note: string) => {
    activeNotesRef.current.delete(note);
    setActiveNotes(new Set(activeNotesRef.current));
    if (voiceInputMode === 'free') releaseVoicePitchLive(note);
    else setTimeout(() => releaseVoicePitchLive(note), 150);
  }, [voiceInputMode, setActiveNotes, activeNotesRef]);

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

  const handleActivateStepMode = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    setVoiceInputMode('step');
    const isStepNull = selectedStepIdx === null || selectedStepIdx === undefined;
    const targetStep = isStepNull ? 0 : (selectedStepIdx ?? 0);
    const targetIsPreRoll = isStepNull ? false : Boolean(selectedStepIsPreRoll);

    if (isStepNull) {
      if (setSelectedStepIdx) setSelectedStepIdx(0);
      if (setSelectedStepIsPreRoll) setSelectedStepIsPreRoll(false);
      useSequencerStore.setState({ selectedStepIdx: 0, selectedStepIsPreRoll: false, selectedSubIndex: null });
      useSequencerStore.getState().setSelectedStepIdx?.(0, false, null);
    }

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('focus-voice-step', {
        detail: { stepIdx: targetStep, type: 'note', isInPreRoll: targetIsPreRoll, patternId: getEffectivePatternId() }
      }));
    }, 10);
  }, [selectedStepIdx, selectedStepIsPreRoll, setVoiceInputMode, setSelectedStepIdx, setSelectedStepIsPreRoll, getEffectivePatternId]);

  return { activeNotes, voiceInputMode, setVoiceInputMode, handleNoteDown, handleNoteUp, handleClearCurrentStep, handleActivateStepMode };
}
