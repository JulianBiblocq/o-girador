/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Résolution de la macro-section de niveau supérieur (level 0) (< 55 lignes).
 */
import { SongSection, SongMarker } from '../../types';

export interface ResolvedTopLevelSection {
  name: string;
  section?: SongSection;
  marker?: SongMarker;
}

export function resolveTopLevelSectionForMeasure(
  sections: SongSection[] | undefined,
  songMarkers: SongMarker[] | undefined,
  currentMeasure: number
): ResolvedTopLevelSection | null {
  if (!sections && !songMarkers) return null;

  const activeSections = (sections || []).filter(
    (s) => s.startMeasure <= currentMeasure && currentMeasure <= s.endMeasure
  );

  if (activeSections.length > 0) {
    activeSections.sort((a, b) => {
      const levelA = a.level ?? 0;
      const levelB = b.level ?? 0;
      if (levelA !== levelB) return levelA - levelB; // level 0 a la priorité absolue
      const spanA = a.endMeasure - a.startMeasure;
      const spanB = b.endMeasure - b.startMeasure;
      return spanB - spanA; // section englobante la plus large
    });

    const top = activeSections[0];
    return { name: top.name, section: top };
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
