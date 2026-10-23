/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Assigne les motifs et mesures de la Timeline lors de l'injection papier (< 120 lignes).
 */
import { instrumentsConfig } from '../../data';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { Pattern, TrackGroup } from '../../types/store.types';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { CODE_MAP, ensureMissingTracks } from './paperMissingTracksEnsurer';
import { parseConductorVariationToken, resolveSectionFromDictionaryFallback } from './paperVariationCallParser';

export { buildMergedSongSections } from './paperSectionMerger';
export { ensureMissingTracks } from './paperMissingTracksEnsurer';

function cloneStepValue(s: any): any {
  if (Array.isArray(s)) return [...s];
  return s === 0 ? 0 : s;
}

export const assignPatternsToTracks = (
  tracks: TrackGroup[],
  preset: PaperPreset,
  sequence: string[],
  totalM: number
): TrackGroup[] => {
  const vigilance = usePaperVigilanceStore.getState();
  const scoreId = preset.id || preset.name.toLowerCase().replace(/\s+/g, '_');

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
      const stepVal: any = (pupitreMap as any)[specificCode] || (pupitreMap as any)[groupCode] || Array(16).fill(0);
      let rawSteps: any[] = Array.isArray(stepVal) ? stepVal : Array(16).fill(0);
      if (typeof stepVal === 'string' && /^(base|idem|%)$/i.test(stepVal.trim())) {
        const baseMap = secEntries[0]?.[1] || {};
        const baseVal: any = (baseMap as any)[specificCode] || (baseMap as any)[groupCode] || Array(16).fill(0);
        rawSteps = Array.isArray(baseVal) ? baseVal : Array(16).fill(0);
      }
      const patId = track.id * 1000 + idx + 1;
      newPatterns.push({
        id: patId,
        name: sectionName,
        steps: 16,
        activeSteps: rawSteps.map(cloneStepValue),
        lyrics: Array(16).fill(''),
        notes: Array(16).fill(''),
        measureAssignments: Array(totalM).fill(false),
        measureAllowVariations: Array(totalM).fill(true),
      });

      // Liaison stricte sur piste réelle jouable (jamais sur un dossier Bus)
      const isBusOrFolder = Boolean(track.isBusFolder || track.isLinkFolder);
      if (!isBusOrFolder) {
        if (specificCode) vigilance.linkPointsToTrack(scoreId, sectionName, specificCode, track.id, patId);
        if (groupCode && groupCode !== specificCode) {
          vigilance.linkPointsToTrack(scoreId, sectionName, groupCode, track.id, patId);
        }
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
            id: patId,
            name: targetSec,
            steps: 16,
            activeSteps: fbSteps.map(cloneStepValue),
            lyrics: Array(16).fill(''),
            notes: Array(16).fill(''),
            measureAssignments: Array(totalM).fill(false),
            measureAllowVariations: Array(totalM).fill(true),
          };
          newPatterns.push(pat);
        }
      }

      if (pat) pat.measureAssignments[mIdx] = true;
    });

    return {
      ...track,
      patterns: newPatterns,
      selectedPatternId: newPatterns[0]?.id ?? 0,
      patternOverrides: overrides,
      automation: undefined,
      volumeAutomation: undefined,
      panAutomation: undefined,
      isAutomated: false,
      automationBypass: { volume: false, pan: false, reverb: false },
      measureVols: undefined,
      measureVolTransitions: undefined,
      measurePans: undefined,
      measurePanTransitions: undefined,
      measureReverbSends: undefined,
      measureReverbTransitions: undefined,
    };
  });
};
