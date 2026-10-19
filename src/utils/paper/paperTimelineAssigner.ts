/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Assigne les motifs et mesures de la Timeline lors de l'injection papier (< 130 lignes).
 */
import { instrumentsConfig } from '../../data';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { Pattern, SongSection, TrackGroup } from '../../types/store.types';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';

const CODE_MAP: Record<string, string> = {
  marcante: 'mc', meiao: 'me', repique: 'rp', caixa: 'cx', tarol: 'tr',
  gongue: 'gg', agbe: 'ab', mineiro: 'mi', timbal: 'tb', apito: 'ap',
  puxador: 'td', coro: 'td', toada: 'td',
};

export const ensureMissingTracks = (tracks: TrackGroup[], preset: PaperPreset, totalM: number): TrackGroup[] => {
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
        measureVols: Array(totalM).fill(75),
        measurePans: Array(totalM).fill(0),
        measureReverbSends: Array(totalM).fill(0),
      });
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
  const parentBus = tracks.find((t) => t.isLinkFolder);

  return tracks.map((track) => {
    const instId = instrumentsConfig[track.instrumentIdx]?.id || '';
    const specificCode = CODE_MAP[instId] || '';
    const isAlfaia = instId === 'marcante' || instId === 'meiao' || instId === 'repique' || track.isLinkFolder;
    const groupCode = isAlfaia ? 'al' : specificCode;
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
      const patId = isAlfaia ? 800000 + idx + 1 : track.id * 1000 + idx + 1;
      newPatterns.push({
        id: patId,
        name: sectionName,
        steps: 16,
        activeSteps: rawSteps.map((s) => (s === 0 ? 0 : s)),
        lyrics: Array(16).fill(''),
        notes: Array(16).fill(''),
        measureAssignments: Array(totalM).fill(false),
        measureAllowVariations: Array(totalM).fill(true),
      });

      vigilance.linkPointsToTrack(sectionName, specificCode, track.id, patId);
      if (groupCode !== specificCode) vigilance.linkPointsToTrack(sectionName, groupCode, track.id, patId);
      if (parentBus) vigilance.linkPointsToTrack(sectionName, 'al', parentBus.id, 800000 + idx + 1);
    });

    const overrides: Record<number, number | null> = { ...(track.patternOverrides || {}) };

    sequence.forEach((rawSecName, mIdx) => {
      const isBaseWord = /^(base|idem|%)$/i.test(rawSecName.trim());
      const targetSec = isBaseWord ? secEntries[0]?.[0] : rawSecName.trim();
      const pat = newPatterns.find((p) => p.name.toLowerCase() === targetSec?.toLowerCase());
      if (pat) {
        pat.measureAssignments[mIdx] = true;
      }
    });

    return {
      ...track,
      patterns: newPatterns,
      selectedPatternId: newPatterns[0]?.id ?? 0,
      patternOverrides: overrides,
      measureVols: Array(totalM).fill(track.volumeVal || 75),
      measurePans: Array(totalM).fill(track.panVal || 0),
      measureReverbSends: Array(totalM).fill(track.reverbVal || 0),
    };
  });
};

export const buildMergedSongSections = (sequence: string[]): SongSection[] => {
  const sections: SongSection[] = [];
  let currentNorm = '', startM = 0;
  sequence.forEach((name, idx) => {
    const norm = name.replace(/_M\d+$/i, '').trim();
    if (norm !== currentNorm) {
      if (currentNorm !== '') {
        sections.push({ id: `sec-${sections.length + 1}-${Date.now()}`, name: currentNorm, startMeasure: startM, endMeasure: idx - 1, color: '#8b2a1a' });
      }
      currentNorm = norm;
      startM = idx;
    }
  });
  if (currentNorm !== '') {
    sections.push({ id: `sec-${sections.length + 1}-${Date.now()}`, name: currentNorm, startMeasure: startM, endMeasure: sequence.length - 1, color: '#8b2a1a' });
  }
  return sections;
};
