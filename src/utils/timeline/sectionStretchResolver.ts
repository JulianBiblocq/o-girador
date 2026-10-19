/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SongSection, Track } from '../../types';
import { hasContentInRange } from '../timelineCollision';
import { useSequencerStore } from '../../stores/useSequencerStore';

export interface SectionStretchCheckResult {
  hasCollision: boolean;
  targetRange: {
    start: number;
    end: number;
  };
}

/**
 * Calcule l'intervalle cible lors d'un étirement de section et détermine s'il y a conflit
 * avec des motifs musicaux existants.
 */
export function checkSectionStretchCollision(
  section: SongSection,
  copies: number,
  tracks: Track[]
): SectionStretchCheckResult {
  const sectionLength = section.endMeasure - section.startMeasure + 1;
  const count = copies * sectionLength;
  const targetStart = section.endMeasure + 1;
  const targetEnd = section.endMeasure + count;

  const hasCollision = hasContentInRange(targetStart, targetEnd, tracks);

  return {
    hasCollision,
    targetRange: {
      start: targetStart,
      end: targetEnd,
    },
  };
}

/**
 * Exécute l'étirement d'une section en mode insertion (décalage) ou écrasement.
 */
export function executeSectionStretch(
  sectionId: string,
  targetEnd: number,
  mode: 'insert' | 'overwrite'
): void {
  useSequencerStore.getState().stretchSongSection(sectionId, targetEnd, mode);
}
