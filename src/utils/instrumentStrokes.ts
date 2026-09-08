import { getVisualStrokeSymbol } from '../data';

export interface StrokeDef {
  symbol: string;
  label: string;
  shortcut: string;
  colorKey: string;
}

export function getStrokesForInstrument(instId: string, instType: string, lang: string, isLeftHanded: boolean): StrokeDef[] {
  const isFr = lang === 'fr';
  let strokes: StrokeDef[] = [];

  if (instId === 'timbal') {
    strokes = [
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
  else if (instId === 'caixa' || instId === 'tarol') {
    strokes = [
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
  else if (['marcante', 'meiao', 'repique', 'alfaia'].includes(instId)) {
    // Alfaias : D couplé à d, E couplé à e avec I rattaché à la main gauche, C couplé à X, B tout seul. Aucun Fla.
    strokes = [
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
        label: isFr ? 'Clic baguettes' : 'Click',
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
        symbol: 'I',
        label: isFr ? 'Bacalhau (Iguarassu)' : 'Bacalhau (Iguarassu)',
        shortcut: 'I',
        colorKey: 'I'
      },
      {
        symbol: 'B',
        label: isFr ? 'Barulho (Grondement)' : 'Barulho (Vibração)',
        shortcut: 'B',
        colorKey: 'B'
      },
    ];
  }
  else if (instType === 'gongue' || instId === 'gongue') {
    strokes = [
      {
        symbol: 'G',
        label: isFr ? 'Grave Fort' : 'Grave Forte',
        shortcut: 'G',
        colorKey: 'G'
      },
      {
        symbol: 'g',
        label: isFr ? 'Grave Faible' : 'Grave Fraco',
        shortcut: 'g',
        colorKey: 'g'
      },
      {
        symbol: 'A',
        label: isFr ? 'Aigu Fort' : 'Agudo Forte',
        shortcut: 'A',
        colorKey: 'A'
      },
      {
        symbol: 'a',
        label: isFr ? 'Aigu Faible' : 'Agudo Fraco',
        shortcut: 'a',
        colorKey: 'a'
      },
      {
        symbol: 'X',
        label: isFr ? 'Corps / Flanc' : 'Corpo do sino',
        shortcut: 'X',
        colorKey: 'X'
      },
      {
        symbol: 'B',
        label: isFr ? 'Barulho (Grondement)' : 'Barulho (Vibração)',
        shortcut: 'B',
        colorKey: 'B'
      },
    ];
  }
  else if (instId === 'agbe') {
    strokes = [
      {
        symbol: 'D',
        label: isFr ? 'Projection Droite Fort' : 'Projeção Direita Forte',
        shortcut: 'D',
        colorKey: 'D'
      },
      {
        symbol: 'd',
        label: isFr ? 'Projection Droite Faible' : 'Projeção Direita Fraca',
        shortcut: 'd',
        colorKey: 'd'
      },
      {
        symbol: 'E',
        label: isFr ? 'Projection Gauche Fort' : 'Projeção Esquerda Forte',
        shortcut: 'E',
        colorKey: 'E'
      },
      {
        symbol: 'e',
        label: isFr ? 'Projection Gauche Faible' : 'Projeção Esquerda Fraca',
        shortcut: 'e',
        colorKey: 'e'
      },
      {
        symbol: 'S',
        label: isFr ? 'Salto' : 'Salto',
        shortcut: 'S',
        colorKey: 'S'
      },
      {
        symbol: 'V',
        label: isFr ? 'Volta' : 'Volta',
        shortcut: 'V',
        colorKey: 'V'
      },
      {
        symbol: 'B',
        label: isFr ? 'Barulho (Grondement)' : 'Barulho (Vibração)',
        shortcut: 'B',
        colorKey: 'B'
      },
    ];
  }
  else if (instId === 'mineiro') {
    strokes = [
      {
        symbol: 'P',
        label: isFr ? 'Poussé Fort' : 'Push Forte',
        shortcut: 'P',
        colorKey: 'P'
      },
      {
        symbol: 'p',
        label: isFr ? 'Poussé Faible' : 'Push Fraco',
        shortcut: 'p',
        colorKey: 'p'
      },
      {
        symbol: 'T',
        label: isFr ? 'Tiré Fort' : 'Pull Forte',
        shortcut: 'T',
        colorKey: 'T'
      },
      {
        symbol: 't',
        label: isFr ? 'Tiré Faible' : 'Pull Fraco',
        shortcut: 't',
        colorKey: 't'
      },
      {
        symbol: 'L',
        label: isFr ? 'Latéral' : 'Lateral',
        shortcut: 'L',
        colorKey: 'L'
      },
      {
        symbol: 'B',
        label: isFr ? 'Barulho (Grondement)' : 'Barulho (Vibração)',
        shortcut: 'B',
        colorKey: 'B'
      },
    ];
  }
  else if (instId === 'puxador') {
    strokes = [
      { symbol: 'P', label: 'Puxador', shortcut: 'P', colorKey: 'P' },
    ];
  }
  else if (instId === 'coro') {
    strokes = [
      { symbol: 'C', label: isFr ? 'Chœur' : 'Coro', shortcut: 'C', colorKey: 'C' },
    ];
  }
  else if (instId === 'apito') {
    strokes = [
      {
        symbol: 'W',
        label: isFr ? 'Sifflet Long' : 'Apito Longo',
        shortcut: 'W',
        colorKey: 'W'
      },
      {
        symbol: 'w',
        label: isFr ? 'Sifflet Court' : 'Apito Curto',
        shortcut: 'w',
        colorKey: 'w'
      },
    ];
  }
  else if (instType === 'voice') {
    strokes = [
      { symbol: 'P', label: 'Puxador', shortcut: 'Click top', colorKey: 'P' },
      { symbol: 'C', label: isFr ? 'Chœur' : 'Coro', shortcut: 'Click top', colorKey: 'C' },
    ];
  }

  // Inversion visuelle pour gaucher
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

export const STEP_OPTIONS = [4, 8, 12, 16, 24, 32];

export function getNextStepValue(instId: string, instType: string, currentVal: string | number): string | number {
  const norm = typeof currentVal === 'string' ? currentVal.trim() : currentVal;
  
  if (instId === 'mineiro') {
    if (norm === 0 || norm === '0' || !norm) return 'p';
    if (norm === 'p') return 'P';
    if (norm === 'P') return 't';
    if (norm === 't') return 'T';
    if (norm === 'T') return 'L';
    if (norm === 'L') return 'B';
    return 0;
  }
  if (instId === 'agbe') {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'e';
    if (norm === 'e') return 'E';
    if (norm === 'E') return 'S';
    if (norm === 'S' || norm === 's') return 'V';
    if (norm === 'V' || norm === 'v') return 'B';
    return 0;
  }
  if (instType === 'gongue' || instId === 'gongue') {
    if (norm === 0 || norm === '0' || !norm) return 'g';
    if (norm === 'g') return 'G';
    if (norm === 'G') return 'a';
    if (norm === 'a') return 'A';
    if (norm === 'A') return 'X';
    if (norm === 'X') return 'B';
    return 0;
  }
  if (instId === 'timbal') {
    if (norm === 0 || norm === '0' || !norm) return 'g';
    if (norm === 'g') return 'G';
    if (norm === 'G') return 'a';
    if (norm === 'a') return 'A';
    if (norm === 'A') return 's';
    if (norm === 's') return 'S';
    if (norm === 'S') return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'p';
    if (norm === 'p') return 'P';
    if (norm === 'P') return 'f';
    if (norm === 'f') return 'F';
    if (norm === 'F') return 'v';
    if (norm === 'v') return 'V';
    if (norm === 'V') return 'C';
    if (norm === 'C') return 'B';
    return 0;
  }
  if (instId === 'caixa' || instId === 'tarol') {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'e';
    if (norm === 'e') return 'E';
    if (norm === 'E') return 'C';
    if (norm === 'C') return 'X';
    if (norm === 'X') return 'f';
    if (norm === 'f') return 'F';
    if (norm === 'F') return 'R';
    if (norm === 'R') return 'r';
    if (norm === 'r') return 'B';
    return 0;
  }
  if (['marcante', 'meiao', 'repique', 'alfaia'].includes(instId)) {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'e';
    if (norm === 'e') return 'E';
    if (norm === 'E') return 'C';
    if (norm === 'C') return 'X';
    if (norm === 'X') return 'I';
    if (norm === 'I') return 'B';
    return 0;
  }
  if (instId === 'apito') {
    if (norm === 0 || norm === '0' || !norm) return 'W';
    if (norm === 'W') return 'w';
    return 0;
  }
  // default
  if (norm === 0 || norm === '0' || !norm) return 'd';
  if (norm === 'd') return 'D';
  if (norm === 'D') return 'e';
  if (norm === 'e') return 'E';
  return 0;
}

export function isStrokeActiveByDefault(instId: string, stroke: string): boolean {
  const norm = typeof stroke === 'string' ? stroke.trim() : stroke;
  
  if (['marcante', 'meiao', 'repique', 'alfaia', 'caixa', 'tarol'].includes(instId)) {
    return ['D', 'E', 'd', 'e', 'C', 'X', 'F', 'f'].includes(norm);
  }
  
  if (instId === 'gongue') {
    return ['G', 'g', 'A', 'a'].includes(norm);
  }
  
  if (instId === 'agbe') {
    return ['D', 'E', 'd', 'e', 'S', 'V'].includes(norm);
  }
  
  if (instId === 'mineiro') {
    return ['P', 'T', 'p', 't'].includes(norm);
  }
  
  if (instId === 'timbal') {
    return ['G', 'g', 'A', 'a', 'S', 's', 'D', 'd', 'P', 'p', 'F', 'f', 'V', 'v'].includes(norm);
  }
  
  if (instId === 'apito') {
    return ['W', 'w'].includes(norm);
  }
  
  if (instId === 'puxador') {
    return ['P'].includes(norm);
  }
  
  if (instId === 'coro') {
    return ['C'].includes(norm);
  }
  
  return false;
}

export interface StrokePair {
  id: string; // e.g. 'D', 'E', 'C', 'B', 'F', 'G', 'A', 'X', 'P', 'T', 'L', 'S', 'W'
  strong: StrokeDef;
  weak?: StrokeDef;
  third?: StrokeDef;
  strokes: StrokeDef[]; // Array of 1, 2, or 3 strokes
  mainLabel: string;
}

export function getStrokePairs(instId: string, instType: string, lang: string, isLeftHanded: boolean): StrokePair[] {
  const allStrokes = getStrokesForInstrument(instId, instType, lang, isLeftHanded);
  const isFr = lang === 'fr';

  // 1. Alfaias (marcante, meiao, repique, alfaia)
  if (['marcante', 'meiao', 'repique', 'alfaia'].includes(instId)) {
    const dStrong = allStrokes.find(s => s.symbol === 'D');
    const dWeak = allStrokes.find(s => s.symbol === 'd');
    const eStrong = allStrokes.find(s => s.symbol === 'E');
    const eWeak = allStrokes.find(s => s.symbol === 'e');
    const iStroke = allStrokes.find(s => s.symbol === 'I');
    const cStroke = allStrokes.find(s => s.symbol === 'C');
    const xStroke = allStrokes.find(s => s.symbol === 'X');
    const bStroke = allStrokes.find(s => s.symbol === 'B');

    const pairs: StrokePair[] = [];
    if (dStrong) {
      const strokes = [dStrong, dWeak].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'D',
        strong: dStrong,
        weak: dWeak,
        strokes,
        mainLabel: isFr ? (isLeftHanded ? 'Main Gauche' : 'Main Droite') : (isLeftHanded ? 'Mão Esquerda' : 'Mão Direita')
      });
    }
    if (eStrong) {
      const strokes = [eStrong, eWeak, iStroke].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'E',
        strong: eStrong,
        weak: eWeak,
        third: iStroke,
        strokes,
        mainLabel: isFr ? (isLeftHanded ? 'Main Droite' : 'Main Gauche') : (isLeftHanded ? 'Mão Direita' : 'Mão Esquerda')
      });
    }
    if (cStroke) {
      const strokes = [cStroke, xStroke].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'C',
        strong: cStroke,
        weak: xStroke,
        strokes,
        mainLabel: isFr ? 'Clic / Cerclage' : 'Click / Aro'
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

  // 2. Caixa & Tarol (caixa, tarol)
  if (instId === 'caixa' || instId === 'tarol') {
    const dStrong = allStrokes.find(s => s.symbol === 'D');
    const dWeak = allStrokes.find(s => s.symbol === 'd');
    const rStrong = allStrokes.find(s => s.symbol === 'R');
    const eStrong = allStrokes.find(s => s.symbol === 'E');
    const eWeak = allStrokes.find(s => s.symbol === 'e');
    const rWeak = allStrokes.find(s => s.symbol === 'r');
    const cStroke = allStrokes.find(s => s.symbol === 'C');
    const xStroke = allStrokes.find(s => s.symbol === 'X');
    const fStrong = allStrokes.find(s => s.symbol === 'F');
    const fWeak = allStrokes.find(s => s.symbol === 'f');
    const bStroke = allStrokes.find(s => s.symbol === 'B');

    const pairs: StrokePair[] = [];
    if (dStrong) {
      const strokes = [dStrong, dWeak, rStrong].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'D',
        strong: dStrong,
        weak: dWeak,
        third: rStrong,
        strokes,
        mainLabel: isFr ? (isLeftHanded ? 'Main Gauche' : 'Main Droite') : (isLeftHanded ? 'Mão Esquerda' : 'Mão Direita')
      });
    }
    if (eStrong) {
      const strokes = [eStrong, eWeak, rWeak].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'E',
        strong: eStrong,
        weak: eWeak,
        third: rWeak,
        strokes,
        mainLabel: isFr ? (isLeftHanded ? 'Main Droite' : 'Main Gauche') : (isLeftHanded ? 'Mão Direita' : 'Mão Esquerda')
      });
    }
    if (cStroke) {
      const strokes = [cStroke, xStroke].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'C',
        strong: cStroke,
        weak: xStroke,
        strokes,
        mainLabel: isFr ? 'Clic / Cerclage' : 'Click / Aro'
      });
    }
    if (fStrong) {
      const strokes = [fStrong, fWeak].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'F',
        strong: fStrong,
        weak: fWeak,
        strokes,
        mainLabel: isFr
          ? (isLeftHanded ? 'Fla (G/D)' : 'Fla (D/G)')
          : (isLeftHanded ? 'Fla (E/D)' : 'Fla (D/E)')
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

  // 3. Timbal (timbal)
  if (instId === 'timbal') {
    const pairKeys = [
      { id: 'G', weakId: 'g', label: isFr ? 'Basse' : 'Baixo' },
      { id: 'A', weakId: 'a', label: isFr ? 'Aberto' : 'Aberto' },
      { id: 'S', weakId: 's', label: isFr ? 'Slap' : 'Slap' },
      { id: 'D', weakId: 'd', label: isFr ? 'Fantôme' : 'Dedilhado' },
      { id: 'P', weakId: 'p', label: isFr ? 'Pressé' : 'Preso' },
    ];
    const pairs: StrokePair[] = pairKeys.map(pk => {
      const strong = allStrokes.find(s => s.symbol === pk.id);
      const weak = allStrokes.find(s => s.symbol === pk.weakId);
      const strokes = [strong, weak].filter(Boolean) as StrokeDef[];
      return {
        id: pk.id,
        strong: strong!,
        weak: weak,
        strokes,
        mainLabel: pk.label
      };
    }).filter(p => !!p.strong);

    // Bouton unique pour les Flas (Fla Aberto F/f + Fla Slap V/v)
    const fStrong = allStrokes.find(s => s.symbol === 'F');
    const fWeak = allStrokes.find(s => s.symbol === 'f');
    const vStrong = allStrokes.find(s => s.symbol === 'V');
    const vWeak = allStrokes.find(s => s.symbol === 'v');

    if (fStrong) {
      const flaStrokes = [fStrong, fWeak, vStrong, vWeak].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'F',
        strong: fStrong,
        weak: fWeak,
        third: vStrong,
        strokes: flaStrokes,
        mainLabel: isFr ? 'Flas' : 'Flas'
      });
    }

    // Bouton autonome Clic / Clap
    const cStroke = allStrokes.find(s => s.symbol === 'C');
    if (cStroke) {
      pairs.push({
        id: 'C',
        strong: cStroke,
        strokes: [cStroke],
        mainLabel: isFr ? 'Clap' : 'Palma'
      });
    }

    // Bouton autonome Barulho
    const bStroke = allStrokes.find(s => s.symbol === 'B');
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

  // 4. Gonguê (gongue)
  if (instType === 'gongue' || instId === 'gongue') {
    const gStrong = allStrokes.find(s => s.symbol === 'G');
    const gWeak = allStrokes.find(s => s.symbol === 'g');
    const aStrong = allStrokes.find(s => s.symbol === 'A');
    const aWeak = allStrokes.find(s => s.symbol === 'a');
    const xStroke = allStrokes.find(s => s.symbol === 'X');
    const bStroke = allStrokes.find(s => s.symbol === 'B');

    const pairs: StrokePair[] = [];
    if (gStrong) {
      const strokes = [gStrong, gWeak].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'G',
        strong: gStrong,
        weak: gWeak,
        strokes,
        mainLabel: isFr ? 'Grave' : 'Grave'
      });
    }
    if (aStrong) {
      const strokes = [aStrong, aWeak].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'A',
        strong: aStrong,
        weak: aWeak,
        strokes,
        mainLabel: isFr ? 'Aigu' : 'Agudo'
      });
    }
    if (xStroke) {
      pairs.push({
        id: 'X',
        strong: xStroke,
        strokes: [xStroke],
        mainLabel: isFr ? 'Corps' : 'Corpo'
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

  // 5. Agbê (agbe)
  if (instId === 'agbe') {
    const dStrong = allStrokes.find(s => s.symbol === 'D');
    const dWeak = allStrokes.find(s => s.symbol === 'd');
    const eStrong = allStrokes.find(s => s.symbol === 'E');
    const eWeak = allStrokes.find(s => s.symbol === 'e');
    const sStrong = allStrokes.find(s => s.symbol === 'S');
    const vWeak = allStrokes.find(s => s.symbol === 'V');
    const bStroke = allStrokes.find(s => s.symbol === 'B');

    const pairs: StrokePair[] = [];
    if (dStrong) {
      const strokes = [dStrong, dWeak].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'D',
        strong: dStrong,
        weak: dWeak,
        strokes,
        mainLabel: isFr ? 'Droite' : 'Direita'
      });
    }
    if (eStrong) {
      const strokes = [eStrong, eWeak].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'E',
        strong: eStrong,
        weak: eWeak,
        strokes,
        mainLabel: isFr ? 'Gauche' : 'Esquerda'
      });
    }
    if (sStrong) {
      const strokes = [sStrong, vWeak].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'S',
        strong: sStrong,
        weak: vWeak,
        strokes,
        mainLabel: isFr ? 'Rotations / Claqué' : 'Salto / Volta'
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

  // 6. Mineiro (mineiro)
  if (instId === 'mineiro') {
    const pStrong = allStrokes.find(s => s.symbol === 'P');
    const pWeak = allStrokes.find(s => s.symbol === 'p');
    const tStrong = allStrokes.find(s => s.symbol === 'T');
    const tWeak = allStrokes.find(s => s.symbol === 't');
    const lStroke = allStrokes.find(s => s.symbol === 'L');
    const bStroke = allStrokes.find(s => s.symbol === 'B');

    const pairs: StrokePair[] = [];
    if (pStrong) {
      const strokes = [pStrong, pWeak].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'P',
        strong: pStrong,
        weak: pWeak,
        strokes,
        mainLabel: isFr ? 'Poussé' : 'Push'
      });
    }
    if (tStrong) {
      const strokes = [tStrong, tWeak].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: 'T',
        strong: tStrong,
        weak: tWeak,
        strokes,
        mainLabel: isFr ? 'Tiré' : 'Pull'
      });
    }
    if (lStroke) {
      pairs.push({
        id: 'L',
        strong: lStroke,
        strokes: [lStroke],
        mainLabel: isFr ? 'Latéral' : 'Lateral'
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

  // 7. Apito (apito)
  if (instId === 'apito') {
    const wStrong = allStrokes.find(s => s.symbol === 'W');
    const wWeak = allStrokes.find(s => s.symbol === 'w');
    if (wStrong) {
      const strokes = [wStrong, wWeak].filter(Boolean) as StrokeDef[];
      return [{
        id: 'W',
        strong: wStrong,
        weak: wWeak,
        strokes,
        mainLabel: isFr ? 'Sifflet' : 'Apito'
      }];
    }
  }

  // 8. Voix (puxador, coro, toada)
  if (instId === 'puxador') {
    const p = allStrokes.find(s => s.symbol === 'P') || { symbol: 'P', label: 'Puxador', shortcut: 'P', colorKey: 'P' };
    return [{ id: 'P', strong: p, strokes: [p], mainLabel: 'Puxador' }];
  }
  if (instId === 'coro') {
    const c = allStrokes.find(s => s.symbol === 'C') || { symbol: 'C', label: isFr ? 'Chœur' : 'Coro', shortcut: 'C', colorKey: 'C' };
    return [{ id: 'C', strong: c, strokes: [c], mainLabel: isFr ? 'Chœur' : 'Coro' }];
  }
  if (instId === 'toada') {
    const t = allStrokes.find(s => s.symbol === 'T') || { symbol: 'T', label: 'Toada', shortcut: 'T', colorKey: 'T' };
    return [{ id: 'T', strong: t, strokes: [t], mainLabel: 'Toada' }];
  }

  const pairs: StrokePair[] = [];
  const processedSymbols = new Set<string>();

  for (const s of allStrokes) {
    if (processedSymbols.has(s.symbol)) continue;
    const isUpper = s.symbol === s.symbol.toUpperCase();
    if (isUpper) {
      const lower = allStrokes.find(other => other.symbol === s.symbol.toLowerCase() && other.symbol !== s.symbol);
      const strokes = [s, lower].filter(Boolean) as StrokeDef[];
      pairs.push({
        id: s.symbol,
        strong: s,
        weak: lower,
        strokes,
        mainLabel: s.label.replace(/\s*\((Forte|Fraca|Fort|Faible)\)/i, '')
      });
      processedSymbols.add(s.symbol);
      if (lower) processedSymbols.add(lower.symbol);
    }
  }

  return pairs;
}

export function getExoticStrokes(instId: string, instType: string, lang: string, isLeftHanded: boolean): StrokeDef[] {
  return []; // Tout est désormais intégré dans les boutons du dock d'écriture
}

/**
 * Initialise le binôme fondamental d'un pas vide selon l'instrument :
 * - Alfaias, Caixa, Tarol, Agbê : ['D', 'E']
 * - Mineiro : ['P', 'T']
 * - Gonguê : ['G', 'A']
 * - Timbal : ['A', 'a']
 * - Apito : ['W', 'w']
 */
export function getDefaultSplitPair(instId: string, instType = ''): [string, string] {
  if (['marcante', 'meiao', 'repique', 'alfaia', 'caixa', 'tarol', 'agbe'].includes(instId)) {
    return ['D', 'E'];
  }
  if (instId === 'mineiro') {
    return ['P', 'T'];
  }
  if (instId === 'gongue' || instType === 'gongue') {
    return ['G', 'A'];
  }
  if (instId === 'timbal') {
    return ['A', 'a'];
  }
  if (instId === 'apito') {
    return ['W', 'w'];
  }
  return ['D', 'E'];
}

/**
 * Déduit automatiquement la frappe complémentaire (opposée) pour scinder un pas en triples croches :
 * - Alfaias / Caixas / Tarols / Agbê :
 *     D -> E, d -> e, E -> D, e -> d
 *     C -> X, X -> C
 *     F -> f, f -> F
 *     R -> r, r -> R
 * - Timbal : inverse la main en conservant le timbre
 *     A -> a, a -> A, G -> g, g -> G, S -> s, s -> S
 *     D -> d, d -> D, P -> p, p -> P, F -> f, f -> F, V -> v, v -> V
 * - Mineiro :
 *     P -> T, T -> P, p -> t, t -> p
 * - Gonguê :
 *     G -> A, A -> G, g -> a, a -> g
 * - Apito :
 *     W -> w, w -> W
 */
export function getComplementaryStroke(
  symbol: string,
  instId: string,
  instType = '',
  isLeftHanded = false
): string {
  const norm = (symbol || '').trim();

  // Alfaias / Caixas / Tarols / Agbê
  if (['marcante', 'meiao', 'repique', 'alfaia', 'caixa', 'tarol', 'agbe'].includes(instId)) {
    if (norm === 'D') return 'E';
    if (norm === 'd') return 'e';
    if (norm === 'E') return 'D';
    if (norm === 'e') return 'd';
    if (norm === 'C') return 'X';
    if (norm === 'X') return 'C';
    if (norm === 'F') return 'f';
    if (norm === 'f') return 'F';
    if (norm === 'R') return 'r';
    if (norm === 'r') return 'R';
    if (norm === 'S') return 'V';
    if (norm === 'V') return 'S';
    if (norm === 'I') return 'D';
    return 'E';
  }

  // Timbal
  if (instId === 'timbal') {
    if (norm === 'A') return 'a';
    if (norm === 'a') return 'A';
    if (norm === 'G') return 'g';
    if (norm === 'g') return 'G';
    if (norm === 'S') return 's';
    if (norm === 's') return 'S';
    if (norm === 'D') return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'P') return 'p';
    if (norm === 'p') return 'P';
    if (norm === 'F') return 'f';
    if (norm === 'f') return 'F';
    if (norm === 'V') return 'v';
    if (norm === 'v') return 'V';
    return 'a';
  }

  // Mineiro
  if (instId === 'mineiro') {
    if (norm === 'P') return 'T';
    if (norm === 'T') return 'P';
    if (norm === 'p') return 't';
    if (norm === 't') return 'p';
    if (norm === 'L') return 'P';
    return 'T';
  }

  // Gonguê
  if (instId === 'gongue' || instType === 'gongue') {
    if (norm === 'G') return 'A';
    if (norm === 'A') return 'G';
    if (norm === 'g') return 'a';
    if (norm === 'a') return 'g';
    if (norm === 'X') return 'G';
    return 'A';
  }

  // Apito
  if (instId === 'apito') {
    if (norm === 'W') return 'w';
    if (norm === 'w') return 'W';
    return 'w';
  }

  // Fallback universel
  if (norm === norm.toUpperCase()) return norm.toLowerCase();
  return norm.toUpperCase();
}

/**
 * Vérifie si un symbole de frappe existe réellement dans la configuration audio de l'instrument
 */
export function strokeExistsForInstrument(
  symbol: string,
  instId: string,
  instType = '',
  lang = 'fr',
  isLeftHanded = false
): boolean {
  if (!symbol || symbol === '0') return true;
  const strokes = getStrokesForInstrument(instId, instType, lang, isLeftHanded);
  return strokes.some(s => s.symbol === symbol);
}

/**
 * Retourne la contrepartie de nuance pour un symbole (Fort <-> Faible) SI et SEULEMENT SI elle existe dans l'instrument.
 * Sinon, retourne le symbole inchangé (protège contre les erreurs "No stroke mapped for symbol").
 */
export function getNuanceCounterpart(
  symbol: string,
  instId: string,
  instType = '',
  lang = 'fr',
  isLeftHanded = false
): string {
  if (!symbol || symbol === '0') return '0';
  const pairs = getStrokePairs(instId, instType, lang, isLeftHanded);
  const matchedPair = pairs.find(
    p => p.strokes.some(s => s.symbol === symbol)
  );
  if (!matchedPair || matchedPair.strokes.length <= 1) return symbol;

  const symbols = matchedPair.strokes.map(s => s.symbol);
  const currentIdx = symbols.indexOf(symbol);
  if (currentIdx === -1) return symbol;
  const nextIdx = (currentIdx + 1) % symbols.length;
  return symbols[nextIdx];
}

/**
 * Transition d'état directe au tap sans latence (Séquence directe 0 ms) :
 * - Tap sur vide ('0' ou '') -> écrit le premier coup de la famille (coup fort)
 * - Tap successif sur le même pas -> cycle sur l'ensemble des déclinaisons de la famille du bouton :
 *     * Alfaias E : E -> e -> I -> 0
 *     * Caixas D : D -> d -> R -> 0
 *     * Caixas E : E -> e -> r -> 0
 *     * Paires 2 frappes : D -> d -> 0
 *     * Bouton autonome (B, X, L, C) : B -> 0
 * - Tap sur un coup d'une autre famille -> remplace par la première frappe de la famille sélectionnée
 */
export function getNextNuanceState(
  currentVal: string | number | [string, string],
  activeTool: string,
  instId: string,
  instType = '',
  lang = 'fr',
  isLeftHanded = false
): string | number {
  if (Array.isArray(currentVal)) return currentVal[0];
  const norm = String(currentVal ?? '0').trim();

  // Si l'outil actif est la gomme ('0')
  if (activeTool === '0' || activeTool === '' || String(activeTool) === '0') {
    return '0';
  }

  // Cas spécifique Timbal Flas : au clic / tap, cycle Fla Aberto fort (F) -> faible (f) -> efface (0), ou si Slap V -> v -> 0
  if (instId === 'timbal' && (activeTool === 'F' || activeTool === 'f' || activeTool === 'V' || activeTool === 'v')) {
    if (norm === '0' || norm === '') return 'F';
    if (norm === 'F') return 'f';
    if (norm === 'f') return '0';
    if (norm === 'V') return 'v';
    if (norm === 'v') return '0';
    return 'F';
  }

  const pairs = getStrokePairs(instId, instType, lang, isLeftHanded);
  const matchedPair = pairs.find(
    p => p.id === activeTool || p.strong.symbol === activeTool || p.strokes.some(s => s.symbol === activeTool)
  );

  if (!matchedPair || matchedPair.strokes.length === 0) {
    return activeTool;
  }

  const symbols = matchedPair.strokes.map(s => s.symbol);

  // Case vide -> premier coup (fort)
  if (norm === '0' || norm === '') {
    return symbols[0];
  }

  // Case contient une frappe de cette même famille
  const currentIdx = symbols.indexOf(norm);
  if (currentIdx !== -1) {
    if (currentIdx + 1 < symbols.length) {
      return symbols[currentIdx + 1];
    }
    // Fin de cycle -> efface
    return '0';
  }

  // Case contient une frappe d'une autre famille -> remplace par le premier coup
  return symbols[0];
}

/**
 * Molette souris sécurisée (onWheel) et touches clavier (↑/↓) :
 * - up : remonte vers la frappe la plus forte / fondamentale (index 0)
 * - down : descend / avance vers les nuances secondaires ou ornements de la famille
 * - Timbal Flas : bascule entre Fla Aberto (F/f) et Fla Slap (V/v)
 * - Bouton autonome (1 frappe) : ne change pas
 */
export function getWheelNuanceState(
  currentVal: string | number | [string, string],
  direction: 'up' | 'down',
  instId: string,
  instType = '',
  lang = 'fr',
  isLeftHanded = false
): string | number {
  if (Array.isArray(currentVal)) return currentVal[0];
  const norm = String(currentVal ?? '0').trim();
  if (norm === '0' || norm === '') return norm;

  // Cas spécifique Timbal : bascule entre Fla Aberto (F/f) et Fla Slap (V/v) à la molette
  if (instId === 'timbal') {
    if (norm === 'F' && direction === 'down') return 'V';
    if (norm === 'V' && direction === 'up') return 'F';
    if (norm === 'f' && direction === 'down') return 'v';
    if (norm === 'v' && direction === 'up') return 'f';
  }

  const pairs = getStrokePairs(instId, instType, lang, isLeftHanded);
  const matchedPair = pairs.find(
    p => p.strokes.some(s => s.symbol === norm)
  );

  if (!matchedPair || matchedPair.strokes.length <= 1) {
    // Coup sans nuance alternative (ou autonome) : ne pas modifier
    return norm;
  }

  const symbols = matchedPair.strokes.map(s => s.symbol);
  const currentIdx = symbols.indexOf(norm);
  if (currentIdx === -1) return norm;

  if (direction === 'up') {
    const newIdx = Math.max(0, currentIdx - 1);
    return symbols[newIdx];
  } else {
    const newIdx = Math.min(symbols.length - 1, currentIdx + 1);
    return symbols[newIdx];
  }
}

/**
 * Règle universelle de parité (Mode Alternance / Frisé) :
 * - Pas impairs (1, 3, 5, 7... soit index 0, 2, 4...) : Coup Fort / Droite (Majuscule)
 * - Pas pairs (2, 4, 6, 8... soit index 1, 3, 5...) : Coup Faible / Gauche (Minuscule si disponible)
 * Ex: Timbal -> G, g, G, g | Caixa -> D, d, D, d
 */
export function getAlternatingStroke(
  stepIdx: number, // 0-indexed (0 = pas 1, 1 = pas 2...)
  activeTool: string,
  instId: string,
  instType = '',
  lang = 'fr',
  isLeftHanded = false
): string {
  if (activeTool === '0' || activeTool === '' || String(activeTool) === '0') {
    return '0';
  }

  const pairs = getStrokePairs(instId, instType, lang, isLeftHanded);
  const matchedPair = pairs.find(
    p => p.id === activeTool || p.strong.symbol === activeTool || p.strokes.some(s => s.symbol === activeTool)
  );

  if (!matchedPair) return activeTool;

  const isEvenStep = (stepIdx % 2 === 1); // pas 2, 4, 6, 8...

  if (isEvenStep && matchedPair.weak) {
    return matchedPair.weak.symbol;
  }

  return matchedPair.strong.symbol;
}
