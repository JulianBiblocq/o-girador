/**
 * 
 * O Girador - Caixa and Tarol Stroke Definitions
 */

import { StrokeDef } from './strokeTypes';

export function getCaixaStrokeDefs(isFr: boolean): StrokeDef[] {
  return [
    {
      symbol: 'D',
      label: isFr ? 'Main Droite Fort' : 'Mão Direita Forte',
      shortcut: 'D',
      colorKey: 'D'
    },
    {
      symbol: 'd',
      label: isFr ? 'Main Droite Faible' : 'Mão Direita Fraca',
      shortcut: 'd',
      colorKey: 'd'
    },
    {
      symbol: 'E',
      label: isFr ? 'Main Gauche Fort' : 'Mão Esquerda Forte',
      shortcut: 'E',
      colorKey: 'E'
    },
    {
      symbol: 'e',
      label: isFr ? 'Main Gauche Faible' : 'Mão Esquerda Fraca',
      shortcut: 'e',
      colorKey: 'e'
    },
    {
      symbol: 'C',
      label: isFr ? 'Clic' : 'Click',
      shortcut: 'C',
      colorKey: 'C'
    },
    {
      symbol: 'X',
      label: isFr ? 'Cerclage (Aro)' : 'Toque no aro',
      shortcut: 'X',
      colorKey: 'X'
    },
    {
      symbol: 'F',
      label: isFr ? 'Fla Droite' : 'Fla Direita',
      shortcut: 'F',
      colorKey: 'F'
    },
    {
      symbol: 'f',
      label: isFr ? 'Fla Gauche' : 'Fla Esquerda',
      shortcut: 'f',
      colorKey: 'f'
    },
    {
      symbol: 'R',
      label: isFr ? 'Trêmulo Droite' : 'Rufada Direita',
      shortcut: 'R',
      colorKey: 'R'
    },
    {
      symbol: 'r',
      label: isFr ? 'Trêmulo Gauche' : 'Rufada Esquerda',
      shortcut: 'r',
      colorKey: 'r'
    },
    {
      symbol: 'B',
      label: isFr ? 'Barulho (Grondement)' : 'Barulho (Vibração)',
      shortcut: 'B',
      colorKey: 'B'
    },
  ];
}
