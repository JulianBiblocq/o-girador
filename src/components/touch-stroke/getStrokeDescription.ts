
import { Language } from '../../types';

export const getStrokeDescription = (instId: string, instType: string, stroke: string, lang: Language): string => {
  const isPt = lang === 'pt';
  if (stroke === '0') return isPt ? 'Silêncio' : 'Silence';

  if (instId === 'timbal') {
    switch (stroke) {
      case 'G': return isPt ? 'Baixo (Forte - Mão Forte)' : 'Basse (Fort - Main Forte)';
      case 'g': return isPt ? 'Baixo (Fraca - Mão Fraca)' : 'Basse (Faible - Main Faible)';
      case 'A': return isPt ? 'Aberto (Forte - Mão Forte)' : 'Ouvert (Fort - Main Forte)';
      case 'a': return isPt ? 'Aberto (Fraca - Mão Fraca)' : 'Ouvert (Faible - Main Faible)';
      case 'S': return isPt ? 'Slap (Forte - Mão Forte)' : 'Claqué (Fort - Main Forte)';
      case 's': return isPt ? 'Slap (Fraca - Mão Fraca)' : 'Claqué (Faible - Main Faible)';
      case 'D': return isPt ? 'Dedilhado (Forte - Mão Forte)' : 'Fantôme (Fort - Main Forte)';
      case 'd': return isPt ? 'Dedilhado (Fraca - Mão Fraca)' : 'Fantôme (Faible - Main Faible)';
      case 'P': return isPt ? 'Preso (Forte - Mão Forte)' : 'Fermé (Fort - Main Forte)';
      case 'p': return isPt ? 'Preso (Fraca - Mão Fraca)' : 'Fermé (Faible - Main Faible)';
      case 'F': return isPt ? 'Fla aberto' : 'Fla ouvert';
      case 'V': return isPt ? 'Fla slap' : 'Fla claqué';
      case 'C': return isPt ? 'Clap (mãos)' : 'Clap (mains)';
      case 'B': return isPt ? 'Barulho' : 'Grondement';
      default: return stroke;
    }
  }

  if (instId === 'caixa' || instId === 'tarol') {
    switch (stroke) {
      case 'D': return isPt ? 'Mão Direita (Forte)' : 'Main Droite (Fort)';
      case 'd': return isPt ? 'Mão Direita (Fraca)' : 'Main Droite (Faible)';
      case 'E': return isPt ? 'Mão Esquerda (Forte)' : 'Main Gauche (Fort)';
      case 'e': return isPt ? 'Mão Esquerda (Fraca)' : 'Main Gauche (Faible)';
      case 'R': return isPt ? 'Rufada Direita' : 'Roulement court (Rufada) D';
      case 'r': return isPt ? 'Rufada Esquerda' : 'Roulement court (Rufada) G';
      case 'X': return isPt ? 'Toque no aro' : 'Coup sur le cerclage';
      case 'F': return isPt ? 'Fla' : 'Fla';
      case 'C': return isPt ? 'Click' : 'Click';
      case 'B': return isPt ? 'Barulho' : 'Grondement';
      default: return stroke;
    }
  }

  if (instId === 'marcante' || instId === 'meiao' || instId === 'repique') {
    switch (stroke) {
      case 'D': return isPt ? 'Mão Direita (Forte)' : 'Main Droite (Fort)';
      case 'd': return isPt ? 'Mão Direita (Fraca)' : 'Main Droite (Faible)';
      case 'E': return isPt ? 'Mão Esquerda (Forte)' : 'Main Gauche (Fort)';
      case 'e': return isPt ? 'Mão Esquerda (Fraca)' : 'Main Gauche (Faible)';
      case 'X': return isPt ? 'Toque no aro' : 'Coup sur le cerclage';
      case 'C': return isPt ? 'Click' : 'Click';
      case 'I': return isPt ? 'Bacalhau (Iguarassu)' : 'Bacalhau (Bois gauche / Iguarassu)';
      case 'B': return isPt ? 'Barulho' : 'Grondement';
      default: return stroke;
    }
  }

  if (instType === 'gongue') {
    switch (stroke) {
      case 'G': return isPt ? 'Grave Forte' : 'Grave Fort';
      case 'g': return isPt ? 'Grave Fraco' : 'Grave Faible';
      case 'A': return isPt ? 'Agudo Forte' : 'Aigu Fort';
      case 'a': return isPt ? 'Agudo Fraco' : 'Aigu Faible';
      case 'X': return isPt ? 'Corpo do sino' : 'Corps / Flanc';
      case 'B': return isPt ? 'Barulho' : 'Grondement';
      default: return stroke;
    }
  }

  if (instId === 'agbe') {
    switch (stroke) {
      case 'E': return isPt ? 'Esquerda (Forte)' : 'Gauche / Filet (Fort)';
      case 'e': return isPt ? 'Esquerda (Fraca)' : 'Gauche / Filet (Faible)';
      case 'D': return isPt ? 'Direita (Forte)' : 'Droite / Paume (Fort)';
      case 'd': return isPt ? 'Direita (Fraca)' : 'Droite / Paume (Faible)';
      case 'S': return isPt ? 'Salto' : 'Lancer (Salto)';
      case 'V': return isPt ? 'Volta' : 'Retour (Volta)';
      case 'B': return isPt ? 'Barulho' : 'Grondement';
      default: return stroke;
    }
  }

  if (instId === 'mineiro') {
    switch (stroke) {
      case 'P': return isPt ? 'Push (Forte)' : 'Pousser (Fort)';
      case 'p': return isPt ? 'Push (Fraco)' : 'Pousser (Faible)';
      case 'T': return isPt ? 'Pull (Forte)' : 'Tirer (Fort)';
      case 't': return isPt ? 'Pull (Fraco)' : 'Tirer (Faible)';
      case 'L': return isPt ? 'Lado' : 'Secousse latérale';
      case 'B': return isPt ? 'Barulho' : 'Grondement';
      default: return stroke;
    }
  }

  if (instType === 'voice') {
    switch (stroke) {
      case 'P': return isPt ? 'Puxador' : 'Puxador';
      case 'C': return isPt ? 'Coro' : 'Chœur';
      default: return stroke;
    }
  }

  return stroke;
};
