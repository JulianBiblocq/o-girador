/**
 * Presets historiques Mestre - Partie 2 (< 140 lignes).
 */
import { PaperPreset } from '../../types/paperWorkshop.types';
import { expandSequenceString } from './paperScoreEngine';

const S0 = Array(16).fill(0);
const finAlCx = ['D',0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
const finGg = ['G',0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
const finMi = ['P',0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];

const sharedPatterns = {
  'Silence': { al: S0, cx: S0, gg: S0, mi: S0 },
  'Entrada': {
    al: ['D',0,0,0, 'D',0,0,0, 'D',0,0,0, 'D',0,0,0],
    cx: ['D',0,0,0, 'D',0,0,0, 'D',0,0,0, 'D',0,0,0],
    gg: ['G',0,0,0, 'G',0,0,0, 'G',0,0,0, 'G',0,0,0],
    mi: ['P',0,0,0, 'T',0,0,0, 'P',0,0,0, 'T',0,0,0],
  },
  'Aruanda 1er': {
    al: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,'D','D','D'],
    cx: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,'D','D','D'],
    gg: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,'G','G','G'],
    mi: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,'T','P','T'],
  },
  'Aruanda 2': {
    al: ['D',0,0,0, 0,0,0,0, 0,0,0,0, 0,'D','D','D'],
    cx: ['D',0,'D','E', 'D',0,'D','E', 'D',0,0,0, 0,'D','D','D'],
    gg: ['G',0,0,0, 0,0,0,0, 0,0,0,0, 0,'G','G','G'],
    mi: ['P',0,0,0, 0,0,0,0, 0,0,0,0, 0,'T','P','T'],
  },
  'Igarassu': {
    al: ['D',0,0,'I', 0,'D',0,'I', 'D',0,0,'I', 'D',0,0,0],
    cx: ['D','D','e','D', 'D','e','D','e', 'd','D','e','D', 'D','e','D','e'],
    gg: ['G',0,'A',0, 'G',0,'A',0, 'G','G',0,'A', 'G',0,'A',0],
    mi: ['P','t','P','T', 'P','t','P','T', 'P','t','P','T', 'P','t','P','T'],
  },
  'Fin': { al: finAlCx, cx: finAlCx, gg: finGg, mi: finMi },
};

const temMacaibaSeqStr = 'Silence x15 | Aruanda 1er | ||: Igarassu x7 | Aruanda 1er :|| x2 | Fin';
const aruandaSeqStr = 'Entrada | Aruanda 1er | Aruanda 2 x3 | ||: Igarassu x4 | Aruanda 2 x4 :|| x3 | Igarassu x8 | Fin';

export const PRESET_TEM_MACAIBA: PaperPreset = {
  id: 'tem_macaiba',
  name: 'Tem macaiba',
  bpm: 110,
  timeSig: '4/4',
  totalMeasures: 33,
  linkedAlfaias: false,
  pupitres: ['al', 'cx', 'gg', 'mi'],
  patterns: sharedPatterns,
  sequenceString: temMacaibaSeqStr,
  defaultSequence: expandSequenceString(temMacaibaSeqStr),
};

export const PRESET_ARUANDA: PaperPreset = {
  id: 'aruanda',
  name: 'Aruanda',
  bpm: 120,
  timeSig: '4/4',
  totalMeasures: 39,
  linkedAlfaias: false,
  pupitres: ['al', 'cx', 'gg', 'mi'],
  patterns: sharedPatterns,
  sequenceString: aruandaSeqStr,
  defaultSequence: expandSequenceString(aruandaSeqStr),
};

const etudeCaixaSeqStr = 'Luanda PR x3 | 3 | Q/R';

export const PRESET_ETUDE_CAIXA: PaperPreset = {
  id: 'etude_caixa',
  name: 'Étude Caixa (Luanda PR / 3 / Q/R)',
  bpm: 100,
  timeSig: '4/4',
  totalMeasures: 5,
  linkedAlfaias: false,
  pupitres: ['cx'],
  patterns: {
    'Luanda PR': { cx: ['D','e','d','e', 'd','e','d','e', 'd','E','d','e', 'd','E','d','e'] },
    '3': { cx: ['D','e','D','e', 'D','e','d','e', 'd','E','d','e', 'd','E','d','e'] },
    'Q/R': { cx: ['d','e','d','e', 'd','e','d','e', 'd','E','d','E', 'D','e','d','e'] },
  },
  sequenceString: etudeCaixaSeqStr,
  defaultSequence: expandSequenceString(etudeCaixaSeqStr),
};
