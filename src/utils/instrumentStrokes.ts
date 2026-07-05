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
      { symbol: 'G', label: isFr ? (isLeftHanded ? 'Main Gauche Forte (Basse)' : 'Main Droite Forte (Basse)') : (isLeftHanded ? 'Mão Esquerda Forte (Baixo)' : 'Mão Direita Forte (Baixo)'), shortcut: 'G', colorKey: 'G' },
      { symbol: 'g', label: isFr ? (isLeftHanded ? 'Main Droite Faible (Basse)' : 'Main Gauche Faible (Basse)') : (isLeftHanded ? 'Mão Direita Fraca (Baixo)' : 'Mão Esquerda Fraca (Baixo)'), shortcut: 'g', colorKey: 'g' },
      { symbol: 'A', label: isFr ? (isLeftHanded ? 'Main Gauche Forte (Ouvert)' : 'Main Droite Forte (Ouvert)') : (isLeftHanded ? 'Mão Esquerda Forte (Aberto)' : 'Mão Direita Forte (Aberto)'), shortcut: 'A', colorKey: 'A' },
      { symbol: 'a', label: isFr ? (isLeftHanded ? 'Main Droite Faible (Ouvert)' : 'Main Gauche Faible (Ouvert)') : (isLeftHanded ? 'Mão Direita Fraca (Aberto)' : 'Mão Esquerda Fraca (Aberto)'), shortcut: 'a', colorKey: 'a' },
      { symbol: 'S', label: isFr ? (isLeftHanded ? 'Main Gauche Forte (Claqué)' : 'Main Droite Forte (Claqué)') : (isLeftHanded ? 'Mão Esquerda Forte (Slap)' : 'Mão Direita Forte (Slap)'), shortcut: 'S', colorKey: 'S' },
      { symbol: 's', label: isFr ? (isLeftHanded ? 'Main Droite Faible (Claqué)' : 'Main Gauche Faible (Claqué)') : (isLeftHanded ? 'Mão Direita Fraca (Slap)' : 'Mão Esquerda Fraca (Slap)'), shortcut: 's', colorKey: 's' },
      { symbol: 'D', label: isFr ? (isLeftHanded ? 'Main Gauche Forte (Fantôme)' : 'Main Droite Forte (Fantôme)') : (isLeftHanded ? 'Mão Esquerda Forte (Dedilhado)' : 'Mão Direita Forte (Dedilhado)'), shortcut: 'D', colorKey: 'D' },
      { symbol: 'd', label: isFr ? (isLeftHanded ? 'Main Droite Faible (Fantôme)' : 'Main Gauche Faible (Fantôme)') : (isLeftHanded ? 'Mão Direita Fraca (Dedilhado)' : 'Mão Esquerda Fraca (Dedilhado)'), shortcut: 'd', colorKey: 'd' },
      { symbol: 'P', label: isFr ? (isLeftHanded ? 'Main Gauche Forte (Fermé)' : 'Main Droite Forte (Fermé)') : (isLeftHanded ? 'Mão Esquerda Forte (Preso)' : 'Mão Direita Forte (Preso)'), shortcut: 'P', colorKey: 'P' },
      { symbol: 'p', label: isFr ? (isLeftHanded ? 'Main Droite Faible (Fermé)' : 'Main Gauche Faible (Fermé)') : (isLeftHanded ? 'Mão Direita Fraca (Preso)' : 'Mão Esquerda Fraca (Preso)'), shortcut: 'p', colorKey: 'p' },
      { symbol: 'F', label: isFr ? 'Fla ouvert' : 'Fla aberto', shortcut: 'F', colorKey: 'F' },
      { symbol: 'V', label: isFr ? 'Fla claqué' : 'Fla slap', shortcut: 'V', colorKey: 'V' },
      { symbol: 'C', label: isFr ? 'Clap (mains)' : 'Clap (mãos)', shortcut: 'C', colorKey: 'C' },
      { symbol: 'B', label: isFr ? 'Tremblement' : 'Tremor (Barulho)', shortcut: 'B', colorKey: 'B' },
    ];
  }
  else if (instId === 'caixa') {
    strokes = [
      { symbol: 'D', label: isFr ? 'Main Droite Forte' : 'Mão Direita Forte', shortcut: 'D', colorKey: 'D' },
      { symbol: 'E', label: isFr ? 'Main Gauche Forte' : 'Mão Esquerda Forte', shortcut: 'E', colorKey: 'E' },

      { symbol: 'd', label: isFr ? 'Main Droite Faible' : 'Mão Direita Fraca', shortcut: 'd', colorKey: 'd' },
      { symbol: 'e', label: isFr ? 'Main Gauche Faible' : 'Mão Esquerda Fraca', shortcut: 'e', colorKey: 'e' },

      { symbol: 'X', label: isFr ? 'Cerclage' : 'Toque no aro', shortcut: 'X', colorKey: 'X' },
      { symbol: 'C', label: isFr ? 'Click' : 'Click', shortcut: 'C', colorKey: 'C' },
      { symbol: 'B', label: isFr ? 'Tremblement' : 'Tremor (Barulho)', shortcut: 'B', colorKey: 'B' },
      { symbol: 'F', label: 'Fla', shortcut: 'F', colorKey: 'F' },
      { symbol: 'R', label: isFr ? 'Roulement court D' : 'Rufada Direita', shortcut: 'R', colorKey: 'R' },
      { symbol: 'r', label: isFr ? 'Roulement court G' : 'Rufada Esquerda', shortcut: 'r', colorKey: 'r' },
    ];
  }
  else if (instId === 'marcante' || instId === 'meiao' || instId === 'repique') {
    strokes = [

      { symbol: 'D', label: isFr ? 'Main Droite Forte' : 'Mão Direita Forte', shortcut: 'D', colorKey: 'D' },
      { symbol: 'E', label: isFr ? 'Main Gauche Forte' : 'Mão Esquerda Forte', shortcut: 'E', colorKey: 'E' },
      { symbol: 'd', label: isFr ? 'Main Droite Faible' : 'Mão Direita Fraca', shortcut: 'd', colorKey: 'd' },
      { symbol: 'e', label: isFr ? 'Main Gauche Faible' : 'Mão Esquerda Fraca', shortcut: 'e', colorKey: 'e' },

      { symbol: 'X', label: isFr ? 'Cerclage' : 'Toque no aro', shortcut: 'X', colorKey: 'X' },
      { symbol: 'C', label: isFr ? 'Click' : 'Click', shortcut: 'C', colorKey: 'C' },
      { symbol: 'I', label: isFr ? 'Bacalhau (Iguarassu)' : 'Bacalhau (Iguarassu)', shortcut: 'I', colorKey: 'I' },
      { symbol: 'B', label: isFr ? 'Tremblement' : 'Tremor (Barulho)', shortcut: 'B', colorKey: 'B' },
    ];
  }
  else if (instType === 'gongue') {
    strokes = [
      { symbol: 'G', label: isFr ? 'Grave Forte' : 'Grave Forte', shortcut: 'G', colorKey: 'G' },
      { symbol: 'g', label: isFr ? 'Grave Faible' : 'Grave Fraco', shortcut: 'g', colorKey: 'g' },
      { symbol: 'A', label: isFr ? 'Aigu Forte' : 'Agudo Forte', shortcut: 'A', colorKey: 'A' },
      { symbol: 'a', label: isFr ? 'Aigu Faible' : 'Agudo Fraco', shortcut: 'a', colorKey: 'a' },
      { symbol: 'X', label: isFr ? 'Cerclage' : 'Toque no aro', shortcut: 'X', colorKey: 'X' },
      { symbol: 'B', label: isFr ? 'Tremblement' : 'Tremor (Barulho)', shortcut: 'B', colorKey: 'B' },
    ];
  }
  else if (instId === 'tarol') {
    strokes = [
      { symbol: 'D', label: isFr ? 'Main Droite Forte' : 'Mão Direita Forte', shortcut: 'D', colorKey: 'D' },
      { symbol: 'E', label: isFr ? 'Main Gauche Forte' : 'Mão Esquerda Forte', shortcut: 'E', colorKey: 'E' },

      { symbol: 'd', label: isFr ? 'Main Droite Faible' : 'Mão Direita Fraca', shortcut: 'd', colorKey: 'd' },
      { symbol: 'e', label: isFr ? 'Main Gauche Faible' : 'Mão Esquerda Fraca', shortcut: 'e', colorKey: 'e' },

      { symbol: 'X', label: isFr ? 'Cerclage' : 'Toque no aro', shortcut: 'X', colorKey: 'X' },
      { symbol: 'C', label: isFr ? 'Click' : 'Click', shortcut: 'C', colorKey: 'C' },
      { symbol: 'B', label: isFr ? 'Tremblement' : 'Tremor (Barulho)', shortcut: 'B', colorKey: 'B' },
      { symbol: 'F', label: 'Fla', shortcut: 'F', colorKey: 'F' },
      { symbol: 'R', label: isFr ? 'Roulement court D' : 'Rufada Direita', shortcut: 'R', colorKey: 'R' },
      { symbol: 'r', label: isFr ? 'Roulement court G' : 'Rufada Esquerda', shortcut: 'r', colorKey: 'r' },
    ];
  }
  else if (instId === 'agbe') {
    strokes = [
      { symbol: 'E', label: isFr ? 'Gauche Forte' : 'Esquerda Forte', shortcut: 'E', colorKey: 'E' },
      { symbol: 'D', label: isFr ? 'Droite Forte' : 'Direita Forte', shortcut: 'D', colorKey: 'D' },
      { symbol: 'e', label: isFr ? 'Gauche Faible' : 'Esquerda Fraca', shortcut: 'e', colorKey: 'e' },
      { symbol: 'd', label: isFr ? 'Droite Faible' : 'Direita Fraca', shortcut: 'd', colorKey: 'd' },
      { symbol: 'S', label: isFr ? 'Salto' : 'Salto', shortcut: 'S', colorKey: 'S' },
      { symbol: 'V', label: isFr ? 'Volta' : 'Volta', shortcut: 'V', colorKey: 'V' },
      { symbol: 'B', label: isFr ? 'Tremblement' : 'Tremor (Barulho)', shortcut: 'B', colorKey: 'B' },
    ];
  }
  else if (instId === 'mineiro') {
    strokes = [
      { symbol: 'P', label: isFr ? 'Haut Forte' : 'Push Forte (Cima)', shortcut: 'P', colorKey: 'P' },
      { symbol: 'T', label: isFr ? 'Bas Forte' : 'Pull Forte (Baixo)', shortcut: 'T', colorKey: 'T' },
      { symbol: 'p', label: isFr ? 'Haut Faible' : 'Push Fraco (Cima)', shortcut: 'p', colorKey: 'p' },
      { symbol: 't', label: isFr ? 'Bas Faible' : 'Pull Fraco (Baixo)', shortcut: 't', colorKey: 't' },
      { symbol: 'L', label: isFr ? 'Lado' : 'Lado', shortcut: 'L', colorKey: 'L' },
      { symbol: 'B', label: isFr ? 'Tremblement' : 'Tremor (Barulho)', shortcut: 'B', colorKey: 'B' },
    ];
  }
  else if (instType === 'voice') {
    strokes = [
      { symbol: 'P', label: 'Puxador', shortcut: 'Click top', colorKey: 'P' },
      { symbol: 'C', label: isFr ? 'Chœur' : 'Coro', shortcut: 'Click top', colorKey: 'C' },
    ];
  }

  if (isLeftHanded && ['marcante', 'meiao', 'repique', 'caixa', 'tarol'].includes(instId)) {
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
    if (norm === 0 || norm === '0' || !norm) return 'e';
    if (norm === 'e') return 'E';
    if (norm === 'E') return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'S';
    if (norm === 'S' || norm === 's') return 'V';
    if (norm === 'V' || norm === 'v') return 'B';
    return 0;
  }
  if (instType === 'gongue') {
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
    if (norm === 'P') return 'F';
    if (norm === 'F') return 'V';
    if (norm === 'V') return 'C';
    if (norm === 'C') return 'B';
    return 0;
  }
  if (instId === 'caixa') {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'e';
    if (norm === 'e') return 'E';
    if (norm === 'E') return 'R';
    if (norm === 'R') return 'r';
    if (norm === 'r') return 'X';
    if (norm === 'X') return 'C';
    if (norm === 'C') return 'F';
    if (norm === 'F') return 'B';
    return 0;
  }
  if (instId === 'tarol') {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'e';
    if (norm === 'e') return 'E';
    if (norm === 'E') return 'R';
    if (norm === 'R') return 'r';
    if (norm === 'r') return 'X';
    if (norm === 'X') return 'C';
    if (norm === 'C') return 'F';
    if (norm === 'F') return 'B';
    return 0;
  }
  if (instId === 'marcante' || instId === 'meiao' || instId === 'repique') {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'e';
    if (norm === 'e') return 'E';
    if (norm === 'E') return 'X';
    if (norm === 'X') return 'I';
    if (norm === 'I') return 'C';
    if (norm === 'C') return 'B';
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
