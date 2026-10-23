/**
 * Résolution et filtrage exclusif des macro-sections de niveau supérieur (< 65 lignes).
 */
import { SongSection, SongMarker } from '../../types';

export interface ResolvedTopLevelSection {
  name: string;
  section?: SongSection;
  marker?: SongMarker;
}

export function filterTopLevelSections(sections: SongSection[]): SongSection[] {
  if (!sections || sections.length === 0) return [];
  const sorted = [...sections].sort((a, b) => {
    const spanDiff = (b.endMeasure - b.startMeasure) - (a.endMeasure - a.startMeasure);
    if (spanDiff !== 0) return spanDiff;
    const levelDiff = (a.level ?? 0) - (b.level ?? 0);
    return levelDiff !== 0 ? levelDiff : a.startMeasure - b.startMeasure;
  });

  const kept: SongSection[] = [];
  for (const sec of sorted) {
    if (!kept.some((k) => sec.startMeasure <= k.endMeasure && sec.endMeasure >= k.startMeasure)) {
      kept.push(sec);
    }
  }
  return kept.sort((a, b) => a.startMeasure - b.startMeasure);
}

export function resolveTopLevelSectionForMeasure(
  sections: SongSection[] | undefined,
  songMarkers: SongMarker[] | undefined,
  currentMeasure: number
): ResolvedTopLevelSection | null {
  if (!sections && !songMarkers) return null;

  const topSections = filterTopLevelSections(sections || []);
  const active = topSections.find(
    (s) => currentMeasure >= s.startMeasure && currentMeasure <= s.endMeasure
  );

  if (active) {
    return { name: active.name, section: active };
  }

  if (songMarkers && songMarkers.length > 0) {
    const valid = songMarkers
      .filter((m) => m.measure <= currentMeasure)
      .sort((a, b) => b.measure - a.measure);
    if (valid.length > 0) {
      return { name: valid[0].name, marker: valid[0] };
    }
  }

  return null;
}
