/**
 * Hydratation atomique d'un scan complet (Page Entière) Vision (< 95 lignes).
 */
import { VisionScanResponse } from './paperVisionScanService';
import { PaperSectionItem } from './paperSectionRenamer';
import { PaperSequenceItem, PatternMetricOverride } from '../../types/paperWorkshop.types';
import { processVisionPatternData } from './paperPatternMergeHelper';
import { disambiguateAllPresetPatterns } from './paperRoleDisambiguator';
import { factorizeSequence } from '../../components/paper/SequenceTagBuilder';
import { detectDoubtPointsInPatterns } from './paperScanDoubtDetector';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';

export interface FullScanHydrationResult {
  sections: PaperSectionItem[];
  patternsById: Record<string, any>;
  metricOverrides: Record<string, PatternMetricOverride>;
  sequenceItems: PaperSequenceItem[];
  songTitle?: string;
  globalBpm?: number;
  globalTimeSig?: string;
}

export function hydrateFullScanResponse(
  res: VisionScanResponse,
  fallbackTimeSig: string,
  scoreId: string
): FullScanHydrationResult | null {
  const rawList = Array.isArray(res.patterns) && res.patterns.length > 0
    ? res.patterns
    : (res.pattern ? [res.pattern] : []);

  if (rawList.length === 0 && (!res.sequence || res.sequence.length === 0)) {
    return null;
  }

  const sections: PaperSectionItem[] = [];
  const rawPatternsByName: Record<string, any> = {};
  const metricOverrides: Record<string, PatternMetricOverride> = {};
  const usedNames = new Set<string>();

  rawList.forEach((pat, i) => {
    const processed = processVisionPatternData(pat, res.globalTimeSig || fallbackTimeSig);
    if (Object.keys(processed.pupitreMap).length === 0) return;

    const baseName = processed.name || `Motif ${i + 1}`;
    let uniqueName = baseName;
    let count = 1;
    while (usedNames.has(uniqueName.toLowerCase())) {
      uniqueName = `${baseName} (${++count})`;
    }
    usedNames.add(uniqueName.toLowerCase());

    const secId = `sec-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
    sections.push({ id: secId, name: uniqueName });
    rawPatternsByName[uniqueName] = processed.pupitreMap;
    if (processed.metricOverride) metricOverrides[uniqueName] = processed.metricOverride;
  });

  const disambiguated = disambiguateAllPresetPatterns(rawPatternsByName);
  const patternsById: Record<string, any> = {};
  sections.forEach((s) => {
    const ptn = disambiguated[s.name] || {};
    patternsById[s.id] = ptn;
    patternsById[s.name] = ptn;
  });

  const rawSeq = res.sequence && res.sequence.length > 0 ? res.sequence : sections.map((s) => s.name);
  const factorized = factorizeSequence(rawSeq);
  const sequenceItems = factorized.map((item) => {
    const match = sections.find((s) => s.name.toLowerCase() === item.sectionName.toLowerCase());
    return match ? { ...item, sectionId: match.id } : item;
  });

  usePaperVigilanceStore.getState().clearAllForScore(scoreId);
  sections.forEach((sec) => {
    const doubts = detectDoubtPointsInPatterns({ [sec.name]: patternsById[sec.id] || {} });
    usePaperVigilanceStore.getState().registerSectionDoubts(scoreId, sec.name, doubts);
  });

  return {
    sections,
    patternsById,
    metricOverrides,
    sequenceItems,
    songTitle: res.songTitle,
    globalBpm: res.globalBpm,
    globalTimeSig: res.globalTimeSig,
  };
}
