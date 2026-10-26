/**
 * Assure la présence de toutes les pistes requises par la partition papier (< 80 lignes).
 */
import { instrumentsConfig } from '../../data';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { TrackGroup } from '../../types/store.types';
import { PaperInjectOptions } from './paperTrackBuilder';

export const CODE_MAP: Record<string, string> = {
  marcante: 'mc', meiao: 'me', repique: 'rp', caixa: 'cx', tarol: 'tr',
  gongue: 'gg', agbe: 'ab', mineiro: 'mi', timbal: 'tb', apito: 'ap',
  puxador: 'td', coro: 'td', toada: 'td',
};

export const applyLinkingOptionsToTracks = (tracks: TrackGroup[], options?: PaperInjectOptions): TrackGroup[] => {
  if (!options) return tracks;
  const linkCaixas = options.caixasLinkMode === 'caixa_tarol' || (options.linkCaixas && options.caixasLinkMode !== 'none');
  const linkAlfaias = options.linkAlfaias !== false;

  const cxFolder = tracks.find((t) => t.isBusFolder && (t.customName?.toUpperCase().includes('CAIXA') || t.instrumentIdx === 3));
  const alFolder = tracks.find((t) => t.isBusFolder && (t.customName?.toUpperCase().includes('ALFAIA') || t.instrumentIdx === 0));

  return tracks.map((t) => {
    if (linkCaixas && cxFolder) {
      if (t.id === cxFolder.id) return { ...t, isBusFolder: true, isLinkFolder: true };
      const isCx = t.instrumentIdx === 3 && !t.isBusFolder;
      const isTr = t.instrumentIdx === 4 && !t.isBusFolder;
      if (isCx) return { ...t, isLinkMaster: true, isLinkFolder: false, busId: String(cxFolder.id), linkedToTrackId: String(cxFolder.id) };
      if (isTr) return { ...t, isLinkMaster: false, isLinkFolder: false, busId: String(cxFolder.id), linkedToTrackId: String(cxFolder.id) };
    }
    if (linkAlfaias && alFolder) {
      if (t.id === alFolder.id) return { ...t, isBusFolder: true, isLinkFolder: true };
      const isMc = (t.instrumentIdx === 0 || t.customName?.toLowerCase().includes('marcante')) && !t.isBusFolder;
      const isSlaveAlfaia = (t.instrumentIdx === 1 || t.instrumentIdx === 2 || t.customName?.toLowerCase().includes('meião') || t.customName?.toLowerCase().includes('repique')) && !t.isBusFolder;
      if (isMc) return { ...t, isLinkMaster: true, isLinkFolder: false, busId: String(alFolder.id), linkedToTrackId: String(alFolder.id) };
      if (isSlaveAlfaia) return { ...t, isLinkMaster: false, isLinkFolder: false, busId: String(alFolder.id), linkedToTrackId: String(alFolder.id) };
    }
    return t;
  });
};

export const ensureMissingTracks = (tracks: TrackGroup[], preset: PaperPreset, options?: PaperInjectOptions): TrackGroup[] => {
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

  return applyLinkingOptionsToTracks(result, options);
};
