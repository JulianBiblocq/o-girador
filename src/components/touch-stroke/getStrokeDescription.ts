import { Language } from '../../types';

export const getStrokeDescription = (
  instId: string,
  instType: string,
  stroke: string,
  lang: Language,
  isLeftHanded = false
): string => {
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
      case 'F':
      case 'f': return isPt ? 'Fla aberto' : 'Fla ouvert';
      case 'V':
      case 'v': return isPt ? 'Fla slap' : 'Fla claqué';
      case 'C': return isPt ? 'Clap (mãos)' : 'Clap (mains)';
      case 'B':
      case 'b': return isPt ? 'Barulho' : 'Grondement';
      default: return stroke;
    }
  }

  if (instId === 'caixa' || instId === 'tarol') {
    switch (stroke) {
      case 'D': return isPt ? 'Mão Direita (Forte)' : 'Main Droite (Fort)';
      case 'd': return isPt ? 'Mão Direita (Fraca)' : 'Main Droite (Faible)';
      case 'E': return isPt ? 'Mão Esquerda (Forte)' : 'Main Gauche (Fort)';
      case 'e': return isPt ? 'Mão Esquerda (Fraca)' : 'Main Gauche (Faible)';
      case 'A': return isPt ? 'A — Ataque Pele e Aro Direita' : 'A — Attaque Cerclage+Peau Droite (Rimshot)';
      case 'a': return isPt ? 'a — Ataque Pele e Aro Esquerda' : 'a — Attaque Cerclage+Peau Gauche (Rimshot)';
      case 'R': return isPt ? 'Rufada Direita' : 'Roulement court (Rufada) D';
      case 'r': return isPt ? 'Rufada Esquerda' : 'Roulement court (Rufada) G';
      case 'X': return isPt ? 'Toque no aro' : 'Coup sur le cerclage';
      case 'F':
      case 'f': return 'Fla';
      case 'C': return 'Click';
      case 'B':
      case 'b': return isPt ? 'Barulho' : 'Grondement';
      default: return stroke;
    }
  }

  if (instId === 'marcante' || instId === 'meiao' || instId === 'repique' || instId === 'alfaia') {
    switch (stroke) {
      case 'D': return isPt ? 'Mão Direita (Forte)' : 'Main Droite (Fort)';
      case 'd': return isPt ? 'Mão Direita (Fraca)' : 'Main Droite (Faible)';
      case 'E': return isPt ? 'Mão Esquerda (Forte)' : 'Main Gauche (Fort)';
      case 'e': return isPt ? 'Mão Esquerda (Fraca)' : 'Main Gauche (Faible)';
      case 'A':
      case 'a':
        return isPt
          ? (isLeftHanded ? 'A — Abafado Direita (Seco)' : 'A — Abafado Esquerda (Seco)')
          : (isLeftHanded ? 'A — Étouffé Droite (Abafado)' : 'A — Étouffé Gauche (Abafado)');
      case 'X': return isPt ? 'Toque no aro' : 'Coup sur le cerclage';
      case 'C': return 'Click';
      case 'I': return isPt ? 'Bacalhau (Iguarassu)' : 'Bacalhau (Bois gauche / Iguarassu)';
      case 'B':
      case 'b': return isPt ? 'Barulho' : 'Grondement';
      default: return stroke;
    }
  }

  if (instType === 'gongue' || instId === 'gongue') {
    switch (stroke) {
      case 'G': return isPt ? 'Grave Forte' : 'Grave Fort';
      case 'g': return isPt ? 'Grave Fraco' : 'Grave Faible';
      case 'A': return isPt ? 'Agudo Forte' : 'Aigu Fort';
      case 'a': return isPt ? 'Agudo Fraco' : 'Aigu Faible';
      case 'B':
      case 'b': return isPt ? 'Barulho' : 'Grondement';
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
      case 'V':
      case 'v': return isPt ? 'Volta' : 'Retour (Volta)';
      case 'B':
      case 'b': return isPt ? 'Barulho' : 'Grondement';
      default: return stroke;
    }
  }

  if (instId === 'mineiro') {
    switch (stroke) {
      case 'P': return isPt ? 'P ↑ — Projetar (Para frente)' : 'P ↑ — Pousser (Avant)';
      case 'p': return isPt ? 'p ↑ — Projetar Fraco (Para frente)' : 'p ↑ — Pousser Faible (Avant)';
      case 'T': return isPt ? 'T ↓ — Trazer (Para trás)' : 'T ↓ — Tirer (Vers soi)';
      case 't': return isPt ? 't ↓ — Trazer Fraco (Para trás)' : 't ↓ — Tirer Faible (Vers soi)';
      case 'L': return isPt ? 'Lado' : 'Secousse latérale';
      case 'B':
      case 'b': return isPt ? 'Barulho' : 'Grondement';
      default: return stroke;
    }
  }

  if (instType === 'voice') {
    switch (stroke) {
      case 'P': return 'Puxador';
      case 'C': return isPt ? 'Coro' : 'Chœur';
      default: return stroke;
    }
  }

  return stroke;
};
