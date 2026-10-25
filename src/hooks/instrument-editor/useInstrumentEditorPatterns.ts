
import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Pattern } from '../../types';
import { getNextPatternName } from '../../utils/patternNaming';
import { notifyToast } from '../../utils/toastHelper';
import { resolveMasterTrack } from '../../utils/trackMasterResolver';

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
  const getTargetTrackInfo = React.useCallback(() => {
    const store = useSequencerStore.getState();
    const master = resolveMasterTrack(effectiveEditTrackId, store.tracks);
    const masterId = master?.id ?? effectiveEditTrackId;
    const busId = master?.linkedToTrackId ? String(master.linkedToTrackId) : null;
    return { masterId, busId };
  }, [effectiveEditTrackId]);
  const onAddPattern = React.useCallback(() => {
    sequencer.pushUndoState();
    const { masterId, busId } = getTargetTrackInfo();
    let createdId: number | null = null;

    useSequencerStore.getState().setTracks((prev) => {
      const masterTrack = prev.find((t) => t.id === masterId);
      const p = masterTrack?.patterns?.[0];
      const steps = p ? p.steps : 16;
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

      return prev.map((t) => {
        if (t.id === masterId) return { ...t, patterns: [...t.patterns, newPattern], selectedPatternId: newPattern.id };
        if (busId && String(t.id) === busId && t.isLinkFolder) return { ...t, patterns: [...t.patterns, { ...newPattern }] };
        return t;
      });
    });
    if (createdId) setSelectedPatternId(createdId);
  }, [getTargetTrackInfo, sequencer, totalMeasures, lang, setSelectedPatternId]);

  const onDeletePattern = React.useCallback((patternId: number) => {
    sequencer.pushUndoState();
    const { masterId, busId } = getTargetTrackInfo();
    useSequencerStore.getState().setTracks((prev) => prev.map((t) => {
      if ((t.id === masterId || (busId && String(t.id) === busId && t.isLinkFolder)) && t.patterns.length > 1) {
        const nextPatterns = t.patterns.filter((p) => p.id !== patternId);
        const nextSelected = t.selectedPatternId === patternId ? nextPatterns[0]?.id || 0 : t.selectedPatternId;
        return { ...t, patterns: nextPatterns, selectedPatternId: nextSelected };
      }
      return t;
    }));
  }, [getTargetTrackInfo, sequencer]);

  const handleDuplicatePattern = React.useCallback((sourcePtn: Pattern) => {
    sequencer.pushUndoState();
    const { masterId, busId } = getTargetTrackInfo();
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const copySuffix = lang === 'fr' ? '(Copie)' : '(Cópia)';
    const newPattern: Pattern = {
      ...JSON.parse(JSON.stringify(sourcePtn)),
      id: newId,
      name: `${sourcePtn.name || (lang === 'fr' ? 'Motif' : 'Padrão')} ${copySuffix}`,
      measureAssignments: Array(totalMeasures).fill(false),
    };
    useSequencerStore.getState().setTracks((prev) => prev.map((t) => {
      if (t.id === masterId || (busId && String(t.id) === busId && t.isLinkFolder)) {
        const pIndex = t.patterns.findIndex((p) => p.id === sourcePtn.id);
        const nextPatterns = [...t.patterns];
        if (pIndex !== -1) nextPatterns.splice(pIndex + 1, 0, newPattern);
        else nextPatterns.push(newPattern);
        return { ...t, patterns: nextPatterns, selectedPatternId: newId };
      }
      return t;
    }));
    setSelectedPatternId(newId);
  }, [getTargetTrackInfo, sequencer, totalMeasures, lang, setSelectedPatternId]);

  const handleClearPatternStrokes = React.useCallback((patternId: number) => {
    sequencer.pushUndoState();
    const { masterId, busId } = getTargetTrackInfo();
    useSequencerStore.getState().setTracks((prev) => prev.map((t) => {
      if (t.id === masterId || (busId && String(t.id) === busId && t.isLinkFolder)) {
        return {
          ...t,
          patterns: t.patterns.map((p) => (p.id === patternId ? {
            ...p,
            activeSteps: Array(p.steps).fill(0), lyrics: Array(p.steps).fill(''), notes: Array(p.steps).fill(''),
            preRollActiveSteps: p.preRollActiveSteps ? Array(p.preRollActiveSteps.length).fill(0) : undefined,
            preRollLyrics: p.preRollLyrics ? Array(p.preRollLyrics.length).fill('') : undefined,
            preRollNotes: p.preRollNotes ? Array(p.preRollNotes.length).fill('') : undefined,
          } : p)),
        };
      }
      return t;
    }));
  }, [getTargetTrackInfo, sequencer]);

  const handleContextDeletePattern = React.useCallback(async (patternId: number) => {
    const { masterId } = getTargetTrackInfo();
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
  }, [getTargetTrackInfo, lang, sequencer, onDeletePattern]);

  const onReorderPatternsDnd = React.useCallback((oldIndex: number, newIndex: number) => {
    sequencer.handleReorderPatternsDnd?.(effectiveEditTrackId, oldIndex, newIndex);
  }, [effectiveEditTrackId, sequencer]);

  return {
    onAddPattern, onDeletePattern, handleDuplicatePattern,
    handleClearPatternStrokes, handleContextDeletePattern, onReorderPatternsDnd,
  };
}
