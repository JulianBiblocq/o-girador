
import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Eraser, Clipboard, Trash2, CopyPlus } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Pattern } from '../../types';
import { CordelMenuItem } from '../../components/ui/CordelContextMenu';

export interface UseInstrumentDetailEditorStateParams {
  track: any;
  effectiveEditTrackId: number;
  trackId: number;
  displayedPatterns: Pattern[];
  setEditingTrackId: (id: number | null) => void;
  handleDuplicatePattern: (ptn: Pattern) => void;
  handleClearPatternStrokes: (ptnId: number) => void;
  handleContextDeletePattern: (ptnId: number) => void;
  onCopyPattern?: (ptn: Pattern) => void;
  onPastePattern?: (ptnId: number) => void;
  canPaste?: boolean;
  lang: string;
  isVocalContext: boolean;
}

export function useInstrumentDetailEditorState({
  track, effectiveEditTrackId, trackId, displayedPatterns, setEditingTrackId,
  handleDuplicatePattern, handleClearPatternStrokes, handleContextDeletePattern,
  onCopyPattern, onPastePattern, canPaste, lang, isVocalContext,
}: UseInstrumentDetailEditorStateParams) {
  const [selectedPatternId, setSelectedPatternId] = useState<number>(() => track?.selectedPatternId || displayedPatterns[0]?.id || 0);
  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(null);
  const [selectedStepIndices, setSelectedStepIndices] = useState<number[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [selectedSubIndex, setSelectedSubIndex] = useState<0 | 1 | null>(null);
  const [activeTool, setActiveTool] = useState<string>('O');
  const [isAlternating, setIsAlternating] = useState<boolean>(true);
  const [isMultiSelectActive, setIsMultiSelectActive] = useState(false);
  const [selectedStepIsPreRoll, setSelectedStepIsPreRoll] = useState<boolean>(false);
  const isTupletEditMode = selectedSubIndex !== null;

  useEffect(() => {
    (window as any).oGiradorVocalEditorOpen = isVocalContext;
    return () => { (window as any).oGiradorVocalEditorOpen = false; };
  }, [isVocalContext]);

  useEffect(() => {
    if (selectedPatternId && effectiveEditTrackId) useSequencerStore.getState().setSelectedPatternId(effectiveEditTrackId, selectedPatternId);
    if (trackId && trackId !== effectiveEditTrackId) useSequencerStore.getState().setSelectedPatternId(trackId, selectedPatternId);
  }, [selectedPatternId, effectiveEditTrackId, trackId]);

  const handleSwitchVocalTrack = useCallback((targetTrack: any) => {
    if (!targetTrack || targetTrack.id === effectiveEditTrackId) return;
    const currentPtnIdx = displayedPatterns.findIndex((p) => p.id === selectedPatternId);
    const targetPattern = (currentPtnIdx >= 0 && targetTrack.patterns?.[currentPtnIdx]) ? targetTrack.patterns[currentPtnIdx] : (targetTrack.patterns?.[0] || null);
    if (targetPattern) {
      setSelectedPatternId(targetPattern.id);
      useSequencerStore.getState().setSelectedPatternId(targetTrack.id, targetPattern.id);
    }
    setSelectedVariationId(null);
    setSelectedStepIdx(null);
    setSelectedStepIndices([]);
    setSelectedSubIndex(null);
    setEditingTrackId(targetTrack.id);
  }, [effectiveEditTrackId, displayedPatterns, selectedPatternId, setEditingTrackId]);

  const getPatternCardMenuItems = useCallback((ptn: Pattern): CordelMenuItem[] => [
    { id: 'duplicate-pattern', label: lang === 'fr' ? 'Dupliquer ce motif' : 'Duplicar este padrão', icon: React.createElement(CopyPlus, { size: 14 }), onClick: () => handleDuplicatePattern(ptn) },
    { id: 'clear-pattern', label: lang === 'fr' ? 'Effacer toutes les frappes' : 'Limpar todas as batidas', icon: React.createElement(Eraser, { size: 14 }), onClick: () => handleClearPatternStrokes(ptn.id) },
    { id: 'copy-pattern', label: lang === 'fr' ? 'Copier le motif' : 'Copiar padrão', icon: React.createElement(Copy, { size: 14 }), onClick: () => onCopyPattern?.(ptn) },
    { id: 'paste-pattern', label: lang === 'fr' ? 'Coller les pas' : 'Colar passos', icon: React.createElement(Clipboard, { size: 14 }), disabled: !canPaste, onClick: () => onPastePattern?.(ptn.id) },
    { id: 'delete-pattern', label: lang === 'fr' ? 'Supprimer ce motif' : 'Excluir padrão', icon: React.createElement(Trash2, { size: 14 }), isDestructive: true, disabled: (track?.patterns?.length || 0) <= 1, onClick: () => handleContextDeletePattern(ptn.id) },
  ], [handleDuplicatePattern, handleClearPatternStrokes, onCopyPattern, onPastePattern, canPaste, track?.patterns?.length, handleContextDeletePattern, lang]);

  return {
    selectedPatternId, setSelectedPatternId, selectedStepIdx, setSelectedStepIdx,
    selectedStepIndices, setSelectedStepIndices, selectedVariationId, setSelectedVariationId,
    selectedSubIndex, setSelectedSubIndex, activeTool, setActiveTool,
    isAlternating, setIsAlternating, isMultiSelectActive, setIsMultiSelectActive,
    selectedStepIsPreRoll, setSelectedStepIsPreRoll, isTupletEditMode,
    handleSwitchVocalTrack, getPatternCardMenuItems,
  };
}
