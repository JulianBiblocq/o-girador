/**
 * Hook de workflow pour le scanner papier, gestion d'état et persistance Cloud (< 135 lignes).
 */
import { useState, useMemo, useCallback } from 'react';
import { PaperPreset, PaperSequenceItem, PaperStepValue, PatternMetricOverride } from '../../types/paperWorkshop.types';
import { factorizeSequence } from '../../components/paper/SequenceTagBuilder';
import { disambiguateAllPresetPatterns } from '../../utils/paper/paperRoleDisambiguator';
import { detectDoubtPointsInPatterns } from '../../utils/paper/paperScanDoubtDetector';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { PaperSectionItem, buildInitialSections, renameSectionInSequence, resolveUniqueExportNames, exportPatternsWithResolvedNames } from '../../utils/paper/paperSectionRenamer';
import { PaperScanDraftPayload } from '../../utils/paper/paperScanCloudStorage';
import { ProcessedVisionPattern } from '../../utils/paper/paperPatternMergeHelper';
import { FullScanHydrationResult } from '../../utils/paper/paperFullScanHydrator';

export function mapPatternsToSectionIds(patterns: Record<string, any>, secs: PaperSectionItem[]) {
  const disambiguated = disambiguateAllPresetPatterns(JSON.parse(JSON.stringify(patterns)));
  const byId: Record<string, any> = {};
  secs.forEach((s) => { byId[s.id] = disambiguated[s.name] || {}; });
  return byId;
}

interface WorkflowParams {
  initialPreset: PaperPreset; scoreId: string; globalBpm: number; globalTimeSig: string;
  metricOverrides: Record<string, PatternMetricOverride>; toadaTitle: string; injectOpts: any;
  saveCurrentDraft: (title: string, payload: PaperScanDraftPayload, deviceType: 'mobile' | 'desktop') => Promise<any>;
  setActiveDraftId: (id: string | null) => void; lang: 'fr' | 'pt';
}

export function usePaperScannerWorkflow({
  initialPreset, scoreId, globalBpm, globalTimeSig, metricOverrides,
  toadaTitle, injectOpts, saveCurrentDraft, setActiveDraftId, lang,
}: WorkflowParams) {
  const [sections, setSections] = useState<PaperSectionItem[]>(() => buildInitialSections(initialPreset.patterns));
  const [patternsById, setPatternsById] = useState<Record<string, any>>(() => mapPatternsToSectionIds(initialPreset.patterns, buildInitialSections(initialPreset.patterns)));
  const [sequenceItems, setSequenceItems] = useState<PaperSequenceItem[]>(() => factorizeSequence(initialPreset.defaultSequence));
  const [reusableSections, setReusableSections] = useState<Set<string>>(() => new Set());
  const allPoints = usePaperVigilanceStore((state) => state.points);

  const exportedPatterns = useMemo(() => {
    const uniqueNames = resolveUniqueExportNames(sections);
    return exportPatternsWithResolvedNames(sections, patternsById, uniqueNames);
  }, [sections, patternsById]);

  const handleRenameSection = useCallback((secId: string, newName: string) => {
    const oldSec = sections.find((s) => s.id === secId), oldName = oldSec ? oldSec.name : '';
    setSections((prev) => prev.map((s) => (s.id === secId ? { ...s, name: newName } : s)));
    setSequenceItems((prev) => renameSectionInSequence(prev, secId, oldName, newName));
    if (oldName && newName.trim() && oldName !== newName) {
      setReusableSections((prev) => { if (!prev.has(oldName)) return prev; const next = new Set(prev); next.delete(oldName); next.add(newName); return next; });
      usePaperVigilanceStore.getState().renameSection(scoreId, oldName, newName);
    }
  }, [sections, scoreId]);

  const handleUpdateStep = useCallback((secIdOrName: string, roleKey: string, stepIndex: number, newVal: PaperStepValue) => {
    setPatternsById((prev: any) => {
      const copy = { ...prev };
      const sec = sections.find((s) => s.id === secIdOrName || s.name.toLowerCase() === secIdOrName.toLowerCase());
      const secId = sec ? sec.id : secIdOrName;
      const base = copy[secId] || copy[sec ? sec.name : secIdOrName] || {};
      const secCopy = { ...base, [roleKey]: base[roleKey] ? [...base[roleKey]] : Array(16).fill(0) };
      secCopy[roleKey][stepIndex] = newVal;
      copy[secId] = secCopy;
      if (sec) copy[sec.name] = secCopy;
      return copy;
    });
  }, [sections]);

  const handleUpdatePupitreRow = useCallback((secIdOrName: string, roleKey: string, newSteps: PaperStepValue[]) => {
    setPatternsById((prev: any) => {
      const copy = { ...prev };
      const sec = sections.find((s) => s.id === secIdOrName || s.name.toLowerCase() === secIdOrName.toLowerCase());
      const secId = sec ? sec.id : secIdOrName;
      const secCopy = { ...(copy[secId] || copy[sec ? sec.name : secIdOrName] || {}), [roleKey]: [...newSteps] };
      copy[secId] = secCopy;
      if (sec) copy[sec.name] = secCopy;
      return copy;
    });
  }, [sections]);

  const handleRescanSinglePattern = useCallback((secName: string, patternData: ProcessedVisionPattern) => {
    const targetSec = sections.find((s) => s.name.toLowerCase() === secName.toLowerCase() || s.id === secName) || sections[0];
    const secId = targetSec ? targetSec.id : secName, realSecName = targetSec ? targetSec.name : secName;
    setPatternsById((prev: any) => ({ ...prev, [secId]: { ...patternData.pupitreMap }, [realSecName]: { ...patternData.pupitreMap } }));
    usePaperVigilanceStore.getState().clearDoubtsForSection(scoreId, realSecName);
    const doubts = [...detectDoubtPointsInPatterns({ [realSecName]: patternData.pupitreMap }), ...(patternData.rawDoubts || [])];
    usePaperVigilanceStore.getState().registerSectionDoubts(scoreId, realSecName, doubts);
  }, [sections, scoreId]);

  const handleAddNewPattern = useCallback((patternData: ProcessedVisionPattern): string => {
    const baseName = patternData.name || `Motif ${sections.length + 1}`;
    let uniqueName = baseName, count = 1;
    while (sections.some((s) => s.name.toLowerCase() === uniqueName.toLowerCase())) uniqueName = `${baseName} (${++count})`;
    const newId = `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setSections((prev) => [...prev, { id: newId, name: uniqueName }]);
    setPatternsById((prev: any) => ({ ...prev, [newId]: { ...patternData.pupitreMap }, [uniqueName]: { ...patternData.pupitreMap } }));
    const doubts = [...detectDoubtPointsInPatterns({ [uniqueName]: patternData.pupitreMap }), ...(patternData.rawDoubts || [])];
    usePaperVigilanceStore.getState().registerSectionDoubts(scoreId, uniqueName, doubts);
    return uniqueName;
  }, [sections, scoreId]);

  const handleRescanSequence = useCallback((sequenceTokens: string[]) => {
    const factorized = factorizeSequence(sequenceTokens);
    setSequenceItems(factorized.map((item) => {
      const match = sections.find((s) => s.name.toLowerCase() === item.sectionName.toLowerCase());
      return match ? { ...item, sectionId: match.id } : item;
    }));
  }, [sections]);

  const handleApplyFullScan = useCallback((result: FullScanHydrationResult) => {
    setSections(result.sections);
    setPatternsById(result.patternsById);
    setSequenceItems(result.sequenceItems);
    setReusableSections(new Set());
  }, []);

  const handleSaveDraft = useCallback(async () => {
    const uniqueNames = resolveUniqueExportNames(sections);
    const finalPatterns = exportPatternsWithResolvedNames(sections, patternsById, uniqueNames);
    const orderedSectionNames = sections.map((s) => uniqueNames[s.id] || s.name);
    const flattenedSequence = sequenceItems.flatMap((item) => Array(item.repeatCount).fill(((item as any).sectionId && uniqueNames[(item as any).sectionId]) || item.sectionName));
    const fullPreset: PaperPreset = {
      ...initialPreset, name: toadaTitle || initialPreset.name, bpm: globalBpm, timeSig: globalTimeSig,
      patterns: finalPatterns, defaultSequence: flattenedSequence, metricOverrides,
    };
    await saveCurrentDraft(toadaTitle || initialPreset.name, {
      preset: fullPreset, orderedSectionNames, vigilancePoints: allPoints.filter((p) => p.scoreId === scoreId), injectOptions: injectOpts,
    }, 'desktop');
    const msg = lang === 'fr' ? 'Import sauvegardé sur le Cloud — prêt à être repris sur PC' : 'Importação salva na Nuvem — pronta para continuar no PC';
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: msg } }));
  }, [sections, patternsById, sequenceItems, initialPreset, toadaTitle, globalBpm, globalTimeSig, metricOverrides, allPoints, scoreId, injectOpts, saveCurrentDraft, lang]);

  return {
    sections, setSections, patternsById, setPatternsById, sequenceItems, setSequenceItems,
    reusableSections, setReusableSections, exportedPatterns, handleRenameSection, handleUpdateStep,
    handleUpdatePupitreRow, handleRescanSinglePattern, handleAddNewPattern, handleRescanSequence,
    handleApplyFullScan, handleSaveDraft,
  };
}
