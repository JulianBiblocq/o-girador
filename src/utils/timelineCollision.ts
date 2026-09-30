/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Track, Pattern } from '../types';

/**
 * Vérifie si un motif contient de la matière musicale active (non-silencieux).
 * Prend en compte les coups de percussions (`activeSteps`), les notes vocales et les paroles.
 */
export function isPatternNonSilent(p: Pattern | null | undefined): boolean {
  if (!p) return false;

  // 1. Vérification des pas actifs (percussions / coups standards)
  if (p.activeSteps && Array.isArray(p.activeSteps)) {
    const hasActiveStep = p.activeSteps.some(
      s => s !== null && s !== undefined && s !== '' && s !== '0' && s !== 0
    );
    if (hasActiveStep) return true;
  }

  // 2. Vérification des notes vocales (Puxador / Coro)
  if (p.notes && Array.isArray(p.notes)) {
    const hasActiveNote = p.notes.some(
      n => n !== null && n !== undefined && n !== '' && n !== '0' && n !== '-'
    );
    if (hasActiveNote) return true;
  }

  // 3. Vérification des paroles vocales
  if (p.lyrics && Array.isArray(p.lyrics)) {
    const hasActiveLyric = p.lyrics.some(
      l => l !== null && l !== undefined && String(l).trim() !== ''
    );
    if (hasActiveLyric) return true;
  }

  // 4. Clips audio vocaux
  if (p.vocalAudioData || p.vocalAudioUrl || p.vocalClip) {
    return true;
  }

  // Si le motif n'a pas encore de tableau activeSteps initialisé mais existe
  if (!p.activeSteps || p.activeSteps.length === 0) {
    return true;
  }

  return false;
}

/**
 * Détecte si la plage de mesures [startMeasure, endMeasure] (0-indexée, inclusive)
 * contient déjà au moins un motif actif (non-silencieux) sur l'ensemble des pistes.
 */
export function hasContentInRange(
  startMeasure: number,
  endMeasure: number,
  tracks: Track[]
): boolean {
  if (!tracks || tracks.length === 0 || startMeasure > endMeasure) {
    return false;
  }

  for (let m = startMeasure; m <= endMeasure; m++) {
    for (const track of tracks) {
      const isSlave = Boolean(track.linkedToTrackId && !track.isLinkFolder && !track.isLinkMaster);

      // Cas 1 : Piste esclave liée (avec gestion des patternOverrides)
      if (isSlave) {
        const override = track.patternOverrides?.[m];
        if (override === null) {
          // Silence explicite sur cette piste esclave -> pas de collision sur cette piste
          continue;
        } else if (override !== undefined) {
          // Override avec un identifiant de motif spécifique
          const master = tracks.find(t => String(t.id) === String(track.linkedToTrackId));
          const overriddenPattern =
            master?.patterns?.find(p => p.id === override) ||
            track.patterns?.find(p => p.id === override);
          if (isPatternNonSilent(overriddenPattern)) {
            return true;
          }
          continue;
        } else {
          // Aucun override : suit le motif du maître
          const master = tracks.find(t => String(t.id) === String(track.linkedToTrackId));
          if (master) {
            const masterPattern = master.patterns?.find(p => p.measureAssignments?.[m]);
            if (isPatternNonSilent(masterPattern)) {
              return true;
            }
          }
          continue;
        }
      }

      // Cas 2 : Pistes standards et pistes vocales (Puxador, Coro, etc.)
      if (track.patterns && track.patterns.length > 0) {
        const assignedPattern = track.patterns.find(p => p.measureAssignments?.[m]);
        if (isPatternNonSilent(assignedPattern)) {
          return true;
        }
      }
    }
  }

  return false;
}
