/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Injection atomique d'une partition papier transcrite dans le SequencerStore (< 140 lignes).
 */
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { PaperPreset, PupitreCode, PaperStepValue } from '../../types/paperWorkshop.types';
import { Pattern, SongSection, TrackGroup } from '../../types/store.types';

const mapPupitreToInstId = (code: PupitreCode): string => {
  const map: Record<PupitreCode, string> = {
    al: 'marcante',
    cx: 'caixa',
    gg: 'gongue',
    ab: 'agbe',
    mi: 'mineiro',
    tb: 'timbal',
    td: 'puxador',
  };
  return map[code] || 'marcante';
};

export const injectPaperScoreToStore = (
  preset: PaperPreset,
  sequenceOverride?: string[],
  lang: 'fr' | 'pt' = 'fr'
): { success: boolean; measuresCount: number } => {
  const store = useSequencerStore.getState();
  store.pushUndoState();

  const sequence = sequenceOverride && sequenceOverride.length > 0 ? sequenceOverride : preset.defaultSequence;
  const totalMeasures = Math.max(1, sequence.length);

  // 1. Mise à jour du BPM et des mesures
  store.setBpm(preset.bpm || 96);
  store.setTotalMeasures(totalMeasures);

  // 2. Création et injection des patterns sur les pistes correspondantes
  const updatedTracks: TrackGroup[] = store.tracks.map((track) => {
    const inst = instrumentsConfig[track.instrumentIdx];
    const instId = inst?.id || '';

    // Trouver le pupitre qui cible cet instrument
    let matchedPupitre: PupitreCode | null = null;
    if (instId.includes('alfaia') || instId === 'marcante' || (preset.linkedAlfaias && (instId === 'meiao' || instId === 'repique'))) {
      matchedPupitre = 'al';
    } else if (instId === 'caixa' || instId === 'tarol') {
      matchedPupitre = 'cx';
    } else if (instId === 'gongue') {
      matchedPupitre = 'gg';
    } else if (instId === 'agbe') {
      matchedPupitre = 'ab';
    } else if (instId === 'mineiro') {
      matchedPupitre = 'mi';
    } else if (instId === 'timbal') {
      matchedPupitre = 'tb';
    } else if (instId === 'puxador' || instId === 'coro' || instId === 'toada') {
      matchedPupitre = 'td';
    }

    if (!matchedPupitre) return track;

    // Construire la liste des patterns pour cette piste
    const newPatterns: Pattern[] = [];
    const timelinePatterns: Array<number | null> = Array(totalMeasures).fill(null);

    Object.entries(preset.patterns).forEach(([sectionName, pupitreMap], idx) => {
      const rawSteps: PaperStepValue[] = (pupitreMap as any)[matchedPupitre!] || Array(16).fill(0);
      const patId = track.id * 1000 + idx + 1;
      const activeSteps = rawSteps.map((s) => (s === 0 ? 0 : s));

      newPatterns.push({
        id: patId,
        name: sectionName,
        steps: 16,
        activeSteps,
        lyrics: Array(16).fill(''),
        notes: Array(16).fill(''),
        measureAssignments: Array(totalMeasures).fill(false),
      });
    });

    // Remplir le conducteur (timelinePatterns) selon la séquence ordonnée
    sequence.forEach((secName, mIdx) => {
      const pat = newPatterns.find((p) => p.name.toLowerCase() === secName.toLowerCase());
      if (pat) timelinePatterns[mIdx] = pat.id;
    });

    return {
      ...track,
      patterns: newPatterns,
      timelinePatterns,
      selectedPatternId: newPatterns[0]?.id ?? 0,
    };
  });

  store.setTracks(updatedTracks);

  // 3. Construction des sections logiques (SongSections)
  const sections: SongSection[] = [];
  let currentSecName = '';
  let startM = 0;

  sequence.forEach((name, idx) => {
    if (name !== currentSecName) {
      if (currentSecName !== '') {
        sections.push({
          id: `sec-${sections.length + 1}-${Date.now()}`,
          name: currentSecName,
          startMeasure: startM,
          endMeasure: idx - 1,
          color: '#8b2a1a',
        });
      }
      currentSecName = name;
      startM = idx;
    }
  });

  if (currentSecName !== '') {
    sections.push({
      id: `sec-${sections.length + 1}-${Date.now()}`,
      name: currentSecName,
      startMeasure: startM,
      endMeasure: sequence.length - 1,
      color: '#8b2a1a',
    });
  }

  store.setSongSections(sections);

  // 4. Notification visuelle
  const msg = lang === 'fr'
    ? `Partition "${preset.name}" injectée avec succès (${totalMeasures} mesures) !`
    : `Partitura "${preset.name}" injetada com sucesso (${totalMeasures} compassos)!`;
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: msg } }));

  return { success: true, measuresCount: totalMeasures };
};
