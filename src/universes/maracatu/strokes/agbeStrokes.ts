/**
 * O Girador - Agbê Stroke Definitions & Pairs (E/e Haut puis D/d Bas) (< 85 lignes)
 */

import { StrokeDef, StrokePair } from './strokeTypes';

export function getAgbeStrokeDefs(isFr: boolean): StrokeDef[] {
  return [
    { symbol: 'E', label: isFr ? 'Projection Gauche Fort' : 'Projeção Esquerda Forte', shortcut: 'E', colorKey: 'E' },
    { symbol: 'e', label: isFr ? 'Projection Gauche Faible' : 'Projeção Esquerda Fraca', shortcut: 'e', colorKey: 'e' },
    { symbol: 'D', label: isFr ? 'Projection Droite Fort' : 'Projeção Direita Forte', shortcut: 'D', colorKey: 'D' },
    { symbol: 'd', label: isFr ? 'Projection Droite Faible' : 'Projeção Direita Fraca', shortcut: 'd', colorKey: 'd' },
    { symbol: 'S', label: 'Salto', shortcut: 'S', colorKey: 'S' },
    { symbol: 'V', label: 'Volta', shortcut: 'V', colorKey: 'V' },
    { symbol: 'B', label: isFr ? 'B — Barulho (Appel + Tenue)' : 'B — Barulho (Chamada + Sustentação)', shortcut: 'B', colorKey: 'B' },
    { symbol: 'b', label: isFr ? 'b — Barulho doux (Fade-In sans appel)' : 'b — Barulho suave (Fade-In sem chamada)', shortcut: 'b', colorKey: 'b' },
    { symbol: '/', label: isFr ? '/ — Extinction Barulho (Fade-Out)' : '/ — Extinção Barulho (Fade-Out)', shortcut: '/', colorKey: '/' },
    { symbol: '.', label: isFr ? '. — Fin du Barulho (Silence)' : '. — Fim do Barulho (Silêncio)', shortcut: '.', colorKey: '.' },
  ];
}

export function getAgbeStrokePairs(allStrokes: StrokeDef[], isFr: boolean): StrokePair[] {
  const find = (sym: string) => allStrokes.find((s) => s.symbol === sym);
  const eStrong = find('E'), eWeak = find('e');
  const dStrong = find('D'), dWeak = find('d');
  const sStroke = find('S'), vStroke = find('V');
  const bStroke = find('B'), bSoft = find('b'), slash = find('/'), dot = find('.');

  const pairs: StrokePair[] = [];
  if (eStrong) {
    pairs.push({ id: 'E', strong: eStrong, weak: eWeak, strokes: [eStrong, eWeak].filter(Boolean) as StrokeDef[], mainLabel: isFr ? 'Vers G. (Paume)' : 'Para Esq. (Palma)' });
  }
  if (dStrong) {
    pairs.push({ id: 'D', strong: dStrong, weak: dWeak, strokes: [dStrong, dWeak].filter(Boolean) as StrokeDef[], mainLabel: isFr ? 'Vers D. (Retour)' : 'Para Dir. (Retorno)' });
  }
  if (sStroke) {
    pairs.push({ id: 'S', strong: sStroke, weak: vStroke, strokes: [sStroke, vStroke].filter(Boolean) as StrokeDef[], mainLabel: 'Salto / Volta' });
  }
  if (bStroke) {
    pairs.push({ id: 'B', strong: bStroke, weak: bSoft, third: slash, strokes: [bStroke, bSoft, slash, dot].filter(Boolean) as StrokeDef[], mainLabel: 'Barulho' });
  }
  return pairs;
}
