/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Instruments Configuration Catalog (< 50 lignes)
 */

import { InstrumentConfig } from '../../../types';
import { MARACATU_THEME, buildInstrumentColors } from '../theme';

export const ASSETS_BASE_URL = (import.meta as any).env?.BASE_URL || '/';

function makeInst(id: keyof typeof MARACATU_THEME, name: string, type: any, iconImg: string, path: string): InstrumentConfig {
  return {
    id: id as string,
    iconImg,
    name,
    type,
    mixerBg: MARACATU_THEME[id].mixerBg,
    path,
    colors: buildInstrumentColors(MARACATU_THEME, id as any),
    color: MARACATU_THEME[id].color
  };
}

export const instrumentsConfig: InstrumentConfig[] = [
  makeInst('marcante', 'Marcante (alfaia)', 'hands', 'icones/alfaia.svg', 'Alfaia/Marcante'),
  makeInst('meiao', 'Meião (alfaia)', 'hands', 'icones/alfaia.svg', 'Alfaia/Meiao'),
  makeInst('repique', 'Repique (alfaia)', 'hands', 'icones/alfaia.svg', 'Alfaia/Repique'),
  makeInst('caixa', 'Caixa', 'hands', 'icones/caixa.svg', 'Caixa'),
  makeInst('tarol', 'Tarol', 'hands', 'icones/caixa.svg', 'Tarol'),
  makeInst('gongue', 'Gonguê', 'gongue', 'icones/gongue.svg', 'Gongue'),
  makeInst('agbe', 'Agbê', 'shake', 'icones/agbe.svg', 'Agbe'),
  makeInst('mineiro', 'Mineiro', 'shake', 'icones/mineiro.svg', 'Mineiro'),
  makeInst('timbal', 'Timbal', 'hands', 'icones/timbal.svg', 'Timbal'),
  makeInst('apito', 'Apito', 'hands', 'icones/apito.svg', 'Apito'),
  makeInst('puxador', 'Puxador', 'voice', 'icones/micro.svg', 'internal'),
  makeInst('coro', 'Coro', 'voice', 'icones/micro.svg', 'internal'),
  makeInst('toada', 'Toada', 'voice', 'icones/micro.svg', 'internal'),
];
