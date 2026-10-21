/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Fusion et construction des sections de morceaux pour la Timeline (< 50 lignes).
 */
import { SongSection } from '../../types/store.types';
import { parseConductorVariationToken } from './paperVariationCallParser';

export const buildMergedSongSections = (sequence: string[]): SongSection[] => {
  const sections: SongSection[] = [];
  let currentNorm = '', startM = 0;
  sequence.forEach((name, idx) => {
    const parsed = parseConductorVariationToken(name);
    const norm = (parsed.cleanSectionName || name).replace(/_M\d+$/i, '').trim();
    if (norm !== currentNorm) {
      if (currentNorm !== '') {
        sections.push({ id: `sec-${sections.length + 1}-${Date.now()}`, name: currentNorm, startMeasure: startM, endMeasure: idx - 1, color: '#8b2a1a' });
      }
      currentNorm = norm;
      startM = idx;
    }
  });
  if (currentNorm !== '') {
    sections.push({ id: `sec-${sections.length + 1}-${Date.now()}`, name: currentNorm, startMeasure: startM, endMeasure: sequence.length - 1, color: '#8b2a1a' });
  }
  return sections;
};
