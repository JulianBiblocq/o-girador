/**
 * Assigne les motifs et mesures de la Timeline lors de l'injection papier (< 130 lignes).
 */
import { instrumentsConfig } from '../../data';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { Pattern, TrackGroup } from '../../types/store.types';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { CODE_MAP } from './paperMissingTracksEnsurer';
import { parseConductorVariationToken, resolveSectionFromDictionaryFallback } from './paperVariationCallParser';
import { findDictionarySection, findDictionaryVariation } from './paperRhythmDictionary';

export { buildMergedSongSections } from './paperSectionMerger';
export { ensureMissingTracks } from './paperMissingTracksEnsurer';

function cloneStepValue(s: any): any {
  if (Array.isArray(s)) return [...s];
  return s === 0 ? 0 : s;
}

export const assignPatternsToTracks = (
  tracks: TrackGroup[], preset: PaperPreset, sequence: string[], totalM: number
): TrackGroup[] => {
  const vigilance = usePaperVigilanceStore.getState();
  const scoreId = preset.id || preset.name.toLowerCase().replace(/\s+/g, '_');
  const hasAnyVarCall = sequence.some((s) => s.includes('⊡') || parseConductorVariationToken(s).variationCalls.length > 0);

  return tracks.map((track) => {
    const instId = instrumentsConfig[track.instrumentIdx]?.id || '';
    const specificCode = CODE_MAP[instId] || '';
    const isAlfaia = instId === 'marcante' || instId === 'meiao' || instId === 'repique' || (track.isLinkFolder && track.instrumentIdx === 0);
    const isCaixaGroup = instId === 'caixa' || instId === 'tarol' || (track.isLinkFolder && track.instrumentIdx === 3);
    const groupCode = isAlfaia ? 'al' : (isCaixaGroup ? 'cx' : specificCode);
    if (!groupCode) return track;

    const newPatterns: Pattern[] = [];
    const secEntries = Object.entries(preset.patterns);

    secEntries.forEach(([sectionName, pupitreMap], idx) => {
      let nativeSecLength = 16;
      if (pupitreMap && typeof pupitreMap === 'object') {
        const lengths = Object.values(pupitreMap).filter(Array.isArray).map((arr) => (arr as any[]).length);
        if (lengths.length > 0) nativeSecLength = Math.max(...lengths);
      }
      const override = preset.metricOverrides?.[sectionName];
      const targetSteps = override?.steps || nativeSecLength || 16;
      const stepVal: any = (pupitreMap as any)[specificCode] || (pupitreMap as any)[groupCode] || Array(targetSteps).fill(0);
      let rawSteps: any[] = Array.isArray(stepVal) ? stepVal : Array(targetSteps).fill(0);
      if (typeof stepVal === 'string' && /^(base|idem|%)$/i.test(stepVal.trim())) {
        const baseMap = secEntries[0]?.[1] || {};
        const baseVal: any = (baseMap as any)[specificCode] || (baseMap as any)[groupCode] || Array(targetSteps).fill(0);
        rawSteps = Array.isArray(baseVal) ? baseVal : Array(targetSteps).fill(0);
      }
      const padSteps = Array(targetSteps).fill(0);
      rawSteps.forEach((s, i) => { if (i < targetSteps) padSteps[i] = cloneStepValue(s); });
      const patId = track.id * 1000 + idx + 1;
      const patTimeSig = override?.timeSignature || (targetSteps === 8 ? '2/4' : (targetSteps === 12 ? '12/8' : '4/4'));

      // Initialisation des variations du dictionnaire
      const patVars: any[] = [];
      const dictSec = findDictionarySection(sectionName);
      if (dictSec?.variations) {
        dictSec.variations.forEach((dv) => {
          if (dv.pupitre === specificCode || dv.pupitre === groupCode) {
            patVars.push({ id: `var-${patId}-${dv.varIndex}`, name: dv.name, steps: dv.steps.map(cloneStepValue), probability: 30 });
          }
        });
      }

      newPatterns.push({
        id: patId, name: sectionName, steps: targetSteps, length: targetSteps, timeSignature: patTimeSig,
        activeSteps: padSteps, beatResolutions: override?.beatResolutions, volumes: Array(targetSteps).fill(80),
        decays: Array(targetSteps).fill(100), lyrics: Array(targetSteps).fill(''), notes: Array(targetSteps).fill(''),
        measureAssignments: Array(totalM).fill(false), measureAllowVariations: Array(totalM).fill(!hasAnyVarCall),
        variations: patVars.length > 0 ? patVars : undefined,
      });

      const isBusOrFolder = Boolean(track.isBusFolder || track.isLinkFolder);
      const isSlave = Boolean(track.linkedToTrackId && !track.isLinkMaster);
      if (!isBusOrFolder && !isSlave) {
        if (specificCode) vigilance.linkPointsToTrack(scoreId, sectionName, specificCode, track.id, patId);
        if (groupCode && groupCode !== specificCode) vigilance.linkPointsToTrack(scoreId, sectionName, groupCode, track.id, patId);
      }
    });

    const overrides: Record<number, number | null> = {};

    sequence.forEach((rawSecName, mIdx) => {
      const isBaseWord = /^(base|idem|%)$/i.test(rawSecName.trim());
      const parsedToken = parseConductorVariationToken(rawSecName);
      const targetSec = isBaseWord ? secEntries[0]?.[0] : parsedToken.cleanSectionName;
      let pat = newPatterns.find((p) => p.name.toLowerCase() === targetSec?.toLowerCase());

      if (!pat && targetSec) {
        const dictFallback = resolveSectionFromDictionaryFallback(targetSec, parsedToken.variationCalls);
        if (dictFallback) {
          const fbSteps = (dictFallback[specificCode] || dictFallback[groupCode] || Array(16).fill(0)) as any[];
          const patId = track.id * 1000 + newPatterns.length + 1;
          pat = {
            id: patId, name: targetSec, steps: 16, length: 16, timeSignature: '4/4', activeSteps: fbSteps.map(cloneStepValue),
            volumes: Array(16).fill(80), decays: Array(16).fill(100), lyrics: Array(16).fill(''), notes: Array(16).fill(''),
            measureAssignments: Array(totalM).fill(false), measureAllowVariations: Array(totalM).fill(!hasAnyVarCall),
          };
          newPatterns.push(pat);
        }
      }

      if (pat) {
        pat.measureAssignments[mIdx] = true;
        const matchingCalls = parsedToken.variationCalls.filter((v) => !v.targetInstrument || v.targetInstrument === specificCode || v.targetInstrument === groupCode);
        const hasDiceOnTrack = rawSecName.includes('⊡') || matchingCalls.length > 0;
        if (hasDiceOnTrack) {
          if (!pat.measureAllowVariations) pat.measureAllowVariations = Array(totalM).fill(false);
          pat.measureAllowVariations[mIdx] = true;
          matchingCalls.forEach((vCall) => {
            if (vCall.probability !== undefined) {
              if (!pat!.variations?.length) {
                const fbSteps = findDictionaryVariation(pat!.name, specificCode, 1) || findDictionaryVariation(pat!.name, groupCode, 1);
                if (fbSteps) pat!.variations = [{ id: `var-${pat!.id}-1`, name: `Var ${groupCode.toUpperCase()}`, steps: fbSteps.map(cloneStepValue), probability: vCall.probability }];
              } else {
                pat!.variations.forEach((v) => { v.probability = vCall.probability!; });
              }
            }
          });
        } else if (hasAnyVarCall && pat.measureAllowVariations) {
          pat.measureAllowVariations[mIdx] = false;
        }
      }
    });

    return {
      ...track, patterns: newPatterns, selectedPatternId: newPatterns[0]?.id ?? 0, patternOverrides: overrides,
      automation: undefined, volumeAutomation: undefined, panAutomation: undefined, isAutomated: false,
      automationBypass: { volume: false, pan: false, reverb: false }, measureVols: undefined, measureVolTransitions: undefined,
      measurePans: undefined, measurePanTransitions: undefined, measureReverbSends: undefined, measureReverbTransitions: undefined,
    };
  });
};
