/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Assure la présence de toutes les pistes requises par la partition papier (< 55 lignes).
 */
import { instrumentsConfig } from '../../data';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { TrackGroup } from '../../types/store.types';

export const CODE_MAP: Record<string, string> = {
  marcante: 'mc', meiao: 'me', repique: 'rp', caixa: 'cx', tarol: 'tr',
  gongue: 'gg', agbe: 'ab', mineiro: 'mi', timbal: 'tb', apito: 'ap',
  puxador: 'td', coro: 'td', toada: 'td',
};

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
