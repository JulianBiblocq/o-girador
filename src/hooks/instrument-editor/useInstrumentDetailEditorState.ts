import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Eraser, Clipboard, Trash2, CopyPlus } from 'lucide-react';
import { useSequencerStore, EditorDeepLinkTarget } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { Pattern } from '../../types';
import { CordelMenuItem } from '../../components/ui/CordelContextMenu';
import { getPasteDisabledReason } from '../../utils/patternPasteNormalizer';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';
import { resolveDeepLinkPatternId } from './useInstrumentDetailEditorController';

export interface UseInstrumentDetailEditorStateParams {
  track: any; inst?: any; effectiveEditTrackId: number; trackId: number; displayedPatterns: Pattern[];
  setEditingTrackId: (id: number | null) => void; handleDuplicatePattern: (ptn: Pattern) => void;
  handleClearPatternStrokes: (ptnId: number) => void; handleContextDeletePattern: (ptnId: number) => void;
  onCopyPattern?: (ptn: Pattern) => void; onPastePattern?: (ptnId: number) => void;
  canPaste?: boolean; lang: string; isVocalContext: boolean;
  editorDeepLink?: EditorDeepLinkTarget | null; consumeEditorDeepLink?: () => void;
  isMobile?: boolean; isInspectorMobileOpen?: boolean; setIsInspectorMobileOpen?: (open: boolean) => void;
  puxTrack?: any; coroTrack?: any;
}

function getDefaultPrimaryStroke(instId?: string, instType?: string): string {
  const id = (instId || '').toLowerCase(), type = (instType || '').toLowerCase();
  if (id === 'gongue' || type === 'gongue' || id === 'timbal') return 'G';
  if (id === 'mineiro' || id === 'ganza') return 'P';
  if (id === 'apito') return 'L';
  return ['puxador', 'coro', 'toada'].includes(id) || type === 'voice' ? 'T' : 'D';
}

export function useInstrumentDetailEditorState(params: UseInstrumentDetailEditorStateParams) {
  const {
    track, inst, effectiveEditTrackId, trackId, displayedPatterns, setEditingTrackId,
    handleDuplicatePattern, handleClearPatternStrokes, handleContextDeletePattern, onCopyPattern, onPastePattern,
    canPaste, lang, isVocalContext, editorDeepLink, consumeEditorDeepLink, isMobile, isInspectorMobileOpen,
    setIsInspectorMobileOpen, puxTrack, coroTrack,
  } = params;

  const [selectedPatternId, setSelectedPatternId] = useState<number>(() => resolveDeepLinkPatternId(editorDeepLink?.patternId, displayedPatterns) ?? track?.selectedPatternId ?? displayedPatterns[0]?.id ?? 0);
  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(() => editorDeepLink?.stepIdx !== undefined ? editorDeepLink.stepIdx : null);
  const [selectedStepIndices, setSelectedStepIndices] = useState<number[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [selectedSubIndex, setSelectedSubIndex] = useState<0 | 1 | null>(() => editorDeepLink?.subIndex ?? null);
  const [activeTool, setActiveTool] = useState<string>(() => editorDeepLink?.initialTool || getDefaultPrimaryStroke(inst?.id, inst?.type));
  const [isAlternating, setIsAlternating] = useState<boolean>(false);
  const [isMultiSelectActive, setIsMultiSelectActive] = useState(false);
  const [selectedStepIsPreRoll, setSelectedStepIsPreRoll] = useState<boolean>(() => Boolean(editorDeepLink?.isPreRoll));

  const prevTrackIdRef = useRef(effectiveEditTrackId), prevRawTrackIdRef = useRef(track?.id);
  const prevPatternNameRef = useRef<string | null>(null), prevPatternIndexRef = useRef<number>(0);

  useEffect(() => {
    const curPtn = displayedPatterns.find((p) => p.id === selectedPatternId);
    if (curPtn) { prevPatternNameRef.current = curPtn.name || null; prevPatternIndexRef.current = displayedPatterns.findIndex((p) => p.id === selectedPatternId); }
  }, [selectedPatternId, displayedPatterns]);

  useEffect(() => {
    const store = useSequencerStore.getState(), res = syncMasterPatternsToLinkedFamily(store.tracks, effectiveEditTrackId);
    if (res.changed) store.setTracks(res.tracks);
  }, [effectiveEditTrackId]);

  useEffect(() => {
    if (prevTrackIdRef.current === effectiveEditTrackId) return;
    prevTrackIdRef.current = effectiveEditTrackId;
    if ((editorDeepLink?.patternId !== undefined && editorDeepLink?.patternId !== null) || displayedPatterns.length === 0) return;
    const targetPattern = (prevPatternNameRef.current && displayedPatterns.find((p) => p.name === prevPatternNameRef.current))
      || (prevPatternIndexRef.current >= 0 ? displayedPatterns[prevPatternIndexRef.current] : undefined)
      || (track?.selectedPatternId !== undefined && track?.selectedPatternId !== null ? displayedPatterns.find((p) => p.id === track.selectedPatternId) : undefined)
      || displayedPatterns[0];
    if (targetPattern && targetPattern.id !== selectedPatternId) setSelectedPatternId(targetPattern.id);
  }, [effectiveEditTrackId, displayedPatterns, track?.selectedPatternId, selectedPatternId, editorDeepLink?.patternId]);

  useEffect(() => {
    if (prevRawTrackIdRef.current !== track?.id) { prevRawTrackIdRef.current = track?.id; if (!editorDeepLink?.initialTool) setActiveTool(getDefaultPrimaryStroke(inst?.id, inst?.type)); }
  }, [track?.id, inst?.id, inst?.type, editorDeepLink?.initialTool]);

  useEffect(() => {
    if (!editorDeepLink || (editorDeepLink.trackId !== trackId && editorDeepLink.trackId !== effectiveEditTrackId)) return;
    const hasDlPattern = editorDeepLink.patternId !== undefined && editorDeepLink.patternId !== null;
    if (isVocalContext && hasDlPattern && !displayedPatterns.some((p) => String(p.id) === String(editorDeepLink.patternId))) {
      const sibling = [puxTrack, coroTrack].find((vt) => vt && vt.id !== effectiveEditTrackId && vt.patterns?.some((p: Pattern) => String(p.id) === String(editorDeepLink.patternId)));
      if (sibling) {
        useAudioStore.getState().setSelectedVocalTrackId(sibling.id); useAudioStore.getState().setSelectedVocalPatternId(Number(editorDeepLink.patternId), sibling.id);
        if (!track?.isBusFolder) { setEditingTrackId(sibling.id); return; }
      }
    }
    if (hasDlPattern) {
      const resolvedId = resolveDeepLinkPatternId(editorDeepLink.patternId, displayedPatterns);
      if (resolvedId !== undefined) {
        setSelectedPatternId(resolvedId);
        if (isVocalContext) { useAudioStore.getState().setSelectedVocalPatternId(resolvedId, effectiveEditTrackId); useAudioStore.getState().setSelectedVocalTrackId(effectiveEditTrackId); }
      }
    }
    if (editorDeepLink.stepIdx !== undefined) { setSelectedStepIdx(editorDeepLink.stepIdx); setSelectedStepIsPreRoll(Boolean(editorDeepLink.isPreRoll)); setSelectedSubIndex(editorDeepLink.subIndex ?? null); }
    if (editorDeepLink.initialTool) setActiveTool(editorDeepLink.initialTool);
    if (editorDeepLink.expandTuning && (isMobile || (typeof window !== 'undefined' && window.innerWidth < 1024)) && !isInspectorMobileOpen) { setIsInspectorMobileOpen?.(true); return; }
    consumeEditorDeepLink?.();
  }, [editorDeepLink, trackId, effectiveEditTrackId, displayedPatterns, isVocalContext, puxTrack, coroTrack, track?.isBusFolder, setEditingTrackId, isMobile, isInspectorMobileOpen, setIsInspectorMobileOpen, consumeEditorDeepLink]);

  useEffect(() => {
    const st = useSequencerStore.getState();
    if (st.selectedStepIdx !== selectedStepIdx || st.selectedStepIsPreRoll !== selectedStepIsPreRoll || st.selectedSubIndex !== selectedSubIndex) st.setSelectedStepIdx(selectedStepIdx, selectedStepIsPreRoll, selectedSubIndex);
  }, [selectedStepIdx, selectedStepIsPreRoll, selectedSubIndex]);

  useEffect(() => { (window as any).oGiradorVocalEditorOpen = isVocalContext; return () => { (window as any).oGiradorVocalEditorOpen = false; }; }, [isVocalContext]);

  useEffect(() => {
    if (selectedPatternId !== null && selectedPatternId !== undefined && effectiveEditTrackId !== null && effectiveEditTrackId !== undefined && displayedPatterns.some((p) => p.id === selectedPatternId)) {
      useSequencerStore.getState().setSelectedPatternId(effectiveEditTrackId, selectedPatternId);
      if (trackId !== null && trackId !== undefined && trackId !== effectiveEditTrackId) useSequencerStore.getState().setSelectedPatternId(trackId, selectedPatternId);
    }
  }, [selectedPatternId, effectiveEditTrackId, trackId, displayedPatterns]);

  const handleSwitchVocalTrack = useCallback((targetTrack: any) => {
    if (!targetTrack || targetTrack.id === effectiveEditTrackId) return;
    const idx = displayedPatterns.findIndex((p) => p.id === selectedPatternId);
    const targetPattern = (idx >= 0 && targetTrack.patterns?.[idx]) ? targetTrack.patterns[idx] : (targetTrack.patterns?.[0] ?? null);
    if (targetPattern) { setSelectedPatternId(targetPattern.id); useSequencerStore.getState().setSelectedPatternId(targetTrack.id, targetPattern.id); useAudioStore.getState().setSelectedVocalPatternId(targetPattern.id, targetTrack.id); }
    useAudioStore.getState().setSelectedVocalTrackId(targetTrack.id);
    setSelectedVariationId(null); setSelectedStepIdx(null); setSelectedStepIndices([]); setSelectedSubIndex(null); setEditingTrackId(targetTrack.id);
  }, [effectiveEditTrackId, displayedPatterns, selectedPatternId, setEditingTrackId]);

  const getPatternCardMenuItems = useCallback((ptn: Pattern): CordelMenuItem[] => {
    const copied = useSequencerStore.getState().copiedPattern;
    const hasCopied = Boolean(copied && copied.steps > 0);
    return [
      { id: 'duplicate-pattern', label: lang === 'fr' ? 'Dupliquer ce motif' : 'Duplicar este padrão', icon: React.createElement(CopyPlus, { size: 14 }), onClick: () => handleDuplicatePattern(ptn) },
      { id: 'clear-pattern', label: lang === 'fr' ? 'Effacer toutes les frappes' : 'Limpar todas as batidas', icon: React.createElement(Eraser, { size: 14 }), onClick: () => handleClearPatternStrokes(ptn.id) },
      { id: 'copy-pattern', label: lang === 'fr' ? 'Copier le motif' : 'Copiar padrão', icon: React.createElement(Copy, { size: 14 }), onClick: () => onCopyPattern?.(ptn) },
      { id: 'paste-pattern', label: lang === 'fr' ? 'Coller les pas' : 'Colar passos', icon: React.createElement(Clipboard, { size: 14 }), disabled: !canPaste, disabledReason: getPasteDisabledReason(hasCopied, Boolean(canPaste), lang, copied?.sourceInstId), onClick: () => onPastePattern?.(ptn.id) },
      { id: 'delete-pattern', label: lang === 'fr' ? 'Supprimer ce motif' : 'Excluir padrão', icon: React.createElement(Trash2, { size: 14 }), isDestructive: true, disabled: (track?.patterns?.length || 0) <= 1, onClick: () => handleContextDeletePattern(ptn.id) },
    ];
  }, [handleDuplicatePattern, handleClearPatternStrokes, onCopyPattern, onPastePattern, canPaste, track?.patterns?.length, handleContextDeletePattern, lang]);

  return {
    selectedPatternId, setSelectedPatternId, selectedStepIdx, setSelectedStepIdx, selectedStepIndices, setSelectedStepIndices,
    selectedVariationId, setSelectedVariationId, selectedSubIndex, setSelectedSubIndex, activeTool, setActiveTool,
    isAlternating, setIsAlternating, isMultiSelectActive, setIsMultiSelectActive, selectedStepIsPreRoll, setSelectedStepIsPreRoll,
    isTupletEditMode: selectedSubIndex !== null, handleSwitchVocalTrack, getPatternCardMenuItems,
  };
}
