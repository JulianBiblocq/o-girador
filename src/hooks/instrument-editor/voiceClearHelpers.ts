/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSequencerStore } from '../../stores/useSequencerStore';

export function clearVoicePreRollStep(tId: number, pId: number, sIdx: number) {
  useSequencerStore.getState().pushUndoState();
  useSequencerStore.getState().setTracks(prev => prev.map(t => {
    if (t.id === tId || String(t.id) === String(tId)) {
      return {
        ...t,
        patterns: t.patterns.map(p => {
          if (p.id === pId || String(p.id) === String(pId)) {
            const preRollActiveSteps = p.preRollActiveSteps ? [...p.preRollActiveSteps] : Array(16).fill(0);
            preRollActiveSteps[sIdx] = 0;
            const preRollNotes = p.preRollNotes ? [...p.preRollNotes] : Array(16).fill('');
            preRollNotes[sIdx] = '';
            const preRollLyrics = p.preRollLyrics ? [...p.preRollLyrics] : Array(16).fill('');
            preRollLyrics[sIdx] = '';
            return { ...p, preRollActiveSteps, preRollNotes, preRollLyrics };
          }
          return p;
        })
      };
    }
    return t;
  }));
}

export function clearVoiceMainStep(tId: number, pId: number, sIdx: number, isPreRoll?: boolean) {
  if (isPreRoll) {
    clearVoicePreRollStep(tId, pId, sIdx);
    return;
  }
  useSequencerStore.getState().pushUndoState();
  useSequencerStore.getState().setTracks(prev => prev.map(t => {
    if (t.id === tId || String(t.id) === String(tId)) {
      return {
        ...t,
        patterns: t.patterns.map(p => {
          if (p.id === pId || String(p.id) === String(pId)) {
            const activeSteps = [...(p.activeSteps || Array(p.steps).fill(0))];
            activeSteps[sIdx] = 0;
            const notes = [...(p.notes || Array(p.steps).fill(''))];
            notes[sIdx] = '';
            const lyrics = [...(p.lyrics || Array(p.steps).fill(''))];
            lyrics[sIdx] = '';
            return { ...p, activeSteps, notes, lyrics };
          }
          return p;
        })
      };
    }
    return t;
  }));
}
