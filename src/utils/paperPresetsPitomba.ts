/**
 * Presets officiels Mestre : Baque Pitomba (Leao Coroado) (< 120 lignes).
 */
import { PaperPreset, PaperStepValue } from '../types/paperWorkshop.types';
import { expandSequenceString } from './paper/paperScoreEngine';

const s0 = (): PaperStepValue[] => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const finD = (): PaperStepValue[] => ['D', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const finG = (): PaperStepValue[] => ['G', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const finP = (): PaperStepValue[] => ['P', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const sharedPatterns = {
  'SILENCE': { mc: s0(), me: s0(), rp: s0(), cx: s0(), gg: s0(), mi: s0() },
  'PITOMBA BASE': {
    mc: ['D', 0, 0, 0, 'D', 0, 'e', 0, 'D', 0, 'e', 'e', 'D', 0, 'e', 0] as PaperStepValue[],
    me: ['D', 0, 'e', 'D', 'e', 0, 'D', 0, 'e', 'D', 0, 'e', 'e', 'D', 0, 'e'] as PaperStepValue[],
    rp: ['D', 'e', 'd', 'e', 'd', 'e', 'D', 'e', 'd', 'e', 'D', 'e', 'd', 'e', 'D', 'e'] as PaperStepValue[],
    cx: ['D', 'e', 'd', 'E', 'd', 'e', 'D', 'e', 'd', 'e', 'E', 'd', 'e', 'd', 'E', 'e'] as PaperStepValue[],
    gg: [0, 'G', 0, 0, 'G', 0, 'G', 0, 0, 'G', 0, 0, 'G', 0, 'G', 0] as PaperStepValue[],
    mi: ['P', 't', 'P', 'T', 'P', 't', 'P', 'T', 'P', 't', 'P', 'T', 'P', 't', 'P', 'T'] as PaperStepValue[],
  },
  'EU VOU 1': {
    mc: ['D', 0, 0, 0, 0, 0, 0, 0, 0, 0, 'D', 0, 'D', 0, 0, 0] as PaperStepValue[],
    me: ['D', 0, 0, 0, 0, 0, 0, 0, 0, 0, 'D', 0, 'D', 0, 0, 0] as PaperStepValue[],
    rp: ['D', 0, 0, 0, 0, 0, 0, 0, 0, 0, 'D', 0, 'D', 0, 0, 0] as PaperStepValue[],
    cx: ['D', 0, 0, 0, 0, 0, 0, 0, 0, 0, 'D', 0, 'D', 0, 0, 0] as PaperStepValue[],
    gg: ['G', 0, 0, 0, 0, 0, 0, 0, 0, 0, 'G', 0, 'G', 0, 0, 0] as PaperStepValue[],
    mi: ['P', 0, 0, 0, 0, 0, 0, 0, 0, 0, 'T', 0, 'P', 0, 0, 0] as PaperStepValue[],
  },
  'EU VOU 2': {
    mc: [0, 0, 'D', 0, 'D', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as PaperStepValue[],
    me: [0, 0, 'D', 0, 'D', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as PaperStepValue[],
    rp: [0, 0, 'D', 0, 'D', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as PaperStepValue[],
    cx: [0, 0, 'D', 0, 'D', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as PaperStepValue[],
    gg: [0, 0, 'G', 0, 'G', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as PaperStepValue[],
    mi: [0, 0, 'T', 0, 'P', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as PaperStepValue[],
  },
  'PITOMBA APPEL': {
    mc: s0(), me: s0(), rp: s0(),
    cx: ['D', 0, 'E', 'D', 'E', 0, 'D', 0, 'e', 'R', 0, 'e', 'e', 'R', 0, 'e'] as PaperStepValue[],
    gg: s0(), mi: s0(),
  },
  'FIN': { mc: finD(), me: finD(), rp: finD(), cx: finD(), gg: finG(), mi: finP() },
};

const pitombaVariations = {
  'PITOMBA BASE': [
    {
      pupitre: 'rp',
      varIndex: 1,
      name: 'Var Repique Pitomba',
      steps: ['D', 'E', 0, 'e', 'D', 'E', 0, 'e', 'D', 'E', 0, 'e', 'D', 'E', 0, 'e'] as PaperStepValue[],
      probability: 100,
    },
  ],
};

const princesaSeqStr =
  'SILENCE x 24 | EU VOU 1 | EU VOU 2 | PITOMBA BASE x 14 | EU VOU 1 | EU VOU 2 | PITOMBA BASE x 14 | EU VOU 1 | EU VOU 2 | PITOMBA BASE x 6 | PITOMBA BASE x 8 + Var Rp 100% | EU VOU 1';

export const PRESET_PRINCESA_ISABEL: PaperPreset = {
  id: 'princesa_isabel',
  name: 'Princesa Isabel',
  nacao: 'Leão Coroado',
  ritmo: 'Baque Pitomba',
  bpm: 65,
  timeSig: '4/4',
  totalMeasures: 73,
  linkedAlfaias: false,
  linkCaixas: false,
  caixasLinkMode: 'none',
  pupitres: ['mc', 'me', 'rp', 'cx', 'gg', 'mi'],
  patterns: sharedPatterns,
  variations: pitombaVariations,
  sequenceString: princesaSeqStr,
  defaultSequence: expandSequenceString(princesaSeqStr),
};

const arredaSeqStr =
  'SILENCE x 6 | PITOMBA APPEL | PITOMBA BASE x 12 | PITOMBA BASE x 8 + Var Rp 100% | FIN';

export const PRESET_ARREDA_DO_CAMINHO: PaperPreset = {
  id: 'arreda_do_caminho',
  name: 'Arreda do Caminho',
  nacao: 'Leão Coroado',
  ritmo: 'Baque Pitomba',
  bpm: 65,
  timeSig: '4/4',
  totalMeasures: 28,
  linkedAlfaias: false,
  linkCaixas: false,
  caixasLinkMode: 'none',
  pupitres: ['mc', 'me', 'rp', 'cx', 'gg', 'mi'],
  patterns: sharedPatterns,
  variations: pitombaVariations,
  sequenceString: arredaSeqStr,
  defaultSequence: expandSequenceString(arredaSeqStr),
};
