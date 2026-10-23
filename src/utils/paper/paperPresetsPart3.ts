/**
 * Presets historiques Mestre - Partie 3 (< 110 lignes).
 */
import { PaperPreset } from '../../types/paperWorkshop.types';
import { expandSequenceString } from './paperScoreEngine';

const basesSeqStr = 'Luanda x4 | Martelo x4 | Trovão x4 | Parada | Igarassu x4';

export const PRESET_BASES_TRADITIONNELLES: PaperPreset = {
  id: 'bases_traditionnelles',
  name: 'Bases Traditionnelles (Luanda, Martelo, Trovão, Parada, Igarassu)',
  bpm: 96,
  timeSig: '4/4',
  totalMeasures: 17,
  linkedAlfaias: true,
  pupitres: ['al', 'cx', 'gg', 'ab'],
  patterns: {
    'Luanda': {
      al: ['D',0,0,0, 0,0,0,0, 'e','D',0,0, 'e','D',0,0],
      cx: ['D','D','e','D', 'D','e','D','e', 'd','D','e','D', 'D','e','D','e'],
      gg: ['G',0,'A',0, 'G',0,'A',0, 'G','A',0,'A', 'G',0,'A',0],
      ab: ['E',0,'d','e', 'D',0,'e','d', 'E',0,'d','e', 'D',0,'e','d'],
    },
    'Martelo': {
      al: ['D',0,0,'D', 0,'D',0,'D', 0,0,'D',0, 0,'D',0,0],
      cx: ['D','e','D','e', 'D','e','d','e', 'D','e','D','e', 'D','e','d','e'],
      gg: ['G',0,'A',0, 'G',0,'A',0, 'G',0,'A',0, 'G',0,'A',0],
      ab: ['E',0,'d','e', 'D',0,'e','d', 'E',0,'d','e', 'D',0,'e','d'],
    },
    'Trovão': {
      al: ['D',0,0,0, 'D',0,0,0, 'D','D',0,0, 'D',0,0,0],
      cx: ['D','D','e','D', 'D','e','D','e', 'd','D','e','D', 'D','e','D','e'],
      gg: ['G',0,'A',0, 'G',0,'A',0, 'G','A',0,'A', 'G',0,'A',0],
      ab: ['E',0,'d','e', 'D',0,'e','d', 'E',0,'d','e', 'D',0,'e','d'],
    },
    'Parada': {
      al: ['D',0,'D',0, 'D',0,0,0, 0,0,0,0, 0,0,0,0],
      cx: ['D',0,'D',0, 'D',0,0,0, 0,0,0,0, 0,0,0,0],
      gg: ['G',0,'G',0, 'G',0,0,0, 0,0,0,0, 0,0,0,0],
      ab: ['E',0,'D',0, 'E',0,0,0, 0,0,0,0, 0,0,0,0],
    },
    'Igarassu': {
      al: ['D',0,0,'I', 0,'D',0,'I', 'D',0,0,'I', 'D',0,0,0],
      cx: ['D','D','e','D', 'D','e','D','e', 'd','D','e','D', 'D','e','D','e'],
      gg: ['G',0,'A',0, 'G',0,'A',0, 'G','G',0,'A', 'G',0,'A',0],
      ab: ['E',0,'d','e', 'D',0,'e','d', 'E',0,'d','e', 'D',0,'e','d'],
    },
  },
  sequenceString: basesSeqStr,
  defaultSequence: expandSequenceString(basesSeqStr),
};
