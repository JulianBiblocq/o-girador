import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Pattern } from '../../types';
import { getNextPatternName } from '../../utils/patternNaming';
import { notifyToast } from '../../utils/toastHelper';
import { resolveMasterTrack } from '../../utils/trackMasterResolver';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';

export interface UseInstrumentEditorPatternsParams {
  effectiveEditTrackId: number; totalMeasures: number; lang: string; sequencer: any;
  setSelectedPatternId: (id: number) => void;
}

export function useInstrumentEditorPatterns({
  effectiveEditTrackId, totalMeasures, lang, sequencer, setSelectedPatternId,
}: UseInstrumentEditorPatternsParams) {
  const getMasterId = React.useCallback(() => {
    const store = useSequencerStore.getState();
    return resolveMasterTrack(effectiveEditTrackId, store.tracks)?.id ?? effectiveEditTrackId;
  }, [effectiveEditTrackId]);

  const onAddPattern = React.useCallback(() => {
    sequencer.pushUndoState();
    const masterId = getMasterId();
    let createdId: number | null = null;

    useSequencerStore.getState().setTracks((prev) => {
      const masterTrack = prev.find((t) => t.id === masterId);
      const steps = masterTrack?.patterns?.[0]?.steps || 16;
      const newPattern: Pattern = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: getNextPatternName(masterTrack?.patterns || [], undefined, lang),
        steps, activeSteps: Array(steps).fill(0), lyrics: Array(steps).fill(''),
        notes: Array(steps).fill(''), measureAssignments: Array(totalMeasures).fill(false),
        volumes: Array(steps).fill(80), decays: Array(steps).fill(100), microtimings: Array(steps).fill(0),
        variations: [], preRollActiveSteps: Array(16).fill(0), preRollLyrics: Array(16).fill(''),
        preRollNotes: Array(16).fill(''), preRollVolumes: Array(16).fill(80), preRollDecays: Array(16).fill(10),
      };
      createdId = newPattern.id;

      const updated = prev.map((t) => t.id === masterId
        ? { ...t, patterns: [...t.patterns, newPattern], selectedPatternId: newPattern.id } : t
      );
      return syncMasterPatternsToLinkedFamily(updated, masterId).tracks;
    });
    if (createdId) setSelectedPatternId(createdId);
  }, [getMasterId, sequencer, totalMeasures, lang, setSelectedPatternId]);

  const onDeletePattern = React.useCallback((patternId: number) => {
    sequencer.pushUndoState();
    const masterId = getMasterId();
    useSequencerStore.getState().setTracks((prev) => {
      const updated = prev.map((t) => {
        if (t.id === masterId && t.patterns.length > 1) {
          const next = t.patterns.filter((p) => p.id !== patternId);
          return { ...t, patterns: next, selectedPatternId: t.selectedPatternId === patternId ? next[0]?.id || 0 : t.selectedPatternId };
        }
        return t;
      });
      return syncMasterPatternsToLinkedFamily(updated, masterId).tracks;
    });
  }, [getMasterId, sequencer]);

  const handleDuplicatePattern = React.useCallback((sourcePtn: Pattern) => {
    sequencer.pushUndoState();
    const masterId = getMasterId();
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const newPattern: Pattern = {
      ...JSON.parse(JSON.stringify(sourcePtn)), id: newId,
      name: `${sourcePtn.name || (lang === 'fr' ? 'Motif' : 'Padrão')} ${lang === 'fr' ? '(Copie)' : '(Cópia)'}`,
      measureAssignments: Array(totalMeasures).fill(false),
    };
    useSequencerStore.getState().setTracks((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== masterId) return t;
        const pIndex = t.patterns.findIndex((p) => p.id === sourcePtn.id);
        const next = [...t.patterns];
        if (pIndex !== -1) next.splice(pIndex + 1, 0, newPattern); else next.push(newPattern);
        return { ...t, patterns: next, selectedPatternId: newId };
      });
      return syncMasterPatternsToLinkedFamily(updated, masterId).tracks;
    });
    setSelectedPatternId(newId);
  }, [getMasterId, sequencer, totalMeasures, lang, setSelectedPatternId]);

  const handleClearPatternStrokes = React.useCallback((patternId: number) => {
    sequencer.pushUndoState();
    const masterId = getMasterId();
    useSequencerStore.getState().setTracks((prev) => {
      const updated = prev.map((t) => (t.id === masterId ? {
        ...t,
        patterns: t.patterns.map((p) => (p.id === patternId ? {
          ...p, activeSteps: Array(p.steps).fill(0), lyrics: Array(p.steps).fill(''), notes: Array(p.steps).fill(''),
          preRollActiveSteps: p.preRollActiveSteps ? Array(p.preRollActiveSteps.length).fill(0) : undefined,
          preRollLyrics: p.preRollLyrics ? Array(p.preRollLyrics.length).fill('') : undefined,
          preRollNotes: p.preRollNotes ? Array(p.preRollNotes.length).fill('') : undefined,
        } : p)),
      } : t));
      return syncMasterPatternsToLinkedFamily(updated, masterId).tracks;
    });
  }, [getMasterId, sequencer]);

  const handleContextDeletePattern = React.useCallback(async (patternId: number) => {
    const masterId = getMasterId();
    const currentTrack = useSequencerStore.getState().tracks.find((t) => t.id === masterId);
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
  }, [getMasterId, lang, sequencer, onDeletePattern]);

  const onReorderPatternsDnd = React.useCallback((oldIndex: number, newIndex: number) => {
    sequencer.handleReorderPatternsDnd?.(effectiveEditTrackId, oldIndex, newIndex);
  }, [effectiveEditTrackId, sequencer]);

  return {
    onAddPattern, onDeletePattern, handleDuplicatePattern,
    handleClearPatternStrokes, handleContextDeletePattern, onReorderPatternsDnd,
  };
}
