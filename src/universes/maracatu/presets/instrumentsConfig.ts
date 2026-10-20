/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Instruments Configuration Catalog
 */

import { InstrumentConfig } from '../../../types';
import { MARACATU_THEME, buildInstrumentColors } from '../theme';

export const ASSETS_BASE_URL = (import.meta as any).env?.BASE_URL || '/';

export const instrumentsConfig: InstrumentConfig[] = [
  {
    id: 'marcante',
    iconImg: 'icones/alfaia.svg',
    name: 'Marcante (alfaia)',
    type: 'hands',
    mixerBg: MARACATU_THEME.marcante.mixerBg,
    path: 'Alfaia/Marcante',
    colors: buildInstrumentColors(MARACATU_THEME, 'marcante'),
    color: MARACATU_THEME.marcante.color
  },
  {
    id: 'meiao',
    iconImg: 'icones/alfaia.svg',
    name: 'Meião (alfaia)',
    type: 'hands',
    mixerBg: MARACATU_THEME.meiao.mixerBg,
    path: 'Alfaia/Meiao',
    colors: buildInstrumentColors(MARACATU_THEME, 'meiao'),
    color: MARACATU_THEME.meiao.color
  },
  {
    id: 'repique',
    iconImg: 'icones/alfaia.svg',
    name: 'Repique (alfaia)',
    type: 'hands',
    mixerBg: MARACATU_THEME.repique.mixerBg,
    path: 'Alfaia/Repique',
    colors: buildInstrumentColors(MARACATU_THEME, 'repique'),
    color: MARACATU_THEME.repique.color
  },
  {
    id: 'caixa',
    iconImg: 'icones/caixa.svg',
    name: 'Caixa',
    type: 'hands',
    mixerBg: MARACATU_THEME.caixa.mixerBg,
    path: 'Caixa',
    colors: buildInstrumentColors(MARACATU_THEME, 'caixa'),
    color: MARACATU_THEME.caixa.color
  },
  {
    id: 'tarol',
    iconImg: 'icones/caixa.svg',
    name: 'Tarol',
    type: 'hands',
    mixerBg: MARACATU_THEME.tarol.mixerBg,
    path: 'Tarol',
    colors: buildInstrumentColors(MARACATU_THEME, 'tarol'),
    color: MARACATU_THEME.tarol.color
  },
  {
    id: 'gongue',
    iconImg: 'icones/gongue.svg',
    name: 'Gonguê',
    type: 'gongue',
    mixerBg: MARACATU_THEME.gongue.mixerBg,
    path: 'Gongue',
    colors: buildInstrumentColors(MARACATU_THEME, 'gongue'),
    color: MARACATU_THEME.gongue.color
  },
  {
    id: 'agbe',
    iconImg: 'icones/agbe.svg',
    name: 'Agbê',
    type: 'shake',
    mixerBg: MARACATU_THEME.agbe.mixerBg,
    path: 'Agbe',
    colors: buildInstrumentColors(MARACATU_THEME, 'agbe'),
    color: MARACATU_THEME.agbe.color
  },
  {
    id: 'mineiro',
    iconImg: 'icones/mineiro.svg',
    name: 'Mineiro',
    type: 'shake',
    mixerBg: MARACATU_THEME.mineiro.mixerBg,
    path: 'Mineiro',
    colors: buildInstrumentColors(MARACATU_THEME, 'mineiro'),
    color: MARACATU_THEME.mineiro.color
  },
  {
    id: 'timbal',
    iconImg: 'icones/timbal.svg',
    name: 'Timbal',
    type: 'hands',
    mixerBg: MARACATU_THEME.timbal.mixerBg,
    path: 'Timbal',
    colors: buildInstrumentColors(MARACATU_THEME, 'timbal'),
    color: MARACATU_THEME.timbal.color
  },
  {
    id: 'apito',
    iconImg: 'icones/apito.svg',
    name: 'Apito',
    type: 'hands',
    mixerBg: MARACATU_THEME.apito.mixerBg,
    path: 'Apito',
    colors: buildInstrumentColors(MARACATU_THEME, 'apito'),
    color: MARACATU_THEME.apito.color
  },
  {
    id: 'puxador',
    iconImg: 'icones/micro.svg',
    name: 'Puxador',
    type: 'voice',
    mixerBg: MARACATU_THEME.puxador.mixerBg,
    path: 'internal',
    colors: buildInstrumentColors(MARACATU_THEME, 'puxador'),
    color: MARACATU_THEME.puxador.color
  },
  {
    id: 'coro',
    iconImg: 'icones/micro.svg',
    name: 'Coro',
    type: 'voice',
    mixerBg: MARACATU_THEME.coro.mixerBg,
    path: 'internal',
    colors: buildInstrumentColors(MARACATU_THEME, 'coro'),
    color: MARACATU_THEME.coro.color
  },
  {
    id: 'toada',
    iconImg: 'icones/micro.svg',
    name: 'Toada',
    type: 'voice',
    mixerBg: MARACATU_THEME.toada.mixerBg,
    path: 'internal',
    colors: buildInstrumentColors(MARACATU_THEME, 'toada'),
    color: MARACATU_THEME.toada.color
  }
];
