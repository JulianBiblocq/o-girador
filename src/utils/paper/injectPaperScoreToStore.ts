/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Injection atomique d'une partition papier transcrite et points de vigilance (< 110 lignes).
 */
import { useSequencerStore } from '../../stores/useSequencerStore';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import {
  ensureMissingTracks,
  assignPatternsToTracks,
  buildMergedSongSections,
} from './paperTimelineAssigner';

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

  const tracksWithMissing = ensureMissingTracks(store.tracks, preset, totalMeasures);
  const updatedTracks = assignPatternsToTracks(tracksWithMissing, preset, sequence, totalMeasures);
  const mergedSections = buildMergedSongSections(sequence);

  const targetBpm = preset.bpm || store.bpm || 96;
  const targetTimeSig = (preset.timeSig || store.timeSig || '4/4') as any;

  useSequencerStore.setState((state: any) => ({
    tracks: updatedTracks,
    totalMeasures,
    bpm: targetBpm,
    timeSig: targetTimeSig,
    songSections: mergedSections,
    measureBpms: Array(totalMeasures).fill(targetBpm),
    measureTimeSigs: Array(totalMeasures).fill(targetTimeSig),
    measureVols: Array(totalMeasures).fill(75),
    measureBpmTransitions: Array(totalMeasures).fill('immediate'),
    measureVolTransitions: Array(totalMeasures).fill('immediate'),
    measureSignals: Array(totalMeasures).fill(null),
    tracksVersion: (state.tracksVersion || 0) + 1,
  }));

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
