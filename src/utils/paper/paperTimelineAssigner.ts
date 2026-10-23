/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Assigne les motifs et mesures de la Timeline lors de l'injection papier (< 140 lignes).
 */
import { instrumentsConfig } from '../../data';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { Pattern, TrackGroup } from '../../types/store.types';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { parseConductorVariationToken, resolveSectionFromDictionaryFallback } from './paperVariationCallParser';

export { buildMergedSongSections } from './paperSectionMerger';

const CODE_MAP: Record<string, string> = {
  marcante: 'mc', meiao: 'me', repique: 'rp', caixa: 'cx', tarol: 'tr',
  gongue: 'gg', agbe: 'ab', mineiro: 'mi', timbal: 'tb', apito: 'ap',
  puxador: 'td', coro: 'td', toada: 'td',
};

function cloneStepValue(s: any): any {
  if (Array.isArray(s)) return [...s];
  return s === 0 ? 0 : s;
}

export const ensureMissingTracks = (tracks: TrackGroup[], preset: PaperPreset): TrackGroup[] => {
  const result = [...tracks];
  const usedCodes = new Set<string>(preset.pupitres || []);
  Object.values(preset.patterns || {}).forEach((map) => {
    Object.keys(map).forEach((c) => usedCodes.add(c.toLowerCase()));
  });

  instrumentsConfig.forEach((cfg, idx) => {
    const code = CODE_MAP[cfg.id];
    const needsInst = code && (usedCodes.has(code) || (code === 'mc' && usedCodes.has('al')));
    const exists = result.some((t) => t.instrumentIdx === idx || instrumentsConfig[t.instrumentIdx]?.id === cfg.id);
    if (needsInst && !exists) {
      result.push({
        id: Date.now() + idx * 100 + Math.floor(Math.random() * 50),
        instrumentIdx: idx,
        patterns: [],
        isMute: false,
        isSolo: false,
        isHidden: false,
        volumeVal: 75,
        selectedPatternId: 0,
        customName: cfg.name,
        reverbVal: 0,
        panVal: 0,
        pan: 0,
        fxSends: { reverb: 0, distortion: 0 },
        measureVols: undefined,
        measurePans: undefined,
        measureReverbSends: undefined,
        automationBypass: { volume: false, pan: false, reverb: false },
      } as TrackGroup);
    }
  });
  return result;
};

export const assignPatternsToTracks = (
  tracks: TrackGroup[],
  preset: PaperPreset,
  sequence: string[],
  totalM: number
): TrackGroup[] => {
  const vigilance = usePaperVigilanceStore.getState();
  const alfBus = tracks.find((t) => t.isLinkFolder && t.instrumentIdx === 0);
  const cxBus = tracks.find((t) => t.isLinkFolder && t.instrumentIdx === 3);

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
      const patId = isAlfaia ? 800000 + idx + 1 : (track.isLinkFolder && track.instrumentIdx === 3 ? 810000 + idx + 1 : track.id * 1000 + idx + 1);
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

      vigilance.linkPointsToTrack(sectionName, specificCode, track.id, patId);
      if (groupCode !== specificCode) vigilance.linkPointsToTrack(sectionName, groupCode, track.id, patId);
      if (alfBus) vigilance.linkPointsToTrack(sectionName, 'al', alfBus.id, 800000 + idx + 1);
      if (cxBus) vigilance.linkPointsToTrack(sectionName, 'cx', cxBus.id, 810000 + idx + 1);
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
          const patId = isAlfaia ? 800000 + newPatterns.length + 1 : (track.isLinkFolder && track.instrumentIdx === 3 ? 810000 + newPatterns.length + 1 : track.id * 1000 + newPatterns.length + 1);
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
