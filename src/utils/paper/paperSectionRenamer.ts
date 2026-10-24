/**
 * Module utilitaire pur : synchronisation et renommage sécurisé des sections (< 60 lignes).
 */
import { PaperSequenceItem, PaperStepValue } from '../../types/paperWorkshop.types';

export interface PaperSectionItem {
  id: string;
  name: string;
}

export function buildInitialSections(patterns: Record<string, any>): PaperSectionItem[] {
  return Object.keys(patterns).map((name, idx) => ({
    id: `sec-${idx}-${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
  }));
}

export function renameSectionInSequence(
  sequenceItems: PaperSequenceItem[],
  secId: string,
  oldName: string,
  newName: string
): PaperSequenceItem[] {
  return sequenceItems.map((item) => {
    const isTarget = (item as any).sectionId ? (item as any).sectionId === secId : item.sectionName === oldName;
    if (!isTarget) return item;
    return { ...item, sectionName: newName, sectionId: secId } as PaperSequenceItem;
  });
}

export function resolveUniqueExportNames(sections: PaperSectionItem[]): Record<string, string> {
  const result: Record<string, string> = {};
  const used = new Set<string>();

  sections.forEach((sec, idx) => {
    let clean = sec.name.trim() || `Section ${idx + 1}`;
    if (used.has(clean.toLowerCase())) {
      let suffix = 2;
      while (used.has(`${clean}_${suffix}`.toLowerCase())) {
        suffix++;
      }
      clean = `${clean}_${suffix}`;
    }
    used.add(clean.toLowerCase());
    result[sec.id] = clean;
  });

  return result;
}

export function exportPatternsWithResolvedNames(
  sections: PaperSectionItem[],
  patternsById: Record<string, Partial<Record<string, PaperStepValue[]>>>,
  uniqueNames: Record<string, string>
): Record<string, Partial<Record<string, PaperStepValue[]>>> {
  const exported: Record<string, Partial<Record<string, PaperStepValue[]>>> = {};
  sections.forEach((sec, idx) => {
    const exportName = uniqueNames[sec.id] || sec.name.trim() || `Section ${idx + 1}`;
    exported[exportName] = patternsById[sec.id] || {};
  });
  return exported;
}
