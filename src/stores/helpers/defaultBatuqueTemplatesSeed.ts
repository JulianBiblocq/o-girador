/**
 * Gabarits par défaut de batuque (source mes-gabarits-batuque.json) (< 70 lignes).
 */
import { WorkspaceTemplate } from '../../types/workspaceTemplate.types';

export const DEFAULT_BATUQUE_TEMPLATES_SEED: WorkspaceTemplate[] = [
  {
    name: 'gros son 1',
    ownerId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
    authorName: 'Julian Biblocq',
    options: {
      includeStructure: true,
      includeDisplayOrder: true,
      includeVolumePan: true,
      includeEQ: true,
      includeFX: true,
    },
    tracks: [
      { id: 1792863601156, instrumentIdx: 0, customName: 'ALFAIAS', isBusFolder: true, isLinkFolder: true, volumeVal: 70.6, pan: 0, panVal: 0, eqBands: { low: { f: 85, g: 2 }, mid: { f: 2150, g: 5, q: 'wide' }, high: { f: 8000, g: -3 } }, lowCut: false, reverbVal: 38, fxSends: { reverb: 32, distortion: 0 } },
      { id: 1792863601157, instrumentIdx: 0, customName: 'Marcante (alfaia)', isBusFolder: false, isLinkFolder: false, isLinkMaster: true, busId: '1792863601156', linkedToTrackId: '1792863601156', volumeVal: 70, pan: 0, panVal: 0, eqBands: { low: { f: 100, g: 6 }, mid: { f: 2250, g: 5, q: 'wide' }, high: { f: 6700, g: -4 } }, lowCut: false, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } },
      { id: 1792863601158, instrumentIdx: 1, customName: 'Meião (alfaia)', isBusFolder: false, isLinkFolder: false, isLinkMaster: false, busId: '1792863601156', linkedToTrackId: '1792863601156', volumeVal: 63, pan: -58, panVal: -58, eqBands: { low: { f: 145, g: 7 }, mid: { f: 2150, g: 9, q: 'wide' }, high: { f: 8000, g: -7 } }, lowCut: true, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } },
      { id: 1792863601159, instrumentIdx: 2, customName: 'Repique (alfaia)', isBusFolder: false, isLinkFolder: false, isLinkMaster: false, busId: '1792863601156', linkedToTrackId: '1792863601156', volumeVal: 69, pan: 44, panVal: 44, eqBands: { low: { f: 190, g: 3 }, mid: { f: 2150, g: 5, q: 'wide' }, high: { f: 8000, g: -5 } }, lowCut: true, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } },
      { id: 1792863601196, instrumentIdx: 5, customName: 'Gonguê', volumeVal: 66.9, pan: 21, panVal: 21, eqBands: { low: { f: 185, g: 4 }, mid: { f: 4000, g: -2, q: 'wide' }, high: { f: 7300, g: 2 } }, lowCut: true, reverbVal: 56, fxSends: { reverb: 46, distortion: 62 } },
      { id: 1792863601166, instrumentIdx: 3, customName: 'CAIXAS', isBusFolder: true, isLinkFolder: true, volumeVal: 48.2, pan: 0, panVal: 0, lowCut: true, reverbVal: 58, fxSends: { reverb: 49, distortion: 50 } },
      { id: 1792863601167, instrumentIdx: 3, customName: 'Caixa', isBusFolder: false, isLinkFolder: false, isLinkMaster: true, busId: '1792863601166', linkedToTrackId: '1792863601166', volumeVal: 65, pan: -100, panVal: -100, eqBands: { low: { f: 180, g: 14 }, mid: { f: 400, g: -3, q: 'wide' }, high: { f: 12100, g: 3 } }, lowCut: true, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } },
      { id: 1792863601168, instrumentIdx: 4, customName: 'Tarol', isBusFolder: false, isLinkFolder: false, isLinkMaster: false, busId: '1792863601166', linkedToTrackId: '1792863601166', volumeVal: 71.6, pan: 100, panVal: 100, eqBands: { low: { f: 200, g: -5 }, mid: { f: 1000, g: -3, q: 'wide' }, high: { f: 9200, g: 4 } }, lowCut: true, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } },
      { id: 1792954342565, instrumentIdx: 6, customName: 'Sementes', isBusFolder: true, volumeVal: 44.4, pan: 0, panVal: 0, lowCut: true, reverbVal: 51, fxSends: { reverb: 62, distortion: 42 } },
      { id: 1792863601177, instrumentIdx: 6, customName: 'Agbê', busId: '1792954342565', volumeVal: 67, pan: -69, panVal: -69, eqBands: { low: { f: 250, g: 8 }, mid: { f: 3300, g: 4, q: 'wide' }, high: { f: 11000, g: 4 } }, lowCut: true, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } },
      { id: 1792954342601, instrumentIdx: 9, volumeVal: 55, pan: 0, panVal: 0, lowCut: false, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } }
    ],
    rodaTrackOrder: [1792863601156, 1792863601157, 1792863601158, 1792863601159, 1792863601196, 1792863601166, 1792863601168, 1792863601167, 1792954342565, 1792863601177, 1792954342601],
    masterSettings: { masterVol: 5.472, masterEQ: { low: 1.5, mid: 1, high: 1.5 }, masterCompressor: { threshold: -21, ratio: 4.5 }, reverbDecay: 1.925, masterReverbVol: 67, masterFX: { reverb: { returnVolume: 67, time: 19, isMuted: false }, distortion: { returnVolume: 63, drive: 42, isMuted: false } } },
    id: 'tpl_local_1792961919500_eqeto7k',
    createdAt: 1792961919500,
    updatedAt: 1792961919500
  },
  {
    name: 'Complet sans timbal',
    ownerId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
    authorName: 'Julian Biblocq',
    options: {
      includeStructure: true,
      includeDisplayOrder: true,
      includeVolumePan: true,
      includeEQ: true,
      includeFX: true,
    },
    tracks: [
      { id: 1783474550701, instrumentIdx: 0, customName: 'ALFAIAS', isBusFolder: true, isLinkFolder: true, volumeVal: 94, pan: 0, panVal: 0, eqBands: { low: { f: 50, g: -1 }, mid: { f: 1000, g: 0, q: 'wide' }, high: { f: 8000, g: 0 } }, lowCut: false, reverbVal: 38, fxSends: { reverb: 38, distortion: 0 } },
      { id: 1781526732393, instrumentIdx: 0, isLinkMaster: true, busId: '1783474550701', linkedToTrackId: '1783474550701', volumeVal: 70, pan: -48, panVal: -48, eqBands: { low: { f: 100, g: 5 }, mid: { f: 2250, g: 5, q: 'wide' }, high: { f: 6700, g: -4 } }, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } },
      { id: 1783506499792, instrumentIdx: 1, isLinkMaster: false, busId: '1783474550701', linkedToTrackId: '1783474550701', volumeVal: 63, pan: 47, panVal: 47, eqBands: { low: { f: 145, g: 7 }, mid: { f: 2150, g: 9, q: 'wide' }, high: { f: 8000, g: -7 } }, lowCut: true, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } },
      { id: 1783506501899, instrumentIdx: 2, isLinkMaster: false, busId: '1783474550701', linkedToTrackId: '1783474550701', volumeVal: 69, pan: 0, panVal: 0, eqBands: { low: { f: 190, g: 3 }, mid: { f: 2150, g: 8, q: 'wide' }, high: { f: 8000, g: -5 } }, lowCut: true, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } },
      { id: 1782927190524, instrumentIdx: 8, volumeVal: 40, pan: 0, panVal: 0, reverbVal: 67, fxSends: { reverb: 67, distortion: 49 } },
      { id: 1781526742338, instrumentIdx: 5, volumeVal: 69, pan: 21, panVal: 21, eqBands: { low: { f: 185, g: 4 }, mid: { f: 4000, g: 7, q: 'wide' }, high: { f: 7300, g: 2 } }, lowCut: true, reverbVal: 56, fxSends: { reverb: 39, distortion: 79 } },
      { id: 1783433866362, instrumentIdx: 3, customName: 'Caixas', isBusFolder: true, isLinkFolder: true, volumeVal: 63, pan: 0, panVal: 0, lowCut: true, reverbVal: 58, fxSends: { reverb: 58, distortion: 50 } },
      { id: 1783647260514, instrumentIdx: 4, isLinkMaster: false, busId: '1783433866362', linkedToTrackId: '1783433866362', volumeVal: 70, pan: 100, panVal: 100, eqBands: { low: { f: 200, g: -5 }, mid: { f: 1000, g: -3, q: 'wide' }, high: { f: 9200, g: 4 } }, lowCut: false, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } },
      { id: 1781526737819, instrumentIdx: 3, isLinkMaster: true, busId: '1783433866362', linkedToTrackId: '1783433866362', volumeVal: 61, pan: -100, panVal: -100, eqBands: { low: { f: 180, g: 14 }, mid: { f: 400, g: -3, q: 'wide' }, high: { f: 12100, g: 3 } }, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } },
      { id: 1783434667087, instrumentIdx: 6, customName: 'Sementes', isBusFolder: true, volumeVal: 43, pan: 0, panVal: 0, lowCut: true, reverbVal: 51, fxSends: { reverb: 51, distortion: 49 } },
      { id: 1781526744007, instrumentIdx: 6, busId: '1783434667087', volumeVal: 67, pan: -69, panVal: -69, eqBands: { low: { f: 250, g: 8 }, mid: { f: 3300, g: 4, q: 'wide' }, high: { f: 11000, g: 4 } }, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } },
      { id: 1783252010573, instrumentIdx: 7, busId: '1783434667087', volumeVal: 68, pan: 66, panVal: 66, eqBands: { low: { f: 115, g: -11 }, mid: { f: 2000, g: 3, q: 'wide' }, high: { f: 8800, g: 3 } }, lowCut: false, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } },
      { id: 1783075067909, instrumentIdx: 9, volumeVal: 55, pan: 0, panVal: 0, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 } }
    ],
    rodaTrackOrder: [1783474550701, 1781526732393, 1783506499792, 1783506501899, 1782927190524, 1781526742338, 1783433866362, 1783647260514, 1781526737819, 1783434667087, 1781526744007, 1783252010573, 1783075067909],
    masterSettings: { masterVol: -3.2, masterEQ: { low: 0.5, mid: 0, high: 0.5 }, masterCompressor: { threshold: -22, ratio: 4.5 }, reverbDecay: 1.925, masterReverbVol: -7.5, masterFX: { reverb: { returnVolume: 80, time: 19, isMuted: false }, distortion: { returnVolume: 63, drive: 20, isMuted: false } } },
    id: 'tpl_local_1792763243361_wdzerfb',
    createdAt: 1792763243361,
    updatedAt: 1792763243361
  }
];
