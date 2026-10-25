/**
 * Hook de workflow pour le scanner papier, gestion d'état et persistance Cloud (< 135 lignes).
 */
import { useState, useMemo, useCallback } from 'react';
import { PaperPreset, PaperSequenceItem, PaperStepValue, PatternMetricOverride } from '../../types/paperWorkshop.types';
import { factorizeSequence } from '../../components/paper/SequenceTagBuilder';
import { disambiguateAllPresetPatterns } from '../../utils/paper/paperRoleDisambiguator';
import { detectDoubtPointsInPatterns } from '../../utils/paper/paperScanDoubtDetector';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import {
  PaperSectionItem, buildInitialSections, renameSectionInSequence, resolveUniqueExportNames, exportPatternsWithResolvedNames,
} from '../../utils/paper/paperSectionRenamer';
import { PaperScanDraftPayload } from '../../utils/paper/paperScanCloudStorage';
import { ProcessedVisionPattern } from '../../utils/paper/paperPatternMergeHelper';

export function mapPatternsToSectionIds(patterns: Record<string, any>, secs: PaperSectionItem[]) {
  const disambiguated = disambiguateAllPresetPatterns(JSON.parse(JSON.stringify(patterns)));
  const byId: Record<string, any> = {};
  secs.forEach((s) => { byId[s.id] = disambiguated[s.name] || {}; });
  return byId;
}

interface WorkflowParams {
  initialPreset: PaperPreset;
  scoreId: string;
  globalBpm: number;
  globalTimeSig: string;
  metricOverrides: Record<string, PatternMetricOverride>;
  toadaTitle: string;
  injectOpts: any;
  saveCurrentDraft: (title: string, payload: PaperScanDraftPayload, deviceType: 'mobile' | 'desktop') => Promise<any>;
  setActiveDraftId: (id: string | null) => void;
  lang: 'fr' | 'pt';
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
    const oldSec = sections.find((s) => s.id === secId);
    const oldName = oldSec ? oldSec.name : '';
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
      const key = copy[secIdOrName] ? secIdOrName : (sections.find((s) => s.name === secIdOrName)?.id || secIdOrName);
      if (!copy[key]) copy[key] = {};
      const secCopy = { ...copy[key] };
      if (!secCopy[roleKey]) secCopy[roleKey] = Array(16).fill(0);
      else secCopy[roleKey] = [...secCopy[roleKey]];
      secCopy[roleKey][stepIndex] = newVal;
      copy[key] = secCopy;
      return copy;
    });
  }, [sections]);

  const handleRescanSinglePattern = useCallback((secName: string, patternData: ProcessedVisionPattern) => {
    const targetSec = sections.find((s) => s.name.toLowerCase() === secName.toLowerCase() || s.id === secName) || sections[0];
    const secId = targetSec ? targetSec.id : secName;
    const realSecName = targetSec ? targetSec.name : secName;
    setPatternsById((prev: any) => ({ ...prev, [secId]: patternData.pupitreMap }));
    usePaperVigilanceStore.getState().clearDoubtsForSection(scoreId, realSecName);
    const doubts = detectDoubtPointsInPatterns({ [realSecName]: patternData.pupitreMap });
    usePaperVigilanceStore.getState().registerSectionDoubts(scoreId, realSecName, doubts);
  }, [sections, scoreId]);

  const handleAddNewPattern = useCallback((patternData: ProcessedVisionPattern) => {
    const baseName = patternData.name || `Motif ${sections.length + 1}`;
    let uniqueName = baseName, count = 1;
    while (sections.some((s) => s.name.toLowerCase() === uniqueName.toLowerCase())) {
      uniqueName = `${baseName} (${++count})`;
    }
    const newId = `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setSections((prev) => [...prev, { id: newId, name: uniqueName }]);
    setPatternsById((prev: any) => ({ ...prev, [newId]: patternData.pupitreMap }));
    const doubts = detectDoubtPointsInPatterns({ [uniqueName]: patternData.pupitreMap });
    usePaperVigilanceStore.getState().registerSectionDoubts(scoreId, uniqueName, doubts);
  }, [sections, scoreId]);

  const handleRescanSequence = useCallback((sequenceTokens: string[]) => {
    const factorized = factorizeSequence(sequenceTokens);
    const withIds = factorized.map((item) => {
      const match = sections.find((s) => s.name.toLowerCase() === item.sectionName.toLowerCase());
      return match ? { ...item, sectionId: match.id } : item;
    });
    setSequenceItems(withIds);
  }, [sections]);

  const handleSaveDraft = useCallback(async () => {
    const uniqueNames = resolveUniqueExportNames(sections);
    const finalPatterns = exportPatternsWithResolvedNames(sections, patternsById, uniqueNames);
    const orderedSectionNames = sections.map((s) => uniqueNames[s.id] || s.name);
    const flattenedSequence = sequenceItems.flatMap((item) => {
      const secId = (item as any).sectionId;
      return Array(item.repeatCount).fill((secId && uniqueNames[secId]) || item.sectionName);
    });
    const fullPreset: PaperPreset = {
      ...initialPreset, name: toadaTitle || initialPreset.name, bpm: globalBpm, timeSig: globalTimeSig,
      patterns: finalPatterns, defaultSequence: flattenedSequence, metricOverrides,
    };
    const payload: PaperScanDraftPayload = {
      preset: fullPreset, orderedSectionNames, vigilancePoints: allPoints.filter((p) => p.scoreId === scoreId), injectOptions: injectOpts,
    };
    await saveCurrentDraft(toadaTitle || initialPreset.name, payload, 'desktop');
    const msg = lang === 'fr' ? 'Import sauvegardé sur le Cloud — prêt à être repris sur PC' : 'Importação salva na Nuvem — pronta para continuar no PC';
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: msg } }));
  }, [sections, patternsById, sequenceItems, initialPreset, toadaTitle, globalBpm, globalTimeSig, metricOverrides, allPoints, scoreId, injectOpts, saveCurrentDraft, lang]);

  return {
    sections, setSections, patternsById, setPatternsById, sequenceItems, setSequenceItems,
    reusableSections, setReusableSections, exportedPatterns, handleRenameSection, handleUpdateStep,
    handleRescanSinglePattern, handleAddNewPattern, handleRescanSequence, handleSaveDraft,
  };
}
