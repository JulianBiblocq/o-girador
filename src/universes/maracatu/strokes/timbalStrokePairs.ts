/**
 * 
 * O Girador - Timbal Stroke Pairs
 */

import { StrokeDef, StrokePair } from './strokeTypes';

export function getTimbalStrokePairs(
  allStrokes: StrokeDef[],
  isFr: boolean,
  isLeftHanded: boolean
): StrokePair[] {
  const gStrong = allStrokes.find(s => s.symbol === 'G');
  const gWeak = allStrokes.find(s => s.symbol === 'g');
  const aStrong = allStrokes.find(s => s.symbol === 'A');
  const aWeak = allStrokes.find(s => s.symbol === 'a');
  const sStrong = allStrokes.find(s => s.symbol === 'S');
  const sWeak = allStrokes.find(s => s.symbol === 's');
  const dStrong = allStrokes.find(s => s.symbol === 'D');
  const dWeak = allStrokes.find(s => s.symbol === 'd');
  const pStrong = allStrokes.find(s => s.symbol === 'P');
  const pWeak = allStrokes.find(s => s.symbol === 'p');
  const fStrong = allStrokes.find(s => s.symbol === 'F');
  const fWeak = allStrokes.find(s => s.symbol === 'f');
  const vStrong = allStrokes.find(s => s.symbol === 'V');
  const vWeak = allStrokes.find(s => s.symbol === 'v');
  const cStroke = allStrokes.find(s => s.symbol === 'C');
  const bStroke = allStrokes.find(s => s.symbol === 'B');

  const pairs: StrokePair[] = [];
  if (gStrong) {
    const strokes = [gStrong, gWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'G',
      strong: gStrong,
      weak: gWeak,
      strokes,
      mainLabel: isFr ? 'Basse' : 'Baixo'
    });
  }
  if (aStrong) {
    const strokes = [aStrong, aWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'A',
      strong: aStrong,
      weak: aWeak,
      strokes,
      mainLabel: isFr ? 'Ouvert' : 'Aberto'
    });
  }
  if (sStrong) {
    const strokes = [sStrong, sWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'S',
      strong: sStrong,
      weak: sWeak,
      strokes,
      mainLabel: isFr ? 'Claqué' : 'Slap'
    });
  }
  if (dStrong) {
    const strokes = [dStrong, dWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'D',
      strong: dStrong,
      weak: dWeak,
      strokes,
      mainLabel: isFr ? 'Fantôme' : 'Dedilhado'
    });
  }
  if (pStrong) {
    const strokes = [pStrong, pWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'P',
      strong: pStrong,
      weak: pWeak,
      strokes,
      mainLabel: isFr ? 'Pressé' : 'Preso'
    });
  }
  if (fStrong) {
    const strokes = [fStrong, fWeak, vStrong, vWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'F',
      strong: fStrong,
      weak: fWeak,
      strokes,
      mainLabel: isFr ? 'Flas' : 'Flas'
    });
  }
  if (cStroke) {
    pairs.push({
      id: 'C',
      strong: cStroke,
      strokes: [cStroke],
      mainLabel: isFr ? 'Clic mains' : 'Palma'
    });
  }
  if (bStroke) {
    pairs.push({
      id: 'B',
      strong: bStroke,
      strokes: [bStroke],
      mainLabel: isFr ? 'Barulho' : 'Barulho'
    });
  }
  return pairs;
}
