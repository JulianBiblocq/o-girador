export type WizardRhythmId = 'luanda' | 'trovao' | 'martelo' | 'arrasto';
export type WizardPatternRole = 'base' | 'intro' | 'virada';

type StepCell = string | number;
type RoleGridMap = Record<string, StepCell[]>;

export const STUDIO_BASE_GRIDS: Record<WizardRhythmId, RoleGridMap> = {
  luanda: {
    marcante: ['D', 0, 0, 'd', 'E', 0, 'D', 0, 'e', 'D', 0, 'd', 'E', 0, 0, 0],
    meiao:    ['D', 0, 'e', 0, 0, 'D', 0, 'd', 'D', 0, 'D', 0, 0, 'e', 'D', 0],
    repique:  [0, 'd', 'D', 'e', 0, 'D', 'A', 0, 0, 'd', 'e', 'D', 0, 'A', 'D', 'e'],
    caixa:    ['A', 'e', 'd', 'e', 'A', 'e', 'D', 'r', 'D', 'e', 'd', 'e', 'A', 'e', 'D', 'r'],
    tarol:    ['A', 'e', 'd', 'r', 'A', 'e', 'd', 'e', 'A', 'd', 'e', 'r', 'A', 'e', 'D', 'r'],
    gongue:   [0, 'G', 0, 'a', 'G', 0, 'A', 0, 0, 'G', 0, 'a', 'G', 0, 'A', 0],
    agbe:     ['E', 0, 'd', 'e', 'D', 0, 'e', 'd', 'E', 0, 'd', 'e', 'S', 0, 'e', 'd'],
    mineiro:  ['P', 'p', 't', 'p', 'T', 'p', 't', 'p', 'P', 'p', 't', 'p', 'T', 'p', 't', 'p'],
    timbal:   ['G', 0, 'a', 's', 'S', 0, 'g', 'a', 'G', 0, 'a', 's', 'S', 0, 'A', 0],
  },
  trovao: {
    marcante: ['D', 0, 'D', 0, 'E', 0, 'D', 0, 'D', 0, 'D', 0, 'E', 0, 0, 0],
    meiao:    ['D', 0, 0, 'D', 'E', 0, 0, 'D', 0, 'D', 0, 'D', 'E', 0, 'd', 0],
    repique:  [0, 'e', 'd', 'D', 0, 'A', 'D', 'e', 0, 'e', 'd', 'D', 'A', 0, 'D', 'e'],
    caixa:    ['A', 'e', 'd', 'D', 'e', 'd', 'A', 'r', 'D', 'e', 'd', 'D', 'e', 'd', 'A', 'r'],
    tarol:    ['A', 'r', 'd', 'D', 'e', 'r', 'A', 'e', 'D', 'r', 'd', 'D', 'e', 'r', 'A', 'r'],
    gongue:   ['G', 0, 'A', 0, 0, 'G', 0, 'a', 'G', 0, 'A', 0, 0, 'G', 'A', 0],
    agbe:     ['D', 0, 'e', 'd', 'S', 0, 'd', 'e', 'D', 0, 'e', 'd', 'S', 0, 'd', 'e'],
    mineiro:  ['T', 'p', 'P', 't', 'T', 'p', 'P', 't', 'T', 'p', 'P', 't', 'T', 'p', 'P', 't'],
    timbal:   ['G', 'g', 'A', 0, 'S', 's', 0, 'a', 'G', 'g', 'A', 0, 'S', 's', 'A', 0],
  },
  martelo: {
    marcante: ['D', 0, 0, 0, 'E', 0, 0, 'd', 'D', 0, 'D', 0, 'E', 0, 0, 0],
    meiao:    [0, 0, 'D', 0, 'E', 0, 'D', 0, 0, 0, 'D', 0, 'E', 0, 'D', 0],
    repique:  ['A', 'd', 'e', 'D', 0, 'd', 'A', 'e', 'D', 'd', 'e', 'D', 0, 'A', 'D', 'e'],
    caixa:    ['A', 'd', 'e', 'd', 'A', 'd', 'e', 'r', 'A', 'd', 'e', 'd', 'A', 'd', 'D', 'r'],
    tarol:    ['A', 'e', 'r', 'd', 'A', 'e', 'd', 'r', 'A', 'e', 'r', 'd', 'A', 'e', 'D', 'r'],
    gongue:   ['G', 0, 'a', 0, 'A', 0, 'g', 0, 'G', 0, 'a', 0, 'A', 0, 'G', 0],
    agbe:     ['E', 'd', 'D', 'e', 'E', 'd', 'S', 'e', 'E', 'd', 'D', 'e', 'E', 'd', 'S', 'e'],
    mineiro:  ['P', 't', 'T', 'p', 'P', 't', 'T', 'p', 'P', 't', 'T', 'p', 'P', 't', 'T', 'p'],
    timbal:   ['S', 0, 'G', 'g', 'A', 0, 's', 'a', 'S', 0, 'G', 'g', 'A', 'a', 'S', 0],
  },
  arrasto: {
    marcante: ['D', 0, 0, 'D', 0, 0, 'D', 0, 'E', 0, 'D', 0, 0, 'd', 'E', 0],
    meiao:    ['D', 0, 'd', 0, 'D', 0, 0, 'e', 'D', 0, 0, 'D', 'E', 0, 'D', 0],
    repique:  [0, 'd', 'e', 'A', 0, 'D', 'd', 'e', 0, 'A', 'D', 0, 'd', 'e', 'A', 'D'],
    caixa:    ['D', 'e', 'd', 'A', 'e', 'd', 'D', 'e', 'D', 'e', 'd', 'A', 'e', 'd', 'A', 'r'],
    tarol:    ['D', 'r', 'd', 'A', 'e', 'd', 'D', 'r', 'D', 'e', 'd', 'A', 'e', 'r', 'A', 'r'],
    gongue:   ['G', 0, 0, 'A', 0, 'G', 0, 0, 'G', 0, 'a', 'A', 0, 'G', 0, 0],
    agbe:     ['E', 0, 'e', 'D', 0, 'd', 'S', 0, 'E', 0, 'e', 'D', 0, 'd', 'S', 'e'],
    mineiro:  ['P', 'p', 't', 'T', 'p', 't', 'P', 'p', 'P', 'p', 't', 'T', 'p', 't', 'P', 't'],
    timbal:   ['G', 0, 0, 'G', 0, 'a', 'S', 0, 'g', 'G', 0, 'A', 0, 's', 'S', 0],
  },
};

export const STUDIO_INTRO_GRID: RoleGridMap = {
  marcante: ['D', 0, 'D', 0, 'D', 0, 0, 0, 'D', 0, 'E', 'D', 'D', 0, 'D', 0],
  meiao:    ['D', 0, 'D', 0, 'D', 0, 0, 0, 0, 'D', 'E', 'D', 'D', 0, 'D', 0],
  repique:  ['A', 0, 'A', 0, 'D', 'd', 'e', 'D', 'A', 0, 'e', 'D', 'D', 'e', 'D', 0],
  caixa:    ['A', 0, 'A', 0, 'D', 'r', 'D', 'e', 'A', 0, 'D', 'r', 'A', 'e', 'D', 'r'],
  tarol:    ['A', 0, 'A', 0, 'D', 'r', 'd', 'r', 'A', 0, 'D', 'r', 'A', 'r', 'D', 'r'],
  gongue:   ['G', 0, 'G', 0, 'A', 0, 0, 0, 'G', 0, 'A', 0, 'G', 0, 'A', 0],
  agbe:     ['D', 0, 'D', 0, 'S', 0, 0, 0, 'D', 0, 'e', 'D', 'S', 0, 'D', 0],
  mineiro:  ['T', 0, 'T', 0, 'P', 'p', 't', 'p', 'T', 0, 'p', 'T', 'T', 'p', 'T', 0],
  timbal:   ['S', 0, 'S', 0, 'G', 0, 0, 0, 'A', 'a', 'S', 0, 'G', 0, 'S', 0],
};

export const STUDIO_VIRADA_GRID: RoleGridMap = {
  marcante: ['D', 0, 'E', 'D', 'D', 0, 'E', 'D', 'D', 'E', 'D', 'E', 'D', 0, 0, 0],
  meiao:    ['D', 0, 'E', 'D', 0, 'D', 'E', 'D', 'D', 'E', 'D', 'E', 'D', 0, 0, 0],
  repique:  ['D', 'e', 'A', 'D', 'd', 'e', 'A', 'D', 'D', 'e', 'D', 'e', 'A', 0, 0, 0],
  caixa:    ['A', 'r', 'D', 'e', 'A', 'r', 'D', 'e', 'A', 'e', 'D', 'e', 'A', 0, 0, 0],
  tarol:    ['A', 'r', 'D', 'r', 'A', 'r', 'D', 'r', 'A', 'd', 'e', 'd', 'A', 0, 0, 0],
  gongue:   ['G', 0, 'A', 0, 'G', 0, 'A', 0, 'G', 0, 'G', 0, 'A', 0, 0, 0],
  agbe:     ['S', 'e', 'D', 'd', 'S', 'e', 'D', 'd', 'S', 0, 'S', 0, 'D', 0, 0, 0],
  mineiro:  ['T', 'p', 'T', 'p', 'T', 'p', 'T', 'p', 'T', 't', 'T', 't', 'P', 0, 0, 0],
  timbal:   ['A', 'a', 'S', 0, 'A', 'a', 'S', 0, 'G', 'g', 'A', 'a', 'S', 0, 0, 0],
};
