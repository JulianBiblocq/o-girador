/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Injection atomique d'une partition papier transcrite et points de vigilance (< 110 lignes).
 */
import { useSequencerStore } from '../../stores/useSequencerStore';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { PresetMetadata } from '../../types';
import { assignPatternsToTracks, buildMergedSongSections } from './paperTimelineAssigner';
import { buildScannedScoreTracks, PaperInjectOptions } from './paperTrackBuilder';

export const injectPaperScoreToStore = (
  preset: PaperPreset,
  sequenceOverride?: string[],
  reusableSectionNames?: Set<string>,
  lang: 'fr' | 'pt' = 'fr',
  openOnFirstVigilance = false,
  options?: PaperInjectOptions,
  customMetadata?: Partial<PresetMetadata>
): { success: boolean; measuresCount: number } => {
  const store = useSequencerStore.getState();
  store.pushUndoState();

  const scoreId = preset.id || preset.name.toLowerCase().replace(/\s+/g, '_');
  usePaperVigilanceStore.getState().setActiveSequencerScoreId(scoreId);

  const isExistingActiveSong = preset.id === '__active_song__';
  const currentStoreMeta = store.metadata || ({} as any);

  const cleanMetadata: PresetMetadata = isExistingActiveSong
    ? {
        ...currentStoreMeta,
        toada: customMetadata?.toada?.trim() || currentStoreMeta.toada || preset.name || '',
        nacao: customMetadata?.nacao !== undefined ? customMetadata.nacao.trim() : (currentStoreMeta.nacao || ''),
        compositor: customMetadata?.compositor !== undefined ? customMetadata.compositor.trim() : (currentStoreMeta.compositor || ''),
        ritmo: customMetadata?.ritmo !== undefined ? customMetadata.ritmo.trim() : (currentStoreMeta.ritmo || ''),
        youtubeUrl: customMetadata?.youtubeUrl !== undefined ? customMetadata.youtubeUrl.trim() : (currentStoreMeta.youtubeUrl || ''),
        description: customMetadata?.description !== undefined ? customMetadata.description.trim() : (currentStoreMeta.description || ''),
        descriptionPt: customMetadata?.descriptionPt !== undefined ? customMetadata.descriptionPt.trim() : (currentStoreMeta.descriptionPt || ''),
        descriptionFr: customMetadata?.descriptionFr !== undefined ? customMetadata.descriptionFr.trim() : (currentStoreMeta.descriptionFr || ''),
      }
    : {
        toada: customMetadata?.toada?.trim() || preset.name || '',
        nacao: customMetadata?.nacao?.trim() || '',
        compositor: customMetadata?.compositor?.trim() || '',
        ritmo: customMetadata?.ritmo?.trim() || '',
        youtubeUrl: customMetadata?.youtubeUrl?.trim() || '',
        description: customMetadata?.description?.trim() || '',
        descriptionPt: customMetadata?.descriptionPt?.trim() || '',
        descriptionFr: customMetadata?.descriptionFr?.trim() || '',
        rhythmSignals: [],
        partitionImage: undefined,
        morceauId: undefined,
        vocalPreset: undefined,
      };

  const sequence = sequenceOverride && sequenceOverride.length > 0 ? sequenceOverride : preset.defaultSequence;
  const totalMeasures = Math.max(1, sequence.length);

  const cleanTracks = buildScannedScoreTracks(preset, totalMeasures, options);
  const updatedTracks = assignPatternsToTracks(cleanTracks, preset, sequence, totalMeasures);
  const mergedSections = buildMergedSongSections(sequence);

  const targetBpm = preset.bpm || store.bpm || 96;
  const targetTimeSig = (preset.timeSig || store.timeSig || '4/4') as any;

  useSequencerStore.setState((state: any) => ({
    tracks: updatedTracks,
    totalMeasures,
    bpm: targetBpm,
    timeSig: targetTimeSig,
    metadata: cleanMetadata,
    letras: isExistingActiveSong ? state.letras : '',
    songSections: mergedSections,
    measureBpms: Array(totalMeasures).fill(targetBpm),
    measureTimeSigs: Array(totalMeasures).fill(targetTimeSig),
    measureVols: Array(totalMeasures).fill(100),
    measureBpmTransitions: Array(totalMeasures).fill('immediate'),
    measureVolTransitions: Array(totalMeasures).fill('immediate'),
    measureSignals: Array(totalMeasures).fill(null),
    selectedAutomationType: null,
    selectedAutomationTrackId: null,
    selectedAutomationRange: null,
    automationAnchorMeasure: null,
    tracksVersion: (state.tracksVersion || 0) + 1,
  }));

  if (!isExistingActiveSong && typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('loadPreset');
      url.searchParams.delete('preset');
      window.history.replaceState(null, '', url.toString());
    } catch {}
    window.dispatchEvent(new CustomEvent('girador-reset-active-preset'));
  }

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
    const doubts = usePaperVigilanceStore.getState().getActiveSequencerDoubts();
    const firstPt = doubts.find((p) => p.trackId && p.patternId);
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
