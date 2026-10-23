/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Pattern } from '../../types';
import { getNextPatternName } from '../../utils/patternNaming';
import { notifyToast } from '../../utils/toastHelper';

export interface UseInstrumentEditorPatternsParams {
  effectiveEditTrackId: number;
  totalMeasures: number;
  lang: string;
  sequencer: any;
  setSelectedPatternId: (id: number) => void;
}

export function useInstrumentEditorPatterns({
  effectiveEditTrackId, totalMeasures, lang, sequencer, setSelectedPatternId,
}: UseInstrumentEditorPatternsParams) {
  const onAddPattern = React.useCallback(() => {
    sequencer.pushUndoState();
    useSequencerStore.getState().setTracks((prev) => prev.map((t) => {
      if (t.id !== effectiveEditTrackId) return t;
      const p = t.patterns[0];
      const steps = p ? p.steps : 16;
      const newPattern: Pattern = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: getNextPatternName(t.patterns, undefined, lang),
        steps,
        activeSteps: Array(steps).fill(0),
        lyrics: Array(steps).fill(''),
        notes: Array(steps).fill(''),
        measureAssignments: Array(totalMeasures).fill(false),
        volumes: Array(steps).fill(80),
        decays: Array(steps).fill(100),
        microtimings: Array(steps).fill(0),
        variations: [],
        preRollActiveSteps: Array(16).fill(0),
        preRollLyrics: Array(16).fill(''),
        preRollNotes: Array(16).fill(''),
        preRollVolumes: Array(16).fill(100),
        preRollDecays: Array(16).fill(10),
      };
      return { ...t, patterns: [...t.patterns, newPattern], selectedPatternId: newPattern.id };
    }));
  }, [effectiveEditTrackId, sequencer, totalMeasures, lang]);

  const onDeletePattern = React.useCallback((patternId: number) => {
    sequencer.pushUndoState();
    useSequencerStore.getState().setTracks((prev) => prev.map((t) => {
      if (t.id === effectiveEditTrackId && t.patterns.length > 1) {
        const nextPatterns = t.patterns.filter((p) => p.id !== patternId);
        const nextSelected = t.selectedPatternId === patternId ? nextPatterns[0].id : t.selectedPatternId;
        return { ...t, patterns: nextPatterns, selectedPatternId: nextSelected };
      }
      return t;
    }));
  }, [effectiveEditTrackId, sequencer]);

  const handleDuplicatePattern = React.useCallback((sourcePtn: Pattern) => {
    sequencer.pushUndoState();
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const copySuffix = lang === 'fr' ? '(Copie)' : '(Cópia)';
    const newPattern: Pattern = {
      ...JSON.parse(JSON.stringify(sourcePtn)),
      id: newId,
      name: `${sourcePtn.name || (lang === 'fr' ? 'Motif' : 'Padrão')} ${copySuffix}`,
      measureAssignments: Array(totalMeasures).fill(false),
    };
    useSequencerStore.getState().setTracks((prev) => prev.map((t) => {
      if (t.id !== effectiveEditTrackId) return t;
      const pIndex = t.patterns.findIndex((p) => p.id === sourcePtn.id);
      const nextPatterns = [...t.patterns];
      if (pIndex !== -1) nextPatterns.splice(pIndex + 1, 0, newPattern);
      else nextPatterns.push(newPattern);
      return { ...t, patterns: nextPatterns, selectedPatternId: newId };
    }));
    setSelectedPatternId(newId);
  }, [effectiveEditTrackId, sequencer, totalMeasures, lang, setSelectedPatternId]);

  const handleClearPatternStrokes = React.useCallback((patternId: number) => {
    sequencer.pushUndoState();
    useSequencerStore.getState().setTracks((prev) => prev.map((t) => {
      if (t.id !== effectiveEditTrackId) return t;
      return {
        ...t,
        patterns: t.patterns.map((p) => (p.id === patternId ? {
          ...p,
          activeSteps: Array(p.steps).fill(0),
          lyrics: Array(p.steps).fill(''),
          notes: Array(p.steps).fill(''),
          preRollActiveSteps: p.preRollActiveSteps ? Array(p.preRollActiveSteps.length).fill(0) : undefined,
          preRollLyrics: p.preRollLyrics ? Array(p.preRollLyrics.length).fill('') : undefined,
          preRollNotes: p.preRollNotes ? Array(p.preRollNotes.length).fill('') : undefined,
        } : p)),
      };
    }));
  }, [effectiveEditTrackId, sequencer]);

  const handleContextDeletePattern = React.useCallback(async (patternId: number) => {
    const currentTrack = useSequencerStore.getState().tracks.find((t) => t.id === effectiveEditTrackId);
    if (!currentTrack || currentTrack.patterns.length <= 1) {
      notifyToast(lang === 'fr' ? 'Impossible de supprimer le dernier motif restant.' : 'Não é possível excluir o último padrão restante.', 'error');
      return;
    }
    const targetPattern = currentTrack.patterns.find((p) => p.id === patternId);
    if (targetPattern?.measureAssignments?.some(Boolean)) {
      const confirm = await sequencer.confirmAsync(
        lang === 'fr' ? 'Ce motif est actuellement utilisé sur la timeline. Supprimer ?' : 'Este padrão está em uso na linha do tempo. Excluir?'
      );
      if (!confirm) return;
    }
    onDeletePattern(patternId);
  }, [effectiveEditTrackId, lang, sequencer, onDeletePattern]);

  const onReorderPatternsDnd = React.useCallback((oldIndex: number, newIndex: number) => {
    sequencer.handleReorderPatternsDnd?.(effectiveEditTrackId, oldIndex, newIndex);
  }, [effectiveEditTrackId, sequencer]);

  return {
    onAddPattern, onDeletePattern, handleDuplicatePattern,
    handleClearPatternStrokes, handleContextDeletePattern, onReorderPatternsDnd,
  };
}
