/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Injection atomique d'une partition papier transcrite et points de vigilance (< 135 lignes).
 */
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { PaperPreset, PaperStepValue } from '../../types/paperWorkshop.types';
import { Pattern, SongSection, TrackGroup } from '../../types/store.types';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';

export const injectPaperScoreToStore = (
  preset: PaperPreset,
  sequenceOverride?: string[],
  reusableSectionNames?: Set<string>,
  lang: 'fr' | 'pt' = 'fr',
  openOnFirstVigilance = false
): { success: boolean; measuresCount: number } => {
  const store = useSequencerStore.getState();
  store.pushUndoState();

  const sequence = sequenceOverride && sequenceOverride.length > 0 ? sequenceOverride : preset.defaultSequence;
  const totalMeasures = Math.max(1, sequence.length);

  store.setBpm(preset.bpm || 96);
  store.setTotalMeasures(totalMeasures);

  const updatedTracks: TrackGroup[] = store.tracks.map((track) => {
    const instId = instrumentsConfig[track.instrumentIdx]?.id || '';
    let specificCode = '', groupCode = '';
    if (instId === 'marcante') { specificCode = 'mc'; groupCode = 'al'; }
    else if (instId === 'meiao') { specificCode = 'me'; groupCode = 'al'; }
    else if (instId === 'repique') { specificCode = 'rp'; groupCode = 'al'; }
    else if (instId.includes('alfaia')) { specificCode = 'al'; groupCode = 'al'; }
    else if (instId === 'caixa') { specificCode = 'cx'; groupCode = 'cx'; }
    else if (instId === 'tarol') { specificCode = 'tr'; groupCode = 'cx'; }
    else if (instId === 'gongue') { specificCode = 'gg'; groupCode = 'gg'; }
    else if (instId === 'agbe') { specificCode = 'ab'; groupCode = 'ab'; }
    else if (instId === 'mineiro') { specificCode = 'mi'; groupCode = 'mi'; }
    else if (instId === 'timbal') { specificCode = 'tb'; groupCode = 'tb'; }
    else if (instId === 'puxador' || instId === 'coro' || instId === 'toada') { specificCode = 'td'; groupCode = 'td'; }
    if (!groupCode) return track;

    const newPatterns: Pattern[] = [];
    const timelinePatterns: Array<number | null> = Array(totalMeasures).fill(null);

    Object.entries(preset.patterns).forEach(([sectionName, pupitreMap], idx) => {
      const rawSteps: PaperStepValue[] = (pupitreMap as any)[specificCode] || (pupitreMap as any)[groupCode] || Array(16).fill(0);
      const patId = track.id * 1000 + idx + 1;
      newPatterns.push({
        id: patId,
        name: sectionName,
        steps: 16,
        activeSteps: rawSteps.map((s) => (s === 0 ? 0 : s)),
        lyrics: Array(16).fill(''),
        notes: Array(16).fill(''),
        measureAssignments: Array(totalMeasures).fill(false),
      });

      usePaperVigilanceStore.getState().linkPointsToTrack(sectionName, specificCode, track.id, patId);
      if (groupCode !== specificCode) {
        usePaperVigilanceStore.getState().linkPointsToTrack(sectionName, groupCode, track.id, patId);
      }
    });

    sequence.forEach((secName, mIdx) => {
      const pat = newPatterns.find((p) => p.name.toLowerCase() === secName.toLowerCase());
      if (pat) timelinePatterns[mIdx] = pat.id;
    });

    return { ...track, patterns: newPatterns, timelinePatterns, selectedPatternId: newPatterns[0]?.id ?? 0 };
  });

  store.setTracks(updatedTracks);

  const sections: SongSection[] = [];
  let currentSecName = '', startM = 0;
  sequence.forEach((name, idx) => {
    if (name !== currentSecName) {
      if (currentSecName !== '') {
        sections.push({ id: `sec-${sections.length + 1}-${Date.now()}`, name: currentSecName, startMeasure: startM, endMeasure: idx - 1, color: '#8b2a1a' });
      }
      currentSecName = name;
      startM = idx;
    }
  });
  if (currentSecName !== '') {
    sections.push({ id: `sec-${sections.length + 1}-${Date.now()}`, name: currentSecName, startMeasure: startM, endMeasure: sequence.length - 1, color: '#8b2a1a' });
  }
  store.setSongSections(sections);

  if (reusableSectionNames && reusableSectionNames.size > 0) {
    try {
      const savedSections: any[] = JSON.parse(localStorage.getItem('girador_custom_reusable_sections') || '[]');
      reusableSectionNames.forEach((secName) => {
        const secPatterns = preset.patterns[secName] || {};
        savedSections.push({ id: `sec-${Date.now()}-${Math.random()}`, name: secName, patterns: secPatterns, bpm: preset.bpm, createdAt: Date.now() });
      });
      localStorage.setItem('girador_custom_reusable_sections', JSON.stringify(savedSections));
    } catch {}
  }

  if (openOnFirstVigilance) {
    const firstPt = usePaperVigilanceStore.getState().points.find((p) => p.trackId && p.patternId);
    if (firstPt && firstPt.trackId && firstPt.patternId) {
      store.setEditingTrackId(firstPt.trackId);
      store.setSelectedPatternId(firstPt.patternId);
      usePaperVigilanceStore.getState().setActiveFocusPoint(firstPt);
    }
  }

  const reusableNotice = reusableSectionNames && reusableSectionNames.size > 0 ? ` (+ ${reusableSectionNames.size} section(s) réutilisable(s))` : '';
  const msg = lang === 'fr'
    ? `Partition "${preset.name}" injectée avec succès (${totalMeasures}m)${reusableNotice} !`
    : `Partitura "${preset.name}" injetada (${totalMeasures}m)${reusableNotice}!`;
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: msg } }));

  return { success: true, measuresCount: totalMeasures };
};
