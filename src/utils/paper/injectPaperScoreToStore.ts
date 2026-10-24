/**
 * Injection atomique d'une partition papier transcrite et points de vigilance (< 145 lignes).
 */
import { useSequencerStore } from '../../stores/useSequencerStore';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { PresetMetadata } from '../../types';
import { assignPatternsToTracks, buildMergedSongSections } from './paperTimelineAssigner';
import { buildScannedScoreTracks, PaperInjectOptions } from './paperTrackBuilder';
import { disambiguateAllPresetPatterns } from './paperRoleDisambiguator';
import { resetActiveCloudPresetId } from '../cloudPresetState';

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
        nacao: customMetadata?.nacao !== undefined ? customMetadata.nacao.trim() : (currentStoreMeta.nacao || preset.nacao || ''),
        compositor: customMetadata?.compositor !== undefined ? customMetadata.compositor.trim() : (currentStoreMeta.compositor || ''),
        ritmo: customMetadata?.ritmo !== undefined ? customMetadata.ritmo.trim() : (currentStoreMeta.ritmo || ''),
        youtubeUrl: customMetadata?.youtubeUrl !== undefined ? customMetadata.youtubeUrl.trim() : (currentStoreMeta.youtubeUrl || ''),
        description: customMetadata?.description !== undefined ? customMetadata.description.trim() : (currentStoreMeta.description || ''),
        descriptionPt: customMetadata?.descriptionPt !== undefined ? customMetadata.descriptionPt.trim() : (currentStoreMeta.descriptionPt || ''),
        descriptionFr: customMetadata?.descriptionFr !== undefined ? customMetadata.descriptionFr.trim() : (currentStoreMeta.descriptionFr || ''),
      }
    : {
        toada: customMetadata?.toada?.trim() || preset.name || '',
        nacao: customMetadata?.nacao?.trim() || preset.nacao?.trim() || '',
        compositor: customMetadata?.compositor?.trim() || '',
        ritmo: customMetadata?.ritmo?.trim() || '',
        youtubeUrl: customMetadata?.youtubeUrl?.trim() || '',
        description: customMetadata?.description?.trim() || '',
        descriptionPt: customMetadata?.descriptionPt?.trim() || '',
        descriptionFr: customMetadata?.descriptionFr?.trim() || '',
        rhythmSignals: [],
        partitionImage: customMetadata?.partitionImage || undefined,
        morceauId: undefined,
        vocalPreset: undefined,
      };

  const sequence = sequenceOverride && sequenceOverride.length > 0 ? sequenceOverride : preset.defaultSequence;
  const totalMeasures = Math.max(1, sequence.length);
  const disambiguatedPreset: PaperPreset = { ...preset, patterns: disambiguateAllPresetPatterns(preset.patterns) };
  const effectiveOptions: PaperInjectOptions = {
    linkAlfaias: preset.linkedAlfaias ?? true,
    linkCaixas: preset.linkCaixas ?? true,
    caixasLinkMode: preset.caixasLinkMode ?? 'caixa_tarol',
    ...options,
  };

  const cleanTracks = buildScannedScoreTracks(disambiguatedPreset, totalMeasures, effectiveOptions);
  const updatedTracks = assignPatternsToTracks(cleanTracks, disambiguatedPreset, sequence, totalMeasures);
  const mergedSections = buildMergedSongSections(sequence);

  const targetBpm = preset.bpm || store.bpm || 96;
  const targetTimeSig = (preset.timeSig || store.timeSig || '4/4') as any;
  const mBpms = sequence.map((s) => preset.metricOverrides?.[s]?.bpm ?? targetBpm);
  const mSigs = sequence.map((s) => {
    if (preset.metricOverrides?.[s]?.timeSignature) return preset.metricOverrides[s].timeSignature as any;
    const secMap = preset.patterns[s];
    if (secMap && typeof secMap === 'object') {
      const lengths = Object.values(secMap).filter(Array.isArray).map((arr) => (arr as any[]).length);
      if (lengths.length > 0 && Math.max(...lengths) === 8) return '2/4' as any;
    }
    return targetTimeSig;
  });

  useSequencerStore.setState((state: any) => ({
    tracks: updatedTracks,
    totalMeasures,
    bpm: targetBpm,
    timeSig: targetTimeSig,
    metadata: cleanMetadata,
    letras: isExistingActiveSong ? state.letras : '',
    songSections: mergedSections,
    measureBpms: mBpms,
    measureTimeSigs: mSigs,
    measureVols: undefined,
    measurePans: undefined,
    measureReverbSends: undefined,
    measureBpmTransitions: Array(totalMeasures).fill('immediate'),
    measureVolTransitions: Array(totalMeasures).fill('immediate'),
    measureSignals: Array(totalMeasures).fill(null),
    songMarkers: (preset as any).songMarkers || [],
    mestreSignals: [],
    loopStartMeasure: null, loopEndMeasure: null, isLoopRegionActive: false, pendingLoopRange: null,
    currentMeasure: 0, currentExpandedMeasureIdx: 0,
    selectedAutomationType: null,
    selectedAutomationTrackId: null,
    selectedAutomationRange: null,
    automationAnchorMeasure: null,
    tracksVersion: (state.tracksVersion || 0) + 1,
  }));
  window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', { detail: { mIdx: 0, sIdx: 0 } }));

  if (!isExistingActiveSong) {
    resetActiveCloudPresetId();
  }

  if (reusableSectionNames && reusableSectionNames.size > 0) {
    try {
      const saved: any[] = JSON.parse(localStorage.getItem('girador_custom_reusable_sections') || '[]');
      reusableSectionNames.forEach((s) => saved.push({ id: `sec-${Date.now()}-${Math.random()}`, name: s, patterns: preset.patterns[s] || {}, bpm: preset.bpm, createdAt: Date.now() }));
      localStorage.setItem('girador_custom_reusable_sections', JSON.stringify(saved));
    } catch {}
  }

  if (openOnFirstVigilance) {
    const doubts = usePaperVigilanceStore.getState().getActiveSequencerDoubts();
    const firstPt = doubts.find((p) => p.trackId && p.patternId);
    if (firstPt?.trackId && firstPt?.patternId) {
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
