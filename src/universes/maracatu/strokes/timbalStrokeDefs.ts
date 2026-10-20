/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Timbal Stroke Definitions
 */

import { StrokeDef } from './strokeTypes';

export function getTimbalStrokeDefs(isFr: boolean, isLeftHanded: boolean): StrokeDef[] {
  return [
    {
      symbol: 'G',
      label: isFr
        ? (isLeftHanded ? 'Basse Gauche' : 'Basse Droite')
        : (isLeftHanded ? 'Baixo Esquerda' : 'Baixo Direita'),
      shortcut: 'G',
      colorKey: 'G'
    },
    {
      symbol: 'g',
      label: isFr
        ? (isLeftHanded ? 'Basse Droite' : 'Basse Gauche')
        : (isLeftHanded ? 'Baixo Direita' : 'Baixo Esquerda'),
      shortcut: 'g',
      colorKey: 'g'
    },
    {
      symbol: 'A',
      label: isFr
        ? (isLeftHanded ? 'Aberto Gauche' : 'Aberto Droite')
        : (isLeftHanded ? 'Aberto Esquerda' : 'Aberto Direita'),
      shortcut: 'A',
      colorKey: 'A'
    },
    {
      symbol: 'a',
      label: isFr
        ? (isLeftHanded ? 'Aberto Droite' : 'Aberto Gauche')
        : (isLeftHanded ? 'Aberto Direita' : 'Aberto Esquerda'),
      shortcut: 'a',
      colorKey: 'a'
    },
    {
      symbol: 'S',
      label: isFr
        ? (isLeftHanded ? 'Slap Gauche' : 'Slap Droite')
        : (isLeftHanded ? 'Slap Esquerda' : 'Slap Direita'),
      shortcut: 'S',
      colorKey: 'S'
    },
    {
      symbol: 's',
      label: isFr
        ? (isLeftHanded ? 'Slap Droite' : 'Slap Gauche')
        : (isLeftHanded ? 'Slap Direita' : 'Slap Esquerda'),
      shortcut: 's',
      colorKey: 's'
    },
    {
      symbol: 'D',
      label: isFr
        ? (isLeftHanded ? 'Fantôme Gauche' : 'Fantôme Droite')
        : (isLeftHanded ? 'Dedilhado Esquerda' : 'Dedilhado Direita'),
      shortcut: 'D',
      colorKey: 'D'
    },
    {
      symbol: 'd',
      label: isFr
        ? (isLeftHanded ? 'Fantôme Droite' : 'Fantôme Gauche')
        : (isLeftHanded ? 'Dedilhado Direita' : 'Dedilhado Esquerda'),
      shortcut: 'd',
      colorKey: 'd'
    },
    {
      symbol: 'P',
      label: isFr
        ? (isLeftHanded ? 'Pressé Gauche' : 'Pressé Droite')
        : (isLeftHanded ? 'Preso Esquerda' : 'Preso Direita'),
      shortcut: 'P',
      colorKey: 'P'
    },
    {
      symbol: 'p',
      label: isFr
        ? (isLeftHanded ? 'Pressé Droite' : 'Pressé Gauche')
        : (isLeftHanded ? 'Preso Direita' : 'Preso Esquerda'),
      shortcut: 'p',
      colorKey: 'p'
    },
    {
      symbol: 'F',
      label: isFr
        ? (isLeftHanded ? 'Fla ouvert Gauche' : 'Fla ouvert Droite')
        : (isLeftHanded ? 'Fla aberto Esquerda' : 'Fla aberto Direita'),
      shortcut: 'F',
      colorKey: 'F'
    },
    {
      symbol: 'f',
      label: isFr
        ? (isLeftHanded ? 'Fla ouvert Droite' : 'Fla ouvert Gauche')
        : (isLeftHanded ? 'Fla aberto Direita' : 'Fla aberto Esquerda'),
      shortcut: 'f',
      colorKey: 'f'
    },
    {
      symbol: 'V',
      label: isFr
        ? (isLeftHanded ? 'Fla claqué Gauche' : 'Fla claqué Droite')
        : (isLeftHanded ? 'Fla slap Esquerda' : 'Fla slap Direita'),
      shortcut: 'V',
      colorKey: 'V'
    },
    {
      symbol: 'v',
      label: isFr
        ? (isLeftHanded ? 'Fla claqué Droite' : 'Fla claqué Gauche')
        : (isLeftHanded ? 'Fla slap Direita' : 'Fla slap Esquerda'),
      shortcut: 'v',
      colorKey: 'v'
    },
    {
      symbol: 'C',
      label: isFr ? 'Clic (mains)' : 'Clap (mãos)',
      shortcut: 'C',
      colorKey: 'C'
    },
    {
      symbol: 'B',
      label: isFr ? 'Barulho (Grondement)' : 'Barulho (Vibração)',
      shortcut: 'B',
      colorKey: 'B'
    },
  ];
}
