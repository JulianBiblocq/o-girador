/**
 * 
 * O Girador - Maracatu Instrument Stroke and Pair Getters
 */

import { StrokeDef, StrokePair } from './strokeTypes';
import { getVisualStrokeSymbol } from './visualStrokeSymbol';
import { getAlfaiaStrokeDefs, getAlfaiaStrokePairs } from './alfaiaStrokes';
import { getCaixaStrokeDefs, getCaixaStrokePairs } from './caixaStrokes';
import { getGongueStrokeDefs, getGongueStrokePairs } from './ironStrokes';
import { getAgbeStrokeDefs, getAgbeStrokePairs, getMineiroStrokeDefs, getMineiroStrokePairs } from './shakerStrokes';
import { getTimbalStrokeDefs } from './timbalStrokeDefs';
import { getTimbalStrokePairs } from './timbalStrokePairs';
import { getApitoStrokeDefs, getApitoStrokePairs, getVocalStrokeDefs, getVocalStrokePairs } from './vocalApitoStrokes';

export function getStrokesForInstrument(
  instId: string,
  instType: string,
  lang: string,
  isLeftHanded: boolean
): StrokeDef[] {
  const isFr = lang === 'fr';
  let strokes: StrokeDef[] = [];

  if (instId === 'timbal') {
    strokes = getTimbalStrokeDefs(isFr, isLeftHanded);
  } else if (instId === 'caixa' || instId === 'tarol') {
    strokes = getCaixaStrokeDefs(isFr);
  } else if (['marcante', 'meiao', 'repique', 'alfaia'].includes(instId)) {
    strokes = getAlfaiaStrokeDefs(isFr);
  } else if (instType === 'gongue' || instId === 'gongue') {
    strokes = getGongueStrokeDefs(isFr);
  } else if (instId === 'agbe') {
    strokes = getAgbeStrokeDefs(isFr);
  } else if (instId === 'mineiro') {
    strokes = getMineiroStrokeDefs(isFr);
  } else if (instId === 'apito') {
    strokes = getApitoStrokeDefs(isFr);
  } else if (['puxador', 'coro'].includes(instId) || instType === 'voice') {
    strokes = getVocalStrokeDefs(instId, instType, isFr);
  }

  // Visual mirroring for left-handed percussions
  if (isLeftHanded && ['marcante', 'meiao', 'repique', 'alfaia', 'caixa', 'tarol'].includes(instId)) {
    strokes = strokes.map(s => {
      const visualSymbol = String(getVisualStrokeSymbol(s.symbol, true, instId));
      const visualShortcut = String(getVisualStrokeSymbol(s.shortcut, true, instId));
      const visualColorKey = String(getVisualStrokeSymbol(s.colorKey, true, instId));

      let visualLabel = s.label;
      if (visualLabel.includes('Droite')) visualLabel = visualLabel.replace('Droite', 'Gauche');
      else if (visualLabel.includes('Gauche')) visualLabel = visualLabel.replace('Gauche', 'Droite');
      if (visualLabel.includes('Direita')) visualLabel = visualLabel.replace('Direita', 'Esquerda');
      else if (visualLabel.includes('Esquerda')) visualLabel = visualLabel.replace('Esquerda', 'Direita');

      return {
        symbol: visualSymbol,
        label: visualLabel,
        shortcut: visualShortcut,
        colorKey: visualColorKey
      };
    });
  }

  return strokes;
}

export function getStrokePairs(
  instId: string,
  instType: string,
  lang: string,
  isLeftHanded: boolean
): StrokePair[] {
  const allStrokes = getStrokesForInstrument(instId, instType, lang, isLeftHanded);
  const isFr = lang === 'fr';

  if (['marcante', 'meiao', 'repique', 'alfaia'].includes(instId)) {
    return getAlfaiaStrokePairs(allStrokes, isFr, isLeftHanded);
  }
  if (instId === 'caixa' || instId === 'tarol') {
    return getCaixaStrokePairs(allStrokes, isFr, isLeftHanded);
  }
  if (instId === 'timbal') {
    return getTimbalStrokePairs(allStrokes, isFr, isLeftHanded);
  }
  if (instType === 'gongue' || instId === 'gongue') {
    return getGongueStrokePairs(allStrokes, isFr);
  }
  if (instId === 'agbe') {
    return getAgbeStrokePairs(allStrokes, isFr);
  }
  if (instId === 'mineiro') {
    return getMineiroStrokePairs(allStrokes, isFr);
  }
  if (instId === 'apito') {
    return getApitoStrokePairs(allStrokes, isFr);
  }
  if (['puxador', 'coro', 'toada'].includes(instId) || instType === 'voice') {
    return getVocalStrokePairs(instId, allStrokes, isFr);
  }

  return [];
}
