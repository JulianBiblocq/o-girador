import { Language } from '../../types';
import { swapDirectionalHands } from '../../data/strokePedagogyCatalog';

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
    const rH = isLeftHanded ? (isPt ? 'Esquerda' : 'Gauche') : (isPt ? 'Direita' : 'Droite');
    const lH = isLeftHanded ? (isPt ? 'Direita' : 'Droite') : (isPt ? 'Esquerda' : 'Gauche');
    const side = stroke === stroke.toUpperCase() ? rH : lH;
    switch (stroke) {
      case 'G': case 'g': return isPt ? `Grave (${side})` : `Grave / Basse (${side})`;
      case 'A': case 'a': return isPt ? `Aberto (${side})` : `Ton ouvert / Aberto (${side})`;
      case 'S': case 's': return isPt ? `Slap / Estalo (${side})` : `Claqué / Slap (${side})`;
      case 'D': case 'd': return isPt ? `Ponta de dedos / Fantasma (${side})` : `Doigts / Fantôme (${side})`;
      case 'P': case 'p': return isPt ? `Preso / Fechado (${side})` : `Pressé / Fermé (${side})`;
      case 'F': case 'f': return isPt ? `Fla aberto (${side})` : `Fla ouvert (${side})`;
      case 'V': case 'v': return isPt ? `Fla slap (${side})` : `Fla claqué (${side})`;
      case 'C': return isPt ? 'Palma (Clap)' : 'Clap';
      case 'B': case 'b': return isPt ? 'Barulho (Rulo contínuo)' : 'Barulho (Roulement continu)';
      default: return stroke;
    }
  }

  if (instId === 'caixa' || instId === 'tarol') {
    switch (stroke) {
      case 'D': return isPt ? 'Mão direita (Golpe forte)' : 'Main droite (Coup fort)';
      case 'd': return isPt ? 'Mão direita (Golpe fraco)' : 'Main droite (Coup faible)';
      case 'E': return isPt ? 'Mão esquerda (Golpe forte)' : 'Main gauche (Coup fort)';
      case 'e': return isPt ? 'Mão esquerda (Golpe fraco)' : 'Main gauche (Coup faible)';
      case 'A': return isPt ? 'A — Ataque Pele e Aro / Rimshot (Direita)' : 'A — Rimshot / Pele e Aro (Droite)';
      case 'a': return isPt ? 'a — Ataque Pele e Aro / Rimshot (Esquerda)' : 'a — Rimshot / Pele e Aro (Gauche)';
      case 'R': return isPt ? 'Rufada (Rulo curto — Direita)' : 'Rufada (Roulement court — Droite)';
      case 'r': return isPt ? 'Rufada (Rulo curto — Esquerda)' : 'Rufada (Roulement court — Gauche)';
      case 'F': return isPt ? 'Fla (Direita)' : 'Fla (Droite)';
      case 'f': return isPt ? 'Fla (Esquerda)' : 'Fla (Gauche)';
      case 'X': return isPt ? 'Aro' : 'Cerclage (Aro)';
      case 'C': return isPt ? 'Clique de baquetas' : 'Clic de baguettes';
      case 'B': case 'b': return isPt ? 'Barulho (Rulo contínuo)' : 'Barulho (Roulement continu)';
      default: return stroke;
    }
  }

  if (instId === 'marcante' || instId === 'meiao' || instId === 'repique' || instId === 'alfaia') {
    switch (stroke) {
      case 'D': return isPt ? 'Mão direita (Golpe forte)' : 'Main droite (Coup fort)';
      case 'd': return isPt ? 'Mão direita (Golpe fraco)' : 'Main droite (Coup faible)';
      case 'E': return isPt ? 'Mão esquerda (Golpe forte)' : 'Main gauche (Coup fort)';
      case 'e': return isPt ? 'Mão esquerda (Golpe fraco)' : 'Main gauche (Coup faible)';
      case 'A': case 'a':
        return swapDirectionalHands(
          isPt ? 'A — Abafado (Baqueta esquerda)' : 'A — Étouffé / Abafado (Baguette gauche)',
          isLeftHanded
        );
      case 'X': return isPt ? 'Aro' : 'Cerclage (Aro)';
      case 'C': return isPt ? 'Clique de baquetas' : 'Clic de baguettes';
      case 'I': return 'Bacalhau (Igarassu)';
      case 'B': case 'b': return isPt ? 'Barulho (Vibração)' : 'Barulho (Grondement)';
      default: return stroke;
    }
  }

  if (instType === 'gongue' || instId === 'gongue') {
    switch (stroke) {
      case 'G': return isPt ? 'Grave forte (Topo da campana)' : 'Grave fort (Haut de la cloche)';
      case 'g': return isPt ? 'Grave fraco (Topo da campana)' : 'Grave faible (Haut de la cloche)';
      case 'A': return isPt ? 'Agudo forte (Base da campana)' : 'Aigu fort (Base de la cloche)';
      case 'a': return isPt ? 'Agudo fraco (Base da campana)' : 'Aigu faible (Base de la cloche)';
      case 'B': case 'b': return isPt ? 'Barulho (Rulo contínuo)' : 'Barulho (Roulement continu)';
      default: return stroke;
    }
  }

  if (instId === 'agbe') {
    switch (stroke) {
      case 'D': return swapDirectionalHands(isPt ? 'Direita (Forte — Retorno)' : 'Droite (Fort — Retour)', isLeftHanded);
      case 'd': return swapDirectionalHands(isPt ? 'Direita (Fraco — Retorno)' : 'Droite (Faible — Retour)', isLeftHanded);
      case 'E': return swapDirectionalHands(isPt ? 'Esquerda (Forte — Palma)' : 'Gauche (Fort — Paume)', isLeftHanded);
      case 'e': return swapDirectionalHands(isPt ? 'Esquerda (Fraco — Palma)' : 'Gauche (Faible — Paume)', isLeftHanded);
      case 'S': return isPt ? 'Salto (Impulso alto)' : 'Salto (Lancer haut)';
      case 'V': case 'v': return isPt ? 'Volta (Retorno baixo)' : 'Volta (Retour bas)';
      case 'B': case 'b': return isPt ? 'Barulho (Agitação contínua)' : 'Barulho (Secouement continu)';
      default: return stroke;
    }
  }

  if (instId === 'mineiro') {
    switch (stroke) {
      case 'P': return isPt ? 'P ↑ — Projetar forte (Para frente)' : 'P ↑ — Poussé fort (Projetar)';
      case 'p': return isPt ? 'p ↑ — Projetar fraco' : 'p ↑ — Poussé faible';
      case 'T': return isPt ? 'T ↓ — Trazer forte (Para trás)' : 'T ↓ — Tiré fort (Trazer)';
      case 't': return isPt ? 't ↓ — Trazer fraco' : 't ↓ — Tiré faible';
      case 'L': return isPt ? 'Lado (Lateral)' : 'Latéral (Lado)';
      case 'B': case 'b': return isPt ? 'Barulho (Agitação contínua)' : 'Barulho (Secouement continu)';
      default: return stroke;
    }
  }

  if (instId === 'apito') {
    switch (stroke) {
      case 'W': return isPt ? 'Apito forte/longo (W)' : 'Sifflet fort/long (W)';
      case 'w': return isPt ? 'Apito curto/leve (w)' : 'Sifflet court/léger (w)';
      default: return stroke;
    }
  }

  if (instType === 'voice') {
    switch (stroke) {
      case 'P': return 'Puxador (P)';
      case 'C': return 'Coro (C)';
      default: return stroke;
    }
  }

  return stroke;
};
